/**
 * Organized Files Repository
 * ==========================
 * CRUD operations for organized file records (Premium Feature).
 * Tracks files that have been organized by the file organizer.
 * Uses parameterized queries for security.
 */

import { getDB, saveDatabase, validatePositiveInteger, getLastInsertId } from './utils.js';
import { logActivity } from './activity-log.js';
import { incrementRuleMatchCount } from './organization-rules.js';
import {
  validateRequiredString,
  validateOptionalString,
  sanitizeText,
} from '../../utils/validation.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// CONSTANTS
// ============================================

/**
 * Valid statuses for organized files.
 */
export const VALID_FILE_STATUSES = ['moved', 'tracked', 'undone', 'deleted'];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map a database row to an organized file object.
 * @param {Array} row - Database row
 * @returns {Object} Organized file object
 */
function mapRowToFile(row) {
  return {
    id: row[0],
    filename: row[1],
    original_path: row[2],
    current_path: row[3],
    jd_folder_number: row[4],
    jd_item_id: row[5],
    file_extension: row[6],
    file_type: row[7],
    file_size: row[8],
    file_modified_at: row[9],
    matched_rule_id: row[10],
    cloud_drive_id: row[11],
    status: row[12],
    organized_at: row[13],
  };
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get organized files with optional filtering.
 *
 * @param {Object} options - Filter options
 * @param {string} [options.status] - Filter by status
 * @param {string} [options.jdFolderNumber] - Filter by JD folder
 * @param {string} [options.fileType] - Filter by file type
 * @param {number} [options.limit=100] - Max results
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Array} Array of organized file records
 */
