/**
 * Areas Repository Tests
 * ======================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAreas,
  getArea,
  createArea,
  updateArea,
  deleteArea,
  getAreaCount,
  isAreaRangeAvailable,
} from '../areas.js';
import { DatabaseError } from '../../../utils/errors.js';

// Mock the utils module
vi.mock('../utils.js', () => ({
  getDB: vi.fn(),
  requireDB: vi.fn(),
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

import {
  getDB,
  requireDB,
  saveDatabase,
  mapResults,
  buildUpdateQuery,
  getLastInsertId,
} from '../utils.js';
import { logActivity } from '../activity-log.js';

describe('getAreas', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns all areas ordered by range_start', () => {
    const mockResults = [{ values: [] }];
    mockDb.exec.mockReturnValue(mockResults);
    const mockMapped = [
      {
        id: 1,
        range_start: 10,
        range_end: 19,
        name: 'Personal',
        description: '',
        color: '#blue',
        created_at: '2024-01-01',
      },
      {
        id: 2,
        range_start: 20,
        range_end: 29,
        name: 'Work',
        description: '',
        color: '#green',
        created_at: '2024-01-01',
      },
    ];
    mapResults.mockReturnValue(mockMapped);

    const result = getAreas();

    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT id, range_start, range_end, name, description, color, created_at FROM areas ORDER BY range_start'
    );
    expect(result).toEqual(mockMapped);
  });

  it('returns empty array when no areas exist', () => {
    mockDb.exec.mockReturnValue([]);
    mapResults.mockReturnValue([]);

    const result = getAreas();

    expect(result).toEqual([]);
  });
});

describe('getArea', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns area by ID', () => {
    const mockArea = {
      id: 1,
      range_start: 10,
      range_end: 19,
      name: 'Personal',
      description: '',
      color: '#blue',
      created_at: '2024-01-01',
    };
    mockDb.exec.mockReturnValue([{ values: [[1]] }]);
    mapResults.mockReturnValue([mockArea]);

    const result = getArea(1);

    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT id, range_start, range_end, name, description, color, created_at FROM areas WHERE id = ?',
      [1]
    );
    expect(result).toEqual(mockArea);
  });

  it('returns null for non-existent ID', () => {
    mockDb.exec.mockReturnValue([]);
    mapResults.mockReturnValue([]);

    const result = getArea(999);

    expect(result).toBeNull();
  });

  it('throws for invalid ID', () => {
    expect(() => getArea(null)).toThrow(DatabaseError);
    expect(() => getArea(-1)).toThrow(DatabaseError);
  });
});

describe('createArea', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
    getLastInsertId.mockReturnValue(42);
  });

  it('creates area with all fields', () => {
    const area = {
      range_start: 30,
      range_end: 39,
      name: 'Finance',
      description: 'Financial matters',
      color: '#22c55e',
    };

    const id = createArea(area);

    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT INTO areas (range_start, range_end, name, description, color) VALUES (?, ?, ?, ?, ?)',
      [30, 39, 'Finance', 'Financial matters', '#22c55e']
    );
    expect(logActivity).toHaveBeenCalledWith('create', 'area', '30-39', 'Created area: Finance');
    expect(saveDatabase).toHaveBeenCalled();
    expect(id).toBe(42);
  });

  it('creates area with default values', () => {
    const area = {
      range_start: 40,
      range_end: 49,
      name: 'Projects',
    };

    createArea(area);

    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT INTO areas (range_start, range_end, name, description, color) VALUES (?, ?, ?, ?, ?)',
      [40, 49, 'Projects', '', '#64748b']
    );
  });
});

describe('updateArea', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('updates area with valid fields', () => {
    buildUpdateQuery.mockReturnValue({
      sql: 'UPDATE areas SET name = ?, description = ? WHERE id = ?',
      values: ['New Name', 'New description'],
    });

    const result = updateArea(1, { name: 'New Name', description: 'New description' });

    expect(mockDb.run).toHaveBeenCalledWith(
      'UPDATE areas SET name = ?, description = ? WHERE id = ?',
      ['New Name', 'New description', 1]
    );
    expect(logActivity).toHaveBeenCalledWith('update', 'area', '1', 'Updated area ID: 1');
    expect(saveDatabase).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('returns false when no valid updates', () => {
    buildUpdateQuery.mockReturnValue(null);

    const result = updateArea(1, { invalid: 'field' });

    expect(mockDb.run).not.toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
    expect(saveDatabase).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('throws for invalid ID', () => {
    expect(() => updateArea(null, { name: 'Test' })).toThrow(DatabaseError);
  });
});

describe('deleteArea', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('deletes area by ID when no categories exist', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    deleteArea(5);

    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM categories WHERE area_id = ?',
      [5]
    );
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM areas WHERE id = ?', [5]);
    expect(logActivity).toHaveBeenCalledWith('delete', 'area', '5', 'Deleted area ID: 5');
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('throws when area has categories', () => {
    mockDb.exec.mockReturnValue([{ values: [[3]] }]);

    expect(() => deleteArea(5)).toThrow(DatabaseError);
    expect(() => deleteArea(5)).toThrow('Cannot delete area with existing categories');
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it('throws for invalid ID', () => {
    expect(() => deleteArea(null)).toThrow(DatabaseError);
    expect(() => deleteArea(0)).toThrow(DatabaseError);
  });
});

describe('getAreaCount', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns count of areas', () => {
    mockDb.exec.mockReturnValue([{ values: [[8]] }]);

    const count = getAreaCount();

    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM areas');
    expect(count).toBe(8);
  });

  it('returns 0 for empty results', () => {
    mockDb.exec.mockReturnValue([]);

    const count = getAreaCount();

    expect(count).toBe(0);
  });
});

describe('isAreaRangeAvailable', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns true when range is available', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    const result = isAreaRangeAvailable(50, 59);

    expect(result).toBe(true);
  });

  it('returns false when range overlaps', () => {
    mockDb.exec.mockReturnValue([{ values: [[1]] }]);

    const result = isAreaRangeAvailable(10, 19);

    expect(result).toBe(false);
  });

  it('excludes specified ID from check', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    isAreaRangeAvailable(10, 19, 5);

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('AND id != ?'),
      expect.arrayContaining([5])
    );
  });

  it('throws for invalid excludeId', () => {
    expect(() => isAreaRangeAvailable(10, 19, -1)).toThrow(DatabaseError);
  });
});
