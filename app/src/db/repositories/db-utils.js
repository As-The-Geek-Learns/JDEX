/**
 * Database Utilities Repository
 * =============================
 * Low-level database utility functions.
 * Provides direct SQL execution and table inspection.
 */

import { getDB, saveDatabase } from './utils.js';

// ============================================
// CONSTANTS
// ============================================

/**
 * Tables that are safe to query directly via getTableData.
 * This allowlist prevents arbitrary table access.
 */
export const QUERYABLE_TABLES = [
  'areas',
  'categories',
  'folders',
  'items',
  'storage_locations',
  'activity_log',
  'organization_rules',
  'cloud_drives',
  'watched_folders',
  'watch_activity',
  'scanned_files',
  'organized_files',
  'area_storage',
];

// ============================================
// SQL EXECUTION
// ============================================

/**
 * Execute raw SQL (use with caution - for admin/debugging only).
 * This function is intentionally not exported from the main db.js
 * for security reasons - only use in development/admin contexts.
 *
 * @param {string} sql - The SQL to execute
 * @returns {Object} Result object with success flag and results or error
 */
export function executeSQL(sql) {
  const db = getDB();
  try {
    const results = db.exec(sql);
    saveDatabase();
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// TABLE INSPECTION
// ============================================

/**
 * Get list of all tables in the database.
 *
 * @returns {Array<string>} Array of table names
 */
export function getTables() {
  const db = getDB();
  const results = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  return results[0]?.values.map((row) => row[0]) || [];
}

/**
 * Get all data from a table (with allowlist restriction).
 *
 * @param {string} tableName - The table name (must be in QUERYABLE_TABLES)
 * @returns {Object} Object with columns and rows arrays
 */
export function getTableData(tableName) {
  const db = getDB();

  if (!QUERYABLE_TABLES.includes(tableName)) {
    return { columns: [], rows: [] };
  }

  const results = db.exec(`SELECT * FROM ${tableName}`);
  if (!results[0]) return { columns: [], rows: [] };

  return {
    columns: results[0].columns,
    rows: results[0].values,
  };
}

/**
 * Get table schema information.
 *
 * @param {string} tableName - The table name (must be in QUERYABLE_TABLES)
 * @returns {Array} Array of column info objects
 */
export function getTableSchema(tableName) {
  const db = getDB();

  if (!QUERYABLE_TABLES.includes(tableName)) {
    return [];
  }

  const results = db.exec(`PRAGMA table_info(${tableName})`);
  if (!results[0]) return [];

  return results[0].values.map((row) => ({
    cid: row[0],
    name: row[1],
    type: row[2],
    notnull: row[3] === 1,
    dflt_value: row[4],
    pk: row[5] === 1,
  }));
}

/**
 * Get row count for a table.
 *
 * @param {string} tableName - The table name (must be in QUERYABLE_TABLES)
 * @returns {number} Number of rows
 */
export function getTableRowCount(tableName) {
  const db = getDB();

  if (!QUERYABLE_TABLES.includes(tableName)) {
    return 0;
  }

  const results = db.exec(`SELECT COUNT(*) FROM ${tableName}`);
  return results[0]?.values[0]?.[0] || 0;
}

/**
 * Get database file size (approximate, based on page count).
 *
 * @returns {Object} Size info object
 */
export function getDatabaseSize() {
  const db = getDB();

  const pageCount = db.exec('PRAGMA page_count')[0]?.values[0]?.[0] || 0;
  const pageSize = db.exec('PRAGMA page_size')[0]?.values[0]?.[0] || 4096;

  const totalBytes = pageCount * pageSize;

  return {
    pages: pageCount,
    pageSize,
    totalBytes,
    totalKB: Math.round(totalBytes / 1024),
    totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
  };
}

/**
 * Run VACUUM to optimize the database.
 * This reclaims unused space and defragments.
 */
export function vacuumDatabase() {
  const db = getDB();
  db.run('VACUUM');
  saveDatabase();
}

/**
 * Check database integrity.
 *
 * @returns {Object} Integrity check result
 */
export function checkDatabaseIntegrity() {
  const db = getDB();
  const results = db.exec('PRAGMA integrity_check');
  const status = results[0]?.values[0]?.[0] || 'unknown';

  return {
    ok: status === 'ok',
    status,
  };
}
