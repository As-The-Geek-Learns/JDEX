// Database utility using sql.js (SQLite compiled to WebAssembly)
// JDex v2.0 - 4-Level Johnny Decimal Structure
// Level 1: Areas (00-09, 10-19, etc.)
// Level 2: Categories (00, 01, 22, etc.)
// Level 3: Folders (XX.XX - container folders)
// Level 4: Items (XX.XX.XX - actual tracked objects)

import {
  validateRequiredString,
  validateOptionalString,
  sanitizeText,
} from './utils/validation.js';
import { DatabaseError } from './utils/errors.js';

// Schema modules
import { STORAGE_KEY } from './db/schema/constants.js';
import { initializeSchema } from './db/schema/tables.js';
import { runMigrations as runSchemasMigrations } from './db/schema/migrations.js';
import { seedInitialData as seedSchemaData } from './db/schema/seeds.js';

// Core database accessors (sync state with repositories)
import { setDB as setCoreDB, setSQL as setCoreSQL } from './db/core/database.js';

// Import repository functions for internal use AND re-export
import {
  // Activity Log - used internally for logging
  logActivity,
  getRecentActivity,
  // Storage Locations - used internally for export
  getStorageLocations,
  createStorageLocation,
  updateStorageLocation,
  deleteStorageLocation,
  // Areas - used internally for export
  getAreas,
  createArea,
  updateArea,
  deleteArea,
  // Categories - used internally for export
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './db/repositories/index.js';

// Re-export schema constants for backward compatibility
export { SCHEMA_VERSION } from './db/schema/constants.js';

// Re-export repository functions for backward compatibility
export {
  logActivity,
  getRecentActivity,
  getStorageLocations,
  createStorageLocation,
  updateStorageLocation,
  deleteStorageLocation,
  getAreas,
  createArea,
  updateArea,
  deleteArea,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
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

  // Load sql.js from CDN
  if (!window.initSqlJs) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://sql.js.org/dist/sql-wasm.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  SQL = await window.initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
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
// AREA FUNCTIONS - Now in db/repositories/areas.js
// CATEGORY FUNCTIONS - Now in db/repositories/categories.js
// ============================================

// (Functions moved to repositories - re-exported above)

// ============================================
// FOLDER FUNCTIONS (Level 3 - XX.XX containers)
// ============================================

export function getFolders(categoryId = null) {
  let query = `
    SELECT f.*, c.number as category_number, c.name as category_name, 
           a.name as area_name, a.color as area_color
    FROM folders f 
    JOIN categories c ON f.category_id = c.id 
    JOIN areas a ON c.area_id = a.id
    WHERE 1=1
  `;

  if (categoryId) query += ` AND f.category_id = ${categoryId}`;
  query += ' ORDER BY f.folder_number';

  const results = db.exec(query);
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      folder_number: row[1],
      category_id: row[2],
      sequence: row[3],
      name: row[4],
      description: row[5],
      sensitivity: row[6],
      location: row[7],
      storage_path: row[8],
      keywords: row[9],
      notes: row[10],
      created_at: row[11],
      updated_at: row[12],
      category_number: row[13],
      category_name: row[14],
      area_name: row[15],
      area_color: row[16],
    })) || []
  );
}

export function getFolder(folderId) {
  const query = `
    SELECT f.*, c.number as category_number, c.name as category_name, 
           a.name as area_name, a.color as area_color
    FROM folders f 
    JOIN categories c ON f.category_id = c.id 
    JOIN areas a ON c.area_id = a.id
    WHERE f.id = ${folderId}
  `;

  const results = db.exec(query);
  if (!results[0]?.values[0]) return null;

  const row = results[0].values[0];
  return {
    id: row[0],
    folder_number: row[1],
    category_id: row[2],
    sequence: row[3],
    name: row[4],
    description: row[5],
    sensitivity: row[6],
    location: row[7],
    storage_path: row[8],
    keywords: row[9],
    notes: row[10],
    created_at: row[11],
    updated_at: row[12],
    category_number: row[13],
    category_name: row[14],
    area_name: row[15],
    area_color: row[16],
  };
}

/**
 * Get a folder by its JD folder number (e.g., "11.01").
 *
 * @param {string} folderNumber - The JD folder number
 * @returns {Object|null} The folder object or null if not found
 */
export function getFolderByNumber(folderNumber) {
  if (!folderNumber || typeof folderNumber !== 'string') {
    return null;
  }

  const sanitized = sanitizeText(folderNumber);
  const result = db.exec(`
    SELECT f.*, c.name as category_name, c.number as category_number, a.name as area_name, a.color as area_color
    FROM folders f
    LEFT JOIN categories c ON f.category_id = c.id
    LEFT JOIN areas a ON c.area_id = a.id
    WHERE f.folder_number = '${sanitized}'
    LIMIT 1
  `);

  if (!result[0]?.values?.[0]) return null;

  const row = result[0].values[0];
  return {
    id: row[0],
    folder_number: row[1],
    category_id: row[2],
    sequence: row[3],
    name: row[4],
    description: row[5],
    sensitivity: row[6],
    location: row[7],
    storage_path: row[8],
    keywords: row[9],
    notes: row[10],
    created_at: row[11],
    updated_at: row[12],
    category_name: row[13],
    category_number: row[14],
    area_name: row[15],
    area_color: row[16],
  };
}

export function getNextFolderNumber(categoryId) {
  const category = db.exec(`SELECT number FROM categories WHERE id = ${categoryId}`);
  if (!category[0]) return null;

  const catNumber = category[0].values[0][0];
  const catStr = String(catNumber).padStart(2, '0');

  const existing = db.exec(`
    SELECT sequence FROM folders 
    WHERE category_id = ${categoryId} 
    ORDER BY sequence DESC LIMIT 1
  `);

  const nextSeq = existing[0]?.values[0]?.[0] ? existing[0].values[0][0] + 1 : 1;
  const seqStr = String(nextSeq).padStart(2, '0');

  return { folder_number: `${catStr}.${seqStr}`, sequence: nextSeq };
}

