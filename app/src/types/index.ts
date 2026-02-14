/**
 * JDex Type Definitions
 * =====================
 * Shared TypeScript types for the JDex application.
 * Based on database schema in db/schema/tables.js
 */

// ============================================
// CORE JOHNNY DECIMAL ENTITIES
// ============================================

/**
 * Area - Level 1 of Johnny Decimal hierarchy.
 * Represents broad life/work categories (00-09, 10-19, etc.)
 */
export interface Area {
  id: number;
  range_start: number;
  range_end: number;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
}

/**
 * Category - Level 2 of Johnny Decimal hierarchy.
 * Topic groups within an area (11, 12, 22, etc.)
 */
export interface Category {
  id: number;
  number: number;
  area_id: number;
  name: string;
  description?: string;
  created_at: string;
}

/**
 * Sensitivity levels for folders and items.
 */
export type Sensitivity = 'standard' | 'sensitive' | 'work';
export type ItemSensitivity = 'inherit' | Sensitivity;

/**
 * Folder - Level 3 of Johnny Decimal hierarchy.
 * Container folders in XX.XX format.
 */
export interface Folder {
  id: number;
  folder_number: string;
  category_id: number;
  sequence: number;
  name: string;
  description?: string;
  sensitivity?: Sensitivity;
  location?: string;
  storage_path?: string;
  keywords?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Item - Level 4 of Johnny Decimal hierarchy.
 * Actual tracked objects in XX.XX.XXX format.
 */
export interface Item {
  id: number;
  item_number: string;
  folder_id: number;
  sequence: number;
  name: string;
  description?: string;
  file_type?: string;
  sensitivity?: ItemSensitivity;
  location?: string;
  storage_path?: string;
  file_size?: number;
  keywords?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// STORAGE & CLOUD TYPES
// ============================================

/**
 * Cloud drive type identifiers.
 */
export type DriveType = 'generic' | 'icloud' | 'onedrive' | 'dropbox' | 'proton';

/**
 * Storage location for physical/logical storage.
 */
export interface StorageLocation {
  id: number;
  name: string;
  type: string;
  path?: string;
  is_encrypted: boolean;
  notes?: string;
}

/**
 * Cloud drive configuration.
 */
export interface CloudDrive {
  id: string;
  name: string;
  base_path: string;
  jd_root_path?: string;
  is_default: boolean;
  is_active: boolean;
  drive_type: DriveType;
  created_at: string;
  updated_at: string;
}

/**
 * Area to cloud drive mapping.
 */
export interface AreaStorage {
  area_id: number;
  cloud_drive_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// FILE ORGANIZATION TYPES
// ============================================

/**
 * Rule types for file matching.
 */
export type RuleType = 'extension' | 'keyword' | 'path' | 'regex' | 'date' | 'compound';

/**
 * Target types for organization rules.
 */
export type TargetType = 'folder' | 'category' | 'area';

/**
 * Organization rule for automated file sorting.
 */
export interface OrganizationRule {
  id: number;
  name: string;
  rule_type: RuleType;
  pattern: string;
  target_type: TargetType;
  target_id: string;
  priority: number;
  is_active: boolean;
  match_count: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Status of an organized file.
 */
export type OrganizedFileStatus = 'moved' | 'tracked' | 'undone' | 'deleted';

/**
 * Record of a file that has been organized.
 */
export interface OrganizedFile {
  id: number;
  filename: string;
  original_path: string;
  current_path: string;
  jd_folder_number?: string;
  jd_item_id?: number;
  file_extension?: string;
  file_type?: string;
  file_size?: number;
  file_modified_at?: string;
  matched_rule_id?: number;
  cloud_drive_id?: string;
  status: OrganizedFileStatus;
  organized_at: string;
}

/**
 * Confidence levels for rule matching.
 */
export type ConfidenceLevel = 'none' | 'low' | 'medium' | 'high';

/**
 * User decision for scanned files.
 */
export type UserDecision = 'pending' | 'accepted' | 'changed' | 'skipped';

/**
 * Scanned file during batch processing.
 */
export interface ScannedFile {
  id: number;
  scan_session_id: string;
  filename: string;
  path: string;
  parent_folder?: string;
  file_extension?: string;
  file_type?: string;
  file_size?: number;
  file_modified_at?: string;
  suggested_jd_folder?: string;
  suggested_rule_id?: number;
  suggestion_confidence: ConfidenceLevel;
  user_decision: UserDecision;
  user_target_folder?: string;
  scanned_at: string;
}

// ============================================
// WATCH FOLDER TYPES
// ============================================

/**
 * Watch folder configuration.
 */
export interface WatchedFolder {
  id: number;
  name: string;
  path: string;
  is_active: boolean;
  auto_organize: boolean;
  confidence_threshold: ConfidenceLevel;
  include_subdirs: boolean;
  file_types?: string;
  notify_on_organize: boolean;
  last_checked_at?: string;
  files_processed: number;
  files_organized: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Generic result type for operations that can fail.
 * Use this pattern for functions that return success/failure.
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Pagination parameters for list operations.
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

/**
 * Sort direction for list operations.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Generic sort parameters.
 */
export interface SortParams<T extends string = string> {
  field: T;
  direction: SortDirection;
}

/**
 * ID type - all database entities use numeric IDs except cloud_drives.
 */
export type EntityId = number;
export type CloudDriveId = string;

/**
 * Nullable type helper.
 */
export type Nullable<T> = T | null;

/**
 * Deep partial for nested objects.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
