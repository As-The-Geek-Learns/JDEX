#!/usr/bin/env node

/**
 * Verification Script
 * ===================
 * Generates verification state including:
 * - SHA256 hashes of source files
 * - Test results
 * - Lint status
 * - Timestamp
 * 
 * Usage: node scripts/verify.js [options]
 * 
 * Options:
 *   --skip-tests       Skip running tests
 *   --skip-lint        Skip running linter
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { runGeminiReview, formatReviewOutput } = require('./geminiReview');

// Configuration - JDex specific paths
const DEFAULT_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.css', '.json'];
const OUTPUT_PATH = '.workflow/state/verify-state.json';
const APP_DIR = 'app'; // JDex app is in app/ subdirectory

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  skipTests: args.includes('--skip-tests'),
  skipLint: args.includes('--skip-lint'),
  skipGemini: args.includes('--skip-gemini'),
  geminiBaseRef: args.find(a => a.startsWith('--gemini-base='))?.split('=')[1] || 'HEAD~1',
  outputPath: OUTPUT_PATH
};

// Utility functions
function hashFile(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    console.error('Error hashing ' + filePath + ':', error.message);
    return null;
  }
}

function findFiles(baseDir) {
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
  
  // For JDex, scan the app/src directory
  const appSrcDir = path.join(baseDir, APP_DIR, 'src');
  if (fs.existsSync(appSrcDir)) {
    console.log('Scanning ' + appSrcDir + '...');
    walkDir(appSrcDir);
  }
  
  // Also scan app/electron
  const electronDir = path.join(baseDir, APP_DIR, 'electron');
  if (fs.existsSync(electronDir)) {
    console.log('Scanning ' + electronDir + '...');
    walkDir(electronDir);
  }
  
  return files.sort();
}

function runCommand(command, description, cwd = null) {
  console.log('\n' + description + '...');
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: cwd || process.cwd()
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    return { 
      success: false, 
      output: error.stdout ? error.stdout.trim() : '',
      error: error.stderr ? error.stderr.trim() : error.message
    };
  }
}

function runTests() {
  if (options.skipTests) {
    console.log('Skipping tests (--skip-tests)');
    return { skipped: true };
  }
  
  // Check if package.json exists in app/ and has test script
  const appPkgPath = path.join(APP_DIR, 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(appPkgPath, 'utf-8'));
    if (!pkg.scripts || !pkg.scripts.test) {
      console.log('No test script found in ' + appPkgPath);
      return { skipped: true, reason: 'no test script' };
    }
  } catch (e) {
    console.log('No package.json found in app/');
    return { skipped: true, reason: 'no package.json' };
  }
  
  const result = runCommand('npm test 2>&1', 'Running tests', APP_DIR);
  return {
    success: result.success,
    output: result.output,
    error: result.error
  };
}

function runLint() {
  if (options.skipLint) {
    console.log('Skipping lint (--skip-lint)');
    return { skipped: true };
  }
  
  // Check if lint script exists in app/
  const appPkgPath = path.join(APP_DIR, 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(appPkgPath, 'utf-8'));
    if (!pkg.scripts || !pkg.scripts.lint) {
      console.log('No lint script found in ' + appPkgPath);
      return { skipped: true, reason: 'no lint script' };
    }
  } catch (e) {
    return { skipped: true, reason: 'no package.json' };
  }
  
  const result = runCommand('npm run lint 2>&1', 'Running linter', APP_DIR);
  return {
    success: result.success,
    output: result.output,
    error: result.error
  };
}

function runAudit() {
  const result = runCommand('npm audit --audit-level=high 2>&1', 'Running security audit', APP_DIR);
  
  // npm audit returns non-zero if vulnerabilities found
  // Parse output to check for high/critical
  const output = result.output || '';
  const hasHighCritical = output.includes('high') || output.includes('critical');
  
  return {
    success: !hasHighCritical || result.success,
    output: output.substring(0, 500) // Truncate for state file
  };
}

async function runGeminiCodeReview() {
  if (options.skipGemini) {
    console.log('\nSkipping Gemini review (--skip-gemini)');
    return { skipped: true, reason: 'Skipped by user' };
  }
  
  console.log('\nRunning Gemini AI code review...');
  
  try {
    const review = await runGeminiReview({
      baseRef: options.geminiBaseRef,
      cwd: process.cwd()
    });
    
    // Print formatted output
    console.log(formatReviewOutput(review));
    
    return review;
  } catch (error) {
    console.error('Gemini review error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main verification process
async function main() {
  console.log('='.repeat(60));
  console.log('VERIFICATION SCRIPT - JDex');
  console.log('='.repeat(60));
  console.log('Timestamp: ' + new Date().toISOString());
  
  // Find and hash files
  console.log('\nFinding source files...');
  const files = findFiles('.');
  console.log('Found ' + files.length + ' files to hash');
  
  const fileHashes = {};
  for (const file of files) {
    const hash = hashFile(file);
    if (hash) {
      fileHashes[file] = hash;
    }
  }
  
  // Run checks
  const testResults = runTests();
  const lintResults = runLint();
  const auditResults = runAudit();
  const geminiResults = await runGeminiCodeReview();
  
  // Determine if Gemini review passes (passes if skipped, successful with no critical issues, or API unavailable)
  const geminiPass = geminiResults.skipped || 
                     (geminiResults.success && geminiResults.passesReview) ||
                     (!geminiResults.success && geminiResults.reason?.includes('API_KEY'));
  
  // Build verification state
  const verifyState = {
    version: '1.1.0',
    project: 'jdex-complete-package',
    timestamp: new Date().toISOString(),
    files: {
      count: Object.keys(fileHashes).length,
      hashes: fileHashes
    },
    tests: testResults,
    lint: lintResults,
    audit: auditResults,
    geminiReview: {
      success: geminiResults.success,
      skipped: geminiResults.skipped || false,
      passesReview: geminiResults.passesReview,
      summary: geminiResults.summary,
      issueCount: geminiResults.issues?.length || 0,
      criticalCount: geminiResults.issues?.filter(i => i.severity === 'CRITICAL').length || 0,
      warningCount: geminiResults.issues?.filter(i => i.severity === 'WARNING').length || 0,
      infoCount: geminiResults.issues?.filter(i => i.severity === 'INFO').length || 0,
      securityScore: geminiResults.securityScore,
      qualityScore: geminiResults.qualityScore,
      duration: geminiResults.duration,
      model: geminiResults.model,
      issues: geminiResults.issues || [],
      error: geminiResults.error,
      reason: geminiResults.reason
    },
    summary: {
      filesHashed: Object.keys(fileHashes).length,
      testsPass: testResults.success || testResults.skipped,
      lintPass: lintResults.success || lintResults.skipped,
      auditPass: auditResults.success,
      geminiPass: geminiPass,
      overallPass: (testResults.success || testResults.skipped) &&
                   (lintResults.success || lintResults.skipped) &&
                   auditResults.success &&
                   geminiPass
    }
  };
  
  // Ensure output directory exists
  const outputDir = path.dirname(options.outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write verification state
  fs.writeFileSync(
    options.outputPath,
    JSON.stringify(verifyState, null, 2)
  );
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log('Files hashed:    ' + verifyState.summary.filesHashed);
  console.log('Tests:           ' + (verifyState.summary.testsPass ? 'PASS' : 'FAIL'));
  console.log('Lint:            ' + (verifyState.summary.lintPass ? 'PASS' : 'FAIL'));
  console.log('Security Audit:  ' + (verifyState.summary.auditPass ? 'PASS' : 'FAIL'));
  
  // Gemini review status
  if (verifyState.geminiReview.skipped) {
    console.log('Gemini Review:   SKIPPED (' + (verifyState.geminiReview.reason || 'no reason') + ')');
  } else if (verifyState.geminiReview.success) {
    const issues = verifyState.geminiReview.issueCount;
    const critical = verifyState.geminiReview.criticalCount;
    console.log('Gemini Review:   ' + (verifyState.summary.geminiPass ? 'PASS' : 'FAIL') + 
                (issues > 0 ? ' (' + issues + ' issues, ' + critical + ' critical)' : ''));
  } else {
    console.log('Gemini Review:   ERROR (' + (verifyState.geminiReview.error || 'unknown error') + ')');
  }
  
  console.log('-'.repeat(60));
  console.log('OVERALL:         ' + (verifyState.summary.overallPass ? 'PASS' : 'FAIL'));
  console.log('='.repeat(60));
  console.log('\nVerification state written to: ' + options.outputPath);
  
  // Exit with appropriate code
  process.exit(verifyState.summary.overallPass ? 0 : 1);
}

main().catch(function(error) {
  console.error('Verification failed:', error);
  process.exit(1);
});
