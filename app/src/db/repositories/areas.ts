/**
 * Areas Repository
 * =================
 * CRUD operations for JD Areas (top-level organizational units).
 */

import {
  requireDB,
  saveDatabase,
  mapResults,
  validatePositiveInteger,
  buildUpdateQuery,
  getLastInsertId,
} from './utils.js';
import { logActivity } from './activity-log.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Area record.
 */
export interface Area {
  id: number;
  range_start: number;
  range_end: number;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

/**
 * Input for creating an area.
 */
export interface CreateAreaInput {
  range_start: number;
  range_end: number;
  name: string;
  description?: string;
  color?: string;
}

/**
 * Input for updating an area.
 */
export interface UpdateAreaInput {
  range_start?: number;
  range_end?: number;
  name?: string;
  description?: string;
  color?: string;
}

// ============================================
// COLUMN DEFINITIONS
// ============================================

const AREA_COLUMNS = [
  'id',
  'range_start',
  'range_end',
  'name',
  'description',
  'color',
  'created_at',
] as const;

const UPDATABLE_COLUMNS = ['range_start', 'range_end', 'name', 'description', 'color'] as const;

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get all areas.
 */
export function getAreas(): Area[] {
  const db = requireDB();
  const results = db.exec(`SELECT ${AREA_COLUMNS.join(', ')} FROM areas ORDER BY range_start`);
  return mapResults(results, AREA_COLUMNS) as Area[];
}

/**
 * Get a single area by ID.
 */
export function getArea(id: number | string): Area | null {
  const validId = validatePositiveInteger(id, 'id');
  const db = requireDB();
  const results = db.exec(`SELECT ${AREA_COLUMNS.join(', ')} FROM areas WHERE id = ?`, [validId]);
  const mapped = mapResults(results, AREA_COLUMNS) as Area[];
  return mapped[0] || null;
}

/**
 * Create a new area.
 */
export function createArea(area: CreateAreaInput): number {
  const db = requireDB();
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
 */
export function updateArea(id: number | string, updates: UpdateAreaInput): boolean {
  const validId = validatePositiveInteger(id, 'id');
  const db = requireDB();

  const query = buildUpdateQuery('areas', updates, UPDATABLE_COLUMNS);

  if (!query) return false;

  db.run(query.sql, [...query.values, validId]);
  logActivity('update', 'area', validId.toString(), `Updated area ID: ${validId}`);
  saveDatabase();
  return true;
}

/**
 * Delete an area.
 * @throws {DatabaseError} If area has existing categories
 */
export function deleteArea(id: number | string): void {
  const validId = validatePositiveInteger(id, 'id');
  const db = requireDB();

  // Check for child categories
  const cats = db.exec('SELECT COUNT(*) FROM categories WHERE area_id = ?', [validId]);
  const count = cats[0]?.values?.[0]?.[0];
  if (typeof count === 'number' && count > 0) {
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
 */
export function getAreaCount(): number {
  const db = requireDB();
  const results = db.exec('SELECT COUNT(*) FROM areas');
  const count = results[0]?.values?.[0]?.[0];
  return typeof count === 'number' ? count : 0;
}

/**
 * Check if an area number range is available.
 */
export function isAreaRangeAvailable(
  rangeStart: number,
  rangeEnd: number,
  excludeId: number | string | null = null
): boolean {
  const db = requireDB();
  let query = `SELECT COUNT(*) FROM areas WHERE
    (range_start <= ? AND range_end >= ?) OR
    (range_start <= ? AND range_end >= ?) OR
    (range_start >= ? AND range_end <= ?)`;
  const params: unknown[] = [rangeEnd, rangeStart, rangeStart, rangeStart, rangeStart, rangeEnd];

  if (excludeId !== null) {
    const validExcludeId = validatePositiveInteger(excludeId, 'excludeId');
    query += ' AND id != ?';
    params.push(validExcludeId);
  }

  const results = db.exec(query, params);
  const count = results[0]?.values?.[0]?.[0];
  return (typeof count === 'number' ? count : 0) === 0;
}
