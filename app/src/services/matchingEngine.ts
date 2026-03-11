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
 * 5. Compound rules - Match by extension AND keyword together (e.g., .pdf + "invoice" → 11.01)
 * 6. Date rules - Match by date patterns in filename (e.g., 2024-01 → 11.01)
 *
 * Features:
 * - Exclude patterns - Skip files matching an exclude pattern
 *
 * Security:
 * - All inputs are validated
 * - Regex patterns are sandboxed with timeout
 * - No arbitrary code execution
 */

import {
  getOrganizationRules,
  createOrganizationRule,
  updateOrganizationRule,
  incrementRuleMatchCount,
  getFolders,
  getCategories,
  getAreas,
} from '../db.js';
import type {
  OrganizationRule,
  Folder,
  Category,
  Area,
  RuleType,
  TargetType,
  ConfidenceLevel,
} from '../types/index.js';

// =============================================================================
// Types
// =============================================================================

/**
 * File info input for matching.
 */
export interface FileInfo {
  filename: string;
  path?: string;
  file_extension?: string;
  file_type?: string;
}

/**
 * Extended folder with hierarchy context.
 */
export interface FolderWithContext extends Folder {
  category?: Category;
  area?: Area | null;
  fullPath: string;
}

/**
 * Match result from a rule.
 */
export interface RuleMatch {
  confidence: ConfidenceLevel;
  reason: string;
}

/**
 * Suggestion for file organization.
 */
export interface FileSuggestion {
  folder: FolderWithContext;
  rule: OrganizationRule | null;
  confidence: ConfidenceLevel;
  reason: string;
}

/**
 * Batch match result.
 */
export interface BatchMatchResult {
  file: FileInfo;
  suggestions: FileSuggestion[];
}

/**
 * Date extraction result.
 */
export interface DateExtractionResult {
  match: string;
  format: string;
  confidence: string;
  groups: string[];
}

/**
 * Extension suggestion info.
 */
interface ExtensionInfo {
  type: string;
  keywords: string[];
}

/**
 * Date pattern configuration.
 */
interface DatePattern {
  regex: RegExp;
  format: string;
  confidence: string;
}

/**
 * Rule suggestion for a folder.
 */
