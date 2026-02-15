/**
 * Scanned Files Repository
 * ========================
 * CRUD operations for scanned files working set (Premium Feature).
 * Manages temporary file data during the scan/organize workflow.
 * Uses parameterized queries for security.
 */

import { requireDB, saveDatabase, validatePositiveInteger, getLastInsertId } from './utils.js';
import { validateRequiredString, sanitizeText } from '../../utils/validation.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Valid user decisions.
 */
export type Decision = 'pending' | 'accepted' | 'changed' | 'skipped';

/**
 * Valid confidence levels.
 */
export type ConfidenceLevel = 'none' | 'low' | 'medium' | 'high';

/**
 * Scanned file record.
 */
export interface ScannedFile {
  id: number;
  scan_session_id: string;
  filename: string;
  path: string;
  parent_folder: string | null;
  file_extension: string | null;
  file_type: string | null;
  file_size: number | null;
  file_modified_at: string | null;
  suggested_jd_folder: string | null;
  suggested_rule_id: number | null;
  suggestion_confidence: ConfidenceLevel;
  user_decision: Decision;
  user_target_folder: string | null;
  scanned_at: string;
}

/**
 * Scanned file with final target (ready for organization).
 */
export interface ScannedFileWithTarget extends ScannedFile {
  final_target: string | null;
}

/**
 * Input for adding a scanned file.
 */
export interface AddScannedFileInput {
  scan_session_id: string;
  filename: string;
  path: string;
  parent_folder?: string | null;
  file_extension?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  file_modified_at?: string | null;
  suggested_jd_folder?: string | null;
  suggested_rule_id?: number | null;
  suggestion_confidence?: ConfidenceLevel;
}

/**
 * Options for getting scanned files.
 */
export interface GetScannedFilesOptions {
  decision?: Decision;
  fileType?: string;
  hasSuggestion?: boolean;
}

/**
 * Scan statistics.
 */
