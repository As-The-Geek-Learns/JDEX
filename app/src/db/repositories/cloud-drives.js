/**
 * Cloud Drives Repository
 * =======================
 * CRUD operations for cloud drive configurations (Premium Feature).
 * Uses parameterized queries for security.
 */

import { getDB, saveDatabase } from './utils.js';
import { logActivity } from './activity-log.js';
import { validateRequiredString, validateOptionalString } from '../../utils/validation.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// CONSTANTS
// ============================================

/**
 * Valid drive types for cloud_drives.drive_type column.
 */
export const VALID_DRIVE_TYPES = ['icloud', 'dropbox', 'onedrive', 'google', 'proton', 'generic'];

/**
 * Column definitions for cloud_drives table.
 */
const _CLOUD_DRIVE_COLUMNS = [
  'id',
  'name',
  'base_path',
  'jd_root_path',
  'is_default',
  'is_active',
  'drive_type',
  'created_at',
  'updated_at',
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map a database row to a cloud drive object.
 * @param {Array} row - Database row
 * @returns {Object} Cloud drive object
 */
function mapRowToCloudDrive(row) {
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
 * Validate drive type, defaulting to 'generic' if invalid.
 * @param {string} driveType - Drive type to validate
 * @returns {string} Valid drive type
 */
function validateDriveType(driveType) {
  return driveType && VALID_DRIVE_TYPES.includes(driveType) ? driveType : 'generic';
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all configured cloud drives.
 * @returns {Array} Array of cloud drive objects
 */
export function getCloudDrives() {
  const db = getDB();
  const results = db.exec(
    'SELECT * FROM cloud_drives WHERE is_active = 1 ORDER BY is_default DESC, name ASC'
  );
  return results[0]?.values.map(mapRowToCloudDrive) || [];
}

/**
 * Get a single cloud drive by ID.
 * @param {string} driveId - The drive ID
 * @returns {Object|null} The cloud drive or null
 */
export function getCloudDrive(driveId) {
  const db = getDB();
  const id = validateRequiredString(driveId, 'Drive ID', 50);

  const stmt = db.prepare('SELECT * FROM cloud_drives WHERE id = ?');
  stmt.bind([id]);

  let result = null;
  if (stmt.step()) {
    result = mapRowToCloudDrive(stmt.get());
  }
  stmt.free();

  return result;
}

/**
 * Get the default cloud drive.
 * @returns {Object|null} The default drive or null
 */
export function getDefaultCloudDrive() {
  const db = getDB();
  const results = db.exec(
    'SELECT * FROM cloud_drives WHERE is_default = 1 AND is_active = 1 LIMIT 1'
  );

  if (!results[0]?.values[0]) return null;
  return mapRowToCloudDrive(results[0].values[0]);
}

/**
 * Get count of active cloud drives.
 * @returns {number} Number of active cloud drives
 */
export function getCloudDriveCount() {
  const db = getDB();
  const results = db.exec('SELECT COUNT(*) FROM cloud_drives WHERE is_active = 1');
  return results[0]?.values[0]?.[0] || 0;
}

// ============================================
// WRITE OPERATIONS
// ============================================

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
  const db = getDB();

  try {
    // Validate inputs
    const id = validateRequiredString(drive.id, 'Drive ID', 50);
    const name = validateRequiredString(drive.name, 'Name', 100);
    const basePath = validateRequiredString(drive.base_path, 'Base path', 500);
    const jdRootPath = validateOptionalString(drive.jd_root_path, 'JD root path', 500);
    const driveType = validateDriveType(drive.drive_type);

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
  const db = getDB();

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
          value = validateDriveType(value);
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
  const db = getDB();
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
  const db = getDB();
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
