/**
 * Schema Module Index
 * ====================
 * Re-exports all schema-related modules and types.
 */

// Constants - Values
export {
  SCHEMA_VERSION,
  VALID_DRIVE_TYPES,
  DEFAULT_DRIVE_TYPE,
  RULE_TYPES,
  TARGET_TYPES,
  DEFAULT_RULE_PRIORITY,
  FILE_STATUSES,
  DEFAULT_FILE_STATUS,
  CONFIDENCE_LEVELS,
  DEFAULT_CONFIDENCE,
  USER_DECISIONS,
  DEFAULT_USER_DECISION,
  WATCH_ACTIONS,
  SENSITIVITY_LEVELS,
  ITEM_SENSITIVITY_LEVELS,
  DEFAULT_SENSITIVITY,
  DEFAULT_ITEM_SENSITIVITY,
  TABLE_NAMES,
  STORAGE_KEY,
  isValidDriveType,
  isValidRuleType,
  isValidTargetType,
  isValidFileStatus,
  isValidConfidenceLevel,
  isValidTableName,
  isValidSensitivity,
  isValidItemSensitivity,
} from './constants.js';

// Constants - Types
export type {
  DriveType,
  RuleType,
  TargetType,
  FileStatus,
  ConfidenceLevel,
  UserDecision,
  WatchAction,
  SensitivityLevel,
  ItemSensitivityLevel,
  TableName,
} from './constants.js';

// Table definitions - Values
export {
  AREAS_TABLE,
  CATEGORIES_TABLE,
  FOLDERS_TABLE,
  ITEMS_TABLE,
  STORAGE_LOCATIONS_TABLE,
  CLOUD_DRIVES_TABLE,
  AREA_STORAGE_TABLE,
  ORGANIZATION_RULES_TABLE,
  ORGANIZED_FILES_TABLE,
  SCANNED_FILES_TABLE,
  WATCHED_FOLDERS_TABLE,
  WATCH_ACTIVITY_TABLE,
  ACTIVITY_LOG_TABLE,
  SCHEMA_VERSION_TABLE,
  INDEX_DEFINITIONS,
  TABLE_DEFINITIONS,
  createAllTables,
  createIndexes,
  setInitialSchemaVersion,
  initializeSchema,
} from './tables.js';

// Table definitions - Types
export type { SchemaDatabase, TableDefinition } from './tables.js';

// Migrations - Values
export {
  getSchemaVersion,
  setSchemaVersion,
  migrationV2,
  migrationV3,
  migrationV4,
  migrationV5,
  migrationV6,
  migrationV7,
  migrationV8,
  migrations,
  getPendingMigrations,
  runMigrations,
  needsMigration,
  getMigrationStatus,
} from './migrations.js';

// Migrations - Types
export type {
  MigrationDatabase,
  MigrationQueryResult,
  MigrationFunction,
  MigrationRegistry,
  MigrationResult,
  MigrationStatus,
  SaveCallback,
} from './migrations.js';

// Seeds - Values
export {
  DEFAULT_AREAS,
  DEFAULT_CATEGORIES,
  DEFAULT_LOCATIONS,
  seedAreas,
  seedCategories,
  seedLocations,
  seedInitialData,
  getSeedCounts,
} from './seeds.js';

// Seeds - Types
export type { SeedDatabase, AreaSeed, CategorySeed, LocationSeed, SeedCounts } from './seeds.js';
