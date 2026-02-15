/**
 * Categories Repository
 * =====================
 * CRUD operations for JD Categories (second-level organizational units).
 */

import {
  requireDB,
  saveDatabase,
  mapResults,
  validatePositiveInteger,
  buildUpdateQuery,
  getLastInsertId,
} from './utils.js';
import { logActivity } from './activity-log.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Category record with area info.
 */
export interface Category {
  id: number;
  number: number;
  area_id: number;
  name: string;
  description: string | null;
  created_at: string;
  area_name: string;
  area_color: string;
}

/**
 * Input for creating a category.
 */
export interface CreateCategoryInput {
  number: number;
  area_id: number;
  name: string;
  description?: string;
}

/**
 * Input for updating a category.
 */
export interface UpdateCategoryInput {
  number?: number;
  area_id?: number;
  name?: string;
  description?: string;
}

// ============================================
// COLUMN DEFINITIONS
// ============================================

const CATEGORY_COLUMNS = [
  'id',
  'number',
  'area_id',
  'name',
  'description',
  'created_at',
  'area_name',
  'area_color',
] as const;

const UPDATABLE_COLUMNS = ['number', 'area_id', 'name', 'description'] as const;

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get all categories, optionally filtered by area.
 */
export function getCategories(areaId: number | string | null = null): Category[] {
  const db = requireDB();

  let query = `SELECT c.id, c.number, c.area_id, c.name, c.description, c.created_at,
               a.name as area_name, a.color as area_color
               FROM categories c
               JOIN areas a ON c.area_id = a.id`;

  const params: unknown[] = [];
  if (areaId !== null) {
    const validAreaId = validatePositiveInteger(areaId, 'areaId');
    query += ' WHERE c.area_id = ?';
    params.push(validAreaId);
  }
  query += ' ORDER BY c.number';

  const results = db.exec(query, params);
  return mapResults(results, CATEGORY_COLUMNS) as Category[];
}

/**
 * Get a single category by ID.
 */
export function getCategory(id: number | string): Category | null {
  const validId = validatePositiveInteger(id, 'id');
  const db = requireDB();
  const results = db.exec(
    `SELECT c.id, c.number, c.area_id, c.name, c.description, c.created_at,
            a.name as area_name, a.color as area_color
     FROM categories c
     JOIN areas a ON c.area_id = a.id
     WHERE c.id = ?`,
    [validId]
  );
  const mapped = mapResults(results, CATEGORY_COLUMNS) as Category[];
  return mapped[0] || null;
}

/**
 * Get a category by its JD number.
 */
export function getCategoryByNumber(number: number): Category | null {
  const db = requireDB();
  const results = db.exec(
    `SELECT c.id, c.number, c.area_id, c.name, c.description, c.created_at,
            a.name as area_name, a.color as area_color
     FROM categories c
     JOIN areas a ON c.area_id = a.id
     WHERE c.number = ?`,
    [number]
  );
  const mapped = mapResults(results, CATEGORY_COLUMNS) as Category[];
  return mapped[0] || null;
}

/**
 * Create a new category.
 */
export function createCategory(category: CreateCategoryInput): number {
  const db = requireDB();
  db.run('INSERT INTO categories (number, area_id, name, description) VALUES (?, ?, ?, ?)', [
    category.number,
    category.area_id,
    category.name,
    category.description || '',
  ]);
  const id = getLastInsertId();
  logActivity(
    'create',
    'category',
    category.number.toString(),
    `Created category: ${category.name}`
  );
  saveDatabase();
  return id;
}

/**
 * Update a category.
 */
export function updateCategory(id: number | string, updates: UpdateCategoryInput): boolean {
  const validId = validatePositiveInteger(id, 'id');
  const db = requireDB();

  const query = buildUpdateQuery('categories', updates, UPDATABLE_COLUMNS);

  if (!query) return false;

  db.run(query.sql, [...query.values, validId]);
  logActivity('update', 'category', validId.toString(), `Updated category ID: ${validId}`);
  saveDatabase();
  return true;
}

/**
 * Delete a category.
 * @throws {DatabaseError} If category has existing folders
 */
export function deleteCategory(id: number | string): void {
  const validId = validatePositiveInteger(id, 'id');
  const db = requireDB();

  // Check for child folders
  const folders = db.exec('SELECT COUNT(*) FROM folders WHERE category_id = ?', [validId]);
  const count = folders[0]?.values?.[0]?.[0];
  if (typeof count === 'number' && count > 0) {
    throw new DatabaseError(
      'Cannot delete category with existing folders. Delete or move folders first.',
      'constraint'
    );
  }

  db.run('DELETE FROM categories WHERE id = ?', [validId]);
  logActivity('delete', 'category', validId.toString(), `Deleted category ID: ${validId}`);
  saveDatabase();
}

/**
 * Get category count.
 */
export function getCategoryCount(areaId: number | string | null = null): number {
  const db = requireDB();

  if (areaId !== null) {
    const validAreaId = validatePositiveInteger(areaId, 'areaId');
    const results = db.exec('SELECT COUNT(*) FROM categories WHERE area_id = ?', [validAreaId]);
    const count = results[0]?.values?.[0]?.[0];
    return typeof count === 'number' ? count : 0;
  }

  const results = db.exec('SELECT COUNT(*) FROM categories');
  const count = results[0]?.values?.[0]?.[0];
  return typeof count === 'number' ? count : 0;
}

/**
 * Check if a category number is available.
 */
export function isCategoryNumberAvailable(
  number: number,
  excludeId: number | string | null = null
): boolean {
  const db = requireDB();
  let query = 'SELECT COUNT(*) FROM categories WHERE number = ?';
  const params: unknown[] = [number];

  if (excludeId !== null) {
    const validExcludeId = validatePositiveInteger(excludeId, 'excludeId');
    query += ' AND id != ?';
    params.push(validExcludeId);
  }

  const results = db.exec(query, params);
  const count = results[0]?.values?.[0]?.[0];
  return (typeof count === 'number' ? count : 0) === 0;
}
