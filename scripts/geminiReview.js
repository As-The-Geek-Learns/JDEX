#!/usr/bin/env node

/**
 * Gemini Code Review Module
 * =========================
 * Sends code changes to Google's Gemini AI for security and quality review.
 * 
 * CLI Usage:
 *   node scripts/geminiReview.js              # Review last commit
 *   node scripts/geminiReview.js --full       # Full codebase security audit
 *   node scripts/geminiReview.js --staged     # Review staged changes
 *   node scripts/geminiReview.js --base=main  # Review against main branch
 * 
 * Module Usage:
 *   const { runGeminiReview } = require('./geminiReview');
 *   const results = await runGeminiReview({ full: true });  // Full review
 *   const results = await runGeminiReview({ baseRef: 'HEAD~5' });  // Diff review
 * 
 * Environment:
 *   GEMINI_API_KEY - Required. Get from https://aistudio.google.com/app/apikey
 * 
 * @module geminiReview
 */

const https = require('https');
const fs = require('fs');
const { execSync, execFileSync } = require('child_process');
const path = require('path');

// Configuration
const GEMINI_API_URL = 'generativelanguage.googleapis.com';
const GEMINI_MODEL = 'gemini-2.0-flash';
const API_TIMEOUT = 180000; // 180 seconds (longer for full reviews)
const MAX_DIFF_LENGTH = 30000; // Truncate very large diffs
const MAX_FULL_REVIEW_LENGTH = 500000; // Max content for full reviews (~125k tokens)
const DEFAULT_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
const APP_DIR = 'app'; // JDex app directory

/**
 * Validate a git ref to prevent command injection.
 * Only allows characters valid in git refs: alphanumeric, dots, hyphens,
 * underscores, slashes, tildes, and carets (for HEAD~1, HEAD^2 etc).
 *
 * @param {string} ref - The git ref to validate
 * @returns {string} The validated ref
 * @throws {Error} If the ref contains unsafe characters
 */
function validateGitRef(ref) {
  if (!ref || typeof ref !== 'string') {
    throw new Error('Git ref is required and must be a string');
  }
  // Allow: word chars, dots, hyphens, slashes, tildes, carets, at-signs (@)
  // Reject: semicolons, pipes, backticks, $(), spaces, etc.
  if (!/^[a-zA-Z0-9._\-/~^@]+$/.test(ref)) {
    throw new Error(`Unsafe git ref: "${ref}". Only alphanumeric, . - / ~ ^ @ characters are allowed.`);
  }
  return ref;
}

/**
 * Review severity levels
 */
const SEVERITY = {
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
  INFO: 'INFO'
};

/**
 * Find all source files in the project
 * @param {string} baseDir - Base directory to search
 * @returns {string[]} Array of file paths
 */
