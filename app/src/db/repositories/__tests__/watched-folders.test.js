/**
 * Watched Folders Repository Tests
 * =================================
 * Tests for watched folders (Premium Feature).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  VALID_CONFIDENCE_THRESHOLDS,
  getWatchedFolders,
  getWatchedFolder,
  getWatchedFolderByPath,
  getWatchedFolderCount,
  createWatchedFolder,
  updateWatchedFolder,
  deleteWatchedFolder,
  incrementWatchedFolderStats,
  toggleWatchedFolder,
  resetWatchedFolderStats,
} from '../watched-folders.js';
import { DatabaseError } from '../../../utils/errors.js';

// Mock the utils module
vi.mock('../utils.js', () => ({
  getDB: vi.fn(),
  requireDB: vi.fn(),
  saveDatabase: vi.fn(),
  validatePositiveInteger: vi.fn((val, name) => {
    if (val === null || val === undefined) {
      throw new DatabaseError(`${name} is required`, 'query');
    }
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    if (typeof num !== 'number' || !Number.isFinite(num) || num < 1 || !Number.isInteger(num)) {
      throw new DatabaseError(`${name} must be a positive whole number`, 'query');
    }
    return num;
  }),
  getLastInsertId: vi.fn(() => 1),
}));

// Mock the validation module
vi.mock('../../../utils/validation.js', () => ({
  validateRequiredString: vi.fn((val, _name, _maxLen) => {
    if (!val || typeof val !== 'string' || val.trim() === '') {
      throw new DatabaseError(`${_name} is required`, 'validation');
    }
    return val.trim();
  }),
  sanitizeText: vi.fn((val) => (val ? val.trim() : '')),
}));

import { getDB, requireDB, saveDatabase, getLastInsertId } from '../utils.js';

describe('Constants', () => {
  it('exports valid confidence thresholds', () => {
    expect(VALID_CONFIDENCE_THRESHOLDS).toEqual(['low', 'medium', 'high']);
  });
});

describe('getWatchedFolders', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn(), run: vi.fn(), prepare: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns all watched folders', () => {
    mockDb.exec.mockReturnValue([
      {
        columns: [
          'id',
          'name',
          'path',
          'is_active',
          'auto_organize',
          'file_types',
          'files_processed',
        ],
        values: [
          [1, 'Downloads', '/Users/test/Downloads', 1, 0, '["pdf","doc"]', 25],
          [2, 'Desktop', '/Users/test/Desktop', 1, 1, null, 10],
        ],
      },
    ]);

    const result = getWatchedFolders();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Downloads');
    expect(result[0].file_types).toEqual(['pdf', 'doc']);
    expect(result[1].file_types).toBeNull();
  });

  it('filters active folders only when requested', () => {
    mockDb.exec.mockReturnValue([]);

    getWatchedFolders({ activeOnly: true });

    const query = mockDb.exec.mock.calls[0][0];
    expect(query).toContain('is_active = 1');
  });

  it('returns all folders by default (no active filter)', () => {
    mockDb.exec.mockReturnValue([]);

    getWatchedFolders();

    const query = mockDb.exec.mock.calls[0][0];
    expect(query).not.toContain('WHERE');
  });

  it('orders by created_at DESC', () => {
    mockDb.exec.mockReturnValue([]);

    getWatchedFolders();

    const query = mockDb.exec.mock.calls[0][0];
    expect(query).toContain('ORDER BY created_at DESC');
  });

  it('returns empty array when no folders exist', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getWatchedFolders();

    expect(result).toEqual([]);
  });

  it('parses file_types JSON correctly', () => {
    mockDb.exec.mockReturnValue([
      {
        columns: ['id', 'name', 'path', 'file_types'],
        values: [[1, 'Test', '/test', '["pdf","jpg","png"]']],
      },
    ]);

    const result = getWatchedFolders();

    expect(result[0].file_types).toEqual(['pdf', 'jpg', 'png']);
  });

  it('handles invalid JSON in file_types', () => {
    mockDb.exec.mockReturnValue([
      {
        columns: ['id', 'name', 'path', 'file_types'],
        values: [[1, 'Test', '/test', 'invalid json']],
      },
    ]);

    const result = getWatchedFolders();

    expect(result[0].file_types).toEqual([]);
  });
});

describe('getWatchedFolder', () => {
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
    mockDb = { exec: vi.fn(), prepare: vi.fn(() => mockStmt), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns a watched folder by ID', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.getColumnNames.mockReturnValue(['id', 'name', 'path', 'is_active', 'file_types']);
    mockStmt.get.mockReturnValue([1, 'Downloads', '/Users/test/Downloads', 1, null]);

    const result = getWatchedFolder(1);

    expect(mockStmt.bind).toHaveBeenCalledWith([1]);
    expect(result.name).toBe('Downloads');
    expect(result.path).toBe('/Users/test/Downloads');
  });

  it('returns null when folder not found', () => {
    mockStmt.step.mockReturnValue(false);

    const result = getWatchedFolder(999);

    expect(result).toBeNull();
  });

  it('throws error for invalid ID', () => {
    expect(() => getWatchedFolder(null)).toThrow(DatabaseError);
    expect(() => getWatchedFolder(-1)).toThrow(DatabaseError);
  });

  it('frees prepared statement after use', () => {
    mockStmt.step.mockReturnValue(false);

    getWatchedFolder(1);

    expect(mockStmt.free).toHaveBeenCalled();
  });
});

describe('getWatchedFolderByPath', () => {
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
    mockDb = { exec: vi.fn(), prepare: vi.fn(() => mockStmt), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns a watched folder by path', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.getColumnNames.mockReturnValue(['id', 'name', 'path', 'is_active']);
    mockStmt.get.mockReturnValue([1, 'Downloads', '/Users/test/Downloads', 1]);

    const result = getWatchedFolderByPath('/Users/test/Downloads');

    expect(mockStmt.bind).toHaveBeenCalledWith(['/Users/test/Downloads']);
    expect(result.name).toBe('Downloads');
  });

  it('returns null when path not found', () => {
    mockStmt.step.mockReturnValue(false);

    const result = getWatchedFolderByPath('/nonexistent/path');

    expect(result).toBeNull();
  });

  it('frees prepared statement after use', () => {
    mockStmt.step.mockReturnValue(false);

    getWatchedFolderByPath('/test');

    expect(mockStmt.free).toHaveBeenCalled();
  });
});

describe('getWatchedFolderCount', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns count of all folders', () => {
    mockDb.exec.mockReturnValue([{ values: [[5]] }]);

    const result = getWatchedFolderCount();

    expect(result).toBe(5);
    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM watched_folders');
  });

  it('returns count of active folders only', () => {
    mockDb.exec.mockReturnValue([{ values: [[3]] }]);

    const result = getWatchedFolderCount(true);

    expect(result).toBe(3);
    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM watched_folders WHERE is_active = 1'
    );
  });

  it('returns 0 when no folders exist', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getWatchedFolderCount();

    expect(result).toBe(0);
  });
});

describe('createWatchedFolder', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = { run: vi.fn(), free: vi.fn() };
    mockDb = { exec: vi.fn(), prepare: vi.fn(() => mockStmt), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
    getLastInsertId.mockReturnValue(1);
  });

  it('creates a folder with required fields', () => {
    const folder = {
      name: 'Downloads',
      path: '/Users/test/Downloads',
    };

    const result = createWatchedFolder(folder);

    expect(result).toBe(1);
    expect(mockStmt.run).toHaveBeenCalled();
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('uses default values for optional fields', () => {
    createWatchedFolder({
      name: 'Test',
      path: '/test',
    });

    const params = mockStmt.run.mock.calls[0][0];
    expect(params[2]).toBe(1); // is_active default
    expect(params[3]).toBe(0); // auto_organize default
    expect(params[4]).toBe('medium'); // confidence_threshold default
    expect(params[5]).toBe(0); // include_subdirs default
    expect(params[7]).toBe(1); // notify_on_organize default
  });

  it('accepts custom values for optional fields', () => {
    createWatchedFolder({
      name: 'Test',
      path: '/test',
      is_active: false,
      auto_organize: true,
      confidence_threshold: 'high',
      include_subdirs: true,
      file_types: ['pdf', 'doc'],
      notify_on_organize: false,
    });

    const params = mockStmt.run.mock.calls[0][0];
    expect(params[2]).toBe(0); // is_active
    expect(params[3]).toBe(1); // auto_organize
    expect(params[4]).toBe('high'); // confidence_threshold
    expect(params[5]).toBe(1); // include_subdirs
    expect(params[6]).toBe('["pdf","doc"]'); // file_types JSON
    expect(params[7]).toBe(0); // notify_on_organize
  });

  it('throws error for invalid confidence threshold', () => {
    expect(() =>
      createWatchedFolder({
        name: 'Test',
        path: '/test',
        confidence_threshold: 'invalid',
      })
    ).toThrow(DatabaseError);
  });

  it('throws error for missing name', () => {
    expect(() =>
      createWatchedFolder({
        name: '',
        path: '/test',
      })
    ).toThrow(DatabaseError);
  });

  it('throws error for missing path', () => {
    expect(() =>
      createWatchedFolder({
        name: 'Test',
        path: '',
      })
    ).toThrow(DatabaseError);
  });

  it('frees prepared statement after use', () => {
    createWatchedFolder({
      name: 'Test',
      path: '/test',
    });

    expect(mockStmt.free).toHaveBeenCalled();
  });
});

describe('updateWatchedFolder', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn(), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('updates folder with valid fields', () => {
    updateWatchedFolder(1, { name: 'Updated Name', is_active: false });

    expect(mockDb.run).toHaveBeenCalled();
    const [query, values] = mockDb.run.mock.calls[0];
    expect(query).toContain('UPDATE watched_folders SET');
    expect(query).toContain('name = ?');
    expect(query).toContain('is_active = ?');
    expect(values).toContain('Updated Name');
    expect(values).toContain(0); // is_active converted to 0
  });

  it('saves database after update', () => {
    updateWatchedFolder(1, { name: 'Test' });

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('ignores invalid fields', () => {
    updateWatchedFolder(1, { invalid_field: 'value', name: 'Valid' });

    const [query] = mockDb.run.mock.calls[0];
    expect(query).not.toContain('invalid_field');
    expect(query).toContain('name');
  });

  it('does nothing when no valid updates provided', () => {
    updateWatchedFolder(1, { invalid: 'value' });

    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it('converts boolean fields to integers', () => {
    updateWatchedFolder(1, {
      is_active: true,
      auto_organize: true,
      include_subdirs: false,
      notify_on_organize: true,
    });

    const [_query, values] = mockDb.run.mock.calls[0];
    expect(values).toContain(1); // is_active
    expect(values).toContain(1); // auto_organize
    expect(values).toContain(0); // include_subdirs
    expect(values).toContain(1); // notify_on_organize
  });

  it('stringifies file_types array', () => {
    updateWatchedFolder(1, { file_types: ['pdf', 'doc', 'txt'] });

    const [_query, values] = mockDb.run.mock.calls[0];
    expect(values).toContain('["pdf","doc","txt"]');
  });

  it('adds updated_at timestamp', () => {
    updateWatchedFolder(1, { name: 'Test' });

    const [query] = mockDb.run.mock.calls[0];
    expect(query).toContain('updated_at = CURRENT_TIMESTAMP');
  });

  it('throws error for invalid ID', () => {
    expect(() => updateWatchedFolder(null, { name: 'Test' })).toThrow(DatabaseError);
  });
});

describe('deleteWatchedFolder', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn(), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('deletes a folder by ID', () => {
    deleteWatchedFolder(1);

    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM watched_folders WHERE id = ?', [1]);
  });

  it('saves database after deletion', () => {
    deleteWatchedFolder(1);

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('throws error for invalid ID', () => {
    expect(() => deleteWatchedFolder(null)).toThrow(DatabaseError);
    expect(() => deleteWatchedFolder(-1)).toThrow(DatabaseError);
  });
});

describe('incrementWatchedFolderStats', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn(), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('increments files_processed only by default', () => {
    incrementWatchedFolderStats(1);

    const [query] = mockDb.run.mock.calls[0];
    expect(query).toContain('files_processed = files_processed + 1');
    expect(query).not.toContain('files_organized = files_organized + 1');
  });

  it('increments both counters when organized is true', () => {
    incrementWatchedFolderStats(1, true);

    const [query] = mockDb.run.mock.calls[0];
    expect(query).toContain('files_processed = files_processed + 1');
    expect(query).toContain('files_organized = files_organized + 1');
  });

  it('updates last_checked_at timestamp', () => {
    incrementWatchedFolderStats(1);

    const [query] = mockDb.run.mock.calls[0];
    expect(query).toContain('last_checked_at = CURRENT_TIMESTAMP');
  });

  it('saves database after increment', () => {
    incrementWatchedFolderStats(1);

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('throws error for invalid ID', () => {
    expect(() => incrementWatchedFolderStats(null)).toThrow(DatabaseError);
  });
});

describe('toggleWatchedFolder', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = { bind: vi.fn(), step: vi.fn(), get: vi.fn(), free: vi.fn() };
    mockDb = { exec: vi.fn(), prepare: vi.fn(() => mockStmt), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('toggles active status and returns new state', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([1]); // Now active

    const result = toggleWatchedFolder(1);

    expect(result).toBe(true);
    expect(mockDb.run).toHaveBeenCalled();
    const [query] = mockDb.run.mock.calls[0];
    expect(query).toContain('is_active = 1 - is_active');
  });

  it('returns false when toggled to inactive', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([0]); // Now inactive

    const result = toggleWatchedFolder(1);

    expect(result).toBe(false);
  });

  it('saves database after toggle', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([1]);

    toggleWatchedFolder(1);

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('updates timestamp', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([1]);

    toggleWatchedFolder(1);

    const [query] = mockDb.run.mock.calls[0];
    expect(query).toContain('updated_at = CURRENT_TIMESTAMP');
  });

  it('frees statement after use', () => {
    mockStmt.step.mockReturnValue(false);

    toggleWatchedFolder(1);

    expect(mockStmt.free).toHaveBeenCalled();
  });

  it('throws error for invalid ID', () => {
    expect(() => toggleWatchedFolder(null)).toThrow(DatabaseError);
  });
});

describe('resetWatchedFolderStats', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn(), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('resets both counters to 0', () => {
    resetWatchedFolderStats(1);

    const [query, params] = mockDb.run.mock.calls[0];
    expect(query).toContain('files_processed = 0');
    expect(query).toContain('files_organized = 0');
    expect(params).toEqual([1]);
  });

  it('saves database after reset', () => {
    resetWatchedFolderStats(1);

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('updates timestamp', () => {
    resetWatchedFolderStats(1);

    const [query] = mockDb.run.mock.calls[0];
    expect(query).toContain('updated_at = CURRENT_TIMESTAMP');
  });

  it('throws error for invalid ID', () => {
    expect(() => resetWatchedFolderStats(null)).toThrow(DatabaseError);
  });
});
