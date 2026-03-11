/**
 * Storage Locations Repository
 * ============================
 * CRUD operations for storage locations (physical/cloud storage tracking).
 */

import {
  getDB,
  saveDatabase,
  mapResults,
  validatePositiveInteger,
  buildUpdateQuery,
  getLastInsertId,
} from './utils.js';

// Column definitions for storage_locations table
const STORAGE_COLUMNS = ['id', 'name', 'type', 'path', 'is_encrypted', 'notes'];

// Valid columns for updates
const UPDATABLE_COLUMNS = ['name', 'type', 'path', 'is_encrypted', 'notes'];

/**
 * Get all storage locations.
 * @returns {Array<Object>} Array of storage location objects
 */
export function getStorageLocations() {
  const db = getDB();
  const results = db.exec(
    `SELECT ${STORAGE_COLUMNS.join(', ')} FROM storage_locations ORDER BY name`
  );
  return mapResults(results, STORAGE_COLUMNS);
}

/**
 * Get a single storage location by ID.
 * @param {number} id - Storage location ID
 * @returns {Object|null} Storage location object or null if not found
 */
export function getStorageLocation(id) {
  const validId = validatePositiveInteger(id, 'id');
  const db = getDB();
  const results = db.exec(
    `SELECT ${STORAGE_COLUMNS.join(', ')} FROM storage_locations WHERE id = ?`,
    [validId]
  );
  const mapped = mapResults(results, STORAGE_COLUMNS);
  return mapped[0] || null;
}

/**
 * Create a new storage location.
 * @param {Object} location - Storage location data
 * @param {string} location.name - Name of the storage location
 * @param {string} location.type - Type (e.g., 'local', 'cloud', 'external')
 * @param {string} [location.path] - File path if applicable
 * @param {boolean} [location.is_encrypted] - Whether storage is encrypted
 * @param {string} [location.notes] - Additional notes
 * @returns {number} ID of the created storage location
 */
export function createStorageLocation(location) {
  const db = getDB();
  db.run(
    'INSERT INTO storage_locations (name, type, path, is_encrypted, notes) VALUES (?, ?, ?, ?, ?)',
    [
      location.name,
      location.type,
      location.path || null,
      location.is_encrypted ? 1 : 0,
      location.notes || '',
    ]
  );
  saveDatabase();
  return getLastInsertId();
}

/**
 * Update a storage location.
 * @param {number} id - Storage location ID
 * @param {Object} updates - Fields to update
 * @returns {boolean} True if update was performed
 */
export function updateStorageLocation(id, updates) {
  const validId = validatePositiveInteger(id, 'id');
  const db = getDB();

  const query = buildUpdateQuery('storage_locations', updates, UPDATABLE_COLUMNS, {
    transformers: {
      is_encrypted: (v) => (v ? 1 : 0),
    },
  });

  if (!query) return false;

  db.run(query.sql, [...query.values, validId]);
  saveDatabase();
  return true;
}

/**
 * Delete a storage location.
 * @param {number} id - Storage location ID
 */
export function deleteStorageLocation(id) {
  const validId = validatePositiveInteger(id, 'id');
  const db = getDB();
  db.run('DELETE FROM storage_locations WHERE id = ?', [validId]);
  saveDatabase();
}

/**
 * Get storage location count.
 * @returns {number} Total number of storage locations
 */
export function getStorageLocationCount() {
  const db = getDB();
  const results = db.exec('SELECT COUNT(*) FROM storage_locations');
  return results[0]?.values[0][0] || 0;
}
