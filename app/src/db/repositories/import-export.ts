/**
 * Import/Export Repository
 * ========================
 * Functions for database backup, restore, and data export.
 */

import { setDB, getSQL, saveDatabase, getDB } from '../core/database.js';
import { getAreas } from './areas.js';
import { getCategories } from './categories.js';
import { getFolders } from './folders.js';
import { getItems } from './items.js';
import { getStorageLocations } from './storage-locations.js';
import type { Area } from './areas.js';
import type { Category } from './categories.js';
import type { Folder } from './folders.js';
import type { Item } from './items.js';
import type { StorageLocation } from './storage-locations.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Export data structure.
 */
export interface ExportData {
  exported_at: string;
  version: string;
  schema: string;
  areas: Area[];
  categories: Category[];
  folders: Folder[];
  items: Item[];
  storage_locations: StorageLocation[];
}

/**
 * Import validation result.
 */
export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Export summary.
 */
export interface ExportSummary {
  exported_at: string;
  version: string;
  counts: {
    areas: number;
    categories: number;
    folders: number;
    items: number;
    storage_locations: number;
  };
}

/**
 * Import data structure (may have partial data).
 */
export interface ImportData {
  exported_at?: string;
  version?: string;
  schema?: string;
  areas?: Array<{
    name?: string;
    range_start?: number;
    range_end?: number;
    [key: string]: unknown;
  }>;
  categories?: Array<{
    name?: string;
    number?: number;
    [key: string]: unknown;
  }>;
  folders?: Array<{
    name?: string;
    folder_number?: string;
    [key: string]: unknown;
  }>;
  items?: unknown[];
  storage_locations?: unknown[];
}

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
export function exportDatabase(): void {
  const db = getDB();
  if (!db) {
    console.error('[JDex DB] Cannot export: database not initialized');
    return;
  }

  const data = db.export();
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/octet-stream' });
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
 */
export async function importDatabase(file: File): Promise<boolean> {
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
 */
export function exportDatabaseBytes(): Uint8Array | null {
  const db = getDB();
  if (!db) {
    return null;
  }
  return db.export();
}

/**
 * Import database from raw bytes.
 */
export function importDatabaseBytes(bytes: Uint8Array): boolean {
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
export function exportToJSON(): void {
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
 */
export function buildExportData(): ExportData {
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
 */
export function exportToJSONString(pretty: boolean = true): string {
  const data = buildExportData();
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

/**
 * Validate an import JSON structure.
 */
export function validateImportJSON(data: unknown): ImportValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid data format: expected an object');
    return { valid: false, errors };
  }

  const importData = data as ImportData;

  // Check required fields
  const requiredFields = ['areas', 'categories', 'folders'] as const;
  for (const field of requiredFields) {
    if (!Array.isArray(importData[field])) {
      errors.push(`Missing or invalid required field: ${field} (expected array)`);
    }
  }

  // Validate areas have required properties
  if (Array.isArray(importData.areas)) {
    importData.areas.forEach((area, i) => {
      if (!area.name) errors.push(`Area at index ${i} missing 'name'`);
      if (area.range_start === undefined) errors.push(`Area at index ${i} missing 'range_start'`);
      if (area.range_end === undefined) errors.push(`Area at index ${i} missing 'range_end'`);
    });
  }

  // Validate categories have required properties
  if (Array.isArray(importData.categories)) {
    importData.categories.forEach((cat, i) => {
      if (!cat.name) errors.push(`Category at index ${i} missing 'name'`);
      if (cat.number === undefined) errors.push(`Category at index ${i} missing 'number'`);
    });
  }

  // Validate folders have required properties
  if (Array.isArray(importData.folders)) {
    importData.folders.forEach((folder, i) => {
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
 */
export function getExportSummary(data: Partial<ExportData>): ExportSummary {
  return {
    exported_at: data.exported_at || '',
    version: data.version || '',
    counts: {
      areas: Array.isArray(data.areas) ? data.areas.length : 0,
      categories: Array.isArray(data.categories) ? data.categories.length : 0,
      folders: Array.isArray(data.folders) ? data.folders.length : 0,
      items: Array.isArray(data.items) ? data.items.length : 0,
      storage_locations: Array.isArray(data.storage_locations) ? data.storage_locations.length : 0,
    },
  };
}
