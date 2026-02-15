/**
 * Watch Activity Repository Tests
 * ================================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  VALID_WATCH_ACTIONS,
  getWatchActivity,
  getRecentWatchActivity,
  getQueuedFileCounts,
  getWatchActivityById,
  getWatchActivityCount,
  logWatchActivity,
  updateWatchActivityAction,
  deleteWatchActivity,
  clearOldWatchActivity,
  clearWatchActivityForFolder,
} from '../watch-activity.js';
import { DatabaseError } from '../../../utils/errors.js';

// Mock the utils module
vi.mock('../utils.js', () => ({
  getDB: vi.fn(),
  requireDB: vi.fn(),
  saveDatabase: vi.fn(),
  validatePositiveInteger: vi.fn((val, name) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      throw new DatabaseError(`${name} must be a positive integer`);
    }
    return num;
  }),
  getLastInsertId: vi.fn(() => 1),
}));

// Mock validation
vi.mock('../../../utils/validation.js', () => ({
  validateRequiredString: vi.fn((val, name, _maxLen) => {
    if (!val || typeof val !== 'string' || val.trim() === '') {
      throw new DatabaseError(`${name} is required`);
    }
    return val.trim();
  }),
  sanitizeText: vi.fn((val) => val),
}));

import { getDB, requireDB, saveDatabase, getLastInsertId } from '../utils.js';

describe('Constants', () => {
  it('exports valid watch actions', () => {
    expect(VALID_WATCH_ACTIONS).toContain('detected');
    expect(VALID_WATCH_ACTIONS).toContain('queued');
    expect(VALID_WATCH_ACTIONS).toContain('auto_organized');
    expect(VALID_WATCH_ACTIONS).toContain('skipped');
    expect(VALID_WATCH_ACTIONS).toContain('error');
    expect(VALID_WATCH_ACTIONS).toHaveLength(5);
  });
});

describe('getWatchActivity', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns activity for a watched folder', () => {
    const columns = [
      'id',
      'watched_folder_id',
      'filename',
      'path',
      'action',
      'folder_name',
      'rule_name',
    ];
    const row = [1, 1, 'test.pdf', '/path/test.pdf', 'detected', 'Downloads', null];
    mockDb.exec.mockReturnValue([{ columns, values: [row] }]);

    const result = getWatchActivity(1);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 1,
      watched_folder_id: 1,
      filename: 'test.pdf',
      path: '/path/test.pdf',
      action: 'detected',
      folder_name: 'Downloads',
      rule_name: null,
    });
  });

  it('filters by action when provided', () => {
    mockDb.exec.mockReturnValue([]);

    getWatchActivity(1, { action: 'queued' });

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('AND wa.action = ?'), [
      1,
      'queued',
    ]);
  });

  it('ignores invalid action filter', () => {
    mockDb.exec.mockReturnValue([]);

    getWatchActivity(1, { action: 'invalid_action' });

    const call = mockDb.exec.mock.calls[0];
    expect(call[0]).not.toContain('AND wa.action = ?');
  });

  it('applies limit from options', () => {
    mockDb.exec.mockReturnValue([]);

    getWatchActivity(1, { limit: 25 });

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT 25'),
      expect.any(Array)
    );
  });

  it('clamps limit to max 1000', () => {
    mockDb.exec.mockReturnValue([]);

    getWatchActivity(1, { limit: 5000 });

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT 1000'),
      expect.any(Array)
    );
  });

  it('uses default limit of 100', () => {
    mockDb.exec.mockReturnValue([]);

    getWatchActivity(1);

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT 100'),
      expect.any(Array)
    );
  });

  it('returns empty array when no results', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getWatchActivity(1);

    expect(result).toEqual([]);
  });

  it('throws error for invalid folder ID', () => {
    expect(() => getWatchActivity('abc')).toThrow(DatabaseError);
  });

  it('orders by created_at DESC', () => {
    mockDb.exec.mockReturnValue([]);

    getWatchActivity(1);

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY wa.created_at DESC'),
      expect.any(Array)
    );
  });
});

describe('getRecentWatchActivity', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns recent activity across all folders', () => {
    const columns = ['id', 'filename', 'action', 'folder_name'];
    const row = [1, 'doc.pdf', 'detected', 'Downloads'];
    mockDb.exec.mockReturnValue([{ columns, values: [row] }]);

    const result = getRecentWatchActivity();

    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('doc.pdf');
  });

  it('filters by action', () => {
    mockDb.exec.mockReturnValue([]);

    getRecentWatchActivity({ action: 'auto_organized' });

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('wa.action = ?'), [
      'auto_organized',
    ]);
  });

  it('filters by since date', () => {
    mockDb.exec.mockReturnValue([]);

    getRecentWatchActivity({ since: '2026-01-01' });

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('wa.created_at >= ?'), [
      '2026-01-01',
    ]);
  });

  it('combines action and since filters', () => {
    mockDb.exec.mockReturnValue([]);

    getRecentWatchActivity({ action: 'queued', since: '2026-01-01' });

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('WHERE'), [
      'queued',
      '2026-01-01',
    ]);
  });

  it('uses default limit of 50', () => {
    mockDb.exec.mockReturnValue([]);

    getRecentWatchActivity();

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('LIMIT 50'));
  });

  it('accepts custom limit', () => {
    mockDb.exec.mockReturnValue([]);

    getRecentWatchActivity({ limit: 20 });

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('LIMIT 20'));
  });

  it('returns empty array when no results', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getRecentWatchActivity();

    expect(result).toEqual([]);
  });

  it('ignores invalid action filter', () => {
    mockDb.exec.mockReturnValue([]);

    getRecentWatchActivity({ action: 'not_valid' });

    expect(mockDb.exec).toHaveBeenCalledWith(expect.not.stringContaining('wa.action = ?'));
  });
});

describe('getQueuedFileCounts', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns counts by watched folder', () => {
    const columns = ['id', 'name', 'path', 'queued_count'];
    const values = [
      [1, 'Downloads', '/Users/test/Downloads', 5],
      [2, 'Desktop', '/Users/test/Desktop', 2],
    ];
    mockDb.exec.mockReturnValue([{ columns, values }]);

    const result = getQueuedFileCounts();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 1,
      name: 'Downloads',
      path: '/Users/test/Downloads',
      queued_count: 5,
    });
  });

  it('only includes active folders', () => {
    mockDb.exec.mockReturnValue([]);

    getQueuedFileCounts();

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('wf.is_active = 1'));
  });

  it('only counts queued actions', () => {
    mockDb.exec.mockReturnValue([]);

    getQueuedFileCounts();

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining("wa.action = 'queued'"));
  });

  it('returns empty array when no folders', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getQueuedFileCounts();

    expect(result).toEqual([]);
  });
});

describe('getWatchActivityById', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = {
      bind: vi.fn(),
      step: vi.fn(),
      get: vi.fn(),
      getColumnNames: vi.fn(),
      free: vi.fn(),
    };
    mockDb = { prepare: vi.fn(() => mockStmt) };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns activity by ID', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([1, 'test.pdf', 'detected']);
    mockStmt.getColumnNames.mockReturnValue(['id', 'filename', 'action']);

    const result = getWatchActivityById(1);

    expect(result).toEqual({
      id: 1,
      filename: 'test.pdf',
      action: 'detected',
    });
  });

  it('returns null when not found', () => {
    mockStmt.step.mockReturnValue(false);

    const result = getWatchActivityById(999);

    expect(result).toBeNull();
  });

  it('frees prepared statement', () => {
    mockStmt.step.mockReturnValue(false);

    getWatchActivityById(1);

    expect(mockStmt.free).toHaveBeenCalled();
  });

  it('throws error for invalid ID', () => {
    expect(() => getWatchActivityById(-1)).toThrow(DatabaseError);
  });

  it('joins with watched folders and rules', () => {
    mockStmt.step.mockReturnValue(false);

    getWatchActivityById(1);

    expect(mockDb.prepare).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN watched_folders')
    );
    expect(mockDb.prepare).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN organization_rules')
    );
  });
});

describe('getWatchActivityCount', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = {
      bind: vi.fn(),
      step: vi.fn(),
      get: vi.fn(() => [10]),
      free: vi.fn(),
    };
    mockDb = {
      exec: vi.fn(),
      prepare: vi.fn(() => mockStmt),
    };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns total count when no folder ID', () => {
    mockDb.exec.mockReturnValue([{ values: [[100]] }]);

    const result = getWatchActivityCount();

    expect(result).toBe(100);
    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM watch_activity');
  });

  it('returns count for specific folder', () => {
    const result = getWatchActivityCount(1);

    expect(result).toBe(10);
    expect(mockDb.prepare).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM watch_activity WHERE watched_folder_id = ?'
    );
  });

  it('returns 0 when no activities', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getWatchActivityCount();

    expect(result).toBe(0);
  });

  it('frees statement when counting by folder', () => {
    getWatchActivityCount(1);

    expect(mockStmt.free).toHaveBeenCalled();
  });

  it('throws error for invalid folder ID', () => {
    expect(() => getWatchActivityCount('abc')).toThrow(DatabaseError);
  });
});

describe('logWatchActivity', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = {
      run: vi.fn(),
      free: vi.fn(),
    };
    mockDb = { prepare: vi.fn(() => mockStmt) };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
    getLastInsertId.mockReturnValue(1);
  });

  it('creates activity record with required fields', () => {
    const activity = {
      watched_folder_id: 1,
      filename: 'test.pdf',
      path: '/path/test.pdf',
      action: 'detected',
    };

    const id = logWatchActivity(activity);

    expect(id).toBe(1);
    expect(mockStmt.run).toHaveBeenCalledWith([
      1,
      'test.pdf',
      '/path/test.pdf',
      null,
      null,
      null,
      'detected',
      null,
      null,
      null,
    ]);
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('creates record with all optional fields', () => {
    const activity = {
      watched_folder_id: 1,
      filename: 'test.pdf',
      path: '/path/test.pdf',
      action: 'auto_organized',
      file_extension: '.pdf',
      file_type: 'Document',
      file_size: 1024,
      matched_rule_id: 5,
      target_folder: '10.01',
      error_message: null,
    };

    logWatchActivity(activity);

    expect(mockStmt.run).toHaveBeenCalledWith([
      1,
      'test.pdf',
      '/path/test.pdf',
      '.pdf',
      'Document',
      1024,
      'auto_organized',
      5,
      '10.01',
      null,
    ]);
  });

  it('creates error activity with error message', () => {
    const activity = {
      watched_folder_id: 1,
      filename: 'test.pdf',
      path: '/path/test.pdf',
      action: 'error',
      error_message: 'File not found',
    };

    logWatchActivity(activity);

    const runArgs = mockStmt.run.mock.calls[0][0];
    expect(runArgs[6]).toBe('error');
    expect(runArgs[9]).toBe('File not found');
  });

  it('throws error for invalid action', () => {
    expect(() =>
      logWatchActivity({
        watched_folder_id: 1,
        filename: 'test.pdf',
        path: '/path/test.pdf',
        action: 'invalid_action',
      })
    ).toThrow(DatabaseError);
  });

  it('throws error for missing filename', () => {
    expect(() =>
      logWatchActivity({
        watched_folder_id: 1,
        path: '/path/test.pdf',
        action: 'detected',
      })
    ).toThrow(DatabaseError);
  });

  it('throws error for missing path', () => {
    expect(() =>
      logWatchActivity({
        watched_folder_id: 1,
        filename: 'test.pdf',
        action: 'detected',
      })
    ).toThrow(DatabaseError);
  });

  it('throws error for missing watched_folder_id', () => {
    expect(() =>
      logWatchActivity({
        filename: 'test.pdf',
        path: '/path/test.pdf',
        action: 'detected',
      })
    ).toThrow(DatabaseError);
  });

  it('frees prepared statement', () => {
    logWatchActivity({
      watched_folder_id: 1,
      filename: 'test.pdf',
      path: '/path/test.pdf',
      action: 'detected',
    });

    expect(mockStmt.free).toHaveBeenCalled();
  });
});

describe('updateWatchActivityAction', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('updates action only', () => {
    updateWatchActivityAction(1, 'auto_organized');

    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('action = ?'), [
      'auto_organized',
      1,
    ]);
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('updates action with target_folder', () => {
    updateWatchActivityAction(1, 'auto_organized', { target_folder: '10.01' });

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('target_folder = ?'),
      expect.arrayContaining(['auto_organized', '10.01', 1])
    );
  });

  it('updates action with matched_rule_id', () => {
    updateWatchActivityAction(1, 'auto_organized', { matched_rule_id: 5 });

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('matched_rule_id = ?'),
      expect.arrayContaining(['auto_organized', 5, 1])
    );
  });

  it('updates action with error_message', () => {
    updateWatchActivityAction(1, 'error', { error_message: 'Something went wrong' });

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('error_message = ?'),
      expect.arrayContaining(['error', 'Something went wrong', 1])
    );
  });

  it('throws error for invalid action', () => {
    expect(() => updateWatchActivityAction(1, 'not_valid')).toThrow(DatabaseError);
  });

  it('throws error for invalid ID', () => {
    expect(() => updateWatchActivityAction(-1, 'detected')).toThrow(DatabaseError);
  });
});

describe('deleteWatchActivity', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('deletes activity by ID', () => {
    deleteWatchActivity(1);

    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM watch_activity WHERE id = ?', [1]);
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('throws error for invalid ID', () => {
    expect(() => deleteWatchActivity('abc')).toThrow(DatabaseError);
  });
});

describe('clearOldWatchActivity', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      exec: vi.fn(),
      run: vi.fn(),
    };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('deletes old activity and returns count', () => {
    mockDb.exec.mockReturnValue([{ values: [[15]] }]);

    const count = clearOldWatchActivity(30);

    expect(count).toBe(15);
    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('-30 days'));
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('uses default of 30 days', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    clearOldWatchActivity();

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('-30 days'));
  });

  it('returns 0 and skips delete when no old activity', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    const count = clearOldWatchActivity(30);

    expect(count).toBe(0);
    expect(mockDb.run).not.toHaveBeenCalled();
    expect(saveDatabase).not.toHaveBeenCalled();
  });

  it('handles negative days by using absolute value', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    clearOldWatchActivity(-30);

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('-30 days'));
  });

  it('enforces minimum of 1 day', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    clearOldWatchActivity(0);

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('-1 days'));
  });
});

describe('clearWatchActivityForFolder', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = {
      bind: vi.fn(),
      step: vi.fn(),
      get: vi.fn(() => [10]),
      free: vi.fn(),
    };
    mockDb = {
      prepare: vi.fn(() => mockStmt),
      run: vi.fn(),
    };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('clears activity for specific folder', () => {
    const count = clearWatchActivityForFolder(1);

    expect(count).toBe(10);
    expect(mockDb.run).toHaveBeenCalledWith(
      'DELETE FROM watch_activity WHERE watched_folder_id = ?',
      [1]
    );
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('returns 0 and skips delete when no activity', () => {
    mockStmt.get.mockReturnValue([0]);

    const count = clearWatchActivityForFolder(1);

    expect(count).toBe(0);
    expect(mockDb.run).not.toHaveBeenCalled();
    expect(saveDatabase).not.toHaveBeenCalled();
  });

  it('frees count statement', () => {
    clearWatchActivityForFolder(1);

    expect(mockStmt.free).toHaveBeenCalled();
  });

  it('throws error for invalid folder ID', () => {
    expect(() => clearWatchActivityForFolder(-5)).toThrow(DatabaseError);
  });
});
