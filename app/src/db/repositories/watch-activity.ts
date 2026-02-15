/**
 * Watch Activity Repository
 * =========================
 * CRUD operations for watch activity logs (Premium Feature).
 * Tracks file detection and organization events from watched folders.
 * Uses parameterized queries for security.
 */

import { requireDB, saveDatabase, validatePositiveInteger, getLastInsertId } from './utils.js';
import { validateRequiredString, sanitizeText } from '../../utils/validation.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Valid watch actions.
 */
export type WatchAction = 'detected' | 'queued' | 'auto_organized' | 'skipped' | 'error';

/**
 * Watch activity record.
 */
export interface WatchActivity {
  id: number;
  watched_folder_id: number;
  filename: string;
  path: string;
  file_extension: string | null;
  file_type: string | null;
  file_size: number | null;
  action: WatchAction;
  matched_rule_id: number | null;
  target_folder: string | null;
  error_message: string | null;
  created_at: string;
  folder_name?: string;
  rule_name?: string;
}

/**
 * Queued file count by folder.
 */
export interface QueuedFileCount {
  id: number;
  name: string;
  path: string;
  queued_count: number;
}

/**
 * Input for logging watch activity.
 */
export interface LogWatchActivityInput {
  watched_folder_id: number;
  filename: string;
  path: string;
  action: WatchAction;
  file_extension?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  matched_rule_id?: number | null;
  target_folder?: string | null;
  error_message?: string | null;
}

/**
 * Options for getting watch activity.
 */
export interface GetWatchActivityOptions {
  action?: WatchAction;
  limit?: number;
}

/**
 * Options for getting recent watch activity.
 */
export interface GetRecentWatchActivityOptions {
  action?: WatchAction;
  since?: string;
  limit?: number;
}

/**
 * Updates for watch activity action.
 */
export interface UpdateWatchActivityUpdates {
  target_folder?: string;
  matched_rule_id?: number;
  error_message?: string;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Valid actions for watch activity.
 */
export const VALID_WATCH_ACTIONS: readonly WatchAction[] = ['detected', 'queued', 'auto_organized', 'skipped', 'error'];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map a database row to a watch activity object.
 */
function mapRowToActivity(columns: string[], row: unknown[]): WatchActivity {
  const obj: Record<string, unknown> = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });
  return obj as unknown as WatchActivity;
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get watch activity for a specific folder.
 */
export function getWatchActivity(
  watchedFolderId: number | string,
  options: GetWatchActivityOptions = {}
): WatchActivity[] {
  const db = requireDB();
  const folderId = validatePositiveInteger(watchedFolderId, 'Watched Folder ID');
  const limit = Math.min(Math.max(1, options.limit || 100), 1000);

  let query = `
    SELECT wa.*, wf.name as folder_name, r.name as rule_name
    FROM watch_activity wa
    LEFT JOIN watched_folders wf ON wa.watched_folder_id = wf.id
    LEFT JOIN organization_rules r ON wa.matched_rule_id = r.id
    WHERE wa.watched_folder_id = ?
  `;
  const params: unknown[] = [folderId];

  if (options.action && VALID_WATCH_ACTIONS.includes(options.action)) {
    query += ' AND wa.action = ?';
    params.push(options.action);
  }

  query += ` ORDER BY wa.created_at DESC LIMIT ${limit}`;

  const result = db.exec(query, params);
  const queryResult = result[0];
  if (!queryResult?.values || !queryResult?.columns) return [];

  const { columns, values } = queryResult;
  return values.map((row) => mapRowToActivity(columns, row));
}

/**
 * Get recent watch activity across all folders.
 */
export function getRecentWatchActivity(options: GetRecentWatchActivityOptions = {}): WatchActivity[] {
  const db = requireDB();
  const limit = Math.min(Math.max(1, options.limit || 50), 1000);

  let query = `
    SELECT wa.*, wf.name as folder_name, r.name as rule_name
    FROM watch_activity wa
    LEFT JOIN watched_folders wf ON wa.watched_folder_id = wf.id
    LEFT JOIN organization_rules r ON wa.matched_rule_id = r.id
  `;
  const conditions: string[] = [];
  const params: unknown[] = [];

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
  const queryResult = result[0];
  if (!queryResult?.values || !queryResult?.columns) return [];

  const { columns, values } = queryResult;
  return values.map((row) => mapRowToActivity(columns, row));
}

/**
 * Get counts of queued files (files detected but not yet organized).
 */
export function getQueuedFileCounts(): QueuedFileCount[] {
  const db = requireDB();
  const sql = `
    SELECT wf.id, wf.name, wf.path, COUNT(wa.id) as queued_count
    FROM watched_folders wf
    LEFT JOIN watch_activity wa ON wf.id = wa.watched_folder_id AND wa.action = 'queued'
    WHERE wf.is_active = 1
    GROUP BY wf.id
  `;

  const result = db.exec(sql);
  if (!result[0]?.values) return [];

  return result[0].values.map((row) => ({
    id: row[0] as number,
    name: row[1] as string,
    path: row[2] as string,
    queued_count: row[3] as number,
  }));
}

