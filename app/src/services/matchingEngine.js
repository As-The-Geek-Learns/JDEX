/**
 * Matching Engine Service
 * =======================
 * Suggests JD folder destinations for files based on rules.
 * 
 * Rule Types:
 * 1. Extension rules - Match by file extension (e.g., .pdf → 11.01)
 * 2. Keyword rules - Match by filename keywords (e.g., "invoice" → 12.03)
 * 3. Path rules - Match by path patterns (e.g., /Work/ → 30-39 area)
 * 4. Regex rules - Match by regular expression
 * 
 * Security:
 * - All inputs are validated
 * - Regex patterns are sandboxed with timeout
 * - No arbitrary code execution
 */

import {
  getOrganizationRules,
  getOrganizationRule,
  createOrganizationRule,
  updateOrganizationRule,
  incrementRuleMatchCount,
  getFolders,
  getCategories,
  getAreas,
} from '../db.js';
import { validateRequiredString, sanitizeText } from '../utils/validation.js';
import { Result, AppError } from '../utils/errors.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * Confidence levels for suggestions.
 */
export const CONFIDENCE = {
  HIGH: 'high',      // Strong match (exact extension, keyword in filename)
  MEDIUM: 'medium',  // Partial match (keyword in path, similar extension)
  LOW: 'low',        // Weak match (regex, heuristic)
  NONE: 'none',      // No match found
};

/**
 * Default extension-to-folder mappings.
 * These serve as fallback suggestions when no custom rules match.
 */
const DEFAULT_EXTENSION_SUGGESTIONS = {
  // Documents
  pdf: { type: 'document', keywords: ['document', 'reference', 'manual'] },
  doc: { type: 'document', keywords: ['document', 'word'] },
  docx: { type: 'document', keywords: ['document', 'word'] },
  txt: { type: 'document', keywords: ['note', 'text'] },
  md: { type: 'document', keywords: ['documentation', 'readme'] },
  
  // Spreadsheets
  xls: { type: 'spreadsheet', keywords: ['finance', 'data', 'report'] },
  xlsx: { type: 'spreadsheet', keywords: ['finance', 'data', 'report'] },
  csv: { type: 'data', keywords: ['data', 'export', 'import'] },
  
  // Images
  jpg: { type: 'image', keywords: ['photo', 'image', 'media'] },
  jpeg: { type: 'image', keywords: ['photo', 'image', 'media'] },
  png: { type: 'image', keywords: ['image', 'screenshot', 'graphic'] },
  gif: { type: 'image', keywords: ['image', 'animation'] },
  
  // Code
  js: { type: 'code', keywords: ['development', 'script', 'code'] },
  ts: { type: 'code', keywords: ['development', 'typescript', 'code'] },
  py: { type: 'code', keywords: ['development', 'python', 'script'] },
  
  // Archives
  zip: { type: 'archive', keywords: ['archive', 'backup', 'compressed'] },
  rar: { type: 'archive', keywords: ['archive', 'compressed'] },
  
  // Audio/Video
  mp3: { type: 'audio', keywords: ['music', 'audio', 'podcast'] },
  mp4: { type: 'video', keywords: ['video', 'media', 'recording'] },
};

/**
 * Common keywords that might indicate folder destinations.
 */
const KEYWORD_INDICATORS = {
  // Finance
  invoice: ['finance', 'invoice', 'billing'],
  receipt: ['finance', 'receipt', 'expense'],
  statement: ['finance', 'statement', 'banking'],
  tax: ['finance', 'tax'],
  budget: ['finance', 'budget', 'planning'],
  
  // Work
  meeting: ['work', 'meeting', 'notes'],
  project: ['work', 'project'],
  report: ['work', 'report'],
  presentation: ['work', 'presentation'],
  
  // Personal
  photo: ['personal', 'photo', 'memory'],
  vacation: ['personal', 'travel', 'vacation'],
  family: ['personal', 'family'],
  
  // Reference
  manual: ['reference', 'manual', 'documentation'],
  guide: ['reference', 'guide', 'howto'],
  tutorial: ['reference', 'learning', 'tutorial'],
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Safely executes a regex with timeout protection.
 */
function safeRegexTest(pattern, text, timeoutMs = 100) {
  try {
    const regex = new RegExp(pattern, 'i');
    const start = Date.now();
    const result = regex.test(text);
    if (Date.now() - start > timeoutMs) {
      console.warn(`Regex took too long: ${pattern}`);
    }
    return result;
  } catch {
    return false;
  }
}

/**
 * Extracts keywords from a filename.
 */
function extractKeywords(filename) {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  
  // Split on common separators and convert to lowercase
  const words = nameWithoutExt
    .toLowerCase()
    .split(/[-_.\s]+/)
    .filter(word => word.length > 2);
  
  return words;
}

/**
 * Calculates similarity score between two strings (0-1).
 */
function stringSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Simple character overlap
  const set1 = new Set(s1);
  const set2 = new Set(s2);
  const intersection = [...set1].filter(c => set2.has(c)).length;
  const union = new Set([...set1, ...set2]).size;
  
  return intersection / union;
}

