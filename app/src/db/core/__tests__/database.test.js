/**
 * Database Core Tests
 * ====================
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDB,
  setDB,
  getSQL,
  setSQL,
  isInitialized,
  saveDatabase,
  loadFromStorage,
  clearStorage,
  getDatabaseStats,
  executeSQL,
  getTables,
  resetDatabase,
  closeDatabase,
} from '../database.js';
import { STORAGE_KEY } from '../../schema/constants.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _getStore: () => store,
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Database Accessors', () => {
  afterEach(() => {
    // Reset module state
    setDB(null);
    setSQL(null);
  });

  describe('getDB / setDB', () => {
    it('returns null initially', () => {
      setDB(null);
      expect(getDB()).toBeNull();
    });

    it('returns the set database', () => {
      const mockDb = { run: vi.fn() };
      setDB(mockDb);
      expect(getDB()).toBe(mockDb);
    });
  });

  describe('getSQL / setSQL', () => {
    it('returns null initially', () => {
      setSQL(null);
      expect(getSQL()).toBeNull();
    });

    it('returns the set SQL module', () => {
      const mockSQL = { Database: vi.fn() };
      setSQL(mockSQL);
      expect(getSQL()).toBe(mockSQL);
    });
  });

  describe('isInitialized', () => {
    it('returns false when db is null', () => {
      setDB(null);
      expect(isInitialized()).toBe(false);
    });

    it('returns true when db is set', () => {
      setDB({ run: vi.fn() });
      expect(isInitialized()).toBe(true);
    });
  });
});

describe('Persistence Functions', () => {
  let mockDb;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    setDB(null);
    setSQL(null);
  });

  afterEach(() => {
    setDB(null);
    setSQL(null);
  });

  describe('saveDatabase', () => {
    it('does nothing if db is null', () => {
      setDB(null);
      saveDatabase();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('saves database to localStorage', () => {
      const mockData = new Uint8Array([1, 2, 3, 4, 5]);
      mockDb = {
        export: vi.fn().mockReturnValue(mockData),
      };
      setDB(mockDb);

      saveDatabase();

      expect(mockDb.export).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify([1, 2, 3, 4, 5])
      );
    });

    it('throws on export error', () => {
      mockDb = {
        export: vi.fn().mockImplementation(() => {
          throw new Error('Export failed');
        }),
      };
      setDB(mockDb);

      expect(() => saveDatabase()).toThrow('Export failed');
    });
  });

  describe('loadFromStorage', () => {
    it('returns null if no saved data', () => {
      localStorageMock.getItem.mockReturnValue(null);
      expect(loadFromStorage()).toBeNull();
    });

    it('returns Uint8Array from saved data', () => {
      localStorageMock.getItem.mockReturnValue('[1, 2, 3, 4, 5]');

      const result = loadFromStorage();

      expect(result).toBeInstanceOf(Uint8Array);
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
    });

    it('returns null on parse error', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      expect(loadFromStorage()).toBeNull();
    });
  });

  describe('clearStorage', () => {
    it('removes database key from localStorage', () => {
      clearStorage();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });
  });
});

describe('Utility Functions', () => {
  let mockDb;

  beforeEach(() => {
    setDB(null);
    setSQL(null);
    vi.clearAllMocks();
  });

  afterEach(() => {
    setDB(null);
    setSQL(null);
  });

  describe('getDatabaseStats', () => {
    it('returns null if db is not initialized', () => {
      setDB(null);
      expect(getDatabaseStats()).toBeNull();
    });

    it('returns table count and size', () => {
      mockDb = {
        exec: vi.fn().mockReturnValue([{ values: [[5]] }]),
      };
      setDB(mockDb);
      localStorageMock.getItem.mockReturnValue('[1,2,3,4,5]');

      const stats = getDatabaseStats();

      expect(stats.tables).toBe(5);
      expect(stats.size).toBe(11); // Length of '[1,2,3,4,5]'
    });

    it('returns null on query error', () => {
      mockDb = {
        exec: vi.fn().mockImplementation(() => {
          throw new Error('Query failed');
        }),
      };
      setDB(mockDb);

      expect(getDatabaseStats()).toBeNull();
    });

    it('handles empty exec result', () => {
      mockDb = {
        exec: vi.fn().mockReturnValue([]),
      };
      setDB(mockDb);
      localStorageMock.getItem.mockReturnValue(null);

      const stats = getDatabaseStats();

      expect(stats.tables).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('executeSQL', () => {
    it('throws if db is not initialized', () => {
      setDB(null);
      expect(() => executeSQL('SELECT 1')).toThrow('Database not initialized');
    });

    it('executes SQL and returns result', () => {
      const mockResult = [{ values: [[1]] }];
      mockDb = {
        exec: vi.fn().mockReturnValue(mockResult),
      };
      setDB(mockDb);

      const result = executeSQL('SELECT 1');

      expect(mockDb.exec).toHaveBeenCalledWith('SELECT 1');
      expect(result).toBe(mockResult);
    });
  });

  describe('getTables', () => {
    it('returns empty array if db is not initialized', () => {
      setDB(null);
      expect(getTables()).toEqual([]);
    });

    it('returns sorted table names', () => {
      mockDb = {
        exec: vi.fn().mockReturnValue([
          {
            values: [['areas'], ['categories'], ['folders']],
          },
        ]),
      };
      setDB(mockDb);

      const tables = getTables();

      expect(tables).toEqual(['areas', 'categories', 'folders']);
    });

    it('returns empty array if no tables', () => {
      mockDb = {
        exec: vi.fn().mockReturnValue([]),
      };
      setDB(mockDb);

      expect(getTables()).toEqual([]);
    });
  });
});

describe('Database Lifecycle', () => {
  let mockDb;
  let mockSQL;

  beforeEach(() => {
    setDB(null);
    setSQL(null);
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    setDB(null);
    setSQL(null);
  });

  describe('resetDatabase', () => {
    it('throws if SQL is not loaded', () => {
      setSQL(null);
      expect(() => resetDatabase()).toThrow('SQL.js not loaded');
    });

    it('closes existing db and creates new one', () => {
      const oldDb = {
        close: vi.fn(),
      };
      const newDb = {
        run: vi.fn(),
        export: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
      };

      mockSQL = {
        // Use mockImplementation with function keyword for constructor compatibility (Vitest 4)
        Database: vi.fn(function () {
          return newDb;
        }),
      };

      setDB(oldDb);
      setSQL(mockSQL);

      const result = resetDatabase();

      expect(oldDb.close).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
      expect(mockSQL.Database).toHaveBeenCalled();
      expect(result).toBe(newDb);
    });

    it('works without existing db', () => {
      const newDb = {
        run: vi.fn(),
        export: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
      };

      mockSQL = {
        // Use mockImplementation with function keyword for constructor compatibility (Vitest 4)
        Database: vi.fn(function () {
          return newDb;
        }),
      };

      setDB(null);
      setSQL(mockSQL);

      const result = resetDatabase();

      expect(mockSQL.Database).toHaveBeenCalled();
      expect(result).toBe(newDb);
    });
  });

  describe('closeDatabase', () => {
    it('does nothing if db is null', () => {
      setDB(null);
      closeDatabase();
      expect(getDB()).toBeNull();
    });

    it('saves and closes database', () => {
      mockDb = {
        close: vi.fn(),
        export: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
      };
      setDB(mockDb);

      closeDatabase();

      expect(mockDb.export).toHaveBeenCalled();
      expect(mockDb.close).toHaveBeenCalled();
      expect(getDB()).toBeNull();
    });
  });
});
