/**
 * Database Migrations
 * ====================
 * Schema migrations for upgrading existing databases.
 * Each migration is numbered and idempotent (safe to run multiple times).
 */

import { SCHEMA_VERSION } from './constants.js';
import {
  CLOUD_DRIVES_TABLE,
  AREA_STORAGE_TABLE,
  ORGANIZATION_RULES_TABLE,
  ORGANIZED_FILES_TABLE,
  SCANNED_FILES_TABLE,
  WATCHED_FOLDERS_TABLE,
  WATCH_ACTIVITY_TABLE,
  SCHEMA_VERSION_TABLE,
} from './tables.js';

// ============================================
// VERSION TRACKING
// ============================================

/**
 * Get current schema version from database.
 * Returns 1 if no version table exists (pre-migration database).
 * @param {Object} db - sql.js database instance
 * @returns {number} Current schema version
 */
export function getSchemaVersion(db) {
  if (!db) {
    throw new Error('Database instance is required');
  }

  try {
    const result = db.exec('SELECT version FROM schema_version LIMIT 1');
    return result[0]?.values[0]?.[0] || 1;
  } catch {
    // Table doesn't exist, this is a pre-migration database
    return 1;
  }
}

/**
 * Set schema version in database.
 * @param {Object} db - sql.js database instance
 * @param {number} version - Version to set
 */
export function setSchemaVersion(db, version) {
  if (!db) {
    throw new Error('Database instance is required');
  }

  db.run('INSERT OR REPLACE INTO schema_version (version) VALUES (?)', [version]);
}

// ============================================
// INDIVIDUAL MIGRATIONS
// ============================================

/**
 * Migration 2: Add cloud drives and schema version tables.
 * @param {Object} db - sql.js database instance
 */
export function migrationV2(db) {
  console.log('[JDex DB] Running migration 2: Adding cloud integration tables...');

  // Create schema_version table
  db.run(SCHEMA_VERSION_TABLE);

  // Create cloud_drives table
  db.run(CLOUD_DRIVES_TABLE);

  // Create index
  db.run('CREATE INDEX IF NOT EXISTS idx_cloud_drives_default ON cloud_drives(is_default)');

  console.log('[JDex DB] Migration 2 complete');
}

/**
 * Migration 3: Add area storage mapping table.
 * @param {Object} db - sql.js database instance
 */
export function migrationV3(db) {
  console.log('[JDex DB] Running migration 3: Adding area_storage table...');

  db.run(AREA_STORAGE_TABLE);

  console.log('[JDex DB] Migration 3 complete');
}

/**
 * Migration 4: Add organization rules table.
 * @param {Object} db - sql.js database instance
 */
export function migrationV4(db) {
  console.log('[JDex DB] Running migration 4: Adding organization_rules table...');

  db.run(ORGANIZATION_RULES_TABLE);

  // Create indexes
  db.run(
    'CREATE INDEX IF NOT EXISTS idx_org_rules_type ON organization_rules(rule_type, is_active)'
  );
  db.run('CREATE INDEX IF NOT EXISTS idx_org_rules_priority ON organization_rules(priority DESC)');

  console.log('[JDex DB] Migration 4 complete');
}

/**
 * Migration 5: Add organized files tracking table.
 * @param {Object} db - sql.js database instance
 */
export function migrationV5(db) {
  console.log('[JDex DB] Running migration 5: Adding organized_files table...');

  db.run(ORGANIZED_FILES_TABLE);

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_organized_files_path ON organized_files(original_path)');
  db.run(
    'CREATE INDEX IF NOT EXISTS idx_organized_files_folder ON organized_files(jd_folder_number)'
  );
  db.run('CREATE INDEX IF NOT EXISTS idx_organized_files_status ON organized_files(status)');

  console.log('[JDex DB] Migration 5 complete');
}

/**
 * Migration 6: Add scanned files table.
 * @param {Object} db - sql.js database instance
 */
