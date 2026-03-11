/**
 * Folders Repository
 * ==================
 * CRUD operations for JD Folders (third-level organizational units).
 */

import {
  getDB,
  saveDatabase,
  mapResults,
  validatePositiveInteger,
  buildUpdateQuery,
} from './utils.js';
import { logActivity } from './activity-log.js';
import { DatabaseError } from '../../utils/errors.js';
import { sanitizeText } from '../../utils/validation.js';

// Column definitions for folders with joins
const FOLDER_COLUMNS = [
  'id',
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
  'created_at',
  'updated_at',
  'category_number',
  'category_name',
  'area_name',
  'area_color',
];

// Valid columns for updates
const UPDATABLE_COLUMNS = [
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

/**
 * Get all folders, optionally filtered by category.
 * @param {number} [categoryId] - Optional category ID to filter by
 * @returns {Array<Object>} Array of folder objects with category/area info
 */
export function getFolders(categoryId = null) {
  const db = getDB();

  let query = `
    SELECT f.*, c.number as category_number, c.name as category_name,
           a.name as area_name, a.color as area_color
    FROM folders f
    JOIN categories c ON f.category_id = c.id
    JOIN areas a ON c.area_id = a.id
    WHERE 1=1
  `;

  const params = [];
  if (categoryId !== null) {
    const validCategoryId = validatePositiveInteger(categoryId, 'categoryId');
    query += ' AND f.category_id = ?';
    params.push(validCategoryId);
  }
  query += ' ORDER BY f.folder_number';

  const results = db.exec(query, params);
  return mapResults(results, FOLDER_COLUMNS);
}

/**
 * Get a single folder by ID.
 * @param {number} id - Folder ID
 * @returns {Object|null} Folder object or null if not found
 */
export function getFolder(id) {
  const validId = validatePositiveInteger(id, 'id');
  const db = getDB();

  const results = db.exec(
    `SELECT f.*, c.number as category_number, c.name as category_name,
            a.name as area_name, a.color as area_color
     FROM folders f
     JOIN categories c ON f.category_id = c.id
     JOIN areas a ON c.area_id = a.id
     WHERE f.id = ?`,
    [validId]
  );

  const mapped = mapResults(results, FOLDER_COLUMNS);
  return mapped[0] || null;
}

/**
 * Get a folder by its JD folder number (e.g., "11.01").
 * @param {string} folderNumber - The JD folder number
 * @returns {Object|null} Folder object or null if not found
 */
export function getFolderByNumber(folderNumber) {
  if (!folderNumber || typeof folderNumber !== 'string') {
    return null;
  }

  const db = getDB();
  const sanitized = sanitizeText(folderNumber);

  const results = db.exec(
    `SELECT f.*, c.name as category_name, c.number as category_number,
            a.name as area_name, a.color as area_color
     FROM folders f
     LEFT JOIN categories c ON f.category_id = c.id
     LEFT JOIN areas a ON c.area_id = a.id
     WHERE f.folder_number = ?
     LIMIT 1`,
    [sanitized]
  );

  const mapped = mapResults(results, FOLDER_COLUMNS);
  return mapped[0] || null;
}

/**
 * Get the next available folder number for a category.
 * @param {number} categoryId - Category ID
 * @returns {Object|null} Object with folder_number and sequence, or null if category not found
 */
export function getNextFolderNumber(categoryId) {
  const validCategoryId = validatePositiveInteger(categoryId, 'categoryId');
  const db = getDB();

  const category = db.exec('SELECT number FROM categories WHERE id = ?', [validCategoryId]);
  if (!category[0]?.values?.[0]) return null;

  const catNumber = category[0].values[0][0];
  const catStr = String(catNumber).padStart(2, '0');

  const existing = db.exec(
    `SELECT sequence FROM folders
     WHERE category_id = ?
     ORDER BY sequence DESC LIMIT 1`,
    [validCategoryId]
  );

  const nextSeq = existing[0]?.values?.[0]?.[0] ? existing[0].values[0][0] + 1 : 1;
  const seqStr = String(nextSeq).padStart(2, '0');

  return { folder_number: `${catStr}.${seqStr}`, sequence: nextSeq };
}

/**
 * Create a new folder.
 * @param {Object} folder - Folder data
 * @param {string} folder.folder_number - JD folder number (e.g., "11.01")
 * @param {number} folder.category_id - Parent category ID
 * @param {number} folder.sequence - Sequence number within category
 * @param {string} folder.name - Folder name
 * @param {string} [folder.description] - Folder description
 * @param {string} [folder.sensitivity] - Sensitivity level (default: 'standard')
 * @param {string} [folder.location] - Physical location
 * @param {string} [folder.storage_path] - Storage path
 * @param {string} [folder.keywords] - Keywords for search
 * @param {string} [folder.notes] - Additional notes
 * @returns {number} ID of the created folder
 */
export function createFolder(folder) {
  const db = getDB();

  const stmt = db.prepare(`
    INSERT INTO folders (folder_number, category_id, sequence, name, description,
                        sensitivity, location, storage_path, keywords, notes)
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

  const id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  logActivity('create', 'folder', folder.folder_number, `Created folder: ${folder.name}`);
  saveDatabase();

  return id;
}

/**
 * Update a folder.
 * @param {number} id - Folder ID
 * @param {Object} updates - Fields to update
 * @returns {boolean} True if update was performed
 */
export function updateFolder(id, updates) {
  const validId = validatePositiveInteger(id, 'id');
  const db = getDB();

  const query = buildUpdateQuery('folders', updates, UPDATABLE_COLUMNS);

  if (!query) return false;

  // Add updated_at timestamp
  const sql = query.sql.replace(' WHERE id = ?', ', updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  db.run(sql, [...query.values, validId]);

  // Log activity with folder info
  const folder = db.exec('SELECT folder_number, name FROM folders WHERE id = ?', [validId]);
  if (folder[0]?.values?.[0]) {
    logActivity('update', 'folder', folder[0].values[0][0], `Updated: ${folder[0].values[0][1]}`);
  }

  saveDatabase();
  return true;
}

/**
 * Delete a folder.
 * @param {number} id - Folder ID
 * @throws {DatabaseError} If folder has existing items
 */
export function deleteFolder(id) {
  const validId = validatePositiveInteger(id, 'id');
  const db = getDB();

  // Check for child items
  const items = db.exec('SELECT COUNT(*) FROM items WHERE folder_id = ?', [validId]);
  if (items[0]?.values[0][0] > 0) {
    throw new DatabaseError(
      'Cannot delete folder with existing items. Delete or move items first.',
      'constraint'
    );
  }

  // Log activity before deletion
  const folder = db.exec('SELECT folder_number, name FROM folders WHERE id = ?', [validId]);
  if (folder[0]?.values?.[0]) {
    logActivity('delete', 'folder', folder[0].values[0][0], `Deleted: ${folder[0].values[0][1]}`);
  }

  db.run('DELETE FROM folders WHERE id = ?', [validId]);
  saveDatabase();
}

/**
 * Get folder count.
 * @param {number} [categoryId] - Optional category ID to count folders for
 * @returns {number} Total number of folders
 */
export function getFolderCount(categoryId = null) {
  const db = getDB();

  if (categoryId !== null) {
    const validCategoryId = validatePositiveInteger(categoryId, 'categoryId');
    const results = db.exec('SELECT COUNT(*) FROM folders WHERE category_id = ?', [
      validCategoryId,
    ]);
    return results[0]?.values[0][0] || 0;
  }

  const results = db.exec('SELECT COUNT(*) FROM folders');
  return results[0]?.values[0][0] || 0;
}

/**
 * Check if a folder number is available.
 * @param {string} folderNumber - Folder number to check
 * @param {number} [excludeId] - ID to exclude from check (for updates)
 * @returns {boolean} True if number is available
 */
export function isFolderNumberAvailable(folderNumber, excludeId = null) {
  const db = getDB();
  let query = 'SELECT COUNT(*) FROM folders WHERE folder_number = ?';
  const params = [folderNumber];

  if (excludeId !== null) {
    const validExcludeId = validatePositiveInteger(excludeId, 'excludeId');
    query += ' AND id != ?';
    params.push(validExcludeId);
  }

  const results = db.exec(query, params);
  return (results[0]?.values[0][0] || 0) === 0;
}
