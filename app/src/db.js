// Database utility using sql.js (SQLite compiled to WebAssembly)
// JDex v2.0 - 4-Level Johnny Decimal Structure
// Level 1: Areas (00-09, 10-19, etc.)
// Level 2: Categories (00, 01, 22, etc.)
// Level 3: Folders (XX.XX - container folders)
// Level 4: Items (XX.XX.XX - actual tracked objects)

import initSqlJs from 'sql.js';

// Schema modules
import { STORAGE_KEY } from './db/schema/constants.js';
import { initializeSchema } from './db/schema/tables.js';
import { runMigrations as runSchemasMigrations } from './db/schema/migrations.js';
import { seedInitialData as seedSchemaData } from './db/schema/seeds.js';

// Core database accessors (sync state with repositories)
import { setDB as setCoreDB, setSQL as setCoreSQL } from './db/core/database.js';

// Import repository functions for internal use AND re-export
import {
  // Activity Log
  logActivity,
  getRecentActivity,
  clearActivityLog,
  getActivityCount,
  // Storage Locations
  getStorageLocations,
  getStorageLocation,
  createStorageLocation,
  updateStorageLocation,
  deleteStorageLocation,
  getStorageLocationCount,
  // Areas
  getAreas,
  getArea,
  createArea,
  updateArea,
  deleteArea,
  getAreaCount,
  isAreaRangeAvailable,
  // Categories
  getCategories,
  getCategory,
  getCategoryByNumber,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryCount,
  isCategoryNumberAvailable,
  // Folders
  getFolders,
  getFolder,
  getFolderByNumber,
  getNextFolderNumber,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderCount,
  isFolderNumberAvailable,
  // Items
  getItems,
  getItem,
  getNextItemNumber,
  createItem,
  updateItem,
  deleteItem,
  getItemCount,
  isItemNumberAvailable,
  // Search
  searchFolders,
  searchItems,
  searchAll,
  // Statistics
  getStats,
  getAreaStats,
  getCategoryStats,
  getFolderStats,
  // Cloud Drives
  VALID_DRIVE_TYPES,
  getCloudDrives,
  getCloudDrive,
  getDefaultCloudDrive,
  getCloudDriveCount,
  createCloudDrive,
  updateCloudDrive,
  deleteCloudDrive,
  setDefaultCloudDrive,
  // Area Storage
  getAreaStorageMappings,
  getAreaCloudDrive,
  getUnmappedAreas,
  getAreaStorageMappingCount,
  setAreaCloudDrive,
  removeAreaMappingsForDrive,
  // Organization Rules
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
  // Organized Files
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
  // Scanned Files
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
  // Watched Folders
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
  // Watch Activity
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
  // Database Utilities
  QUERYABLE_TABLES,
  executeSQL,
  getTables,
  getTableData,
  getTableSchema,
  getTableRowCount,
  getDatabaseSize,
  vacuumDatabase,
  checkDatabaseIntegrity,
  // Import/Export
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
} from './db/repositories/index.js';

// Re-export schema constants for backward compatibility
export { SCHEMA_VERSION } from './db/schema/constants.js';

