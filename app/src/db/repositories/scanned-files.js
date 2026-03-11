/**
 * Scanned Files Repository
 * ========================
 * CRUD operations for scanned files working set (Premium Feature).
 * Manages temporary file data during the scan/organize workflow.
 * Uses parameterized queries for security.
 */

import { getDB, saveDatabase, validatePositiveInteger, getLastInsertId } from './utils.js';
import { validateRequiredString, sanitizeText } from '../../utils/validation.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// CONSTANTS
// ============================================

/**
 * Valid user decisions for scanned files.
 */
export const VALID_DECISIONS = ['pending', 'accepted', 'changed', 'skipped'];

/**
 * Valid confidence levels for suggestions.
 */
export const VALID_CONFIDENCE_LEVELS = ['none', 'low', 'medium', 'high'];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map a database row to a scanned file object.
 * @param {Array} row - Database row
 * @returns {Object} Scanned file object
 */
function mapRowToScannedFile(row) {
  return {
    id: row[0],
    scan_session_id: row[1],
    filename: row[2],
    path: row[3],
    parent_folder: row[4],
    file_extension: row[5],
    file_type: row[6],
    file_size: row[7],
    file_modified_at: row[8],
    suggested_jd_folder: row[9],
    suggested_rule_id: row[10],
    suggestion_confidence: row[11],
    user_decision: row[12],
    user_target_folder: row[13],
    scanned_at: row[14],
  };
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Generate a unique scan session ID.
 * @returns {string} Session ID like "scan_1705123456789"
 */
export function generateScanSessionId() {
  return `scan_${Date.now()}`;
}

/**
 * Clear all scanned files from a previous session.
 * Call this before starting a new scan.
 *
 * @param {string} [sessionId] - Clear specific session, or all if not provided
 */
export function clearScannedFiles(sessionId = null) {
  const db = getDB();

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
 *
 * @param {string} sessionId - The scan session ID
 * @param {Object} options - Filter options
 * @param {string} [options.decision] - Filter by user decision
 * @param {string} [options.fileType] - Filter by file type
 * @param {boolean} [options.hasSuggestion] - Only files with suggestions
 * @returns {Array} Array of scanned file objects
 */
export function getScannedFiles(sessionId, options = {}) {
  const db = getDB();
  const id = validateRequiredString(sessionId, 'Session ID', 50);
  const { decision, fileType, hasSuggestion } = options;

  let query = 'SELECT * FROM scanned_files WHERE scan_session_id = ?';
  const params = [id];

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
  return results[0]?.values.map(mapRowToScannedFile) || [];
}

/**
 * Get a single scanned file by ID.
 *
 * @param {number} fileId - The scanned file ID
 * @returns {Object|null} The scanned file or null
 */
export function getScannedFile(fileId) {
  const db = getDB();
  const id = validatePositiveInteger(fileId, 'File ID');

  const stmt = db.prepare('SELECT * FROM scanned_files WHERE id = ?');
  stmt.bind([id]);

  let result = null;
  if (stmt.step()) {
    result = mapRowToScannedFile(stmt.get());
  }
  stmt.free();

  return result;
}

/**
 * Get files that are ready to be organized (accepted or changed).
 *
 * @param {string} sessionId - The scan session ID
 * @returns {Array} Files ready for organization
 */
export function getFilesReadyToOrganize(sessionId) {
  const db = getDB();
  const id = validateRequiredString(sessionId, 'Session ID', 50);

  const stmt = db.prepare(`
    SELECT * FROM scanned_files
    WHERE scan_session_id = ?
    AND user_decision IN ('accepted', 'changed')
    ORDER BY filename
  `);
  stmt.bind([id]);

  const files = [];
  while (stmt.step()) {
    const row = stmt.get();
    const file = mapRowToScannedFile(row);
    // Add computed field for final target
    file.final_target = file.user_target_folder || file.suggested_jd_folder;
    files.push(file);
  }
  stmt.free();

  return files;
}

/**
 * Get statistics for the current scan session.
 *
 * @param {string} sessionId - The scan session ID
 * @returns {Object} Scan statistics
 */
export function getScanStats(sessionId) {
  const db = getDB();
  const id = validateRequiredString(sessionId, 'Session ID', 50);

  // Helper to get count with parameterized query
  const getCount = (whereClause) => {
    const stmt = db.prepare(
      `SELECT COUNT(*) FROM scanned_files WHERE scan_session_id = ? ${whereClause}`
    );
    stmt.bind([id]);
    stmt.step();
    const count = stmt.get()[0];
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
  const totalSize = sizeStmt.get()[0] || 0;
  sizeStmt.free();

  // By file type
  const typeStmt = db.prepare(`
    SELECT file_type, COUNT(*)
    FROM scanned_files
    WHERE scan_session_id = ? AND file_type IS NOT NULL
    GROUP BY file_type
  `);
  typeStmt.bind([id]);

  const byType = {};
  while (typeStmt.step()) {
    const row = typeStmt.get();
    byType[row[0]] = row[1];
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
 * @param {string} sessionId - The scan session ID
 * @returns {number} Number of files
 */
export function getScannedFileCount(sessionId) {
  const db = getDB();
  const id = validateRequiredString(sessionId, 'Session ID', 50);

  const stmt = db.prepare('SELECT COUNT(*) FROM scanned_files WHERE scan_session_id = ?');
  stmt.bind([id]);
  stmt.step();
  const count = stmt.get()[0];
  stmt.free();

  return count || 0;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Add a scanned file to the working set.
 *
 * @param {Object} file - The scanned file data
 * @param {string} file.scan_session_id - Current scan session ID
 * @param {string} file.filename - The filename
 * @param {string} file.path - Full path to the file
 * @param {string} [file.parent_folder] - Parent folder path
 * @param {string} [file.file_extension] - File extension
 * @param {string} [file.file_type] - File type category
 * @param {number} [file.file_size] - File size in bytes
 * @param {string} [file.file_modified_at] - File modification date
 * @param {string} [file.suggested_jd_folder] - Suggested JD folder
 * @param {number} [file.suggested_rule_id] - Rule that made the suggestion
 * @param {string} [file.suggestion_confidence] - none, low, medium, high
 * @returns {number} The record ID
 */
export function addScannedFile(file) {
  const db = getDB();

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

  const confidence = VALID_CONFIDENCE_LEVELS.includes(file.suggestion_confidence)
    ? file.suggestion_confidence
    : 'none';

  stmt.run([
    sessionId,
    filename,
    path,
    file.parent_folder || null,
    file.file_extension || null,
    file.file_type || null,
    file.file_size || null,
    file.file_modified_at || null,
    file.suggested_jd_folder || null,
    file.suggested_rule_id || null,
    confidence,
  ]);

  stmt.free();

  // Don't save after each file - caller should batch save
  return getLastInsertId();
}

/**
 * Batch add multiple scanned files (more efficient).
 *
 * @param {Array} files - Array of file objects
 * @returns {number} Number of files added
 */
export function addScannedFilesBatch(files) {
  if (!Array.isArray(files) || files.length === 0) return 0;

  let count = 0;

  for (const file of files) {
    try {
      addScannedFile(file);
      count++;
    } catch (e) {
      console.warn(`[JDex DB] Skipped invalid file: ${e.message}`);
    }
  }

  saveDatabase();
  return count;
}

/**
 * Update a scanned file's user decision.
 *
 * @param {number} fileId - The scanned file ID
 * @param {string} decision - accepted, changed, skipped
 * @param {string} [targetFolder] - Target folder if changed
 */
export function updateScannedFileDecision(fileId, decision, targetFolder = null) {
  const db = getDB();
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
 *
 * @param {number} fileId - The scanned file ID
 */
export function acceptScannedFileSuggestion(fileId) {
  updateScannedFileDecision(fileId, 'accepted');
}

/**
 * Skip a scanned file (don't organize it).
 *
 * @param {number} fileId - The scanned file ID
 */
export function skipScannedFile(fileId) {
  updateScannedFileDecision(fileId, 'skipped');
}

/**
 * Change a scanned file's target folder.
 *
 * @param {number} fileId - The scanned file ID
 * @param {string} targetFolder - The new target folder
 */
export function changeScannedFileTarget(fileId, targetFolder) {
  updateScannedFileDecision(fileId, 'changed', targetFolder);
}

/**
 * Update suggestion for a scanned file.
 *
 * @param {number} fileId - The scanned file ID
 * @param {string} suggestedFolder - The suggested JD folder
 * @param {number} [ruleId] - The rule that made the suggestion
 * @param {string} [confidence='medium'] - Confidence level
 */
export function updateScannedFileSuggestion(
  fileId,
  suggestedFolder,
  ruleId = null,
  confidence = 'medium'
) {
  const db = getDB();
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
 *
 * @param {number} fileId - The scanned file ID
 */
export function deleteScannedFile(fileId) {
  const db = getDB();
  const id = validatePositiveInteger(fileId, 'File ID');

  db.run('DELETE FROM scanned_files WHERE id = ?', [id]);
  saveDatabase();
}