export interface ScanStats {
  total: number;
  pending: number;
  accepted: number;
  changed: number;
  skipped: number;
  withSuggestions: number;
  withoutSuggestions: number;
  totalSize: number;
  byType: Record<string, number>;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Valid user decisions for scanned files.
 */
export const VALID_DECISIONS: readonly Decision[] = ['pending', 'accepted', 'changed', 'skipped'];

/**
 * Valid confidence levels for suggestions.
 */
export const VALID_CONFIDENCE_LEVELS: readonly ConfidenceLevel[] = [
  'none',
  'low',
  'medium',
  'high',
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map a database row to a scanned file object.
 */
function mapRowToScannedFile(row: unknown[]): ScannedFile {
  return {
    id: row[0] as number,
    scan_session_id: row[1] as string,
    filename: row[2] as string,
    path: row[3] as string,
    parent_folder: row[4] as string | null,
    file_extension: row[5] as string | null,
    file_type: row[6] as string | null,
    file_size: row[7] as number | null,
    file_modified_at: row[8] as string | null,
    suggested_jd_folder: row[9] as string | null,
    suggested_rule_id: row[10] as number | null,
    suggestion_confidence: row[11] as ConfidenceLevel,
    user_decision: row[12] as Decision,
    user_target_folder: row[13] as string | null,
    scanned_at: row[14] as string,
  };
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Generate a unique scan session ID.
 */
export function generateScanSessionId(): string {
  return `scan_${Date.now()}`;
}

/**
 * Clear all scanned files from a previous session.
 * Call this before starting a new scan.
 */
export function clearScannedFiles(sessionId: string | null = null): void {
  const db = requireDB();

  if (sessionId) {
    const id = validateRequiredString(sessionId, 'Session ID', 50);
    db.run('DELETE FROM scanned_files WHERE scan_session_id = ?', [id]);
  } else {
    db.run('DELETE FROM scanned_files');
  }
  saveDatabase();
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get scanned files for the current session.
 */
export function getScannedFiles(
  sessionId: string,
  options: GetScannedFilesOptions = {}
): ScannedFile[] {
  const db = requireDB();
  const id = validateRequiredString(sessionId, 'Session ID', 50);
  const { decision, fileType, hasSuggestion } = options;

  let query = 'SELECT * FROM scanned_files WHERE scan_session_id = ?';
  const params: unknown[] = [id];

  if (decision && VALID_DECISIONS.includes(decision)) {
    query += ' AND user_decision = ?';
    params.push(decision);
  }

  if (fileType) {
    query += ' AND file_type = ?';
    params.push(sanitizeText(fileType));
  }

  if (hasSuggestion === true) {
    query += ' AND suggested_jd_folder IS NOT NULL';
  } else if (hasSuggestion === false) {
    query += ' AND suggested_jd_folder IS NULL';
  }

  query += ' ORDER BY filename ASC';

  const results = db.exec(query, params);
  return results[0]?.values?.map(mapRowToScannedFile) || [];
}

/**
 * Get a single scanned file by ID.
 */
export function getScannedFile(fileId: number | string): ScannedFile | null {
  const db = requireDB();
  const id = validatePositiveInteger(fileId, 'File ID');

  const stmt = db.prepare('SELECT * FROM scanned_files WHERE id = ?');
  stmt.bind([id]);

  let result: ScannedFile | null = null;
  if (stmt.step()) {
    result = mapRowToScannedFile(stmt.get());
  }
  stmt.free();

  return result;
}

/**
 * Get files that are ready to be organized (accepted or changed).
 */
export function getFilesReadyToOrganize(sessionId: string): ScannedFileWithTarget[] {
  const db = requireDB();
  const id = validateRequiredString(sessionId, 'Session ID', 50);

  const stmt = db.prepare(`
    SELECT * FROM scanned_files
    WHERE scan_session_id = ?
    AND user_decision IN ('accepted', 'changed')
    ORDER BY filename
  `);
  stmt.bind([id]);

  const files: ScannedFileWithTarget[] = [];
  while (stmt.step()) {
    const row = stmt.get();
    const file = mapRowToScannedFile(row) as ScannedFileWithTarget;
    // Add computed field for final target
    file.final_target = file.user_target_folder || file.suggested_jd_folder;
    files.push(file);
  }
  stmt.free();

  return files;
}

/**
 * Get statistics for the current scan session.
 */
export function getScanStats(sessionId: string): ScanStats {
  const db = requireDB();
  const id = validateRequiredString(sessionId, 'Session ID', 50);

  // Helper to get count with parameterized query
  const getCount = (whereClause: string): number => {
    const stmt = db.prepare(
      `SELECT COUNT(*) FROM scanned_files WHERE scan_session_id = ? ${whereClause}`
    );
    stmt.bind([id]);
    stmt.step();
    const count = stmt.get()[0] as number;
    stmt.free();
    return count || 0;
  };

  const total = getCount('');
  const pending = getCount("AND user_decision = 'pending'");
  const accepted = getCount("AND user_decision = 'accepted'");
  const changed = getCount("AND user_decision = 'changed'");
  const skipped = getCount("AND user_decision = 'skipped'");
  const withSuggestions = getCount('AND suggested_jd_folder IS NOT NULL');

  // Get total size
  const sizeStmt = db.prepare('SELECT SUM(file_size) FROM scanned_files WHERE scan_session_id = ?');
  sizeStmt.bind([id]);
  sizeStmt.step();
  const totalSize = (sizeStmt.get()[0] as number) || 0;
  sizeStmt.free();

  // By file type
  const typeStmt = db.prepare(`
    SELECT file_type, COUNT(*)
    FROM scanned_files
    WHERE scan_session_id = ? AND file_type IS NOT NULL
    GROUP BY file_type
  `);
  typeStmt.bind([id]);

  const byType: Record<string, number> = {};
  while (typeStmt.step()) {
    const row = typeStmt.get();
    byType[row[0] as string] = row[1] as number;
  }
  typeStmt.free();

  return {
    total,
    pending,
    accepted,
    changed,
    skipped,
    withSuggestions,
    withoutSuggestions: total - withSuggestions,
    totalSize,
    byType,
  };
}

/**
 * Get count of scanned files in a session.
 */
export function getScannedFileCount(sessionId: string): number {
  const db = requireDB();
  const id = validateRequiredString(sessionId, 'Session ID', 50);

  const stmt = db.prepare('SELECT COUNT(*) FROM scanned_files WHERE scan_session_id = ?');
  stmt.bind([id]);
  stmt.step();
  const count = stmt.get()[0] as number;
  stmt.free();

  return count || 0;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Add a scanned file to the working set.
 */
export function addScannedFile(file: AddScannedFileInput): number {
  const db = requireDB();

  const sessionId = validateRequiredString(file.scan_session_id, 'Session ID', 50);
  const filename = validateRequiredString(file.filename, 'Filename', 500);
  const path = validateRequiredString(file.path, 'Path', 1000);

  const stmt = db.prepare(`
    INSERT INTO scanned_files (
      scan_session_id, filename, path, parent_folder, file_extension,
      file_type, file_size, file_modified_at, suggested_jd_folder,
      suggested_rule_id, suggestion_confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const confidence = VALID_CONFIDENCE_LEVELS.includes(file.suggestion_confidence as ConfidenceLevel)
    ? file.suggestion_confidence
    : 'none';

  stmt.run([
    sessionId,
    filename,
    path,
    file.parent_folder ?? null,
    file.file_extension ?? null,
    file.file_type ?? null,
    file.file_size ?? null,
    file.file_modified_at ?? null,
    file.suggested_jd_folder ?? null,
    file.suggested_rule_id ?? null,
    confidence,
  ]);

  stmt.free();

  // Don't save after each file - caller should batch save
  return getLastInsertId();
}

/**
 * Batch add multiple scanned files (more efficient).
 */
export function addScannedFilesBatch(files: AddScannedFileInput[]): number {
  if (!Array.isArray(files) || files.length === 0) return 0;

  let count = 0;

  for (const file of files) {
    try {
      addScannedFile(file);
      count++;
    } catch (e) {
      console.warn(`[JDex DB] Skipped invalid file: ${(e as Error).message}`);
    }
  }

  saveDatabase();
  return count;
}

/**
 * Update a scanned file's user decision.
 */
export function updateScannedFileDecision(
  fileId: number | string,
  decision: Decision,
  targetFolder: string | null = null
): void {
  const db = requireDB();
  const id = validatePositiveInteger(fileId, 'File ID');

  if (!VALID_DECISIONS.includes(decision)) {
    throw new DatabaseError('Invalid decision value', 'update');
  }

  const folder = targetFolder ? sanitizeText(targetFolder) : null;

  db.run(
    `
    UPDATE scanned_files
    SET user_decision = ?, user_target_folder = ?
    WHERE id = ?
  `,
    [decision, folder, id]
  );

  saveDatabase();
}

/**
 * Accept a suggestion (shorthand for updateScannedFileDecision).
 */
export function acceptScannedFileSuggestion(fileId: number | string): void {
  updateScannedFileDecision(fileId, 'accepted');
}

/**
 * Skip a scanned file (don't organize it).
 */
export function skipScannedFile(fileId: number | string): void {
  updateScannedFileDecision(fileId, 'skipped');
}

/**
 * Change a scanned file's target folder.
 */
export function changeScannedFileTarget(fileId: number | string, targetFolder: string): void {
  updateScannedFileDecision(fileId, 'changed', targetFolder);
}

/**
 * Update suggestion for a scanned file.
 */
export function updateScannedFileSuggestion(
  fileId: number | string,
  suggestedFolder: string,
  ruleId: number | null = null,
  confidence: ConfidenceLevel = 'medium'
): void {
  const db = requireDB();
  const id = validatePositiveInteger(fileId, 'File ID');
  const validConfidence = VALID_CONFIDENCE_LEVELS.includes(confidence) ? confidence : 'medium';

  db.run(
    `
    UPDATE scanned_files
    SET suggested_jd_folder = ?, suggested_rule_id = ?, suggestion_confidence = ?
    WHERE id = ?
  `,
    [suggestedFolder, ruleId, validConfidence, id]
  );

  saveDatabase();
}

/**
 * Delete a scanned file record.
 */
export function deleteScannedFile(fileId: number | string): void {
  const db = requireDB();
  const id = validatePositiveInteger(fileId, 'File ID');

  db.run('DELETE FROM scanned_files WHERE id = ?', [id]);
  saveDatabase();
}