// Re-export repository functions for backward compatibility
export {
  // Activity Log
  logActivity,
  getRecentActivity,
  clearActivityLog,
  getActivityCount,
  // Storage Locations
  getStorageLocations,
  getStorageLocation,
  createStorageLocation,
  updateStorageLocation,
  deleteStorageLocation,
  getStorageLocationCount,
  // Areas
  getAreas,
  getArea,
  createArea,
  updateArea,
  deleteArea,
  getAreaCount,
  isAreaRangeAvailable,
  // Categories
  getCategories,
  getCategory,
  getCategoryByNumber,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryCount,
  isCategoryNumberAvailable,
  // Folders
  getFolders,
  getFolder,
  getFolderByNumber,
  getNextFolderNumber,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderCount,
  isFolderNumberAvailable,
  // Items
  getItems,
  getItem,
  getNextItemNumber,
  createItem,
  updateItem,
  deleteItem,
  getItemCount,
  isItemNumberAvailable,
  // Search
  searchFolders,
  searchItems,
  searchAll,
  // Statistics
  getStats,
  getAreaStats,
  getCategoryStats,
  getFolderStats,
  // Cloud Drives
  VALID_DRIVE_TYPES,
  getCloudDrives,
  getCloudDrive,
  getDefaultCloudDrive,
  getCloudDriveCount,
  createCloudDrive,
  updateCloudDrive,
  deleteCloudDrive,
  setDefaultCloudDrive,
  // Area Storage
  getAreaStorageMappings,
  getAreaCloudDrive,
  getUnmappedAreas,
  getAreaStorageMappingCount,
  setAreaCloudDrive,
  removeAreaMappingsForDrive,
  // Organization Rules
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
  // Organized Files
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
  // Scanned Files
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
  // Watched Folders
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
  // Watch Activity
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
  // Database Utilities
  QUERYABLE_TABLES,
  executeSQL,
  getTables,
  getTableData,
  getTableSchema,
  getTableRowCount,
  getDatabaseSize,
  vacuumDatabase,
  checkDatabaseIntegrity,
  // Import/Export
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
};

let db = null;
let SQL = null;

/**
 * Get the current database instance
 * @returns {Object|null} The SQL.js database instance or null if not initialized
 */
export function getDB() {
  return db;
}

// Initialize the database
export async function initDatabase() {
  if (db) return db;

  // Determine the base path for the WASM file
  // In production/Electron, files are relative to the HTML file
  // In development, Vite serves from public/
  const wasmPath = import.meta.env.MODE === 'development' ? '/sql-wasm.wasm' : './sql-wasm.wasm';

  // Load sql.js from bundled package
  SQL = await initSqlJs({
    locateFile: () => wasmPath,
  });

  // Sync SQL module with core for repository access
  setCoreSQL(SQL);

  // Try to load existing database from localStorage
  const savedDb = localStorage.getItem(STORAGE_KEY);

  if (savedDb) {
    const uint8Array = new Uint8Array(JSON.parse(savedDb));
    db = new SQL.Database(uint8Array);
    // Run migrations for existing databases
    runSchemasMigrations(db, saveDatabase);
  } else {
    db = new SQL.Database();
    initializeSchema(db);
    seedSchemaData(db);
    saveDatabase();
  }

  // Sync database instance with core for repository access
  setCoreDB(db);

  return db;
}

// Save database to localStorage
export function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const arr = Array.from(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// ============================================
// REPOSITORY LAYER
// ============================================
// All CRUD operations have been extracted to the repository layer:
// - db/repositories/areas.js - Area operations
// - db/repositories/categories.js - Category operations
// - db/repositories/folders.js - Folder operations
// - db/repositories/items.js - Item operations
// - db/repositories/search.js - Search operations
// - db/repositories/activity-log.js - Activity logging
// - db/repositories/storage-locations.js - Storage locations
// - db/repositories/statistics.js - Database statistics
// - db/repositories/cloud-drives.js - Cloud drive configurations
// - db/repositories/area-storage.js - Area-to-drive mappings
// - db/repositories/organization-rules.js - File organization rules
// - db/repositories/organized-files.js - Organized file records
// - db/repositories/scanned-files.js - Scanned files working set
// - db/repositories/watched-folders.js - Watch folder configurations
// - db/repositories/watch-activity.js - Watch activity logs
// - db/repositories/db-utils.js - Database utilities
// - db/repositories/import-export.js - Import/export operations
//
// Functions are re-exported above for backward compatibility.

// Reset database (for development/testing)
export function resetDatabase() {
  localStorage.removeItem(STORAGE_KEY);
  db = new SQL.Database();
  initializeSchema(db);
  seedSchemaData(db);
  saveDatabase();
  return true;
}
