/**
 * Items Repository
 * =================
 * CRUD operations for JD Items (fourth-level organizational units).
 */

import {
  getDB,
  saveDatabase,
  mapResults,
  validatePositiveInteger,
  buildUpdateQuery,
} from './utils.js';
import { logActivity } from './activity-log.js';

// Column definitions for items with joins
const ITEM_COLUMNS = [
  'id',
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
  'created_at',
  'updated_at',
  'folder_number',
  'folder_name',
  'folder_sensitivity',
  'category_number',
  'category_name',
  'area_name',
  'area_color',
];

// Valid columns for updates
const UPDATABLE_COLUMNS = [
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

/**
 * Map raw row to item object with effective sensitivity.
 * @param {Object} item - Raw item object from mapResults
 * @returns {Object} Item with effective_sensitivity computed
 */
function addEffectiveSensitivity(item) {
  return {
    ...item,
    effective_sensitivity:
      item.sensitivity === 'inherit' ? item.folder_sensitivity : item.sensitivity,
  };
}

/**
 * Get all items, optionally filtered by folder.
 * @param {number} [folderId] - Optional folder ID to filter by
 * @returns {Array<Object>} Array of item objects with folder/category/area info
 */
export function getItems(folderId = null) {
  const db = getDB();

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

  const params = [];
  if (folderId !== null) {
    const validFolderId = validatePositiveInteger(folderId, 'folderId');
    query += ' AND i.folder_id = ?';
    params.push(validFolderId);
  }
  query += ' ORDER BY i.item_number';

  const results = db.exec(query, params);
  const items = mapResults(results, ITEM_COLUMNS);
  return items.map(addEffectiveSensitivity);
}

/**
 * Get a single item by ID.
 * @param {number} id - Item ID
 * @returns {Object|null} Item object or null if not found
 */
export function getItem(id) {
  const validId = validatePositiveInteger(id, 'id');
  const db = getDB();

  const results = db.exec(
    `SELECT i.*, f.folder_number, f.name as folder_name, f.sensitivity as folder_sensitivity,
            c.number as category_number, c.name as category_name,
            a.name as area_name, a.color as area_color
     FROM items i
     JOIN folders f ON i.folder_id = f.id
     JOIN categories c ON f.category_id = c.id
     JOIN areas a ON c.area_id = a.id
     WHERE i.id = ?`,
    [validId]
  );

  const items = mapResults(results, ITEM_COLUMNS);
  if (items.length === 0) return null;
  return addEffectiveSensitivity(items[0]);
}

/**
 * Get the next available item number for a folder.
 * @param {number} folderId - Folder ID
 * @returns {Object|null} Object with item_number and sequence, or null if folder not found
 */
export function getNextItemNumber(folderId) {
  const validFolderId = validatePositiveInteger(folderId, 'folderId');
  const db = getDB();

  const folder = db.exec('SELECT folder_number FROM folders WHERE id = ?', [validFolderId]);
  if (!folder[0]?.values?.[0]) return null;

  const folderNumber = folder[0].values[0][0];

  const existing = db.exec(
    `SELECT sequence FROM items
     WHERE folder_id = ?
     ORDER BY sequence DESC LIMIT 1`,
    [validFolderId]
  );

  const nextSeq = existing[0]?.values?.[0]?.[0] ? existing[0].values[0][0] + 1 : 1;
  const seqStr = String(nextSeq).padStart(2, '0');

  return { item_number: `${folderNumber}.${seqStr}`, sequence: nextSeq };
}

/**
 * Create a new item.
 * @param {Object} item - Item data
 * @param {string} item.item_number - JD item number (e.g., "11.01.01")
 * @param {number} item.folder_id - Parent folder ID
 * @param {number} item.sequence - Sequence number within folder
 * @param {string} item.name - Item name
 * @param {string} [item.description] - Item description
 * @param {string} [item.file_type] - File type
 * @param {string} [item.sensitivity] - Sensitivity level (default: 'inherit')
 * @param {string} [item.location] - Physical location
 * @param {string} [item.storage_path] - Storage path
 * @param {number} [item.file_size] - File size in bytes
 * @param {string} [item.keywords] - Keywords for search
 * @param {string} [item.notes] - Additional notes
 * @returns {number} ID of the created item
 */
export function createItem(item) {
  const db = getDB();

  const stmt = db.prepare(`
    INSERT INTO items (item_number, folder_id, sequence, name, description,
                       file_type, sensitivity, location, storage_path,
                       file_size, keywords, notes)
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

  const id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  logActivity('create', 'item', item.item_number, `Created item: ${item.name}`);
  saveDatabase();

  return id;
}

/**
 * Update an item.
 * @param {number} id - Item ID
 * @param {Object} updates - Fields to update
 * @returns {boolean} True if update was performed
 */
export function updateItem(id, updates) {
  const validId = validatePositiveInteger(id, 'id');
  const db = getDB();

  const query = buildUpdateQuery('items', updates, UPDATABLE_COLUMNS);

  if (!query) return false;

  // Add updated_at timestamp
  const sql = query.sql.replace(' WHERE id = ?', ', updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  db.run(sql, [...query.values, validId]);

  // Log activity with item info
  const item = db.exec('SELECT item_number, name FROM items WHERE id = ?', [validId]);
  if (item[0]?.values?.[0]) {
    logActivity('update', 'item', item[0].values[0][0], `Updated: ${item[0].values[0][1]}`);
  }

  saveDatabase();
  return true;
}

/**
 * Delete an item.
 * @param {number} id - Item ID
 */
export function deleteItem(id) {
  const validId = validatePositiveInteger(id, 'id');
  const db = getDB();

  // Log activity before deletion
  const item = db.exec('SELECT item_number, name FROM items WHERE id = ?', [validId]);
  if (item[0]?.values?.[0]) {
    logActivity('delete', 'item', item[0].values[0][0], `Deleted: ${item[0].values[0][1]}`);
  }

  db.run('DELETE FROM items WHERE id = ?', [validId]);
  saveDatabase();
}

/**
 * Get item count.
 * @param {number} [folderId] - Optional folder ID to count items for
 * @returns {number} Total number of items
 */
export function getItemCount(folderId = null) {
  const db = getDB();

  if (folderId !== null) {
    const validFolderId = validatePositiveInteger(folderId, 'folderId');
    const results = db.exec('SELECT COUNT(*) FROM items WHERE folder_id = ?', [validFolderId]);
    return results[0]?.values[0][0] || 0;
  }

  const results = db.exec('SELECT COUNT(*) FROM items');
  return results[0]?.values[0][0] || 0;
}

/**
 * Check if an item number is available.
 * @param {string} itemNumber - Item number to check
 * @param {number} [excludeId] - ID to exclude from check (for updates)
 * @returns {boolean} True if number is available
 */
export function isItemNumberAvailable(itemNumber, excludeId = null) {
  const db = getDB();
  let query = 'SELECT COUNT(*) FROM items WHERE item_number = ?';
  const params = [itemNumber];

  if (excludeId !== null) {
    const validExcludeId = validatePositiveInteger(excludeId, 'excludeId');
    query += ' AND id != ?';
    params.push(validExcludeId);
  }

  const results = db.exec(query, params);
  return (results[0]?.values[0][0] || 0) === 0;
}
