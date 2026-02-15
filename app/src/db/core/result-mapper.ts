/**
 * ResultMapper - Column-based row-to-object mapping for sql.js results
 * =====================================================================
 *
 * sql.js returns results as arrays of arrays. This module provides
 * utilities to map those arrays to objects using column definitions.
 *
 * @example
 * // Define columns once
 * const AREA_COLUMNS = ['id', 'range_start', 'range_end', 'name', 'description', 'created_at'];
 *
 * // Map results
 * const results = db.exec('SELECT * FROM areas');
 * const areas = mapRows(results, AREA_COLUMNS);
 * // [{ id: 1, range_start: '10', range_end: '19', name: 'Admin', ... }]
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * A single row from sql.js (array of values)
 */
export type SqlJsRow = unknown[];

/**
 * A result set from sql.js exec()
 */
export interface SqlJsResultSet {
  columns?: string[];
  values?: SqlJsRow[];
}

/**
 * The full result from sql.js exec() (array of result sets)
 */
export type SqlJsExecResult = SqlJsResultSet[];

/**
 * A mapped row object (column names as keys)
 */
export type MappedRow<T extends string = string> = Record<T, unknown>;

/**
 * sql.js database interface (minimal for result mapping)
 */
export interface SqlJsDatabase {
  exec(sql: string, params?: unknown[]): SqlJsExecResult;
}

/**
 * Column mapper interface
 */
export interface ColumnMapper<T extends readonly string[]> {
  row: (row: SqlJsRow) => MappedRow<T[number]> | null;
  rows: (results: SqlJsExecResult) => MappedRow<T[number]>[];
  single: (results: SqlJsExecResult) => MappedRow<T[number]> | null;
  columns: T;
}

// ============================================
// MAPPING FUNCTIONS
// ============================================

/**
 * Map a single row array to an object using column names.
 *
 * @example
 * const row = [1, '10', '19', 'Admin', 'Administrative stuff', '2024-01-01'];
 * const columns = ['id', 'range_start', 'range_end', 'name', 'description', 'created_at'];
 * const obj = mapRow(row, columns);
 * // { id: 1, range_start: '10', range_end: '19', name: 'Admin', ... }
 */
export function mapRow<T extends string>(
  row: SqlJsRow | null | undefined,
  columns: readonly T[]
): MappedRow<T> | null {
  if (!row || !Array.isArray(row)) {
    return null;
  }
  if (!columns || !Array.isArray(columns)) {
    throw new Error('Columns must be an array of column names');
  }

  const obj: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) {
    obj[columns[i]] = row[i] !== undefined ? row[i] : null;
  }
  return obj as MappedRow<T>;
}

/**
 * Map all rows from a sql.js result to an array of objects.
 *
 * @example
 * const results = db.exec('SELECT * FROM areas');
 * const areas = mapRows(results, AREA_COLUMNS);
 */
export function mapRows<T extends string>(
  results: SqlJsExecResult | null | undefined,
  columns: readonly T[]
): MappedRow<T>[] {
  // sql.js returns an array of result sets; for single queries, use [0]
  if (!results || results.length === 0) {
    return [];
  }

  const resultSet = results[0];
  if (!resultSet || !resultSet.values || resultSet.values.length === 0) {
    return [];
  }

  return resultSet.values
    .map((row) => mapRow(row, columns))
    .filter((r): r is MappedRow<T> => r !== null);
}

/**
 * Map the first row from a sql.js result, or return null if empty.
 *
 * @example
 * const results = db.exec('SELECT * FROM areas WHERE id = ?', [1]);
 * const area = mapSingle(results, AREA_COLUMNS);
 */
export function mapSingle<T extends string>(
  results: SqlJsExecResult | null | undefined,
  columns: readonly T[]
): MappedRow<T> | null {
  const rows = mapRows(results, columns);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get the last inserted row ID.
 *
 * @example
 * db.run('INSERT INTO areas (name) VALUES (?)', ['New Area']);
 * const id = getLastInsertId(db);
 */
export function getLastInsertId(db: SqlJsDatabase): number {
  const result = db.exec('SELECT last_insert_rowid()');
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    throw new Error('Failed to get last insert ID');
  }
  return result[0].values[0][0] as number;
}

/**
 * Get the number of affected rows from the last statement.
 */
export function getChanges(db: SqlJsDatabase): number {
  const result = db.exec('SELECT changes()');
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return 0;
  }
  return result[0].values[0][0] as number;
}

/**
 * Check if a query returned any results.
 */
export function hasResults(results: SqlJsExecResult | null | undefined): boolean {
  return !!(results && results.length > 0 && results[0].values && results[0].values.length > 0);
}

/**
 * Get the count from a COUNT(*) query result.
 *
 * @example
 * const results = db.exec('SELECT COUNT(*) FROM areas');
 * const count = getCount(results); // 5
 */
export function getCount(results: SqlJsExecResult | null | undefined): number {
  if (!hasResults(results)) {
    return 0;
  }
  return (results![0].values![0][0] as number) || 0;
}

/**
 * Get a single scalar value from a query result.
 *
 * @example
 * const results = db.exec('SELECT MAX(priority) FROM rules');
 * const maxPriority = getScalar(results, 0);
 */
