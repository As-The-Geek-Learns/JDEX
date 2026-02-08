/**
 * matchingEngine.js Tests
 * ========================
 * Phase 1 test coverage for the matching engine service.
 *
 * Tests cover:
 * - CONFIDENCE constant
 * - Helper functions (safeRegexTest, extractKeywords, stringSimilarity)
 * - MatchingEngine class methods
 * - Singleton getMatchingEngine
 * - Rule helper functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CONFIDENCE,
  MatchingEngine,
  getMatchingEngine,
  createExtensionRule,
  createKeywordRule,
  suggestRulesForFolder,
} from './matchingEngine.js';

// =============================================================================
// Mocks
// =============================================================================

// Mock db.js functions
vi.mock('../db.js', () => ({
  getOrganizationRules: vi.fn(() => []),
  getOrganizationRule: vi.fn(() => null),
  createOrganizationRule: vi.fn((data) => ({ id: 1, ...data })),
  updateOrganizationRule: vi.fn((id, data) => ({ id, ...data })),
  incrementRuleMatchCount: vi.fn(),
  getFolders: vi.fn(() => []),
  getCategories: vi.fn(() => []),
  getAreas: vi.fn(() => []),
}));

// Import mocked functions for manipulation
import {
  getOrganizationRules,
  createOrganizationRule,
  updateOrganizationRule,
  incrementRuleMatchCount,
  getFolders,
  getCategories,
  getAreas,
} from '../db.js';

// =============================================================================
// Test Data Fixtures
// =============================================================================

const mockAreas = [
  { id: 1, number: 10, name: 'Finance' },
  { id: 2, number: 20, name: 'Work' },
  { id: 3, number: 30, name: 'Personal' },
];

const mockCategories = [
  { id: 1, area_id: 1, number: 11, name: 'Invoices' },
  { id: 2, area_id: 1, number: 12, name: 'Receipts' },
  { id: 3, area_id: 2, number: 21, name: 'Projects' },
  { id: 4, area_id: 3, number: 31, name: 'Photos' },
];

const mockFolders = [
  {
    id: 1,
    category_id: 1,
    folder_number: '11.01',
    name: 'Client Invoices',
    keywords: 'billing,invoice',
  },
  { id: 2, category_id: 1, folder_number: '11.02', name: 'Vendor Invoices', keywords: 'supplier' },
  { id: 3, category_id: 2, folder_number: '12.01', name: 'Business Receipts', keywords: 'expense' },
  {
    id: 4,
    category_id: 3,
    folder_number: '21.01',
    name: 'Active Projects',
    keywords: 'current,work',
  },
  {
    id: 5,
    category_id: 4,
    folder_number: '31.01',
    name: 'Family Photos',
    keywords: 'photo,family',
  },
];

const mockRules = [
  {
    id: 1,
    name: 'PDF to Invoices',
    rule_type: 'extension',
    pattern: 'pdf',
    target_type: 'folder',
    target_id: '11.01',
    priority: 50,
    is_active: true,
  },
  {
    id: 2,
    name: 'Invoice keyword',
    rule_type: 'keyword',
    pattern: 'invoice,bill',
    target_type: 'folder',
    target_id: '11.01',
    priority: 60,
    is_active: true,
  },
  {
    id: 3,
    name: 'Work path',
    rule_type: 'path',
    pattern: '/work/',
    target_type: 'folder',
    target_id: '21.01',
    priority: 40,
    is_active: true,
  },
  {
    id: 4,
    name: 'Date regex',
    rule_type: 'regex',
    pattern: '\\d{4}-\\d{2}-\\d{2}',
    target_type: 'folder',
    target_id: '11.01',
    priority: 30,
    is_active: true,
  },
];

// =============================================================================
// CONFIDENCE Constant Tests
// =============================================================================

describe('CONFIDENCE constant', () => {
  it('should have all required confidence levels', () => {
    expect(CONFIDENCE.HIGH).toBe('high');
    expect(CONFIDENCE.MEDIUM).toBe('medium');
    expect(CONFIDENCE.LOW).toBe('low');
    expect(CONFIDENCE.NONE).toBe('none');
  });

  it('should have exactly 4 confidence levels', () => {
    expect(Object.keys(CONFIDENCE)).toHaveLength(4);
  });
});

// =============================================================================
// MatchingEngine Class Tests
// =============================================================================

describe('MatchingEngine', () => {
  let engine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new MatchingEngine();

    // Setup default mock returns
    getOrganizationRules.mockReturnValue([...mockRules]);
    getFolders.mockReturnValue([...mockFolders]);
    getCategories.mockReturnValue([...mockCategories]);
    getAreas.mockReturnValue([...mockAreas]);
  });

  // ---------------------------------------------------------------------------
  // Constructor and Cache Tests
  // ---------------------------------------------------------------------------

  describe('constructor', () => {
    it('should initialize with null caches', () => {
      expect(engine.rulesCache).toBeNull();
      expect(engine.foldersCache).toBeNull();
      expect(engine.categoriesCache).toBeNull();
      expect(engine.areasCache).toBeNull();
    });

    it('should have default cache lifetime of 30 seconds', () => {
      expect(engine.cacheLifetime).toBe(30000);
    });
  });

  describe('refreshCache', () => {
    it('should load data from db when cache is empty', () => {
      engine.refreshCache();

      expect(getOrganizationRules).toHaveBeenCalledWith({ activeOnly: true });
      expect(getFolders).toHaveBeenCalled();
      expect(getCategories).toHaveBeenCalled();
      expect(getAreas).toHaveBeenCalled();
    });

    it('should not reload if cache is still valid', () => {
      engine.refreshCache();
      engine.refreshCache();

      // Should only be called once
      expect(getOrganizationRules).toHaveBeenCalledTimes(1);
    });

    it('should reload after cache expires', () => {
      engine.refreshCache();

      // Simulate cache expiry
      engine.lastCacheRefresh = Date.now() - 40000;
      engine.refreshCache();

      expect(getOrganizationRules).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidateCache', () => {
    it('should force cache refresh on next operation', () => {
      engine.refreshCache();
      engine.invalidateCache();
      engine.refreshCache();

      expect(getOrganizationRules).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Rule Retrieval Tests
  // ---------------------------------------------------------------------------

  describe('getRules', () => {
    it('should return rules sorted by priority descending', () => {
      const rules = engine.getRules();

      expect(rules[0].priority).toBe(60);
      expect(rules[1].priority).toBe(50);
      expect(rules[2].priority).toBe(40);
      expect(rules[3].priority).toBe(30);
    });

    it('should refresh cache if needed', () => {
      engine.getRules();
      expect(getOrganizationRules).toHaveBeenCalled();
    });
  });

  describe('getFoldersWithContext', () => {
    it('should return folders with category and area info', () => {
      const folders = engine.getFoldersWithContext();

      expect(folders[0].category).toBeDefined();
      expect(folders[0].area).toBeDefined();
      expect(folders[0].fullPath).toContain('>');
    });

    it('should build correct full path', () => {
      const folders = engine.getFoldersWithContext();
      const invoiceFolder = folders.find((f) => f.folder_number === '11.01');

      expect(invoiceFolder.fullPath).toBe('Finance > Invoices > Client Invoices');
    });

    it('should handle folders without category gracefully', () => {
      getFolders.mockReturnValue([{ id: 99, folder_number: '99.01', name: 'Orphan' }]);

      const folders = engine.getFoldersWithContext();

      expect(folders[0].category).toBeUndefined();
      expect(folders[0].area).toBeNull(); // ternary returns null when category is undefined
      expect(folders[0].fullPath).toBe('Orphan');
    });
  });

  // ---------------------------------------------------------------------------
  // Rule Matching Tests
  // ---------------------------------------------------------------------------

  describe('matchRule', () => {
    it('should delegate to matchExtensionRule for extension type', () => {
      const rule = { rule_type: 'extension', pattern: 'pdf' };
      const file = { filename: 'test.pdf', file_extension: 'pdf' };

      const result = engine.matchRule(rule, file);

      expect(result.confidence).toBe(CONFIDENCE.HIGH);
    });

    it('should delegate to matchKeywordRule for keyword type', () => {
      const rule = { rule_type: 'keyword', pattern: 'invoice' };
      const file = { filename: 'my-invoice.pdf', path: '/docs/' };

      const result = engine.matchRule(rule, file);

      expect(result.confidence).toBe(CONFIDENCE.HIGH);
    });

    it('should delegate to matchPathRule for path type', () => {
      const rule = { rule_type: 'path', pattern: '/work/' };
      const file = { filename: 'file.txt', path: '/work/projects/' };

      const result = engine.matchRule(rule, file);

      expect(result.confidence).toBe(CONFIDENCE.MEDIUM);
    });

    it('should delegate to matchRegexRule for regex type', () => {
      const rule = { rule_type: 'regex', pattern: '\\d{4}-\\d{2}' };
      const file = { filename: '2024-01-report.pdf', path: '' };

      const result = engine.matchRule(rule, file);

      expect(result.confidence).toBe(CONFIDENCE.LOW);
    });

    it('should return null for unknown rule type', () => {
      const rule = { rule_type: 'unknown', pattern: 'test' };
      const file = { filename: 'test.txt' };

      const result = engine.matchRule(rule, file);

      expect(result).toBeNull();
    });
  });

  describe('matchExtensionRule', () => {
    it('should match exact extension (case insensitive)', () => {
      const rule = { pattern: 'PDF' };
      const file = { file_extension: 'pdf' };

      const result = engine.matchExtensionRule(rule, file);

      expect(result.confidence).toBe(CONFIDENCE.HIGH);
      expect(result.reason).toContain('.pdf');
    });

    it('should handle pattern with leading dot', () => {
      const rule = { pattern: '.pdf' };
      const file = { file_extension: 'pdf' };

      const result = engine.matchExtensionRule(rule, file);

      expect(result.confidence).toBe(CONFIDENCE.HIGH);
    });

    it('should return null for non-matching extension', () => {
      const rule = { pattern: 'pdf' };
      const file = { file_extension: 'doc' };

      const result = engine.matchExtensionRule(rule, file);

      expect(result).toBeNull();
    });

    it('should handle missing file extension', () => {
      const rule = { pattern: 'pdf' };
      const file = { filename: 'noext' };

      const result = engine.matchExtensionRule(rule, file);

      expect(result).toBeNull();
    });
  });

  describe('matchKeywordRule', () => {
    it('should match keyword in filename with HIGH confidence', () => {
      const rule = { pattern: 'invoice,bill' };
      const file = { filename: 'my-invoice-2024.pdf', path: '/docs/' };

      const result = engine.matchKeywordRule(rule, file);

      expect(result.confidence).toBe(CONFIDENCE.HIGH);
      expect(result.reason).toContain('Filename contains');
    });

    it('should match keyword in path with MEDIUM confidence', () => {
      const rule = { pattern: 'work,office' };
      const file = { filename: 'report.pdf', path: '/users/work/projects/' };

      const result = engine.matchKeywordRule(rule, file);

      expect(result.confidence).toBe(CONFIDENCE.MEDIUM);
      expect(result.reason).toContain('Path contains');
    });

    it('should return null when no keywords match', () => {
      const rule = { pattern: 'invoice,bill' };
      const file = { filename: 'photo.jpg', path: '/personal/' };

      const result = engine.matchKeywordRule(rule, file);

      expect(result).toBeNull();
    });

    it('should handle multiple keywords (comma-separated)', () => {
      const rule = { pattern: 'report, summary, analysis' };
      const file = { filename: 'quarterly-summary.xlsx', path: '' };

      const result = engine.matchKeywordRule(rule, file);

      expect(result.confidence).toBe(CONFIDENCE.HIGH);
    });
  });

  describe('matchPathRule', () => {
    it('should match path pattern', () => {
      const rule = { pattern: '/work/' };
      const file = { filename: 'file.txt', path: '/users/james/work/projects/' };

      const result = engine.matchPathRule(rule, file);

      expect(result.confidence).toBe(CONFIDENCE.MEDIUM);
    });

    it('should be case insensitive', () => {
      const rule = { pattern: '/Work/' };
      const file = { filename: 'file.txt', path: '/users/james/work/projects/' };

      const result = engine.matchPathRule(rule, file);

      expect(result.confidence).toBe(CONFIDENCE.MEDIUM);
    });

    it('should return null for non-matching path', () => {
      const rule = { pattern: '/work/' };
      const file = { filename: 'file.txt', path: '/personal/photos/' };

      const result = engine.matchPathRule(rule, file);

      expect(result).toBeNull();
    });

    it('should handle missing path', () => {
      const rule = { pattern: '/work/' };
      const file = { filename: 'file.txt' };

      const result = engine.matchPathRule(rule, file);

      expect(result).toBeNull();
    });
  });

  describe('matchRegexRule', () => {
    it('should match valid regex pattern', () => {
      const rule = { pattern: '\\d{4}-\\d{2}-\\d{2}' };
      const file = { filename: 'report-2024-01-15.pdf', path: '' };

      const result = engine.matchRegexRule(rule, file);

      expect(result.confidence).toBe(CONFIDENCE.LOW);
    });

    it('should combine filename and path for matching', () => {
      const rule = { pattern: 'project.*work' };
      const file = { filename: 'project-alpha.txt', path: '/work/' };

      const result = engine.matchRegexRule(rule, file);

      expect(result.confidence).toBe(CONFIDENCE.LOW);
    });

    it('should return null for non-matching regex', () => {
      const rule = { pattern: '^\\d{4}' };
      const file = { filename: 'report.pdf', path: '' };

      const result = engine.matchRegexRule(rule, file);

      expect(result).toBeNull();
    });

    it('should handle invalid regex gracefully', () => {
      const rule = { pattern: '[invalid(regex' };
      const file = { filename: 'test.txt', path: '' };

      const result = engine.matchRegexRule(rule, file);

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Target Folder Finding Tests
  // ---------------------------------------------------------------------------

  describe('findTargetFolder', () => {
    beforeEach(() => {
      engine.refreshCache();
    });

    it('should find folder by folder_number', () => {
      const rule = { target_type: 'folder', target_id: '11.01' };
      const folders = engine.getFoldersWithContext();

      const result = engine.findTargetFolder(rule, folders);

      expect(result.folder_number).toBe('11.01');
    });

    it('should find first folder in category', () => {
      const rule = { target_type: 'category', target_id: '11' };
      const folders = engine.getFoldersWithContext();

      const result = engine.findTargetFolder(rule, folders);

      expect(result.category?.number).toBe(11);
    });

    it('should find first folder in area range', () => {
      const rule = { target_type: 'area', target_id: '10-19' };
      const folders = engine.getFoldersWithContext();

      const result = engine.findTargetFolder(rule, folders);

      // Should be a folder in finance area (category 10-19)
      expect(result).toBeDefined();
      expect(result.category?.number).toBeGreaterThanOrEqual(10);
      expect(result.category?.number).toBeLessThan(20);
    });

    it('should return null for unknown target type', () => {
      const rule = { target_type: 'unknown', target_id: 'test' };
      const folders = engine.getFoldersWithContext();

      const result = engine.findTargetFolder(rule, folders);

      expect(result).toBeNull();
    });

    it('should return null if no matching folder found', () => {
      const rule = { target_type: 'folder', target_id: '99.99' };
      const folders = engine.getFoldersWithContext();

      const result = engine.findTargetFolder(rule, folders);

      expect(result).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Full File Matching Tests
  // ---------------------------------------------------------------------------

  describe('matchFile', () => {
    it('should return suggestions sorted by confidence', () => {
      const file = {
        filename: 'invoice-2024-01-15.pdf',
        path: '/work/invoices/',
        file_extension: 'pdf',
        file_type: 'document',
      };

      const suggestions = engine.matchFile(file);

      // Should have multiple matches and be sorted
      expect(suggestions.length).toBeGreaterThan(0);
      if (suggestions.length > 1) {
        const confOrder = { high: 3, medium: 2, low: 1, none: 0 };
        expect(confOrder[suggestions[0].confidence]).toBeGreaterThanOrEqual(
          confOrder[suggestions[1].confidence]
        );
      }
    });

    it('should include reason for each suggestion', () => {
      const file = {
        filename: 'test.pdf',
        file_extension: 'pdf',
      };

      const suggestions = engine.matchFile(file);

      suggestions.forEach((s) => {
        expect(s.reason).toBeDefined();
        expect(typeof s.reason).toBe('string');
      });
    });

    it('should fall back to heuristic matching when no rules match', () => {
      // No rules that match this file
      getOrganizationRules.mockReturnValue([]);
      engine.invalidateCache();

      const file = {
        filename: 'family-photo.jpg',
        path: '/personal/',
        file_extension: 'jpg',
        file_type: 'image',
      };

      const suggestions = engine.matchFile(file);

      // Should still have suggestions from heuristics
      expect(suggestions).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Heuristic Matching Tests
  // ---------------------------------------------------------------------------

  describe('heuristicMatch', () => {
    it('should suggest folders based on extension type', () => {
      const file = {
        filename: 'report.xlsx',
        file_extension: 'xlsx',
      };
      const folders = engine.getFoldersWithContext();

      const suggestions = engine.heuristicMatch(file, folders);

      // Should suggest something for spreadsheet
      expect(suggestions).toBeDefined();
    });

    it('should suggest folders based on keyword similarity', () => {
      const file = {
        filename: 'family-vacation-photos.jpg',
        file_extension: 'jpg',
      };
      const folders = engine.getFoldersWithContext();

      const suggestions = engine.heuristicMatch(file, folders);

      // Should find family photos folder
      const familyMatch = suggestions.find((s) => s.folder.name.toLowerCase().includes('family'));
      expect(familyMatch).toBeDefined();
    });

    it('should deduplicate suggestions by folder', () => {
      const file = {
        filename: 'invoice-billing-bill.pdf',
        file_extension: 'pdf',
      };
      const folders = engine.getFoldersWithContext();

      const suggestions = engine.heuristicMatch(file, folders);
      const folderIds = suggestions.map((s) => s.folder.id);
      const uniqueIds = [...new Set(folderIds)];

      expect(folderIds.length).toBe(uniqueIds.length);
    });
  });

  // ---------------------------------------------------------------------------
  // Batch Matching Tests
  // ---------------------------------------------------------------------------

  describe('batchMatch', () => {
    it('should match multiple files', () => {
      const files = [
        { filename: 'invoice.pdf', file_extension: 'pdf' },
        { filename: 'photo.jpg', file_extension: 'jpg' },
        { filename: 'report.docx', file_extension: 'docx' },
      ];

      const results = engine.batchMatch(files);

      expect(results).toHaveLength(3);
      results.forEach((r) => {
        expect(r.file).toBeDefined();
        expect(r.suggestions).toBeDefined();
      });
    });

    it('should refresh cache once for batch', () => {
      const files = [
        { filename: 'a.pdf', file_extension: 'pdf' },
        { filename: 'b.pdf', file_extension: 'pdf' },
      ];

      engine.batchMatch(files);

      // Cache should be refreshed once at the start
      expect(getOrganizationRules).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Rule Management Tests
  // ---------------------------------------------------------------------------

  describe('createRule', () => {
    it('should create rule and invalidate cache', () => {
      engine.refreshCache();
      const initialTime = engine.lastCacheRefresh;

      engine.createRule({
        name: 'Test Rule',
        rule_type: 'extension',
        pattern: 'txt',
        target_type: 'folder',
        target_id: '11.01',
      });

      expect(createOrganizationRule).toHaveBeenCalled();
      expect(engine.lastCacheRefresh).toBe(0); // Cache invalidated
    });
  });

  describe('updateRule', () => {
    it('should update rule and invalidate cache', () => {
      engine.refreshCache();

      engine.updateRule(1, { priority: 100 });

      expect(updateOrganizationRule).toHaveBeenCalledWith(1, { priority: 100 });
      expect(engine.lastCacheRefresh).toBe(0);
    });
  });

  describe('recordMatch', () => {
    it('should increment rule match count', () => {
      engine.recordMatch(5);

      expect(incrementRuleMatchCount).toHaveBeenCalledWith(5);
    });

    it('should not call increment for null ruleId', () => {
      engine.recordMatch(null);

      expect(incrementRuleMatchCount).not.toHaveBeenCalled();
    });

    it('should not call increment for undefined ruleId', () => {
      engine.recordMatch(undefined);

      expect(incrementRuleMatchCount).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Singleton Tests
// =============================================================================

describe('getMatchingEngine', () => {
  it('should return a MatchingEngine instance', () => {
    const engine = getMatchingEngine();

    expect(engine).toBeInstanceOf(MatchingEngine);
  });

  it('should return the same instance on multiple calls', () => {
    const engine1 = getMatchingEngine();
    const engine2 = getMatchingEngine();

    expect(engine1).toBe(engine2);
  });
});

// =============================================================================
// Rule Helper Function Tests
// =============================================================================

describe('createExtensionRule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton for predictable behavior
    getOrganizationRules.mockReturnValue([]);
    getFolders.mockReturnValue([]);
    getCategories.mockReturnValue([]);
    getAreas.mockReturnValue([]);
  });

  it('should create an extension rule with defaults', () => {
    createExtensionRule('pdf', '11.01');

    expect(createOrganizationRule).toHaveBeenCalledWith(
      expect.objectContaining({
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      })
    );
  });

  it('should strip leading dot from extension', () => {
    createExtensionRule('.pdf', '11.01');

    expect(createOrganizationRule).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: 'pdf',
      })
    );
  });

  it('should use custom name when provided', () => {
    createExtensionRule('pdf', '11.01', 'My PDF Rule');

    expect(createOrganizationRule).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My PDF Rule',
      })
    );
  });

  it('should generate default name when not provided', () => {
    createExtensionRule('xlsx', '12.01');

    expect(createOrganizationRule).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Auto-organize .xlsx files',
      })
    );
  });
});

describe('createKeywordRule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOrganizationRules.mockReturnValue([]);
    getFolders.mockReturnValue([]);
    getCategories.mockReturnValue([]);
    getAreas.mockReturnValue([]);
  });

  it('should create a keyword rule from string', () => {
    createKeywordRule('invoice,bill', '11.01');

    expect(createOrganizationRule).toHaveBeenCalledWith(
      expect.objectContaining({
        rule_type: 'keyword',
        pattern: 'invoice,bill',
        target_type: 'folder',
        target_id: '11.01',
        priority: 60,
      })
    );
  });

  it('should create a keyword rule from array', () => {
    createKeywordRule(['invoice', 'bill', 'receipt'], '11.01');

    expect(createOrganizationRule).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: 'invoice,bill,receipt',
      })
    );
  });

  it('should use custom name when provided', () => {
    createKeywordRule('invoice', '11.01', 'Invoice Matcher');

    expect(createOrganizationRule).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Invoice Matcher',
      })
    );
  });
});

describe('suggestRulesForFolder', () => {
  it('should suggest extension rules for common file types', () => {
    const folder = { id: 1, name: 'Documents' };
    const files = [
      { filename: 'a.pdf', file_extension: 'pdf' },
      { filename: 'b.pdf', file_extension: 'pdf' },
      { filename: 'c.pdf', file_extension: 'pdf' },
      { filename: 'd.pdf', file_extension: 'pdf' },
    ];

    const suggestions = suggestRulesForFolder(folder, files);

    const pdfSuggestion = suggestions.find((s) => s.pattern === 'pdf');
    expect(pdfSuggestion).toBeDefined();
    expect(pdfSuggestion.type).toBe('extension');
  });

  it('should suggest keyword rules for recurring keywords', () => {
    const folder = { id: 1, name: 'Invoices' };
    const files = [
      { filename: 'invoice-2024-01.pdf', file_extension: 'pdf' },
      { filename: 'invoice-2024-02.pdf', file_extension: 'pdf' },
      { filename: 'invoice-2024-03.pdf', file_extension: 'pdf' },
    ];

    const suggestions = suggestRulesForFolder(folder, files);

    const invoiceSuggestion = suggestions.find(
      (s) => s.type === 'keyword' && s.pattern === 'invoice'
    );
    expect(invoiceSuggestion).toBeDefined();
  });

  it('should rate confidence based on occurrence count', () => {
    const folder = { id: 1, name: 'Test' };
    const manyPdfs = Array(15)
      .fill(null)
      .map((_, i) => ({ filename: `file${i}.pdf`, file_extension: 'pdf' }));

    const suggestions = suggestRulesForFolder(folder, manyPdfs);

    const pdfSuggestion = suggestions.find((s) => s.pattern === 'pdf');
    expect(pdfSuggestion.confidence).toBe('high');
  });

  it('should sort suggestions by confidence', () => {
    const folder = { id: 1, name: 'Mixed' };
    const files = [
      // 3 pdfs = low confidence
      { filename: 'a.pdf', file_extension: 'pdf' },
      { filename: 'b.pdf', file_extension: 'pdf' },
      { filename: 'c.pdf', file_extension: 'pdf' },
      // 10 docs = high confidence
      ...Array(10)
        .fill(null)
        .map((_, i) => ({ filename: `doc${i}.docx`, file_extension: 'docx' })),
    ];

    const suggestions = suggestRulesForFolder(folder, files);

    // High confidence should come first
    expect(suggestions[0].confidence).toBe('high');
  });

  it('should not suggest for files with less than 3 occurrences', () => {
    const folder = { id: 1, name: 'Test' };
    const files = [
      { filename: 'a.pdf', file_extension: 'pdf' },
      { filename: 'b.pdf', file_extension: 'pdf' },
      // Only 2 PDFs - should not suggest
    ];

    const suggestions = suggestRulesForFolder(folder, files);

    const pdfSuggestion = suggestions.find((s) => s.pattern === 'pdf');
    expect(pdfSuggestion).toBeUndefined();
  });

  it('should filter out short keywords (less than 4 chars)', () => {
    const folder = { id: 1, name: 'Test' };
    const files = [
      { filename: 'a-the-file.txt', file_extension: 'txt' },
      { filename: 'b-the-file.txt', file_extension: 'txt' },
      { filename: 'c-the-file.txt', file_extension: 'txt' },
      { filename: 'd-the-file.txt', file_extension: 'txt' },
    ];

    const suggestions = suggestRulesForFolder(folder, files);

    // "the" should not be suggested (too short)
    const theSuggestion = suggestions.find((s) => s.pattern === 'the');
    expect(theSuggestion).toBeUndefined();

    // "file" should be suggested (4+ chars)
    const fileSuggestion = suggestions.find((s) => s.pattern === 'file');
    expect(fileSuggestion).toBeDefined();
  });
});

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe('Edge cases', () => {
  let engine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new MatchingEngine();
    getOrganizationRules.mockReturnValue([]);
    getFolders.mockReturnValue([]);
    getCategories.mockReturnValue([]);
    getAreas.mockReturnValue([]);
  });

  it('should handle empty rules array', () => {
    const file = { filename: 'test.pdf', file_extension: 'pdf' };

    const suggestions = engine.matchFile(file);

    expect(suggestions).toBeDefined();
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('should handle empty folders array', () => {
    getOrganizationRules.mockReturnValue([...mockRules]);

    const file = { filename: 'test.pdf', file_extension: 'pdf' };

    const suggestions = engine.matchFile(file);

    // Rules match but no folders to suggest
    expect(suggestions).toBeDefined();
  });

  it('should handle file with no extension', () => {
    const file = { filename: 'README', file_extension: '' };

    const suggestions = engine.matchFile(file);

    expect(suggestions).toBeDefined();
  });

  it('should handle file with no path', () => {
    getOrganizationRules.mockReturnValue([
      { ...mockRules[2] }, // path rule
    ]);

    const file = { filename: 'test.txt', file_extension: 'txt' };

    const suggestions = engine.matchFile(file);

    expect(suggestions).toBeDefined();
  });

  it('should handle malformed rule pattern gracefully', () => {
    getOrganizationRules.mockReturnValue([
      {
        id: 1,
        rule_type: 'regex',
        pattern: '[[[invalid',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      },
    ]);

    const file = { filename: 'test.txt', path: '' };

    // Should not throw
    expect(() => engine.matchFile(file)).not.toThrow();
  });
});
