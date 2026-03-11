/**
 * Folders Repository Tests
 * ========================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getFolders,
  getFolder,
  getFolderByNumber,
  getNextFolderNumber,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderCount,
  isFolderNumberAvailable,
} from '../folders.js';
import { DatabaseError } from '../../../utils/errors.js';

// Mock the utils module
vi.mock('../utils.js', () => ({
  getDB: vi.fn(),
  saveDatabase: vi.fn(),
  mapResults: vi.fn(),
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
  buildUpdateQuery: vi.fn(),
}));

// Mock the activity-log module
vi.mock('../activity-log.js', () => ({
  logActivity: vi.fn(),
}));

// Mock validation
vi.mock('../../../utils/validation.js', () => ({
  sanitizeText: vi.fn((text) => text),
}));

import { getDB, saveDatabase, mapResults, buildUpdateQuery } from '../utils.js';
import { logActivity } from '../activity-log.js';

describe('getFolders', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn(), prepare: vi.fn() };
    getDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns all folders when no categoryId provided', () => {
    const mockResults = [{ values: [] }];
    mockDb.exec.mockReturnValue(mockResults);
    const mockMapped = [
      {
        id: 1,
        folder_number: '11.01',
        category_id: 1,
        name: 'Budget',
        category_number: 11,
        category_name: 'Finance',
        area_name: 'Personal',
        area_color: '#blue',
      },
    ];
    mapResults.mockReturnValue(mockMapped);

    const result = getFolders();

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY f.folder_number'),
      []
    );
    expect(result).toEqual(mockMapped);
  });

  it('filters by categoryId when provided', () => {
    mockDb.exec.mockReturnValue([{ values: [] }]);
    mapResults.mockReturnValue([]);

    getFolders(1);

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('AND f.category_id = ?'), [1]);
  });

  it('throws for invalid categoryId', () => {
    expect(() => getFolders(-1)).toThrow(DatabaseError);
  });
});

describe('getFolder', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns folder by ID', () => {
    const mockFolder = {
      id: 1,
      folder_number: '11.01',
      category_id: 1,
      name: 'Budget',
      category_number: 11,
      category_name: 'Finance',
    };
    mockDb.exec.mockReturnValue([{ values: [[1]] }]);
    mapResults.mockReturnValue([mockFolder]);

    const result = getFolder(1);

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('WHERE f.id = ?'), [1]);
    expect(result).toEqual(mockFolder);
  });

  it('returns null for non-existent ID', () => {
    mockDb.exec.mockReturnValue([]);
    mapResults.mockReturnValue([]);

    const result = getFolder(999);

    expect(result).toBeNull();
  });

  it('throws for invalid ID', () => {
    expect(() => getFolder(null)).toThrow(DatabaseError);
  });
});

describe('getFolderByNumber', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns folder by number', () => {
    const mockFolder = { id: 1, folder_number: '11.01', name: 'Budget' };
    mockDb.exec.mockReturnValue([{ values: [[1]] }]);
    mapResults.mockReturnValue([mockFolder]);

    const result = getFolderByNumber('11.01');

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('WHERE f.folder_number = ?'), [
      '11.01',
    ]);
    expect(result).toEqual(mockFolder);
  });

  it('returns null for non-existent number', () => {
    mockDb.exec.mockReturnValue([]);
    mapResults.mockReturnValue([]);

    const result = getFolderByNumber('99.99');

    expect(result).toBeNull();
  });

  it('returns null for null input', () => {
    const result = getFolderByNumber(null);
    expect(result).toBeNull();
  });

  it('returns null for non-string input', () => {
    const result = getFolderByNumber(1101);
    expect(result).toBeNull();
  });
});

describe('getNextFolderNumber', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns next folder number for category', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[11]] }]) // category number
      .mockReturnValueOnce([{ values: [[2]] }]); // highest sequence

    const result = getNextFolderNumber(1);

    expect(result).toEqual({ folder_number: '11.03', sequence: 3 });
  });

  it('returns first folder number when none exist', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[21]] }]) // category number
      .mockReturnValueOnce([]); // no existing folders

    const result = getNextFolderNumber(2);

    expect(result).toEqual({ folder_number: '21.01', sequence: 1 });
  });

  it('returns null for non-existent category', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getNextFolderNumber(999);

    expect(result).toBeNull();
  });

  it('pads single-digit category numbers', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[1]] }]) // single digit category
      .mockReturnValueOnce([]);

    const result = getNextFolderNumber(1);

    expect(result).toEqual({ folder_number: '01.01', sequence: 1 });
  });
});

describe('createFolder', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = { run: vi.fn(), free: vi.fn() };
    mockDb = {
      run: vi.fn(),
      exec: vi.fn().mockReturnValue([{ values: [[42]] }]),
      prepare: vi.fn().mockReturnValue(mockStmt),
    };
    getDB.mockReturnValue(mockDb);
  });

  it('creates folder with all fields', () => {
    const folder = {
      folder_number: '11.01',
      category_id: 1,
      sequence: 1,
      name: 'Budget',
      description: 'Monthly budget',
      sensitivity: 'confidential',
      location: 'Office',
      storage_path: '/docs/budget',
      keywords: 'money, finance',
      notes: 'Review monthly',
    };

    const id = createFolder(folder);

    expect(mockDb.prepare).toHaveBeenCalled();
    expect(mockStmt.run).toHaveBeenCalledWith([
      '11.01',
      1,
      1,
      'Budget',
      'Monthly budget',
      'confidential',
      'Office',
      '/docs/budget',
      'money, finance',
      'Review monthly',
    ]);
    expect(mockStmt.free).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith('create', 'folder', '11.01', 'Created folder: Budget');
    expect(saveDatabase).toHaveBeenCalled();
    expect(id).toBe(42);
  });

  it('creates folder with default values', () => {
    const folder = {
      folder_number: '12.01',
      category_id: 1,
      sequence: 1,
      name: 'Taxes',
    };

    createFolder(folder);

    expect(mockStmt.run).toHaveBeenCalledWith([
      '12.01',
      1,
      1,
      'Taxes',
      '', // description default
      'standard', // sensitivity default
      '', // location default
      '', // storage_path default
      '', // keywords default
      '', // notes default
    ]);
  });
});

describe('updateFolder', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('updates folder with valid fields', () => {
    buildUpdateQuery.mockReturnValue({
      sql: 'UPDATE folders SET name = ? WHERE id = ?',
      values: ['New Name'],
    });
    mockDb.exec.mockReturnValue([{ values: [['11.01', 'New Name']] }]);

    const result = updateFolder(1, { name: 'New Name' });

    expect(mockDb.run).toHaveBeenCalledWith(
      'UPDATE folders SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['New Name', 1]
    );
    expect(logActivity).toHaveBeenCalledWith('update', 'folder', '11.01', 'Updated: New Name');
    expect(saveDatabase).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('returns false when no valid updates', () => {
    buildUpdateQuery.mockReturnValue(null);

    const result = updateFolder(1, { invalid: 'field' });

    expect(mockDb.run).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('throws for invalid ID', () => {
    expect(() => updateFolder(null, { name: 'Test' })).toThrow(DatabaseError);
  });
});

describe('deleteFolder', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('deletes folder when no items exist', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[0]] }]) // no items
      .mockReturnValueOnce([{ values: [['11.01', 'Budget']] }]); // folder info

    deleteFolder(5);

    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM items WHERE folder_id = ?', [5]);
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM folders WHERE id = ?', [5]);
    expect(logActivity).toHaveBeenCalledWith('delete', 'folder', '11.01', 'Deleted: Budget');
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('throws when folder has items', () => {
    mockDb.exec.mockReturnValue([{ values: [[3]] }]);

    expect(() => deleteFolder(5)).toThrow(DatabaseError);
    expect(() => deleteFolder(5)).toThrow('Cannot delete folder with existing items');
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it('throws for invalid ID', () => {
    expect(() => deleteFolder(null)).toThrow(DatabaseError);
  });
});

describe('getFolderCount', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns total count when no categoryId', () => {
    mockDb.exec.mockReturnValue([{ values: [[25]] }]);

    const count = getFolderCount();

    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM folders');
    expect(count).toBe(25);
  });

  it('returns count for specific category', () => {
    mockDb.exec.mockReturnValue([{ values: [[5]] }]);

    const count = getFolderCount(1);

    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM folders WHERE category_id = ?',
      [1]
    );
    expect(count).toBe(5);
  });

  it('returns 0 for empty results', () => {
    mockDb.exec.mockReturnValue([]);

    const count = getFolderCount();

    expect(count).toBe(0);
  });
});

describe('isFolderNumberAvailable', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns true when number is available', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    const result = isFolderNumberAvailable('15.01');

    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM folders WHERE folder_number = ?',
      ['15.01']
    );
    expect(result).toBe(true);
  });

  it('returns false when number exists', () => {
    mockDb.exec.mockReturnValue([{ values: [[1]] }]);

    const result = isFolderNumberAvailable('11.01');

    expect(result).toBe(false);
  });

  it('excludes specified ID from check', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    isFolderNumberAvailable('11.01', 5);

    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM folders WHERE folder_number = ? AND id != ?',
      ['11.01', 5]
    );
  });
});
