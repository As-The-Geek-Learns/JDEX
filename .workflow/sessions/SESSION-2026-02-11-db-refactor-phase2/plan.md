# Session Plan: db.js Repository Pattern - Phase 2 (Schema Layer)

**Date**: 2026-02-11
**Phase**: 2 of 13
**Status**: PLANNED
**Objective**: Extract schema definitions and database initialization from db.js

## Problem Statement

The `db.js` file (3,304 lines) mixes schema definitions, migrations, initialization logic, and CRUD operations. Phase 2 extracts the schema layer to enable:
- Centralized schema constants (prevents magic strings)
- Isolated migration logic (easier to test and extend)
- Clean database initialization (single responsibility)

## Dependencies

- **Phase 1**: Core utilities (query-builder, result-mapper, transaction, cache) - COMPLETED

## Success Criteria

- [ ] `schema/constants.js` - All schema constants extracted
- [ ] `schema/tables.js` - Table creation logic
- [ ] `schema/migrations.js` - All migrations with version tracking
- [ ] `schema/seeds.js` - Initial data seeding
- [ ] `core/database.js` - Database lifecycle (init, save, get)
- [ ] All new files have unit tests
- [ ] db.js imports from new modules (backward compatible)
- [ ] All 1094+ existing tests still pass

## Deliverables

### 1. schema/constants.js (~80 lines)

**Purpose**: Centralize all schema-related constants.

**Exports**:
```javascript
// Version
export const SCHEMA_VERSION = 7;

// Drive types
export const VALID_DRIVE_TYPES = ['icloud', 'dropbox', 'onedrive', 'google', 'proton', 'generic'];

// Rule types
export const RULE_TYPES = ['extension', 'keyword', 'path', 'regex'];
export const TARGET_TYPES = ['folder', 'category', 'area'];

// File statuses
export const FILE_STATUSES = ['moved', 'tracked', 'undone', 'deleted'];
export const CONFIDENCE_LEVELS = ['none', 'low', 'medium', 'high'];
export const USER_DECISIONS = ['pending', 'accepted', 'changed', 'skipped'];

// Watch actions
export const WATCH_ACTIONS = ['detected', 'queued', 'auto_organized', 'skipped', 'error'];

// Sensitivity levels
export const SENSITIVITY_LEVELS = ['standard', 'sensitive', 'work'];
export const ITEM_SENSITIVITY_LEVELS = ['inherit', ...SENSITIVITY_LEVELS];

// Table names (for query builder whitelisting)
export const TABLE_NAMES = [
  'areas', 'categories', 'folders', 'items',
  'cloud_drives', 'area_storage', 'organization_rules',
  'organized_files', 'scanned_files', 'watched_folders',
  'watch_activity', 'storage_locations', 'activity_log',
  'schema_version'
];
```

**Test Coverage**: 10+ tests (validation, completeness)

### 2. schema/tables.js (~150 lines)

**Purpose**: Define all table creation SQL.

**Exports**:
```javascript
export const TABLE_DEFINITIONS = {
  areas: `CREATE TABLE IF NOT EXISTS areas (...)`,
  categories: `CREATE TABLE IF NOT EXISTS categories (...)`,
  // ... all tables
};

export const INDEX_DEFINITIONS = [
  'CREATE INDEX IF NOT EXISTS idx_folders_category ON folders(category_id)',
  // ... all indexes
];

export function createAllTables(db) { ... }
export function createIndexes(db) { ... }
```

**Test Coverage**: 8+ tests (SQL syntax, table creation)

### 3. schema/migrations.js (~250 lines)

**Purpose**: Encapsulate all migration logic.

**Exports**:
```javascript
export function getSchemaVersion(db) { ... }
export function setSchemaVersion(db, version) { ... }
export function runMigrations(db, saveCallback) { ... }

// Individual migrations for testing
export const migrations = {
  2: migrationV2,  // cloud_drives, schema_version
  3: migrationV3,  // area_storage
  4: migrationV4,  // organization_rules
  5: migrationV5,  // organized_files
  6: migrationV6,  // scanned_files
  7: migrationV7,  // watched_folders, watch_activity
};
```

**Test Coverage**: 14+ tests (each migration, version tracking)

