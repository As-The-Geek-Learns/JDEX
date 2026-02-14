/**
 * Transaction Manager - Savepoint-based transactions for sql.js
 * ==============================================================
 *
 * sql.js runs in-memory and doesn't have true connection-based transactions.
 * This module uses SAVEPOINTs to provide atomic operation support.
 *
 * IMPORTANT: sql.js is synchronous, so we don't need async/await for DB operations.
 * However, we use async for the callback to support async business logic.
 *
 * @example
 * // Basic transaction
 * const result = await transaction(db, (txn) => {
 *   txn.run('INSERT INTO areas (name) VALUES (?)', ['New Area']);
 *   txn.run('INSERT INTO categories (name, area_id) VALUES (?, ?)', ['Category', 1]);
 *   return 'success';
 * }); // Auto-commits on success, rolls back on error
 *
 * @example
 * // Nested transactions (savepoints)
 * await transaction(db, async (txn) => {
 *   txn.run('INSERT INTO areas (name) VALUES (?)', ['Area 1']);
 *
 *   await transaction(db, (innerTxn) => {
 *     innerTxn.run('INSERT INTO areas (name) VALUES (?)', ['Area 2']);
 *   });
 * });
 */

import { DatabaseError } from '../../utils/errors.js';

// Track active transaction depth for savepoint naming
let transactionDepth = 0;

/**
 * Generate a unique savepoint name.
 * @returns {string} Savepoint name
 */
function generateSavepointName() {
  return `sp_${Date.now()}_${transactionDepth}`;
}

/**
 * Transaction context provided to the callback.
 * Wraps the database with transaction-aware operations.
 */
class TransactionContext {
  constructor(db, savepointName) {
    this._db = db;
    this._savepointName = savepointName;
    this._committed = false;
    this._rolledBack = false;
  }

  /**
   * Execute a SQL statement with parameters.
   * @param {string} sql - SQL statement
   * @param {any[]} params - Parameters for placeholders
   */
  run(sql, params = []) {
    if (this._committed || this._rolledBack) {
      throw new DatabaseError('Transaction already completed', 'transaction');
    }
    this._db.run(sql, params);
  }

  /**
   * Execute a query and return results.
   * @param {string} sql - SQL query
   * @param {any[]} params - Parameters for placeholders
   * @returns {any[]} Query results
   */
  exec(sql, params = []) {
    if (this._committed || this._rolledBack) {
      throw new DatabaseError('Transaction already completed', 'transaction');
    }
    return this._db.exec(sql, params);
  }

  /**
   * Get the underlying database instance.
   * Use with caution - direct operations bypass transaction tracking.
   * @returns {Object} sql.js database instance
   */
  get db() {
    return this._db;
  }

  /**
   * Check if the transaction is still active.
   * @returns {boolean} True if transaction is active
   */
  get isActive() {
    return !this._committed && !this._rolledBack;
  }
}

/**
 * Execute operations within a transaction (savepoint).
 *
 * If the callback succeeds, the savepoint is released (committed).
 * If the callback throws, the savepoint is rolled back.
 *
 * @param {Object} db - sql.js database instance
 * @param {Function} callback - Function receiving TransactionContext
 * @returns {Promise<any>} Result of the callback
 * @throws {DatabaseError} If transaction fails
 *
 * @example
 * await transaction(db, (txn) => {
 *   txn.run('INSERT INTO areas (name) VALUES (?)', ['New Area']);
 *   return getLastInsertId(db);
 * });
 */
