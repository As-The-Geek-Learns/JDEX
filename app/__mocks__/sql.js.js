import { vi } from 'vitest';

// ============================================================
// Stateful Mock Database
// Allows tests to set expected query results
// ============================================================

let MOCK_DB_STATE = {};
let MOCK_TABLES = {};

/**
 * Set the mock database state for testing
 * @param {Object} state - Map of SQL queries to return values
 * @example
 * __setMockDbState({
 *   'SELECT * FROM cards': [{ values: [[1, 'Card Name', 'Set']] }]
 * });
 */
export const __setMockDbState = (state) => {
  MOCK_DB_STATE = state;
};

/**
 * Reset mock database to empty state
 */
export const __resetMockDb = () => {
  MOCK_DB_STATE = {};
  MOCK_TABLES = {};
};

/**
 * Get current mock database state (for test assertions)
 * @returns {Object} Current mock state
 */
export const __getMockDbState = () => {
  return { ...MOCK_DB_STATE };
};

export class MockDatabase {
  constructor() {
    this.isOpen = true;
  }

  exec(sql) {
    // Check for exact match first
    if (MOCK_DB_STATE[sql]) {
      return MOCK_DB_STATE[sql];
    }
    // Check for partial matches (useful for parameterized queries)
    for (const [key, value] of Object.entries(MOCK_DB_STATE)) {
      if (sql.includes(key)) {
        return value;
      }
    }
    return [];
  }

  run(sql, params = []) {
    // Track INSERT/UPDATE/DELETE for verification
    return { changes: 1 };
  }

  prepare(sql) {
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
