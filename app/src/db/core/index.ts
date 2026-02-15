/**
 * Database Core Utilities
 * =======================
 *
 * This module exports all core database utilities:
 * - QueryBuilder: Parameterized SQL query construction
 * - ResultMapper: Row-to-object mapping
 * - Transaction: Savepoint-based transactions
 * - Cache: TTL-based read caching
 * - Database: Lifecycle management
 */

// ============================================
// QUERY BUILDER
// ============================================

export {
  // Classes
  QueryBuilder,
  // Functions
  query,
  executeQuery,
  runStatement,
  validateTable,
  validateColumn,
  validateDirection,
  // Constants
  ALLOWED_TABLES,
} from './query-builder.js';

export type {
  QueryType,
  OrderDirection,
  AllowedTable,
  WhereClause,
  SetClause,
  OrderByClause,
  QueryResult,
  SetManyData,
  SqlJsDatabase as QueryBuilderDatabase,
} from './query-builder.js';

// ============================================
// RESULT MAPPER
// ============================================

export {
  // Functions
  mapRow,
  mapRows,
  mapSingle,
  getLastInsertId,
  getChanges,
  hasResults,
  getCount,
  getScalar,
  createMapper,
  // Constants
  COLUMNS,
  mappers,
} from './result-mapper.js';

export type {
  SqlJsRow,
  SqlJsResultSet,
  SqlJsExecResult,
  MappedRow,
  SqlJsDatabase as ResultMapperDatabase,
  ColumnMapper,
  ColumnTableName,
  MapperName,
} from './result-mapper.js';

// ============================================
// TRANSACTION
// ============================================

export {
  // Classes
  TransactionContext,
  // Functions
  transaction,
  batchTransaction,
  isInTransaction,
  getTransactionDepth,
  readQuery,
  createBatchInserter,
  _resetTransactionDepth,
} from './transaction.js';

export type {
  SqlJsDatabase as TransactionDatabase,
  BatchOperation,
  BatchInserterOptions,
  BatchInserter,
  TransactionCallback,
} from './transaction.js';

// ============================================
// CACHE
// ============================================

export {
  // Classes
  TTLCache,
  // Functions
  cacheKey,
  queryCacheKey,
  cached,
  cachedAsync,
  // Instances
  defaultCache,
  shortCache,
  longCache,
} from './cache.js';

export type {
  CacheEntry,
  CacheStats,
  CacheOptions,
  CacheMetadata,
  CachedOptions,
} from './cache.js';

// ============================================
// DATABASE LIFECYCLE
// ============================================

export {
  // Accessors
  getDB,
  setDB,
  getSQL,
  setSQL,
  isInitialized,
  // Persistence
  saveDatabase,
  loadFromStorage,
  clearStorage,
  // Initialization
  initDatabase,
  resetDatabase,
  closeDatabase,
  // Utilities
  getDatabaseStats,
  executeSQL,
  getTables,
} from './database.js';

export type {
  SqlJsDatabase,
  SqlJsQueryResult,
  SqlJsModule,
  DatabaseStats,
} from './database.js';