export async function transaction(db, callback) {
  if (!db) {
    throw new DatabaseError('Database instance is required', 'transaction');
  }

  const savepointName = generateSavepointName();
  transactionDepth++;

  try {
    // Create savepoint
    db.run(`SAVEPOINT ${savepointName}`);

    const context = new TransactionContext(db, savepointName);

    // Execute the callback (may be async)
    const result = await callback(context);

    // Release savepoint (commit)
    db.run(`RELEASE SAVEPOINT ${savepointName}`);
    context._committed = true;

    return result;
  } catch (error) {
    // Rollback to savepoint
    try {
      db.run(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      // Clean up the savepoint
      db.run(`RELEASE SAVEPOINT ${savepointName}`);
    } catch (rollbackError) {
      // Rollback failed - database may be in inconsistent state
      console.error('[JDex DB] Transaction rollback failed:', rollbackError);
    }

    // Re-throw with context if not already a DatabaseError
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Transaction failed: ${error.message}`, 'transaction');
  } finally {
    transactionDepth--;
  }
}

/**
 * Execute multiple operations in a single transaction.
 * Convenience wrapper for running several statements atomically.
 *
 * @param {Object} db - sql.js database instance
 * @param {Array<{sql: string, params?: any[]}>} operations - Array of SQL operations
 * @returns {Promise<void>}
 *
 * @example
 * await batchTransaction(db, [
 *   { sql: 'INSERT INTO areas (name) VALUES (?)', params: ['Area 1'] },
 *   { sql: 'INSERT INTO areas (name) VALUES (?)', params: ['Area 2'] },
 *   { sql: 'UPDATE areas SET name = ? WHERE id = ?', params: ['Updated', 1] }
 * ]);
 */
export async function batchTransaction(db, operations) {
  if (!Array.isArray(operations) || operations.length === 0) {
    return;
  }

  await transaction(db, (txn) => {
    for (const op of operations) {
      txn.run(op.sql, op.params || []);
    }
  });
}

/**
 * Check if currently inside a transaction.
 * Useful for conditional savepoint creation.
 *
 * @returns {boolean} True if inside a transaction
 */
export function isInTransaction() {
  return transactionDepth > 0;
}

/**
 * Get the current transaction depth.
 * Depth 0 means no active transaction.
 *
 * @returns {number} Current transaction depth
 */
export function getTransactionDepth() {
  return transactionDepth;
}

/**
 * Reset transaction depth (for testing only).
 * Do not use in production code.
 */
export function _resetTransactionDepth() {
  transactionDepth = 0;
}

/**
 * Execute a read-only query outside of any write transaction.
 * This is a hint that the query doesn't modify data.
 *
 * @param {Object} db - sql.js database instance
 * @param {string} sql - SQL query
 * @param {any[]} params - Parameters for placeholders
 * @returns {any[]} Query results
 */
export function readQuery(db, sql, params = []) {
  return db.exec(sql, params);
}

/**
 * Create a transaction-like wrapper for batch inserts with progress tracking.
 *
 * @param {Object} db - sql.js database instance
 * @param {Object} options - Options
 * @param {number} options.batchSize - Number of operations per batch (default: 100)
 * @param {Function} options.onProgress - Progress callback (completed, total)
 * @returns {Object} Batch inserter with add() and commit() methods
 *
 * @example
 * const batch = createBatchInserter(db, {
 *   batchSize: 50,
 *   onProgress: (done, total) => console.log(`${done}/${total}`)
 * });
 *
 * for (const item of items) {
 *   batch.add('INSERT INTO items (name) VALUES (?)', [item.name]);
 * }
 *
 * await batch.commit();
 */
export function createBatchInserter(db, options = {}) {
  const { batchSize = 100, onProgress = null } = options;

  const operations = [];
  let committed = false;

  return {
    /**
     * Add an operation to the batch.
     * @param {string} sql - SQL statement
     * @param {any[]} params - Parameters
     */
    add(sql, params = []) {
      if (committed) {
        throw new DatabaseError('Batch already committed', 'batch');
      }
      operations.push({ sql, params });
    },

    /**
     * Get the number of pending operations.
     * @returns {number} Operation count
     */
    get size() {
      return operations.length;
    },

    /**
     * Commit all operations in batches.
     * @returns {Promise<number>} Number of operations executed
     */
    async commit() {
      if (committed) {
        throw new DatabaseError('Batch already committed', 'batch');
      }
      committed = true;

      const total = operations.length;
      let completed = 0;

      // Process in batches
      for (let i = 0; i < total; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);

        await transaction(db, (txn) => {
          for (const op of batch) {
            txn.run(op.sql, op.params);
          }
        });

        completed += batch.length;
        if (onProgress) {
          onProgress(completed, total);
        }
      }

      return total;
    },

    /**
     * Discard all pending operations.
     */
    discard() {
      operations.length = 0;
      committed = true;
    },
  };
}