export function migrationV6(db) {
  console.log('[JDex DB] Running migration 6: Adding scanned_files table...');

  db.run(SCANNED_FILES_TABLE);

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_scanned_files_session ON scanned_files(scan_session_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_scanned_files_decision ON scanned_files(user_decision)');
  db.run('CREATE INDEX IF NOT EXISTS idx_scanned_files_type ON scanned_files(file_type)');

  console.log('[JDex DB] Migration 6 complete');
}

/**
 * Migration 7: Add watch folders tables.
 * @param {Object} db - sql.js database instance
 */
export function migrationV7(db) {
  console.log('[JDex DB] Running migration 7: Adding watch folders tables...');

  // Watched folders configuration
  db.run(WATCHED_FOLDERS_TABLE);

  // Watch activity log
  db.run(WATCH_ACTIVITY_TABLE);

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_watched_folders_active ON watched_folders(is_active)');
  db.run(
    'CREATE INDEX IF NOT EXISTS idx_watch_activity_folder ON watch_activity(watched_folder_id)'
  );
  db.run('CREATE INDEX IF NOT EXISTS idx_watch_activity_action ON watch_activity(action)');
  db.run(
    'CREATE INDEX IF NOT EXISTS idx_watch_activity_created ON watch_activity(created_at DESC)'
  );

  console.log('[JDex DB] Migration 7 complete');
}

/**
 * Migration 8: Add performance indexes.
 * These indexes improve query performance for common operations:
 * - Category lookups by area (hierarchy navigation)
 * - Organized files lookups by rule (rule statistics)
 * - Watch activity lookups by rule (activity reporting)
 * @param {Object} db - sql.js database instance
 */
export function migrationV8(db) {
  console.log('[JDex DB] Running migration 8: Adding performance indexes...');

  // Index for category-area joins (frequently used in hierarchy navigation)
  db.run('CREATE INDEX IF NOT EXISTS idx_categories_area ON categories(area_id)');

  // Index for organized files by rule (used in rule statistics and reports)
  db.run('CREATE INDEX IF NOT EXISTS idx_organized_files_rule ON organized_files(matched_rule_id)');

  // Index for watch activity by rule (used in activity reporting)
  db.run('CREATE INDEX IF NOT EXISTS idx_watch_activity_rule ON watch_activity(matched_rule_id)');

  console.log('[JDex DB] Migration 8 complete');
}

// ============================================
// MIGRATION REGISTRY
// ============================================

/**
 * Registry of all migrations by version number.
 * Each migration function handles upgrading FROM the previous version TO this version.
 */
export const migrations = Object.freeze({
  2: migrationV2,
  3: migrationV3,
  4: migrationV4,
  5: migrationV5,
  6: migrationV6,
  7: migrationV7,
  8: migrationV8,
});

/**
 * Get list of pending migrations for a given version.
 * @param {number} currentVersion - Current database schema version
 * @returns {number[]} Array of migration version numbers to run
 */
export function getPendingMigrations(currentVersion) {
  const allVersions = Object.keys(migrations)
    .map(Number)
    .sort((a, b) => a - b);

  return allVersions.filter((v) => v > currentVersion && v <= SCHEMA_VERSION);
}

// ============================================
// MIGRATION RUNNER
// ============================================

/**
 * Run all pending migrations to bring database to current schema version.
 * Each migration is idempotent (safe to run multiple times).
 *
 * @param {Object} db - sql.js database instance
 * @param {Function} [saveCallback] - Optional callback to save database after migrations
 * @returns {{ fromVersion: number, toVersion: number, migrationsRun: number[] }}
 */
export function runMigrations(db, saveCallback = null) {
  if (!db) {
    throw new Error('Database instance is required');
  }

  const currentVersion = getSchemaVersion(db);
  console.log(`[JDex DB] Current schema version: ${currentVersion}, target: ${SCHEMA_VERSION}`);

  if (currentVersion >= SCHEMA_VERSION) {
    console.log('[JDex DB] Database is up to date');
    return {
      fromVersion: currentVersion,
      toVersion: currentVersion,
      migrationsRun: [],
    };
  }

  const pendingMigrations = getPendingMigrations(currentVersion);
  const migrationsRun = [];

  for (const version of pendingMigrations) {
    const migrationFn = migrations[version];
    if (migrationFn) {
      migrationFn(db);
      migrationsRun.push(version);
    }
  }

  // Update schema version
  setSchemaVersion(db, SCHEMA_VERSION);

  // Save if callback provided
  if (saveCallback && typeof saveCallback === 'function') {
    saveCallback();
  }

  console.log(`[JDex DB] Migrations complete. Now at version ${SCHEMA_VERSION}`);

  return {
    fromVersion: currentVersion,
    toVersion: SCHEMA_VERSION,
    migrationsRun,
  };
}

/**
 * Check if migrations are needed.
 * @param {Object} db - sql.js database instance
 * @returns {boolean} True if migrations are pending
 */
export function needsMigration(db) {
  const currentVersion = getSchemaVersion(db);
  return currentVersion < SCHEMA_VERSION;
}

/**
 * Get migration status information.
 * @param {Object} db - sql.js database instance
 * @returns {{ currentVersion: number, targetVersion: number, pendingCount: number, pendingVersions: number[] }}
 */
export function getMigrationStatus(db) {
  const currentVersion = getSchemaVersion(db);
  const pendingVersions = getPendingMigrations(currentVersion);

  return {
    currentVersion,
    targetVersion: SCHEMA_VERSION,
    pendingCount: pendingVersions.length,
    pendingVersions,
  };
}