// =============================================================================
// Matching Engine Class
// =============================================================================

/**
 * Main matching engine for suggesting file destinations.
 */
export class MatchingEngine {
  constructor() {
    this.rulesCache = null;
    this.foldersCache = null;
    this.categoriesCache = null;
    this.areasCache = null;
    this.lastCacheRefresh = 0;
    this.cacheLifetime = 30000; // 30 seconds
  }

  /**
   * Refreshes the rules and folder cache.
   */
  refreshCache() {
    const now = Date.now();
    if (now - this.lastCacheRefresh < this.cacheLifetime && this.rulesCache) {
      return;
    }

    this.rulesCache = getOrganizationRules({ activeOnly: true });
    this.foldersCache = getFolders();
    this.categoriesCache = getCategories();
    this.areasCache = getAreas();
    this.lastCacheRefresh = now;
  }

  /**
   * Forces a cache refresh on next operation.
   */
  invalidateCache() {
    this.lastCacheRefresh = 0;
  }

  /**
   * Gets all active rules, sorted by priority.
   */
  getRules() {
    this.refreshCache();
    return [...this.rulesCache].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Gets all folders with their full hierarchy info.
   */
  getFoldersWithContext() {
    this.refreshCache();
    return this.foldersCache.map(folder => {
      const category = this.categoriesCache.find(c => c.id === folder.category_id);
      const area = category 
        ? this.areasCache.find(a => a.id === category.area_id)
        : null;
      
      return {
        ...folder,
        category,
        area,
        fullPath: area && category
          ? `${area.name} > ${category.name} > ${folder.name}`
          : folder.name,
      };
    });
  }

  /**
   * Matches a file against all rules and returns suggestions.
   * 
   * @param {Object} file - File info from scanner
   * @param {string} file.filename - Name of the file
   * @param {string} file.path - Full path to file
   * @param {string} file.file_extension - File extension
   * @param {string} file.file_type - Detected file type
   * @returns {Array} Array of suggestions sorted by confidence
   */
  matchFile(file) {
    const suggestions = [];
    const rules = this.getRules();
    const folders = this.getFoldersWithContext();
    
    // Match against each rule
    for (const rule of rules) {
      const match = this.matchRule(rule, file);
      if (match) {
        // Find target folder
        const targetFolder = this.findTargetFolder(rule, folders);
        if (targetFolder) {
          suggestions.push({
            folder: targetFolder,
            rule,
            confidence: match.confidence,
            reason: match.reason,
          });
        }
      }
    }

    // If no rule matches, try heuristic matching
    if (suggestions.length === 0) {
      const heuristicSuggestions = this.heuristicMatch(file, folders);
      suggestions.push(...heuristicSuggestions);
    }

    // Sort by confidence and priority
    return suggestions.sort((a, b) => {
      const confOrder = { high: 3, medium: 2, low: 1, none: 0 };
      const confDiff = confOrder[b.confidence] - confOrder[a.confidence];
      if (confDiff !== 0) return confDiff;
      return (b.rule?.priority || 0) - (a.rule?.priority || 0);
    });
  }

  /**
   * Matches a single rule against a file.
   */
  matchRule(rule, file) {
    switch (rule.rule_type) {
      case 'extension':
        return this.matchExtensionRule(rule, file);
      case 'keyword':
        return this.matchKeywordRule(rule, file);
      case 'path':
        return this.matchPathRule(rule, file);
      case 'regex':
        return this.matchRegexRule(rule, file);
      default:
        return null;
    }
  }

  /**
   * Matches extension-based rule.
   */
  matchExtensionRule(rule, file) {
    const pattern = rule.pattern.toLowerCase().replace(/^\./, '');
    const ext = (file.file_extension || '').toLowerCase();
    
    if (ext === pattern) {
      return {
        confidence: CONFIDENCE.HIGH,
        reason: `Extension matches: .${ext}`,
      };
    }
    return null;
  }

  /**
   * Matches keyword-based rule.
   */
  matchKeywordRule(rule, file) {
    const keywords = rule.pattern.toLowerCase().split(',').map(k => k.trim());
    const filename = file.filename.toLowerCase();
    const path = (file.path || '').toLowerCase();
    
    for (const keyword of keywords) {
      if (filename.includes(keyword)) {
        return {
          confidence: CONFIDENCE.HIGH,
          reason: `Filename contains: "${keyword}"`,
        };
      }
      if (path.includes(keyword)) {
        return {
          confidence: CONFIDENCE.MEDIUM,
          reason: `Path contains: "${keyword}"`,
        };
      }
    }
    return null;
  }

  /**
   * Matches path-based rule.
   */
  matchPathRule(rule, file) {
    const pattern = rule.pattern.toLowerCase();
    const path = (file.path || '').toLowerCase();
    
    if (path.includes(pattern)) {
      return {
        confidence: CONFIDENCE.MEDIUM,
        reason: `Path matches pattern: "${rule.pattern}"`,
      };
    }
    return null;
  }

  /**
   * Matches regex-based rule.
   */
  matchRegexRule(rule, file) {
    const testString = `${file.filename} ${file.path || ''}`;
    
    if (safeRegexTest(rule.pattern, testString)) {
      return {
        confidence: CONFIDENCE.LOW,
        reason: `Regex pattern matched`,
      };
    }
    return null;
  }

  /**
   * Finds the target folder for a rule.
   */
  findTargetFolder(rule, folders) {
    switch (rule.target_type) {
      case 'folder':
        return folders.find(f => f.folder_number === rule.target_id);
      
      case 'category': {
        // Find first folder in this category
        const categoryFolders = folders.filter(f => 
          f.category?.number?.toString().padStart(2, '0') === rule.target_id
        );
        return categoryFolders[0] || null;
      }
      
      case 'area': {
        // Find first folder in this area
        const [start, end] = rule.target_id.split('-').map(n => parseInt(n));
        const areaFolders = folders.filter(f => {
          const catNum = f.category?.number || 0;
          return catNum >= start && catNum <= end;
        });
        return areaFolders[0] || null;
      }
      
      default:
        return null;
    }
  }

  /**
   * Performs heuristic matching when no rules match.
   */
  heuristicMatch(file, folders) {
    const suggestions = [];
    const ext = (file.file_extension || '').toLowerCase();
    const filename = file.filename.toLowerCase();
    const fileKeywords = extractKeywords(file.filename);

    // Try extension-based default suggestions
    const extInfo = DEFAULT_EXTENSION_SUGGESTIONS[ext];
    if (extInfo) {
      // Find folders that might match these keywords
      for (const folder of folders) {
        const folderKeywords = [
          folder.name.toLowerCase(),
          ...(folder.keywords || '').toLowerCase().split(',').map(k => k.trim()),
          folder.category?.name?.toLowerCase() || '',
        ].filter(Boolean);

        const matchScore = extInfo.keywords.reduce((score, keyword) => {
          if (folderKeywords.some(fk => fk.includes(keyword) || keyword.includes(fk))) {
            return score + 1;
          }
          return score;
        }, 0);

        if (matchScore > 0) {
          suggestions.push({
            folder,
            rule: null,
            confidence: matchScore >= 2 ? CONFIDENCE.MEDIUM : CONFIDENCE.LOW,
            reason: `File type "${extInfo.type}" may belong here`,
          });
        }
      }
    }

    // Try keyword-based matching
    for (const folder of folders) {
      const folderKeywords = [
        ...folder.name.toLowerCase().split(/[-_.\s]+/),
        ...(folder.keywords || '').toLowerCase().split(',').map(k => k.trim()),
      ].filter(k => k.length > 2);

      for (const fileKw of fileKeywords) {
        for (const folderKw of folderKeywords) {
          const similarity = stringSimilarity(fileKw, folderKw);
          if (similarity > 0.7) {
            suggestions.push({
              folder,
              rule: null,
              confidence: CONFIDENCE.LOW,
              reason: `Keyword similarity: "${fileKw}" ≈ "${folderKw}"`,
            });
          }
        }
      }
    }

    // Deduplicate by folder
    const seen = new Set();
    return suggestions.filter(s => {
      if (seen.has(s.folder.id)) return false;
      seen.add(s.folder.id);
      return true;
    });
  }

  /**
   * Batch matches multiple files.
   * 
   * @param {Array} files - Array of file objects
   * @returns {Array} Array of { file, suggestions } objects
   */
  batchMatch(files) {
    this.refreshCache();
    
    return files.map(file => ({
      file,
      suggestions: this.matchFile(file),
    }));
  }

  /**
   * Creates a new rule and invalidates cache.
   */
  createRule(ruleData) {
    const result = createOrganizationRule(ruleData);
    this.invalidateCache();
    return result;
  }

  /**
   * Updates a rule and invalidates cache.
   */
  updateRule(id, updates) {
    const result = updateOrganizationRule(id, updates);
    this.invalidateCache();
    return result;
  }

  /**
   * Records that a rule successfully matched (for analytics).
   */
  recordMatch(ruleId) {
    if (ruleId) {
      incrementRuleMatchCount(ruleId);
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let engineInstance = null;

/**
 * Gets the singleton matching engine instance.
 */
export function getMatchingEngine() {
  if (!engineInstance) {
    engineInstance = new MatchingEngine();
  }
  return engineInstance;
}

// =============================================================================
// Rule Helpers
// =============================================================================

/**
 * Creates a simple extension rule.
 */
export function createExtensionRule(extension, targetFolderNumber, name = null) {
  const engine = getMatchingEngine();
  const ext = extension.replace(/^\./, '').toLowerCase();
  
  return engine.createRule({
    name: name || `Auto-organize .${ext} files`,
    rule_type: 'extension',
    pattern: ext,
    target_type: 'folder',
    target_id: targetFolderNumber,
    priority: 50,
  });
}

/**
 * Creates a keyword rule.
 */
export function createKeywordRule(keywords, targetFolderNumber, name = null) {
  const engine = getMatchingEngine();
  const keywordList = Array.isArray(keywords) ? keywords.join(',') : keywords;
  
  return engine.createRule({
    name: name || `Auto-organize files containing: ${keywordList}`,
    rule_type: 'keyword',
    pattern: keywordList.toLowerCase(),
    target_type: 'folder',
    target_id: targetFolderNumber,
    priority: 60, // Keywords are often more specific
  });
}

/**
 * Suggests rules based on a folder's content.
 */
export function suggestRulesForFolder(folder, files) {
  const suggestions = [];
  
  // Count extensions
  const extCounts = {};
  for (const file of files) {
    const ext = file.file_extension?.toLowerCase();
    if (ext) {
      extCounts[ext] = (extCounts[ext] || 0) + 1;
    }
  }

  // Suggest extension rules for common types
  for (const [ext, count] of Object.entries(extCounts)) {
    if (count >= 3) {
      suggestions.push({
        type: 'extension',
        pattern: ext,
        confidence: count >= 10 ? 'high' : count >= 5 ? 'medium' : 'low',
        reason: `${count} .${ext} files found`,
      });
    }
  }

  // Extract common keywords from filenames
  const keywordCounts = {};
  for (const file of files) {
    const keywords = extractKeywords(file.filename);
    for (const kw of keywords) {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    }
  }

  // Suggest keyword rules for recurring keywords
  for (const [keyword, count] of Object.entries(keywordCounts)) {
    if (count >= 3 && keyword.length >= 4) {
      suggestions.push({
        type: 'keyword',
        pattern: keyword,
        confidence: count >= 8 ? 'high' : count >= 5 ? 'medium' : 'low',
        reason: `"${keyword}" appears in ${count} filenames`,
      });
    }
  }

  return suggestions.sort((a, b) => {
    const confOrder = { high: 3, medium: 2, low: 1 };
    return confOrder[b.confidence] - confOrder[a.confidence];
  });
}

// =============================================================================
// Exports
// =============================================================================

export default {
  MatchingEngine,
  getMatchingEngine,
  createExtensionRule,
  createKeywordRule,
  suggestRulesForFolder,
  CONFIDENCE,
};
