/**
 * Activity Log Repository
 * =======================
 * CRUD operations for activity logging and retrieval.
 */

import { getDB, mapResults } from './utils.js';

// Column definitions for activity_log table
const ACTIVITY_COLUMNS = ['id', 'action', 'entity_type', 'entity_number', 'details', 'timestamp'];

/**
 * Log an activity event.
 * @param {string} action - The action performed (e.g., 'created', 'updated', 'deleted')
 * @param {string} entityType - Type of entity (e.g., 'folder', 'item', 'category')
 * @param {string} entityNumber - The JD number of the entity
 * @param {string} [details] - Optional additional details
 */
export function logActivity(action, entityType, entityNumber, details = null) {
  const db = getDB();
  db.run(
    'INSERT INTO activity_log (action, entity_type, entity_number, details) VALUES (?, ?, ?, ?)',
    [action, entityType, entityNumber, details]
  );
}

/**
 * Get recent activity entries.
 * @param {number} [limit=20] - Maximum number of entries to return
 * @returns {Array<Object>} Array of activity log entries
 */
export function getRecentActivity(limit = 20) {
  const db = getDB();
  // Validate and constrain limit to reasonable bounds
  const parsed = parseInt(limit, 10);
  const safeLimit = Math.min(Math.max(1, Number.isNaN(parsed) ? 20 : parsed), 100);

  const results = db.exec(
    `SELECT ${ACTIVITY_COLUMNS.join(', ')} FROM activity_log ORDER BY timestamp DESC LIMIT ?`,
    [safeLimit]
  );
  return mapResults(results, ACTIVITY_COLUMNS);
}

/**
 * Clear all activity log entries.
 * Use with caution - this is irreversible.
 */
export function clearActivityLog() {
  const db = getDB();
  db.run('DELETE FROM activity_log');
}

/**
 * Get activity count.
 * @returns {number} Total number of activity log entries
 */
export function getActivityCount() {
  const db = getDB();
  const results = db.exec('SELECT COUNT(*) FROM activity_log');
  return results[0]?.values[0][0] || 0;
}
