/**
 * Items Repository Tests
 * ======================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getItems,
  getItem,
  getNextItemNumber,
  createItem,
  updateItem,
  deleteItem,
  getItemCount,
  isItemNumberAvailable,
} from '../items.js';
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

import { getDB, saveDatabase, mapResults, buildUpdateQuery } from '../utils.js';
import { logActivity } from '../activity-log.js';

describe('getItems', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn(), prepare: vi.fn() };
    getDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns all items when no folderId provided', () => {
    const mockResults = [{ values: [] }];
    mockDb.exec.mockReturnValue(mockResults);
    const mockMapped = [
      {
        id: 1,
        item_number: '11.01.01',
        folder_id: 1,
        name: 'Budget Report',
        sensitivity: 'standard',
        folder_sensitivity: 'standard',
      },
    ];
    mapResults.mockReturnValue(mockMapped);

    const result = getItems();

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('ORDER BY i.item_number'), []);
    expect(result).toHaveLength(1);
    expect(result[0].effective_sensitivity).toBe('standard');
  });

  it('filters by folderId when provided', () => {
    mockDb.exec.mockReturnValue([{ values: [] }]);
    mapResults.mockReturnValue([]);

    getItems(1);

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('AND i.folder_id = ?'), [1]);
  });

  it('throws for invalid folderId', () => {
    expect(() => getItems(-1)).toThrow(DatabaseError);
  });

  it('computes effective_sensitivity as inherit from folder', () => {
    const mockMapped = [
      {
        id: 1,
        item_number: '11.01.01',
        name: 'Test',
        sensitivity: 'inherit',
        folder_sensitivity: 'confidential',
      },
    ];
    mockDb.exec.mockReturnValue([{ values: [] }]);
    mapResults.mockReturnValue(mockMapped);

    const result = getItems();

    expect(result[0].effective_sensitivity).toBe('confidential');
  });

  it('uses item sensitivity when not inherit', () => {
    const mockMapped = [
      {
        id: 1,
        item_number: '11.01.01',
        name: 'Test',
        sensitivity: 'restricted',
        folder_sensitivity: 'standard',
      },
    ];
    mockDb.exec.mockReturnValue([{ values: [] }]);
    mapResults.mockReturnValue(mockMapped);

    const result = getItems();

    expect(result[0].effective_sensitivity).toBe('restricted');
  });
});

describe('getItem', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns item by ID', () => {
    const mockItem = {
      id: 1,
      item_number: '11.01.01',
      name: 'Budget Report',
      sensitivity: 'standard',
      folder_sensitivity: 'standard',
    };
    mockDb.exec.mockReturnValue([{ values: [[1]] }]);
    mapResults.mockReturnValue([mockItem]);

    const result = getItem(1);

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('WHERE i.id = ?'), [1]);
    expect(result.item_number).toBe('11.01.01');
    expect(result.effective_sensitivity).toBe('standard');
  });

  it('returns null for non-existent ID', () => {
    mockDb.exec.mockReturnValue([]);
    mapResults.mockReturnValue([]);

    const result = getItem(999);

    expect(result).toBeNull();
  });

  it('throws for invalid ID', () => {
    expect(() => getItem(null)).toThrow(DatabaseError);
  });
});

describe('getNextItemNumber', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns next item number for folder', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [['11.01']] }]) // folder number
      .mockReturnValueOnce([{ values: [[2]] }]); // highest sequence

    const result = getNextItemNumber(1);

    expect(result).toEqual({ item_number: '11.01.03', sequence: 3 });
  });

  it('returns first item number when none exist', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [['21.05']] }]) // folder number
      .mockReturnValueOnce([]); // no existing items

    const result = getNextItemNumber(2);

    expect(result).toEqual({ item_number: '21.05.01', sequence: 1 });
  });

  it('returns null for non-existent folder', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getNextItemNumber(999);

    expect(result).toBeNull();
  });
});

describe('createItem', () => {
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

  it('creates item with all fields', () => {
    const item = {
      item_number: '11.01.01',
      folder_id: 1,
      sequence: 1,
      name: 'Budget Report',
      description: 'Q1 budget report',
      file_type: 'pdf',
      sensitivity: 'confidential',
      location: 'Cabinet A',
      storage_path: '/docs/budget/q1.pdf',
      file_size: 1024,
      keywords: 'budget, finance',
      notes: 'Review quarterly',
    };

    const id = createItem(item);

    expect(mockDb.prepare).toHaveBeenCalled();
    expect(mockStmt.run).toHaveBeenCalledWith([
      '11.01.01',
      1,
      1,
      'Budget Report',
      'Q1 budget report',
      'pdf',
      'confidential',
      'Cabinet A',
      '/docs/budget/q1.pdf',
      1024,
      'budget, finance',
      'Review quarterly',
    ]);
    expect(mockStmt.free).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(
      'create',
      'item',
      '11.01.01',
      'Created item: Budget Report'
    );
    expect(saveDatabase).toHaveBeenCalled();
    expect(id).toBe(42);
  });

  it('creates item with default values', () => {
    const item = {
      item_number: '12.01.01',
      folder_id: 1,
      sequence: 1,
      name: 'Tax Form',
    };

    createItem(item);

    expect(mockStmt.run).toHaveBeenCalledWith([
      '12.01.01',
      1,
      1,
      'Tax Form',
      '', // description default
      '', // file_type default
      'inherit', // sensitivity default
      '', // location default
      '', // storage_path default
      null, // file_size default
      '', // keywords default
      '', // notes default
    ]);
  });
});

describe('updateItem', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('updates item with valid fields', () => {
    buildUpdateQuery.mockReturnValue({
      sql: 'UPDATE items SET name = ? WHERE id = ?',
      values: ['New Name'],
    });
    mockDb.exec.mockReturnValue([{ values: [['11.01.01', 'New Name']] }]);

    const result = updateItem(1, { name: 'New Name' });

    expect(mockDb.run).toHaveBeenCalledWith(
      'UPDATE items SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['New Name', 1]
    );
    expect(logActivity).toHaveBeenCalledWith('update', 'item', '11.01.01', 'Updated: New Name');
    expect(saveDatabase).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('returns false when no valid updates', () => {
    buildUpdateQuery.mockReturnValue(null);

    const result = updateItem(1, { invalid: 'field' });

    expect(mockDb.run).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('throws for invalid ID', () => {
    expect(() => updateItem(null, { name: 'Test' })).toThrow(DatabaseError);
  });
});

describe('deleteItem', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('deletes item by ID', () => {
    mockDb.exec.mockReturnValue([{ values: [['11.01.01', 'Budget Report']] }]);

    deleteItem(5);

    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT item_number, name FROM items WHERE id = ?',
      [5]
    );
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM items WHERE id = ?', [5]);
    expect(logActivity).toHaveBeenCalledWith(
      'delete',
      'item',
      '11.01.01',
      'Deleted: Budget Report'
    );
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('throws for invalid ID', () => {
    expect(() => deleteItem(null)).toThrow(DatabaseError);
  });

  it('still deletes when item info not found', () => {
    mockDb.exec.mockReturnValue([]);

    deleteItem(999);

    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM items WHERE id = ?', [999]);
    expect(logActivity).not.toHaveBeenCalled();
  });
});

describe('getItemCount', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns total count when no folderId', () => {
    mockDb.exec.mockReturnValue([{ values: [[50]] }]);

    const count = getItemCount();

    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM items');
    expect(count).toBe(50);
  });

  it('returns count for specific folder', () => {
    mockDb.exec.mockReturnValue([{ values: [[5]] }]);

    const count = getItemCount(1);

    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM items WHERE folder_id = ?', [1]);
    expect(count).toBe(5);
  });

  it('returns 0 for empty results', () => {
    mockDb.exec.mockReturnValue([]);

    const count = getItemCount();

    expect(count).toBe(0);
  });
});

describe('isItemNumberAvailable', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns true when number is available', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    const result = isItemNumberAvailable('15.01.01');

    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM items WHERE item_number = ?', [
      '15.01.01',
    ]);
    expect(result).toBe(true);
  });

  it('returns false when number exists', () => {
    mockDb.exec.mockReturnValue([{ values: [[1]] }]);

    const result = isItemNumberAvailable('11.01.01');

    expect(result).toBe(false);
  });

  it('excludes specified ID from check', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    isItemNumberAvailable('11.01.01', 5);

    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM items WHERE item_number = ? AND id != ?',
      ['11.01.01', 5]
    );
  });
});
