/**
 * Watch Activity Repository
 * =========================
 * CRUD operations for watch activity logs (Premium Feature).
 * Tracks file detection and organization events from watched folders.
 * Uses parameterized queries for security.
 */

import { getDB, saveDatabase, validatePositiveInteger, getLastInsertId } from './utils.js';
import { validateRequiredString, sanitizeText } from '../../utils/validation.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// CONSTANTS
// ============================================

/**
 * Valid actions for watch activity.
 */
export const VALID_WATCH_ACTIONS = ['detected', 'queued', 'auto_organized', 'skipped', 'error'];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map a database row to a watch activity object.
 * @param {Array} columns - Column names
 * @param {Array} row - Database row
 * @returns {Object} Watch activity object
 */
function mapRowToActivity(columns, row) {
  const obj = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });
  return obj;
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get watch activity for a specific folder.
 *
 * @param {number} watchedFolderId - The watched folder ID
 * @param {Object} options - Filter options
 * @param {string} [options.action] - Filter by action type
 * @param {number} [options.limit=100] - Max results
 * @returns {Array} Array of activity objects
 */
export function getWatchActivity(watchedFolderId, options = {}) {
  const db = getDB();
  const folderId = validatePositiveInteger(watchedFolderId, 'Watched Folder ID');
  const limit = Math.min(Math.max(1, options.limit || 100), 1000);

  let query = `
    SELECT wa.*, wf.name as folder_name, r.name as rule_name
    FROM watch_activity wa
    LEFT JOIN watched_folders wf ON wa.watched_folder_id = wf.id
    LEFT JOIN organization_rules r ON wa.matched_rule_id = r.id
    WHERE wa.watched_folder_id = ?
  `;
  const params = [folderId];

  if (options.action && VALID_WATCH_ACTIONS.includes(options.action)) {
    query += ' AND wa.action = ?';
    params.push(options.action);
  }

  query += ` ORDER BY wa.created_at DESC LIMIT ${limit}`;

  const result = db.exec(query, params);
  if (!result[0]) return [];

  return result[0].values.map((row) => mapRowToActivity(result[0].columns, row));
}

/**
 * Get recent watch activity across all folders.
 *
 * @param {Object} options - Filter options
 * @param {string} [options.action] - Filter by action type
 * @param {string} [options.since] - ISO date string to filter from
 * @param {number} [options.limit=50] - Max results
 * @returns {Array} Array of activity objects
 */
