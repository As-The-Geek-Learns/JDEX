/**
 * Folders Repository
 * ==================
 * CRUD operations for JD Folders (third-level organizational units).
 */

import {
  requireDB,
  saveDatabase,
  mapResults,
  validatePositiveInteger,
  buildUpdateQuery,
} from './utils.js';
import { logActivity } from './activity-log.js';
import { DatabaseError } from '../../utils/errors.js';
import { sanitizeText } from '../../utils/validation.js';
import type { SensitivityLevel } from '../schema/constants.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Folder record with category/area info.
 */
export interface Folder {
  id: number;
  folder_number: string;
  category_id: number;
  sequence: number;
  name: string;
  description: string | null;
  sensitivity: SensitivityLevel;
  location: string | null;
  storage_path: string | null;
  keywords: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category_number: number;
  category_name: string;
  area_name: string;
  area_color: string;
}

/**
 * Input for creating a folder.
 */
export interface CreateFolderInput {
  folder_number: string;
  category_id: number;
  sequence: number;
  name: string;
  description?: string;
  sensitivity?: SensitivityLevel;
  location?: string;
  storage_path?: string;
  keywords?: string;
  notes?: string;
}

/**
 * Input for updating a folder.
 */
export interface UpdateFolderInput {
  folder_number?: string;
  category_id?: number;
  sequence?: number;
  name?: string;
  description?: string;
  sensitivity?: SensitivityLevel;
  location?: string;
  storage_path?: string;
  keywords?: string;
  notes?: string;
}

/**
 * Next folder number result.
 */
export interface NextFolderNumber {
  folder_number: string;
  sequence: number;
}

// ============================================
// COLUMN DEFINITIONS
// ============================================

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
] as const;

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
] as const;

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get all folders, optionally filtered by category.
 */
export function getFolders(categoryId: number | string | null = null): Folder[] {
  const db = requireDB();

  let query = `
    SELECT f.*, c.number as category_number, c.name as category_name,
           a.name as area_name, a.color as area_color
    FROM folders f
    JOIN categories c ON f.category_id = c.id
    JOIN areas a ON c.area_id = a.id
    WHERE 1=1
  `;

  const params: unknown[] = [];
  if (categoryId !== null) {
    const validCategoryId = validatePositiveInteger(categoryId, 'categoryId');
    query += ' AND f.category_id = ?';
    params.push(validCategoryId);
  }
  query += ' ORDER BY f.folder_number';

  const results = db.exec(query, params);
  return mapResults(results, FOLDER_COLUMNS) as Folder[];
}

/**
 * Get a single folder by ID.
 */
export function getFolder(id: number | string): Folder | null {
  const validId = validatePositiveInteger(id, 'id');
  const db = requireDB();

  const results = db.exec(
    `SELECT f.*, c.number as category_number, c.name as category_name,
            a.name as area_name, a.color as area_color
     FROM folders f
     JOIN categories c ON f.category_id = c.id
     JOIN areas a ON c.area_id = a.id
     WHERE f.id = ?`,
    [validId]
  );

  const mapped = mapResults(results, FOLDER_COLUMNS) as Folder[];
  return mapped[0] || null;
}

/**
 * Get a folder by its JD folder number (e.g., "11.01").
 */
export function getFolderByNumber(folderNumber: string): Folder | null {
  if (!folderNumber || typeof folderNumber !== 'string') {
    return null;
  }

  const db = requireDB();
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

  const mapped = mapResults(results, FOLDER_COLUMNS) as Folder[];
  return mapped[0] || null;
}

/**
 * Get the next available folder number for a category.
 */
export function getNextFolderNumber(categoryId: number | string): NextFolderNumber | null {
  const validCategoryId = validatePositiveInteger(categoryId, 'categoryId');
  const db = requireDB();

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

  const lastSeq = existing[0]?.values?.[0]?.[0];
  const nextSeq = typeof lastSeq === 'number' ? lastSeq + 1 : 1;
  const seqStr = String(nextSeq).padStart(2, '0');

  return { folder_number: `${catStr}.${seqStr}`, sequence: nextSeq };
}

