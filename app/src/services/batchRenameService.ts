/**
 * Batch Rename Service
 * =====================
 * Handles batch file renaming operations with pattern support,
 * preview generation, and undo tracking.
 */

import { validateFilePath, sanitizeText } from '../utils/validation.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Node.js fs module interface for Electron.
 */
interface FsModule {
  existsSync(path: string): boolean;
  renameSync(oldPath: string, newPath: string): void;
  readdirSync(
    path: string,
    options: { withFileTypes: true }
  ): Array<{ name: string; isFile(): boolean }>;
  statSync(path: string): { size: number };
}

/**
 * Node.js path module interface for Electron.
 */
interface PathModule {
  join(...paths: string[]): string;
  dirname(path: string): string;
}

/**
 * Case transformation types.
 */
export type CaseType = 'lowercase' | 'uppercase' | 'titlecase' | 'sentencecase';

/**
 * Number position in filename.
 */
export type NumberPosition = 'prefix' | 'suffix';

/**
 * Rename operation options.
 */
export interface RenameOptions {
  // Find & Replace
  findReplace?: boolean;
  find?: string;
  replace?: string;
  replaceAll?: boolean;

  // Case change
  changeCase?: boolean;
  caseType?: CaseType;

  // Prefix/Suffix
  addPrefix?: boolean;
  prefix?: string;
  addSuffix?: boolean;
  suffix?: string;

  // Sequential numbering
  addNumber?: boolean;
  startNumber?: number | string;
  digits?: number | string;
  numberPosition?: NumberPosition;
}

/**
 * File info for batch operations.
 */
export interface FileInfo {
  name: string;
  path: string;
}

/**
 * Directory file entry.
 */
export interface DirectoryFileEntry {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
}

/**
 * Conflict type.
 */
export type ConflictType = 'duplicate' | 'exists' | null;

/**
 * Preview item for rename operation.
 */
export interface PreviewItem {
  original: string;
  originalPath: string;
  newName: string;
  newPath: string;
  conflict: ConflictType;
  willChange: boolean;
}

/**
 * Undo log entry.
 */
export interface UndoLogEntry {
  original: string;
  renamed: string;
  originalName: string;
  newName: string;
}

/**
 * Error entry from batch operation.
 */
export interface BatchError {
  file: string;
  error: string;
}

/**
 * Result of batch rename execution.
 */
export interface BatchRenameResult {
  success: boolean;
  count?: number;
  total?: number;
  errors?: BatchError[];
  undoId?: string | null;
  error?: string;
}

/**
 * Result of undo operation.
 */
export interface UndoResult {
  success: boolean;
  count?: number;
  total?: number;
  errors?: BatchError[];
  error?: string;
}

/**
 * Stored undo log with metadata.
 */
interface StoredUndoLog {
  timestamp: number;
  log: UndoLogEntry[];
}

/**
 * Undo logs storage structure.
 */
interface UndoLogsStorage {
  [undoId: string]: StoredUndoLog;
}

/**
 * Recent undo log info.
 */
export interface RecentUndoLog {
  id: string;
  timestamp: number;
  log: UndoLogEntry[];
}

/**
 * Batch limit check result.
 */
export interface BatchLimitResult {
  allowed: boolean;
  limit: number;
}

/**
 * Progress callback function.
 */
export type ProgressCallback = (current: number, total: number) => void;

// ============================================
// CONSTANTS
// ============================================

/**
 * Characters not allowed in filenames.
 */
// eslint-disable-next-line no-control-regex
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

/**
 * Windows reserved names.
 */
const RESERVED_NAMES: readonly string[] = [
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
];

/**
 * Undo log key in localStorage.
 */
const UNDO_LOG_KEY = 'jdex_batch_rename_undo';

/**
 * Free tier batch file limit.
 */
const FREE_TIER_BATCH_LIMIT = 5;

/**
 * Maximum undo logs to keep.
 */
const MAX_UNDO_LOGS = 10;

/**
 * Maximum filename length.
 */
const MAX_FILENAME_LENGTH = 250;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the fs module from Electron's window.require.
 */
function getFs(): FsModule | null {
  const windowWithRequire = window as Window & { require?: NodeRequire };
  return windowWithRequire.require ? (windowWithRequire.require('fs') as FsModule) : null;
}

/**
 * Get the path module from Electron's window.require.
 */
function getPath(): PathModule | null {
  const windowWithRequire = window as Window & { require?: NodeRequire };
  return windowWithRequire.require ? (windowWithRequire.require('path') as PathModule) : null;
}

// ============================================
// FILENAME UTILITIES
// ============================================

/**
 * Get base name without extension.
 */
export function getBaseName(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) return filename;
  return filename.substring(0, lastDot);
}

/**
 * Get file extension (without dot).
 */
export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) return '';
  return filename.substring(lastDot + 1);
}

/**
 * Sanitize a filename to remove invalid characters.
 */
