/**
 * Activity Log Repository
 * =======================
 * CRUD operations for activity logging and retrieval.
 */

import { requireDB, mapResults } from './utils.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Activity log entry.
 */
export interface ActivityLogEntry {
  id: number;
  action: string;
  entity_type: string | null;
  entity_number: string | null;
  details: string | null;
  timestamp: string;
}

/**
 * Activity action types.
 */
export type ActivityAction = 'created' | 'updated' | 'deleted' | 'moved' | 'organized' | string;

/**
 * Entity types for activity logging.
 */
export type EntityType = 'folder' | 'item' | 'category' | 'area' | 'rule' | 'file' | string;

// ============================================
// COLUMN DEFINITIONS
// ============================================

const ACTIVITY_COLUMNS = [
  'id',
  'action',
  'entity_type',
  'entity_number',
  'details',
  'timestamp',
] as const;

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Log an activity event.
 */
export function logActivity(
  action: ActivityAction,
  entityType: EntityType,
  entityNumber: string,
  details: string | null = null
): void {
  const db = requireDB();
  db.run(
    'INSERT INTO activity_log (action, entity_type, entity_number, details) VALUES (?, ?, ?, ?)',
    [action, entityType, entityNumber, details]
  );
}

/**
 * Get recent activity entries.
 */
export function getRecentActivity(limit: number = 20): ActivityLogEntry[] {
  const db = requireDB();
  // Validate and constrain limit to reasonable bounds
  const parsed = typeof limit === 'string' ? parseInt(limit, 10) : limit;
  const safeLimit = Math.min(Math.max(1, Number.isNaN(parsed) ? 20 : parsed), 100);

  const results = db.exec(
    `SELECT ${ACTIVITY_COLUMNS.join(', ')} FROM activity_log ORDER BY timestamp DESC LIMIT ?`,
    [safeLimit]
  );
  return mapResults(results, ACTIVITY_COLUMNS) as unknown as ActivityLogEntry[];
}

/**
 * Clear all activity log entries.
 * Use with caution - this is irreversible.
 */
export function clearActivityLog(): void {
  const db = requireDB();
  db.run('DELETE FROM activity_log');
}

/**
 * Get activity count.
 */
export function getActivityCount(): number {
  const db = requireDB();
  const results = db.exec('SELECT COUNT(*) FROM activity_log');
  const count = results[0]?.values?.[0]?.[0];
  return typeof count === 'number' ? count : 0;
}