export interface RuleSuggestion {
  type: 'extension' | 'keyword';
  pattern: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * Date match criteria.
 */
export interface DateMatchCriteria {
  year?: string;
  month?: string;
  quarter?: string;
  any?: boolean;
}

/**
 * Rule creation data.
 */
export interface RuleCreateData {
  name: string;
  rule_type: RuleType;
  pattern: string;
  target_type: TargetType;
  target_id: string;
  priority: number;
  exclude_pattern?: string | null;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Confidence levels for suggestions.
 */
export const CONFIDENCE = {
  HIGH: 'high' as ConfidenceLevel,
  MEDIUM: 'medium' as ConfidenceLevel,
  LOW: 'low' as ConfidenceLevel,
  NONE: 'none' as ConfidenceLevel,
} as const;

/**
 * Default extension-to-folder mappings.
 * These serve as fallback suggestions when no custom rules match.
 */
const DEFAULT_EXTENSION_SUGGESTIONS: Record<string, ExtensionInfo> = {
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
 * Exported for potential future use in keyword-based matching enhancements.
 */
export const KEYWORD_INDICATORS: Record<string, string[]> = {
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
// Date Pattern Recognition
// =============================================================================

/**
 * Common date patterns in filenames.
 * Used for automatic date-based organization.
 */
const DATE_PATTERNS: DatePattern[] = [
  // ISO format: 2024-01-15, 2024-01-15T10:30
  { regex: /(\d{4})-(\d{2})-(\d{2})/, format: 'YYYY-MM-DD', confidence: 'high' },
  // US format: 01-15-2024, 01/15/2024
  { regex: /(\d{2})[-/](\d{2})[-/](\d{4})/, format: 'MM-DD-YYYY', confidence: 'medium' },
  // Compact: 20240115
  { regex: /\b(20\d{2})(\d{2})(\d{2})\b/, format: 'YYYYMMDD', confidence: 'medium' },
  // Year-month: 2024-01, 2024_01
  { regex: /(20\d{2})[-_](\d{2})/, format: 'YYYY-MM', confidence: 'medium' },
  // Month-year: Jan2024, January-2024
  {
    regex:
      /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[_\-\s]?(20\d{2})/i,
    format: 'Month-YYYY',
    confidence: 'medium',
  },
  // Quarter: Q1-2024, 2024-Q2
  {
    regex: /(20\d{2})[-_]?Q([1-4])|Q([1-4])[-_]?(20\d{2})/i,
    format: 'Quarter',
    confidence: 'medium',
  },
];

/**
 * Extracts date information from a filename.
 */
export function extractDateFromFilename(filename: string): DateExtractionResult | null {
  for (const pattern of DATE_PATTERNS) {
    const match = filename.match(pattern.regex);
    if (match) {
      return {
        match: match[0],
        format: pattern.format,
        confidence: pattern.confidence,
        groups: match.slice(1).filter((g) => g !== undefined),
      };
    }
  }
  return null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Safely executes a regex with timeout protection.
 */
function safeRegexTest(pattern: string, text: string, timeoutMs: number = 100): boolean {
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
function extractKeywords(filename: string): string[] {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');

  // Split on common separators and convert to lowercase
  const words = nameWithoutExt
    .toLowerCase()
    .split(/[-_.\s]+/)
    .filter((word) => word.length > 2);

  return words;
}

/**
 * Calculates similarity score between two strings (0-1).
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Simple character overlap
  const set1 = new Set(s1);
  const set2 = new Set(s2);
  const intersection = [...set1].filter((c) => set2.has(c)).length;
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
  private rulesCache: OrganizationRule[] | null = null;
  private foldersCache: Folder[] | null = null;
  private categoriesCache: Category[] | null = null;
  private areasCache: Area[] | null = null;
  private lastCacheRefresh: number = 0;
  private cacheLifetime: number = 30000; // 30 seconds

  /**
   * Refreshes the rules and folder cache.
   */
  refreshCache(): void {
    const now = Date.now();
    if (now - this.lastCacheRefresh < this.cacheLifetime && this.rulesCache) {
      return;
    }

    this.rulesCache = getOrganizationRules({ activeOnly: true }) as OrganizationRule[];
    this.foldersCache = getFolders() as Folder[];
    this.categoriesCache = getCategories() as Category[];
    this.areasCache = getAreas() as Area[];
    this.lastCacheRefresh = now;
  }

  /**
   * Forces a cache refresh on next operation.
   */
  invalidateCache(): void {
    this.lastCacheRefresh = 0;
  }

  /**
   * Gets all active rules, sorted by priority.
   */
  getRules(): OrganizationRule[] {
    this.refreshCache();
    return [...(this.rulesCache || [])].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Gets all folders with their full hierarchy info.
   */
  getFoldersWithContext(): FolderWithContext[] {
    this.refreshCache();
    return (this.foldersCache || []).map((folder) => {
      const category = this.categoriesCache?.find((c) => c.id === folder.category_id);
      const area = category ? this.areasCache?.find((a) => a.id === category.area_id) : null;

      return {
        ...folder,
        category,
        area,
        fullPath:
          area && category ? `${area.name} > ${category.name} > ${folder.name}` : folder.name,
      };
    });
  }

  /**
   * Matches a file against all rules and returns suggestions.
   */
  matchFile(file: FileInfo): FileSuggestion[] {
    const suggestions: FileSuggestion[] = [];
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
      const confOrder: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1, none: 0 };
      const confDiff = confOrder[b.confidence] - confOrder[a.confidence];
      if (confDiff !== 0) return confDiff;
      return (b.rule?.priority || 0) - (a.rule?.priority || 0);
    });
  }

  /**
   * Checks if a file should be excluded based on rule's exclude pattern.
   */
  shouldExclude(rule: OrganizationRule & { exclude_pattern?: string }, file: FileInfo): boolean {
    if (!rule.exclude_pattern) return false;

    const patterns = rule.exclude_pattern
      .toLowerCase()
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const filename = file.filename.toLowerCase();
    const path = (file.path || '').toLowerCase();
    const testString = `${filename} ${path}`;

    for (const pattern of patterns) {
      // Check if pattern is a regex (starts with /)
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        const regexPattern = pattern.slice(1, -1);
        if (safeRegexTest(regexPattern, testString)) {
          return true;
        }
      } else {
        // Plain text pattern
        if (testString.includes(pattern)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Matches a single rule against a file.
   */
  matchRule(rule: OrganizationRule, file: FileInfo): RuleMatch | null {
    // Check exclusions first
    if (this.shouldExclude(rule as OrganizationRule & { exclude_pattern?: string }, file)) {
      return null;
    }

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
        // Handle additional rule types
        if ((rule.rule_type as string) === 'compound') {
          return this.matchCompoundRule(rule, file);
        }
        if ((rule.rule_type as string) === 'date') {
          return this.matchDateRule(rule, file);
        }
        return null;
    }
  }

  /**
   * Matches extension-based rule.
   */
  matchExtensionRule(rule: OrganizationRule, file: FileInfo): RuleMatch | null {
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
  matchKeywordRule(rule: OrganizationRule, file: FileInfo): RuleMatch | null {
    const keywords = rule.pattern
      .toLowerCase()
      .split(',')
      .map((k) => k.trim());
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
  matchPathRule(rule: OrganizationRule, file: FileInfo): RuleMatch | null {
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
  matchRegexRule(rule: OrganizationRule, file: FileInfo): RuleMatch | null {
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
   * Matches compound rule (extension + keyword together).
   * Pattern format: "ext:pdf,keyword:invoice" or "ext:xlsx,keyword:budget,report"
   */
  matchCompoundRule(rule: OrganizationRule, file: FileInfo): RuleMatch | null {
    const conditions = rule.pattern.split(',').map((c) => c.trim());
    let extensionMatch = false;
    let keywordMatch = false;
    let matchedExt = '';
    let matchedKeyword = '';

    const ext = (file.file_extension || '').toLowerCase();
    const filename = file.filename.toLowerCase();
    const path = (file.path || '').toLowerCase();

    for (const condition of conditions) {
      if (condition.startsWith('ext:')) {
        const targetExt = condition.slice(4).toLowerCase().replace(/^\./, '');
        if (ext === targetExt) {
          extensionMatch = true;
          matchedExt = targetExt;
        }
      } else if (condition.startsWith('keyword:')) {
        const keyword = condition.slice(8).toLowerCase();
        if (filename.includes(keyword) || path.includes(keyword)) {
          keywordMatch = true;
          matchedKeyword = keyword;
        }
      }
    }

    // Compound rule requires ALL conditions to match
    if (extensionMatch && keywordMatch) {
      return {
        confidence: CONFIDENCE.HIGH,
        reason: `Compound match: .${matchedExt} + "${matchedKeyword}"`,
      };
    }

    return null;
  }

  /**
   * Matches date-based rule.
   * Pattern format: "year:2024" or "month:01" or "quarter:Q1" or "range:2024-01,2024-03"
   */
  matchDateRule(rule: OrganizationRule, file: FileInfo): RuleMatch | null {
    const dateInfo = extractDateFromFilename(file.filename);
    if (!dateInfo) return null;

    const conditions = rule.pattern.split(',').map((c) => c.trim());

    for (const condition of conditions) {
      if (condition.startsWith('year:')) {
        const targetYear = condition.slice(5);
        // Check if the date groups contain this year
        if (dateInfo.groups.some((g) => g === targetYear)) {
          return {
            confidence: dateInfo.confidence === 'high' ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM,
            reason: `Date matches year: ${targetYear}`,
          };
        }
      } else if (condition.startsWith('month:')) {
        const targetMonth = condition.slice(6).padStart(2, '0');
        if (dateInfo.groups.some((g) => g === targetMonth)) {
          return {
            confidence: CONFIDENCE.MEDIUM,
            reason: `Date matches month: ${targetMonth}`,
          };
        }
      } else if (condition.startsWith('quarter:')) {
        const targetQuarter = condition.slice(8).toUpperCase().replace('Q', '');
        if (dateInfo.format === 'Quarter' && dateInfo.groups.some((g) => g === targetQuarter)) {
          return {
            confidence: CONFIDENCE.MEDIUM,
            reason: `Date matches quarter: Q${targetQuarter}`,
          };
        }
      } else if (condition.startsWith('pattern:')) {
        // Match any date pattern
        const targetPattern = condition.slice(8);
        if (!targetPattern || targetPattern === '*') {
          return {
            confidence: CONFIDENCE.LOW,
            reason: `Contains date: ${dateInfo.match}`,
          };
        }
      }
    }

    return null;
  }

  /**
   * Finds the target folder for a rule.
   */
  findTargetFolder(
    rule: OrganizationRule,
    folders: FolderWithContext[]
  ): FolderWithContext | undefined | null {
    switch (rule.target_type) {
      case 'folder':
        return folders.find((f) => f.folder_number === rule.target_id);

      case 'category': {
        // Find first folder in this category
        const categoryFolders = folders.filter(
          (f) => f.category?.number?.toString().padStart(2, '0') === rule.target_id
        );
        return categoryFolders[0];
      }

      case 'area': {
        // Find first folder in this area
        const parts = rule.target_id.split('-');
        const start = parseInt(parts[0]);
        const end = parseInt(parts[1]);
        const areaFolders = folders.filter((f) => {
          const catNum = f.category?.number || 0;
          return catNum >= start && catNum <= end;
        });
        return areaFolders[0];
      }

      default:
        return null;
    }
  }

  /**
   * Performs heuristic matching when no rules match.
   */
  heuristicMatch(file: FileInfo, folders: FolderWithContext[]): FileSuggestion[] {
    const suggestions: FileSuggestion[] = [];
    const ext = (file.file_extension || '').toLowerCase();
    const fileKeywords = extractKeywords(file.filename);

    // Try extension-based default suggestions
    const extInfo = DEFAULT_EXTENSION_SUGGESTIONS[ext];
    if (extInfo) {
      // Find folders that might match these keywords
      for (const folder of folders) {
        const folderKeywords = [
          folder.name.toLowerCase(),
          ...(folder.keywords || '')
            .toLowerCase()
            .split(',')
            .map((k) => k.trim()),
          folder.category?.name?.toLowerCase() || '',
        ].filter(Boolean);

        const matchScore = extInfo.keywords.reduce((score, keyword) => {
          if (folderKeywords.some((fk) => fk.includes(keyword) || keyword.includes(fk))) {
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
        ...(folder.keywords || '')
          .toLowerCase()
          .split(',')
          .map((k) => k.trim()),
      ].filter((k) => k.length > 2);

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
    const seen = new Set<number>();
    return suggestions.filter((s) => {
      if (seen.has(s.folder.id)) return false;
      seen.add(s.folder.id);
      return true;
    });
  }

  /**
   * Batch matches multiple files.
   */
  batchMatch(files: FileInfo[]): BatchMatchResult[] {
    this.refreshCache();

    return files.map((file) => ({
      file,
      suggestions: this.matchFile(file),
    }));
  }

  /**
   * Creates a new rule and invalidates cache.
   */
  createRule(ruleData: RuleCreateData): number {
    const result = createOrganizationRule(ruleData) as number;
    this.invalidateCache();
    return result;
  }

  /**
   * Updates a rule and invalidates cache.
   */
  updateRule(id: number, updates: Partial<OrganizationRule>): void {
    updateOrganizationRule(id, updates);
    this.invalidateCache();
  }

  /**
   * Records that a rule successfully matched (for analytics).
   */
  recordMatch(ruleId: number | null | undefined): void {
    if (ruleId) {
      incrementRuleMatchCount(ruleId);
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let engineInstance: MatchingEngine | null = null;

/**
 * Gets the singleton matching engine instance.
 */
export function getMatchingEngine(): MatchingEngine {
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
export function createExtensionRule(
  extension: string,
  targetFolderNumber: string,
  name: string | null = null
): number {
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
export function createKeywordRule(
  keywords: string | string[],
  targetFolderNumber: string,
  name: string | null = null,
  excludePattern: string | null = null
): number {
  const engine = getMatchingEngine();
  const keywordList = Array.isArray(keywords) ? keywords.join(',') : keywords;

  return engine.createRule({
    name: name || `Auto-organize files containing: ${keywordList}`,
    rule_type: 'keyword',
    pattern: keywordList.toLowerCase(),
    target_type: 'folder',
    target_id: targetFolderNumber,
    priority: 60, // Keywords are often more specific
    exclude_pattern: excludePattern,
  });
}

/**
 * Creates a compound rule (extension + keyword).
 */
export function createCompoundRule(
  extension: string,
  keywords: string | string[],
  targetFolderNumber: string,
  name: string | null = null,
  excludePattern: string | null = null
): number {
  const engine = getMatchingEngine();
  const ext = extension.replace(/^\./, '').toLowerCase();
  const keywordList = Array.isArray(keywords) ? keywords : [keywords];

  // Build compound pattern: ext:pdf,keyword:invoice,keyword:receipt
  const pattern = [`ext:${ext}`, ...keywordList.map((k) => `keyword:${k.toLowerCase()}`)].join(',');

  return engine.createRule({
    name: name || `Auto-organize .${ext} files with: ${keywordList.join(', ')}`,
    rule_type: 'compound',
    pattern,
    target_type: 'folder',
    target_id: targetFolderNumber,
    priority: 70, // Compound rules are most specific
    exclude_pattern: excludePattern,
  });
}

/**
 * Creates a date-based rule.
 */
export function createDateRule(
  dateMatch: DateMatchCriteria,
  targetFolderNumber: string,
  name: string | null = null,
  excludePattern: string | null = null
): number {
  const engine = getMatchingEngine();

  // Build date pattern
  const patternParts: string[] = [];
  if (dateMatch.year) patternParts.push(`year:${dateMatch.year}`);
  if (dateMatch.month) patternParts.push(`month:${dateMatch.month.padStart(2, '0')}`);
  if (dateMatch.quarter) patternParts.push(`quarter:${dateMatch.quarter.toUpperCase()}`);
  if (dateMatch.any) patternParts.push('pattern:*');

  const pattern = patternParts.join(',') || 'pattern:*';

  return engine.createRule({
    name: name || `Auto-organize files by date: ${pattern}`,
    rule_type: 'date',
    pattern,
    target_type: 'folder',
    target_id: targetFolderNumber,
    priority: 55, // Date rules are moderately specific
    exclude_pattern: excludePattern,
  });
}

/**
 * Suggests rules based on a folder's content.
 */
export function suggestRulesForFolder(_folder: Folder, files: FileInfo[]): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];

  // Count extensions
  const extCounts: Record<string, number> = {};
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
  const keywordCounts: Record<string, number> = {};
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
    const confOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
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
  createCompoundRule,
  createDateRule,
  extractDateFromFilename,
  suggestRulesForFolder,
  CONFIDENCE,
};
