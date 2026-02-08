/**
 * Statistics Service Tests
 * ========================
 * Tests for dashboard statistics aggregation.
 *
 * Strategy: Mock getDB() at module level since db.js has CDN loading issues.
 * This allows testing the SQL query logic and result processing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock db.js before importing statisticsService
vi.mock('../db.js', () => ({
  getDB: vi.fn(),
}));

import { getDB } from '../db.js';
import {
  getTotalOrganizedFiles,
  getFilesOrganizedThisMonth,
  getActiveRulesCount,
  getFilesOrganizedByDay,
  getFilesByType,
  getTopRules,
  getWatchActivitySummary,
  getMostCommonCategory,
  getDashboardStats,
  hasStatisticsData,
} from './statisticsService.js';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock database with configurable exec responses
 * Uses case-insensitive matching and normalizes whitespace for robustness
 */
function createMockDB(execResponses = {}) {
  return {
    exec: vi.fn((sql) => {
      // Normalize SQL: lowercase and collapse whitespace for robust matching
      const normalizedSql = sql.toLowerCase().replace(/\s+/g, ' ');

      // Check for matching query patterns (case-insensitive)
      for (const [pattern, response] of Object.entries(execResponses)) {
        const normalizedPattern = pattern.toLowerCase().replace(/\s+/g, ' ');
        if (normalizedSql.includes(normalizedPattern)) {
          return response;
        }
      }
      // Default: empty result
      return [];
    }),
  };
}

// =============================================================================
// Test Suite
// =============================================================================

