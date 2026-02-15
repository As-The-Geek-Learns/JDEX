/**
 * Table Definitions
 * ==================
 * SQL definitions for all database tables and indexes.
 * Used by createTables() for new databases.
 */

import { SCHEMA_VERSION, TableName } from './constants.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Minimal sql.js database interface for schema operations.
 */
export interface SchemaDatabase {
  run(sql: string, params?: unknown[]): void;
}

/**
 * Table definition with name and SQL.
 */
export interface TableDefinition {
  readonly name: TableName;
  readonly sql: string;
}

// ============================================
// CORE TABLES (Johnny Decimal Structure)
// ============================================

/**
 * Areas table - Level 1 of Johnny Decimal hierarchy.
 * Represents broad life/work categories (00-09, 10-19, etc.)
 */
export const AREAS_TABLE = `
  CREATE TABLE IF NOT EXISTS areas (
    id INTEGER PRIMARY KEY,
    range_start INTEGER NOT NULL,
    range_end INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#64748b',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`;

/**
 * Categories table - Level 2 of Johnny Decimal hierarchy.
 * Topic groups within an area (11, 12, 22, etc.)
 */
export const CATEGORIES_TABLE = `
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    number INTEGER NOT NULL UNIQUE,
    area_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(id)
  )
`;

/**
 * Folders table - Level 3 of Johnny Decimal hierarchy.
 * Container folders in XX.XX format.
 */
export const FOLDERS_TABLE = `
  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_number TEXT NOT NULL UNIQUE,
    category_id INTEGER NOT NULL,
    sequence INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sensitivity TEXT DEFAULT 'standard' CHECK (sensitivity IN ('standard', 'sensitive', 'work')),
    location TEXT,
    storage_path TEXT,
    keywords TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )
`;

/**
 * Items table - Level 4 of Johnny Decimal hierarchy.
 * Actual tracked objects in XX.XX.XXX format.
 */
export const ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_number TEXT NOT NULL UNIQUE,
    folder_id INTEGER NOT NULL,
    sequence INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    file_type TEXT,
    sensitivity TEXT DEFAULT 'inherit' CHECK (sensitivity IN ('inherit', 'standard', 'sensitive', 'work')),
    location TEXT,
    storage_path TEXT,
    file_size INTEGER,
    keywords TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES folders(id)
  )
`;

// ============================================
// STORAGE & CLOUD TABLES
// ============================================

/**
 * Storage locations reference table.
 */
export const STORAGE_LOCATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS storage_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    path TEXT,
    is_encrypted INTEGER DEFAULT 0,
    notes TEXT
  )
`;

/**
 * Cloud drives configuration table.
 * Added in migration 2.
 */
export const CLOUD_DRIVES_TABLE = `
  CREATE TABLE IF NOT EXISTS cloud_drives (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_path TEXT NOT NULL,
    jd_root_path TEXT,
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    drive_type TEXT DEFAULT 'generic',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`;

/**
 * Area to cloud drive mapping table.
 * Added in migration 3.
 */
export const AREA_STORAGE_TABLE = `
  CREATE TABLE IF NOT EXISTS area_storage (
    area_id INTEGER PRIMARY KEY,
    cloud_drive_id TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(id),
    FOREIGN KEY (cloud_drive_id) REFERENCES cloud_drives(id)
  )
`;

// ============================================
// FILE ORGANIZATION TABLES
// ============================================

/**
 * Organization rules table.
 * Added in migration 4.
 */
export const ORGANIZATION_RULES_TABLE = `
  CREATE TABLE IF NOT EXISTS organization_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('extension', 'keyword', 'path', 'regex', 'compound', 'date')),
    pattern TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('folder', 'category', 'area')),
    target_id TEXT NOT NULL,
    priority INTEGER DEFAULT 50,
    is_active INTEGER DEFAULT 1,
    match_count INTEGER DEFAULT 0,
    exclude_pattern TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`;

/**
 * Organized files tracking table.
 * Added in migration 5.
 */
