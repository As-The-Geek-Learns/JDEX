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

// Storage Locations
export {
  getStorageLocations,
  getStorageLocation,
  createStorageLocation,
  updateStorageLocation,
  deleteStorageLocation,
  getStorageLocationCount,
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

// Search
export { searchFolders, searchItems, searchAll } from './search.js';
