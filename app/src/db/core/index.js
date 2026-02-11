/**
 * Database Core Utilities
 * =======================
 *
 * This module exports all core database utilities:
 * - QueryBuilder: Parameterized SQL query construction
 * - ResultMapper: Row-to-object mapping
 * - Transaction: Savepoint-based transactions
 * - Cache: TTL-based read caching
 */

// Query Builder
export {
  QueryBuilder,
  query,
  executeQuery,
  runStatement,
  ALLOWED_TABLES,
} from './query-builder.js';

// Result Mapper
export {
  mapRow,
  mapRows,
  mapSingle,
  getLastInsertId,
  getChanges,
  hasResults,
  getCount,
  getScalar,
  COLUMNS,
  createMapper,
  mappers,
} from './result-mapper.js';

// Transaction
export {
  transaction,
  batchTransaction,
  isInTransaction,
  getTransactionDepth,
  readQuery,
  createBatchInserter,
  _resetTransactionDepth,
} from './transaction.js';

// Cache
export {
  TTLCache,
  cacheKey,
  queryCacheKey,
  defaultCache,
  shortCache,
  longCache,
  cached,
  cachedAsync,
} from './cache.js';