export function getRecentWatchActivity(options = {}) {
  const db = getDB();
  const limit = Math.min(Math.max(1, options.limit || 50), 1000);

  let query = `
    SELECT wa.*, wf.name as folder_name, r.name as rule_name
    FROM watch_activity wa
    LEFT JOIN watched_folders wf ON wa.watched_folder_id = wf.id
    LEFT JOIN organization_rules r ON wa.matched_rule_id = r.id
  `;
  const conditions = [];
  const params = [];

  if (options.action && VALID_WATCH_ACTIONS.includes(options.action)) {
    conditions.push('wa.action = ?');
    params.push(options.action);
  }

  if (options.since) {
    conditions.push('wa.created_at >= ?');
    params.push(sanitizeText(options.since));
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ` ORDER BY wa.created_at DESC LIMIT ${limit}`;

  const result = params.length > 0 ? db.exec(query, params) : db.exec(query);
  if (!result[0]) return [];

  return result[0].values.map((row) => mapRowToActivity(result[0].columns, row));
}

/**
 * Get counts of queued files (files detected but not yet organized).
 *
 * @returns {Array} Counts by watched folder
 */
export function getQueuedFileCounts() {
  const db = getDB();
  const sql = `
    SELECT wf.id, wf.name, wf.path, COUNT(wa.id) as queued_count
    FROM watched_folders wf
    LEFT JOIN watch_activity wa ON wf.id = wa.watched_folder_id AND wa.action = 'queued'
    WHERE wf.is_active = 1
    GROUP BY wf.id
  `;

  const result = db.exec(sql);
  if (!result[0]) return [];

  return result[0].values.map((row) => mapRowToActivity(result[0].columns, row));
}

/**
 * Get a single watch activity by ID.
 *
 * @param {number} activityId - The activity ID
 * @returns {Object|null} The activity or null
 */
export function getWatchActivityById(activityId) {
  const db = getDB();
  const id = validatePositiveInteger(activityId, 'Activity ID');

  const stmt = db.prepare(`
    SELECT wa.*, wf.name as folder_name, r.name as rule_name
    FROM watch_activity wa
    LEFT JOIN watched_folders wf ON wa.watched_folder_id = wf.id
    LEFT JOIN organization_rules r ON wa.matched_rule_id = r.id
    WHERE wa.id = ?
  `);
  stmt.bind([id]);

  let result = null;
  if (stmt.step()) {
    const row = stmt.get();
    const columns = stmt.getColumnNames();
    result = mapRowToActivity(columns, row);
  }
  stmt.free();

  return result;
}

/**
 * Get count of watch activities.
 * @param {number} [watchedFolderId] - Optional folder ID filter
 * @returns {number} Number of activities
 */
export function getWatchActivityCount(watchedFolderId = null) {
  const db = getDB();

  if (watchedFolderId) {
    const folderId = validatePositiveInteger(watchedFolderId, 'Watched Folder ID');
    const stmt = db.prepare('SELECT COUNT(*) FROM watch_activity WHERE watched_folder_id = ?');
    stmt.bind([folderId]);
    stmt.step();
    const count = stmt.get()[0];
    stmt.free();
    return count || 0;
  }

  const results = db.exec('SELECT COUNT(*) FROM watch_activity');
  return results[0]?.values[0]?.[0] || 0;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Log a watch activity event.
 *
 * @param {Object} activity - The activity to log
 * @param {number} activity.watched_folder_id - The watched folder ID
 * @param {string} activity.filename - The filename
 * @param {string} activity.path - Full path to the file
 * @param {string} activity.action - Action: detected, queued, auto_organized, skipped, error
 * @param {string} [activity.file_extension] - File extension
 * @param {string} [activity.file_type] - File type category
 * @param {number} [activity.file_size] - File size in bytes
 * @param {number} [activity.matched_rule_id] - Rule that matched this file
 * @param {string} [activity.target_folder] - Target JD folder
 * @param {string} [activity.error_message] - Error message if action is 'error'
 * @returns {number} The new activity ID
 */
export function logWatchActivity(activity) {
  const db = getDB();

  try {
    const watchedFolderId = validatePositiveInteger(
      activity.watched_folder_id,
      'Watched Folder ID'
    );
    const filename = validateRequiredString(activity.filename, 'Filename', 255);
    const path = validateRequiredString(activity.path, 'Path', 500);
    const action = validateRequiredString(activity.action, 'Action', 20);

    // Validate action
    if (!VALID_WATCH_ACTIONS.includes(action)) {
      throw new DatabaseError(`Invalid action: ${action}`, 'insert');
    }

    const stmt = db.prepare(`
      INSERT INTO watch_activity (watched_folder_id, filename, path, file_extension, file_type,
                                   file_size, action, matched_rule_id, target_folder, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      watchedFolderId,
      filename,
      path,
      activity.file_extension || null,
      activity.file_type || null,
      activity.file_size || null,
      action,
      activity.matched_rule_id || null,
      activity.target_folder || null,
      activity.error_message || null,
    ]);
    stmt.free();

    const newId = getLastInsertId();
    saveDatabase();

    return newId;
  } catch (error) {
    if (error.name === 'ValidationError' || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to log watch activity: ${error.message}`, 'insert');
  }
}

/**
 * Update a watch activity's action (e.g., from queued to auto_organized).
 *
 * @param {number} activityId - The activity ID
 * @param {string} action - The new action
 * @param {Object} [updates] - Additional fields to update
 */
export function updateWatchActivityAction(activityId, action, updates = {}) {
  const db = getDB();
  const id = validatePositiveInteger(activityId, 'Activity ID');

  if (!VALID_WATCH_ACTIONS.includes(action)) {
    throw new DatabaseError(`Invalid action: ${action}`, 'update');
  }

  const updateParts = ['action = ?'];
  const values = [action];

  if (updates.target_folder) {
    updateParts.push('target_folder = ?');
    values.push(sanitizeText(updates.target_folder));
  }

  if (updates.matched_rule_id) {
    updateParts.push('matched_rule_id = ?');
    values.push(validatePositiveInteger(updates.matched_rule_id, 'Rule ID'));
  }

  if (updates.error_message) {
    updateParts.push('error_message = ?');
    values.push(sanitizeText(updates.error_message));
  }

  values.push(id);
  db.run(`UPDATE watch_activity SET ${updateParts.join(', ')} WHERE id = ?`, values);
  saveDatabase();
}

/**
 * Delete a watch activity record.
 *
 * @param {number} activityId - The activity ID
 */
export function deleteWatchActivity(activityId) {
  const db = getDB();
  const id = validatePositiveInteger(activityId, 'Activity ID');

  db.run('DELETE FROM watch_activity WHERE id = ?', [id]);
  saveDatabase();
}

/**
 * Clear old watch activity (for maintenance).
 *
 * @param {number} [daysOld=30] - Delete activity older than this many days
 * @returns {number} Number of records deleted
 */
export function clearOldWatchActivity(daysOld = 30) {
  const db = getDB();
  const safeDays = Math.max(1, Math.abs(daysOld));

  // Get count first
  const countResult = db.exec(`
    SELECT COUNT(*) FROM watch_activity
    WHERE created_at < datetime('now', '-${safeDays} days')
  `);
  const count = countResult[0]?.values[0]?.[0] || 0;

  if (count > 0) {
    db.run(`DELETE FROM watch_activity WHERE created_at < datetime('now', '-${safeDays} days')`);
    saveDatabase();
  }

  return count;
}

/**
 * Clear all activity for a specific watched folder.
 *
 * @param {number} watchedFolderId - The watched folder ID
 * @returns {number} Number of records deleted
 */
export function clearWatchActivityForFolder(watchedFolderId) {
  const db = getDB();
  const folderId = validatePositiveInteger(watchedFolderId, 'Watched Folder ID');

  // Get count first
  const countStmt = db.prepare('SELECT COUNT(*) FROM watch_activity WHERE watched_folder_id = ?');
  countStmt.bind([folderId]);
  countStmt.step();
  const count = countStmt.get()[0] || 0;
  countStmt.free();

  if (count > 0) {
    db.run('DELETE FROM watch_activity WHERE watched_folder_id = ?', [folderId]);
    saveDatabase();
  }

  return count;
}
