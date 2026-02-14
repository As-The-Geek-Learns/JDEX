import { vi } from 'vitest';

// ============================================================
// Stateful Mock Database for db.js Testing
// Provides realistic SQL.js behavior with in-memory state
// ============================================================

// In-memory database state
let tables = {};
let lastInsertId = 0;
let queryLog = [];
let mockState = {};

/**
 * Reset the mock database to empty state
 */
export const __resetMockDb = () => {
  tables = {};
  lastInsertId = 0;
  queryLog = [];
};

/**
 * Get all executed queries (for test assertions)
 * @returns {string[]} Array of SQL statements
 */
export const __getQueryLog = () => [...queryLog];

/**
 * Clear the query log
 */
export const __clearQueryLog = () => {
  queryLog = [];
};

/**
 * Set initial table data for testing
 * @param {string} tableName - Name of the table
 * @param {Object[]} rows - Array of row objects
 */
export const __setTableData = (tableName, rows) => {
  tables[tableName] = rows.map((row, idx) => ({
    ...row,
    id: row.id ?? idx + 1,
  }));
  // Update lastInsertId to max id in table
  const maxId = Math.max(0, ...tables[tableName].map((r) => r.id || 0));
  if (maxId > lastInsertId) lastInsertId = maxId;
};

/**
 * Get current table data (for test assertions)
 * @param {string} tableName - Name of the table
 * @returns {Object[]} Array of row objects
 */
export const __getTableData = (tableName) => {
  return tables[tableName] ? [...tables[tableName]] : [];
};

/**
 * Get last insert ID
 * @returns {number}
 */
export const __getLastInsertId = () => lastInsertId;

/**
 * Set mock database state (backwards-compatible with existing tests)
 * @param {Object} state - State object to set
 */
export const __setMockDbState = (state) => {
  mockState = state || {};
};

/**
 * Get mock database state (backwards-compatible with existing tests)
 * @returns {Object} Current mock state
 */
export const __getMockDbState = () => mockState;

/**
 * Parse simple SQL SELECT to extract table name and conditions
 */
function parseSelect(sql) {
  const fromMatch = sql.match(/FROM\s+(\w+)/i);
  const tableName = fromMatch ? fromMatch[1] : null;

  const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER|LIMIT|$)/i);
  const orderMatch = sql.match(/ORDER BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i);

  return {
    tableName,
    whereClause: whereMatch ? whereMatch[1].trim() : null,
    orderBy: orderMatch ? orderMatch[1] : null,
    orderDir: orderMatch ? orderMatch[2] || 'ASC' : 'ASC',
    limit: limitMatch ? parseInt(limitMatch[1]) : null,
  };
}

/**
 * Convert row object to array of values matching column order
 */