export function getOrganizedFiles(options = {}) {
  const db = getDB();
  const { status, jdFolderNumber, fileType, limit = 100, offset = 0 } = options;

  let query = 'SELECT * FROM organized_files WHERE 1=1';
  const params = [];

  if (status && VALID_FILE_STATUSES.includes(status)) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (jdFolderNumber) {
    const folder = sanitizeText(jdFolderNumber);
    query += ' AND jd_folder_number = ?';
    params.push(folder);
  }

  if (fileType) {
    const type = sanitizeText(fileType);
    query += ' AND file_type = ?';
    params.push(type);
  }

  // Safely limit values
  const safeLimit = Math.min(Math.max(1, limit), 1000);
  const safeOffset = Math.max(0, offset);

  query += ` ORDER BY organized_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

  const results = params.length > 0 ? db.exec(query, params) : db.exec(query);
  return results[0]?.values.map(mapRowToFile) || [];
}

/**
 * Get a single organized file by ID.
 *
 * @param {number} fileId - The file record ID
 * @returns {Object|null} The file record or null
 */
export function getOrganizedFile(fileId) {
  const db = getDB();
  const id = validatePositiveInteger(fileId, 'File ID');

  const stmt = db.prepare('SELECT * FROM organized_files WHERE id = ?');
  stmt.bind([id]);

  let result = null;
  if (stmt.step()) {
    result = mapRowToFile(stmt.get());
  }
  stmt.free();

  return result;
}

/**
 * Check if a file (by original path) has already been organized.
 *
 * @param {string} originalPath - The original file path
 * @returns {Object|null} The existing record or null
 */
export function findOrganizedFileByPath(originalPath) {
  const db = getDB();
  const path = validateRequiredString(originalPath, 'Original path', 1000);

  const stmt = db.prepare('SELECT * FROM organized_files WHERE original_path = ? AND status != ?');
  stmt.bind([path, 'undone']);

  let result = null;
  if (stmt.step()) {
    result = mapRowToFile(stmt.get());
  }
  stmt.free();

  return result;
}

/**
 * Get recent organized files for undo history.
 *
 * @param {number} limit - Max number of files to return
 * @returns {Array} Recent organized files
 */
export function getRecentOrganizedFiles(limit = 20) {
  return getOrganizedFiles({ status: 'moved', limit });
}

/**
 * Get count of organized files.
 * @param {string} [status] - Optional status filter
 * @returns {number} Number of files
 */
export function getOrganizedFileCount(status = null) {
  const db = getDB();

  if (status && VALID_FILE_STATUSES.includes(status)) {
    const stmt = db.prepare('SELECT COUNT(*) FROM organized_files WHERE status = ?');
    stmt.bind([status]);
    stmt.step();
    const count = stmt.get()[0];
    stmt.free();
    return count;
  }

  const results = db.exec('SELECT COUNT(*) FROM organized_files');
  return results[0]?.values[0]?.[0] || 0;
}

/**
 * Get statistics about organized files.
 *
 * @returns {Object} Statistics object
 */
export function getOrganizedFilesStats() {
  const db = getDB();

  const totalMoved =
    db.exec("SELECT COUNT(*) FROM organized_files WHERE status = 'moved'")[0]?.values[0][0] || 0;
  const totalTracked =
    db.exec("SELECT COUNT(*) FROM organized_files WHERE status = 'tracked'")[0]?.values[0][0] || 0;
  const totalUndone =
    db.exec("SELECT COUNT(*) FROM organized_files WHERE status = 'undone'")[0]?.values[0][0] || 0;
  const totalSize =
    db.exec("SELECT SUM(file_size) FROM organized_files WHERE status = 'moved'")[0]?.values[0][0] ||
    0;

  // Get breakdown by file type
  const byTypeResults = db.exec(`
    SELECT file_type, COUNT(*) as count
    FROM organized_files
    WHERE status = 'moved' AND file_type IS NOT NULL
    GROUP BY file_type
    ORDER BY count DESC
  `);

  const byType =
    byTypeResults[0]?.values.reduce((acc, row) => {
      acc[row[0]] = row[1];
      return acc;
    }, {}) || {};

  // Get breakdown by JD folder
  const byFolderResults = db.exec(`
    SELECT jd_folder_number, COUNT(*) as count
    FROM organized_files
    WHERE status = 'moved' AND jd_folder_number IS NOT NULL
    GROUP BY jd_folder_number
    ORDER BY count DESC
    LIMIT 10
  `);

  const topFolders =
    byFolderResults[0]?.values.map((row) => ({
      folder_number: row[0],
      count: row[1],
    })) || [];

  return {
    totalMoved,
    totalTracked,
    totalUndone,
    totalSize,
    byType,
    topFolders,
  };
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Record a file that has been organized.
 *
 * @param {Object} file - The file record
 * @param {string} file.filename - The filename
 * @param {string} file.original_path - Where the file was
 * @param {string} file.current_path - Where the file is now
 * @param {string} [file.jd_folder_number] - JD folder it was placed in
 * @param {number} [file.jd_item_id] - JD item ID if added to database
 * @param {string} [file.file_extension] - File extension
 * @param {string} [file.file_type] - File type category
 * @param {number} [file.file_size] - File size in bytes
 * @param {string} [file.file_modified_at] - Original file modification date
 * @param {number} [file.matched_rule_id] - Rule that matched this file
 * @param {string} [file.cloud_drive_id] - Cloud drive it was moved to
 * @param {string} [file.status='moved'] - Status: moved, tracked
 * @returns {number} The created record ID
 */
export function recordOrganizedFile(file) {
  const db = getDB();

  try {
    // Validate required fields
    const filename = validateRequiredString(file.filename, 'Filename', 500);
    const originalPath = validateRequiredString(file.original_path, 'Original path', 1000);
    const currentPath = validateRequiredString(file.current_path, 'Current path', 1000);

    // Validate optional fields
    const jdFolderNumber = validateOptionalString(file.jd_folder_number, 'JD folder number', 20);
    const fileExtension = validateOptionalString(file.file_extension, 'Extension', 20);
    const fileType = validateOptionalString(file.file_type, 'File type', 50);
    const cloudDriveId = validateOptionalString(file.cloud_drive_id, 'Cloud drive ID', 50);

    const status = file.status && VALID_FILE_STATUSES.includes(file.status) ? file.status : 'moved';

    const stmt = db.prepare(`
      INSERT INTO organized_files (
        filename, original_path, current_path, jd_folder_number, jd_item_id,
        file_extension, file_type, file_size, file_modified_at,
        matched_rule_id, cloud_drive_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      filename,
      originalPath,
      currentPath,
      jdFolderNumber,
      file.jd_item_id || null,
      fileExtension,
      fileType,
      file.file_size || null,
      file.file_modified_at || null,
      file.matched_rule_id || null,
      cloudDriveId,
      status,
    ]);

    stmt.free();

    const newId = getLastInsertId();

    // Increment rule match count if a rule was used
    if (file.matched_rule_id) {
      incrementRuleMatchCount(file.matched_rule_id);
    }

    logActivity('organize', 'file', filename, `Organized file to ${jdFolderNumber || currentPath}`);
    saveDatabase();

    return newId;
  } catch (error) {
    if (error.name === 'ValidationError' || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to record organized file: ${error.message}`, 'insert');
  }
}

/**
 * Mark an organized file as undone (for undo functionality).
 *
 * @param {number} fileId - The file record ID
 */
export function markFileUndone(fileId) {
  const db = getDB();
  const id = validatePositiveInteger(fileId, 'File ID');

  db.run("UPDATE organized_files SET status = 'undone' WHERE id = ?", [id]);

  const file = getOrganizedFile(id);
  if (file) {
    logActivity('undo', 'file', file.filename, `Undid organization of ${file.filename}`);
  }

  saveDatabase();
}

/**
 * Update an organized file record.
 *
 * @param {number} fileId - The file record ID
 * @param {Object} updates - Fields to update
 */
export function updateOrganizedFile(fileId, updates) {
  const db = getDB();
  const id = validatePositiveInteger(fileId, 'File ID');

  const allowedFields = ['status', 'current_path', 'jd_folder_number'];
  const updateParts = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      updateParts.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (updateParts.length === 0) {
    return;
  }

  values.push(id);
  db.run(`UPDATE organized_files SET ${updateParts.join(', ')} WHERE id = ?`, values);
  saveDatabase();
}

/**
 * Delete an organized file record.
 *
 * @param {number} fileId - The file record ID
 */
export function deleteOrganizedFile(fileId) {
  const db = getDB();
  const id = validatePositiveInteger(fileId, 'File ID');

  db.run('DELETE FROM organized_files WHERE id = ?', [id]);
  saveDatabase();
}

/**
 * Clear old organized file records.
 * Useful for cleanup of historical data.
 *
 * @param {number} daysOld - Delete records older than this many days
 * @returns {number} Number of records deleted
 */
export function clearOldOrganizedFiles(daysOld = 90) {
  const db = getDB();

  const countResult = db.exec(`
    SELECT COUNT(*) FROM organized_files
    WHERE organized_at < datetime('now', '-${daysOld} days')
  `);
  const count = countResult[0]?.values[0]?.[0] || 0;

  if (count > 0) {
    db.run(`DELETE FROM organized_files WHERE organized_at < datetime('now', '-${daysOld} days')`);
    saveDatabase();
  }

  return count;
}
