/**
 * Items Repository
 * =================
 * CRUD operations for JD Items (fourth-level organizational units).
 */

import {
  requireDB,
  saveDatabase,
  mapResults,
  validatePositiveInteger,
  buildUpdateQuery,
  RowObject,
} from './utils.js';
import { logActivity } from './activity-log.js';
import type { SensitivityLevel } from '../schema/constants.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Item record with folder/category/area info.
 */
export interface Item {
  id: number;
  item_number: string;
  folder_id: number;
  sequence: number;
  name: string;
  description: string | null;
  file_type: string | null;
  sensitivity: SensitivityLevel | 'inherit';
  location: string | null;
  storage_path: string | null;
  file_size: number | null;
  keywords: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  folder_number: string;
  folder_name: string;
  folder_sensitivity: SensitivityLevel;
  category_number: number;
  category_name: string;
  area_name: string;
  area_color: string;
  effective_sensitivity: SensitivityLevel;
}

/**
 * Input for creating an item.
 */
export interface CreateItemInput {
  item_number: string;
  folder_id: number;
  sequence: number;
  name: string;
  description?: string;
  file_type?: string;
  sensitivity?: SensitivityLevel | 'inherit';
  location?: string;
  storage_path?: string;
  file_size?: number | null;
  keywords?: string;
  notes?: string;
}

/**
 * Input for updating an item.
 */
export interface UpdateItemInput {
  item_number?: string;
  folder_id?: number;
  sequence?: number;
  name?: string;
  description?: string;
  file_type?: string;
  sensitivity?: SensitivityLevel | 'inherit';
  location?: string;
  storage_path?: string;
  file_size?: number | null;
  keywords?: string;
  notes?: string;
}

/**
 * Next item number result.
 */
export interface NextItemNumber {
  item_number: string;
  sequence: number;
}

// ============================================
// COLUMN DEFINITIONS
// ============================================

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
] as const;

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
] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map raw row to item object with effective sensitivity.
 */
function addEffectiveSensitivity(item: RowObject): Item {
  const sensitivity = item.sensitivity as string;
  const folderSensitivity = item.folder_sensitivity as SensitivityLevel;

  return {
    ...(item as unknown as Omit<Item, 'effective_sensitivity'>),
    effective_sensitivity:
      sensitivity === 'inherit' ? folderSensitivity : (sensitivity as SensitivityLevel),
  };
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get all items, optionally filtered by folder.
 */
export function getItems(folderId: number | string | null = null): Item[] {
  const db = requireDB();

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

  const params: unknown[] = [];
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
 */
export function getItem(id: number | string): Item | null {
  const validId = validatePositiveInteger(id, 'id');
  const db = requireDB();

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
 */
export function getNextItemNumber(folderId: number | string): NextItemNumber | null {
  const validFolderId = validatePositiveInteger(folderId, 'folderId');
  const db = requireDB();

  const folder = db.exec('SELECT folder_number FROM folders WHERE id = ?', [validFolderId]);
  if (!folder[0]?.values?.[0]) return null;

  const folderNumber = folder[0].values[0][0];

  const existing = db.exec(
    `SELECT sequence FROM items
     WHERE folder_id = ?
     ORDER BY sequence DESC LIMIT 1`,
    [validFolderId]
  );

  const lastSeq = existing[0]?.values?.[0]?.[0];
  const nextSeq = typeof lastSeq === 'number' ? lastSeq + 1 : 1;
  const seqStr = String(nextSeq).padStart(2, '0');

  return { item_number: `${folderNumber}.${seqStr}`, sequence: nextSeq };
}

/**
 * Create a new item.
 */
export function createItem(item: CreateItemInput): number {
  const db = requireDB();

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
    item.file_size ?? null,
    item.keywords || '',
    item.notes || '',
  ]);

  stmt.free();

  const idResult = db.exec('SELECT last_insert_rowid()')[0]?.values?.[0]?.[0];
  const id = typeof idResult === 'number' ? idResult : 0;
  logActivity('create', 'item', item.item_number, `Created item: ${item.name}`);
  saveDatabase();

  return id;
}

/**
 * Update an item.
 */
export function updateItem(id: number | string, updates: UpdateItemInput): boolean {
  const validId = validatePositiveInteger(id, 'id');
  const db = requireDB();

  const query = buildUpdateQuery('items', updates, UPDATABLE_COLUMNS);

  if (!query) return false;

  // Add updated_at timestamp
  const sql = query.sql.replace(' WHERE id = ?', ', updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  db.run(sql, [...query.values, validId]);

  // Log activity with item info
  const item = db.exec('SELECT item_number, name FROM items WHERE id = ?', [validId]);
  if (item[0]?.values?.[0]) {
    const itemNumber = item[0].values[0][0] as string;
    const itemName = item[0].values[0][1] as string;
    logActivity('update', 'item', itemNumber, `Updated: ${itemName}`);
  }

  saveDatabase();
  return true;
}

/**
 * Delete an item.
 */
export function deleteItem(id: number | string): void {
  const validId = validatePositiveInteger(id, 'id');
  const db = requireDB();

  // Log activity before deletion
  const item = db.exec('SELECT item_number, name FROM items WHERE id = ?', [validId]);
  if (item[0]?.values?.[0]) {
    const itemNumber = item[0].values[0][0] as string;
    const itemName = item[0].values[0][1] as string;
    logActivity('delete', 'item', itemNumber, `Deleted: ${itemName}`);
  }

  db.run('DELETE FROM items WHERE id = ?', [validId]);
  saveDatabase();
}

/**
 * Get item count.
 */
export function getItemCount(folderId: number | string | null = null): number {
  const db = requireDB();

  if (folderId !== null) {
    const validFolderId = validatePositiveInteger(folderId, 'folderId');
    const results = db.exec('SELECT COUNT(*) FROM items WHERE folder_id = ?', [validFolderId]);
    const count = results[0]?.values?.[0]?.[0];
    return typeof count === 'number' ? count : 0;
  }

  const results = db.exec('SELECT COUNT(*) FROM items');
  const count = results[0]?.values?.[0]?.[0];
  return typeof count === 'number' ? count : 0;
}

/**
 * Check if an item number is available.
 */
export function isItemNumberAvailable(
  itemNumber: string,
  excludeId: number | string | null = null
): boolean {
  const db = requireDB();
  let query = 'SELECT COUNT(*) FROM items WHERE item_number = ?';
  const params: unknown[] = [itemNumber];

  if (excludeId !== null) {
    const validExcludeId = validatePositiveInteger(excludeId, 'excludeId');
    query += ' AND id != ?';
    params.push(validExcludeId);
  }

  const results = db.exec(query, params);
  const count = results[0]?.values?.[0]?.[0];
  return (typeof count === 'number' ? count : 0) === 0;
}
