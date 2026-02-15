/**
 * Activity Log Repository Tests
 * =============================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  logActivity,
  getRecentActivity,
  clearActivityLog,
  getActivityCount,
} from '../activity-log.js';

// Mock the utils module
vi.mock('../utils.js', () => ({
  getDB: vi.fn(),
  requireDB: vi.fn(),
  mapResults: vi.fn(),
  validatePositiveInteger: vi.fn(),
}));

import { getDB, requireDB, mapResults } from '../utils.js';

describe('logActivity', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      run: vi.fn(),
      exec: vi.fn(),
    };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('inserts activity with all parameters', () => {
    logActivity('created', 'folder', '11.01', 'Created new folder');

    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT INTO activity_log (action, entity_type, entity_number, details) VALUES (?, ?, ?, ?)',
      ['created', 'folder', '11.01', 'Created new folder']
    );
  });

  it('inserts activity without details', () => {
    logActivity('deleted', 'item', '11.01.001');

    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT INTO activity_log (action, entity_type, entity_number, details) VALUES (?, ?, ?, ?)',
      ['deleted', 'item', '11.01.001', null]
    );
  });

  it('handles various action types', () => {
    const actions = ['created', 'updated', 'deleted', 'moved', 'renamed'];

    actions.forEach((action) => {
      logActivity(action, 'folder', '12.05');
      expect(mockDb.run).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.arrayContaining([action])
      );
    });
  });

  it('handles various entity types', () => {
    const entityTypes = ['area', 'category', 'folder', 'item', 'rule'];

    entityTypes.forEach((entityType) => {
      logActivity('created', entityType, '10.00');
      expect(mockDb.run).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.arrayContaining([entityType])
      );
    });
  });
});

describe('getRecentActivity', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      run: vi.fn(),
      exec: vi.fn(),
    };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns recent activity with default limit', () => {
    const mockResults = [{ values: [] }];
    mockDb.exec.mockReturnValue(mockResults);

    getRecentActivity();

    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT id, action, entity_type, entity_number, details, timestamp FROM activity_log ORDER BY timestamp DESC LIMIT ?',
      [20]
    );
    expect(mapResults).toHaveBeenCalledWith(mockResults, [
      'id',
      'action',
      'entity_type',
      'entity_number',
      'details',
      'timestamp',
    ]);
  });

  it('returns recent activity with custom limit', () => {
    mockDb.exec.mockReturnValue([{ values: [] }]);

    getRecentActivity(50);

    expect(mockDb.exec).toHaveBeenCalledWith(expect.any(String), [50]);
  });

  it('constrains limit to maximum of 100', () => {
    mockDb.exec.mockReturnValue([{ values: [] }]);

    getRecentActivity(500);

    expect(mockDb.exec).toHaveBeenCalledWith(expect.any(String), [100]);
  });

  it('constrains limit to minimum of 1', () => {
    mockDb.exec.mockReturnValue([{ values: [] }]);

    getRecentActivity(0);

    expect(mockDb.exec).toHaveBeenCalledWith(expect.any(String), [1]);
  });

  it('handles non-numeric limit with default', () => {
    mockDb.exec.mockReturnValue([{ values: [] }]);

    getRecentActivity('invalid');

    expect(mockDb.exec).toHaveBeenCalledWith(expect.any(String), [20]);
  });

  it('returns mapped results', () => {
    const mockMappedResults = [
      {
        id: 1,
        action: 'created',
        entity_type: 'folder',
        entity_number: '11.01',
        details: null,
        timestamp: '2024-01-01',
      },
      {
        id: 2,
        action: 'updated',
        entity_type: 'item',
        entity_number: '11.01.001',
        details: 'Renamed',
        timestamp: '2024-01-02',
      },
    ];
    mockDb.exec.mockReturnValue([{ values: [[1], [2]] }]);
    mapResults.mockReturnValue(mockMappedResults);

    const result = getRecentActivity();

    expect(result).toEqual(mockMappedResults);
  });
});

describe('clearActivityLog', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      run: vi.fn(),
      exec: vi.fn(),
    };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('deletes all activity log entries', () => {
    clearActivityLog();

    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM activity_log');
  });
});

describe('getActivityCount', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      run: vi.fn(),
      exec: vi.fn(),
    };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns count of activity log entries', () => {
    mockDb.exec.mockReturnValue([{ values: [[42]] }]);

    const count = getActivityCount();

    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM activity_log');
    expect(count).toBe(42);
  });

  it('returns 0 for empty results', () => {
    mockDb.exec.mockReturnValue([]);

    const count = getActivityCount();

    expect(count).toBe(0);
  });

  it('returns 0 for null values', () => {
    mockDb.exec.mockReturnValue([{ values: [[null]] }]);

    const count = getActivityCount();

    expect(count).toBe(0);
  });
});
