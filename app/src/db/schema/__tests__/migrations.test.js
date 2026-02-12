/**
 * Migrations Tests
 * =================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSchemaVersion,
  setSchemaVersion,
  migrationV2,
  migrationV3,
  migrationV4,
  migrationV5,
  migrationV6,
  migrationV7,
  migrations,
  getPendingMigrations,
  runMigrations,
  needsMigration,
  getMigrationStatus,
} from '../migrations.js';
import { SCHEMA_VERSION } from '../constants.js';

describe('Schema Version Functions', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      run: vi.fn(),
      exec: vi.fn(),
    };
  });

  describe('getSchemaVersion', () => {
    it('throws if db is null', () => {
      expect(() => getSchemaVersion(null)).toThrow('Database instance is required');
    });

    it('returns version from database', () => {
      mockDb.exec.mockReturnValue([{ values: [[5]] }]);
      expect(getSchemaVersion(mockDb)).toBe(5);
    });

    it('returns 1 if table does not exist', () => {
      mockDb.exec.mockImplementation(() => {
        throw new Error('no such table');
      });
      expect(getSchemaVersion(mockDb)).toBe(1);
    });

    it('returns 1 if result is empty', () => {
      mockDb.exec.mockReturnValue([]);
      expect(getSchemaVersion(mockDb)).toBe(1);
    });
  });

  describe('setSchemaVersion', () => {
    it('throws if db is null', () => {
      expect(() => setSchemaVersion(null, 5)).toThrow('Database instance is required');
    });

    it('inserts version with parameterized query', () => {
      setSchemaVersion(mockDb, 7);
      expect(mockDb.run).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO schema_version (version) VALUES (?)',
        [7]
      );
    });
  });
});

describe('Individual Migrations', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      run: vi.fn(),
    };
    // Suppress console.log during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('migrationV2', () => {
    it('creates schema_version and cloud_drives tables', () => {
      migrationV2(mockDb);

      const calls = mockDb.run.mock.calls.map((c) => c[0]);
      expect(calls.some((sql) => sql.includes('schema_version'))).toBe(true);
      expect(calls.some((sql) => sql.includes('cloud_drives'))).toBe(true);
      expect(calls.some((sql) => sql.includes('idx_cloud_drives_default'))).toBe(true);
    });
  });

  describe('migrationV3', () => {
    it('creates area_storage table', () => {
      migrationV3(mockDb);

      const calls = mockDb.run.mock.calls.map((c) => c[0]);
      expect(calls.some((sql) => sql.includes('area_storage'))).toBe(true);
    });
  });

  describe('migrationV4', () => {
    it('creates organization_rules table with indexes', () => {
      migrationV4(mockDb);

      const calls = mockDb.run.mock.calls.map((c) => c[0]);
      expect(calls.some((sql) => sql.includes('organization_rules'))).toBe(true);
      expect(calls.some((sql) => sql.includes('idx_org_rules_type'))).toBe(true);
      expect(calls.some((sql) => sql.includes('idx_org_rules_priority'))).toBe(true);
    });
  });

  describe('migrationV5', () => {
    it('creates organized_files table with indexes', () => {
      migrationV5(mockDb);

      const calls = mockDb.run.mock.calls.map((c) => c[0]);
      expect(calls.some((sql) => sql.includes('organized_files'))).toBe(true);
      expect(calls.some((sql) => sql.includes('idx_organized_files_path'))).toBe(true);
      expect(calls.some((sql) => sql.includes('idx_organized_files_status'))).toBe(true);
    });
  });

  describe('migrationV6', () => {
    it('creates scanned_files table with indexes', () => {
      migrationV6(mockDb);

      const calls = mockDb.run.mock.calls.map((c) => c[0]);
      expect(calls.some((sql) => sql.includes('scanned_files'))).toBe(true);
      expect(calls.some((sql) => sql.includes('idx_scanned_files_session'))).toBe(true);
    });
  });

  describe('migrationV7', () => {
    it('creates watched_folders and watch_activity tables', () => {
      migrationV7(mockDb);

      const calls = mockDb.run.mock.calls.map((c) => c[0]);
      expect(calls.some((sql) => sql.includes('watched_folders'))).toBe(true);
      expect(calls.some((sql) => sql.includes('watch_activity'))).toBe(true);
      expect(calls.some((sql) => sql.includes('idx_watched_folders_active'))).toBe(true);
      expect(calls.some((sql) => sql.includes('idx_watch_activity_folder'))).toBe(true);
    });
  });
});

describe('Migration Registry', () => {
  it('migrations object is frozen', () => {
    expect(Object.isFrozen(migrations)).toBe(true);
  });

  it('contains migrations 2 through 7', () => {
    expect(migrations[2]).toBeDefined();
    expect(migrations[3]).toBeDefined();
    expect(migrations[4]).toBeDefined();
    expect(migrations[5]).toBeDefined();
    expect(migrations[6]).toBeDefined();
    expect(migrations[7]).toBeDefined();
  });

  it('all migrations are functions', () => {
    for (const [version, fn] of Object.entries(migrations)) {
      expect(typeof fn).toBe('function');
    }
  });
});

describe('getPendingMigrations', () => {
  it('returns all migrations for version 1', () => {
    const pending = getPendingMigrations(1);
    expect(pending).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it('returns remaining migrations for version 4', () => {
    const pending = getPendingMigrations(4);
    expect(pending).toEqual([5, 6, 7]);
  });

  it('returns empty array for current version', () => {
    const pending = getPendingMigrations(SCHEMA_VERSION);
    expect(pending).toEqual([]);
  });

  it('returns empty array for future version', () => {
    const pending = getPendingMigrations(100);
    expect(pending).toEqual([]);
  });
});

describe('runMigrations', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      run: vi.fn(),
      exec: vi.fn(),
    };
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('throws if db is null', () => {
    expect(() => runMigrations(null)).toThrow('Database instance is required');
  });

  it('returns early if already at current version', () => {
    mockDb.exec.mockReturnValue([{ values: [[SCHEMA_VERSION]] }]);

    const result = runMigrations(mockDb);

    expect(result.fromVersion).toBe(SCHEMA_VERSION);
    expect(result.toVersion).toBe(SCHEMA_VERSION);
    expect(result.migrationsRun).toEqual([]);
  });

  it('runs all pending migrations from version 1', () => {
    mockDb.exec.mockReturnValue([{ values: [[1]] }]);

    const result = runMigrations(mockDb);

    expect(result.fromVersion).toBe(1);
    expect(result.toVersion).toBe(SCHEMA_VERSION);
    expect(result.migrationsRun).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it('runs remaining migrations from version 5', () => {
    mockDb.exec.mockReturnValue([{ values: [[5]] }]);

    const result = runMigrations(mockDb);

    expect(result.fromVersion).toBe(5);
    expect(result.toVersion).toBe(SCHEMA_VERSION);
    expect(result.migrationsRun).toEqual([6, 7]);
  });

  it('calls save callback after migrations', () => {
    mockDb.exec.mockReturnValue([{ values: [[1]] }]);
    const saveCallback = vi.fn();

    runMigrations(mockDb, saveCallback);

    expect(saveCallback).toHaveBeenCalledTimes(1);
  });

  it('does not call save callback if no migrations needed', () => {
    mockDb.exec.mockReturnValue([{ values: [[SCHEMA_VERSION]] }]);
    const saveCallback = vi.fn();

    runMigrations(mockDb, saveCallback);

    expect(saveCallback).not.toHaveBeenCalled();
  });
});

describe('needsMigration', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      exec: vi.fn(),
    };
  });

  it('returns true if version is below current', () => {
    mockDb.exec.mockReturnValue([{ values: [[1]] }]);
    expect(needsMigration(mockDb)).toBe(true);
  });

  it('returns false if version is current', () => {
    mockDb.exec.mockReturnValue([{ values: [[SCHEMA_VERSION]] }]);
    expect(needsMigration(mockDb)).toBe(false);
  });
});

describe('getMigrationStatus', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      exec: vi.fn(),
    };
  });

  it('returns full status for version 1', () => {
    mockDb.exec.mockReturnValue([{ values: [[1]] }]);

    const status = getMigrationStatus(mockDb);

    expect(status.currentVersion).toBe(1);
    expect(status.targetVersion).toBe(SCHEMA_VERSION);
    expect(status.pendingCount).toBe(6);
    expect(status.pendingVersions).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it('returns zero pending for current version', () => {
    mockDb.exec.mockReturnValue([{ values: [[SCHEMA_VERSION]] }]);

    const status = getMigrationStatus(mockDb);

    expect(status.currentVersion).toBe(SCHEMA_VERSION);
    expect(status.pendingCount).toBe(0);
    expect(status.pendingVersions).toEqual([]);
  });
});
