/**
 * Organized Files Repository Tests
 * =================================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  VALID_FILE_STATUSES,
  getOrganizedFiles,
  getOrganizedFile,
  findOrganizedFileByPath,
  getRecentOrganizedFiles,
  getOrganizedFileCount,
  getOrganizedFilesStats,
  recordOrganizedFile,
  markFileUndone,
  updateOrganizedFile,
  deleteOrganizedFile,
  clearOldOrganizedFiles,
} from '../organized-files.js';
import { DatabaseError } from '../../../utils/errors.js';

// Mock the utils module
vi.mock('../utils.js', () => ({
  getDB: vi.fn(),
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

// Mock activity-log
vi.mock('../activity-log.js', () => ({
  logActivity: vi.fn(),
}));

// Mock organization-rules
vi.mock('../organization-rules.js', () => ({
  incrementRuleMatchCount: vi.fn(),
}));

// Mock validation
vi.mock('../../../utils/validation.js', () => ({
  validateRequiredString: vi.fn((val, name, maxLen) => {
    if (!val || typeof val !== 'string' || val.trim() === '') {
      throw new DatabaseError(`${name} is required`);
    }
    if (val.length > maxLen) {
      throw new DatabaseError(`${name} exceeds max length`);
    }
    return val.trim();
  }),
  validateOptionalString: vi.fn((val, _name, _maxLen) => {
    if (val === null || val === undefined) return null;
    return String(val).trim();
  }),
  sanitizeText: vi.fn((val) => val),
}));

import { getDB, saveDatabase, getLastInsertId } from '../utils.js';
import { logActivity } from '../activity-log.js';
import { incrementRuleMatchCount } from '../organization-rules.js';

describe('Constants', () => {
  it('exports valid file statuses', () => {
    expect(VALID_FILE_STATUSES).toContain('moved');
    expect(VALID_FILE_STATUSES).toContain('tracked');
    expect(VALID_FILE_STATUSES).toContain('undone');
    expect(VALID_FILE_STATUSES).toContain('deleted');
    expect(VALID_FILE_STATUSES).toHaveLength(4);
  });
});

describe('getOrganizedFiles', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns all organized files by default', () => {
    const mockRow = [
      1,
      'test.pdf',
      '/original/test.pdf',
      '/current/test.pdf',
      '10.01',
      null,
      '.pdf',
      'Document',
      1024,
      '2026-01-01',
      5,
      'drive1',
      'moved',
      '2026-02-01',
    ];
    mockDb.exec.mockReturnValue([{ values: [mockRow] }]);

    const result = getOrganizedFiles();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 1,
      filename: 'test.pdf',
      original_path: '/original/test.pdf',
      current_path: '/current/test.pdf',
      jd_folder_number: '10.01',
      jd_item_id: null,
      file_extension: '.pdf',
      file_type: 'Document',
      file_size: 1024,
      file_modified_at: '2026-01-01',
      matched_rule_id: 5,
      cloud_drive_id: 'drive1',
      status: 'moved',
      organized_at: '2026-02-01',
    });
  });

  it('filters by status when valid status provided', () => {
    mockDb.exec.mockReturnValue([]);

    getOrganizedFiles({ status: 'moved' });

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('AND status = ?'), ['moved']);
  });

  it('ignores invalid status', () => {
    mockDb.exec.mockReturnValue([]);

    getOrganizedFiles({ status: 'invalid_status' });

    const call = mockDb.exec.mock.calls[0];
    expect(call[0]).not.toContain('AND status = ?');
  });

  it('filters by jdFolderNumber', () => {
    mockDb.exec.mockReturnValue([]);

    getOrganizedFiles({ jdFolderNumber: '10.01' });

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('AND jd_folder_number = ?'), [
      '10.01',
    ]);
  });

  it('filters by fileType', () => {
    mockDb.exec.mockReturnValue([]);

    getOrganizedFiles({ fileType: 'Document' });

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('AND file_type = ?'), [
      'Document',
    ]);
  });

  it('applies limit and offset', () => {
    mockDb.exec.mockReturnValue([]);

    getOrganizedFiles({ limit: 50, offset: 10 });

    // No filters, so called without params array
    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('LIMIT 50 OFFSET 10'));
  });

  it('clamps limit to max 1000', () => {
    mockDb.exec.mockReturnValue([]);

    getOrganizedFiles({ limit: 5000 });

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('LIMIT 1000'));
  });

  it('clamps offset to min 0', () => {
    mockDb.exec.mockReturnValue([]);

    getOrganizedFiles({ offset: -10 });

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('OFFSET 0'));
  });

  it('returns empty array when no results', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getOrganizedFiles();

    expect(result).toEqual([]);
  });

  it('orders by organized_at DESC', () => {
    mockDb.exec.mockReturnValue([]);

    getOrganizedFiles();

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('ORDER BY organized_at DESC'));
  });
});

describe('getOrganizedFile', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = {
      bind: vi.fn(),
      step: vi.fn(),
      get: vi.fn(),
      free: vi.fn(),
    };
    mockDb = { prepare: vi.fn(() => mockStmt) };
    getDB.mockReturnValue(mockDb);
  });

  it('returns organized file by ID', () => {
    const mockRow = [
      1,
      'test.pdf',
      '/original/test.pdf',
      '/current/test.pdf',
      '10.01',
      null,
      '.pdf',
      'Document',
      1024,
      '2026-01-01',
      5,
      'drive1',
      'moved',
      '2026-02-01',
    ];
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue(mockRow);

    const result = getOrganizedFile(1);

    expect(result.id).toBe(1);
    expect(result.filename).toBe('test.pdf');
    expect(result.status).toBe('moved');
  });

  it('returns null when file not found', () => {
    mockStmt.step.mockReturnValue(false);

    const result = getOrganizedFile(999);

    expect(result).toBeNull();
  });

  it('throws error for invalid ID', () => {
    expect(() => getOrganizedFile('abc')).toThrow(DatabaseError);
    expect(() => getOrganizedFile(-1)).toThrow(DatabaseError);
  });

  it('frees prepared statement', () => {
    mockStmt.step.mockReturnValue(false);

    getOrganizedFile(1);

    expect(mockStmt.free).toHaveBeenCalled();
  });
});

describe('findOrganizedFileByPath', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = {
      bind: vi.fn(),
      step: vi.fn(),
      get: vi.fn(),
      free: vi.fn(),
    };
    mockDb = { prepare: vi.fn(() => mockStmt) };
    getDB.mockReturnValue(mockDb);
  });

  it('returns organized file by original path', () => {
    const mockRow = [
      1,
      'test.pdf',
      '/original/test.pdf',
      '/current/test.pdf',
      '10.01',
      null,
      '.pdf',
      'Document',
      1024,
      '2026-01-01',
      5,
      'drive1',
      'moved',
      '2026-02-01',
    ];
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue(mockRow);

    const result = findOrganizedFileByPath('/original/test.pdf');

    expect(result.filename).toBe('test.pdf');
    expect(mockStmt.bind).toHaveBeenCalledWith(['/original/test.pdf', 'undone']);
  });

  it('returns null when path not found', () => {
    mockStmt.step.mockReturnValue(false);

    const result = findOrganizedFileByPath('/nonexistent/path');

    expect(result).toBeNull();
  });

  it('excludes undone files from results', () => {
    mockStmt.step.mockReturnValue(false);

    findOrganizedFileByPath('/some/path');

    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('AND status != ?'));
  });

  it('throws error for empty path', () => {
    expect(() => findOrganizedFileByPath('')).toThrow(DatabaseError);
  });

  it('frees prepared statement', () => {
    mockStmt.step.mockReturnValue(false);

    findOrganizedFileByPath('/some/path');

    expect(mockStmt.free).toHaveBeenCalled();
  });
});

describe('getRecentOrganizedFiles', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns recent moved files with default limit', () => {
    mockDb.exec.mockReturnValue([]);

    getRecentOrganizedFiles();

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('AND status = ?'), ['moved']);
    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT 20'),
      expect.any(Array)
    );
  });

  it('accepts custom limit', () => {
    mockDb.exec.mockReturnValue([]);

    getRecentOrganizedFiles(10);

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT 10'),
      expect.any(Array)
    );
  });
});

describe('getOrganizedFileCount', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = {
      bind: vi.fn(),
      step: vi.fn(),
      get: vi.fn(() => [42]),
      free: vi.fn(),
    };
    mockDb = {
      exec: vi.fn(),
      prepare: vi.fn(() => mockStmt),
    };
    getDB.mockReturnValue(mockDb);
  });

  it('returns total count when no status provided', () => {
    mockDb.exec.mockReturnValue([{ values: [[100]] }]);

    const result = getOrganizedFileCount();

    expect(result).toBe(100);
    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM organized_files');
  });

  it('returns count filtered by status', () => {
    const result = getOrganizedFileCount('moved');

    expect(result).toBe(42);
    expect(mockDb.prepare).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM organized_files WHERE status = ?'
    );
    expect(mockStmt.bind).toHaveBeenCalledWith(['moved']);
  });

  it('ignores invalid status and returns total', () => {
    mockDb.exec.mockReturnValue([{ values: [[100]] }]);

    const result = getOrganizedFileCount('invalid');

    expect(result).toBe(100);
    expect(mockDb.prepare).not.toHaveBeenCalled();
  });

  it('returns 0 when no files exist', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getOrganizedFileCount();

    expect(result).toBe(0);
  });

  it('frees statement when filtering by status', () => {
    getOrganizedFileCount('moved');

    expect(mockStmt.free).toHaveBeenCalled();
  });
});

describe('getOrganizedFilesStats', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns complete statistics object', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[10]] }]) // totalMoved
      .mockReturnValueOnce([{ values: [[5]] }]) // totalTracked
      .mockReturnValueOnce([{ values: [[2]] }]) // totalUndone
      .mockReturnValueOnce([{ values: [[102400]] }]) // totalSize
      .mockReturnValueOnce([
        {
          values: [
            ['Document', 5],
            ['Image', 3],
          ],
        },
      ]) // byType
      .mockReturnValueOnce([
        {
          values: [
            ['10.01', 4],
            ['10.02', 3],
          ],
        },
      ]); // topFolders

    const result = getOrganizedFilesStats();

    expect(result).toEqual({
      totalMoved: 10,
      totalTracked: 5,
      totalUndone: 2,
      totalSize: 102400,
      byType: { Document: 5, Image: 3 },
      topFolders: [
        { folder_number: '10.01', count: 4 },
        { folder_number: '10.02', count: 3 },
      ],
    });
  });

  it('returns zeros when no data exists', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getOrganizedFilesStats();

    expect(result).toEqual({
      totalMoved: 0,
      totalTracked: 0,
      totalUndone: 0,
      totalSize: 0,
      byType: {},
      topFolders: [],
    });
  });

  it('handles empty byType results', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[10]] }])
      .mockReturnValueOnce([{ values: [[5]] }])
      .mockReturnValueOnce([{ values: [[2]] }])
      .mockReturnValueOnce([{ values: [[102400]] }])
      .mockReturnValueOnce([]) // empty byType
      .mockReturnValueOnce([{ values: [['10.01', 4]] }]);

    const result = getOrganizedFilesStats();

    expect(result.byType).toEqual({});
  });
});

describe('recordOrganizedFile', () => {
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
    getLastInsertId.mockReturnValue(1);
  });

  it('creates organized file record with required fields', () => {
    const file = {
      filename: 'test.pdf',
      original_path: '/original/test.pdf',
      current_path: '/current/test.pdf',
    };

    const id = recordOrganizedFile(file);

    expect(id).toBe(1);
    expect(mockStmt.run).toHaveBeenCalledWith([
      'test.pdf',
      '/original/test.pdf',
      '/current/test.pdf',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'moved',
    ]);
    expect(mockStmt.free).toHaveBeenCalled();
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('creates record with all optional fields', () => {
    const file = {
      filename: 'test.pdf',
      original_path: '/original/test.pdf',
      current_path: '/current/test.pdf',
      jd_folder_number: '10.01',
      jd_item_id: 5,
      file_extension: '.pdf',
      file_type: 'Document',
      file_size: 1024,
      file_modified_at: '2026-01-01',
      matched_rule_id: 3,
      cloud_drive_id: 'drive1',
      status: 'tracked',
    };

    recordOrganizedFile(file);

    expect(mockStmt.run).toHaveBeenCalledWith([
      'test.pdf',
      '/original/test.pdf',
      '/current/test.pdf',
      '10.01',
      5,
      '.pdf',
      'Document',
      1024,
      '2026-01-01',
      3,
      'drive1',
      'tracked',
    ]);
  });

  it('logs activity after recording', () => {
    const file = {
      filename: 'test.pdf',
      original_path: '/original/test.pdf',
      current_path: '/current/test.pdf',
      jd_folder_number: '10.01',
    };

    recordOrganizedFile(file);

    expect(logActivity).toHaveBeenCalledWith(
      'organize',
      'file',
      'test.pdf',
      expect.stringContaining('10.01')
    );
  });

  it('increments rule match count when rule matched', () => {
    const file = {
      filename: 'test.pdf',
      original_path: '/original/test.pdf',
      current_path: '/current/test.pdf',
      matched_rule_id: 5,
    };

    recordOrganizedFile(file);

    expect(incrementRuleMatchCount).toHaveBeenCalledWith(5);
  });

  it('does not increment rule count when no rule matched', () => {
    const file = {
      filename: 'test.pdf',
      original_path: '/original/test.pdf',
      current_path: '/current/test.pdf',
    };

    recordOrganizedFile(file);

    expect(incrementRuleMatchCount).not.toHaveBeenCalled();
  });

  it('defaults to moved status', () => {
    const file = {
      filename: 'test.pdf',
      original_path: '/original/test.pdf',
      current_path: '/current/test.pdf',
    };

    recordOrganizedFile(file);

    const runCall = mockStmt.run.mock.calls[0][0];
    expect(runCall[runCall.length - 1]).toBe('moved');
  });

  it('uses valid status when provided', () => {
    const file = {
      filename: 'test.pdf',
      original_path: '/original/test.pdf',
      current_path: '/current/test.pdf',
      status: 'tracked',
    };

    recordOrganizedFile(file);

    const runCall = mockStmt.run.mock.calls[0][0];
    expect(runCall[runCall.length - 1]).toBe('tracked');
  });

  it('throws error for missing filename', () => {
    expect(() =>
      recordOrganizedFile({
        original_path: '/original/test.pdf',
        current_path: '/current/test.pdf',
      })
    ).toThrow(DatabaseError);
  });

  it('throws error for missing original_path', () => {
    expect(() =>
      recordOrganizedFile({
        filename: 'test.pdf',
        current_path: '/current/test.pdf',
      })
    ).toThrow(DatabaseError);
  });

  it('throws error for missing current_path', () => {
    expect(() =>
      recordOrganizedFile({
        filename: 'test.pdf',
        original_path: '/original/test.pdf',
      })
    ).toThrow(DatabaseError);
  });
});

describe('markFileUndone', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = {
      bind: vi.fn(),
      step: vi.fn(() => true),
      get: vi.fn(() => [
        1,
        'test.pdf',
        '/original/test.pdf',
        '/current/test.pdf',
        '10.01',
        null,
        '.pdf',
        'Document',
        1024,
        '2026-01-01',
        5,
        'drive1',
        'undone',
        '2026-02-01',
      ]),
      free: vi.fn(),
    };
    mockDb = {
      run: vi.fn(),
      prepare: vi.fn(() => mockStmt),
    };
    getDB.mockReturnValue(mockDb);
  });

  it('updates file status to undone', () => {
    markFileUndone(1);

    expect(mockDb.run).toHaveBeenCalledWith(
      "UPDATE organized_files SET status = 'undone' WHERE id = ?",
      [1]
    );
  });

  it('logs undo activity', () => {
    markFileUndone(1);

    expect(logActivity).toHaveBeenCalledWith(
      'undo',
      'file',
      'test.pdf',
      expect.stringContaining('Undid organization')
    );
  });

  it('saves database after update', () => {
    markFileUndone(1);

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('throws error for invalid ID', () => {
    expect(() => markFileUndone('abc')).toThrow(DatabaseError);
  });
});

describe('updateOrganizedFile', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('updates allowed fields', () => {
    updateOrganizedFile(1, { status: 'tracked', current_path: '/new/path' });

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('status = ?'),
      expect.arrayContaining(['tracked', '/new/path', 1])
    );
  });

  it('updates jd_folder_number', () => {
    updateOrganizedFile(1, { jd_folder_number: '20.01' });

    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('jd_folder_number = ?'), [
      '20.01',
      1,
    ]);
  });

  it('ignores disallowed fields', () => {
    updateOrganizedFile(1, { filename: 'hack.pdf', id: 999 });

    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it('does nothing when no valid updates provided', () => {
    updateOrganizedFile(1, { invalid_field: 'value' });

    expect(mockDb.run).not.toHaveBeenCalled();
    expect(saveDatabase).not.toHaveBeenCalled();
  });

  it('saves database after update', () => {
    updateOrganizedFile(1, { status: 'deleted' });

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('throws error for invalid ID', () => {
    expect(() => updateOrganizedFile('abc', { status: 'moved' })).toThrow(DatabaseError);
  });
});

describe('deleteOrganizedFile', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('deletes file by ID', () => {
    deleteOrganizedFile(1);

    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM organized_files WHERE id = ?', [1]);
  });

  it('saves database after deletion', () => {
    deleteOrganizedFile(1);

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('throws error for invalid ID', () => {
    expect(() => deleteOrganizedFile(-5)).toThrow(DatabaseError);
  });
});

describe('clearOldOrganizedFiles', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      exec: vi.fn(),
      run: vi.fn(),
    };
    getDB.mockReturnValue(mockDb);
  });

  it('deletes files older than specified days', () => {
    mockDb.exec.mockReturnValue([{ values: [[5]] }]);

    const count = clearOldOrganizedFiles(90);

    expect(count).toBe(5);
    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('-90 days'));
    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('-90 days'));
  });

  it('uses default of 90 days', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    clearOldOrganizedFiles();

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('-90 days'));
  });

  it('returns 0 and skips delete when no old files', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    const count = clearOldOrganizedFiles(30);

    expect(count).toBe(0);
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it('saves database when files are deleted', () => {
    mockDb.exec.mockReturnValue([{ values: [[3]] }]);

    clearOldOrganizedFiles(60);

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('does not save database when no files deleted', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    clearOldOrganizedFiles(60);

    expect(saveDatabase).not.toHaveBeenCalled();
  });

  it('handles empty result from count query', () => {
    mockDb.exec.mockReturnValue([]);

    const count = clearOldOrganizedFiles(30);

    expect(count).toBe(0);
    expect(mockDb.run).not.toHaveBeenCalled();
  });
});
