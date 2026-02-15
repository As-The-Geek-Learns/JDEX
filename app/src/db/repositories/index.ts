/**
 * Repository Layer
 * =================
 * Exports all repository modules for database operations.
 *
 * This module provides the public API for database CRUD operations.
 * Internal utilities (getDB, saveDatabase, etc.) are not re-exported.
 */

// Activity Log
export {
  logActivity,
  getRecentActivity,
  clearActivityLog,
  getActivityCount,
} from './activity-log.js';
export type { ActivityLogEntry, ActivityAction, EntityType } from './activity-log.js';

// Storage Locations
export {
  getStorageLocations,
  getStorageLocation,
  createStorageLocation,
  updateStorageLocation,
  deleteStorageLocation,
  getStorageLocationCount,
} from './storage-locations.js';
export type {
  StorageLocation,
  CreateStorageLocationInput,
  UpdateStorageLocationInput,
} from './storage-locations.js';

// Areas
export {
  getAreas,
  getArea,
  createArea,
  updateArea,
  deleteArea,
  getAreaCount,
  isAreaRangeAvailable,
} from './areas.js';
export type { Area, CreateAreaInput, UpdateAreaInput } from './areas.js';

// Categories
export {
  getCategories,
  getCategory,
  getCategoryByNumber,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryCount,
  isCategoryNumberAvailable,
} from './categories.js';
export type { Category, CreateCategoryInput, UpdateCategoryInput } from './categories.js';

// Folders
export {
  getFolders,
  getFolder,
  getFolderByNumber,
  getNextFolderNumber,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderCount,
  isFolderNumberAvailable,
} from './folders.js';
export type { Folder, CreateFolderInput, UpdateFolderInput, NextFolderNumber } from './folders.js';

// Items
export {
  getItems,
  getItem,
  getNextItemNumber,
  createItem,
  updateItem,
  deleteItem,
  getItemCount,
  isItemNumberAvailable,
} from './items.js';
export type { Item, CreateItemInput, UpdateItemInput, NextItemNumber } from './items.js';

// Search
export { searchFolders, searchItems, searchAll } from './search.js';
export type { SearchResults } from './search.js';

// Statistics
export { getStats, getAreaStats, getCategoryStats, getFolderStats } from './statistics.js';
export type { DatabaseStats, AreaStats, CategoryStats, FolderStats } from './statistics.js';

// Cloud Drives
export {
  VALID_DRIVE_TYPES,
  getCloudDrives,
  getCloudDrive,
  getDefaultCloudDrive,
  getCloudDriveCount,
  createCloudDrive,
  updateCloudDrive,
  deleteCloudDrive,
  setDefaultCloudDrive,
} from './cloud-drives.js';
export type {
  CloudDrive,
  DriveType,
  CreateCloudDriveInput,
  UpdateCloudDriveInput,
} from './cloud-drives.js';

// Area Storage
export {
  getAreaStorageMappings,
  getAreaCloudDrive,
  getUnmappedAreas,
  getAreaStorageMappingCount,
  setAreaCloudDrive,
  removeAreaMappingsForDrive,
} from './area-storage.js';
export type { AreaStorageMapping, UnmappedArea } from './area-storage.js';

// Organization Rules
export {
  VALID_RULE_TYPES,
  VALID_TARGET_TYPES,
  getOrganizationRules,
  getOrganizationRule,
  getOrganizationRulesByTarget,
  getOrganizationRuleCount,
  createOrganizationRule,
  updateOrganizationRule,
  deleteOrganizationRule,
  incrementRuleMatchCount,
  toggleOrganizationRule,
  resetRuleMatchCount,
} from './organization-rules.js';
export type {
  OrganizationRule,
  RuleType,
  TargetType,
  CreateOrganizationRuleInput,
  UpdateOrganizationRuleInput,
  GetOrganizationRulesOptions,
} from './organization-rules.js';

// Organized Files
export {
  VALID_FILE_STATUSES,
  getOrganizedFiles,
  getOrganizedFile,
  findOrganizedFileByPath,
  getRecentOrganizedFiles,
  getOrganizedFileCount,
  getOrganizedFilesStats,
  recordOrganizedFile,
  markFileUndone,
  updateOrganizedFile,
  deleteOrganizedFile,
  clearOldOrganizedFiles,
} from './organized-files.js';
export type {
  OrganizedFile,
  FileStatus,
  RecordOrganizedFileInput,
  GetOrganizedFilesOptions,
  OrganizedFilesStats,
  UpdateOrganizedFileInput,
} from './organized-files.js';

// Scanned Files
export {
  VALID_DECISIONS,
  VALID_CONFIDENCE_LEVELS,
  generateScanSessionId,
  clearScannedFiles,
  getScannedFiles,
  getScannedFile,
  getFilesReadyToOrganize,
  getScanStats,
  getScannedFileCount,
  addScannedFile,
  addScannedFilesBatch,
  updateScannedFileDecision,
  acceptScannedFileSuggestion,
  skipScannedFile,
  changeScannedFileTarget,
  updateScannedFileSuggestion,
  deleteScannedFile,
} from './scanned-files.js';
export type {
  ScannedFile,
  ScannedFileWithTarget,
  Decision,
  ConfidenceLevel,
  AddScannedFileInput,
  GetScannedFilesOptions,
  ScanStats,
} from './scanned-files.js';

// Watched Folders
export {
  VALID_CONFIDENCE_THRESHOLDS,
  getWatchedFolders,
  getWatchedFolder,
  getWatchedFolderByPath,
  getWatchedFolderCount,
  createWatchedFolder,
  updateWatchedFolder,
  deleteWatchedFolder,
  incrementWatchedFolderStats,
  toggleWatchedFolder,
  resetWatchedFolderStats,
} from './watched-folders.js';
export type {
  WatchedFolder,
  ConfidenceThreshold,
  CreateWatchedFolderInput,
  UpdateWatchedFolderInput,
  GetWatchedFoldersOptions,
} from './watched-folders.js';

// Watch Activity
export {
  VALID_WATCH_ACTIONS,
  getWatchActivity,
  getRecentWatchActivity,
  getQueuedFileCounts,
  getWatchActivityById,
  getWatchActivityCount,
  logWatchActivity,
  updateWatchActivityAction,
  deleteWatchActivity,
  clearOldWatchActivity,
  clearWatchActivityForFolder,
} from './watch-activity.js';
export type {
  WatchActivity,
  WatchAction,
  QueuedFileCount,
  LogWatchActivityInput,
  GetWatchActivityOptions,
  GetRecentWatchActivityOptions,
  UpdateWatchActivityUpdates,
} from './watch-activity.js';

// Database Utilities
export {
  QUERYABLE_TABLES,
  executeSQL,
  getTables,
  getTableData,
  getTableSchema,
  getTableRowCount,
  getDatabaseSize,
  vacuumDatabase,
  checkDatabaseIntegrity,
} from './db-utils.js';
export type {
  TableData,
  ColumnSchema,
  DatabaseSizeInfo,
  IntegrityCheckResult,
} from './db-utils.js';

// Import/Export
export {
  EXPORT_VERSION,
  SCHEMA_DESCRIPTION,
  exportDatabase,
  importDatabase,
  exportDatabaseBytes,
  importDatabaseBytes,
  exportToJSON,
  buildExportData,
  exportToJSONString,
  validateImportJSON,
  getExportSummary,
} from './import-export.js';
export type {
  ExportData,
  ImportData,
  ImportValidationResult,
  ExportSummary,
} from './import-export.js';
