/**
 * Categories Repository
 * =====================
 * CRUD operations for JD Categories (second-level organizational units).
 */

import {
  getDB,
  saveDatabase,
  mapResults,
  validatePositiveInteger,
  buildUpdateQuery,
  getLastInsertId,
} from './utils.js';
import { logActivity } from './activity-log.js';
import { DatabaseError } from '../../utils/errors.js';

// Column definitions for categories with join to areas
const CATEGORY_COLUMNS = [
  'id',
  'number',
  'area_id',
  'name',
  'description',
  'created_at',
  'area_name',
  'area_color',
];

// Valid columns for updates
const UPDATABLE_COLUMNS = ['number', 'area_id', 'name', 'description'];

/**
 * Get all categories, optionally filtered by area.
 * @param {number} [areaId] - Optional area ID to filter by
 * @returns {Array<Object>} Array of category objects with area info
 */
export function getCategories(areaId = null) {
  const db = getDB();

  let query = `SELECT c.id, c.number, c.area_id, c.name, c.description, c.created_at,
               a.name as area_name, a.color as area_color
               FROM categories c
               JOIN areas a ON c.area_id = a.id`;

  const params = [];
  if (areaId !== null) {
    const validAreaId = validatePositiveInteger(areaId, 'areaId');
    query += ' WHERE c.area_id = ?';
    params.push(validAreaId);
  }
  query += ' ORDER BY c.number';

  const results = db.exec(query, params);
  return mapResults(results, CATEGORY_COLUMNS);
}

/**
 * Get a single category by ID.
 * @param {number} id - Category ID
 * @returns {Object|null} Category object with area info or null if not found
 */
export function getCategory(id) {
  const validId = validatePositiveInteger(id, 'id');
  const db = getDB();
  const results = db.exec(
    `SELECT c.id, c.number, c.area_id, c.name, c.description, c.created_at,
            a.name as area_name, a.color as area_color
     FROM categories c
     JOIN areas a ON c.area_id = a.id
     WHERE c.id = ?`,
    [validId]
  );
  const mapped = mapResults(results, CATEGORY_COLUMNS);
  return mapped[0] || null;
}

/**
 * Get a category by its JD number.
 * @param {number} number - Category number (e.g., 11, 12, 21)
 * @returns {Object|null} Category object or null if not found
 */
export function getCategoryByNumber(number) {
  const db = getDB();
  const results = db.exec(
    `SELECT c.id, c.number, c.area_id, c.name, c.description, c.created_at,
            a.name as area_name, a.color as area_color
     FROM categories c
     JOIN areas a ON c.area_id = a.id
     WHERE c.number = ?`,
    [number]
  );
  const mapped = mapResults(results, CATEGORY_COLUMNS);
  return mapped[0] || null;
}

/**
 * Create a new category.
 * @param {Object} category - Category data
 * @param {number} category.number - JD category number (e.g., 11, 12)
 * @param {number} category.area_id - Parent area ID
 * @param {string} category.name - Name of the category
 * @param {string} [category.description] - Category description
 * @returns {number} ID of the created category
 */
export function createCategory(category) {
  const db = getDB();
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
 * @param {number} id - Category ID
 * @param {Object} updates - Fields to update
 * @returns {boolean} True if update was performed
 */
export function updateCategory(id, updates) {
  const validId = validatePositiveInteger(id, 'id');
  const db = getDB();

  const query = buildUpdateQuery('categories', updates, UPDATABLE_COLUMNS);

  if (!query) return false;

  db.run(query.sql, [...query.values, validId]);
  logActivity('update', 'category', validId.toString(), `Updated category ID: ${validId}`);
  saveDatabase();
  return true;
}

/**
 * Delete a category.
 * @param {number} id - Category ID
 * @throws {DatabaseError} If category has existing folders
 */
export function deleteCategory(id) {
  const validId = validatePositiveInteger(id, 'id');
  const db = getDB();

  // Check for child folders
  const folders = db.exec('SELECT COUNT(*) FROM folders WHERE category_id = ?', [validId]);
  if (folders[0]?.values[0][0] > 0) {
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
 * @param {number} [areaId] - Optional area ID to count categories for
 * @returns {number} Total number of categories
 */
export function getCategoryCount(areaId = null) {
  const db = getDB();

  if (areaId !== null) {
    const validAreaId = validatePositiveInteger(areaId, 'areaId');
    const results = db.exec('SELECT COUNT(*) FROM categories WHERE area_id = ?', [validAreaId]);
    return results[0]?.values[0][0] || 0;
  }

  const results = db.exec('SELECT COUNT(*) FROM categories');
  return results[0]?.values[0][0] || 0;
}

/**
 * Check if a category number is available.
 * @param {number} number - Category number to check
 * @param {number} [excludeId] - ID to exclude from check (for updates)
 * @returns {boolean} True if number is available
 */
export function isCategoryNumberAvailable(number, excludeId = null) {
  const db = getDB();
  let query = 'SELECT COUNT(*) FROM categories WHERE number = ?';
  const params = [number];

  if (excludeId !== null) {
    const validExcludeId = validatePositiveInteger(excludeId, 'excludeId');
    query += ' AND id != ?';
    params.push(validExcludeId);
  }

  const results = db.exec(query, params);
  return (results[0]?.values[0][0] || 0) === 0;
}
