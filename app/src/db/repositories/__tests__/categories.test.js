/**
 * Categories Repository Tests
 * ===========================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCategories,
  getCategory,
  getCategoryByNumber,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryCount,
  isCategoryNumberAvailable,
} from '../categories.js';
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
  getLastInsertId: vi.fn(),
}));

// Mock the activity-log module
vi.mock('../activity-log.js', () => ({
  logActivity: vi.fn(),
}));

import { getDB, saveDatabase, mapResults, buildUpdateQuery, getLastInsertId } from '../utils.js';
import { logActivity } from '../activity-log.js';

describe('getCategories', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns all categories when no areaId provided', () => {
    const mockResults = [{ values: [] }];
    mockDb.exec.mockReturnValue(mockResults);
    const mockMapped = [
      {
        id: 1,
        number: 11,
        area_id: 1,
        name: 'Finance',
        description: '',
        created_at: '2024-01-01',
        area_name: 'Personal',
        area_color: '#blue',
      },
    ];
    mapResults.mockReturnValue(mockMapped);

    const result = getCategories();

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('ORDER BY c.number'), []);
    expect(result).toEqual(mockMapped);
  });

  it('filters by areaId when provided', () => {
    mockDb.exec.mockReturnValue([{ values: [] }]);
    mapResults.mockReturnValue([]);

    getCategories(1);

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('WHERE c.area_id = ?'), [1]);
  });

  it('throws for invalid areaId', () => {
    expect(() => getCategories(-1)).toThrow(DatabaseError);
  });
});

describe('getCategory', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns category by ID', () => {
    const mockCategory = {
      id: 1,
      number: 11,
      area_id: 1,
      name: 'Finance',
      description: '',
      created_at: '2024-01-01',
      area_name: 'Personal',
      area_color: '#blue',
    };
    mockDb.exec.mockReturnValue([{ values: [[1]] }]);
    mapResults.mockReturnValue([mockCategory]);

    const result = getCategory(1);

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('WHERE c.id = ?'), [1]);
    expect(result).toEqual(mockCategory);
  });

  it('returns null for non-existent ID', () => {
    mockDb.exec.mockReturnValue([]);
    mapResults.mockReturnValue([]);

    const result = getCategory(999);

    expect(result).toBeNull();
  });

  it('throws for invalid ID', () => {
    expect(() => getCategory(null)).toThrow(DatabaseError);
  });
});

describe('getCategoryByNumber', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns category by number', () => {
    const mockCategory = {
      id: 1,
      number: 11,
      area_id: 1,
      name: 'Finance',
      description: '',
      created_at: '2024-01-01',
      area_name: 'Personal',
      area_color: '#blue',
    };
    mockDb.exec.mockReturnValue([{ values: [[1]] }]);
    mapResults.mockReturnValue([mockCategory]);

    const result = getCategoryByNumber(11);

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('WHERE c.number = ?'), [11]);
    expect(result).toEqual(mockCategory);
  });

  it('returns null for non-existent number', () => {
    mockDb.exec.mockReturnValue([]);
    mapResults.mockReturnValue([]);

    const result = getCategoryByNumber(99);

    expect(result).toBeNull();
  });
});

describe('createCategory', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    getLastInsertId.mockReturnValue(42);
  });

  it('creates category with all fields', () => {
    const category = {
      number: 12,
      area_id: 1,
      name: 'Travel',
      description: 'Travel expenses',
    };

    const id = createCategory(category);

    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT INTO categories (number, area_id, name, description) VALUES (?, ?, ?, ?)',
      [12, 1, 'Travel', 'Travel expenses']
    );
    expect(logActivity).toHaveBeenCalledWith(
      'create',
      'category',
      '12',
      'Created category: Travel'
    );
    expect(saveDatabase).toHaveBeenCalled();
    expect(id).toBe(42);
  });

  it('creates category with default description', () => {
    const category = {
      number: 13,
      area_id: 1,
      name: 'Insurance',
    };

    createCategory(category);

    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT INTO categories (number, area_id, name, description) VALUES (?, ?, ?, ?)',
      [13, 1, 'Insurance', '']
    );
  });
});

describe('updateCategory', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('updates category with valid fields', () => {
    buildUpdateQuery.mockReturnValue({
      sql: 'UPDATE categories SET name = ? WHERE id = ?',
      values: ['New Name'],
    });

    const result = updateCategory(1, { name: 'New Name' });

    expect(mockDb.run).toHaveBeenCalledWith('UPDATE categories SET name = ? WHERE id = ?', [
      'New Name',
      1,
    ]);
    expect(logActivity).toHaveBeenCalledWith('update', 'category', '1', 'Updated category ID: 1');
    expect(saveDatabase).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('returns false when no valid updates', () => {
    buildUpdateQuery.mockReturnValue(null);

    const result = updateCategory(1, { invalid: 'field' });

    expect(mockDb.run).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('throws for invalid ID', () => {
    expect(() => updateCategory(null, { name: 'Test' })).toThrow(DatabaseError);
  });
});

describe('deleteCategory', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('deletes category when no folders exist', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    deleteCategory(5);

    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM folders WHERE category_id = ?',
      [5]
    );
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM categories WHERE id = ?', [5]);
    expect(logActivity).toHaveBeenCalledWith('delete', 'category', '5', 'Deleted category ID: 5');
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('throws when category has folders', () => {
    mockDb.exec.mockReturnValue([{ values: [[3]] }]);

    expect(() => deleteCategory(5)).toThrow(DatabaseError);
    expect(() => deleteCategory(5)).toThrow('Cannot delete category with existing folders');
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it('throws for invalid ID', () => {
    expect(() => deleteCategory(null)).toThrow(DatabaseError);
  });
});

describe('getCategoryCount', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns total count when no areaId', () => {
    mockDb.exec.mockReturnValue([{ values: [[15]] }]);

    const count = getCategoryCount();

    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM categories');
    expect(count).toBe(15);
  });

  it('returns count for specific area', () => {
    mockDb.exec.mockReturnValue([{ values: [[5]] }]);

    const count = getCategoryCount(1);

    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM categories WHERE area_id = ?',
      [1]
    );
    expect(count).toBe(5);
  });

  it('returns 0 for empty results', () => {
    mockDb.exec.mockReturnValue([]);

    const count = getCategoryCount();

    expect(count).toBe(0);
  });
});

describe('isCategoryNumberAvailable', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns true when number is available', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    const result = isCategoryNumberAvailable(15);

    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM categories WHERE number = ?',
      [15]
    );
    expect(result).toBe(true);
  });

  it('returns false when number exists', () => {
    mockDb.exec.mockReturnValue([{ values: [[1]] }]);

    const result = isCategoryNumberAvailable(11);

    expect(result).toBe(false);
  });

  it('excludes specified ID from check', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    isCategoryNumberAvailable(11, 5);

    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM categories WHERE number = ? AND id != ?',
      [11, 5]
    );
  });
});
