/**
 * Table Definitions Tests
 * ========================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AREAS_TABLE,
  CATEGORIES_TABLE,
  FOLDERS_TABLE,
  ITEMS_TABLE,
  CLOUD_DRIVES_TABLE,
  AREA_STORAGE_TABLE,
  ORGANIZATION_RULES_TABLE,
  ORGANIZED_FILES_TABLE,
  SCANNED_FILES_TABLE,
  WATCHED_FOLDERS_TABLE,
  WATCH_ACTIVITY_TABLE,
  ACTIVITY_LOG_TABLE,
  SCHEMA_VERSION_TABLE,
  INDEX_DEFINITIONS,
  TABLE_DEFINITIONS,
  createAllTables,
  createIndexes,
  setInitialSchemaVersion,
  initializeSchema,
} from '../tables.js';
import { SCHEMA_VERSION, TABLE_NAMES } from '../constants.js';

describe('Table SQL Definitions', () => {
  describe('Core Tables', () => {
    it('AREAS_TABLE contains required columns', () => {
      expect(AREAS_TABLE).toContain('CREATE TABLE IF NOT EXISTS areas');
      expect(AREAS_TABLE).toContain('id INTEGER PRIMARY KEY');
      expect(AREAS_TABLE).toContain('range_start INTEGER NOT NULL');
      expect(AREAS_TABLE).toContain('range_end INTEGER NOT NULL');
      expect(AREAS_TABLE).toContain('name TEXT NOT NULL');
      expect(AREAS_TABLE).toContain('color TEXT DEFAULT');
    });

    it('CATEGORIES_TABLE contains required columns and FK', () => {
      expect(CATEGORIES_TABLE).toContain('CREATE TABLE IF NOT EXISTS categories');
      expect(CATEGORIES_TABLE).toContain('area_id INTEGER NOT NULL');
      expect(CATEGORIES_TABLE).toContain('FOREIGN KEY (area_id) REFERENCES areas(id)');
    });

    it('FOLDERS_TABLE contains sensitivity CHECK constraint', () => {
      expect(FOLDERS_TABLE).toContain('CREATE TABLE IF NOT EXISTS folders');
      expect(FOLDERS_TABLE).toContain('folder_number TEXT NOT NULL UNIQUE');
      expect(FOLDERS_TABLE).toContain("CHECK (sensitivity IN ('standard', 'sensitive', 'work'))");
    });

    it('ITEMS_TABLE contains inherit sensitivity option', () => {
      expect(ITEMS_TABLE).toContain('CREATE TABLE IF NOT EXISTS items');
      expect(ITEMS_TABLE).toContain('item_number TEXT NOT NULL UNIQUE');
      expect(ITEMS_TABLE).toContain(
        "CHECK (sensitivity IN ('inherit', 'standard', 'sensitive', 'work'))"
      );
    });
  });

  describe('Cloud Tables', () => {
    it('CLOUD_DRIVES_TABLE has drive_type column', () => {
      expect(CLOUD_DRIVES_TABLE).toContain('CREATE TABLE IF NOT EXISTS cloud_drives');
      expect(CLOUD_DRIVES_TABLE).toContain('id TEXT PRIMARY KEY');
      expect(CLOUD_DRIVES_TABLE).toContain("drive_type TEXT DEFAULT 'generic'");
    });

    it('AREA_STORAGE_TABLE links areas to cloud drives', () => {
      expect(AREA_STORAGE_TABLE).toContain('CREATE TABLE IF NOT EXISTS area_storage');
      expect(AREA_STORAGE_TABLE).toContain('FOREIGN KEY (area_id) REFERENCES areas(id)');
      expect(AREA_STORAGE_TABLE).toContain('FOREIGN KEY (cloud_drive_id) REFERENCES cloud_drives');
    });
  });

  describe('Organization Tables', () => {
    it('ORGANIZATION_RULES_TABLE has CHECK constraints', () => {
      expect(ORGANIZATION_RULES_TABLE).toContain('CREATE TABLE IF NOT EXISTS organization_rules');
      expect(ORGANIZATION_RULES_TABLE).toContain(
        "CHECK (rule_type IN ('extension', 'keyword', 'path', 'regex', 'compound', 'date'))"
      );
      expect(ORGANIZATION_RULES_TABLE).toContain(
        "CHECK (target_type IN ('folder', 'category', 'area'))"
      );
    });

    it('ORGANIZATION_RULES_TABLE has exclude_pattern column', () => {
      expect(ORGANIZATION_RULES_TABLE).toContain('exclude_pattern TEXT');
    });

    it('ORGANIZED_FILES_TABLE tracks file movements', () => {
      expect(ORGANIZED_FILES_TABLE).toContain('CREATE TABLE IF NOT EXISTS organized_files');
      expect(ORGANIZED_FILES_TABLE).toContain('original_path TEXT NOT NULL');
      expect(ORGANIZED_FILES_TABLE).toContain('current_path TEXT NOT NULL');
      expect(ORGANIZED_FILES_TABLE).toContain(
        "CHECK (status IN ('moved', 'tracked', 'undone', 'deleted'))"
      );
    });

    it('SCANNED_FILES_TABLE has confidence and decision checks', () => {
      expect(SCANNED_FILES_TABLE).toContain('CREATE TABLE IF NOT EXISTS scanned_files');
      expect(SCANNED_FILES_TABLE).toContain(
        "CHECK (suggestion_confidence IN ('none', 'low', 'medium', 'high'))"
      );
      expect(SCANNED_FILES_TABLE).toContain(
        "CHECK (user_decision IN ('pending', 'accepted', 'changed', 'skipped'))"
      );
    });
  });

  describe('Watch Tables', () => {
    it('WATCHED_FOLDERS_TABLE has confidence threshold', () => {
      expect(WATCHED_FOLDERS_TABLE).toContain('CREATE TABLE IF NOT EXISTS watched_folders');
      expect(WATCHED_FOLDERS_TABLE).toContain('path TEXT NOT NULL UNIQUE');
      expect(WATCHED_FOLDERS_TABLE).toContain(
        "CHECK (confidence_threshold IN ('low', 'medium', 'high'))"
      );
    });

    it('WATCH_ACTIVITY_TABLE has CASCADE delete', () => {
      expect(WATCH_ACTIVITY_TABLE).toContain('CREATE TABLE IF NOT EXISTS watch_activity');
      expect(WATCH_ACTIVITY_TABLE).toContain('ON DELETE CASCADE');
      expect(WATCH_ACTIVITY_TABLE).toContain(
        "CHECK (action IN ('detected', 'queued', 'auto_organized', 'skipped', 'error'))"
      );
    });
  });

  describe('System Tables', () => {
    it('ACTIVITY_LOG_TABLE tracks actions', () => {
      expect(ACTIVITY_LOG_TABLE).toContain('CREATE TABLE IF NOT EXISTS activity_log');
      expect(ACTIVITY_LOG_TABLE).toContain('action TEXT NOT NULL');
      expect(ACTIVITY_LOG_TABLE).toContain('timestamp TEXT DEFAULT CURRENT_TIMESTAMP');
    });

    it('SCHEMA_VERSION_TABLE is simple', () => {
      expect(SCHEMA_VERSION_TABLE).toContain('CREATE TABLE IF NOT EXISTS schema_version');
      expect(SCHEMA_VERSION_TABLE).toContain('version INTEGER PRIMARY KEY');
    });
  });
});

describe('INDEX_DEFINITIONS', () => {
  it('is a frozen array', () => {
    expect(Object.isFrozen(INDEX_DEFINITIONS)).toBe(true);
  });

  it('contains core indexes', () => {
    const indexStrings = INDEX_DEFINITIONS.join(' ');
    expect(indexStrings).toContain('idx_folders_category');
    expect(indexStrings).toContain('idx_items_folder');
    expect(indexStrings).toContain('idx_org_rules_type');
    expect(indexStrings).toContain('idx_watch_activity_folder');
  });

  it('all indexes use CREATE INDEX IF NOT EXISTS', () => {
    for (const indexSql of INDEX_DEFINITIONS) {
      expect(indexSql).toContain('CREATE INDEX IF NOT EXISTS');
    }
  });
});

describe('TABLE_DEFINITIONS', () => {
  it('is a frozen array', () => {
    expect(Object.isFrozen(TABLE_DEFINITIONS)).toBe(true);
  });

  it('contains 14 table definitions', () => {
    expect(TABLE_DEFINITIONS.length).toBe(14);
  });

  it('each definition has name and sql', () => {
    for (const def of TABLE_DEFINITIONS) {
      expect(def).toHaveProperty('name');
      expect(def).toHaveProperty('sql');
      expect(typeof def.name).toBe('string');
      expect(typeof def.sql).toBe('string');
    }
  });

  it('table names match constants', () => {
    const definedNames = TABLE_DEFINITIONS.map((d) => d.name);
    for (const name of definedNames) {
      expect(TABLE_NAMES).toContain(name);
    }
  });

  it('tables are in correct order for foreign keys', () => {
    const names = TABLE_DEFINITIONS.map((d) => d.name);
    // areas must come before categories
    expect(names.indexOf('areas')).toBeLessThan(names.indexOf('categories'));
    // categories must come before folders
    expect(names.indexOf('categories')).toBeLessThan(names.indexOf('folders'));
    // folders must come before items
    expect(names.indexOf('folders')).toBeLessThan(names.indexOf('items'));
    // cloud_drives must come before area_storage
    expect(names.indexOf('cloud_drives')).toBeLessThan(names.indexOf('area_storage'));
  });
});

describe('Table Creation Functions', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      run: vi.fn(),
    };
  });

  describe('createAllTables', () => {
    it('throws if db is null', () => {
      expect(() => createAllTables(null)).toThrow('Database instance is required');
    });

    it('runs SQL for all tables', () => {
      createAllTables(mockDb);
      expect(mockDb.run).toHaveBeenCalledTimes(TABLE_DEFINITIONS.length);
    });

    it('runs each table definition', () => {
      createAllTables(mockDb);
      for (const { sql } of TABLE_DEFINITIONS) {
        expect(mockDb.run).toHaveBeenCalledWith(sql);
      }
    });
  });

  describe('createIndexes', () => {
    it('throws if db is null', () => {
      expect(() => createIndexes(null)).toThrow('Database instance is required');
    });

    it('runs SQL for all indexes', () => {
      createIndexes(mockDb);
      expect(mockDb.run).toHaveBeenCalledTimes(INDEX_DEFINITIONS.length);
    });
  });

  describe('setInitialSchemaVersion', () => {
    it('throws if db is null', () => {
      expect(() => setInitialSchemaVersion(null)).toThrow('Database instance is required');
    });

    it('inserts current schema version', () => {
      setInitialSchemaVersion(mockDb);
      expect(mockDb.run).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO schema_version (version) VALUES (?)',
        [SCHEMA_VERSION]
      );
    });
  });

  describe('initializeSchema', () => {
    it('creates tables, indexes, and sets version', () => {
      initializeSchema(mockDb);

      // Should run tables + indexes + 1 version insert
      const expectedCalls = TABLE_DEFINITIONS.length + INDEX_DEFINITIONS.length + 1;
      expect(mockDb.run).toHaveBeenCalledTimes(expectedCalls);
    });
  });
});
