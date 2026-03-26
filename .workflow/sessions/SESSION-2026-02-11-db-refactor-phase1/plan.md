# Session Plan: db.js Repository Pattern - Phase 1 (Foundation)

**Date**: 2026-02-11
**Phase**: 1 of 13
**Status**: COMPLETED
**Objective**: Create core utilities without changing db.js

## Problem Statement

The current `db.js` (3,304 lines) has:
- SQL injection vulnerabilities via template literals (e.g., `WHERE id = ${id}`)
- Fragile row mapping using positional array access (`row[0]`, `row[1]`)
- No transaction support
- No caching for expensive reads

## Success Criteria

- [x] `query-builder.js` - Fluent API for parameterized queries
- [x] `result-mapper.js` - Column-based row-to-object mapping
- [x] `transaction.js` - Savepoint-based transactions (sql.js limitation)
- [x] `cache.js` - TTL cache for read operations
- [x] All utilities have unit tests (108 tests)
- [x] Zero changes to existing db.js (pure addition)

## Deliverables

### 1. query-builder.js (372 lines)

**Purpose**: Replace unsafe template literals with parameterized queries.

**Key Features**:
- Fluent API: `.select().from().where().orderBy().limit().build()`
- Table name whitelisting (prevents injection)
- Column name validation
- Support for SELECT, INSERT, UPDATE, DELETE
- Returns `{ sql, params }` for sql.js execution

**Test Coverage**: 30 tests

### 2. result-mapper.js (280 lines)

**Purpose**: Map sql.js result arrays to objects using column definitions.

**Key Features**:
- `mapRow()`, `mapRows()`, `mapSingle()` - Row to object mapping
- `getLastInsertId()`, `getChanges()` - SQL helper functions
- `getCount()`, `getScalar()` - Common query helpers
- Pre-defined `COLUMNS` for all JDex tables
- Pre-built `mappers` object for convenience

**Test Coverage**: 31 tests

### 3. transaction.js (230 lines)

**Purpose**: Wrap operations in savepoint transactions.

**Key Features**:
- `transaction(db, callback)` - Atomic operation wrapper
- `batchTransaction()` - Execute multiple operations
- `createBatchInserter()` - Batch inserts with progress tracking
- Automatic rollback on error
- Nested savepoint support

**Test Coverage**: 16 tests

### 4. cache.js (320 lines)

**Purpose**: TTL-based cache for expensive read operations.

**Key Features**:
- `TTLCache` class with configurable TTL and max entries
- `getOrSet()` / `getOrSetAsync()` - Lazy caching
- `deletePattern()` - Glob-style cache invalidation
- Cache statistics tracking
- `cached()` / `cachedAsync()` decorators

**Test Coverage**: 31 tests

## Files Created

```
app/src/db/core/
├── __tests__/
│   ├── cache.test.js         (31 tests)
│   ├── query-builder.test.js (30 tests)
│   ├── result-mapper.test.js (31 tests)
│   └── transaction.test.js   (16 tests)
├── cache.js                  (320 lines)
├── index.js                  (48 lines - exports)
├── query-builder.js          (372 lines)
├── result-mapper.js          (280 lines)
└── transaction.js            (230 lines)
```

## Verification Results

1. **Lint**: No errors in new files
2. **Tests**: All 108 new tests pass
3. **Full Suite**: All 1094 tests pass (986 existing + 108 new)
4. **db.js**: No changes made (pure addition)

## Security Features Implemented

- **Table whitelisting**: QueryBuilder only allows known table names
- **Column validation**: Column names checked against safe pattern
- **Parameterized queries**: All values passed as `?` placeholders
- **No string interpolation**: SQL built from validated components only

## Next Steps (Phase 2)

Extract schema definitions:
- `schema/constants.js` - SCHEMA_VERSION, VALID_DRIVE_TYPES, etc.
- `schema/tables.js` - createTables()
- `schema/migrations.js` - All migrations
- `core/database.js` - initDatabase(), saveDatabase(), getDB()

---

## Approval

- [x] Plan approved by human before execution
- [ ] Verification approved by human before shipping