function findSourceFiles(baseDir = '.') {
  const files = [];
  
  function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules, hidden directories, and build outputs
      if (entry.name.startsWith('.') || 
          entry.name === 'node_modules' || 
          entry.name === 'dist' ||
          entry.name === 'dist-electron') {
        continue;
      }
      
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (DEFAULT_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  // Scan app/src directory
  const appSrcDir = path.join(baseDir, APP_DIR, 'src');
  if (fs.existsSync(appSrcDir)) {
    walkDir(appSrcDir);
  }
  
  // Also scan app/electron
  const electronDir = path.join(baseDir, APP_DIR, 'electron');
  if (fs.existsSync(electronDir)) {
    walkDir(electronDir);
  }
  
  return files.sort();
}

/**
 * Read file contents for full review
 * @param {string[]} files - Array of file paths
 * @param {number} maxLength - Maximum total content length
 * @returns {object} Object with content string and file list
 */
function readFilesForReview(files, maxLength = MAX_FULL_REVIEW_LENGTH) {
  // Get file sizes and sort by size (smallest first) to maximize file coverage
  const filesWithSize = files.map(file => {
    try {
      const stats = fs.statSync(file);
      return { path: file, size: stats.size };
    } catch (e) {
      return { path: file, size: 0 };
    }
  }).sort((a, b) => a.size - b.size);
  
  let content = '';
  const includedFiles = [];
  const skippedFiles = [];
  
  for (const { path: file } of filesWithSize) {
    try {
      const fileContent = fs.readFileSync(file, 'utf-8');
      const fileSection = `\n${'='.repeat(60)}\nFILE: ${file}\n${'='.repeat(60)}\n${fileContent}\n`;
      
      // Check if adding this file would exceed the limit
      if (content.length + fileSection.length > maxLength) {
        skippedFiles.push(file);
        continue; // Try next file instead of stopping
      }
      
      content += fileSection;
      includedFiles.push(file);
    } catch (error) {
      console.error('Error reading ' + file + ':', error.message);
    }
  }
  
  if (skippedFiles.length > 0) {
    content += `\n\n[... ${skippedFiles.length} large files skipped due to size limits: ${skippedFiles.map(f => path.basename(f)).join(', ')} ...]`;
    console.log('Skipped ' + skippedFiles.length + ' large files: ' + skippedFiles.map(f => path.basename(f)).join(', '));
  }
  
  return { content, files: includedFiles, totalFiles: files.length, skippedFiles };
}

/**
 * Build the full codebase review prompt for Gemini
 * @param {string} content - The full file contents
 * @param {string[]} files - List of files being reviewed
 * @param {number} totalFiles - Total number of files
 * @returns {string} The formatted prompt
 */
function buildFullReviewPrompt(content, files, totalFiles) {
  const fileList = files.join('\n- ');
  
  return `You are an expert code reviewer performing a FULL CODEBASE SECURITY AUDIT for a JavaScript/React/Electron application.

## Your Task
Perform a comprehensive security and quality review of the entire codebase. Focus on:

1. **CRITICAL** - Security vulnerabilities that MUST be fixed:
   - SQL/NoSQL injection vulnerabilities
   - Path traversal vulnerabilities (especially important for Electron file operations)
   - XSS (Cross-Site Scripting)
   - Exposed secrets, credentials, or API keys
   - Authentication/authorization bypasses
   - Unsafe deserialization
   - Electron-specific security issues (nodeIntegration, contextIsolation)
   - Insecure IPC communication

2. **WARNING** - Issues that SHOULD be fixed:
   - Missing input validation
   - Incomplete error handling
   - Logic errors or edge cases
   - Race conditions
   - Memory leaks
   - Missing null/undefined checks
   - Insecure default configurations

3. **INFO** - Suggestions for improvement:
   - Code organization improvements
   - Performance optimizations
   - Better error messages
   - Documentation gaps
   - Code duplication

## Files Being Reviewed (${files.length} of ${totalFiles})
- ${fileList}

## Source Code
${content}

## Response Format
Respond with a JSON object in this exact format:
{
  "summary": "2-3 sentence executive summary of the codebase security posture",
  "passesReview": true/false,
  "issues": [
    {
      "severity": "CRITICAL|WARNING|INFO",
      "file": "path/to/file.js",
      "line": 42,
      "title": "Brief issue title",
      "description": "Detailed explanation of the issue and its security impact",
      "suggestion": "Specific code or approach to fix it"
    }
  ],
  "securityScore": 1-10,
  "qualityScore": 1-10,
  "highlights": ["List of positive security practices observed"]
}

Be thorough but prioritize CRITICAL and WARNING issues. If the codebase is secure, acknowledge good practices in the highlights array.
Only return valid JSON, no markdown code blocks or additional text.`;
}

/**
 * Build the code review prompt for Gemini
 * @param {string} diff - The git diff content
 * @param {string[]} files - List of changed files
 * @returns {string} The formatted prompt
 */
function buildReviewPrompt(diff, files) {
  const fileList = files.join('\n- ');
  
  return `You are an expert code reviewer specializing in security and code quality for JavaScript/React applications.

## Your Task
Review the following code changes and identify issues in these categories:

1. **CRITICAL** - Security vulnerabilities that MUST be fixed before shipping:
   - SQL/NoSQL injection
   - Path traversal vulnerabilities
   - XSS (Cross-Site Scripting)
   - Exposed secrets or credentials
   - Authentication/authorization bypasses
   - Unsafe deserialization

2. **WARNING** - Issues that SHOULD be fixed soon:
   - Missing input validation
   - Incomplete error handling
   - Logic errors or edge cases
   - Race conditions
   - Memory leaks
   - Missing null checks

3. **INFO** - Suggestions for improvement:
   - Code style improvements
   - Performance optimizations
   - Better naming or documentation
   - Refactoring opportunities

## Files Changed
- ${fileList}

## Code Changes (Git Diff)
\`\`\`diff
${diff}
\`\`\`

## Response Format
Respond with a JSON object in this exact format:
{
  "summary": "Brief 1-2 sentence summary of the review",
  "passesReview": true/false,
  "issues": [
    {
      "severity": "CRITICAL|WARNING|INFO",
      "file": "path/to/file.js",
      "line": 42,
      "title": "Brief issue title",
      "description": "Detailed explanation of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "securityScore": 1-10,
  "qualityScore": 1-10
}

If there are no issues, return an empty issues array with passesReview: true.
Only return valid JSON, no markdown code blocks or additional text.`;
}

/**
 * Make an HTTPS request to the Gemini API
 * @param {string} apiKey - The Gemini API key
 * @param {string} prompt - The prompt to send
 * @returns {Promise<object>} The API response
 */
function callGeminiAPI(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    });

    const options = {
      hostname: GEMINI_API_URL,
      port: 443,
      path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      },
      timeout: API_TIMEOUT
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (parseError) {
            reject(new Error('Failed to parse Gemini API response: ' + parseError.message));
          }
        } else {
          // Sanitize error message to not expose API key
          const sanitizedData = data.replace(apiKey, '[REDACTED]');
          reject(new Error(`Gemini API error (${res.statusCode}): ${sanitizedData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error('Gemini API request failed: ' + error.message));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini API request timed out after ' + (API_TIMEOUT / 1000) + ' seconds'));
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * Parse the Gemini response to extract the review
 * @param {object} response - The raw API response
 * @returns {object} The parsed review
 */
function parseGeminiResponse(response) {
  try {
    // Extract text from Gemini response structure
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No text content in Gemini response');
    }

    // Try to parse as JSON directly
    let reviewData;
    try {
      reviewData = JSON.parse(text);
    } catch (directParseError) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        reviewData = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try to find JSON object in the text
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          reviewData = JSON.parse(objectMatch[0]);
        } else {
          throw new Error('Could not find JSON in response');
        }
      }
    }

    // Validate required fields
    if (typeof reviewData.passesReview !== 'boolean') {
      reviewData.passesReview = !reviewData.issues?.some(i => i.severity === 'CRITICAL');
    }
    
    if (!Array.isArray(reviewData.issues)) {
      reviewData.issues = [];
    }

    return {
      success: true,
      summary: reviewData.summary || 'Review completed',
      passesReview: reviewData.passesReview,
      issues: reviewData.issues.map(issue => ({
        severity: issue.severity || 'INFO',
        file: issue.file || 'unknown',
        line: issue.line || null,
        title: issue.title || 'Issue found',
        description: issue.description || '',
        suggestion: issue.suggestion || ''
      })),
      securityScore: reviewData.securityScore || null,
      qualityScore: reviewData.qualityScore || null
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to parse review: ' + error.message,
      rawResponse: response.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 500)
    };
  }
}

/**
 * Get git diff for changed files
 * @param {string} baseRef - Base reference (default: HEAD~1)
 * @param {string} cwd - Working directory
 * @returns {object} Object with diff string and list of files
 */
function getGitDiff(baseRef = 'HEAD~1', cwd = process.cwd()) {
  // Validate baseRef to prevent command injection
  const safeRef = validateGitRef(baseRef);

  try {
    // Get list of changed files
    const filesOutput = execFileSync('git', ['diff', '--name-only', safeRef], {
      encoding: 'utf-8',
      cwd: cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const files = filesOutput.trim().split('\n').filter(f => f.length > 0);
    
    if (files.length === 0) {
      return { diff: '', files: [], isEmpty: true };
    }
    
    // Get the actual diff
    const diff = execFileSync('git', ['diff', safeRef], {
      encoding: 'utf-8',
      cwd: cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large diffs
    });
    
    // Truncate if too large
    const truncatedDiff = diff.length > MAX_DIFF_LENGTH 
      ? diff.substring(0, MAX_DIFF_LENGTH) + '\n\n[... diff truncated for length ...]'
      : diff;
    
    return { diff: truncatedDiff, files: files, isEmpty: false };
  } catch (error) {
    return { 
      diff: '', 
      files: [], 
      isEmpty: true, 
      error: 'Failed to get git diff: ' + error.message 
    };
  }
}

/**
 * Get diff of staged changes
 * @param {string} cwd - Working directory
 * @returns {object} Object with diff string and list of files
 */
function getStagedDiff(cwd = process.cwd()) {
  try {
    const filesOutput = execSync('git diff --cached --name-only', {
      encoding: 'utf-8',
      cwd: cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const files = filesOutput.trim().split('\n').filter(f => f.length > 0);
    
    if (files.length === 0) {
      return { diff: '', files: [], isEmpty: true };
    }
    
    const diff = execSync('git diff --cached', {
      encoding: 'utf-8',
      cwd: cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024
    });
    
    const truncatedDiff = diff.length > MAX_DIFF_LENGTH 
      ? diff.substring(0, MAX_DIFF_LENGTH) + '\n\n[... diff truncated for length ...]'
      : diff;
    
    return { diff: truncatedDiff, files: files, isEmpty: false };
  } catch (error) {
    return { 
      diff: '', 
      files: [], 
      isEmpty: true, 
      error: 'Failed to get staged diff: ' + error.message 
    };
  }
}

/**
 * Run a full codebase review
 * @param {object} options - Review options
 * @param {string} [options.cwd] - Working directory
 * @returns {Promise<object>} Review results
 */
async function runFullCodebaseReview(options = {}) {
  const startTime = Date.now();
  const cwd = options.cwd || process.cwd();
  
  // Check for API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      skipped: true,
      reason: 'GEMINI_API_KEY environment variable not set',
      duration: Date.now() - startTime
    };
  }

  console.log('Finding source files for full review...');
  const allFiles = findSourceFiles(cwd);
  
  if (allFiles.length === 0) {
    return {
      success: true,
      skipped: true,
      reason: 'No source files found',
      duration: Date.now() - startTime
    };
  }
  
  console.log('Found ' + allFiles.length + ' source files');
  console.log('Reading file contents...');
  
  const { content, files, totalFiles } = readFilesForReview(allFiles);
  
  console.log('Sending ' + files.length + ' file(s) to Gemini for FULL codebase review...');
  console.log('(This may take longer than diff reviews)');
  
  // Build prompt and call API
  const prompt = buildFullReviewPrompt(content, files, totalFiles);
  
  try {
    const response = await callGeminiAPI(apiKey, prompt);
    const review = parseGeminiResponse(response);
    
    // Add metadata
    review.duration = Date.now() - startTime;
    review.filesReviewed = files.length;
    review.totalFiles = totalFiles;
    review.reviewType = 'full';
    review.model = GEMINI_MODEL;
    review.timestamp = new Date().toISOString();
    
    return review;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Run the Gemini code review
 * @param {object} options - Review options
 * @param {string} [options.diff] - Git diff content (if not provided, will be generated)
 * @param {string[]} [options.files] - List of changed files
 * @param {string} [options.baseRef] - Git base reference for diff
 * @param {string} [options.cwd] - Working directory
 * @param {boolean} [options.staged] - Review staged changes only
 * @param {boolean} [options.full] - Run full codebase review
 * @returns {Promise<object>} Review results
 */
async function runGeminiReview(options = {}) {
  // If full review requested, delegate to full review function
  if (options.full) {
    return runFullCodebaseReview(options);
  }
  
  const startTime = Date.now();
  
  // Check for API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      skipped: true,
      reason: 'GEMINI_API_KEY environment variable not set',
      duration: Date.now() - startTime
    };
  }

  // Get diff if not provided
  let diff = options.diff;
  let files = options.files;
  
  if (!diff) {
    const diffResult = options.staged 
      ? getStagedDiff(options.cwd)
      : getGitDiff(options.baseRef || 'HEAD~1', options.cwd);
    
    if (diffResult.error) {
      return {
        success: false,
        skipped: true,
        reason: diffResult.error,
        duration: Date.now() - startTime
      };
    }
    
    if (diffResult.isEmpty) {
      return {
        success: true,
        skipped: true,
        reason: 'No changes to review',
        duration: Date.now() - startTime
      };
    }
    
    diff = diffResult.diff;
    files = diffResult.files;
  }

  console.log('Sending ' + files.length + ' file(s) to Gemini for review...');
  
  // Build prompt and call API
  const prompt = buildReviewPrompt(diff, files);
  
  try {
    const response = await callGeminiAPI(apiKey, prompt);
    const review = parseGeminiResponse(response);
    
    // Add metadata
    review.duration = Date.now() - startTime;
    review.filesReviewed = files.length;
    review.reviewType = 'diff';
    review.model = GEMINI_MODEL;
    review.timestamp = new Date().toISOString();
    
    return review;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Format review results for console output
 * @param {object} review - The review results
 * @returns {string} Formatted output
 */
function formatReviewOutput(review) {
  const lines = [];
  
  lines.push('');
  lines.push('='.repeat(60));
  lines.push('GEMINI AI CODE REVIEW');
  lines.push('='.repeat(60));
  
  if (review.skipped) {
    lines.push('Status: SKIPPED');
    lines.push('Reason: ' + review.reason);
    return lines.join('\n');
  }
  
  if (!review.success) {
    lines.push('Status: ERROR');
    lines.push('Error: ' + review.error);
    return lines.join('\n');
  }
  
  lines.push('Status: ' + (review.passesReview ? 'PASS' : 'FAIL'));
  lines.push('Type: ' + (review.reviewType === 'full' ? 'FULL CODEBASE' : 'DIFF'));
  lines.push('Summary: ' + review.summary);
  if (review.totalFiles && review.totalFiles !== review.filesReviewed) {
    lines.push('Files Reviewed: ' + review.filesReviewed + ' of ' + review.totalFiles);
  } else {
    lines.push('Files Reviewed: ' + review.filesReviewed);
  }
  lines.push('Duration: ' + (review.duration / 1000).toFixed(1) + 's');
  
  if (review.securityScore) {
    lines.push('Security Score: ' + review.securityScore + '/10');
  }
  if (review.qualityScore) {
    lines.push('Quality Score: ' + review.qualityScore + '/10');
  }
  
  // Show highlights for full reviews
  if (review.highlights && review.highlights.length > 0) {
    lines.push('');
    lines.push('-'.repeat(60));
    lines.push('POSITIVE PRACTICES:');
    lines.push('-'.repeat(60));
    review.highlights.forEach((highlight, idx) => {
      lines.push('  ✓ ' + highlight);
    });
  }
  
  if (review.issues && review.issues.length > 0) {
    lines.push('');
    lines.push('-'.repeat(60));
    lines.push('ISSUES FOUND: ' + review.issues.length);
    lines.push('-'.repeat(60));
    
    // Group by severity
    const critical = review.issues.filter(i => i.severity === 'CRITICAL');
    const warnings = review.issues.filter(i => i.severity === 'WARNING');
    const info = review.issues.filter(i => i.severity === 'INFO');
    
    if (critical.length > 0) {
      lines.push('');
      lines.push('🚨 CRITICAL (' + critical.length + '):');
      critical.forEach((issue, idx) => {
        lines.push('  ' + (idx + 1) + '. ' + issue.title);
        lines.push('     File: ' + issue.file + (issue.line ? ':' + issue.line : ''));
        lines.push('     ' + issue.description);
        if (issue.suggestion) {
          lines.push('     Fix: ' + issue.suggestion);
        }
      });
    }
    
    if (warnings.length > 0) {
      lines.push('');
      lines.push('⚠️  WARNING (' + warnings.length + '):');
      warnings.forEach((issue, idx) => {
        lines.push('  ' + (idx + 1) + '. ' + issue.title);
        lines.push('     File: ' + issue.file + (issue.line ? ':' + issue.line : ''));
        lines.push('     ' + issue.description);
        if (issue.suggestion) {
          lines.push('     Fix: ' + issue.suggestion);
        }
      });
    }
    
    if (info.length > 0) {
      lines.push('');
      lines.push('ℹ️  INFO (' + info.length + '):');
      info.forEach((issue, idx) => {
        lines.push('  ' + (idx + 1) + '. ' + issue.title);
        lines.push('     File: ' + issue.file + (issue.line ? ':' + issue.line : ''));
        lines.push('     ' + issue.description);
      });
    }
  } else {
    lines.push('');
    lines.push('✅ No issues found!');
  }
  
  lines.push('');
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}

// Export for use as module
module.exports = {
  runGeminiReview,
  runFullCodebaseReview,
  formatReviewOutput,
  getGitDiff,
  getStagedDiff,
  findSourceFiles,
  buildReviewPrompt,
  buildFullReviewPrompt,
  SEVERITY
};

// CLI support - run directly
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    
    // Show help
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
Gemini Code Review
==================

Usage: node scripts/geminiReview.js [options]

Options:
  --full          Review entire codebase (security audit)
  --staged        Review staged changes only
  --base=<ref>    Review against specific git reference (default: HEAD~1)
  --help, -h      Show this help message

Examples:
  node scripts/geminiReview.js              # Review last commit
  node scripts/geminiReview.js --full       # Full codebase security audit
  node scripts/geminiReview.js --staged     # Review staged changes
  node scripts/geminiReview.js --base=main  # Review all changes vs main

Environment:
  GEMINI_API_KEY  Required. Get from https://aistudio.google.com/app/apikey
`);
      process.exit(0);
    }
    
    const isFull = args.includes('--full');
    console.log('Running Gemini Code Review' + (isFull ? ' (FULL CODEBASE)' : '') + '...');
    
    const options = {
      full: isFull,
      staged: args.includes('--staged'),
      baseRef: args.find(a => a.startsWith('--base='))?.split('=')[1]
    };
    
    const review = await runGeminiReview(options);
    console.log(formatReviewOutput(review));
    
    // Exit with appropriate code
    if (review.skipped) {
      process.exit(0);
    } else if (!review.success || !review.passesReview) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  })();
}
