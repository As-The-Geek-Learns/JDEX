/**
 * Schema Constants
 * =================
 * Centralized constants for database schema, validation, and domain rules.
 * These constants are used across schema definitions, migrations, and CRUD operations.
 */

// ============================================
// SCHEMA VERSION
// ============================================

/**
 * Current database schema version.
 * Increment when adding new migrations.
 */
export const SCHEMA_VERSION = 8;

// ============================================
// CLOUD DRIVE TYPES
// ============================================

/**
 * Valid cloud drive types for the cloud_drives table.
 */
export const VALID_DRIVE_TYPES = Object.freeze([
  'icloud',
  'dropbox',
  'onedrive',
  'google',
  'proton',
  'generic',
] as const);

export type DriveType = (typeof VALID_DRIVE_TYPES)[number];

/**
 * Default drive type when not specified.
 */
export const DEFAULT_DRIVE_TYPE: DriveType = 'generic';

// ============================================
// ORGANIZATION RULES
// ============================================

/**
 * Valid rule types for file organization rules.
 */
export const RULE_TYPES = Object.freeze(['extension', 'keyword', 'path', 'regex'] as const);

export type RuleType = (typeof RULE_TYPES)[number];

/**
 * Valid target types for organization rules.
 */
export const TARGET_TYPES = Object.freeze(['folder', 'category', 'area'] as const);

export type TargetType = (typeof TARGET_TYPES)[number];

/**
 * Default rule priority (1-100 scale).
 */
export const DEFAULT_RULE_PRIORITY = 50;

// ============================================
// FILE STATUSES
// ============================================

/**
 * Status values for organized files.
 */
export const FILE_STATUSES = Object.freeze(['moved', 'tracked', 'undone', 'deleted'] as const);

export type FileStatus = (typeof FILE_STATUSES)[number];

/**
 * Default status for newly organized files.
 */
export const DEFAULT_FILE_STATUS: FileStatus = 'moved';

// ============================================
// CONFIDENCE LEVELS
// ============================================

/**
 * Confidence levels for file organization suggestions.
 */
export const CONFIDENCE_LEVELS = Object.freeze(['none', 'low', 'medium', 'high'] as const);

export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

/**
 * Default confidence level.
 */
export const DEFAULT_CONFIDENCE: ConfidenceLevel = 'none';

// ============================================
// USER DECISIONS
// ============================================

/**
 * User decision states for scanned files.
 */
export const USER_DECISIONS = Object.freeze([
  'pending',
  'accepted',
  'changed',
  'skipped',
] as const);

export type UserDecision = (typeof USER_DECISIONS)[number];

/**
 * Default user decision state.
 */
export const DEFAULT_USER_DECISION: UserDecision = 'pending';

// ============================================
// WATCH FOLDER ACTIONS
// ============================================

/**
 * Action types for watch folder activity log.
 */
export const WATCH_ACTIONS = Object.freeze([
  'detected',
  'queued',
  'auto_organized',
  'skipped',
  'error',
] as const);

export type WatchAction = (typeof WATCH_ACTIONS)[number];

// ============================================
// SENSITIVITY LEVELS
// ============================================

/**
 * Sensitivity levels for folders.
 */
export const SENSITIVITY_LEVELS = Object.freeze(['standard', 'sensitive', 'work'] as const);

export type SensitivityLevel = (typeof SENSITIVITY_LEVELS)[number];

/**
 * Sensitivity levels for items (includes 'inherit').
 */
export const ITEM_SENSITIVITY_LEVELS = Object.freeze([
  'inherit',
  'standard',
  'sensitive',
  'work',
] as const);

export type ItemSensitivityLevel = (typeof ITEM_SENSITIVITY_LEVELS)[number];

/**
 * Default sensitivity level.
 */
export const DEFAULT_SENSITIVITY: SensitivityLevel = 'standard';

/**
 * Default item sensitivity (inherits from folder).
 */
export const DEFAULT_ITEM_SENSITIVITY: ItemSensitivityLevel = 'inherit';

// ============================================
// TABLE NAMES
// ============================================

/**
 * All valid table names in the database.
 * Used for query builder whitelisting.
 */
export const TABLE_NAMES = Object.freeze([
  'areas',
  'categories',
  'folders',
  'items',
  'cloud_drives',
  'area_storage',
  'organization_rules',
  'organized_files',
  'scanned_files',
  'watched_folders',
  'watch_activity',
  'storage_locations',
  'activity_log',
  'schema_version',
] as const);

export type TableName = (typeof TABLE_NAMES)[number];

// ============================================
// STORAGE KEYS
// ============================================

/**
 * localStorage key for the database.
 */
export const STORAGE_KEY = 'jdex_database_v2';

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Check if a drive type is valid.
 */
export function isValidDriveType(type: string): type is DriveType {
  return (VALID_DRIVE_TYPES as readonly string[]).includes(type);
}

/**
 * Check if a rule type is valid.
 */
export function isValidRuleType(type: string): type is RuleType {
  return (RULE_TYPES as readonly string[]).includes(type);
}

/**
 * Check if a target type is valid.
 */
export function isValidTargetType(type: string): type is TargetType {
  return (TARGET_TYPES as readonly string[]).includes(type);
}

/**
 * Check if a file status is valid.
 */
export function isValidFileStatus(status: string): status is FileStatus {
  return (FILE_STATUSES as readonly string[]).includes(status);
}

/**
 * Check if a confidence level is valid.
 */
export function isValidConfidenceLevel(level: string): level is ConfidenceLevel {
  return (CONFIDENCE_LEVELS as readonly string[]).includes(level);
}

/**
 * Check if a table name is valid.
 */
export function isValidTableName(name: string): name is TableName {
  return (TABLE_NAMES as readonly string[]).includes(name);
}

/**
 * Check if a sensitivity level is valid for folders.
 */
export function isValidSensitivity(level: string): level is SensitivityLevel {
  return (SENSITIVITY_LEVELS as readonly string[]).includes(level);
}

/**
 * Check if a sensitivity level is valid for items.
 */
export function isValidItemSensitivity(level: string): level is ItemSensitivityLevel {
  return (ITEM_SENSITIVITY_LEVELS as readonly string[]).includes(level);
}