describe('statisticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // getTotalOrganizedFiles Tests
  // ===========================================================================

  describe('getTotalOrganizedFiles', () => {
    it('should return 0 when database is not available', () => {
      getDB.mockReturnValue(null);
      expect(getTotalOrganizedFiles()).toBe(0);
    });

    it('should return 0 when no organized files', () => {
      const mockDB = createMockDB({
        'SELECT COUNT(*)': [],
      });
      getDB.mockReturnValue(mockDB);

      expect(getTotalOrganizedFiles()).toBe(0);
    });

    it('should return count of organized files', () => {
      const mockDB = createMockDB({
        'SELECT COUNT(*)': [{ values: [[42]] }],
      });
      getDB.mockReturnValue(mockDB);

      expect(getTotalOrganizedFiles()).toBe(42);
    });

    it('should handle database error gracefully', () => {
      const mockDB = {
        exec: vi.fn(() => {
          throw new Error('DB error');
        }),
      };
      getDB.mockReturnValue(mockDB);

      expect(getTotalOrganizedFiles()).toBe(0);
    });
  });

  // ===========================================================================
  // getFilesOrganizedThisMonth Tests
  // ===========================================================================

  describe('getFilesOrganizedThisMonth', () => {
    it('should return 0 when database is not available', () => {
      getDB.mockReturnValue(null);
      expect(getFilesOrganizedThisMonth()).toBe(0);
    });

    it('should return count of files organized this month', () => {
      const mockDB = createMockDB({
        'start of month': [{ values: [[15]] }],
      });
      getDB.mockReturnValue(mockDB);

      expect(getFilesOrganizedThisMonth()).toBe(15);
    });

    it('should return 0 when no files this month', () => {
      const mockDB = createMockDB({});
      getDB.mockReturnValue(mockDB);

      expect(getFilesOrganizedThisMonth()).toBe(0);
    });
  });

  // ===========================================================================
  // getActiveRulesCount Tests
  // ===========================================================================

  describe('getActiveRulesCount', () => {
    it('should return 0 when database is not available', () => {
      getDB.mockReturnValue(null);
      expect(getActiveRulesCount()).toBe(0);
    });

    it('should return count of active rules', () => {
      const mockDB = createMockDB({
        'is_active = 1': [{ values: [[8]] }],
      });
      getDB.mockReturnValue(mockDB);

      expect(getActiveRulesCount()).toBe(8);
    });
  });

  // ===========================================================================
  // getFilesOrganizedByDay Tests
  // ===========================================================================

  describe('getFilesOrganizedByDay', () => {
    it('should return empty array when database is not available', () => {
      getDB.mockReturnValue(null);
      expect(getFilesOrganizedByDay()).toEqual([]);
    });

    it('should return daily counts with missing days filled', () => {
      // Mock returns only some days with data
      const mockDB = createMockDB({
        'GROUP BY DATE': [
          {
            values: [
              [new Date().toISOString().split('T')[0], 5], // Today
            ],
          },
        ],
      });
      getDB.mockReturnValue(mockDB);

      const result = getFilesOrganizedByDay(3);

      // Should have 3 days (filled with 0s for missing days)
      expect(result).toHaveLength(3);
      expect(result[result.length - 1].count).toBe(5); // Today's count
    });

    it('should validate days parameter', () => {
      const mockDB = createMockDB({});
      getDB.mockReturnValue(mockDB);

      // Should not throw with invalid input
      getFilesOrganizedByDay(-5);
      getFilesOrganizedByDay('invalid');
      getFilesOrganizedByDay(null);
    });

    it('should cap days at 365', () => {
      const mockDB = {
        exec: vi.fn().mockReturnValue([]),
      };
      getDB.mockReturnValue(mockDB);

      getFilesOrganizedByDay(500);

      // Check that the SQL was called with capped value
      const sqlCall = mockDB.exec.mock.calls[0][0];
      expect(sqlCall).toContain('-365 days');
    });
  });

  // ===========================================================================
  // getFilesByType Tests
  // ===========================================================================

  describe('getFilesByType', () => {
    it('should return empty array when database is not available', () => {
      getDB.mockReturnValue(null);
      expect(getFilesByType()).toEqual([]);
    });

    it('should return file type counts', () => {
      const mockDB = createMockDB({
        'GROUP BY file_type': [
          {
            values: [
              ['PDF', 25],
              ['DOCX', 15],
              ['TXT', 10],
            ],
          },
        ],
      });
      getDB.mockReturnValue(mockDB);

      const result = getFilesByType();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'PDF', count: 25 });
      expect(result[1]).toEqual({ type: 'DOCX', count: 15 });
    });

    it('should handle null file types as Unknown', () => {
      const mockDB = createMockDB({
        'GROUP BY file_type': [
          {
            values: [[null, 5]],
          },
        ],
      });
      getDB.mockReturnValue(mockDB);

      const result = getFilesByType();
      expect(result[0].type).toBe('Unknown');
    });

    it('should respect limit parameter', () => {
      const mockDB = {
        exec: vi.fn().mockReturnValue([]),
      };
      getDB.mockReturnValue(mockDB);

      getFilesByType(5);

      const sqlCall = mockDB.exec.mock.calls[0][0];
      expect(sqlCall).toContain('LIMIT 5');
    });
  });

  // ===========================================================================
  // getTopRules Tests
  // ===========================================================================

  describe('getTopRules', () => {
    it('should return empty array when database is not available', () => {
      getDB.mockReturnValue(null);
      expect(getTopRules()).toEqual([]);
    });

    it('should return top rules by match count', () => {
      const mockDB = createMockDB({
        'ORDER BY match_count': [
          {
            values: [
              ['Downloads Rule', 'folder', 150],
              ['Document Rule', 'extension', 100],
            ],
          },
        ],
      });
      getDB.mockReturnValue(mockDB);

      const result = getTopRules();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Downloads Rule',
        type: 'folder',
        matchCount: 150,
      });
    });

    it('should respect limit parameter', () => {
      const mockDB = {
        exec: vi.fn().mockReturnValue([]),
      };
      getDB.mockReturnValue(mockDB);

      getTopRules(10);

      const sqlCall = mockDB.exec.mock.calls[0][0];
      expect(sqlCall).toContain('LIMIT 10');
    });
  });

  // ===========================================================================
  // getWatchActivitySummary Tests
  // ===========================================================================

  describe('getWatchActivitySummary', () => {
    it('should return zeros when database is not available', () => {
      getDB.mockReturnValue(null);
      expect(getWatchActivitySummary()).toEqual({
        total: 0,
        today: 0,
        folders: 0,
      });
    });

    it('should return watch activity summary', () => {
      const mockDB = {
        exec: vi.fn((sql) => {
          if (sql.includes('FROM watch_activity') && !sql.includes("DATE('now')")) {
            return [{ values: [[100]] }]; // Total
          }
          if (sql.includes("DATE('now')")) {
            return [{ values: [[5]] }]; // Today
          }
          if (sql.includes('FROM watched_folders')) {
            return [{ values: [[3]] }]; // Folders
          }
          return [];
        }),
      };
      getDB.mockReturnValue(mockDB);

      const result = getWatchActivitySummary();

      expect(result.total).toBe(100);
      expect(result.today).toBe(5);
      expect(result.folders).toBe(3);
    });

    it('should handle database error gracefully', () => {
      const mockDB = {
        exec: vi.fn(() => {
          throw new Error('Query failed');
        }),
      };
      getDB.mockReturnValue(mockDB);

      const result = getWatchActivitySummary();
      expect(result).toEqual({ total: 0, today: 0, folders: 0 });
    });
  });

  // ===========================================================================
  // getMostCommonCategory Tests
  // ===========================================================================

  describe('getMostCommonCategory', () => {
    it('should return None when database is not available', () => {
      getDB.mockReturnValue(null);
      expect(getMostCommonCategory()).toBe('None');
    });

    it('should return None when no organized files', () => {
      const mockDB = createMockDB({});
      getDB.mockReturnValue(mockDB);

      expect(getMostCommonCategory()).toBe('None');
    });

    it('should return category name for most common prefix', () => {
      const mockDB = {
        exec: vi.fn((sql) => {
          if (sql.includes('GROUP BY category_prefix')) {
            return [{ values: [['12', 50]] }]; // Category 12 is most common
          }
          if (sql.includes('FROM categories')) {
            return [{ values: [['Finance']] }]; // Category 12 name
          }
          return [];
        }),
      };
      getDB.mockReturnValue(mockDB);

      const result = getMostCommonCategory();
      expect(result).toBe('Finance');
    });

    it('should return fallback if category name not found', () => {
      const mockDB = {
        exec: vi.fn((sql) => {
          if (sql.includes('GROUP BY category_prefix')) {
            return [{ values: [['99', 10]] }];
          }
          if (sql.includes('FROM categories')) {
            return []; // No category found
          }
          return [];
        }),
      };
      getDB.mockReturnValue(mockDB);

      const result = getMostCommonCategory();
      expect(result).toContain('Category');
    });
  });

  // ===========================================================================
  // getDashboardStats Tests
  // ===========================================================================

  describe('getDashboardStats', () => {
    it('should return complete dashboard statistics', () => {
      const mockDB = {
        exec: vi.fn((sql) => {
          // Return appropriate mock data based on query
          if (
            sql.includes("status = 'moved'") &&
            !sql.includes('start of month') &&
            !sql.includes('GROUP BY')
          ) {
            return [{ values: [[100]] }]; // Total organized
          }
          if (sql.includes('start of month')) {
            return [{ values: [[20]] }]; // This month
          }
          if (
            sql.includes('organization_rules') &&
            sql.includes('is_active = 1') &&
            !sql.includes('ORDER BY')
          ) {
            return [{ values: [[5]] }]; // Active rules
          }
          return [];
        }),
      };
      getDB.mockReturnValue(mockDB);

      const stats = getDashboardStats();

      expect(stats).toHaveProperty('totalOrganized');
      expect(stats).toHaveProperty('thisMonth');
      expect(stats).toHaveProperty('activeRules');
      expect(stats).toHaveProperty('topCategory');
      expect(stats).toHaveProperty('activityByDay');
      expect(stats).toHaveProperty('filesByType');
      expect(stats).toHaveProperty('topRules');
      expect(stats).toHaveProperty('watchActivity');
    });
  });

  // ===========================================================================
  // hasStatisticsData Tests
  // ===========================================================================

  describe('hasStatisticsData', () => {
    it('should return false when no data', () => {
      const mockDB = createMockDB({});
      getDB.mockReturnValue(mockDB);

      expect(hasStatisticsData()).toBe(false);
    });

    it('should return true when organized files exist', () => {
      const mockDB = {
        exec: vi.fn((sql) => {
          if (sql.includes("status = 'moved'")) {
            return [{ values: [[10]] }];
          }
          return [];
        }),
      };
      getDB.mockReturnValue(mockDB);

      expect(hasStatisticsData()).toBe(true);
    });

    it('should return true when active rules exist', () => {
      const mockDB = {
        exec: vi.fn((sql) => {
          if (sql.includes("status = 'moved'")) {
            return [{ values: [[0]] }];
          }
          if (sql.includes('is_active = 1')) {
            return [{ values: [[3]] }];
          }
          return [];
        }),
      };
      getDB.mockReturnValue(mockDB);

      expect(hasStatisticsData()).toBe(true);
    });
  });
});
