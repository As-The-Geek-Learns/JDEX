/**
 * Import/Export Repository
 * ========================
 * Functions for database backup, restore, and data export.
 */

import { getDB, setDB, getSQL, saveDatabase } from '../core/database.js';
import { getAreas } from './areas.js';
import { getCategories } from './categories.js';
import { getFolders } from './folders.js';
import { getItems } from './items.js';
import { getStorageLocations } from './storage-locations.js';

// ============================================
// CONSTANTS
// ============================================

/**
 * Current export format version.
 */
export const EXPORT_VERSION = '2.0';

/**
 * Schema description for exports.
 */
export const SCHEMA_DESCRIPTION = '4-level (Area > Category > Folder > Item)';

// ============================================
// SQLITE EXPORT/IMPORT
// ============================================

/**
 * Export the entire database as a downloadable SQLite file.
 * Creates a blob and triggers a download in the browser.
 */
export function exportDatabase() {
  const db = getDB();
  if (!db) {
    console.error('[JDex DB] Cannot export: database not initialized');
    return;
  }

  const data = db.export();
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `jdex-v2-backup-${new Date().toISOString().split('T')[0]}.sqlite`;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Import a SQLite database file.
 * Replaces the current database with the imported one.
 *
 * @param {File} file - The SQLite file to import
 * @returns {Promise<boolean>} True if import successful
 */
export async function importDatabase(file) {
  const SQL = getSQL();
  if (!SQL) {
    throw new Error('SQL.js not loaded. Call initDatabase first.');
  }

  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  // Validate it's a valid SQLite database
  // SQLite files start with "SQLite format 3"
  const header = new TextDecoder().decode(uint8Array.slice(0, 16));
  if (!header.startsWith('SQLite format 3')) {
    throw new Error('Invalid SQLite database file');
  }

  // Replace the current database
  const newDb = new SQL.Database(uint8Array);
  setDB(newDb);
  saveDatabase();

  return true;
}

/**
 * Export database as raw bytes for programmatic use.
 *
 * @returns {Uint8Array|null} Database bytes or null if not initialized
 */
export function exportDatabaseBytes() {
  const db = getDB();
  if (!db) {
    return null;
  }
  return db.export();
}

/**
 * Import database from raw bytes.
 *
 * @param {Uint8Array} bytes - Database bytes
 * @returns {boolean} True if import successful
 */
export function importDatabaseBytes(bytes) {
  const SQL = getSQL();
  if (!SQL) {
    throw new Error('SQL.js not loaded. Call initDatabase first.');
  }

  const newDb = new SQL.Database(bytes);
  setDB(newDb);
  saveDatabase();

  return true;
}

// ============================================
// JSON EXPORT/IMPORT
// ============================================

/**
 * Export the database as a downloadable JSON file.
 * Includes all JD hierarchy data (areas, categories, folders, items).
 */
export function exportToJSON() {
  const data = buildExportData();

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `jdex-v2-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Build the export data object.
 * Useful for programmatic access without triggering download.
 *
 * @returns {Object} Export data object
 */
export function buildExportData() {
  return {
    exported_at: new Date().toISOString(),
    version: EXPORT_VERSION,
    schema: SCHEMA_DESCRIPTION,
    areas: getAreas(),
    categories: getCategories(),
    folders: getFolders(),
    items: getItems(),
    storage_locations: getStorageLocations(),
  };
}

/**
 * Export data as JSON string.
 *
 * @param {boolean} [pretty=true] - Whether to format with indentation
 * @returns {string} JSON string
 */
export function exportToJSONString(pretty = true) {
  const data = buildExportData();
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

/**
 * Validate an import JSON structure.
 *
 * @param {Object} data - The parsed JSON data
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export function validateImportJSON(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid data format: expected an object');
    return { valid: false, errors };
  }

  // Check required fields
  const requiredFields = ['areas', 'categories', 'folders'];
  for (const field of requiredFields) {
    if (!Array.isArray(data[field])) {
      errors.push(`Missing or invalid required field: ${field} (expected array)`);
    }
  }

  // Validate areas have required properties
  if (Array.isArray(data.areas)) {
    data.areas.forEach((area, i) => {
      if (!area.name) errors.push(`Area at index ${i} missing 'name'`);
      if (area.range_start === undefined) errors.push(`Area at index ${i} missing 'range_start'`);
      if (area.range_end === undefined) errors.push(`Area at index ${i} missing 'range_end'`);
    });
  }

  // Validate categories have required properties
  if (Array.isArray(data.categories)) {
    data.categories.forEach((cat, i) => {
      if (!cat.name) errors.push(`Category at index ${i} missing 'name'`);
      if (cat.number === undefined) errors.push(`Category at index ${i} missing 'number'`);
    });
  }

  // Validate folders have required properties
  if (Array.isArray(data.folders)) {
    data.folders.forEach((folder, i) => {
      if (!folder.name) errors.push(`Folder at index ${i} missing 'name'`);
      if (!folder.folder_number) errors.push(`Folder at index ${i} missing 'folder_number'`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get summary statistics for an export data object.
 *
 * @param {Object} data - Export data
 * @returns {Object} Summary statistics
 */
export function getExportSummary(data) {
  return {
    exported_at: data.exported_at,
    version: data.version,
    counts: {
      areas: Array.isArray(data.areas) ? data.areas.length : 0,
      categories: Array.isArray(data.categories) ? data.categories.length : 0,
      folders: Array.isArray(data.folders) ? data.folders.length : 0,
      items: Array.isArray(data.items) ? data.items.length : 0,
      storage_locations: Array.isArray(data.storage_locations) ? data.storage_locations.length : 0,
    },
  };
}
