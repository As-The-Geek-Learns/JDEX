/**
 * Areas Repository
 * =================
 * CRUD operations for JD Areas (top-level organizational units).
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

// Column definitions for areas table
const AREA_COLUMNS = [
  'id',
  'range_start',
  'range_end',
  'name',
  'description',
  'color',
  'created_at',
];

// Valid columns for updates
const UPDATABLE_COLUMNS = ['range_start', 'range_end', 'name', 'description', 'color'];

/**
 * Get all areas.
 * @returns {Array<Object>} Array of area objects ordered by range_start
 */
export function getAreas() {
  const db = getDB();
  const results = db.exec(`SELECT ${AREA_COLUMNS.join(', ')} FROM areas ORDER BY range_start`);
  return mapResults(results, AREA_COLUMNS);
}

/**
 * Get a single area by ID.
 * @param {number} id - Area ID
 * @returns {Object|null} Area object or null if not found
 */
export function getArea(id) {
  const validId = validatePositiveInteger(id, 'id');
  const db = getDB();
  const results = db.exec(`SELECT ${AREA_COLUMNS.join(', ')} FROM areas WHERE id = ?`, [validId]);
  const mapped = mapResults(results, AREA_COLUMNS);
  return mapped[0] || null;
}

/**
 * Create a new area.
 * @param {Object} area - Area data
 * @param {number} area.range_start - Start of area range (e.g., 10)
 * @param {number} area.range_end - End of area range (e.g., 19)
 * @param {string} area.name - Name of the area
 * @param {string} [area.description] - Area description
 * @param {string} [area.color] - Color code for UI
 * @returns {number} ID of the created area
 */
export function createArea(area) {
  const db = getDB();
  db.run(
    'INSERT INTO areas (range_start, range_end, name, description, color) VALUES (?, ?, ?, ?, ?)',
    [area.range_start, area.range_end, area.name, area.description || '', area.color || '#64748b']
  );
  const id = getLastInsertId();
  logActivity(
    'create',
    'area',
    `${area.range_start}-${area.range_end}`,
    `Created area: ${area.name}`
  );
  saveDatabase();
  return id;
}

/**
 * Update an area.
 * @param {number} id - Area ID
 * @param {Object} updates - Fields to update
 * @returns {boolean} True if update was performed
 */
export function updateArea(id, updates) {
  const validId = validatePositiveInteger(id, 'id');
  const db = getDB();

  const query = buildUpdateQuery('areas', updates, UPDATABLE_COLUMNS);

  if (!query) return false;

  db.run(query.sql, [...query.values, validId]);
  logActivity('update', 'area', validId.toString(), `Updated area ID: ${validId}`);
  saveDatabase();
  return true;
}

/**
 * Delete an area.
 * @param {number} id - Area ID
 * @throws {DatabaseError} If area has existing categories
 */
export function deleteArea(id) {
  const validId = validatePositiveInteger(id, 'id');
  const db = getDB();

  // Check for child categories
  const cats = db.exec('SELECT COUNT(*) FROM categories WHERE area_id = ?', [validId]);
  if (cats[0]?.values[0][0] > 0) {
    throw new DatabaseError(
      'Cannot delete area with existing categories. Delete categories first.',
      'constraint'
    );
  }

  db.run('DELETE FROM areas WHERE id = ?', [validId]);
  logActivity('delete', 'area', validId.toString(), `Deleted area ID: ${validId}`);
  saveDatabase();
}

/**
 * Get area count.
 * @returns {number} Total number of areas
 */
export function getAreaCount() {
  const db = getDB();
  const results = db.exec('SELECT COUNT(*) FROM areas');
  return results[0]?.values[0][0] || 0;
}

/**
 * Check if an area number range is available.
 * @param {number} rangeStart - Start of range to check
 * @param {number} rangeEnd - End of range to check
 * @param {number} [excludeId] - ID to exclude from check (for updates)
 * @returns {boolean} True if range is available
 */
export function isAreaRangeAvailable(rangeStart, rangeEnd, excludeId = null) {
  const db = getDB();
  let query = `SELECT COUNT(*) FROM areas WHERE
    (range_start <= ? AND range_end >= ?) OR
    (range_start <= ? AND range_end >= ?) OR
    (range_start >= ? AND range_end <= ?)`;
  const params = [rangeEnd, rangeStart, rangeStart, rangeStart, rangeStart, rangeEnd];

  if (excludeId) {
    const validExcludeId = validatePositiveInteger(excludeId, 'excludeId');
    query += ' AND id != ?';
    params.push(validExcludeId);
  }

  const results = db.exec(query, params);
  return (results[0]?.values[0][0] || 0) === 0;
}
