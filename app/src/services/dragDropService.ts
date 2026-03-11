/**
 * Drag & Drop Service
 * ====================
 * Handles file drop operations for organizing files into JD folders.
 * Includes validation, file operations, and database logging.
 */

import { validateFilePath, sanitizeText } from '../utils/validation.js';
import { getDB, saveDatabase } from '../db.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Node.js fs module interface for Electron.
 */
interface FsModule {
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  renameSync(oldPath: string, newPath: string): void;
  copyFileSync(src: string, dest: string): void;
  unlinkSync(path: string): void;
}

/**
 * Node.js path module interface for Electron.
 */
interface PathModule {
  join(...paths: string[]): string;
  dirname(path: string): string;
  basename(path: string, ext?: string): string;
  extname(path: string): string;
}

/**
 * sql.js Database interface (minimal subset for this service).
 */
interface Database {
  run(sql: string, params?: unknown[]): void;
}

/**
 * File validation result.
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Extracted file information from a dropped file.
 */
export interface DroppedFileInfo {
  path: string;
  name: string;
  size: number;
  mimeType: string;
  extension: string;
  fileType: FileTypeCategory;
}

/**
 * File object from drag event.
 */
export interface DroppedFile {
  path?: string;
  name?: string;
  size?: number;
  type?: string;
}

/**
 * File type categories.
 */
export type FileTypeCategory =
  | 'Documents'
  | 'Spreadsheets'
  | 'Presentations'
  | 'Images'
  | 'Videos'
  | 'Audio'
  | 'Archives'
  | 'Code'
  | 'Data'
  | 'Other';

/**
 * Target folder for file organization.
 */
export interface FolderTarget {
  folder_number: string;
  name: string;
  storage_path?: string;
  area_name?: string;
  category_name?: string;
}

/**
 * Result from moving a file.
 */
export interface MoveResult {
  success: boolean;
  error?: string;
  existingPath?: string;
}

/**
 * Conflict check result.
 */
export interface ConflictCheckResult {
  exists: boolean;
  suggestedName?: string;
  suggestedPath?: string;
}

/**
 * Parameters for logging an organized file.
 */
export interface OrganizedFileParams {
  filename: string;
  originalPath: string;
  currentPath: string;
  jdFolderNumber: string;
  fileType: string;
  fileSize: number;
  ruleId?: number | null;
}

/**
 * Usage data stored in localStorage.
 */
interface UsageData {
  month: string;
  count: number;
}

/**
 * Drag & drop permission result.
 */
export interface DragDropPermissionResult {
  allowed: boolean;
  remaining?: number;
  limit?: number;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * System directories that should never be touched.
 */
const BLOCKED_PATHS: readonly string[] = [
  '/System',
  '/Library',
  '/usr',
  '/bin',
  '/sbin',
  '/etc',
  '/var',
  '/private',
  '/Applications',
  'C:\\Windows',
  'C:\\Program Files',
  'C:\\Program Files (x86)',
];

/**
 * File extensions to warn about.
 */
const SENSITIVE_EXTENSIONS: readonly string[] = [
  '.app',
  '.exe',
  '.dll',
  '.sys',
  '.kext',
  '.plist',
  '.dylib',
  '.framework',
];

/**
 * Free tier monthly limit for drag & drop operations.
 */
const FREE_TIER_LIMIT = 5;

/**
 * LocalStorage key for drag & drop usage tracking.
 */
const USAGE_STORAGE_KEY = 'jdex_dragdrop_usage';

// ============================================
// FILE TYPE CATEGORIES
// ============================================

/**
 * Extension to category mapping.
 */
const FILE_CATEGORIES: Record<FileTypeCategory, readonly string[]> = {
  Documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'pages'],
  Spreadsheets: ['xls', 'xlsx', 'csv', 'numbers', 'ods'],
  Presentations: ['ppt', 'pptx', 'key', 'odp'],
  Images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'heic'],
  Videos: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv'],
  Audio: ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg'],
  Archives: ['zip', 'rar', '7z', 'tar', 'gz', 'dmg'],
  Code: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'swift', 'rs'],
  Data: ['json', 'xml', 'yaml', 'yml', 'sql', 'db'],
  Other: [],
};

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

/**
 * Categorize file type based on extension.
 */
