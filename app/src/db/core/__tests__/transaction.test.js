/**
 * Transaction Tests
 * =================
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  transaction,
  batchTransaction,
  isInTransaction,
  getTransactionDepth,
  createBatchInserter,
  _resetTransactionDepth,
} from '../transaction.js';

// Mock database for testing
function createMockDb() {
  const statements = [];
  return {
    run: vi.fn((sql, params) => {
      statements.push({ sql, params, type: 'run' });
    }),
    exec: vi.fn((sql, params) => {
      statements.push({ sql, params, type: 'exec' });
      return [];
    }),
    getStatements: () => statements,
    clear: () => (statements.length = 0),
  };
}

describe('Transaction', () => {
  let db;

  beforeEach(() => {
    db = createMockDb();
    _resetTransactionDepth();
  });

  afterEach(() => {
    _resetTransactionDepth();
  });

  describe('transaction()', () => {
    it('creates and releases savepoint on success', async () => {
      await transaction(db, (txn) => {
        txn.run('INSERT INTO areas (name) VALUES (?)', ['Test']);
      });

      const statements = db.getStatements();
      expect(statements[0].sql).toMatch(/^SAVEPOINT sp_/);
      expect(statements[1].sql).toBe('INSERT INTO areas (name) VALUES (?)');
      expect(statements[1].params).toEqual(['Test']);
      expect(statements[2].sql).toMatch(/^RELEASE SAVEPOINT sp_/);
    });

    it('returns callback result', async () => {
      const result = await transaction(db, () => {
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('rolls back on error', async () => {
      await expect(
        transaction(db, () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow(/Transaction failed/);

      const statements = db.getStatements();
      expect(statements.some((s) => s.sql.includes('ROLLBACK'))).toBe(true);
    });

    it('tracks transaction depth', async () => {
      expect(getTransactionDepth()).toBe(0);

      await transaction(db, async () => {
        expect(getTransactionDepth()).toBe(1);

        await transaction(db, () => {
          expect(getTransactionDepth()).toBe(2);
        });

        expect(getTransactionDepth()).toBe(1);
      });

      expect(getTransactionDepth()).toBe(0);
    });

    it('supports async callbacks', async () => {
      const result = await transaction(db, async (txn) => {
        txn.run('INSERT INTO areas (name) VALUES (?)', ['Async']);
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'async-result';
      });

      expect(result).toBe('async-result');
    });

    it('throws if db is null', async () => {
      await expect(transaction(null, () => {})).rejects.toThrow(/Database instance is required/);
    });

    it('provides TransactionContext to callback', async () => {
      await transaction(db, (txn) => {
        expect(typeof txn.run).toBe('function');
        expect(typeof txn.exec).toBe('function');
        expect(txn.db).toBe(db);
        expect(txn.isActive).toBe(true);
      });
    });
  });

  describe('isInTransaction()', () => {
    it('returns false when not in transaction', () => {
      expect(isInTransaction()).toBe(false);
    });

    it('returns true when in transaction', async () => {
      await transaction(db, () => {
        expect(isInTransaction()).toBe(true);
      });
    });
  });

  describe('batchTransaction()', () => {
    it('executes multiple operations atomically', async () => {
      await batchTransaction(db, [
        { sql: 'INSERT INTO areas (name) VALUES (?)', params: ['Area 1'] },
        { sql: 'INSERT INTO areas (name) VALUES (?)', params: ['Area 2'] },
        { sql: 'UPDATE areas SET name = ? WHERE id = ?', params: ['Updated', 1] },
      ]);

      const statements = db.getStatements();
      // Should have: SAVEPOINT, 3 operations, RELEASE
      expect(statements.length).toBe(5);
      expect(statements[1].sql).toBe('INSERT INTO areas (name) VALUES (?)');
      expect(statements[2].sql).toBe('INSERT INTO areas (name) VALUES (?)');
      expect(statements[3].sql).toBe('UPDATE areas SET name = ? WHERE id = ?');
    });

    it('handles empty operations array', async () => {
      await batchTransaction(db, []);
      expect(db.getStatements().length).toBe(0);
    });
  });

  describe('createBatchInserter()', () => {
    it('batches operations and commits', async () => {
      const batch = createBatchInserter(db, { batchSize: 2 });

      batch.add('INSERT INTO areas (name) VALUES (?)', ['A']);
      batch.add('INSERT INTO areas (name) VALUES (?)', ['B']);
      batch.add('INSERT INTO areas (name) VALUES (?)', ['C']);

      expect(batch.size).toBe(3);

      const count = await batch.commit();
      expect(count).toBe(3);
    });

    it('calls onProgress callback', async () => {
      const progress = [];
      const batch = createBatchInserter(db, {
        batchSize: 2,
        onProgress: (done, total) => progress.push({ done, total }),
      });

      batch.add('INSERT 1', []);
      batch.add('INSERT 2', []);
      batch.add('INSERT 3', []);

      await batch.commit();

      expect(progress).toEqual([
        { done: 2, total: 3 },
        { done: 3, total: 3 },
      ]);
    });

    it('throws if commit called twice', async () => {
      const batch = createBatchInserter(db);
      batch.add('INSERT', []);
      await batch.commit();

      await expect(batch.commit()).rejects.toThrow(/already committed/);
    });

    it('throws if add called after commit', async () => {
      const batch = createBatchInserter(db);
      await batch.commit();

      expect(() => batch.add('INSERT', [])).toThrow(/already committed/);
    });

    it('discard clears pending operations', async () => {
      const batch = createBatchInserter(db);
      batch.add('INSERT 1', []);
      batch.add('INSERT 2', []);
      batch.discard();

      expect(batch.size).toBe(0);
    });
  });
});