/**
 * Get a single watch activity by ID.
 */
export function getWatchActivityById(activityId: number | string): WatchActivity | null {
  const db = requireDB();
  const id = validatePositiveInteger(activityId, 'Activity ID');

  const stmt = db.prepare(`
    SELECT wa.*, wf.name as folder_name, r.name as rule_name
    FROM watch_activity wa
    LEFT JOIN watched_folders wf ON wa.watched_folder_id = wf.id
    LEFT JOIN organization_rules r ON wa.matched_rule_id = r.id
    WHERE wa.id = ?
  `);
  stmt.bind([id]);

  let result: WatchActivity | null = null;
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
 */
export function getWatchActivityCount(watchedFolderId: number | string | null = null): number {
  const db = requireDB();

  if (watchedFolderId) {
    const folderId = validatePositiveInteger(watchedFolderId, 'Watched Folder ID');
    const stmt = db.prepare('SELECT COUNT(*) FROM watch_activity WHERE watched_folder_id = ?');
    stmt.bind([folderId]);
    stmt.step();
    const count = stmt.get()[0] as number;
    stmt.free();
    return count || 0;
  }

  const results = db.exec('SELECT COUNT(*) FROM watch_activity');
  const count = results[0]?.values?.[0]?.[0];
  return typeof count === 'number' ? count : 0;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Log a watch activity event.
 */
export function logWatchActivity(activity: LogWatchActivityInput): number {
  const db = requireDB();

  try {
    const watchedFolderId = validatePositiveInteger(
      activity.watched_folder_id,
      'Watched Folder ID'
    );
    const filename = validateRequiredString(activity.filename, 'Filename', 255);
    const path = validateRequiredString(activity.path, 'Path', 500);
    const action = validateRequiredString(activity.action, 'Action', 20);

    // Validate action
    if (!VALID_WATCH_ACTIONS.includes(action as WatchAction)) {
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
      activity.file_extension ?? null,
      activity.file_type ?? null,
      activity.file_size ?? null,
      action,
      activity.matched_rule_id ?? null,
      activity.target_folder ?? null,
      activity.error_message ?? null,
    ]);
    stmt.free();

    const newId = getLastInsertId();
    saveDatabase();

    return newId;
  } catch (error) {
    if ((error as Error).name === 'ValidationError' || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to log watch activity: ${(error as Error).message}`, 'insert');
  }
}

/**
 * Update a watch activity's action (e.g., from queued to auto_organized).
 */
export function updateWatchActivityAction(
  activityId: number | string,
  action: WatchAction,
  updates: UpdateWatchActivityUpdates = {}
): void {
  const db = requireDB();
  const id = validatePositiveInteger(activityId, 'Activity ID');

  if (!VALID_WATCH_ACTIONS.includes(action)) {
    throw new DatabaseError(`Invalid action: ${action}`, 'update');
  }

  const updateParts: string[] = ['action = ?'];
  const values: unknown[] = [action];

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
 */
export function deleteWatchActivity(activityId: number | string): void {
  const db = requireDB();
  const id = validatePositiveInteger(activityId, 'Activity ID');

  db.run('DELETE FROM watch_activity WHERE id = ?', [id]);
  saveDatabase();
}

/**
 * Clear old watch activity (for maintenance).
 */
export function clearOldWatchActivity(daysOld: number = 30): number {
  const db = requireDB();
  const safeDays = Math.max(1, Math.abs(daysOld));

  // Get count first
  const countResult = db.exec(`
    SELECT COUNT(*) FROM watch_activity
    WHERE created_at < datetime('now', '-${safeDays} days')
  `);
  const count = countResult[0]?.values?.[0]?.[0] || 0;

  if (typeof count === 'number' && count > 0) {
    db.run(`DELETE FROM watch_activity WHERE created_at < datetime('now', '-${safeDays} days')`);
    saveDatabase();
  }

  return typeof count === 'number' ? count : 0;
}

/**
 * Clear all activity for a specific watched folder.
 */
export function clearWatchActivityForFolder(watchedFolderId: number | string): number {
  const db = requireDB();
  const folderId = validatePositiveInteger(watchedFolderId, 'Watched Folder ID');

  // Get count first
  const countStmt = db.prepare('SELECT COUNT(*) FROM watch_activity WHERE watched_folder_id = ?');
  countStmt.bind([folderId]);
  countStmt.step();
  const count = (countStmt.get()[0] as number) || 0;
  countStmt.free();

  if (count > 0) {
    db.run('DELETE FROM watch_activity WHERE watched_folder_id = ?', [folderId]);
    saveDatabase();
  }

  return count;
}
