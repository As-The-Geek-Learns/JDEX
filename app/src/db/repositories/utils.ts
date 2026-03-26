/**
 * Repository Utilities
 * ====================
 * Shared utilities for all repository modules.
 * Re-exports database accessors and provides common validation helpers.
 */

import {
  getDB,
  saveDatabase as coreSaveDatabase,
  SqlJsDatabase,
  SqlJsStatement,
} from '../core/database.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Result of building an update query.
 */
export interface UpdateQueryResult {
  sql: string;
  values: unknown[];
}

/**
 * Column value transformer function.
 */
export type ColumnTransformer = (value: unknown) => unknown;

/**
 * Map of column names to transformer functions.
 */
export type ColumnTransformers = Record<string, ColumnTransformer>;

/**
 * Options for building update queries.
 */
export interface UpdateQueryOptions {
  transformers?: ColumnTransformers;
}

/**
 * Generic row object from database mapping.
 */
export type RowObject = Record<string, unknown>;

/**
 * Database query result structure.
 */
export interface QueryResult {
  columns?: string[];
  values?: unknown[][];
}

// ============================================
// RE-EXPORTS FROM CORE
// ============================================

export { getDB };
export type { SqlJsDatabase, SqlJsStatement };

/**
 * Get the database instance, throwing if not initialized.
 * Use this in repository functions where the database must exist.
 */
export function requireDB(): SqlJsDatabase {
  const db = getDB();
  if (!db) {
    throw new DatabaseError('Database not initialized', 'connect');
  }
  return db;
}

/**
 * Save the database to localStorage.
 * Wrapper around core saveDatabase for consistency.
 */
export function saveDatabase(): void {
  coreSaveDatabase();
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate a positive integer value.
 * @throws {DatabaseError} If value is not a positive integer
 */
export function validatePositiveInteger(value: unknown, fieldName: string): number {
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
 */
export function buildUpdateQuery<T extends object>(
  table: string,
  updates: T,
  validColumns: readonly string[],
  options: UpdateQueryOptions = {}
): UpdateQueryResult | null {
  const { transformers = {} } = options;
  const fields: string[] = [];
  const values: unknown[] = [];

  Object.entries(updates as Record<string, unknown>).forEach(([key, value]) => {
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
 */
export function mapRowToObject(row: unknown[], columns: readonly string[]): RowObject {
  const obj: RowObject = {};
  columns.forEach((col, index) => {
    obj[col] = row[index];
  });
  return obj;
}

/**
 * Map database results to array of objects.
 * Use the generic parameter T to cast to specific entity types.
 */
export function mapResults<T = RowObject>(
  results: QueryResult[] | undefined,
  columns: readonly string[]
): T[] {
  return (results?.[0]?.values?.map((row) => mapRowToObject(row, columns)) || []) as T[];
}

/**
 * Get the last inserted row ID.
 */
export function getLastInsertId(): number {
  const db = requireDB();
  const result = db.exec('SELECT last_insert_rowid()');
  const id = result[0]?.values?.[0]?.[0];
  return typeof id === 'number' ? id : 0;
}
