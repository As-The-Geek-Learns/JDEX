/**
 * Storage Locations Repository Tests
 * ===================================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStorageLocations,
  getStorageLocation,
  createStorageLocation,
  updateStorageLocation,
  deleteStorageLocation,
  getStorageLocationCount,
} from '../storage-locations.js';
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

import {
  getDB,
  requireDB,
  saveDatabase,
  mapResults,
  buildUpdateQuery,
  getLastInsertId,
} from '../utils.js';

describe('getStorageLocations', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns all storage locations ordered by name', () => {
    const mockResults = [{ values: [] }];
    mockDb.exec.mockReturnValue(mockResults);
    const mockMapped = [
      { id: 1, name: 'Cloud Drive', type: 'cloud', path: null, is_encrypted: 0, notes: '' },
      {
        id: 2,
        name: 'Local SSD',
        type: 'local',
        path: '/data',
        is_encrypted: 1,
        notes: 'Encrypted',
      },
    ];
    mapResults.mockReturnValue(mockMapped);

    const result = getStorageLocations();

    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT id, name, type, path, is_encrypted, notes FROM storage_locations ORDER BY name'
    );
    expect(result).toEqual(mockMapped);
  });

  it('returns empty array when no locations exist', () => {
    mockDb.exec.mockReturnValue([]);
    mapResults.mockReturnValue([]);

    const result = getStorageLocations();

    expect(result).toEqual([]);
  });
});

describe('getStorageLocation', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns storage location by ID', () => {
    const mockLocation = {
      id: 1,
      name: 'Cloud',
      type: 'cloud',
      path: null,
      is_encrypted: 0,
      notes: '',
    };
    mockDb.exec.mockReturnValue([{ values: [[1]] }]);
    mapResults.mockReturnValue([mockLocation]);

    const result = getStorageLocation(1);

    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT id, name, type, path, is_encrypted, notes FROM storage_locations WHERE id = ?',
      [1]
    );
    expect(result).toEqual(mockLocation);
  });

  it('returns null for non-existent ID', () => {
    mockDb.exec.mockReturnValue([]);
    mapResults.mockReturnValue([]);

    const result = getStorageLocation(999);

    expect(result).toBeNull();
  });

  it('throws for invalid ID', () => {
    expect(() => getStorageLocation(null)).toThrow(DatabaseError);
    expect(() => getStorageLocation(-1)).toThrow(DatabaseError);
  });
});

describe('createStorageLocation', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
    getLastInsertId.mockReturnValue(42);
  });

  it('creates storage location with all fields', () => {
    const location = {
      name: 'External Drive',
      type: 'external',
      path: '/Volumes/External',
      is_encrypted: true,
      notes: 'Backup drive',
    };

    const id = createStorageLocation(location);

    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT INTO storage_locations (name, type, path, is_encrypted, notes) VALUES (?, ?, ?, ?, ?)',
      ['External Drive', 'external', '/Volumes/External', 1, 'Backup drive']
    );
    expect(saveDatabase).toHaveBeenCalled();
    expect(id).toBe(42);
  });

  it('creates storage location with minimal fields', () => {
    const location = {
      name: 'Simple Storage',
      type: 'local',
    };

    createStorageLocation(location);

    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT INTO storage_locations (name, type, path, is_encrypted, notes) VALUES (?, ?, ?, ?, ?)',
      ['Simple Storage', 'local', null, 0, '']
    );
  });

  it('handles is_encrypted false explicitly', () => {
    const location = {
      name: 'Unencrypted',
      type: 'local',
      is_encrypted: false,
    };

    createStorageLocation(location);

    expect(mockDb.run).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([0]));
  });
});

describe('updateStorageLocation', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('updates storage location with valid fields', () => {
    buildUpdateQuery.mockReturnValue({
      sql: 'UPDATE storage_locations SET name = ?, is_encrypted = ? WHERE id = ?',
      values: ['New Name', 1],
    });

    const result = updateStorageLocation(1, { name: 'New Name', is_encrypted: true });

    expect(buildUpdateQuery).toHaveBeenCalledWith(
      'storage_locations',
      { name: 'New Name', is_encrypted: true },
      ['name', 'type', 'path', 'is_encrypted', 'notes'],
      { transformers: { is_encrypted: expect.any(Function) } }
    );
    expect(mockDb.run).toHaveBeenCalledWith(
      'UPDATE storage_locations SET name = ?, is_encrypted = ? WHERE id = ?',
      ['New Name', 1, 1]
    );
    expect(saveDatabase).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('returns false when no valid updates', () => {
    buildUpdateQuery.mockReturnValue(null);

    const result = updateStorageLocation(1, { invalid: 'field' });

    expect(mockDb.run).not.toHaveBeenCalled();
    expect(saveDatabase).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('throws for invalid ID', () => {
    expect(() => updateStorageLocation(null, { name: 'Test' })).toThrow(DatabaseError);
  });

  it('transforms is_encrypted boolean correctly', () => {
    buildUpdateQuery.mockReturnValue({
      sql: 'UPDATE storage_locations SET is_encrypted = ? WHERE id = ?',
      values: [1],
    });

    updateStorageLocation(1, { is_encrypted: true });

    // Verify the transformer function works
    const callArgs = buildUpdateQuery.mock.calls[0];
    const transformer = callArgs[3].transformers.is_encrypted;
    expect(transformer(true)).toBe(1);
    expect(transformer(false)).toBe(0);
  });
});

describe('deleteStorageLocation', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('deletes storage location by ID', () => {
    deleteStorageLocation(5);

    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM storage_locations WHERE id = ?', [5]);
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('accepts string ID', () => {
    deleteStorageLocation('10');

    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM storage_locations WHERE id = ?', [10]);
  });

  it('throws for invalid ID', () => {
    expect(() => deleteStorageLocation(null)).toThrow(DatabaseError);
    expect(() => deleteStorageLocation(0)).toThrow(DatabaseError);
    expect(() => deleteStorageLocation(-1)).toThrow(DatabaseError);
  });
});

describe('getStorageLocationCount', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn(), exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns count of storage locations', () => {
    mockDb.exec.mockReturnValue([{ values: [[7]] }]);

    const count = getStorageLocationCount();

    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM storage_locations');
    expect(count).toBe(7);
  });

  it('returns 0 for empty results', () => {
    mockDb.exec.mockReturnValue([]);

    const count = getStorageLocationCount();

    expect(count).toBe(0);
  });
});