/**
 * Create a new folder.
 */
export function createFolder(folder: CreateFolderInput): number {
  const db = requireDB();

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

  const idResult = db.exec('SELECT last_insert_rowid()')[0]?.values?.[0]?.[0];
  const id = typeof idResult === 'number' ? idResult : 0;
  logActivity('create', 'folder', folder.folder_number, `Created folder: ${folder.name}`);
  saveDatabase();

  return id;
}

/**
 * Update a folder.
 */
export function updateFolder(id: number | string, updates: UpdateFolderInput): boolean {
  const validId = validatePositiveInteger(id, 'id');
  const db = requireDB();

  const query = buildUpdateQuery('folders', updates, UPDATABLE_COLUMNS);

  if (!query) return false;

  // Add updated_at timestamp
  const sql = query.sql.replace(' WHERE id = ?', ', updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  db.run(sql, [...query.values, validId]);

  // Log activity with folder info
  const folder = db.exec('SELECT folder_number, name FROM folders WHERE id = ?', [validId]);
  if (folder[0]?.values?.[0]) {
    const folderNumber = folder[0].values[0][0] as string;
    const folderName = folder[0].values[0][1] as string;
    logActivity('update', 'folder', folderNumber, `Updated: ${folderName}`);
  }

  saveDatabase();
  return true;
}

/**
 * Delete a folder.
 * @throws {DatabaseError} If folder has existing items
 */
export function deleteFolder(id: number | string): void {
  const validId = validatePositiveInteger(id, 'id');
  const db = requireDB();

  // Check for child items
  const items = db.exec('SELECT COUNT(*) FROM items WHERE folder_id = ?', [validId]);
  const count = items[0]?.values?.[0]?.[0];
  if (typeof count === 'number' && count > 0) {
    throw new DatabaseError(
      'Cannot delete folder with existing items. Delete or move items first.',
      'constraint'
    );
  }

  // Log activity before deletion
  const folder = db.exec('SELECT folder_number, name FROM folders WHERE id = ?', [validId]);
  if (folder[0]?.values?.[0]) {
    const folderNumber = folder[0].values[0][0] as string;
    const folderName = folder[0].values[0][1] as string;
    logActivity('delete', 'folder', folderNumber, `Deleted: ${folderName}`);
  }

  db.run('DELETE FROM folders WHERE id = ?', [validId]);
  saveDatabase();
}

/**
 * Get folder count.
 */
export function getFolderCount(categoryId: number | string | null = null): number {
  const db = requireDB();

  if (categoryId !== null) {
    const validCategoryId = validatePositiveInteger(categoryId, 'categoryId');
    const results = db.exec('SELECT COUNT(*) FROM folders WHERE category_id = ?', [
      validCategoryId,
    ]);
    const count = results[0]?.values?.[0]?.[0];
    return typeof count === 'number' ? count : 0;
  }

  const results = db.exec('SELECT COUNT(*) FROM folders');
  const count = results[0]?.values?.[0]?.[0];
  return typeof count === 'number' ? count : 0;
}

/**
 * Check if a folder number is available.
 */
export function isFolderNumberAvailable(
  folderNumber: string,
  excludeId: number | string | null = null
): boolean {
  const db = requireDB();
  let query = 'SELECT COUNT(*) FROM folders WHERE folder_number = ?';
  const params: unknown[] = [folderNumber];

  if (excludeId !== null) {
    const validExcludeId = validatePositiveInteger(excludeId, 'excludeId');
    query += ' AND id != ?';
    params.push(validExcludeId);
  }

  const results = db.exec(query, params);
  const count = results[0]?.values?.[0]?.[0];
  return (typeof count === 'number' ? count : 0) === 0;
}