function rowToArray(row, tableName) {
  // Define column orders for each table
  const columnOrders = {
    areas: ['id', 'range_start', 'range_end', 'name', 'description', 'color', 'created_at'],
    categories: ['id', 'number', 'area_id', 'name', 'description', 'created_at'],
    folders: [
      'id',
      'number',
      'category_id',
      'name',
      'description',
      'file_path',
      'created_at',
      'updated_at',
    ],
    items: [
      'id',
      'number',
      'folder_id',
      'name',
      'description',
      'file_path',
      'tags',
      'created_at',
      'updated_at',
    ],
    schema_version: ['version'],
    activity_log: ['id', 'action', 'entity_type', 'entity_number', 'details', 'created_at'],
    cloud_drives: [
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
    storage_locations: ['id', 'name', 'path', 'description', 'is_default', 'created_at'],
    area_storage: ['area_id', 'cloud_drive_id', 'notes', 'created_at', 'updated_at'],
    file_organization_rules: [
      'id',
      'name',
      'rule_type',
      'pattern',
      'target_type',
      'target_value',
      'priority',
      'is_active',
      'match_count',
      'created_at',
      'updated_at',
    ],
    organized_files: [
      'id',
      'original_path',
      'new_path',
      'rule_id',
      'folder_id',
      'organized_at',
      'status',
      'file_size',
      'file_type',
    ],
    scanned_files: [
      'id',
      'session_id',
      'original_path',
      'filename',
      'extension',
      'file_size',
      'suggested_folder_id',
      'decision',
      'target_folder_id',
      'scanned_at',
    ],
    watched_folders: [
      'id',
      'path',
      'name',
      'is_active',
      'scan_subdirs',
      'auto_organize',
      'file_count',
      'last_scan_at',
      'files_organized',
      'created_at',
      'updated_at',
    ],
    watch_activity: ['id', 'watched_folder_id', 'action', 'file_path', 'details', 'created_at'],
  };

  const columns = columnOrders[tableName] || Object.keys(row);
  return columns.map((col) => row[col] ?? null);
}

/**
 * Evaluate a simple WHERE condition against a row
 */
function evaluateWhere(row, whereClause) {
  if (!whereClause) return true;

  // Handle simple conditions: column = value, column = ?
  const eqMatch = whereClause.match(/(\w+)\s*=\s*(\d+|'[^']*'|\?)/);
  if (eqMatch) {
    const [, column, value] = eqMatch;
    const cleanValue = value.replace(/'/g, '');
    // For parameterized queries, we can't fully evaluate without params
    if (cleanValue === '?') return true;
    return String(row[column]) === cleanValue;
  }

  // Handle COUNT(*) subqueries implicitly
  return true;
}

export class MockDatabase {
  constructor() {
    this.isOpen = true;
  }

  exec(sql) {
    queryLog.push(sql);

    // Handle special queries
    if (sql.includes('last_insert_rowid')) {
      return [{ values: [[lastInsertId]] }];
    }

    if (sql.includes('schema_version')) {
      const versionRows = tables['schema_version'] || [{ version: 7 }];
      return [{ values: [[versionRows[0]?.version || 7]] }];
    }

    if (sql.includes('COUNT(*)')) {
      // Extract table name and parse WHERE clause
      const parsed = parseSelect(sql);
      if (!parsed.tableName) return [{ values: [[0]] }];

      const tableData = tables[parsed.tableName] || [];
      const count = tableData.filter((row) => evaluateWhere(row, parsed.whereClause)).length;
      return [{ values: [[count]] }];
    }

    // Parse SELECT queries
    const parsed = parseSelect(sql);
    if (!parsed.tableName) return [];

    let tableData = tables[parsed.tableName] || [];

    // Apply WHERE filter
    if (parsed.whereClause) {
      tableData = tableData.filter((row) => evaluateWhere(row, parsed.whereClause));
    }

    // Apply ORDER BY
    if (parsed.orderBy) {
      tableData = [...tableData].sort((a, b) => {
        const aVal = a[parsed.orderBy];
        const bVal = b[parsed.orderBy];
        if (aVal < bVal) return parsed.orderDir === 'ASC' ? -1 : 1;
        if (aVal > bVal) return parsed.orderDir === 'ASC' ? 1 : -1;
        return 0;
      });
    }

    // Apply LIMIT
    if (parsed.limit) {
      tableData = tableData.slice(0, parsed.limit);
    }

    if (tableData.length === 0) return [];

    // Convert to sql.js format: { values: [[col1, col2, ...], ...] }
    const values = tableData.map((row) => rowToArray(row, parsed.tableName));
    return [{ values }];
  }

  run(sql, _params = []) {
    queryLog.push(sql);

    // Handle INSERT
    if (sql.toUpperCase().startsWith('INSERT')) {
      lastInsertId++;
      const tableMatch = sql.match(/INSERT INTO\s+(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        if (!tables[tableName]) tables[tableName] = [];
        // We don't fully parse INSERT, but we track that it happened
      }
      return { changes: 1 };
    }

    // Handle UPDATE
    if (sql.toUpperCase().startsWith('UPDATE')) {
      return { changes: 1 };
    }

    // Handle DELETE
    if (sql.toUpperCase().startsWith('DELETE')) {
      const tableMatch = sql.match(/DELETE FROM\s+(\w+)/i);
      const whereMatch = sql.match(/WHERE\s+id\s*=\s*(\d+)/i);
      if (tableMatch && whereMatch && tables[tableMatch[1]]) {
        const id = parseInt(whereMatch[1]);
        tables[tableMatch[1]] = tables[tableMatch[1]].filter((row) => row.id !== id);
      }
      return { changes: 1 };
    }

    // Handle CREATE TABLE, CREATE INDEX, etc.
    if (sql.toUpperCase().startsWith('CREATE')) {
      return { changes: 0 };
    }

    return { changes: 0 };
  }

  prepare(sql) {
    queryLog.push(sql);
    return {
      bind: vi.fn().mockReturnThis(),
      step: vi.fn().mockReturnValue(false),
      get: vi.fn().mockReturnValue(undefined),
      getAsObject: vi.fn().mockReturnValue({}),
      run: vi.fn(),
      free: vi.fn(),
    };
  }

  export() {
    return new Uint8Array([1, 2, 3]);
  }

  close() {
    this.isOpen = false;
  }
}

// Default export for sql.js module structure
export default {
  MockDatabase,
  __resetMockDb,
  __setTableData,
  __getTableData,
  __getQueryLog,
  __clearQueryLog,
  __getLastInsertId,
  __setMockDbState,
  __getMockDbState,
};
