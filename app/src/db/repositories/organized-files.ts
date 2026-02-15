/**
 * Organized Files Repository
 * ==========================
 * CRUD operations for organized file records (Premium Feature).
 * Tracks files that have been organized by the file organizer.
 * Uses parameterized queries for security.
 */

import { requireDB, saveDatabase, validatePositiveInteger, getLastInsertId } from './utils.js';
import { logActivity } from './activity-log.js';
import { incrementRuleMatchCount } from './organization-rules.js';
import {
  validateRequiredString,
  validateOptionalString,
  sanitizeText,
} from '../../utils/validation.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Valid file statuses.
 */
export type FileStatus = 'moved' | 'tracked' | 'undone' | 'deleted';

/**
 * Organized file record.
 */
export interface OrganizedFile {
  id: number;
  filename: string;
  original_path: string;
  current_path: string;
  jd_folder_number: string | null;
  jd_item_id: number | null;
  file_extension: string | null;
  file_type: string | null;
  file_size: number | null;
  file_modified_at: string | null;
  matched_rule_id: number | null;
  cloud_drive_id: string | null;
  status: FileStatus;
  organized_at: string;
}

/**
 * Input for recording an organized file.
 */
export interface RecordOrganizedFileInput {
  filename: string;
  original_path: string;
  current_path: string;
  jd_folder_number?: string | null;
  jd_item_id?: number | null;
  file_extension?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  file_modified_at?: string | null;
  matched_rule_id?: number | null;
  cloud_drive_id?: string | null;
  status?: FileStatus;
}

/**
 * Options for getting organized files.
 */
export interface GetOrganizedFilesOptions {
  status?: FileStatus;
  jdFolderNumber?: string;
  fileType?: string;
  limit?: number;
  offset?: number;
}

/**
 * Organized files statistics.
 */
export interface OrganizedFilesStats {
  totalMoved: number;
  totalTracked: number;
  totalUndone: number;
  totalSize: number;
  byType: Record<string, number>;
  topFolders: Array<{ folder_number: string; count: number }>;
}

/**
 * Input for updating an organized file.
 */
