/**
 * Watched Folders Repository
 * ==========================
 * CRUD operations for watched folders (Premium Feature).
 * Manages folder monitoring configurations.
 * Uses parameterized queries for security.
 */

import { requireDB, saveDatabase, validatePositiveInteger, getLastInsertId } from './utils.js';
import { validateRequiredString, sanitizeText } from '../../utils/validation.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Valid confidence thresholds.
 */
export type ConfidenceThreshold = 'low' | 'medium' | 'high';

/**
 * Watched folder record.
 */
export interface WatchedFolder {
  id: number;
  name: string;
  path: string;
  is_active: boolean;
  auto_organize: boolean;
  confidence_threshold: ConfidenceThreshold;
  include_subdirs: boolean;
  file_types: string[] | null;
  notify_on_organize: boolean;
  last_checked_at: string | null;
  files_processed: number;
  files_organized: number;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a watched folder.
 */
export interface CreateWatchedFolderInput {
  name: string;
  path: string;
  is_active?: boolean;
  auto_organize?: boolean;
  confidence_threshold?: ConfidenceThreshold;
  include_subdirs?: boolean;
  file_types?: string[];
  notify_on_organize?: boolean;
}

/**
 * Input for updating a watched folder.
 */
export interface UpdateWatchedFolderInput {
  name?: string;
  path?: string;
  is_active?: boolean;
  auto_organize?: boolean;
  confidence_threshold?: ConfidenceThreshold;
  include_subdirs?: boolean;
  file_types?: string[];
  notify_on_organize?: boolean;
  last_checked_at?: string;
  files_processed?: number;
  files_organized?: number;
}

/**
 * Options for getting watched folders.
 */
export interface GetWatchedFoldersOptions {
  activeOnly?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Valid confidence thresholds for auto-organization.
 */
export const VALID_CONFIDENCE_THRESHOLDS: readonly ConfidenceThreshold[] = [
  'low',
  'medium',
  'high',
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map a database row to a watched folder object.
 */
function mapRowToWatchedFolder(columns: string[], row: unknown[]): WatchedFolder {
  const obj: Record<string, unknown> = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });

  // Convert integer booleans
  obj.is_active = obj.is_active === 1;
  obj.auto_organize = obj.auto_organize === 1;
  obj.include_subdirs = obj.include_subdirs === 1;
  obj.notify_on_organize = obj.notify_on_organize === 1;

  // Parse file_types JSON if present
  if (obj.file_types) {
    try {
      obj.file_types = JSON.parse(obj.file_types as string);
    } catch {
      obj.file_types = [];
    }
  }

  return obj as unknown as WatchedFolder;
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all watched folders with optional filtering.
 */
export function getWatchedFolders(options: GetWatchedFoldersOptions = {}): WatchedFolder[] {
  const db = requireDB();

  let sql = 'SELECT * FROM watched_folders';
  const conditions: string[] = [];

  if (options.activeOnly) {
    conditions.push('is_active = 1');
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY created_at DESC';

  const result = db.exec(sql);
  const queryResult = result[0];
  if (!queryResult?.values || !queryResult?.columns) return [];

  const { columns, values } = queryResult;
  return values.map((row) => mapRowToWatchedFolder(columns, row));
}

/**
 * Get a watched folder by ID.
 */
export function getWatchedFolder(id: number | string): WatchedFolder | null {
  const db = requireDB();
  const folderId = validatePositiveInteger(id, 'Watched Folder ID');

  const stmt = db.prepare('SELECT * FROM watched_folders WHERE id = ?');
  stmt.bind([folderId]);

  let result: WatchedFolder | null = null;
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
 */
export function getWatchedFolderByPath(path: string): WatchedFolder | null {
  const db = requireDB();
  const sanitizedPath = sanitizeText(path);

  const stmt = db.prepare('SELECT * FROM watched_folders WHERE path = ?');
  stmt.bind([sanitizedPath]);

  let result: WatchedFolder | null = null;
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
 */
export function getWatchedFolderCount(activeOnly: boolean = false): number {
  const db = requireDB();
  const query = activeOnly
    ? 'SELECT COUNT(*) FROM watched_folders WHERE is_active = 1'
    : 'SELECT COUNT(*) FROM watched_folders';
  const results = db.exec(query);
  const count = results[0]?.values?.[0]?.[0];
  return typeof count === 'number' ? count : 0;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Create a new watched folder.
 */
export function createWatchedFolder(folder: CreateWatchedFolderInput): number {
  const db = requireDB();

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
    if ((error as Error).name === 'ValidationError' || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to create watched folder: ${(error as Error).message}`,
      'insert'
    );
  }
}

/**
 * Update a watched folder.
 */
export function updateWatchedFolder(id: number | string, updates: UpdateWatchedFolderInput): void {
  const db = requireDB();
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

  const updateParts: string[] = [];
  const values: unknown[] = [];

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
 */
export function deleteWatchedFolder(id: number | string): void {
  const db = requireDB();
  const folderId = validatePositiveInteger(id, 'Watched Folder ID');

  db.run('DELETE FROM watched_folders WHERE id = ?', [folderId]);
  saveDatabase();
}

/**
 * Increment the processed/organized counts for a watched folder.
 */
export function incrementWatchedFolderStats(id: number | string, organized: boolean = false): void {
  const db = requireDB();
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
 */
export function toggleWatchedFolder(id: number | string): boolean {
  const db = requireDB();
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
 */
export function resetWatchedFolderStats(id: number | string): void {
  const db = requireDB();
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
