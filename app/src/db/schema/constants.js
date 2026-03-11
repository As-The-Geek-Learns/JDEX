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
]);

/**
 * Default drive type when not specified.
 */
export const DEFAULT_DRIVE_TYPE = 'generic';

// ============================================
// ORGANIZATION RULES
// ============================================

/**
 * Valid rule types for file organization rules.
 */
export const RULE_TYPES = Object.freeze(['extension', 'keyword', 'path', 'regex']);

/**
 * Valid target types for organization rules.
 */
export const TARGET_TYPES = Object.freeze(['folder', 'category', 'area']);

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
export const FILE_STATUSES = Object.freeze(['moved', 'tracked', 'undone', 'deleted']);

/**
 * Default status for newly organized files.
 */
export const DEFAULT_FILE_STATUS = 'moved';

// ============================================
// CONFIDENCE LEVELS
// ============================================

/**
 * Confidence levels for file organization suggestions.
 */
export const CONFIDENCE_LEVELS = Object.freeze(['none', 'low', 'medium', 'high']);

/**
 * Default confidence level.
 */
export const DEFAULT_CONFIDENCE = 'none';

// ============================================
// USER DECISIONS
// ============================================

/**
 * User decision states for scanned files.
 */
export const USER_DECISIONS = Object.freeze(['pending', 'accepted', 'changed', 'skipped']);

/**
 * Default user decision state.
 */
export const DEFAULT_USER_DECISION = 'pending';

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
]);

// ============================================
// SENSITIVITY LEVELS
// ============================================

/**
 * Sensitivity levels for folders.
 */
export const SENSITIVITY_LEVELS = Object.freeze(['standard', 'sensitive', 'work']);

/**
 * Sensitivity levels for items (includes 'inherit').
 */
export const ITEM_SENSITIVITY_LEVELS = Object.freeze(['inherit', 'standard', 'sensitive', 'work']);

/**
 * Default sensitivity level.
 */
export const DEFAULT_SENSITIVITY = 'standard';

/**
 * Default item sensitivity (inherits from folder).
 */
export const DEFAULT_ITEM_SENSITIVITY = 'inherit';

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
]);

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
 * @param {string} type - Drive type to validate
 * @returns {boolean}
 */
export function isValidDriveType(type) {
  return VALID_DRIVE_TYPES.includes(type);
}

/**
 * Check if a rule type is valid.
 * @param {string} type - Rule type to validate
 * @returns {boolean}
 */
export function isValidRuleType(type) {
  return RULE_TYPES.includes(type);
}

/**
 * Check if a target type is valid.
 * @param {string} type - Target type to validate
 * @returns {boolean}
 */
export function isValidTargetType(type) {
  return TARGET_TYPES.includes(type);
}

/**
 * Check if a file status is valid.
 * @param {string} status - Status to validate
 * @returns {boolean}
 */
export function isValidFileStatus(status) {
  return FILE_STATUSES.includes(status);
}

/**
 * Check if a confidence level is valid.
 * @param {string} level - Confidence level to validate
 * @returns {boolean}
 */
export function isValidConfidenceLevel(level) {
  return CONFIDENCE_LEVELS.includes(level);
}

/**
 * Check if a table name is valid.
 * @param {string} name - Table name to validate
 * @returns {boolean}
 */
export function isValidTableName(name) {
  return TABLE_NAMES.includes(name);
}

/**
 * Check if a sensitivity level is valid for folders.
 * @param {string} level - Sensitivity level to validate
 * @returns {boolean}
 */
export function isValidSensitivity(level) {
  return SENSITIVITY_LEVELS.includes(level);
}

/**
 * Check if a sensitivity level is valid for items.
 * @param {string} level - Sensitivity level to validate
 * @returns {boolean}
 */
export function isValidItemSensitivity(level) {
  return ITEM_SENSITIVITY_LEVELS.includes(level);
}