function categorizeFileType(extension: string): FileTypeCategory {
  for (const [category, extensions] of Object.entries(FILE_CATEGORIES) as [
    FileTypeCategory,
    readonly string[],
  ][]) {
    if (extensions.includes(extension)) {
      return category;
    }
  }
  return 'Other';
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate a dropped file path for safety.
 */
export function validateDroppedFile(filePath: string | null | undefined): ValidationResult {
  if (!filePath) {
    return { valid: false, error: 'No file path provided' };
  }

  // Check for blocked system paths
  const normalizedPath = filePath.toLowerCase();
  for (const blocked of BLOCKED_PATHS) {
    if (normalizedPath.startsWith(blocked.toLowerCase())) {
      return {
        valid: false,
        error: 'System files cannot be organized for safety reasons',
      };
    }
  }

  // Use existing path validation
  try {
    validateFilePath(filePath);
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }

  // Check for sensitive extensions (warning, not blocking)
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  if (SENSITIVE_EXTENSIONS.includes(ext)) {
    return {
      valid: true,
      warning: 'This appears to be an application or system file. Are you sure?',
    };
  }

  return { valid: true };
}

// ============================================
// FILE INFO EXTRACTION
// ============================================

/**
 * Extract file info from a dropped file.
 */
export function extractFileInfo(file: DroppedFile): DroppedFileInfo {
  const path = file.path || '';
  const name = file.name || '';
  const size = file.size || 0;
  const type = file.type || '';

  // Extract extension
  const lastDot = name.lastIndexOf('.');
  const extension = lastDot > 0 ? name.substring(lastDot + 1).toLowerCase() : '';

  // Determine file type category
  const fileType = categorizeFileType(extension);

  return {
    path,
    name,
    size,
    mimeType: type,
    extension,
    fileType,
  };
}

// ============================================
// PATH BUILDING
// ============================================

/**
 * Build the destination path for a file in a JD folder.
 */
export function buildDestinationPath(
  folder: FolderTarget,
  fileName: string,
  jdRootPath: string
): string {
  const path = getPath();

  if (!path) {
    throw new Error('Path module not available');
  }

  // If folder has a storage_path, use it
  if (folder.storage_path) {
    return path.join(folder.storage_path, fileName);
  }

  // Otherwise, build from JD structure
  // Format: jdRoot/XX-XX Area/XX Category/XX.XX Folder/
  const folderNumber = folder.folder_number; // e.g., "12.01"
  const [categoryNum] = folderNumber.split('.');

  // Build the path structure
  const areaStart = Math.floor(parseInt(categoryNum) / 10) * 10;
  const areaRange = `${areaStart}-${areaStart + 9}`;
  const areaFolder = `${areaRange} ${folder.area_name || 'Area'}`;
  const categoryFolder = `${categoryNum} ${folder.category_name || 'Category'}`;
  const jdFolder = `${folderNumber} ${folder.name}`;

  return path.join(jdRootPath, areaFolder, categoryFolder, jdFolder, fileName);
}

// ============================================
// FILE OPERATIONS
// ============================================

/**
 * Move a file to a JD folder.
 */
export async function moveFileToFolder(sourcePath: string, destPath: string): Promise<MoveResult> {
  const fs = getFs();
  const path = getPath();

  if (!fs || !path) {
    return { success: false, error: 'File system not available' };
  }

  try {
    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Check if destination file already exists
    if (fs.existsSync(destPath)) {
      return {
        success: false,
        error: 'conflict',
        existingPath: destPath,
      };
    }

    // Move the file (rename for same filesystem, copy+delete for cross-filesystem)
    try {
      fs.renameSync(sourcePath, destPath);
    } catch (renameError) {
      // If rename fails (cross-filesystem), try copy + delete
      if ((renameError as NodeJS.ErrnoException).code === 'EXDEV') {
        fs.copyFileSync(sourcePath, destPath);
        fs.unlinkSync(sourcePath);
      } else {
        throw renameError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[DragDropService] Move failed:', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to move file',
    };
  }
}

// ============================================
// CONFLICT DETECTION
// ============================================

/**
 * Check if a file already exists at destination with conflict resolution options.
 */
export function checkForConflict(destPath: string): ConflictCheckResult {
  const fs = getFs();
  const path = getPath();

  if (!fs || !path) {
    return { exists: false };
  }

  if (!fs.existsSync(destPath)) {
    return { exists: false };
  }

  // Generate a unique filename
  const dir = path.dirname(destPath);
  const ext = path.extname(destPath);
  const base = path.basename(destPath, ext);

  let counter = 1;
  let newName = `${base} (${counter})${ext}`;
  let newPath = path.join(dir, newName);

  while (fs.existsSync(newPath) && counter < 100) {
    counter++;
    newName = `${base} (${counter})${ext}`;
    newPath = path.join(dir, newName);
  }

  return {
    exists: true,
    suggestedName: newName,
    suggestedPath: newPath,
  };
}

// ============================================
// DATABASE LOGGING
// ============================================

/**
 * Log an organized file to the database.
 */
export function logOrganizedFile({
  filename,
  originalPath,
  currentPath,
  jdFolderNumber,
  fileType,
  fileSize,
  ruleId = null,
}: OrganizedFileParams): void {
  const db = getDB() as Database | null;
  if (!db) return;

  try {
    db.run(
      `
      INSERT INTO organized_files (
        filename, original_path, current_path, jd_folder_number,
        file_type, file_size, organized_at, status, rule_id
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 'moved', ?)
    `,
      [
        sanitizeText(filename),
        originalPath,
        currentPath,
        jdFolderNumber,
        fileType,
        fileSize,
        ruleId,
      ]
    );

    saveDatabase();
  } catch (error) {
    console.error('[DragDropService] Failed to log organized file:', error);
  }
}

// ============================================
// USAGE TRACKING
// ============================================

/**
 * Get drag & drop usage count for the current month (for free tier limits).
 */
export function getDragDropUsageThisMonth(): number {
  const usageData = localStorage.getItem(USAGE_STORAGE_KEY);
  if (!usageData) return 0;

  try {
    const { month, count } = JSON.parse(usageData) as UsageData;
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    if (month === currentMonth) {
      return count;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Increment drag & drop usage counter.
 */
export function incrementDragDropUsage(): void {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentCount = getDragDropUsageThisMonth();

  localStorage.setItem(
    USAGE_STORAGE_KEY,
    JSON.stringify({
      month: currentMonth,
      count: currentCount + 1,
    } as UsageData)
  );
}

/**
 * Check if user can perform drag & drop (premium or under limit).
 */
export function canPerformDragDrop(isPremium: boolean): DragDropPermissionResult {
  if (isPremium) {
    return { allowed: true };
  }

  const used = getDragDropUsageThisMonth();
  const remaining = FREE_TIER_LIMIT - used;

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit: FREE_TIER_LIMIT,
  };
}
