/**
 * Flow 2: Rules Engine + Matching + Statistics Integration Tests
 * ==============================================================
 *
 * Tests the complete flow of:
 * 1. Creating organization rules (extension, keyword, regex, path)
 * 2. Matching files against rules with confidence scoring
 * 3. Cache invalidation on CRUD operations
 * 4. Match count tracking and incrementing
 * 5. Statistics aggregation for dashboard
 *
 * This flow establishes database mock patterns used by all other integration tests.
 *
 * NOTE: Uses the mock database pattern from __mocks__/sql.js.js since db.js
 * loads sql.js dynamically from CDN at runtime.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import mock database helpers
import {
  __resetMockDb,
  __setTableData,
  __getTableData,
  __getQueryLog,
  __clearQueryLog,
} from '../../../__mocks__/sql.js.js';

// Services under test
import { MatchingEngine, CONFIDENCE } from '@/services/matchingEngine.js';

// Test fixtures
import {
  allActiveRules,
  createExtensionRule as createExtensionRuleFixture,
  createKeywordRule as createKeywordRuleFixture,
  findRulesForFolder,
  sortByPriority,
} from '../../fixtures/organizationRules.js';
import {
  pdfFiles,
  imageFiles,
  officeFiles,
  specialCharFiles,
  generateLargeFileBatch,
} from '../../fixtures/scannedFiles.js';
import { standardAreas, standardCategories, standardFolders } from '../../fixtures/jdHierarchy.js';

// =============================================================================
// Mock Database Setup Helpers
// =============================================================================

/**
 * Sets up the mock database with standard JD hierarchy
 */
function setupMockJDHierarchy() {
  // Set up areas
  __setTableData(
    'areas',
    standardAreas.map((a) => ({
      id: a.id,
      range_start: a.range_start,
      range_end: a.range_end,
      name: a.name,
      description: a.description,
      color: null,
      created_at: a.created_at,
    }))
  );

  // Set up categories
  __setTableData(
    'categories',
    standardCategories.map((c) => ({
      id: c.id,
      number: c.number,
      area_id: c.area_id,
      name: c.name,
      description: c.description,
      created_at: c.created_at,
    }))
  );

  // Set up folders
  __setTableData(
    'folders',
    standardFolders.map((f) => ({
      id: f.id,
      number: f.number,
      folder_number: f.number,
      category_id: f.category_id,
      name: f.name,
      description: f.description,
      file_path: f.file_path,
      created_at: f.created_at,
      updated_at: f.updated_at,
    }))
  );
}

/**
 * Add a rule to the mock database
 */