export const ORGANIZED_FILES_TABLE = `
  CREATE TABLE IF NOT EXISTS organized_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_path TEXT NOT NULL,
    current_path TEXT NOT NULL,
    jd_folder_number TEXT,
    jd_item_id INTEGER,
    file_extension TEXT,
    file_type TEXT,
    file_size INTEGER,
    file_modified_at TEXT,
    matched_rule_id INTEGER,
    cloud_drive_id TEXT,
    status TEXT DEFAULT 'moved' CHECK (status IN ('moved', 'tracked', 'undone', 'deleted')),
    organized_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (jd_item_id) REFERENCES items(id),
    FOREIGN KEY (matched_rule_id) REFERENCES organization_rules(id),
    FOREIGN KEY (cloud_drive_id) REFERENCES cloud_drives(id)
  )
`;

/**
 * Scanned files table for batch processing.
 * Added in migration 6.
 */
export const SCANNED_FILES_TABLE = `
  CREATE TABLE IF NOT EXISTS scanned_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_session_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    parent_folder TEXT,
    file_extension TEXT,
    file_type TEXT,
    file_size INTEGER,
    file_modified_at TEXT,
    suggested_jd_folder TEXT,
    suggested_rule_id INTEGER,
    suggestion_confidence TEXT DEFAULT 'none' CHECK (suggestion_confidence IN ('none', 'low', 'medium', 'high')),
    user_decision TEXT DEFAULT 'pending' CHECK (user_decision IN ('pending', 'accepted', 'changed', 'skipped')),
    user_target_folder TEXT,
    scanned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (suggested_rule_id) REFERENCES organization_rules(id)
  )
`;

// ============================================
// WATCH FOLDER TABLES
// ============================================

/**
 * Watched folders configuration table.
 * Added in migration 7.
 */
export const WATCHED_FOLDERS_TABLE = `
  CREATE TABLE IF NOT EXISTS watched_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    is_active INTEGER DEFAULT 1,
    auto_organize INTEGER DEFAULT 0,
    confidence_threshold TEXT DEFAULT 'medium' CHECK (confidence_threshold IN ('low', 'medium', 'high')),
    include_subdirs INTEGER DEFAULT 0,
    file_types TEXT,
    notify_on_organize INTEGER DEFAULT 1,
    last_checked_at TEXT,
    files_processed INTEGER DEFAULT 0,
    files_organized INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`;

/**
 * Watch activity log table.
 * Added in migration 7.
 */
export const WATCH_ACTIVITY_TABLE = `
  CREATE TABLE IF NOT EXISTS watch_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watched_folder_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    file_extension TEXT,
    file_type TEXT,
    file_size INTEGER,
    action TEXT NOT NULL CHECK (action IN ('detected', 'queued', 'auto_organized', 'skipped', 'error')),
    matched_rule_id INTEGER,
    target_folder TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (watched_folder_id) REFERENCES watched_folders(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_rule_id) REFERENCES organization_rules(id)
  )
`;

// ============================================
// SYSTEM TABLES
// ============================================

/**
 * Activity log table for audit trail.
 */
export const ACTIVITY_LOG_TABLE = `
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_number TEXT,
    details TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  )
`;

/**
 * Schema version tracking table.
 */
