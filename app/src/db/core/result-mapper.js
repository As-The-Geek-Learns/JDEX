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

/**
 * Map a single row array to an object using column names.
 *
 * @param {any[]} row - Array of values from sql.js
 * @param {string[]} columns - Column names in order
 * @returns {Object} Object with column names as keys
 *
 * @example
 * const row = [1, '10', '19', 'Admin', 'Administrative stuff', '2024-01-01'];
 * const columns = ['id', 'range_start', 'range_end', 'name', 'description', 'created_at'];
 * const obj = mapRow(row, columns);
 * // { id: 1, range_start: '10', range_end: '19', name: 'Admin', ... }
 */
export function mapRow(row, columns) {
  if (!row || !Array.isArray(row)) {
    return null;
  }
  if (!columns || !Array.isArray(columns)) {
    throw new Error('Columns must be an array of column names');
  }

  const obj = {};
  for (let i = 0; i < columns.length; i++) {
    obj[columns[i]] = row[i] !== undefined ? row[i] : null;
  }
  return obj;
}

/**
 * Map all rows from a sql.js result to an array of objects.
 *
 * @param {Object[]} results - sql.js exec() result array
 * @param {string[]} columns - Column names in order
 * @returns {Object[]} Array of mapped objects
 *
 * @example
 * const results = db.exec('SELECT * FROM areas');
 * const areas = mapRows(results, AREA_COLUMNS);
 */
export function mapRows(results, columns) {
  // sql.js returns an array of result sets; for single queries, use [0]
  if (!results || results.length === 0) {
    return [];
  }

  const resultSet = results[0];
  if (!resultSet || !resultSet.values || resultSet.values.length === 0) {
    return [];
  }

  return resultSet.values.map((row) => mapRow(row, columns));
}

/**
 * Map the first row from a sql.js result, or return null if empty.
 *
 * @param {Object[]} results - sql.js exec() result array
 * @param {string[]} columns - Column names in order
 * @returns {Object|null} First mapped object or null
 *
 * @example
 * const results = db.exec('SELECT * FROM areas WHERE id = ?', [1]);
 * const area = mapSingle(results, AREA_COLUMNS);
 */
export function mapSingle(results, columns) {
  const rows = mapRows(results, columns);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get the last inserted row ID.
 *
 * @param {Object} db - sql.js database instance
 * @returns {number} The last inserted row ID
 *
 * @example
 * db.run('INSERT INTO areas (name) VALUES (?)', ['New Area']);
 * const id = getLastInsertId(db);
 */
export function getLastInsertId(db) {
  const result = db.exec('SELECT last_insert_rowid()');
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    throw new Error('Failed to get last insert ID');
  }
  return result[0].values[0][0];
}

/**
 * Get the number of affected rows from the last statement.
 *
 * @param {Object} db - sql.js database instance
 * @returns {number} Number of rows affected
 */
export function getChanges(db) {
  const result = db.exec('SELECT changes()');
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return 0;
  }
  return result[0].values[0][0];
}

/**
 * Check if a query returned any results.
 *
 * @param {Object[]} results - sql.js exec() result array
 * @returns {boolean} True if results exist
 */
export function hasResults(results) {
  return !!(results && results.length > 0 && results[0].values && results[0].values.length > 0);
}

/**
 * Get the count from a COUNT(*) query result.
 *
 * @param {Object[]} results - sql.js exec() result from COUNT query
 * @returns {number} The count value
 *
 * @example
 * const results = db.exec('SELECT COUNT(*) FROM areas');
 * const count = getCount(results); // 5
 */
export function getCount(results) {
  if (!hasResults(results)) {
    return 0;
  }
  return results[0].values[0][0] || 0;
}

/**
 * Get a single scalar value from a query result.
 *
 * @param {Object[]} results - sql.js exec() result array
 * @param {any} defaultValue - Value to return if no results
 * @returns {any} The scalar value or default
 *
 * @example
 * const results = db.exec('SELECT MAX(priority) FROM rules');
 * const maxPriority = getScalar(results, 0);
 */
export function getScalar(results, defaultValue = null) {
  if (!hasResults(results)) {
    return defaultValue;
  }
  const value = results[0].values[0][0];
  return value !== undefined && value !== null ? value : defaultValue;
}

// =============================================================================
// Column Definitions for JDex Tables
// =============================================================================

/**
 * Column definitions for all JDex tables.
 * Use these with mapRows/mapSingle for consistent mapping.
 */
export const COLUMNS = {
  areas: ['id', 'range_start', 'range_end', 'name', 'description', 'created_at', 'updated_at'],

  categories: ['id', 'number', 'area_id', 'name', 'description', 'created_at', 'updated_at'],

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
  ],

  folders: [
    'id',
    'folder_number',
    'category_id',
    'name',
    'description',
    'path',
    'created_at',
    'updated_at',
  ],

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
  ],

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
  ],

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
  ],

  areaStorage: ['area_id', 'cloud_drive_id', 'notes', 'created_at', 'updated_at'],

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
  ],

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
  ],

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
  ],

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
  ],

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
  ],

  activityLog: ['id', 'action', 'entity_type', 'entity_id', 'details', 'created_at'],
};

/**
 * Create a column mapper for a specific table.
 * Returns functions pre-bound to that table's columns.
 *
 * @param {string[]} columns - Column definitions for the table
 * @returns {Object} Object with row/rows/single mapping functions
 *
 * @example
 * const areaMapper = createMapper(COLUMNS.areas);
 * const areas = areaMapper.rows(results);
 * const area = areaMapper.single(results);
 */
export function createMapper(columns) {
  return {
    row: (row) => mapRow(row, columns),
    rows: (results) => mapRows(results, columns),
    single: (results) => mapSingle(results, columns),
    columns,
  };
}

// Pre-built mappers for convenience
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
};