export function sanitizeFilename(filename: string | null | undefined): string {
  if (!filename) return 'unnamed';

  // Remove invalid characters
  let sanitized = filename.replace(INVALID_FILENAME_CHARS, '_');

  // Trim spaces and dots from ends
  sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');

  // Check for reserved names (Windows)
  const baseName = getBaseName(sanitized).toUpperCase();
  if (RESERVED_NAMES.includes(baseName)) {
    sanitized = '_' + sanitized;
  }

  // Ensure not empty
  if (!sanitized || sanitized === '.') {
    sanitized = 'unnamed';
  }

  // Limit length (most filesystems have 255 char limit)
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = getExtension(sanitized);
    const base = getBaseName(sanitized);
    sanitized = base.substring(0, 245 - ext.length) + '.' + ext;
  }

  return sanitized;
}

/**
 * Transform case of a string.
 */
export function transformCase(str: string, caseType: CaseType): string {
  switch (caseType) {
    case 'lowercase':
      return str.toLowerCase();
    case 'uppercase':
      return str.toUpperCase();
    case 'titlecase':
      return str.replace(/\b\w/g, (c) => c.toUpperCase());
    case 'sentencecase':
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    default:
      return str;
  }
}

// ============================================
// NAME GENERATION
// ============================================

/**
 * Generate new filename based on rename options.
 */
export function generateNewName(
  originalName: string,
  options: RenameOptions,
  index: number = 0
): string {
  let name = getBaseName(originalName);
  const ext = getExtension(originalName);

  // Apply transformations in order

  // 1. Find & Replace (do this first)
  if (options.findReplace && options.find) {
    const findStr = options.find;
    const replaceStr = options.replace || '';

    if (options.replaceAll) {
      name = name.split(findStr).join(replaceStr);
    } else {
      name = name.replace(findStr, replaceStr);
    }
  }

  // 2. Change case
  if (options.changeCase && options.caseType) {
    name = transformCase(name, options.caseType);
  }

  // 3. Add prefix
  if (options.addPrefix && options.prefix) {
    name = sanitizeText(options.prefix) + name;
  }

  // 4. Add suffix
  if (options.addSuffix && options.suffix) {
    name = name + sanitizeText(options.suffix);
  }

  // 5. Add sequential number
  if (options.addNumber) {
    const startNum = parseInt(String(options.startNumber)) || 1;
    const digits = parseInt(String(options.digits)) || 3;
    const num = (startNum + index).toString().padStart(digits, '0');

    if (options.numberPosition === 'prefix') {
      name = num + '_' + name;
    } else {
      name = name + '_' + num;
    }
  }

  // Reconstruct filename with extension
  let newFilename = name;
  if (ext) {
    // Also apply case change to extension if requested
    const finalExt =
      options.changeCase && options.caseType === 'lowercase'
        ? ext.toLowerCase()
        : options.changeCase && options.caseType === 'uppercase'
          ? ext.toUpperCase()
          : ext;
    newFilename = name + '.' + finalExt;
  }

  return sanitizeFilename(newFilename);
}

/**
 * Generate preview of all renames.
 */
export function generatePreview(files: FileInfo[], options: RenameOptions): PreviewItem[] {
  const fs = getFs();
  const pathModule = getPath();

  const newNames = new Set<string>();
  const preview: PreviewItem[] = [];

  files.forEach((file, index) => {
    const newName = generateNewName(file.name, options, index);
    const newPath = pathModule ? pathModule.join(pathModule.dirname(file.path), newName) : '';

    // Check for conflicts
    let conflict: ConflictType = null;

    // Conflict with another file in this batch
    if (newNames.has(newName.toLowerCase())) {
      conflict = 'duplicate';
    }
    newNames.add(newName.toLowerCase());

    // Conflict with existing file (if not renaming to same name)
    if (!conflict && fs && newName !== file.name && fs.existsSync(newPath)) {
      conflict = 'exists';
    }

    preview.push({
      original: file.name,
      originalPath: file.path,
      newName,
      newPath,
      conflict,
      willChange: newName !== file.name,
    });
  });

  return preview;
}

// ============================================
// RENAME EXECUTION
// ============================================

/**
 * Execute batch rename operation.
 */