export function createFolder(folder) {
  const stmt = db.prepare(`
    INSERT INTO folders (folder_number, category_id, sequence, name, description, sensitivity, location, storage_path, keywords, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run([
    folder.folder_number,
    folder.category_id,
    folder.sequence,
    folder.name,
    folder.description || '',
    folder.sensitivity || 'standard',
    folder.location || '',
    folder.storage_path || '',
    folder.keywords || '',
    folder.notes || '',
  ]);

  stmt.free();

  logActivity('create', 'folder', folder.folder_number, `Created folder: ${folder.name}`);
  saveDatabase();

  return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
}

export function updateFolder(id, updates) {
  const validColumns = [
    'folder_number',
    'category_id',
    'sequence',
    'name',
    'description',
    'sensitivity',
    'location',
    'storage_path',
    'keywords',
    'notes',
  ];

  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (validColumns.includes(key) && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.run(`UPDATE folders SET ${fields.join(', ')} WHERE id = ?`, values);

  const folder = db.exec(`SELECT folder_number, name FROM folders WHERE id = ${id}`);
  if (folder[0]) {
    logActivity('update', 'folder', folder[0].values[0][0], `Updated: ${folder[0].values[0][1]}`);
  }

  saveDatabase();
}

export function deleteFolder(id) {
  // Check if folder has items
  const items = db.exec(`SELECT COUNT(*) FROM items WHERE folder_id = ${id}`);
  if (items[0]?.values[0][0] > 0) {
    throw new Error('Cannot delete folder with existing items. Delete or move items first.');
  }

  const folder = db.exec(`SELECT folder_number, name FROM folders WHERE id = ${id}`);
  if (folder[0]) {
    logActivity('delete', 'folder', folder[0].values[0][0], `Deleted: ${folder[0].values[0][1]}`);
  }

  db.run(`DELETE FROM folders WHERE id = ${id}`);
  saveDatabase();
}

// ============================================
// ITEM FUNCTIONS (Level 4 - XX.XX.XX objects)
// ============================================

export function getItems(folderId = null) {
  let query = `
    SELECT i.*, f.folder_number, f.name as folder_name, f.sensitivity as folder_sensitivity,
           c.number as category_number, c.name as category_name,
           a.name as area_name, a.color as area_color
    FROM items i 
    JOIN folders f ON i.folder_id = f.id
    JOIN categories c ON f.category_id = c.id 
    JOIN areas a ON c.area_id = a.id
    WHERE 1=1
  `;

  if (folderId) query += ` AND i.folder_id = ${folderId}`;
  query += ' ORDER BY i.item_number';

  const results = db.exec(query);
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      item_number: row[1],
      folder_id: row[2],
      sequence: row[3],
      name: row[4],
      description: row[5],
      file_type: row[6],
      sensitivity: row[7],
      location: row[8],
      storage_path: row[9],
      file_size: row[10],
      keywords: row[11],
      notes: row[12],
      created_at: row[13],
      updated_at: row[14],
      folder_number: row[15],
      folder_name: row[16],
      folder_sensitivity: row[17],
      category_number: row[18],
      category_name: row[19],
      area_name: row[20],
      area_color: row[21],
      // Computed effective sensitivity
      effective_sensitivity: row[7] === 'inherit' ? row[17] : row[7],
    })) || []
  );
}

export function getNextItemNumber(folderId) {
  const folder = db.exec(`SELECT folder_number FROM folders WHERE id = ${folderId}`);
  if (!folder[0]) return null;

  const folderNumber = folder[0].values[0][0];

  const existing = db.exec(`
    SELECT sequence FROM items 
    WHERE folder_id = ${folderId} 
    ORDER BY sequence DESC LIMIT 1
  `);

  const nextSeq = existing[0]?.values[0]?.[0] ? existing[0].values[0][0] + 1 : 1;
  const seqStr = String(nextSeq).padStart(2, '0');

  return { item_number: `${folderNumber}.${seqStr}`, sequence: nextSeq };
}

export function createItem(item) {
  const stmt = db.prepare(`
    INSERT INTO items (item_number, folder_id, sequence, name, description, file_type, sensitivity, location, storage_path, file_size, keywords, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run([
    item.item_number,
    item.folder_id,
    item.sequence,
    item.name,
    item.description || '',
    item.file_type || '',
    item.sensitivity || 'inherit',
    item.location || '',
    item.storage_path || '',
    item.file_size || null,
    item.keywords || '',
    item.notes || '',
  ]);

  stmt.free();

  logActivity('create', 'item', item.item_number, `Created item: ${item.name}`);
  saveDatabase();

  return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
}

export function updateItem(id, updates) {
  const validColumns = [
    'item_number',
    'folder_id',
    'sequence',
    'name',
    'description',
    'file_type',
    'sensitivity',
    'location',
    'storage_path',
    'file_size',
    'keywords',
    'notes',
  ];

  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (validColumns.includes(key) && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.run(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`, values);

  const item = db.exec(`SELECT item_number, name FROM items WHERE id = ${id}`);
  if (item[0]) {
    logActivity('update', 'item', item[0].values[0][0], `Updated: ${item[0].values[0][1]}`);
  }

  saveDatabase();
}

export function deleteItem(id) {
  const item = db.exec(`SELECT item_number, name FROM items WHERE id = ${id}`);
  if (item[0]) {
    logActivity('delete', 'item', item[0].values[0][0], `Deleted: ${item[0].values[0][1]}`);
  }

  db.run(`DELETE FROM items WHERE id = ${id}`);
  saveDatabase();
}

// ============================================
// SEARCH FUNCTIONS
// ============================================

export function searchFolders(query) {
  const searchQuery = `
    SELECT f.*, c.number as category_number, c.name as category_name, 
           a.name as area_name, a.color as area_color
    FROM folders f 
    JOIN categories c ON f.category_id = c.id 
    JOIN areas a ON c.area_id = a.id
    WHERE f.folder_number LIKE '%${query}%' 
       OR f.name LIKE '%${query}%' 
       OR f.description LIKE '%${query}%'
       OR f.keywords LIKE '%${query}%'
       OR f.notes LIKE '%${query}%'
       OR c.name LIKE '%${query}%'
       OR a.name LIKE '%${query}%'
    ORDER BY f.folder_number
  `;

  const results = db.exec(searchQuery);
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      folder_number: row[1],
      category_id: row[2],
      sequence: row[3],
      name: row[4],
      description: row[5],
      sensitivity: row[6],
      location: row[7],
      storage_path: row[8],
      keywords: row[9],
      notes: row[10],
      created_at: row[11],
      updated_at: row[12],
      category_number: row[13],
      category_name: row[14],
      area_name: row[15],
      area_color: row[16],
    })) || []
  );
}

export function searchItems(query) {
  const searchQuery = `
    SELECT i.*, f.folder_number, f.name as folder_name, f.sensitivity as folder_sensitivity,
           c.number as category_number, c.name as category_name,
           a.name as area_name, a.color as area_color
    FROM items i 
    JOIN folders f ON i.folder_id = f.id
    JOIN categories c ON f.category_id = c.id 
    JOIN areas a ON c.area_id = a.id
    WHERE i.item_number LIKE '%${query}%' 
       OR i.name LIKE '%${query}%' 
       OR i.description LIKE '%${query}%'
       OR i.keywords LIKE '%${query}%'
       OR i.notes LIKE '%${query}%'
       OR f.name LIKE '%${query}%'
       OR c.name LIKE '%${query}%'
       OR a.name LIKE '%${query}%'
    ORDER BY i.item_number
  `;

  const results = db.exec(searchQuery);
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      item_number: row[1],
      folder_id: row[2],
      sequence: row[3],
      name: row[4],
      description: row[5],
      file_type: row[6],
      sensitivity: row[7],
      location: row[8],
      storage_path: row[9],
      file_size: row[10],
      keywords: row[11],
      notes: row[12],
      created_at: row[13],
      updated_at: row[14],
      folder_number: row[15],
      folder_name: row[16],
      folder_sensitivity: row[17],
      category_number: row[18],
      category_name: row[19],
      area_name: row[20],
      area_color: row[21],
      effective_sensitivity: row[7] === 'inherit' ? row[17] : row[7],
    })) || []
  );
}

// Combined search across folders and items
export function searchAll(query) {
  return {
    folders: searchFolders(query),
    items: searchItems(query),
  };
}

// ============================================
// STORAGE LOCATIONS - Now in db/repositories/storage-locations.js
// ============================================

// ============================================
// CLOUD DRIVES (Premium Feature)
// ============================================

/**
 * Valid drive types for cloud_drives.drive_type column.
 */
const VALID_DRIVE_TYPES = ['icloud', 'dropbox', 'onedrive', 'google', 'proton', 'generic'];

/**
 * Get all configured cloud drives.
 * @returns {Array} Array of cloud drive objects
 */
export function getCloudDrives() {
  const results = db.exec(
    'SELECT * FROM cloud_drives WHERE is_active = 1 ORDER BY is_default DESC, name ASC'
  );
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      name: row[1],
      base_path: row[2],
      jd_root_path: row[3],
      is_default: row[4] === 1,
      is_active: row[5] === 1,
      drive_type: row[6],
      created_at: row[7],
      updated_at: row[8],
    })) || []
  );
}

/**
 * Get a single cloud drive by ID.
 * @param {string} driveId - The drive ID
 * @returns {Object|null} The cloud drive or null
 */
export function getCloudDrive(driveId) {
  const id = validateRequiredString(driveId, 'Drive ID', 50);
  const results = db.exec(`SELECT * FROM cloud_drives WHERE id = '${sanitizeText(id)}'`);

  if (!results[0]?.values[0]) return null;

  const row = results[0].values[0];
  return {
    id: row[0],
    name: row[1],
    base_path: row[2],
    jd_root_path: row[3],
    is_default: row[4] === 1,
    is_active: row[5] === 1,
    drive_type: row[6],
    created_at: row[7],
    updated_at: row[8],
  };
}

/**
 * Get the default cloud drive.
 * @returns {Object|null} The default drive or null
 */
export function getDefaultCloudDrive() {
  const results = db.exec(
    'SELECT * FROM cloud_drives WHERE is_default = 1 AND is_active = 1 LIMIT 1'
  );

  if (!results[0]?.values[0]) return null;

  const row = results[0].values[0];
  return {
    id: row[0],
    name: row[1],
    base_path: row[2],
    jd_root_path: row[3],
    is_default: true,
    is_active: true,
    drive_type: row[6],
    created_at: row[7],
    updated_at: row[8],
  };
}

/**
 * Create a new cloud drive configuration.
 * Uses parameterized queries for security.
 *
 * @param {Object} drive - The drive configuration
 * @param {string} drive.id - Unique identifier (e.g., 'icloud', 'dropbox-personal')
 * @param {string} drive.name - Display name
 * @param {string} drive.base_path - Base path to the cloud drive
 * @param {string} [drive.jd_root_path] - Path to JD folder within the drive
 * @param {boolean} [drive.is_default] - Whether this is the default drive
 * @param {string} [drive.drive_type] - Type of drive (icloud, dropbox, etc.)
 * @returns {string} The created drive ID
 * @throws {DatabaseError} If creation fails
 */
export function createCloudDrive(drive) {
  try {
    // Validate inputs
    const id = validateRequiredString(drive.id, 'Drive ID', 50);
    const name = validateRequiredString(drive.name, 'Name', 100);
    const basePath = validateRequiredString(drive.base_path, 'Base path', 500);
    const jdRootPath = validateOptionalString(drive.jd_root_path, 'JD root path', 500);
    const driveType =
      drive.drive_type && VALID_DRIVE_TYPES.includes(drive.drive_type)
        ? drive.drive_type
        : 'generic';

    // If this is set as default, unset any existing default
    if (drive.is_default) {
      db.run('UPDATE cloud_drives SET is_default = 0 WHERE is_default = 1');
    }

    // Insert using parameterized query
    const stmt = db.prepare(`
      INSERT INTO cloud_drives (id, name, base_path, jd_root_path, is_default, is_active, drive_type)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `);

    stmt.run([id, name, basePath, jdRootPath, drive.is_default ? 1 : 0, driveType]);

    stmt.free();

    logActivity('create', 'cloud_drive', id, `Added cloud drive: ${name}`);
    saveDatabase();

    return id;
  } catch (error) {
    if (error.name === 'ValidationError') {
      throw error;
    }
    throw new DatabaseError(`Failed to create cloud drive: ${error.message}`, 'insert');
  }
}

/**
 * Update a cloud drive configuration.
 *
 * @param {string} driveId - The drive ID to update
 * @param {Object} updates - Fields to update
 * @throws {DatabaseError} If update fails
 */
export function updateCloudDrive(driveId, updates) {
  try {
    const id = validateRequiredString(driveId, 'Drive ID', 50);

    const validColumns = [
      'name',
      'base_path',
      'jd_root_path',
      'is_default',
      'is_active',
      'drive_type',
    ];
    const fields = [];
    const values = [];

    // Handle is_default specially - unset others first
    if (updates.is_default === true) {
      db.run('UPDATE cloud_drives SET is_default = 0 WHERE is_default = 1');
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (validColumns.includes(key) && value !== undefined) {
        // Validate string fields
        if (key === 'name') {
          value = validateRequiredString(value, 'Name', 100);
        } else if (key === 'base_path') {
          value = validateRequiredString(value, 'Base path', 500);
        } else if (key === 'jd_root_path') {
          value = validateOptionalString(value, 'JD root path', 500);
        } else if (key === 'drive_type') {
          value = VALID_DRIVE_TYPES.includes(value) ? value : 'generic';
        } else if (key === 'is_default' || key === 'is_active') {
          value = value ? 1 : 0;
        }

        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.run(`UPDATE cloud_drives SET ${fields.join(', ')} WHERE id = ?`, values);

    logActivity('update', 'cloud_drive', id, `Updated cloud drive: ${id}`);
    saveDatabase();
  } catch (error) {
    if (error.name === 'ValidationError') {
      throw error;
    }
    throw new DatabaseError(`Failed to update cloud drive: ${error.message}`, 'update');
  }
}

/**
 * Delete a cloud drive configuration.
 * Uses soft delete (sets is_active = 0) to preserve history.
 *
 * @param {string} driveId - The drive ID to delete
 */
export function deleteCloudDrive(driveId) {
  const id = validateRequiredString(driveId, 'Drive ID', 50);

  // Soft delete - just mark as inactive
  db.run('UPDATE cloud_drives SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    id,
  ]);

  logActivity('delete', 'cloud_drive', id, `Removed cloud drive: ${id}`);
  saveDatabase();
}

/**
 * Set a cloud drive as the default.
 *
 * @param {string} driveId - The drive ID to set as default
 */
export function setDefaultCloudDrive(driveId) {
  const id = validateRequiredString(driveId, 'Drive ID', 50);

  // Unset current default
  db.run('UPDATE cloud_drives SET is_default = 0 WHERE is_default = 1');

  // Set new default
  db.run('UPDATE cloud_drives SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    id,
  ]);

  logActivity('update', 'cloud_drive', id, `Set as default cloud drive: ${id}`);
  saveDatabase();
}

// ============================================
// AREA STORAGE MAPPING (Premium Feature)
// ============================================

/**
 * Get all area-to-drive mappings with area and drive details.
 * @returns {Array} Array of mapping objects with joined data
 */
export function getAreaStorageMappings() {
  const query = `
    SELECT 
      ast.area_id,
      ast.cloud_drive_id,
      ast.notes,
      ast.created_at,
      ast.updated_at,
      a.name as area_name,
      a.range_start,
      a.range_end,
      a.color as area_color,
      cd.name as drive_name,
      cd.base_path,
      cd.jd_root_path,
      cd.drive_type
    FROM area_storage ast
    JOIN areas a ON ast.area_id = a.id
    LEFT JOIN cloud_drives cd ON ast.cloud_drive_id = cd.id AND cd.is_active = 1
    ORDER BY a.range_start
  `;

  const results = db.exec(query);
  return (
    results[0]?.values.map((row) => ({
      area_id: row[0],
      cloud_drive_id: row[1],
      notes: row[2],
      created_at: row[3],
      updated_at: row[4],
      area_name: row[5],
      range_start: row[6],
      range_end: row[7],
      area_color: row[8],
      drive_name: row[9],
      base_path: row[10],
      jd_root_path: row[11],
      drive_type: row[12],
    })) || []
  );
}

/**
 * Get the cloud drive assigned to a specific area.
 * Falls back to the default drive if no specific mapping exists.
 *
 * @param {number} areaId - The area ID
 * @returns {Object|null} The cloud drive for this area, or default, or null
 */
export function getAreaCloudDrive(areaId) {
  const id = validatePositiveInteger(areaId, 'Area ID');

  // First, try to find specific mapping for this area
  const mappingResult = db.exec(`
    SELECT cd.* 
    FROM area_storage ast
    JOIN cloud_drives cd ON ast.cloud_drive_id = cd.id
    WHERE ast.area_id = ${id} AND cd.is_active = 1
  `);

  if (mappingResult[0]?.values[0]) {
    const row = mappingResult[0].values[0];
    return {
      id: row[0],
      name: row[1],
      base_path: row[2],
      jd_root_path: row[3],
      is_default: row[4] === 1,
      is_active: row[5] === 1,
      drive_type: row[6],
      created_at: row[7],
      updated_at: row[8],
    };
  }

  // Fall back to default drive
  return getDefaultCloudDrive();
}

/**
 * Set the cloud drive for a specific area.
 * Creates or updates the mapping.
 *
 * @param {number} areaId - The area ID
 * @param {string|null} cloudDriveId - The cloud drive ID, or null to remove mapping
 * @param {string} [notes] - Optional notes about this mapping
 */
export function setAreaCloudDrive(areaId, cloudDriveId, notes = null) {
  const id = validatePositiveInteger(areaId, 'Area ID');
  const driveId = cloudDriveId ? validateRequiredString(cloudDriveId, 'Drive ID', 50) : null;
  const sanitizedNotes = validateOptionalString(notes, 'Notes', 500);

  // Verify area exists
  const areaCheck = db.exec(`SELECT id FROM areas WHERE id = ${id}`);
  if (!areaCheck[0]?.values[0]) {
    throw new DatabaseError(`Area with ID ${id} not found`, 'query');
  }

  // Verify drive exists if provided
  if (driveId) {
    const driveCheck = db.exec(
      `SELECT id FROM cloud_drives WHERE id = '${sanitizeText(driveId)}' AND is_active = 1`
    );
    if (!driveCheck[0]?.values[0]) {
      throw new DatabaseError(`Cloud drive '${driveId}' not found or inactive`, 'query');
    }
  }

  // Use INSERT OR REPLACE (SQLite upsert)
  if (driveId) {
    db.run(
      `
      INSERT OR REPLACE INTO area_storage (area_id, cloud_drive_id, notes, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `,
      [id, driveId, sanitizedNotes]
    );

    logActivity('update', 'area_storage', `area-${id}`, `Mapped area ${id} to drive ${driveId}`);
  } else {
    // Remove mapping if driveId is null
    db.run('DELETE FROM area_storage WHERE area_id = ?', [id]);
    logActivity('delete', 'area_storage', `area-${id}`, `Removed drive mapping for area ${id}`);
  }

  saveDatabase();
}

/**
 * Get areas that don't have a specific cloud drive mapping.
 * These areas will use the default drive.
 *
 * @returns {Array} Array of unmapped areas
 */
export function getUnmappedAreas() {
  const query = `
    SELECT a.*
    FROM areas a
    LEFT JOIN area_storage ast ON a.id = ast.area_id
    WHERE ast.area_id IS NULL
    ORDER BY a.range_start
  `;

  const results = db.exec(query);
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      range_start: row[1],
      range_end: row[2],
      name: row[3],
      description: row[4],
      color: row[5],
      created_at: row[6],
    })) || []
  );
}

/**
 * Helper: Validate a positive integer.
 * @param {unknown} value - Value to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {number} Validated positive integer
 */
function validatePositiveInteger(value, fieldName) {
  if (value === null || value === undefined) {
    throw new DatabaseError(`${fieldName} is required`, 'query');
  }

  const num = typeof value === 'string' ? parseInt(value, 10) : value;

  if (typeof num !== 'number' || !Number.isFinite(num) || num < 1 || !Number.isInteger(num)) {
    throw new DatabaseError(`${fieldName} must be a positive whole number`, 'query');
  }

  return num;
}

// ============================================
// ORGANIZATION RULES (Premium Feature)
// ============================================

/**
 * Valid rule types for organization_rules.
 */
const VALID_RULE_TYPES = ['extension', 'keyword', 'path', 'regex'];

/**
 * Valid target types (what the rule points to).
 */
const VALID_TARGET_TYPES = ['folder', 'category', 'area'];

/**
 * Get all organization rules, optionally filtered by type.
 * Rules are returned in priority order (highest first).
 *
 * @param {Object} options - Filter options
 * @param {string} [options.ruleType] - Filter by rule type
 * @param {boolean} [options.activeOnly=true] - Only return active rules
 * @returns {Array} Array of rule objects
 */
export function getOrganizationRules(options = {}) {
  const { ruleType, activeOnly = true } = options;

  let query = 'SELECT * FROM organization_rules WHERE 1=1';

  if (activeOnly) {
    query += ' AND is_active = 1';
  }

  if (ruleType && VALID_RULE_TYPES.includes(ruleType)) {
    query += ` AND rule_type = '${ruleType}'`;
  }

  query += ' ORDER BY priority DESC, match_count DESC, created_at ASC';

  const results = db.exec(query);
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      name: row[1],
      rule_type: row[2],
      pattern: row[3],
      target_type: row[4],
      target_id: row[5],
      priority: row[6],
      is_active: row[7] === 1,
      match_count: row[8],
      notes: row[9],
      created_at: row[10],
      updated_at: row[11],
    })) || []
  );
}

/**
 * Get a single organization rule by ID.
 *
 * @param {number} ruleId - The rule ID
 * @returns {Object|null} The rule or null
 */
export function getOrganizationRule(ruleId) {
  const id = validatePositiveInteger(ruleId, 'Rule ID');

  const results = db.exec(`SELECT * FROM organization_rules WHERE id = ${id}`);

  if (!results[0]?.values[0]) return null;

  const row = results[0].values[0];
  return {
    id: row[0],
    name: row[1],
    rule_type: row[2],
    pattern: row[3],
    target_type: row[4],
    target_id: row[5],
    priority: row[6],
    is_active: row[7] === 1,
    match_count: row[8],
    notes: row[9],
    created_at: row[10],
    updated_at: row[11],
  };
}

/**
 * Create a new organization rule.
 *
 * @param {Object} rule - The rule to create
 * @param {string} rule.name - Display name for the rule
 * @param {string} rule.rule_type - Type: 'extension', 'keyword', 'path', 'regex'
 * @param {string} rule.pattern - The pattern to match (e.g., '.pdf', 'invoice', '/Downloads/')
 * @param {string} rule.target_type - What to target: 'folder', 'category', 'area'
 * @param {string} rule.target_id - ID of the target (folder_number, category number, or area id)
 * @param {number} [rule.priority=50] - Priority (higher = checked first)
 * @param {string} [rule.notes] - Optional notes
 * @returns {number} The created rule ID
 */
export function createOrganizationRule(rule) {
  try {
    // Validate inputs
    const name = validateRequiredString(rule.name, 'Name', 100);
    const pattern = validateRequiredString(rule.pattern, 'Pattern', 500);
    const targetId = validateRequiredString(rule.target_id, 'Target ID', 50);
    const notes = validateOptionalString(rule.notes, 'Notes', 500);

    // Validate rule_type
    if (!rule.rule_type || !VALID_RULE_TYPES.includes(rule.rule_type)) {
      throw new DatabaseError(`Rule type must be one of: ${VALID_RULE_TYPES.join(', ')}`, 'insert');
    }

    // Validate target_type
    if (!rule.target_type || !VALID_TARGET_TYPES.includes(rule.target_type)) {
      throw new DatabaseError(
        `Target type must be one of: ${VALID_TARGET_TYPES.join(', ')}`,
        'insert'
      );
    }

    // Validate priority (0-100)
    const priority =
      rule.priority !== undefined
        ? Math.min(100, Math.max(0, parseInt(rule.priority, 10) || 50))
        : 50;

    // For regex rules, validate the regex is valid
    if (rule.rule_type === 'regex') {
      try {
        new RegExp(pattern);
      } catch (e) {
        throw new DatabaseError('Invalid regular expression pattern', 'insert');
      }
    }

    const stmt = db.prepare(`
      INSERT INTO organization_rules (name, rule_type, pattern, target_type, target_id, priority, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([name, rule.rule_type, pattern, rule.target_type, targetId, priority, notes]);

    stmt.free();

    const newId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

    logActivity('create', 'organization_rule', newId.toString(), `Created rule: ${name}`);
    saveDatabase();

    return newId;
  } catch (error) {
    if (error.name === 'ValidationError' || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to create rule: ${error.message}`, 'insert');
  }
}

/**
 * Update an organization rule.
 *
 * @param {number} ruleId - The rule ID to update
 * @param {Object} updates - Fields to update
 */
export function updateOrganizationRule(ruleId, updates) {
  try {
    const id = validatePositiveInteger(ruleId, 'Rule ID');

    const validColumns = [
      'name',
      'rule_type',
      'pattern',
      'target_type',
      'target_id',
      'priority',
      'is_active',
      'notes',
    ];
    const fields = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (validColumns.includes(key) && value !== undefined) {
        // Validate based on field
        if (key === 'name') {
          value = validateRequiredString(value, 'Name', 100);
        } else if (key === 'pattern') {
          value = validateRequiredString(value, 'Pattern', 500);
        } else if (key === 'target_id') {
          value = validateRequiredString(value, 'Target ID', 50);
        } else if (key === 'notes') {
          value = validateOptionalString(value, 'Notes', 500);
        } else if (key === 'rule_type') {
          if (!VALID_RULE_TYPES.includes(value)) {
            throw new DatabaseError(`Invalid rule type: ${value}`, 'update');
          }
        } else if (key === 'target_type') {
          if (!VALID_TARGET_TYPES.includes(value)) {
            throw new DatabaseError(`Invalid target type: ${value}`, 'update');
          }
        } else if (key === 'priority') {
          value = Math.min(100, Math.max(0, parseInt(value, 10) || 50));
        } else if (key === 'is_active') {
          value = value ? 1 : 0;
        }

        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    // Validate regex if pattern or rule_type changed to regex
    if (
      updates.rule_type === 'regex' ||
      (updates.pattern && getOrganizationRule(id)?.rule_type === 'regex')
    ) {
      const patternToCheck = updates.pattern || getOrganizationRule(id)?.pattern;
      try {
        new RegExp(patternToCheck);
      } catch (e) {
        throw new DatabaseError('Invalid regular expression pattern', 'update');
      }
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.run(`UPDATE organization_rules SET ${fields.join(', ')} WHERE id = ?`, values);

    logActivity('update', 'organization_rule', id.toString(), `Updated rule ID: ${id}`);
    saveDatabase();
  } catch (error) {
    if (error.name === 'ValidationError' || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to update rule: ${error.message}`, 'update');
  }
}

/**
 * Delete an organization rule.
 *
 * @param {number} ruleId - The rule ID to delete
 */
export function deleteOrganizationRule(ruleId) {
  const id = validatePositiveInteger(ruleId, 'Rule ID');

  db.run('DELETE FROM organization_rules WHERE id = ?', [id]);

  logActivity('delete', 'organization_rule', id.toString(), `Deleted rule ID: ${id}`);
  saveDatabase();
}

/**
 * Increment the match count for a rule.
 * Called when a rule successfully matches a file.
 *
 * @param {number} ruleId - The rule ID
 */
export function incrementRuleMatchCount(ruleId) {
  const id = validatePositiveInteger(ruleId, 'Rule ID');

  db.run(
    'UPDATE organization_rules SET match_count = match_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  saveDatabase();
}

/**
 * Toggle a rule's active status.
 *
 * @param {number} ruleId - The rule ID
 * @returns {boolean} The new active status
 */
export function toggleOrganizationRule(ruleId) {
  const id = validatePositiveInteger(ruleId, 'Rule ID');

  db.run(
    'UPDATE organization_rules SET is_active = 1 - is_active, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  saveDatabase();

  const result = db.exec(`SELECT is_active FROM organization_rules WHERE id = ${id}`);
  return result[0]?.values[0]?.[0] === 1;
}

// ============================================
// ORGANIZED FILES (Premium Feature)
// ============================================

/**
 * Valid statuses for organized files.
 */
const VALID_FILE_STATUSES = ['moved', 'tracked', 'undone', 'deleted'];

/**
 * Get organized files with optional filtering.
 *
 * @param {Object} options - Filter options
 * @param {string} [options.status] - Filter by status
 * @param {string} [options.jdFolderNumber] - Filter by JD folder
 * @param {string} [options.fileType] - Filter by file type
 * @param {number} [options.limit=100] - Max results
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Array} Array of organized file records
 */
export function getOrganizedFiles(options = {}) {
  const { status, jdFolderNumber, fileType, limit = 100, offset = 0 } = options;

  let query = 'SELECT * FROM organized_files WHERE 1=1';

  if (status && VALID_FILE_STATUSES.includes(status)) {
    query += ` AND status = '${status}'`;
  }

  if (jdFolderNumber) {
    const folder = sanitizeText(jdFolderNumber);
    query += ` AND jd_folder_number = '${folder}'`;
  }

  if (fileType) {
    const type = sanitizeText(fileType);
    query += ` AND file_type = '${type}'`;
  }

  query += ` ORDER BY organized_at DESC LIMIT ${Math.min(limit, 1000)} OFFSET ${offset}`;

  const results = db.exec(query);
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      filename: row[1],
      original_path: row[2],
      current_path: row[3],
      jd_folder_number: row[4],
      jd_item_id: row[5],
      file_extension: row[6],
      file_type: row[7],
      file_size: row[8],
      file_modified_at: row[9],
      matched_rule_id: row[10],
      cloud_drive_id: row[11],
      status: row[12],
      organized_at: row[13],
    })) || []
  );
}

/**
 * Get a single organized file by ID.
 *
 * @param {number} fileId - The file record ID
 * @returns {Object|null} The file record or null
 */
export function getOrganizedFile(fileId) {
  const id = validatePositiveInteger(fileId, 'File ID');

  const results = db.exec(`SELECT * FROM organized_files WHERE id = ${id}`);

  if (!results[0]?.values[0]) return null;

  const row = results[0].values[0];
  return {
    id: row[0],
    filename: row[1],
    original_path: row[2],
    current_path: row[3],
    jd_folder_number: row[4],
    jd_item_id: row[5],
    file_extension: row[6],
    file_type: row[7],
    file_size: row[8],
    file_modified_at: row[9],
    matched_rule_id: row[10],
    cloud_drive_id: row[11],
    status: row[12],
    organized_at: row[13],
  };
}

/**
 * Check if a file (by original path) has already been organized.
 *
 * @param {string} originalPath - The original file path
 * @returns {Object|null} The existing record or null
 */
export function findOrganizedFileByPath(originalPath) {
  const path = validateRequiredString(originalPath, 'Original path', 1000);

  // Use parameterized query for safety
  const stmt = db.prepare('SELECT * FROM organized_files WHERE original_path = ? AND status != ?');
  stmt.bind([path, 'undone']);

  let result = null;
  if (stmt.step()) {
    const row = stmt.get();
    result = {
      id: row[0],
      filename: row[1],
      original_path: row[2],
      current_path: row[3],
      jd_folder_number: row[4],
      jd_item_id: row[5],
      file_extension: row[6],
      file_type: row[7],
      file_size: row[8],
      file_modified_at: row[9],
      matched_rule_id: row[10],
      cloud_drive_id: row[11],
      status: row[12],
      organized_at: row[13],
    };
  }

  stmt.free();
  return result;
}

/**
 * Record a file that has been organized.
 *
 * @param {Object} file - The file record
 * @param {string} file.filename - The filename
 * @param {string} file.original_path - Where the file was
 * @param {string} file.current_path - Where the file is now
 * @param {string} [file.jd_folder_number] - JD folder it was placed in
 * @param {number} [file.jd_item_id] - JD item ID if added to database
 * @param {string} [file.file_extension] - File extension
 * @param {string} [file.file_type] - File type category
 * @param {number} [file.file_size] - File size in bytes
 * @param {string} [file.file_modified_at] - Original file modification date
 * @param {number} [file.matched_rule_id] - Rule that matched this file
 * @param {string} [file.cloud_drive_id] - Cloud drive it was moved to
 * @param {string} [file.status='moved'] - Status: moved, tracked
 * @returns {number} The created record ID
 */
export function recordOrganizedFile(file) {
  try {
    // Validate required fields
    const filename = validateRequiredString(file.filename, 'Filename', 500);
    const originalPath = validateRequiredString(file.original_path, 'Original path', 1000);
    const currentPath = validateRequiredString(file.current_path, 'Current path', 1000);

    // Validate optional fields
    const jdFolderNumber = validateOptionalString(file.jd_folder_number, 'JD folder number', 20);
    const fileExtension = validateOptionalString(file.file_extension, 'Extension', 20);
    const fileType = validateOptionalString(file.file_type, 'File type', 50);
    const cloudDriveId = validateOptionalString(file.cloud_drive_id, 'Cloud drive ID', 50);

    const status = file.status && VALID_FILE_STATUSES.includes(file.status) ? file.status : 'moved';

    const stmt = db.prepare(`
      INSERT INTO organized_files (
        filename, original_path, current_path, jd_folder_number, jd_item_id,
        file_extension, file_type, file_size, file_modified_at,
        matched_rule_id, cloud_drive_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      filename,
      originalPath,
      currentPath,
      jdFolderNumber,
      file.jd_item_id || null,
      fileExtension,
      fileType,
      file.file_size || null,
      file.file_modified_at || null,
      file.matched_rule_id || null,
      cloudDriveId,
      status,
    ]);

    stmt.free();

    const newId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

    // Increment rule match count if a rule was used
    if (file.matched_rule_id) {
      incrementRuleMatchCount(file.matched_rule_id);
    }

    logActivity('organize', 'file', filename, `Organized file to ${jdFolderNumber || currentPath}`);
    saveDatabase();

    return newId;
  } catch (error) {
    if (error.name === 'ValidationError' || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to record organized file: ${error.message}`, 'insert');
  }
}

/**
 * Mark an organized file as undone (for undo functionality).
 *
 * @param {number} fileId - The file record ID
 */
export function markFileUndone(fileId) {
  const id = validatePositiveInteger(fileId, 'File ID');

  db.run("UPDATE organized_files SET status = 'undone' WHERE id = ?", [id]);

  const file = getOrganizedFile(id);
  if (file) {
    logActivity('undo', 'file', file.filename, `Undid organization of ${file.filename}`);
  }

  saveDatabase();
}

/**
 * Update an organized file record.
 *
 * @param {number} fileId - The file record ID
 * @param {Object} updates - Fields to update
 */
export function updateOrganizedFile(fileId, updates) {
  const id = validatePositiveInteger(fileId, 'File ID');

  const allowedFields = ['status', 'current_path', 'jd_folder_number'];
  const updateParts = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      updateParts.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (updateParts.length === 0) {
    return;
  }

  values.push(id);
  db.run(`UPDATE organized_files SET ${updateParts.join(', ')} WHERE id = ?`, values);
  saveDatabase();
}

/**
 * Get recent organized files for undo history.
 *
 * @param {number} limit - Max number of files to return
 * @returns {Array} Recent organized files
 */
export function getRecentOrganizedFiles(limit = 20) {
  return getOrganizedFiles({ status: 'moved', limit });
}

/**
 * Get statistics about organized files.
 *
 * @returns {Object} Statistics object
 */
export function getOrganizedFilesStats() {
  const totalMoved =
    db.exec("SELECT COUNT(*) FROM organized_files WHERE status = 'moved'")[0]?.values[0][0] || 0;
  const totalTracked =
    db.exec("SELECT COUNT(*) FROM organized_files WHERE status = 'tracked'")[0]?.values[0][0] || 0;
  const totalUndone =
    db.exec("SELECT COUNT(*) FROM organized_files WHERE status = 'undone'")[0]?.values[0][0] || 0;
  const totalSize =
    db.exec("SELECT SUM(file_size) FROM organized_files WHERE status = 'moved'")[0]?.values[0][0] ||
    0;

  // Get breakdown by file type
  const byTypeResults = db.exec(`
    SELECT file_type, COUNT(*) as count 
    FROM organized_files 
    WHERE status = 'moved' AND file_type IS NOT NULL
    GROUP BY file_type 
    ORDER BY count DESC
  `);

  const byType =
    byTypeResults[0]?.values.reduce((acc, row) => {
      acc[row[0]] = row[1];
      return acc;
    }, {}) || {};

  // Get breakdown by JD folder
  const byFolderResults = db.exec(`
    SELECT jd_folder_number, COUNT(*) as count 
    FROM organized_files 
    WHERE status = 'moved' AND jd_folder_number IS NOT NULL
    GROUP BY jd_folder_number 
    ORDER BY count DESC
    LIMIT 10
  `);

  const topFolders =
    byFolderResults[0]?.values.map((row) => ({
      folder_number: row[0],
      count: row[1],
    })) || [];

  return {
    totalMoved,
    totalTracked,
    totalUndone,
    totalSize,
    byType,
    topFolders,
  };
}

// ============================================
// SCANNED FILES - Temporary Working Set
// ============================================

/**
 * Generate a unique scan session ID.
 * @returns {string} Session ID like "scan_1705123456789"
 */
export function generateScanSessionId() {
  return `scan_${Date.now()}`;
}

/**
 * Clear all scanned files from a previous session.
 * Call this before starting a new scan.
 *
 * @param {string} [sessionId] - Clear specific session, or all if not provided
 */
export function clearScannedFiles(sessionId = null) {
  if (sessionId) {
    const id = sanitizeText(sessionId);
    db.run(`DELETE FROM scanned_files WHERE scan_session_id = '${id}'`);
  } else {
    db.run('DELETE FROM scanned_files');
  }
  saveDatabase();
}

/**
 * Add a scanned file to the working set.
 *
 * @param {Object} file - The scanned file data
 * @param {string} file.scan_session_id - Current scan session ID
 * @param {string} file.filename - The filename
 * @param {string} file.path - Full path to the file
 * @param {string} [file.parent_folder] - Parent folder path
 * @param {string} [file.file_extension] - File extension
 * @param {string} [file.file_type] - File type category
 * @param {number} [file.file_size] - File size in bytes
 * @param {string} [file.file_modified_at] - File modification date
 * @param {string} [file.suggested_jd_folder] - Suggested JD folder
 * @param {number} [file.suggested_rule_id] - Rule that made the suggestion
 * @param {string} [file.suggestion_confidence] - none, low, medium, high
 * @returns {number} The record ID
 */
export function addScannedFile(file) {
  const sessionId = validateRequiredString(file.scan_session_id, 'Session ID', 50);
  const filename = validateRequiredString(file.filename, 'Filename', 500);
  const path = validateRequiredString(file.path, 'Path', 1000);

  const stmt = db.prepare(`
    INSERT INTO scanned_files (
      scan_session_id, filename, path, parent_folder, file_extension,
      file_type, file_size, file_modified_at, suggested_jd_folder,
      suggested_rule_id, suggestion_confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const confidence = ['none', 'low', 'medium', 'high'].includes(file.suggestion_confidence)
    ? file.suggestion_confidence
    : 'none';

  stmt.run([
    sessionId,
    filename,
    path,
    file.parent_folder || null,
    file.file_extension || null,
    file.file_type || null,
    file.file_size || null,
    file.file_modified_at || null,
    file.suggested_jd_folder || null,
    file.suggested_rule_id || null,
    confidence,
  ]);

  stmt.free();

  // Don't save after each file - caller should batch save
  return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
}

/**
 * Batch add multiple scanned files (more efficient).
 *
 * @param {Array} files - Array of file objects
 * @returns {number} Number of files added
 */
export function addScannedFilesBatch(files) {
  if (!Array.isArray(files) || files.length === 0) return 0;

  let count = 0;

  for (const file of files) {
    try {
      addScannedFile(file);
      count++;
    } catch (e) {
      console.warn(`[JDex DB] Skipped invalid file: ${e.message}`);
    }
  }

  saveDatabase();
  return count;
}

/**
 * Get scanned files for the current session.
 *
 * @param {string} sessionId - The scan session ID
 * @param {Object} options - Filter options
 * @param {string} [options.decision] - Filter by user decision
 * @param {string} [options.fileType] - Filter by file type
 * @param {boolean} [options.hasSuggestion] - Only files with suggestions
 * @returns {Array} Array of scanned file objects
 */
export function getScannedFiles(sessionId, options = {}) {
  const id = validateRequiredString(sessionId, 'Session ID', 50);
  const { decision, fileType, hasSuggestion } = options;

  let query = `SELECT * FROM scanned_files WHERE scan_session_id = '${sanitizeText(id)}'`;

  if (decision && ['pending', 'accepted', 'changed', 'skipped'].includes(decision)) {
    query += ` AND user_decision = '${decision}'`;
  }

  if (fileType) {
    query += ` AND file_type = '${sanitizeText(fileType)}'`;
  }

  if (hasSuggestion === true) {
    query += ' AND suggested_jd_folder IS NOT NULL';
  } else if (hasSuggestion === false) {
    query += ' AND suggested_jd_folder IS NULL';
  }

  query += ' ORDER BY filename ASC';

  const results = db.exec(query);
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      scan_session_id: row[1],
      filename: row[2],
      path: row[3],
      parent_folder: row[4],
      file_extension: row[5],
      file_type: row[6],
      file_size: row[7],
      file_modified_at: row[8],
      suggested_jd_folder: row[9],
      suggested_rule_id: row[10],
      suggestion_confidence: row[11],
      user_decision: row[12],
      user_target_folder: row[13],
      scanned_at: row[14],
    })) || []
  );
}

/**
 * Update a scanned file's user decision.
 *
 * @param {number} fileId - The scanned file ID
 * @param {string} decision - accepted, changed, skipped
 * @param {string} [targetFolder] - Target folder if changed
 */
export function updateScannedFileDecision(fileId, decision, targetFolder = null) {
  const id = validatePositiveInteger(fileId, 'File ID');

  if (!['pending', 'accepted', 'changed', 'skipped'].includes(decision)) {
    throw new DatabaseError('Invalid decision value', 'update');
  }

  const folder = targetFolder ? sanitizeText(targetFolder) : null;

  db.run(
    `
    UPDATE scanned_files 
    SET user_decision = ?, user_target_folder = ?
    WHERE id = ?
  `,
    [decision, folder, id]
  );

  saveDatabase();
}

/**
 * Accept a suggestion (shorthand for updateScannedFileDecision).
 *
 * @param {number} fileId - The scanned file ID
 */
export function acceptScannedFileSuggestion(fileId) {
  updateScannedFileDecision(fileId, 'accepted');
}

/**
 * Skip a scanned file (don't organize it).
 *
 * @param {number} fileId - The scanned file ID
 */
export function skipScannedFile(fileId) {
  updateScannedFileDecision(fileId, 'skipped');
}

/**
 * Change a scanned file's target folder.
 *
 * @param {number} fileId - The scanned file ID
 * @param {string} targetFolder - The new target folder
 */
export function changeScannedFileTarget(fileId, targetFolder) {
  updateScannedFileDecision(fileId, 'changed', targetFolder);
}

/**
 * Get statistics for the current scan session.
 *
 * @param {string} sessionId - The scan session ID
 * @returns {Object} Scan statistics
 */
export function getScanStats(sessionId) {
  const id = sanitizeText(sessionId);

  const total =
    db.exec(`SELECT COUNT(*) FROM scanned_files WHERE scan_session_id = '${id}'`)[0]
      ?.values[0][0] || 0;
  const pending =
    db.exec(
      `SELECT COUNT(*) FROM scanned_files WHERE scan_session_id = '${id}' AND user_decision = 'pending'`
    )[0]?.values[0][0] || 0;
  const accepted =
    db.exec(
      `SELECT COUNT(*) FROM scanned_files WHERE scan_session_id = '${id}' AND user_decision = 'accepted'`
    )[0]?.values[0][0] || 0;
  const changed =
    db.exec(
      `SELECT COUNT(*) FROM scanned_files WHERE scan_session_id = '${id}' AND user_decision = 'changed'`
    )[0]?.values[0][0] || 0;
  const skipped =
    db.exec(
      `SELECT COUNT(*) FROM scanned_files WHERE scan_session_id = '${id}' AND user_decision = 'skipped'`
    )[0]?.values[0][0] || 0;
  const withSuggestions =
    db.exec(
      `SELECT COUNT(*) FROM scanned_files WHERE scan_session_id = '${id}' AND suggested_jd_folder IS NOT NULL`
    )[0]?.values[0][0] || 0;
  const totalSize =
    db.exec(`SELECT SUM(file_size) FROM scanned_files WHERE scan_session_id = '${id}'`)[0]
      ?.values[0][0] || 0;

  // By file type
  const byTypeResults = db.exec(`
    SELECT file_type, COUNT(*) 
    FROM scanned_files 
    WHERE scan_session_id = '${id}' AND file_type IS NOT NULL
    GROUP BY file_type
  `);

  const byType =
    byTypeResults[0]?.values.reduce((acc, row) => {
      acc[row[0]] = row[1];
      return acc;
    }, {}) || {};

  return {
    total,
    pending,
    accepted,
    changed,
    skipped,
    withSuggestions,
    withoutSuggestions: total - withSuggestions,
    totalSize,
    byType,
  };
}

/**
 * Get files that are ready to be organized (accepted or changed).
 *
 * @param {string} sessionId - The scan session ID
 * @returns {Array} Files ready for organization
 */
export function getFilesReadyToOrganize(sessionId) {
  const id = sanitizeText(sessionId);

  const results = db.exec(`
    SELECT * FROM scanned_files 
    WHERE scan_session_id = '${id}' 
    AND user_decision IN ('accepted', 'changed')
    ORDER BY filename
  `);

  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      scan_session_id: row[1],
      filename: row[2],
      path: row[3],
      parent_folder: row[4],
      file_extension: row[5],
      file_type: row[6],
      file_size: row[7],
      file_modified_at: row[8],
      suggested_jd_folder: row[9],
      suggested_rule_id: row[10],
      suggestion_confidence: row[11],
      user_decision: row[12],
      user_target_folder: row[13],
      scanned_at: row[14],
      // The final target: user override or suggestion
      final_target: row[13] || row[9],
    })) || []
  );
}

// ============================================
// ACTIVITY LOG - Now in db/repositories/activity-log.js
// STATS
// ============================================

export function getStats() {
  const totalFolders = db.exec('SELECT COUNT(*) FROM folders')[0]?.values[0][0] || 0;
  const totalItems = db.exec('SELECT COUNT(*) FROM items')[0]?.values[0][0] || 0;
  const totalCategories = db.exec('SELECT COUNT(*) FROM categories')[0]?.values[0][0] || 0;

  // Folder stats by sensitivity
  const sensitiveFolders =
    db.exec("SELECT COUNT(*) FROM folders WHERE sensitivity = 'sensitive'")[0]?.values[0][0] || 0;
  const workFolders =
    db.exec("SELECT COUNT(*) FROM folders WHERE sensitivity = 'work'")[0]?.values[0][0] || 0;

  // Item stats - need to compute effective sensitivity
  const inheritItems =
    db.exec("SELECT COUNT(*) FROM items WHERE sensitivity = 'inherit'")[0]?.values[0][0] || 0;
  const sensitiveItems =
    db.exec("SELECT COUNT(*) FROM items WHERE sensitivity = 'sensitive'")[0]?.values[0][0] || 0;
  const workItems =
    db.exec("SELECT COUNT(*) FROM items WHERE sensitivity = 'work'")[0]?.values[0][0] || 0;

  return {
    totalFolders,
    totalItems,
    totalCategories,
    sensitiveFolders,
    workFolders,
    standardFolders: totalFolders - sensitiveFolders - workFolders,
    inheritItems,
    sensitiveItems,
    workItems,
    standardItems: totalItems - inheritItems - sensitiveItems - workItems,
  };
}

// ============================================
// WATCHED FOLDERS CRUD (Premium Feature)
// ============================================

/**
 * Get all watched folders.
 *
 * @param {Object} options - Filter options
 * @param {boolean} options.activeOnly - Only return active watchers
 * @returns {Array} Array of watched folder objects
 */
export function getWatchedFolders(options = {}) {
  let sql = 'SELECT * FROM watched_folders';
  const conditions = [];

  if (options.activeOnly) {
    conditions.push('is_active = 1');
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY created_at DESC';

  const result = db.exec(sql);
  if (!result[0]) return [];

  return result[0].values.map((row) => {
    const obj = {};
    result[0].columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    // Parse file_types JSON if present
    if (obj.file_types) {
      try {
        obj.file_types = JSON.parse(obj.file_types);
      } catch {
        obj.file_types = [];
      }
    }
    return obj;
  });
}

/**
 * Get a watched folder by ID.
 *
 * @param {number} id - The watched folder ID
 * @returns {Object|null} The watched folder or null
 */
export function getWatchedFolder(id) {
  const folderId = validatePositiveInteger(id, 'Watched Folder ID');

  const result = db.exec(`SELECT * FROM watched_folders WHERE id = ${folderId}`);
  if (!result[0]?.values?.[0]) return null;

  const obj = {};
  result[0].columns.forEach((col, i) => {
    obj[col] = result[0].values[0][i];
  });

  // Parse file_types JSON if present
  if (obj.file_types) {
    try {
      obj.file_types = JSON.parse(obj.file_types);
    } catch {
      obj.file_types = [];
    }
  }

  return obj;
}

/**
 * Get a watched folder by path.
 *
 * @param {string} path - The folder path
 * @returns {Object|null} The watched folder or null
 */
export function getWatchedFolderByPath(path) {
  const sanitizedPath = sanitizeText(path);

  const result = db.exec(`SELECT * FROM watched_folders WHERE path = '${sanitizedPath}'`);
  if (!result[0]?.values?.[0]) return null;

  const obj = {};
  result[0].columns.forEach((col, i) => {
    obj[col] = result[0].values[0][i];
  });

  return obj;
}

/**
 * Create a new watched folder.
 *
 * @param {Object} folder - The folder configuration
 * @returns {number} The new folder ID
 */
export function createWatchedFolder(folder) {
  const name = validateRequiredString(folder.name, 'Name', 100);
  const path = validateRequiredString(folder.path, 'Path', 500);
  const isActive = folder.is_active !== undefined ? (folder.is_active ? 1 : 0) : 1;
  const autoOrganize = folder.auto_organize ? 1 : 0;
  const confidenceThreshold = folder.confidence_threshold || 'medium';
  const includeSubdirs = folder.include_subdirs ? 1 : 0;
  const fileTypes = folder.file_types ? JSON.stringify(folder.file_types) : null;
  const notifyOnOrganize =
    folder.notify_on_organize !== undefined ? (folder.notify_on_organize ? 1 : 0) : 1;

  // Validate confidence threshold
  const validThresholds = ['low', 'medium', 'high'];
  if (!validThresholds.includes(confidenceThreshold)) {
    throw new DatabaseError(`Invalid confidence threshold: ${confidenceThreshold}`);
  }

  db.run(
    `
    INSERT INTO watched_folders (name, path, is_active, auto_organize, confidence_threshold, 
                                  include_subdirs, file_types, notify_on_organize)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      name,
      path,
      isActive,
      autoOrganize,
      confidenceThreshold,
      includeSubdirs,
      fileTypes,
      notifyOnOrganize,
    ]
  );

  const result = db.exec('SELECT last_insert_rowid()');
  const newId = result[0].values[0][0];

  saveDatabase();
  return newId;
}

/**
 * Update a watched folder.
 *
 * @param {number} id - The folder ID
 * @param {Object} updates - Fields to update
 */
export function updateWatchedFolder(id, updates) {
  const folderId = validatePositiveInteger(id, 'Watched Folder ID');

  const allowedFields = [
    'name',
    'path',
    'is_active',
    'auto_organize',
    'confidence_threshold',
    'include_subdirs',
    'file_types',
    'notify_on_organize',
    'last_checked_at',
    'files_processed',
    'files_organized',
  ];

  const updateParts = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      updateParts.push(`${key} = ?`);

      // Handle special cases
      if (key === 'file_types' && Array.isArray(value)) {
        values.push(JSON.stringify(value));
      } else if (
        ['is_active', 'auto_organize', 'include_subdirs', 'notify_on_organize'].includes(key)
      ) {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }
  }

  if (updateParts.length === 0) return;

  updateParts.push('updated_at = CURRENT_TIMESTAMP');

  db.run(
    `
    UPDATE watched_folders 
    SET ${updateParts.join(', ')}
    WHERE id = ?
  `,
    [...values, folderId]
  );

  saveDatabase();
}

/**
 * Delete a watched folder.
 *
 * @param {number} id - The folder ID
 */
export function deleteWatchedFolder(id) {
  const folderId = validatePositiveInteger(id, 'Watched Folder ID');

  db.run('DELETE FROM watched_folders WHERE id = ?', [folderId]);
  saveDatabase();
}

/**
 * Increment the processed/organized counts for a watched folder.
 *
 * @param {number} id - The folder ID
 * @param {boolean} organized - Whether the file was organized (true) or just processed (false)
 */
export function incrementWatchedFolderStats(id, organized = false) {
  const folderId = validatePositiveInteger(id, 'Watched Folder ID');

  if (organized) {
    db.run(
      `
      UPDATE watched_folders 
      SET files_processed = files_processed + 1,
          files_organized = files_organized + 1,
          last_checked_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [folderId]
    );
  } else {
    db.run(
      `
      UPDATE watched_folders 
      SET files_processed = files_processed + 1,
          last_checked_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [folderId]
    );
  }

  saveDatabase();
}

// ============================================
// WATCH ACTIVITY CRUD
// ============================================

/**
 * Log a watch activity event.
 *
 * @param {Object} activity - The activity to log
 * @returns {number} The new activity ID
 */
export function logWatchActivity(activity) {
  const watchedFolderId = validatePositiveInteger(activity.watched_folder_id, 'Watched Folder ID');
  const filename = validateRequiredString(activity.filename, 'Filename', 255);
  const path = validateRequiredString(activity.path, 'Path', 500);
  const action = validateRequiredString(activity.action, 'Action', 20);

  // Validate action
  const validActions = ['detected', 'queued', 'auto_organized', 'skipped', 'error'];
  if (!validActions.includes(action)) {
    throw new DatabaseError(`Invalid action: ${action}`);
  }

  db.run(
    `
    INSERT INTO watch_activity (watched_folder_id, filename, path, file_extension, file_type,
                                 file_size, action, matched_rule_id, target_folder, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      watchedFolderId,
      filename,
      path,
      activity.file_extension || null,
      activity.file_type || null,
      activity.file_size || null,
      action,
      activity.matched_rule_id || null,
      activity.target_folder || null,
      activity.error_message || null,
    ]
  );

  const result = db.exec('SELECT last_insert_rowid()');
  const newId = result[0].values[0][0];

  saveDatabase();
  return newId;
}

/**
 * Get watch activity for a folder.
 *
 * @param {number} watchedFolderId - The watched folder ID
 * @param {Object} options - Filter options
 * @returns {Array} Array of activity objects
 */
export function getWatchActivity(watchedFolderId, options = {}) {
  const folderId = validatePositiveInteger(watchedFolderId, 'Watched Folder ID');
  const limit = options.limit || 100;

  let sql = `
    SELECT wa.*, wf.name as folder_name, r.name as rule_name
    FROM watch_activity wa
    LEFT JOIN watched_folders wf ON wa.watched_folder_id = wf.id
    LEFT JOIN organization_rules r ON wa.matched_rule_id = r.id
    WHERE wa.watched_folder_id = ${folderId}
  `;

  if (options.action) {
    sql += ` AND wa.action = '${sanitizeText(options.action)}'`;
  }

  sql += ` ORDER BY wa.created_at DESC LIMIT ${limit}`;

  const result = db.exec(sql);
  if (!result[0]) return [];

  return result[0].values.map((row) => {
    const obj = {};
    result[0].columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * Get recent watch activity across all folders.
 *
 * @param {Object} options - Filter options
 * @returns {Array} Array of activity objects
 */
export function getRecentWatchActivity(options = {}) {
  const limit = options.limit || 50;

  let sql = `
    SELECT wa.*, wf.name as folder_name, r.name as rule_name
    FROM watch_activity wa
    LEFT JOIN watched_folders wf ON wa.watched_folder_id = wf.id
    LEFT JOIN organization_rules r ON wa.matched_rule_id = r.id
  `;

  const conditions = [];

  if (options.action) {
    conditions.push(`wa.action = '${sanitizeText(options.action)}'`);
  }

  if (options.since) {
    conditions.push(`wa.created_at >= '${sanitizeText(options.since)}'`);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ` ORDER BY wa.created_at DESC LIMIT ${limit}`;

  const result = db.exec(sql);
  if (!result[0]) return [];

  return result[0].values.map((row) => {
    const obj = {};
    result[0].columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * Get counts of queued files (files detected but not yet organized).
 *
 * @returns {Object} Counts by watched folder
 */
export function getQueuedFileCounts() {
  const sql = `
    SELECT wf.id, wf.name, wf.path, COUNT(wa.id) as queued_count
    FROM watched_folders wf
    LEFT JOIN watch_activity wa ON wf.id = wa.watched_folder_id AND wa.action = 'queued'
    WHERE wf.is_active = 1
    GROUP BY wf.id
  `;

  const result = db.exec(sql);
  if (!result[0]) return [];

  return result[0].values.map((row) => {
    const obj = {};
    result[0].columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * Clear old watch activity (for maintenance).
 *
 * @param {number} daysOld - Delete activity older than this many days
 */
export function clearOldWatchActivity(daysOld = 30) {
  db.run(`
    DELETE FROM watch_activity 
    WHERE created_at < datetime('now', '-${daysOld} days')
  `);
  saveDatabase();
}

// ============================================
// DATABASE UTILITIES
// ============================================

export function executeSQL(sql) {
  try {
    const results = db.exec(sql);
    saveDatabase();
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function getTables() {
  const results = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  return results[0]?.values.map((row) => row[0]) || [];
}

export function getTableData(tableName) {
  const validTables = [
    'areas',
    'categories',
    'folders',
    'items',
    'storage_locations',
    'activity_log',
  ];
  if (!validTables.includes(tableName)) {
    return { columns: [], rows: [] };
  }

  const results = db.exec(`SELECT * FROM ${tableName}`);
  if (!results[0]) return { columns: [], rows: [] };

  return {
    columns: results[0].columns,
    rows: results[0].values,
  };
}

// ============================================
// EXPORT/IMPORT
// ============================================

export function exportDatabase() {
  const data = db.export();
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `jdex-v2-backup-${new Date().toISOString().split('T')[0]}.sqlite`;
  a.click();

  URL.revokeObjectURL(url);
}

export async function importDatabase(file) {
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  db = new SQL.Database(uint8Array);
  saveDatabase();

  return true;
}

export function exportToJSON() {
  const data = {
    exported_at: new Date().toISOString(),
    version: '2.0',
    schema: '4-level (Area > Category > Folder > Item)',
    areas: getAreas(),
    categories: getCategories(),
    folders: getFolders(),
    items: getItems(),
    storage_locations: getStorageLocations(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `jdex-v2-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

// Reset database (for development/testing)
export function resetDatabase() {
  localStorage.removeItem(STORAGE_KEY);
  db = new SQL.Database();
  initializeSchema(db);
  seedSchemaData(db);
  saveDatabase();
  return true;
}