### 4. schema/seeds.js (~200 lines)

**Purpose**: Initial data seeding for new databases.

**Exports**:
```javascript
export const DEFAULT_AREAS = [...];
export const DEFAULT_CATEGORIES = [...];
export const DEFAULT_LOCATIONS = [...];

export function seedInitialData(db) { ... }
export function seedAreas(db) { ... }
export function seedCategories(db) { ... }
export function seedLocations(db) { ... }
```

**Test Coverage**: 8+ tests (data integrity, seeding)

### 5. core/database.js (~120 lines)

**Purpose**: Database lifecycle management.

**Exports**:
```javascript
let db = null;
let SQL = null;

export function getDB() { ... }
export function setDB(database) { ... }  // For testing
export async function initDatabase() { ... }
export function saveDatabase() { ... }
export function resetDatabase() { ... }
export function loadFromStorage() { ... }
export function isInitialized() { ... }
```

**Test Coverage**: 12+ tests (init, save, reset, state)

### 6. schema/index.js (~30 lines)

**Purpose**: Re-export all schema modules.

```javascript
export * from './constants.js';
export * from './tables.js';
export * from './migrations.js';
export * from './seeds.js';
```

## Files Created

```
app/src/db/
├── core/
│   ├── __tests__/
│   │   ├── cache.test.js          (existing - 31 tests)
│   │   ├── database.test.js       (NEW - 12 tests)
│   │   ├── query-builder.test.js  (existing - 30 tests)
│   │   ├── result-mapper.test.js  (existing - 31 tests)
│   │   └── transaction.test.js    (existing - 16 tests)
│   ├── cache.js                   (existing)
│   ├── database.js                (NEW - 120 lines)
│   ├── index.js                   (existing - update exports)
│   ├── query-builder.js           (existing)
│   ├── result-mapper.js           (existing)
│   └── transaction.js             (existing)
├── schema/
│   ├── __tests__/
│   │   ├── constants.test.js      (NEW - 10 tests)
│   │   ├── migrations.test.js     (NEW - 14 tests)
│   │   ├── seeds.test.js          (NEW - 8 tests)
│   │   └── tables.test.js         (NEW - 8 tests)
│   ├── constants.js               (NEW - 80 lines)
│   ├── index.js                   (NEW - 30 lines)
│   ├── migrations.js              (NEW - 250 lines)
│   ├── seeds.js                   (NEW - 200 lines)
│   └── tables.js                  (NEW - 150 lines)
```

## Implementation Order

1. **constants.js + tests** - No dependencies, foundation for others
2. **tables.js + tests** - Uses constants
3. **migrations.js + tests** - Uses constants, tables
4. **seeds.js + tests** - Uses constants
5. **database.js + tests** - Uses all schema modules
6. **Update db.js** - Import from new modules, remove duplicated code

## db.js Integration Strategy

After Phase 2, db.js will:
```javascript
// BEFORE (in db.js)
const SCHEMA_VERSION = 7;
const VALID_DRIVE_TYPES = [...];
function createTables() { ... }
function runMigrations() { ... }

// AFTER (in db.js)
import { SCHEMA_VERSION, VALID_DRIVE_TYPES } from './db/schema/constants.js';
import { createAllTables } from './db/schema/tables.js';
import { runMigrations } from './db/schema/migrations.js';
import { getDB, initDatabase, saveDatabase } from './db/core/database.js';

// Re-export for backward compatibility
export { getDB, initDatabase, saveDatabase };
```

## Security Considerations

- [ ] No SQL injection in table definitions (static SQL only)
- [ ] No user input in migration SQL
- [ ] Seed data uses parameterized queries
- [ ] Constants are frozen (Object.freeze) to prevent mutation

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Circular imports | database.js imports schema, schema doesn't import database |
| Migration order | Migrations numbered, executed sequentially |
| Breaking existing code | db.js re-exports all public functions |

## Estimated Scope

- **New code**: ~830 lines across 5 files
- **New tests**: ~52 tests across 5 test files
- **Modified files**: db.js, core/index.js

---

## Approval

- [ ] Plan approved by human before execution
- [ ] Verification approved by human before shipping