export interface UpdateOrganizedFileInput {
  status?: FileStatus;
  current_path?: string;
  jd_folder_number?: string;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Valid statuses for organized files.
 */
export const VALID_FILE_STATUSES: readonly FileStatus[] = ['moved', 'tracked', 'undone', 'deleted'];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map a database row to an organized file object.
 */
function mapRowToFile(row: unknown[]): OrganizedFile {
  return {
    id: row[0] as number,
    filename: row[1] as string,
    original_path: row[2] as string,
    current_path: row[3] as string,
    jd_folder_number: row[4] as string | null,
    jd_item_id: row[5] as number | null,
    file_extension: row[6] as string | null,
    file_type: row[7] as string | null,
    file_size: row[8] as number | null,
    file_modified_at: row[9] as string | null,
    matched_rule_id: row[10] as number | null,
    cloud_drive_id: row[11] as string | null,
    status: row[12] as FileStatus,
    organized_at: row[13] as string,
  };
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get organized files with optional filtering.
 */
export function getOrganizedFiles(options: GetOrganizedFilesOptions = {}): OrganizedFile[] {
  const db = requireDB();
  const { status, jdFolderNumber, fileType, limit = 100, offset = 0 } = options;

  let query = 'SELECT * FROM organized_files WHERE 1=1';
  const params: unknown[] = [];

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
  return results[0]?.values?.map(mapRowToFile) || [];
}

/**
 * Get a single organized file by ID.
 */
export function getOrganizedFile(fileId: number | string): OrganizedFile | null {
  const db = requireDB();
  const id = validatePositiveInteger(fileId, 'File ID');

  const stmt = db.prepare('SELECT * FROM organized_files WHERE id = ?');
  stmt.bind([id]);

  let result: OrganizedFile | null = null;
  if (stmt.step()) {
    result = mapRowToFile(stmt.get());
  }
  stmt.free();

  return result;
}

/**
 * Check if a file (by original path) has already been organized.
 */
export function findOrganizedFileByPath(originalPath: string): OrganizedFile | null {
  const db = requireDB();
  const path = validateRequiredString(originalPath, 'Original path', 1000);

  const stmt = db.prepare('SELECT * FROM organized_files WHERE original_path = ? AND status != ?');
  stmt.bind([path, 'undone']);

  let result: OrganizedFile | null = null;
  if (stmt.step()) {
    result = mapRowToFile(stmt.get());
  }
  stmt.free();

  return result;
}

/**
 * Get recent organized files for undo history.
 */
export function getRecentOrganizedFiles(limit: number = 20): OrganizedFile[] {
  return getOrganizedFiles({ status: 'moved', limit });
}

/**
 * Get count of organized files.
 */
export function getOrganizedFileCount(status: FileStatus | null = null): number {
  const db = requireDB();

  if (status && VALID_FILE_STATUSES.includes(status)) {
    const stmt = db.prepare('SELECT COUNT(*) FROM organized_files WHERE status = ?');
    stmt.bind([status]);
    stmt.step();
    const count = stmt.get()[0] as number;
    stmt.free();
    return count;
  }

  const results = db.exec('SELECT COUNT(*) FROM organized_files');
  const count = results[0]?.values?.[0]?.[0];
  return typeof count === 'number' ? count : 0;
}

/**
 * Get statistics about organized files.
 */
export function getOrganizedFilesStats(): OrganizedFilesStats {
  const db = requireDB();

  const totalMoved =
    db.exec("SELECT COUNT(*) FROM organized_files WHERE status = 'moved'")[0]?.values?.[0]?.[0] || 0;
  const totalTracked =
    db.exec("SELECT COUNT(*) FROM organized_files WHERE status = 'tracked'")[0]?.values?.[0]?.[0] || 0;
  const totalUndone =
    db.exec("SELECT COUNT(*) FROM organized_files WHERE status = 'undone'")[0]?.values?.[0]?.[0] || 0;
  const totalSize =
    db.exec("SELECT SUM(file_size) FROM organized_files WHERE status = 'moved'")[0]?.values?.[0]?.[0] ||
    0;

  // Get breakdown by file type
  const byTypeResults = db.exec(`
    SELECT file_type, COUNT(*) as count
    FROM organized_files
    WHERE status = 'moved' AND file_type IS NOT NULL
    GROUP BY file_type
    ORDER BY count DESC
  `);

  const byType: Record<string, number> =
    byTypeResults[0]?.values?.reduce((acc, row) => {
      acc[row[0] as string] = row[1] as number;
      return acc;
    }, {} as Record<string, number>) || {};

  // Get breakdown by JD folder
  const byFolderResults = db.exec(`
    SELECT jd_folder_number, COUNT(*) as count
    FROM organized_files
    WHERE status = 'moved' AND jd_folder_number IS NOT NULL
    GROUP BY jd_folder_number
    ORDER BY count DESC
    LIMIT 10
  `);

  const topFolders: Array<{ folder_number: string; count: number }> =
    byFolderResults[0]?.values?.map((row) => ({
      folder_number: row[0] as string,
      count: row[1] as number,
    })) || [];

  return {
    totalMoved: totalMoved as number,
    totalTracked: totalTracked as number,
    totalUndone: totalUndone as number,
    totalSize: totalSize as number,
    byType,
    topFolders,
  };
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Record a file that has been organized.
 */
export function recordOrganizedFile(file: RecordOrganizedFileInput): number {
  const db = requireDB();

  try {
    // Validate required fields
    const filename = validateRequiredString(file.filename, 'Filename', 500);
    const originalPath = validateRequiredString(file.original_path, 'Original path', 1000);
    const currentPath = validateRequiredString(file.current_path, 'Current path', 1000);

    // Validate optional fields
    const jdFolderNumber = validateOptionalString(file.jd_folder_number ?? null, 'JD folder number', 20);
    const fileExtension = validateOptionalString(file.file_extension ?? null, 'Extension', 20);
    const fileType = validateOptionalString(file.file_type ?? null, 'File type', 50);
    const cloudDriveId = validateOptionalString(file.cloud_drive_id ?? null, 'Cloud drive ID', 50);

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
      file.jd_item_id ?? null,
      fileExtension,
      fileType,
      file.file_size ?? null,
      file.file_modified_at ?? null,
      file.matched_rule_id ?? null,
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
    if ((error as Error).name === 'ValidationError' || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to record organized file: ${(error as Error).message}`, 'insert');
  }
}

/**
 * Mark an organized file as undone (for undo functionality).
 */
export function markFileUndone(fileId: number | string): void {
  const db = requireDB();
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
 */
export function updateOrganizedFile(fileId: number | string, updates: UpdateOrganizedFileInput): void {
  const db = requireDB();
  const id = validatePositiveInteger(fileId, 'File ID');

  const allowedFields = ['status', 'current_path', 'jd_folder_number'];
  const updateParts: string[] = [];
  const values: unknown[] = [];

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
 */
export function deleteOrganizedFile(fileId: number | string): void {
  const db = requireDB();
  const id = validatePositiveInteger(fileId, 'File ID');

  db.run('DELETE FROM organized_files WHERE id = ?', [id]);
  saveDatabase();
}

/**
 * Clear old organized file records.
 * Useful for cleanup of historical data.
 */
export function clearOldOrganizedFiles(daysOld: number = 90): number {
  const db = requireDB();
  const safeDays = Math.max(1, Math.abs(daysOld));

  const countResult = db.exec(`
    SELECT COUNT(*) FROM organized_files
    WHERE organized_at < datetime('now', '-${safeDays} days')
  `);
  const count = countResult[0]?.values?.[0]?.[0] || 0;

  if (typeof count === 'number' && count > 0) {
    db.run(`DELETE FROM organized_files WHERE organized_at < datetime('now', '-${safeDays} days')`);
    saveDatabase();
  }

  return typeof count === 'number' ? count : 0;
}