export async function executeBatchRename(
  preview: PreviewItem[],
  _options: Record<string, unknown> = {},
  onProgress: ProgressCallback = () => {}
): Promise<BatchRenameResult> {
  const fs = getFs();

  if (!fs) {
    return { success: false, error: 'File system not available' };
  }

  const undoLog: UndoLogEntry[] = [];
  const errors: BatchError[] = [];
  let successCount = 0;

  // Filter to only files that will change
  const toRename = preview.filter((p) => p.willChange && !p.conflict);

  for (let i = 0; i < toRename.length; i++) {
    const item = toRename[i];

    onProgress(i + 1, toRename.length);

    try {
      // Validate paths
      validateFilePath(item.originalPath);

      // Check source exists
      if (!fs.existsSync(item.originalPath)) {
        errors.push({ file: item.original, error: 'File not found' });
        continue;
      }

      // Perform rename
      fs.renameSync(item.originalPath, item.newPath);

      undoLog.push({
        original: item.originalPath,
        renamed: item.newPath,
        originalName: item.original,
        newName: item.newName,
      });

      successCount++;
    } catch (error) {
      errors.push({
        file: item.original,
        error: (error as Error).message || 'Failed to rename',
      });
    }

    // Small delay to prevent UI blocking
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  // Save undo log
  const undoId = Date.now().toString();
  if (undoLog.length > 0) {
    saveUndoLog(undoId, undoLog);
  }

  return {
    success: errors.length === 0,
    count: successCount,
    total: toRename.length,
    errors,
    undoId: undoLog.length > 0 ? undoId : null,
  };
}

// ============================================
// UNDO SUPPORT
// ============================================

/**
 * Save undo log to localStorage.
 */
function saveUndoLog(undoId: string, log: UndoLogEntry[]): void {
  try {
    const existing = JSON.parse(localStorage.getItem(UNDO_LOG_KEY) || '{}') as UndoLogsStorage;
    existing[undoId] = {
      timestamp: Date.now(),
      log,
    };

    // Keep only last N undo logs
    const keys = Object.keys(existing).sort().reverse();
    if (keys.length > MAX_UNDO_LOGS) {
      keys.slice(MAX_UNDO_LOGS).forEach((k) => delete existing[k]);
    }

    localStorage.setItem(UNDO_LOG_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('[BatchRename] Failed to save undo log:', error);
  }
}

/**
 * Get undo log by ID.
 */
export function getUndoLog(undoId: string): UndoLogEntry[] | null {
  try {
    const existing = JSON.parse(localStorage.getItem(UNDO_LOG_KEY) || '{}') as UndoLogsStorage;
    return existing[undoId]?.log || null;
  } catch {
    return null;
  }
}

/**
 * Get most recent undo log.
 */
export function getMostRecentUndoLog(): RecentUndoLog | null {
  try {
    const existing = JSON.parse(localStorage.getItem(UNDO_LOG_KEY) || '{}') as UndoLogsStorage;
    const keys = Object.keys(existing).sort().reverse();
    if (keys.length === 0) return null;

    return {
      id: keys[0],
      ...existing[keys[0]],
    };
  } catch {
    return null;
  }
}

/**
 * Execute undo operation.
 */
export async function undoBatchRename(
  undoId: string,
  onProgress: ProgressCallback = () => {}
): Promise<UndoResult> {
  const fs = getFs();

  if (!fs) {
    return { success: false, error: 'File system not available' };
  }

  const log = getUndoLog(undoId);
  if (!log) {
    return { success: false, error: 'Undo log not found' };
  }

  const errors: BatchError[] = [];
  let successCount = 0;

  // Reverse the renames
  for (let i = 0; i < log.length; i++) {
    const item = log[i];

    onProgress(i + 1, log.length);

    try {
      // Check renamed file exists
      if (!fs.existsSync(item.renamed)) {
        errors.push({ file: item.newName, error: 'File not found (may have been moved)' });
        continue;
      }

      // Check original path is available
      if (fs.existsSync(item.original)) {
        errors.push({ file: item.originalName, error: 'Original location occupied' });
        continue;
      }

      // Reverse the rename
      fs.renameSync(item.renamed, item.original);
      successCount++;
    } catch (error) {
      errors.push({
        file: item.newName,
        error: (error as Error).message || 'Failed to undo',
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  // Remove the undo log on success
  if (errors.length === 0) {
    removeUndoLog(undoId);
  }

  return {
    success: errors.length === 0,
    count: successCount,
    total: log.length,
    errors,
  };
}

/**
 * Remove an undo log.
 */
function removeUndoLog(undoId: string): void {
  try {
    const existing = JSON.parse(localStorage.getItem(UNDO_LOG_KEY) || '{}') as UndoLogsStorage;
    delete existing[undoId];
    localStorage.setItem(UNDO_LOG_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('[BatchRename] Failed to remove undo log:', error);
  }
}

// ============================================
// FILE SELECTION HELPERS
// ============================================

/**
 * Read files from a directory.
 */
export function readDirectoryFiles(dirPath: string): DirectoryFileEntry[] {
  const fs = getFs();
  const pathModule = getPath();

  if (!fs || !pathModule) {
    return [];
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const fullPath = pathModule.join(dirPath, entry.name);
        let size = 0;
        try {
          size = fs.statSync(fullPath).size;
        } catch {
          // Ignore errors reading file size
        }

        return {
          name: entry.name,
          path: fullPath,
          size,
          isDirectory: false,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('[BatchRename] Failed to read directory:', error);
    return [];
  }
}

// ============================================
// PREMIUM LIMITS
// ============================================

/**
 * Check if batch size is within limits.
 */
export function checkBatchLimit(fileCount: number, isPremium: boolean): BatchLimitResult {
  if (isPremium) {
    return { allowed: true, limit: Infinity };
  }

  return {
    allowed: fileCount <= FREE_TIER_BATCH_LIMIT,
    limit: FREE_TIER_BATCH_LIMIT,
  };
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  generateNewName,
  generatePreview,
  executeBatchRename,
  undoBatchRename,
  getUndoLog,
  getMostRecentUndoLog,
  readDirectoryFiles,
  checkBatchLimit,
  sanitizeFilename,
  getBaseName,
  getExtension,
  transformCase,
};