export const SCHEMA_VERSION_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  )
`;

// ============================================
// INDEXES
// ============================================

/**
 * All index definitions for performance optimization.
 */
export const INDEX_DEFINITIONS: readonly string[] = Object.freeze([
  // Core tables
  'CREATE INDEX IF NOT EXISTS idx_folders_category ON folders(category_id)',
  'CREATE INDEX IF NOT EXISTS idx_folders_number ON folders(folder_number)',
  'CREATE INDEX IF NOT EXISTS idx_items_folder ON items(folder_id)',
  'CREATE INDEX IF NOT EXISTS idx_items_number ON items(item_number)',

  // Cloud drives
  'CREATE INDEX IF NOT EXISTS idx_cloud_drives_default ON cloud_drives(is_default)',

  // Organization rules
  'CREATE INDEX IF NOT EXISTS idx_org_rules_type ON organization_rules(rule_type, is_active)',
  'CREATE INDEX IF NOT EXISTS idx_org_rules_priority ON organization_rules(priority DESC)',

  // Organized files
  'CREATE INDEX IF NOT EXISTS idx_organized_files_path ON organized_files(original_path)',
  'CREATE INDEX IF NOT EXISTS idx_organized_files_folder ON organized_files(jd_folder_number)',
  'CREATE INDEX IF NOT EXISTS idx_organized_files_status ON organized_files(status)',

  // Scanned files
  'CREATE INDEX IF NOT EXISTS idx_scanned_files_session ON scanned_files(scan_session_id)',
  'CREATE INDEX IF NOT EXISTS idx_scanned_files_decision ON scanned_files(user_decision)',
  'CREATE INDEX IF NOT EXISTS idx_scanned_files_type ON scanned_files(file_type)',

  // Watch folders
  'CREATE INDEX IF NOT EXISTS idx_watched_folders_active ON watched_folders(is_active)',
  'CREATE INDEX IF NOT EXISTS idx_watch_activity_folder ON watch_activity(watched_folder_id)',
  'CREATE INDEX IF NOT EXISTS idx_watch_activity_action ON watch_activity(action)',
  'CREATE INDEX IF NOT EXISTS idx_watch_activity_created ON watch_activity(created_at DESC)',
]);

// ============================================
// TABLE CREATION FUNCTIONS
// ============================================

/**
 * All table definitions in creation order.
 * Order matters for foreign key constraints.
 */
export const TABLE_DEFINITIONS: readonly TableDefinition[] = Object.freeze([
  { name: 'areas', sql: AREAS_TABLE },
  { name: 'categories', sql: CATEGORIES_TABLE },
  { name: 'folders', sql: FOLDERS_TABLE },
  { name: 'items', sql: ITEMS_TABLE },
  { name: 'storage_locations', sql: STORAGE_LOCATIONS_TABLE },
  { name: 'cloud_drives', sql: CLOUD_DRIVES_TABLE },
  { name: 'area_storage', sql: AREA_STORAGE_TABLE },
  { name: 'organization_rules', sql: ORGANIZATION_RULES_TABLE },
  { name: 'organized_files', sql: ORGANIZED_FILES_TABLE },
  { name: 'scanned_files', sql: SCANNED_FILES_TABLE },
  { name: 'watched_folders', sql: WATCHED_FOLDERS_TABLE },
  { name: 'watch_activity', sql: WATCH_ACTIVITY_TABLE },
  { name: 'activity_log', sql: ACTIVITY_LOG_TABLE },
  { name: 'schema_version', sql: SCHEMA_VERSION_TABLE },
]);

/**
 * Create all tables in the database.
 */
export function createAllTables(db: SchemaDatabase): void {
  if (!db) {
    throw new Error('Database instance is required');
  }

  for (const { sql } of TABLE_DEFINITIONS) {
    db.run(sql);
  }
}

/**
 * Create all indexes in the database.
 */
export function createIndexes(db: SchemaDatabase): void {
  if (!db) {
    throw new Error('Database instance is required');
  }

  for (const indexSql of INDEX_DEFINITIONS) {
    db.run(indexSql);
  }
}

/**
 * Set the initial schema version.
 */
export function setInitialSchemaVersion(db: SchemaDatabase): void {
  if (!db) {
    throw new Error('Database instance is required');
  }

  db.run('INSERT OR REPLACE INTO schema_version (version) VALUES (?)', [SCHEMA_VERSION]);
}

/**
 * Create all tables, indexes, and set schema version.
 * This is the main entry point for initializing a new database.
 */
export function initializeSchema(db: SchemaDatabase): void {
  createAllTables(db);
  createIndexes(db);
  setInitialSchemaVersion(db);
}
