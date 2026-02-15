/**
 * Database Utilities Repository
 * =============================
 * Low-level database utility functions.
 * Provides direct SQL execution and table inspection.
 */

import { requireDB, saveDatabase } from './utils.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Result of SQL execution.
 */
export type SQLExecutionResult =
  | { success: true; results: unknown[] }
  | { success: false; error: string };

/**
 * Table data result.
 */
export interface TableData {
  columns: string[];
  rows: unknown[][];
}

/**
 * Column schema information.
 */
export interface ColumnSchema {
  cid: number;
  name: string;
  type: string;
  notnull: boolean;
  dflt_value: unknown;
  pk: boolean;
}

/**
 * Database size information.
 */
export interface DatabaseSizeInfo {
  pages: number;
  pageSize: number;
  totalBytes: number;
  totalKB: number;
  totalMB: string;
}

/**
 * Database integrity check result.
 */
export interface IntegrityCheckResult {
  ok: boolean;
  status: string;
}

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
] as const;

export type QueryableTable = (typeof QUERYABLE_TABLES)[number];

// ============================================
// SQL EXECUTION
// ============================================

/**
 * Execute raw SQL (use with caution - for admin/debugging only).
 * This function is intentionally not exported from the main db.js
 * for security reasons - only use in development/admin contexts.
 */
export function executeSQL(sql: string): SQLExecutionResult {
  const db = requireDB();
  try {
    const results = db.exec(sql);
    saveDatabase();
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============================================
// TABLE INSPECTION
// ============================================

/**
 * Get list of all tables in the database.
 */
export function getTables(): string[] {
  const db = requireDB();
  const results = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  return (results[0]?.values?.map((row) => row[0] as string) || []);
}

/**
 * Get all data from a table (with allowlist restriction).
 */
export function getTableData(tableName: string): TableData {
  const db = requireDB();

  if (!QUERYABLE_TABLES.includes(tableName as QueryableTable)) {
    return { columns: [], rows: [] };
  }

  const results = db.exec(`SELECT * FROM ${tableName}`);
  if (!results[0]) return { columns: [], rows: [] };

  return {
    columns: results[0].columns || [],
    rows: results[0].values || [],
  };
}

/**
 * Get table schema information.
 */
export function getTableSchema(tableName: string): ColumnSchema[] {
  const db = requireDB();

  if (!QUERYABLE_TABLES.includes(tableName as QueryableTable)) {
    return [];
  }

  const results = db.exec(`PRAGMA table_info(${tableName})`);
  if (!results[0]?.values) return [];

  return results[0].values.map((row) => ({
    cid: row[0] as number,
    name: row[1] as string,
    type: row[2] as string,
    notnull: row[3] === 1,
    dflt_value: row[4],
    pk: row[5] === 1,
  }));
}

/**
 * Get row count for a table.
 */
export function getTableRowCount(tableName: string): number {
  const db = requireDB();

  if (!QUERYABLE_TABLES.includes(tableName as QueryableTable)) {
    return 0;
  }

  const results = db.exec(`SELECT COUNT(*) FROM ${tableName}`);
  const count = results[0]?.values?.[0]?.[0];
  return typeof count === 'number' ? count : 0;
}

/**
 * Get database file size (approximate, based on page count).
 */
export function getDatabaseSize(): DatabaseSizeInfo {
  const db = requireDB();

  const pageCountResult = db.exec('PRAGMA page_count')[0]?.values?.[0]?.[0];
  const pageSizeResult = db.exec('PRAGMA page_size')[0]?.values?.[0]?.[0];

  const pageCount = typeof pageCountResult === 'number' ? pageCountResult : 0;
  const pageSize = typeof pageSizeResult === 'number' ? pageSizeResult : 4096;

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
export function vacuumDatabase(): void {
  const db = requireDB();
  db.run('VACUUM');
  saveDatabase();
}

/**
 * Check database integrity.
 */
export function checkDatabaseIntegrity(): IntegrityCheckResult {
  const db = requireDB();
  const results = db.exec('PRAGMA integrity_check');
  const status = results[0]?.values?.[0]?.[0];
  const statusStr = typeof status === 'string' ? status : 'unknown';

  return {
    ok: statusStr === 'ok',
    status: statusStr,
  };
}
