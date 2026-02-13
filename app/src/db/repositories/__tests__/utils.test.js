/**
 * Repository Utilities Tests
 * ==========================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validatePositiveInteger,
  buildUpdateQuery,
  mapRowToObject,
  mapResults,
  getLastInsertId,
  getDB,
  saveDatabase,
} from '../utils.js';
import { DatabaseError } from '../../../utils/errors.js';

// Mock the database module
vi.mock('../../core/database.js', () => ({
  getDB: vi.fn(),
  saveDatabase: vi.fn(),
}));

import { getDB as mockGetDB, saveDatabase as mockSaveDatabase } from '../../core/database.js';

describe('validatePositiveInteger', () => {
  it('accepts valid positive integers', () => {
    expect(validatePositiveInteger(1, 'id')).toBe(1);
    expect(validatePositiveInteger(42, 'id')).toBe(42);
    expect(validatePositiveInteger(1000000, 'id')).toBe(1000000);
  });

  it('accepts string representations of positive integers', () => {
    expect(validatePositiveInteger('1', 'id')).toBe(1);
    expect(validatePositiveInteger('42', 'id')).toBe(42);
    expect(validatePositiveInteger('999', 'id')).toBe(999);
  });

  it('throws for null value', () => {
    expect(() => validatePositiveInteger(null, 'userId')).toThrow(DatabaseError);
    expect(() => validatePositiveInteger(null, 'userId')).toThrow('userId is required');
  });

  it('throws for undefined value', () => {
    expect(() => validatePositiveInteger(undefined, 'folderId')).toThrow(DatabaseError);
    expect(() => validatePositiveInteger(undefined, 'folderId')).toThrow('folderId is required');
  });

  it('throws for zero', () => {
    expect(() => validatePositiveInteger(0, 'count')).toThrow(DatabaseError);
    expect(() => validatePositiveInteger(0, 'count')).toThrow('must be a positive whole number');
  });

  it('throws for negative numbers', () => {
    expect(() => validatePositiveInteger(-1, 'id')).toThrow(DatabaseError);
    expect(() => validatePositiveInteger(-100, 'id')).toThrow('must be a positive whole number');
  });

  it('throws for floating point numbers', () => {
    expect(() => validatePositiveInteger(1.5, 'id')).toThrow(DatabaseError);
    expect(() => validatePositiveInteger(3.14159, 'id')).toThrow('must be a positive whole number');
  });

  it('throws for NaN', () => {
    expect(() => validatePositiveInteger(NaN, 'id')).toThrow(DatabaseError);
  });

  it('throws for Infinity', () => {
    expect(() => validatePositiveInteger(Infinity, 'id')).toThrow(DatabaseError);
    expect(() => validatePositiveInteger(-Infinity, 'id')).toThrow(DatabaseError);
  });

  it('throws for non-numeric strings', () => {
    expect(() => validatePositiveInteger('abc', 'id')).toThrow(DatabaseError);
    expect(() => validatePositiveInteger('', 'id')).toThrow(DatabaseError);
  });

  it('includes field name in error message', () => {
    expect(() => validatePositiveInteger(null, 'customField')).toThrow('customField is required');
    expect(() => validatePositiveInteger(-5, 'myId')).toThrow(
      'myId must be a positive whole number'
    );
  });
});

describe('buildUpdateQuery', () => {
  it('builds query for single field update', () => {
    const result = buildUpdateQuery('users', { name: 'John' }, ['name', 'email']);

    expect(result).toEqual({
      sql: 'UPDATE users SET name = ? WHERE id = ?',
      values: ['John'],
    });
  });

  it('builds query for multiple field updates', () => {
    const result = buildUpdateQuery('users', { name: 'John', email: 'john@example.com' }, [
      'name',
      'email',
      'phone',
    ]);

    expect(result).toEqual({
      sql: 'UPDATE users SET name = ?, email = ? WHERE id = ?',
      values: ['John', 'john@example.com'],
    });
  });

  it('ignores fields not in valid columns list', () => {
    const result = buildUpdateQuery(
      'users',
      { name: 'John', password: 'secret', email: 'john@example.com' },
      ['name', 'email']
    );

    expect(result).toEqual({
      sql: 'UPDATE users SET name = ?, email = ? WHERE id = ?',
      values: ['John', 'john@example.com'],
    });
  });

  it('ignores undefined values', () => {
    const result = buildUpdateQuery('users', { name: 'John', email: undefined }, ['name', 'email']);

    expect(result).toEqual({
      sql: 'UPDATE users SET name = ? WHERE id = ?',
      values: ['John'],
    });
  });

  it('returns null when no valid updates', () => {
    const result = buildUpdateQuery('users', { password: 'secret' }, ['name', 'email']);

    expect(result).toBeNull();
  });

  it('returns null for empty updates object', () => {
    const result = buildUpdateQuery('users', {}, ['name', 'email']);

    expect(result).toBeNull();
  });

  it('applies value transformers', () => {
    const result = buildUpdateQuery(
      'storage',
      { name: 'Test', is_encrypted: true },
      ['name', 'is_encrypted'],
      { transformers: { is_encrypted: (v) => (v ? 1 : 0) } }
    );

    expect(result).toEqual({
      sql: 'UPDATE storage SET name = ?, is_encrypted = ? WHERE id = ?',
      values: ['Test', 1],
    });
  });

  it('handles null values in updates', () => {
    const result = buildUpdateQuery('users', { name: 'John', notes: null }, ['name', 'notes']);

    expect(result).toEqual({
      sql: 'UPDATE users SET name = ?, notes = ? WHERE id = ?',
      values: ['John', null],
    });
  });
});

describe('mapRowToObject', () => {
  it('maps row array to object with column names', () => {
    const row = [1, 'John', 'john@example.com'];
    const columns = ['id', 'name', 'email'];

    const result = mapRowToObject(row, columns);

    expect(result).toEqual({
      id: 1,
      name: 'John',
      email: 'john@example.com',
    });
  });

  it('handles null values', () => {
    const row = [1, null, 'john@example.com'];
    const columns = ['id', 'name', 'email'];

    const result = mapRowToObject(row, columns);

    expect(result).toEqual({
      id: 1,
      name: null,
      email: 'john@example.com',
    });
  });

  it('handles empty row and columns', () => {
    const result = mapRowToObject([], []);
    expect(result).toEqual({});
  });
});

describe('mapResults', () => {
  it('maps database results to array of objects', () => {
    const results = [
      {
        values: [
          [1, 'John', 'john@example.com'],
          [2, 'Jane', 'jane@example.com'],
        ],
      },
    ];
    const columns = ['id', 'name', 'email'];

    const mapped = mapResults(results, columns);

    expect(mapped).toEqual([
      { id: 1, name: 'John', email: 'john@example.com' },
      { id: 2, name: 'Jane', email: 'jane@example.com' },
    ]);
  });

  it('returns empty array for empty results', () => {
    const results = [];
    const columns = ['id', 'name'];

    expect(mapResults(results, columns)).toEqual([]);
  });

  it('returns empty array for results with no values', () => {
    const results = [{ values: [] }];
    const columns = ['id', 'name'];

    expect(mapResults(results, columns)).toEqual([]);
  });

  it('returns empty array for undefined results', () => {
    expect(mapResults(undefined, ['id'])).toEqual([]);
  });
});

describe('getLastInsertId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the last insert rowid from database', () => {
    const mockDb = {
      exec: vi.fn().mockReturnValue([{ values: [[42]] }]),
    };
    mockGetDB.mockReturnValue(mockDb);

    const result = getLastInsertId();

    expect(mockDb.exec).toHaveBeenCalledWith('SELECT last_insert_rowid()');
    expect(result).toBe(42);
  });
});

describe('saveDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls core saveDatabase function', () => {
    saveDatabase();
    expect(mockSaveDatabase).toHaveBeenCalled();
  });
});

describe('getDB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('re-exports getDB from core', () => {
    const mockDb = { run: vi.fn() };
    mockGetDB.mockReturnValue(mockDb);

    const result = getDB();

    expect(result).toBe(mockDb);
  });
});
