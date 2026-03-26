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

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * sql.js database interface (minimal for transactions)
 */
export interface SqlJsDatabase {
  run(sql: string, params?: unknown[]): void;
  exec(sql: string, params?: unknown[]): unknown[];
}

/**
 * A single batch operation (SQL + params)
 */
export interface BatchOperation {
  sql: string;
  params?: unknown[];
}

/**
 * Options for batch inserter
 */
export interface BatchInserterOptions {
  batchSize?: number;
  onProgress?: ((completed: number, total: number) => void) | null;
}

/**
 * Batch inserter interface
 */
export interface BatchInserter {
  add(sql: string, params?: unknown[]): void;
  readonly size: number;
  commit(): Promise<number>;
  discard(): void;
}

/**
 * Transaction callback type
 */
export type TransactionCallback<T> = (context: TransactionContext) => T | Promise<T>;

// ============================================
// MODULE STATE
// ============================================

/**
 * Track active transaction depth for savepoint naming
 */
let transactionDepth = 0;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique savepoint name.
 */
function generateSavepointName(): string {
  return `sp_${Date.now()}_${transactionDepth}`;
}

// ============================================
// TRANSACTION CONTEXT CLASS
// ============================================

/**
 * Transaction context provided to the callback.
 * Wraps the database with transaction-aware operations.
 */
export class TransactionContext {
  private _db: SqlJsDatabase;
  private _committed: boolean = false;
  private _rolledBack: boolean = false;

  constructor(db: SqlJsDatabase, _savepointName: string) {
    this._db = db;
    // Note: savepointName is managed by the transaction() function, not stored here
  }

  /**
   * Execute a SQL statement with parameters.
   */
  run(sql: string, params: unknown[] = []): void {
    if (this._committed || this._rolledBack) {
      throw new DatabaseError('Transaction already completed', 'transaction');
    }
    this._db.run(sql, params);
  }

  /**
   * Execute a query and return results.
   */
  exec(sql: string, params: unknown[] = []): unknown[] {
    if (this._committed || this._rolledBack) {
      throw new DatabaseError('Transaction already completed', 'transaction');
    }
    return this._db.exec(sql, params);
  }

  /**
   * Get the underlying database instance.
   * Use with caution - direct operations bypass transaction tracking.
   */
  get db(): SqlJsDatabase {
    return this._db;
  }

  /**
   * Check if the transaction is still active.
   */
  get isActive(): boolean {
    return !this._committed && !this._rolledBack;
  }

  /**
   * Mark transaction as committed (internal use)
   */
  _markCommitted(): void {
    this._committed = true;
  }

  /**
   * Mark transaction as rolled back (internal use)
   */
  _markRolledBack(): void {
    this._rolledBack = true;
  }
}

// ============================================
// TRANSACTION FUNCTIONS
// ============================================

/**
 * Execute operations within a transaction (savepoint).
 *
 * If the callback succeeds, the savepoint is released (committed).
 * If the callback throws, the savepoint is rolled back.
 *
 * @example
 * await transaction(db, (txn) => {
 *   txn.run('INSERT INTO areas (name) VALUES (?)', ['New Area']);
 *   return getLastInsertId(db);
 * });
 */
export async function transaction<T>(
  db: SqlJsDatabase,
  callback: TransactionCallback<T>
): Promise<T> {
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
    context._markCommitted();

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
    throw new DatabaseError(
      `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
      'transaction'
    );
  } finally {
    transactionDepth--;
  }
}

/**
 * Execute multiple operations in a single transaction.
 * Convenience wrapper for running several statements atomically.
 *
 * @example
 * await batchTransaction(db, [
 *   { sql: 'INSERT INTO areas (name) VALUES (?)', params: ['Area 1'] },
 *   { sql: 'INSERT INTO areas (name) VALUES (?)', params: ['Area 2'] },
 *   { sql: 'UPDATE areas SET name = ? WHERE id = ?', params: ['Updated', 1] }
 * ]);
 */
export async function batchTransaction(
  db: SqlJsDatabase,
  operations: BatchOperation[]
): Promise<void> {
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
 */
export function isInTransaction(): boolean {
  return transactionDepth > 0;
}

/**
 * Get the current transaction depth.
 * Depth 0 means no active transaction.
 */
export function getTransactionDepth(): number {
  return transactionDepth;
}

/**
 * Reset transaction depth (for testing only).
 * Do not use in production code.
 */
export function _resetTransactionDepth(): void {
  transactionDepth = 0;
}

/**
 * Execute a read-only query outside of any write transaction.
 * This is a hint that the query doesn't modify data.
 */
export function readQuery(db: SqlJsDatabase, sql: string, params: unknown[] = []): unknown[] {
  return db.exec(sql, params);
}

/**
 * Create a transaction-like wrapper for batch inserts with progress tracking.
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
export function createBatchInserter(
  db: SqlJsDatabase,
  options: BatchInserterOptions = {}
): BatchInserter {
  const { batchSize = 100, onProgress = null } = options;

  const operations: BatchOperation[] = [];
  let committed = false;

  return {
    /**
     * Add an operation to the batch.
     */
    add(sql: string, params: unknown[] = []): void {
      if (committed) {
        throw new DatabaseError('Batch already committed', 'batch');
      }
      operations.push({ sql, params });
    },

    /**
     * Get the number of pending operations.
     */
    get size(): number {
      return operations.length;
    },

    /**
     * Commit all operations in batches.
     */
    async commit(): Promise<number> {
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
    discard(): void {
      operations.length = 0;
      committed = true;
    },
  };
}