export function getScalar<T = unknown>(
  results: SqlJsExecResult | null | undefined,
  defaultValue: T | null = null
): T | null {
  if (!hasResults(results)) {
    return defaultValue;
  }
  const value = results![0].values![0][0];
  return value !== undefined && value !== null ? (value as T) : defaultValue;
}

// =============================================================================
// Column Definitions for JDex Tables
// =============================================================================

/**
 * Column definitions for all JDex tables.
 * Use these with mapRows/mapSingle for consistent mapping.
 */
export const COLUMNS = {
  areas: [
    'id',
    'range_start',
    'range_end',
    'name',
    'description',
    'created_at',
    'updated_at',
  ] as const,

  categories: [
    'id',
    'number',
    'area_id',
    'name',
    'description',
    'created_at',
    'updated_at',
  ] as const,

  // Extended with area info for joined queries
  categoriesWithArea: [
    'id',
    'number',
    'area_id',
    'name',
    'description',
    'created_at',
    'updated_at',
    'area_name',
    'area_range',
  ] as const,

  folders: [
    'id',
    'folder_number',
    'category_id',
    'name',
    'description',
    'path',
    'created_at',
    'updated_at',
  ] as const,

  // Extended with category/area info for joined queries
  foldersWithHierarchy: [
    'id',
    'folder_number',
    'category_id',
    'name',
    'description',
    'path',
    'created_at',
    'updated_at',
    'category_name',
    'category_number',
    'area_name',
    'area_range',
  ] as const,

  items: [
    'id',
    'item_number',
    'folder_id',
    'name',
    'description',
    'file_path',
    'item_type',
    'created_at',
    'updated_at',
  ] as const,

  cloudDrives: [
    'id',
    'name',
    'base_path',
    'jd_root_path',
    'is_default',
    'is_active',
    'drive_type',
    'created_at',
    'updated_at',
  ] as const,

  areaStorage: ['area_id', 'cloud_drive_id', 'notes', 'created_at', 'updated_at'] as const,

  organizationRules: [
    'id',
    'name',
    'rule_type',
    'pattern',
    'target_type',
    'target_id',
    'priority',
    'is_active',
    'match_count',
    'notes',
    'created_at',
    'updated_at',
  ] as const,

  organizedFiles: [
    'id',
    'filename',
    'original_path',
    'current_path',
    'jd_folder_number',
    'jd_item_id',
    'file_extension',
    'file_type',
    'file_size',
    'rule_id',
    'organized_by',
    'status',
    'notes',
    'created_at',
    'updated_at',
  ] as const,

  scannedFiles: [
    'id',
    'scan_session_id',
    'filename',
    'original_path',
    'file_extension',
    'file_type',
    'file_size',
    'matched_rule_id',
    'suggested_folder',
    'user_decision',
    'final_folder',
    'confidence_score',
    'scanned_at',
    'decided_at',
  ] as const,

  watchedFolders: [
    'id',
    'folder_path',
    'name',
    'watch_mode',
    'file_pattern',
    'target_type',
    'target_id',
    'is_active',
    'last_scan',
    'created_at',
    'updated_at',
  ] as const,

  watchActivity: [
    'id',
    'watched_folder_id',
    'action',
    'source_path',
    'destination_path',
    'filename',
    'status',
    'error_message',
    'created_at',
  ] as const,

  activityLog: ['id', 'action', 'entity_type', 'entity_id', 'details', 'created_at'] as const,
} as const;

/**
 * Type for COLUMNS keys
 */
export type ColumnTableName = keyof typeof COLUMNS;

/**
 * Create a column mapper for a specific table.
 * Returns functions pre-bound to that table's columns.
 *
 * @example
 * const areaMapper = createMapper(COLUMNS.areas);
 * const areas = areaMapper.rows(results);
 * const area = areaMapper.single(results);
 */
export function createMapper<T extends readonly string[]>(columns: T): ColumnMapper<T> {
  return {
    row: (row: SqlJsRow) => mapRow(row, columns),
    rows: (results: SqlJsExecResult) => mapRows(results, columns),
    single: (results: SqlJsExecResult) => mapSingle(results, columns),
    columns,
  };
}

/**
 * Pre-built mappers for convenience
 */
export const mappers = {
  areas: createMapper(COLUMNS.areas),
  categories: createMapper(COLUMNS.categories),
  categoriesWithArea: createMapper(COLUMNS.categoriesWithArea),
  folders: createMapper(COLUMNS.folders),
  foldersWithHierarchy: createMapper(COLUMNS.foldersWithHierarchy),
  items: createMapper(COLUMNS.items),
  cloudDrives: createMapper(COLUMNS.cloudDrives),
  areaStorage: createMapper(COLUMNS.areaStorage),
  organizationRules: createMapper(COLUMNS.organizationRules),
  organizedFiles: createMapper(COLUMNS.organizedFiles),
  scannedFiles: createMapper(COLUMNS.scannedFiles),
  watchedFolders: createMapper(COLUMNS.watchedFolders),
  watchActivity: createMapper(COLUMNS.watchActivity),
  activityLog: createMapper(COLUMNS.activityLog),
} as const;

/**
 * Type for mappers keys
 */
export type MapperName = keyof typeof mappers;
