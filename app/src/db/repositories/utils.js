/**
 * Repository Utilities
 * ====================
 * Shared utilities for all repository modules.
 * Re-exports database accessors and provides common validation helpers.
 */

import { getDB, saveDatabase as coreSaveDatabase } from '../core/database.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// RE-EXPORTS FROM CORE
// ============================================

export { getDB };

/**
 * Save the database to localStorage.
 * Wrapper around core saveDatabase for consistency.
 */
export function saveDatabase() {
  coreSaveDatabase();
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate a positive integer value.
 * @param {unknown} value - Value to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {number} Validated positive integer
 * @throws {DatabaseError} If value is not a positive integer
 */
export function validatePositiveInteger(value, fieldName) {
  if (value === null || value === undefined) {
    throw new DatabaseError(`${fieldName} is required`, 'query');
  }

  const num = typeof value === 'string' ? parseInt(value, 10) : value;

  if (typeof num !== 'number' || !Number.isFinite(num) || num < 1 || !Number.isInteger(num)) {
    throw new DatabaseError(`${fieldName} must be a positive whole number`, 'query');
  }

  return num;
}

/**
 * Build a dynamic UPDATE query from an updates object.
 * Only includes columns that are in the allowlist and have defined values.
 * @param {string} table - Table name
 * @param {Object} updates - Key-value pairs of updates
 * @param {string[]} validColumns - Allowed column names
 * @param {Object} options - Additional options
 * @param {Object} options.transformers - Column value transformers (e.g., { is_encrypted: v => v ? 1 : 0 })
 * @returns {{ sql: string, values: any[] } | null} Query object or null if no valid updates
 */
export function buildUpdateQuery(table, updates, validColumns, options = {}) {
  const { transformers = {} } = options;
  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (validColumns.includes(key) && value !== undefined) {
      fields.push(`${key} = ?`);
      const transformer = transformers[key];
      values.push(transformer ? transformer(value) : value);
    }
  });

  if (fields.length === 0) {
    return null;
  }

  return {
    sql: `UPDATE ${table} SET ${fields.join(', ')} WHERE id = ?`,
    values,
  };
}

/**
 * Map raw database row to object using column definitions.
 * @param {Array} row - Database row array
 * @param {string[]} columns - Column names in order
 * @returns {Object} Mapped object
 */
export function mapRowToObject(row, columns) {
  const obj = {};
  columns.forEach((col, index) => {
    obj[col] = row[index];
  });
  return obj;
}

/**
 * Map database results to array of objects.
 * @param {Array} results - Database exec results
 * @param {string[]} columns - Column names in order
 * @returns {Array} Array of mapped objects
 */
export function mapResults(results, columns) {
  return results?.[0]?.values.map((row) => mapRowToObject(row, columns)) || [];
}

/**
 * Get the last inserted row ID.
 * @returns {number} The last insert rowid
 */
export function getLastInsertId() {
  const db = getDB();
  return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
}