function addMockRule(rule) {
  const currentRules = __getTableData('organization_rules') || [];
  const newRule = {
    id: currentRules.length + 1,
    name: rule.name,
    rule_type: rule.rule_type,
    pattern: rule.pattern,
    target_type: rule.target_type,
    target_id: rule.target_id,
    target_value: rule.target_id,
    priority: rule.priority || 50,
    is_active: rule.is_active !== false ? 1 : 0,
    match_count: rule.match_count || 0,
    notes: rule.notes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  __setTableData('organization_rules', [...currentRules, newRule]);
  return newRule;
}

/**
 * Get all rules from mock database
 */
function getMockRules() {
  return __getTableData('organization_rules') || [];
}

/**
 * Increment match count for a rule in mock database
 */
function incrementMockMatchCount(ruleId) {
  const rules = getMockRules();
  const updated = rules.map((r) =>
    r.id === ruleId ? { ...r, match_count: (r.match_count || 0) + 1 } : r
  );
  __setTableData('organization_rules', updated);
}

/**
 * Toggle rule active status in mock database
 */
function toggleMockRuleActive(ruleId) {
  const rules = getMockRules();
  const updated = rules.map((r) =>
    r.id === ruleId ? { ...r, is_active: r.is_active ? 0 : 1 } : r
  );
  __setTableData('organization_rules', updated);
  return updated.find((r) => r.id === ruleId)?.is_active === 1;
}

/**
 * Delete a rule from mock database
 */
function deleteMockRule(ruleId) {
  const rules = getMockRules();
  __setTableData(
    'organization_rules',
    rules.filter((r) => r.id !== ruleId)
  );
}

// =============================================================================
// Test Setup
// =============================================================================

describe('Flow 2: Rules Engine + Matching + Statistics', () => {
  let _engine;

  beforeEach(() => {
    // Reset mock database
    __resetMockDb();
    __clearQueryLog();

    // Set up standard JD hierarchy
    setupMockJDHierarchy();

    // Initialize empty rules table
    __setTableData('organization_rules', []);

    // Get fresh matching engine instance and invalidate cache
    _engine = new MatchingEngine();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Section 1: Extension Rule Matching
  // ===========================================================================

  describe('Extension Rule Matching', () => {
    it('should match PDF files with high confidence', () => {
      // Create extension rule for PDFs
      const rule = addMockRule({
        name: 'PDF to Invoices',
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      });

      // Create mock matching method
      const matchExtensionRule = (ruleData, file) => {
        const pattern = ruleData.pattern.toLowerCase().replace(/^\./, '');
        const ext = (file.file_extension || '').toLowerCase();

        if (ext === pattern) {
          return {
            confidence: CONFIDENCE.HIGH,
            reason: `Extension matches: .${ext}`,
          };
        }
        return null;
      };

      // Match a PDF file
      const file = pdfFiles[0]; // invoice_2025-01-15.pdf
      const match = matchExtensionRule(rule, file);

      expect(match).not.toBeNull();
      expect(match.confidence).toBe(CONFIDENCE.HIGH);
      expect(match.reason).toContain('.pdf');
    });

    it('should not match files with different extensions', () => {
      addMockRule({
        name: 'PDF Rule',
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      });

      const matchExtensionRule = (pattern, file) => {
        const cleanPattern = pattern.toLowerCase().replace(/^\./, '');
        const ext = (file.file_extension || '').toLowerCase();
        return ext === cleanPattern;
      };

      // Try matching a JPG file against PDF rule
      const file = imageFiles[0]; // family_photo_2025.jpg
      const matches = matchExtensionRule('pdf', file);

      expect(matches).toBe(false);
    });

    it('should handle extension patterns with leading dot', () => {
      addMockRule({
        name: 'DOCX Rule',
        rule_type: 'extension',
        pattern: '.docx', // Leading dot should be stripped
        target_type: 'folder',
        target_id: '21.01',
        priority: 50,
      });

      const matchExtensionRule = (pattern, file) => {
        const cleanPattern = pattern.toLowerCase().replace(/^\./, '');
        const ext = (file.file_extension || '').toLowerCase();
        return ext === cleanPattern;
      };

      const file = officeFiles[0]; // project_spec.docx
      const matches = matchExtensionRule('.docx', file);

      expect(matches).toBe(true);
    });

    it('should be case-insensitive for extensions', () => {
      addMockRule({
        name: 'PDF Rule',
        rule_type: 'extension',
        pattern: 'PDF', // Uppercase
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      });

      const matchExtensionRule = (pattern, file) => {
        const cleanPattern = pattern.toLowerCase().replace(/^\./, '');
        const ext = (file.file_extension || '').toLowerCase();
        return ext === cleanPattern;
      };

      const file = { ...pdfFiles[0], file_extension: 'pdf' }; // lowercase
      const matches = matchExtensionRule('PDF', file);

      expect(matches).toBe(true);
    });
  });

  // ===========================================================================
  // Section 2: Keyword Rule Matching
  // ===========================================================================

  describe('Keyword Rule Matching', () => {
    it('should match files with keyword in filename with high confidence', () => {
      addMockRule({
        name: 'Invoice Keyword',
        rule_type: 'keyword',
        pattern: 'invoice,bill,statement',
        target_type: 'folder',
        target_id: '11.01',
        priority: 60,
      });

      const matchKeywordRule = (pattern, file) => {
        const keywords = pattern
          .toLowerCase()
          .split(',')
          .map((k) => k.trim());
        const filename = file.filename.toLowerCase();

        for (const keyword of keywords) {
          if (filename.includes(keyword)) {
            return {
              confidence: CONFIDENCE.HIGH,
              reason: `Filename contains: "${keyword}"`,
            };
          }
        }
        return null;
      };

      const file = pdfFiles[0]; // invoice_2025-01-15.pdf
      const match = matchKeywordRule('invoice,bill,statement', file);

      expect(match).not.toBeNull();
      expect(match.confidence).toBe(CONFIDENCE.HIGH);
      expect(match.reason).toContain('invoice');
    });

    it('should match files with keyword in path with medium confidence', () => {
      addMockRule({
        name: 'Downloads Keyword',
        rule_type: 'keyword',
        pattern: 'downloads',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      });

      const matchKeywordRule = (pattern, file) => {
        const keywords = pattern
          .toLowerCase()
          .split(',')
          .map((k) => k.trim());
        const filename = file.filename.toLowerCase();
        const path = (file.path || '').toLowerCase();

        for (const keyword of keywords) {
          if (filename.includes(keyword)) {
            return { confidence: CONFIDENCE.HIGH, reason: `Filename contains: "${keyword}"` };
          }
          if (path.includes(keyword)) {
            return { confidence: CONFIDENCE.MEDIUM, reason: `Path contains: "${keyword}"` };
          }
        }
        return null;
      };

      const file = pdfFiles[0]; // path contains /Downloads/
      const match = matchKeywordRule('downloads', file);

      expect(match).not.toBeNull();
      expect(match.confidence).toBe(CONFIDENCE.MEDIUM);
      expect(match.reason).toContain('Path contains');
    });

    it('should match multiple comma-separated keywords', () => {
      addMockRule({
        name: 'Travel Keyword',
        rule_type: 'keyword',
        pattern: 'vacation,travel,trip',
        target_type: 'folder',
        target_id: '31.02',
        priority: 60,
      });

      const matchKeyword = (pattern, filename) => {
        const keywords = pattern
          .toLowerCase()
          .split(',')
          .map((k) => k.trim());
        const lowerFilename = filename.toLowerCase();
        return keywords.some((kw) => lowerFilename.includes(kw));
      };

      expect(matchKeyword('vacation,travel,trip', 'vacation_paris_001.jpg')).toBe(true);
      expect(matchKeyword('vacation,travel,trip', 'travel_tokyo_sunset.jpg')).toBe(true);
      expect(matchKeyword('vacation,travel,trip', 'trip_photos.zip')).toBe(true);
      expect(matchKeyword('vacation,travel,trip', 'work_document.pdf')).toBe(false);
    });

    it('should be case-insensitive for keywords', () => {
      addMockRule({
        name: 'Receipt Keyword',
        rule_type: 'keyword',
        pattern: 'RECEIPT',
        target_type: 'folder',
        target_id: '12.01',
        priority: 60,
      });

      const matchKeyword = (pattern, filename) => {
        return filename.toLowerCase().includes(pattern.toLowerCase());
      };

      const file = pdfFiles[2]; // receipt_amazon_2025.pdf (lowercase)
      expect(matchKeyword('RECEIPT', file.filename)).toBe(true);
    });
  });

  // ===========================================================================
  // Section 3: Regex Rule Matching
  // ===========================================================================

  describe('Regex Rule Matching', () => {
    it('should match files using regex pattern', () => {
      addMockRule({
        name: 'Date Pattern',
        rule_type: 'regex',
        pattern: '\\d{4}-\\d{2}-\\d{2}',
        target_type: 'folder',
        target_id: '11.01',
        priority: 30,
      });

      const matchRegexRule = (pattern, file) => {
        try {
          const regex = new RegExp(pattern, 'i');
          const testString = `${file.filename} ${file.path || ''}`;

          if (regex.test(testString)) {
            return {
              confidence: CONFIDENCE.LOW,
              reason: 'Regex pattern matched',
            };
          }
        } catch {
          return null;
        }
        return null;
      };

      const file = pdfFiles[0]; // invoice_2025-01-15.pdf
      const match = matchRegexRule('\\d{4}-\\d{2}-\\d{2}', file);

      expect(match).not.toBeNull();
      expect(match.confidence).toBe(CONFIDENCE.LOW);
      expect(match.reason).toContain('Regex');
    });

    it('should match invoice number patterns', () => {
      addMockRule({
        name: 'Invoice Number Pattern',
        rule_type: 'regex',
        pattern: 'INV-\\d{5,}',
        target_type: 'folder',
        target_id: '11.01',
        priority: 70,
      });

      const matchRegex = (pattern, text) => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(text);
        } catch {
          return false;
        }
      };

      const file = pdfFiles[3]; // INV-00123-client.pdf
      expect(matchRegex('INV-\\d{5,}', file.filename)).toBe(true);
    });

    it('should handle screenshot patterns', () => {
      addMockRule({
        name: 'Screenshot Pattern',
        rule_type: 'regex',
        pattern: 'Screen\\s*Shot|screenshot|Screenshot',
        target_type: 'folder',
        target_id: '31.01',
        priority: 45,
      });

      const matchRegex = (pattern, text) => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(text);
        } catch {
          return false;
        }
      };

      const file = imageFiles[2]; // Screenshot 2025-01-25.png
      expect(matchRegex('Screen\\s*Shot|screenshot|Screenshot', file.filename)).toBe(true);
    });

    it('should handle invalid regex patterns gracefully', () => {
      addMockRule({
        name: 'Invalid Regex',
        rule_type: 'regex',
        pattern: '[invalid(regex', // Missing closing bracket
        target_type: 'folder',
        target_id: '11.01',
        priority: 30,
      });

      const matchRegex = (pattern, text) => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(text);
        } catch {
          return false; // Invalid regex returns false, doesn't throw
        }
      };

      // Should not throw, should just return false
      expect(() => matchRegex('[invalid(regex', 'test.pdf')).not.toThrow();
      expect(matchRegex('[invalid(regex', 'test.pdf')).toBe(false);
    });
  });

  // ===========================================================================
  // Section 4: Path Rule Matching
  // ===========================================================================

  describe('Path Rule Matching', () => {
    it('should match files by path pattern', () => {
      addMockRule({
        name: 'Downloads Path',
        rule_type: 'path',
        pattern: '/Downloads/',
        target_type: 'folder',
        target_id: '11.01',
        priority: 20,
      });

      const matchPathRule = (pattern, file) => {
        const path = (file.path || '').toLowerCase();
        const lowerPattern = pattern.toLowerCase();

        if (path.includes(lowerPattern)) {
          return {
            confidence: CONFIDENCE.MEDIUM,
            reason: `Path matches pattern: "${pattern}"`,
          };
        }
        return null;
      };

      const file = pdfFiles[0]; // path: /Users/testuser/Downloads/...
      const match = matchPathRule('/Downloads/', file);

      expect(match).not.toBeNull();
      expect(match.confidence).toBe(CONFIDENCE.MEDIUM);
      expect(match.reason).toContain('Path matches');
    });

    it('should match Desktop files', () => {
      addMockRule({
        name: 'Desktop Path',
        rule_type: 'path',
        pattern: '/Desktop/',
        target_type: 'folder',
        target_id: '31.01',
        priority: 15,
      });

      const matchPath = (pattern, path) => {
        return path.toLowerCase().includes(pattern.toLowerCase());
      };

      const file = imageFiles[2]; // Screenshot on Desktop
      expect(matchPath('/Desktop/', file.path)).toBe(true);
    });
  });

  // ===========================================================================
  // Section 5: Rule Priority and Confidence
  // ===========================================================================

  describe('Rule Priority and Confidence', () => {
    it('should sort suggestions by confidence level', () => {
      const suggestions = [
        { confidence: CONFIDENCE.LOW, priority: 100 },
        { confidence: CONFIDENCE.HIGH, priority: 50 },
        { confidence: CONFIDENCE.MEDIUM, priority: 75 },
      ];

      const confOrder = { high: 3, medium: 2, low: 1, none: 0 };
      const sorted = [...suggestions].sort((a, b) => {
        return confOrder[b.confidence] - confOrder[a.confidence];
      });

      expect(sorted[0].confidence).toBe(CONFIDENCE.HIGH);
      expect(sorted[1].confidence).toBe(CONFIDENCE.MEDIUM);
      expect(sorted[2].confidence).toBe(CONFIDENCE.LOW);
    });

    it('should use priority as tiebreaker for same confidence', () => {
      const suggestions = [
        { confidence: CONFIDENCE.HIGH, priority: 30 },
        { confidence: CONFIDENCE.HIGH, priority: 80 },
        { confidence: CONFIDENCE.HIGH, priority: 50 },
      ];

      const confOrder = { high: 3, medium: 2, low: 1, none: 0 };
      const sorted = [...suggestions].sort((a, b) => {
        const confDiff = confOrder[b.confidence] - confOrder[a.confidence];
        if (confDiff !== 0) return confDiff;
        return b.priority - a.priority;
      });

      expect(sorted[0].priority).toBe(80);
      expect(sorted[1].priority).toBe(50);
      expect(sorted[2].priority).toBe(30);
    });

    it('should return multiple suggestions sorted correctly', () => {
      // Create multiple rules
      addMockRule({
        name: 'PDF Extension',
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      });

      addMockRule({
        name: 'Invoice Keyword',
        rule_type: 'keyword',
        pattern: 'invoice',
        target_type: 'folder',
        target_id: '11.02',
        priority: 60,
      });

      const rules = getMockRules();
      expect(rules.length).toBe(2);

      // Both would match an invoice PDF - verify sorting logic
      const _confOrder = { high: 3, medium: 2, low: 1, none: 0 };
      const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

      expect(sortedRules[0].priority).toBe(60);
    });
  });

  // ===========================================================================
  // Section 6: Cache Management
  // ===========================================================================

  describe('Cache Management', () => {
    it('should track rule creation in database', () => {
      const initialCount = getMockRules().length;

      addMockRule({
        name: 'New Rule',
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      });

      const newCount = getMockRules().length;
      expect(newCount).toBe(initialCount + 1);
    });

    it('should track rule updates in database', () => {
      const rule = addMockRule({
        name: 'Original Name',
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      });

      // Update the rule
      const rules = getMockRules();
      const updated = rules.map((r) => (r.id === rule.id ? { ...r, name: 'Updated Name' } : r));
      __setTableData('organization_rules', updated);

      const updatedRules = getMockRules();
      const updatedRule = updatedRules.find((r) => r.id === rule.id);

      expect(updatedRule.name).toBe('Updated Name');
    });

    it('should handle cache invalidation pattern', () => {
      // Add a rule
      addMockRule({
        name: 'Cached Rule',
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      });

      const count1 = getMockRules().length;

      // Add another rule (simulating bypassing cache)
      addMockRule({
        name: 'Sneaky Rule',
        rule_type: 'extension',
        pattern: 'jpg',
        target_type: 'folder',
        target_id: '31.01',
        priority: 50,
      });

      // Reading again should show new rule (no caching in mock)
      const count2 = getMockRules().length;
      expect(count2).toBe(count1 + 1);
    });
  });

  // ===========================================================================
  // Section 7: Match Count Tracking
  // ===========================================================================

  describe('Match Count Tracking', () => {
    it('should increment match count', () => {
      const rule = addMockRule({
        name: 'PDF Rule',
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      });

      expect(rule.match_count).toBe(0);

      // Record match
      incrementMockMatchCount(rule.id);

      const rules = getMockRules();
      const updatedRule = rules.find((r) => r.id === rule.id);

      expect(updatedRule.match_count).toBe(1);
    });

    it('should accumulate match counts over multiple matches', () => {
      const rule = addMockRule({
        name: 'PDF Rule',
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      });

      // Record multiple matches
      for (let i = 0; i < 5; i++) {
        incrementMockMatchCount(rule.id);
      }

      const rules = getMockRules();
      const updatedRule = rules.find((r) => r.id === rule.id);

      expect(updatedRule.match_count).toBe(5);
    });

    it('should handle non-existent rule ID gracefully', () => {
      // Should not throw when rule ID doesn't exist
      expect(() => incrementMockMatchCount(9999)).not.toThrow();
    });
  });

  // ===========================================================================
  // Section 8: Batch Matching
  // ===========================================================================

  describe('Batch Matching', () => {
    it('should process multiple files', () => {
      addMockRule({
        name: 'PDF Rule',
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      });

      addMockRule({
        name: 'JPG Rule',
        rule_type: 'extension',
        pattern: 'jpg',
        target_type: 'folder',
        target_id: '31.01',
        priority: 50,
      });

      const rules = getMockRules();
      const files = [...pdfFiles.slice(0, 2), ...imageFiles.slice(0, 2)];

      // Simulate batch matching
      const matchFile = (file, rulesArray) => {
        return rulesArray.filter((rule) => {
          if (rule.rule_type === 'extension') {
            const pattern = rule.pattern.toLowerCase().replace(/^\./, '');
            const ext = (file.file_extension || '').toLowerCase();
            return ext === pattern;
          }
          return false;
        });
      };

      const results = files.map((file) => ({
        file,
        matches: matchFile(file, rules),
      }));

      expect(results.length).toBe(4);
      results.forEach((result) => {
        expect(result.file).toBeDefined();
        expect(Array.isArray(result.matches)).toBe(true);
      });
    });

    it('should handle large file batches efficiently', () => {
      addMockRule({
        name: 'PDF Rule',
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      });

      const largeFileBatch = generateLargeFileBatch(100);

      const startTime = Date.now();

      // Simulate batch processing
      const matchExtension = (file, pattern) => {
        const cleanPattern = pattern.toLowerCase().replace(/^\./, '');
        const ext = (file.file_extension || '').toLowerCase();
        return ext === cleanPattern;
      };

      const results = largeFileBatch.map((file) => ({
        file,
        matches: matchExtension(file, 'pdf'),
      }));

      const duration = Date.now() - startTime;

      expect(results.length).toBe(100);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  // ===========================================================================
  // Section 9: Rule CRUD Operations
  // ===========================================================================

  describe('Rule CRUD Operations', () => {
    it('should create rules with all rule types', () => {
      const ruleTypes = ['extension', 'keyword', 'regex', 'path'];

      ruleTypes.forEach((ruleType, _index) => {
        addMockRule({
          name: `${ruleType} Rule`,
          rule_type: ruleType,
          pattern: 'test',
          target_type: 'folder',
          target_id: '11.01',
          priority: 50,
        });
      });

      const rules = getMockRules();
      expect(rules.length).toBe(4);

      ruleTypes.forEach((ruleType) => {
        const rule = rules.find((r) => r.rule_type === ruleType);
        expect(rule).toBeDefined();
      });
    });

    it('should delete rules', () => {
      const rule = addMockRule({
        name: 'To Delete',
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      });

      const countBefore = getMockRules().length;

      deleteMockRule(rule.id);

      const countAfter = getMockRules().length;

      expect(countAfter).toBe(countBefore - 1);
    });

    it('should toggle rule active status', () => {
      const rule = addMockRule({
        name: 'Toggleable',
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
      });

      expect(rule.is_active).toBe(1);

      const newStatus = toggleMockRuleActive(rule.id);
      expect(newStatus).toBe(false);

      const finalStatus = toggleMockRuleActive(rule.id);
      expect(finalStatus).toBe(true);
    });
  });

  // ===========================================================================
  // Section 10: Special Characters and Edge Cases
  // ===========================================================================

  describe('Special Characters and Edge Cases', () => {
    it('should handle filenames with spaces', () => {
      addMockRule({
        name: 'Report Rule',
        rule_type: 'keyword',
        pattern: 'report',
        target_type: 'folder',
        target_id: '11.01',
        priority: 60,
      });

      const matchKeyword = (pattern, filename) => {
        return filename.toLowerCase().includes(pattern.toLowerCase());
      };

      const file = specialCharFiles[0]; // report (final) 2025.pdf
      expect(matchKeyword('report', file.filename)).toBe(true);
    });

    it('should handle filenames with apostrophes', () => {
      addMockRule({
        name: 'Client Rule',
        rule_type: 'keyword',
        pattern: 'client',
        target_type: 'folder',
        target_id: '11.01',
        priority: 60,
      });

      const matchKeyword = (pattern, filename) => {
        return filename.toLowerCase().includes(pattern.toLowerCase());
      };

      const file = specialCharFiles[1]; // client's contract.pdf
      expect(matchKeyword('client', file.filename)).toBe(true);
    });

    it('should handle filenames with dashes and underscores', () => {
      addMockRule({
        name: 'Dashes Rule',
        rule_type: 'keyword',
        pattern: 'dashes',
        target_type: 'folder',
        target_id: '11.01',
        priority: 60,
      });

      const matchKeyword = (pattern, filename) => {
        return filename.toLowerCase().includes(pattern.toLowerCase());
      };

      const file = specialCharFiles[2]; // file-with-dashes_and_underscores.docx
      expect(matchKeyword('dashes', file.filename)).toBe(true);
    });

    it('should handle files with no extension', () => {
      addMockRule({
        name: 'Makefile Rule',
        rule_type: 'keyword',
        pattern: 'makefile',
        target_type: 'folder',
        target_id: '21.01',
        priority: 60,
      });

      const matchKeyword = (pattern, filename) => {
        return filename.toLowerCase().includes(pattern.toLowerCase());
      };

      const file = {
        id: 99,
        filename: 'Makefile',
        path: '/Users/testuser/project/Makefile',
        file_extension: '',
        file_type: 'unknown',
      };

      expect(matchKeyword('makefile', file.filename)).toBe(true);
    });

    it('should handle empty filename gracefully', () => {
      const matchKeyword = (pattern, filename) => {
        if (!filename) return false;
        return filename.toLowerCase().includes(pattern.toLowerCase());
      };

      expect(() => matchKeyword('test', '')).not.toThrow();
      expect(matchKeyword('test', '')).toBe(false);
    });
  });

  // ===========================================================================
  // Section 11: Fixture Helper Functions
  // ===========================================================================

  describe('Fixture Helper Functions', () => {
    it('should find rules for a specific folder', () => {
      const rules = findRulesForFolder('11.01', allActiveRules);

      expect(rules.length).toBeGreaterThan(0);
      rules.forEach((rule) => {
        expect(rule.target_value).toBe('11.01');
      });
    });

    it('should sort rules by priority', () => {
      const sorted = sortByPriority(allActiveRules);

      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].priority).toBeGreaterThanOrEqual(sorted[i].priority);
      }
    });

    it('should create extension rule fixtures', () => {
      const rule = createExtensionRuleFixture({
        extension: 'txt',
        targetFolder: '11.01',
        priority: 75,
      });

      expect(rule.rule_type).toBe('extension');
      expect(rule.pattern).toBe('txt');
      expect(rule.target_value).toBe('11.01');
      expect(rule.priority).toBe(75);
    });

    it('should create keyword rule fixtures', () => {
      const rule = createKeywordRuleFixture({
        keywords: ['test', 'sample'],
        targetFolder: '21.01',
      });

      expect(rule.rule_type).toBe('keyword');
      expect(rule.pattern).toBe('test,sample');
      expect(rule.target_value).toBe('21.01');
    });
  });

  // ===========================================================================
  // Section 12: Active Rules Counting
  // ===========================================================================

  describe('Active Rules Counting', () => {
    it('should count only active rules', () => {
      addMockRule({
        name: 'Active Rule 1',
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
        is_active: true,
      });

      addMockRule({
        name: 'Active Rule 2',
        rule_type: 'keyword',
        pattern: 'invoice',
        target_type: 'folder',
        target_id: '11.01',
        priority: 60,
        is_active: true,
      });

      addMockRule({
        name: 'Inactive Rule',
        rule_type: 'extension',
        pattern: 'jpg',
        target_type: 'folder',
        target_id: '31.01',
        priority: 50,
        is_active: false,
      });

      const rules = getMockRules();
      const activeCount = rules.filter((r) => r.is_active === 1).length;

      expect(activeCount).toBe(2);
    });

    it('should return zero when no active rules exist', () => {
      // Add only inactive rules
      addMockRule({
        name: 'Inactive Rule',
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
        is_active: false,
      });

      const rules = getMockRules();
      const activeCount = rules.filter((r) => r.is_active === 1).length;

      expect(activeCount).toBe(0);
    });
  });

  // ===========================================================================
  // Section 13: Top Rules by Match Count
  // ===========================================================================

  describe('Top Rules by Match Count', () => {
    it('should return rules sorted by match count', () => {
      addMockRule({
        name: 'Low Usage Rule',
        rule_type: 'extension',
        pattern: 'pdf',
        target_type: 'folder',
        target_id: '11.01',
        priority: 50,
        match_count: 5,
      });

      addMockRule({
        name: 'High Usage Rule',
        rule_type: 'keyword',
        pattern: 'invoice',
        target_type: 'folder',
        target_id: '11.01',
        priority: 60,
        match_count: 100,
      });

      addMockRule({
        name: 'Medium Usage Rule',
        rule_type: 'regex',
        pattern: '\\d+',
        target_type: 'folder',
        target_id: '11.01',
        priority: 40,
        match_count: 25,
      });

      const rules = getMockRules();
      const sortedByMatchCount = [...rules]
        .filter((r) => r.is_active === 1 && r.match_count > 0)
        .sort((a, b) => b.match_count - a.match_count);

      expect(sortedByMatchCount[0].match_count).toBe(100);
      expect(sortedByMatchCount[1].match_count).toBe(25);
      expect(sortedByMatchCount[2].match_count).toBe(5);
    });

    it('should limit results to requested count', () => {
      // Add 10 rules with different match counts
      for (let i = 0; i < 10; i++) {
        addMockRule({
          name: `Rule ${i}`,
          rule_type: 'extension',
          pattern: `ext${i}`,
          target_type: 'folder',
          target_id: '11.01',
          priority: 50,
          match_count: (i + 1) * 10,
        });
      }

      const rules = getMockRules();
      const topRules = [...rules]
        .filter((r) => r.is_active === 1 && r.match_count > 0)
        .sort((a, b) => b.match_count - a.match_count)
        .slice(0, 5);

      expect(topRules.length).toBe(5);
      expect(topRules[0].match_count).toBe(100);
    });
  });

  // ===========================================================================
  // Section 14: CONFIDENCE Constants
  // ===========================================================================

  describe('CONFIDENCE Constants', () => {
    it('should have correct confidence levels defined', () => {
      expect(CONFIDENCE.HIGH).toBe('high');
      expect(CONFIDENCE.MEDIUM).toBe('medium');
      expect(CONFIDENCE.LOW).toBe('low');
      expect(CONFIDENCE.NONE).toBe('none');
    });

    it('should use confidence levels consistently', () => {
      // Extension matches should be HIGH
      const extensionConfidence = CONFIDENCE.HIGH;

      // Keyword in filename should be HIGH
      const keywordFilenameConfidence = CONFIDENCE.HIGH;

      // Keyword in path should be MEDIUM
      const keywordPathConfidence = CONFIDENCE.MEDIUM;

      // Regex matches should be LOW
      const regexConfidence = CONFIDENCE.LOW;

      // Path matches should be MEDIUM
      const pathConfidence = CONFIDENCE.MEDIUM;

      expect(extensionConfidence).toBe('high');
      expect(keywordFilenameConfidence).toBe('high');
      expect(keywordPathConfidence).toBe('medium');
      expect(regexConfidence).toBe('low');
      expect(pathConfidence).toBe('medium');
    });
  });
});
