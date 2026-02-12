/**
 * Watched Folders Repository
 * ==========================
 * CRUD operations for watched folders (Premium Feature).
 * Manages folder monitoring configurations.
 * Uses parameterized queries for security.
 */

import { getDB, saveDatabase, validatePositiveInteger, getLastInsertId } from './utils.js';
import { validateRequiredString, sanitizeText } from '../../utils/validation.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// CONSTANTS
// ============================================

/**
 * Valid confidence thresholds for auto-organization.
 */
export const VALID_CONFIDENCE_THRESHOLDS = ['low', 'medium', 'high'];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map a database row to a watched folder object.
 * @param {Array} columns - Column names
 * @param {Array} row - Database row
 * @returns {Object} Watched folder object
 */
function mapRowToWatchedFolder(columns, row) {
  const obj = {};
  columns.forEach((col, i) => {
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
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all watched folders with optional filtering.
 *
 * @param {Object} options - Filter options
 * @param {boolean} [options.activeOnly=false] - Only return active folders
 * @returns {Array} Array of watched folder objects
 */
export function getWatchedFolders(options = {}) {
  const db = getDB();

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

  return result[0].values.map((row) => mapRowToWatchedFolder(result[0].columns, row));
}

/**
 * Get a watched folder by ID.
 *
 * @param {number} id - The watched folder ID
 * @returns {Object|null} The watched folder or null
 */
export function getWatchedFolder(id) {
  const db = getDB();
  const folderId = validatePositiveInteger(id, 'Watched Folder ID');

  const stmt = db.prepare('SELECT * FROM watched_folders WHERE id = ?');
  stmt.bind([folderId]);

  let result = null;
  if (stmt.step()) {
    const row = stmt.get();
    const columns = stmt.getColumnNames();
    result = mapRowToWatchedFolder(columns, row);
  }
  stmt.free();

  return result;
}

/**
 * Get a watched folder by path.
 *
 * @param {string} path - The folder path
 * @returns {Object|null} The watched folder or null
 */
export function getWatchedFolderByPath(path) {
  const db = getDB();
  const sanitizedPath = sanitizeText(path);

  const stmt = db.prepare('SELECT * FROM watched_folders WHERE path = ?');
  stmt.bind([sanitizedPath]);

  let result = null;
  if (stmt.step()) {
    const row = stmt.get();
    const columns = stmt.getColumnNames();
    result = mapRowToWatchedFolder(columns, row);
  }
  stmt.free();

  return result;
}

/**
 * Get count of watched folders.
 * @param {boolean} [activeOnly=false] - Only count active folders
 * @returns {number} Number of watched folders
 */
export function getWatchedFolderCount(activeOnly = false) {
  const db = getDB();
  const query = activeOnly
    ? 'SELECT COUNT(*) FROM watched_folders WHERE is_active = 1'
    : 'SELECT COUNT(*) FROM watched_folders';
  const results = db.exec(query);
  return results[0]?.values[0]?.[0] || 0;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Create a new watched folder.
 *
 * @param {Object} folder - The folder configuration
 * @param {string} folder.name - Display name for the folder
 * @param {string} folder.path - Path to the folder to watch
 * @param {boolean} [folder.is_active=true] - Whether monitoring is active
 * @param {boolean} [folder.auto_organize=false] - Auto-organize matched files
 * @param {string} [folder.confidence_threshold='medium'] - Min confidence for auto-organize
 * @param {boolean} [folder.include_subdirs=false] - Include subdirectories
 * @param {Array} [folder.file_types] - Array of file types to watch
 * @param {boolean} [folder.notify_on_organize=true] - Show notifications
 * @returns {number} The new folder ID
 */
export function createWatchedFolder(folder) {
  const db = getDB();

  try {
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
    if (!VALID_CONFIDENCE_THRESHOLDS.includes(confidenceThreshold)) {
      throw new DatabaseError(`Invalid confidence threshold: ${confidenceThreshold}`, 'insert');
    }

    const stmt = db.prepare(`
      INSERT INTO watched_folders (name, path, is_active, auto_organize, confidence_threshold,
                                    include_subdirs, file_types, notify_on_organize)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      name,
      path,
      isActive,
      autoOrganize,
      confidenceThreshold,
      includeSubdirs,
      fileTypes,
      notifyOnOrganize,
    ]);
    stmt.free();

    const newId = getLastInsertId();
    saveDatabase();

    return newId;
  } catch (error) {
    if (error.name === 'ValidationError' || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to create watched folder: ${error.message}`, 'insert');
  }
}

/**
 * Update a watched folder.
 *
 * @param {number} id - The folder ID
 * @param {Object} updates - Fields to update
 */
export function updateWatchedFolder(id, updates) {
  const db = getDB();
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
  values.push(folderId);

  db.run(`UPDATE watched_folders SET ${updateParts.join(', ')} WHERE id = ?`, values);
  saveDatabase();
}

/**
 * Delete a watched folder.
 *
 * @param {number} id - The folder ID
 */
export function deleteWatchedFolder(id) {
  const db = getDB();
  const folderId = validatePositiveInteger(id, 'Watched Folder ID');

  db.run('DELETE FROM watched_folders WHERE id = ?', [folderId]);
  saveDatabase();
}

/**
 * Increment the processed/organized counts for a watched folder.
 *
 * @param {number} id - The folder ID
 * @param {boolean} [organized=false] - Whether the file was organized (true) or just processed
 */
export function incrementWatchedFolderStats(id, organized = false) {
  const db = getDB();
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

/**
 * Toggle a watched folder's active status.
 *
 * @param {number} id - The folder ID
 * @returns {boolean} The new active status
 */
export function toggleWatchedFolder(id) {
  const db = getDB();
  const folderId = validatePositiveInteger(id, 'Watched Folder ID');

  db.run(
    'UPDATE watched_folders SET is_active = 1 - is_active, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [folderId]
  );
  saveDatabase();

  const stmt = db.prepare('SELECT is_active FROM watched_folders WHERE id = ?');
  stmt.bind([folderId]);
  let isActive = false;
  if (stmt.step()) {
    isActive = stmt.get()[0] === 1;
  }
  stmt.free();

  return isActive;
}

/**
 * Reset stats for a watched folder.
 *
 * @param {number} id - The folder ID
 */
export function resetWatchedFolderStats(id) {
  const db = getDB();
  const folderId = validatePositiveInteger(id, 'Watched Folder ID');

  db.run(
    `
    UPDATE watched_folders
    SET files_processed = 0, files_organized = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,
    [folderId]
  );
  saveDatabase();
}
