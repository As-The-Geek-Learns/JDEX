/**
 * File Scanner Service
 * ====================
 * Recursively scans directories and catalogs files for organization.
 *
 * Features:
 * - Recursive directory scanning with progress callbacks
 * - File type detection based on extension
 * - File metadata extraction (size, extension)
 * - Scan session management
 * - Integration with scanned_files database table
 *
 * Security:
 * - Uses validated paths from validation.js
 * - Respects system path restrictions
 * - Handles permission errors gracefully
 */

import { validateFilePath } from '../utils/validation.js';
import { FileSystemError, Result } from '../utils/errors.js';
import { addScannedFile, clearScannedFiles } from '../db.js';

// =============================================================================
// Types
// =============================================================================

/**
 * File type category.
 */
export type FileType =
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'code'
  | 'data'
  | 'font'
  | 'ebook'
  | 'design'
  | 'other';

/**
 * Scanned file information.
 */
export interface ScannedFileInfo {
  filename: string;
  path: string;
  file_extension: string;
  file_type: FileType;
  file_size: number;
  scan_session_id: string;
}

/**
 * Scan progress error entry.
 */
export interface ScanError {
  path: string;
  error: string;
}

/**
 * Scan progress information.
 */
export interface ScanProgress {
  scannedFiles: number;
  scannedDirs: number;
  totalSize: number;
  currentPath: string;
  errors: ScanError[];
}

/**
 * Scan options.
 */
export interface ScanOptions {
  onProgress?: (progress: ScanProgress) => void;
  onFile?: (fileInfo: ScannedFileInfo) => void;
  maxDepth?: number;
  saveToDb?: boolean;
}

/**
 * Scan result statistics.
 */
export interface ScanStats {
  totalFiles: number;
  totalDirs: number;
  totalSize: number;
  errors: number;
}

/**
 * Successful scan result.
 */
export interface ScanResult {
  sessionId: string;
  files: ScannedFileInfo[];
  stats: ScanStats;
}

/**
 * Quick count result.
 */
export interface QuickCountResult {
  total: number;
  byType: Record<string, number>;
}

/**
 * Subdirectory info.
 */
export interface SubdirectoryInfo {
  name: string;
  path: string;
}

/**
 * Node.js fs module type (simplified).
 */
interface NodeFs {
  existsSync(path: string): boolean;
  statSync(path: string): { isDirectory(): boolean; isFile(): boolean; size: number };
  readdirSync(
    path: string,
    options: { withFileTypes: true }
  ): Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
}

/**
 * Node.js path module type (simplified).
 */
interface NodePath {
  join(...paths: string[]): string;
}

/**
 * Node.js modules container.
 */
interface NodeModules {
  fs: NodeFs;
  path: NodePath;
}

/**
 * Node.js error with code.
 */
interface NodeError extends Error {
  code?: string;
}

// Extend Window for Electron's require
declare global {
  interface Window {
    require?: (module: string) => unknown;
  }
}

// =============================================================================
// File Type Mappings
// =============================================================================

/**
 * Maps file extensions to file types for categorization.
 */
const EXTENSION_TO_TYPE: Record<string, FileType> = {
  // Documents
  pdf: 'document',
  doc: 'document',
  docx: 'document',
  txt: 'document',
  rtf: 'document',
  odt: 'document',
  pages: 'document',
  md: 'document',
  markdown: 'document',

  // Spreadsheets
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  csv: 'spreadsheet',
  numbers: 'spreadsheet',
  ods: 'spreadsheet',

  // Presentations
  ppt: 'presentation',
  pptx: 'presentation',
  key: 'presentation',
  odp: 'presentation',

  // Images
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  bmp: 'image',
  svg: 'image',
  webp: 'image',
  ico: 'image',
  tiff: 'image',
  tif: 'image',
  heic: 'image',
  heif: 'image',
  raw: 'image',
  cr2: 'image',
  nef: 'image',

  // Videos
  mp4: 'video',
  mov: 'video',
  avi: 'video',
  mkv: 'video',
  wmv: 'video',
  flv: 'video',
  webm: 'video',
  m4v: 'video',

  // Audio
  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
  aac: 'audio',
  ogg: 'audio',
  wma: 'audio',
  m4a: 'audio',
  aiff: 'audio',

  // Archives
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',
  bz2: 'archive',
  dmg: 'archive',
  iso: 'archive',

  // Code
  js: 'code',
  jsx: 'code',
  ts: 'code',
  tsx: 'code',
  py: 'code',
  rb: 'code',
  java: 'code',
  c: 'code',
  cpp: 'code',
  h: 'code',
  cs: 'code',
  go: 'code',
  rs: 'code',
  swift: 'code',
  kt: 'code',
  php: 'code',
  html: 'code',
  css: 'code',
  scss: 'code',
  less: 'code',
  sql: 'code',
  sh: 'code',
  bash: 'code',
  zsh: 'code',
  ps1: 'code',
  json: 'code',
  xml: 'code',
  yaml: 'code',
  yml: 'code',
  toml: 'code',

  // Data
  db: 'data',
  sqlite: 'data',
  sqlite3: 'data',
  mdb: 'data',
  accdb: 'data',

  // Fonts
  ttf: 'font',
  otf: 'font',
  woff: 'font',
  woff2: 'font',
  eot: 'font',

  // Ebooks
  epub: 'ebook',
  mobi: 'ebook',
  azw: 'ebook',
  azw3: 'ebook',

  // Design
  psd: 'design',
  ai: 'design',
  sketch: 'design',
  fig: 'design',
  xd: 'design',
  indd: 'design',
};

/**
 * Directories to skip during scanning (performance & relevance).
 */
const SKIP_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '__pycache__',
  '.cache',
  '.npm',
  '.yarn',
  'vendor',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '.pytest_cache',
  '.mypy_cache',
  'venv',
  '.venv',
  'env',
  '.env',
  '.idea',
  '.vscode',
  '.DS_Store',
  'Thumbs.db',
]);

/**
 * Files to skip during scanning.
 */
const SKIP_FILES = new Set([
  '.DS_Store',
  'Thumbs.db',
  '.gitignore',
  '.gitattributes',
  '.npmrc',
  '.yarnrc',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
]);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the file type based on extension.
 */
export function getFileType(filename: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_TO_TYPE[ext] || 'other';
}

/**
 * Gets the file extension from a filename.
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts.pop()?.toLowerCase() || '';
}

/**
 * Checks if a directory should be skipped.
 */
function shouldSkipDirectory(dirname: string): boolean {
  return SKIP_DIRECTORIES.has(dirname) || dirname.startsWith('.');
}

/**
 * Checks if a file should be skipped.
 */
function shouldSkipFile(filename: string): boolean {
  return SKIP_FILES.has(filename) || filename.startsWith('.');
}

/**
 * Formats bytes to human-readable size.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// =============================================================================
// File System Access (Electron)
// =============================================================================

/**
 * Gets Node.js fs and path modules in Electron environment.
 * Returns null if not in Electron.
 */
function getNodeModules(): NodeModules | null {
  if (typeof window !== 'undefined' && window.require) {
    try {
      const fs = window.require('fs') as NodeFs;
      const path = window.require('path') as NodePath;
      return { fs, path };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Checks if we're running in Electron with file system access.
 */
export function hasFileSystemAccess(): boolean {
  return getNodeModules() !== null;
}

// =============================================================================
// Scanner Class
// =============================================================================

/**
 * File scanner with progress tracking and cancellation support.
 */
export class FileScanner {
  sessionId: string | null = null;
  isScanning: boolean = false;
  isCancelled: boolean = false;
  progress: ScanProgress = {
    scannedFiles: 0,
    scannedDirs: 0,
    totalSize: 0,
    currentPath: '',
    errors: [],
  };

  /**
   * Generates a new scan session ID.
   * Uses crypto.randomUUID if available, otherwise timestamp-based.
   */
  generateSessionId(): string {
    // Try native crypto.randomUUID (available in modern browsers and Node 19+)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback using crypto.getRandomValues (available in all modern environments)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `scan-${hex}`;
    }
    // Last resort: timestamp only (no entropy, but avoids insecure Math.random)
    return `scan-${Date.now()}-${performance.now().toString(36).replace('.', '')}`;
  }

  /**
   * Resets the scanner state for a new scan.
   */
  reset(): void {
    this.sessionId = this.generateSessionId();
    this.isScanning = false;
    this.isCancelled = false;
    this.progress = {
      scannedFiles: 0,
      scannedDirs: 0,
      totalSize: 0,
      currentPath: '',
      errors: [],
    };
  }

  /**
   * Cancels the current scan.
   */
  cancel(): void {
    this.isCancelled = true;
  }

  /**
   * Scans a directory recursively.
   *
   * @param rootPath - The directory to scan
   * @param options - Scan options
   * @returns Scan result
   */
  async scan(
    rootPath: string,
    options: ScanOptions = {}
  ): Promise<ReturnType<typeof Result.ok<ScanResult>> | ReturnType<typeof Result.error>> {
    const { onProgress = () => {}, onFile = () => {}, maxDepth = 10, saveToDb = true } = options;

    // Validate path
    let validatedPath: string;
    try {
      validatedPath = validateFilePath(rootPath, {
        allowHome: true,
      });
    } catch (error) {
      return Result.error(error as Error);
    }

    // Check file system access
    const modules = getNodeModules();
    if (!modules) {
      return Result.error(
        new FileSystemError(
          'File system access not available. Are you running in Electron?',
          'scan',
          rootPath
        )
      );
    }

    const { fs, path } = modules;

    // Verify directory exists
    try {
      const stats = fs.statSync(validatedPath);
      if (!stats.isDirectory()) {
        return Result.error(new FileSystemError('Path is not a directory', 'scan', rootPath));
      }
    } catch (error) {
      const nodeError = error as NodeError;
      return Result.error(
        new FileSystemError(
          `Cannot access directory: ${nodeError.message}`,
          'scan',
          rootPath,
          nodeError
        )
      );
    }

    // Initialize scan
    this.reset();
    this.isScanning = true;

    // Clear previous scan session from DB if saving
    if (saveToDb) {
      try {
        clearScannedFiles(this.sessionId!);
      } catch {
        // Ignore - session might not exist
      }
    }

    const scannedFiles: ScannedFileInfo[] = [];

    /**
     * Recursive scan function.
     */
    const scanDirectory = async (dirPath: string, depth: number = 0): Promise<void> => {
      if (this.isCancelled || depth > maxDepth) {
        return;
      }

      this.progress.currentPath = dirPath;
      this.progress.scannedDirs++;
      onProgress({ ...this.progress });

      let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
      try {
        entries = fs.readdirSync(dirPath, { withFileTypes: true });
      } catch (error) {
        const nodeError = error as NodeError;
        this.progress.errors.push({
          path: dirPath,
          error: nodeError.message,
        });
        return;
      }

      for (const entry of entries) {
        if (this.isCancelled) break;

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip certain directories
          if (!shouldSkipDirectory(entry.name)) {
            await scanDirectory(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          // Skip certain files
          if (shouldSkipFile(entry.name)) continue;

          try {
            const stats = fs.statSync(fullPath);
            const fileInfo: ScannedFileInfo = {
              filename: entry.name,
              path: fullPath,
              file_extension: getFileExtension(entry.name),
              file_type: getFileType(entry.name),
              file_size: stats.size,
              scan_session_id: this.sessionId!,
            };

            scannedFiles.push(fileInfo);
            this.progress.scannedFiles++;
            this.progress.totalSize += stats.size;

            // Callback for each file
            onFile(fileInfo);

            // Save to database if enabled
            if (saveToDb) {
              try {
                addScannedFile(fileInfo);
              } catch (dbError) {
                const dbNodeError = dbError as NodeError;
                this.progress.errors.push({
                  path: fullPath,
                  error: `DB save failed: ${dbNodeError.message}`,
                });
              }
            }

            // Update progress periodically
            if (this.progress.scannedFiles % 50 === 0) {
              onProgress({ ...this.progress });
            }
          } catch (error) {
            const nodeError = error as NodeError;
            this.progress.errors.push({
              path: fullPath,
              error: nodeError.message,
            });
          }
        }
      }
    };

    // Run the scan
    try {
      await scanDirectory(validatedPath);
    } catch (error) {
      this.isScanning = false;
      return Result.error(new FileSystemError('Scan failed', 'scan', rootPath, error as Error));
    }

    this.isScanning = false;
    this.progress.currentPath = '';
    onProgress({ ...this.progress });

    return Result.ok<ScanResult>({
      sessionId: this.sessionId!,
      files: scannedFiles,
      stats: {
        totalFiles: this.progress.scannedFiles,
        totalDirs: this.progress.scannedDirs,
        totalSize: this.progress.totalSize,
        errors: this.progress.errors.length,
      },
    });
  }

  /**
   * Gets the current progress.
   */
  getProgress(): ScanProgress {
    return { ...this.progress };
  }

  /**
   * Checks if a scan is currently running.
   */
  isRunning(): boolean {
    return this.isScanning;
  }
}

// =============================================================================
// Singleton Scanner Instance
// =============================================================================

let scannerInstance: FileScanner | null = null;

/**
 * Gets the singleton scanner instance.
 */
export function getScanner(): FileScanner {
  if (!scannerInstance) {
    scannerInstance = new FileScanner();
  }
  return scannerInstance;
}

// =============================================================================
// Quick Scan Functions
// =============================================================================

/**
 * Performs a quick count of files in a directory (non-recursive, fast).
 *
 * @param dirPath - Directory to count
 * @returns Count of files by type
 */
export function quickCount(dirPath: string): QuickCountResult {
  const modules = getNodeModules();
  if (!modules) {
    return { total: 0, byType: {} };
  }

  const { fs } = modules;
  const counts: QuickCountResult = { total: 0, byType: {} };

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && !shouldSkipFile(entry.name)) {
        counts.total++;
        const type = getFileType(entry.name);
        counts.byType[type] = (counts.byType[type] || 0) + 1;
      }
    }
  } catch {
    // Ignore errors for quick count
  }

  return counts;
}

/**
 * Lists immediate subdirectories of a path.
 *
 * @param dirPath - Directory to list
 * @returns Array of subdirectory info objects
 */
export function listSubdirectories(dirPath: string): SubdirectoryInfo[] {
  const modules = getNodeModules();
  if (!modules) {
    return [];
  }

  const { fs, path } = modules;
  const dirs: SubdirectoryInfo[] = [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !shouldSkipDirectory(entry.name)) {
        dirs.push({
          name: entry.name,
          path: path.join(dirPath, entry.name),
        });
      }
    }
  } catch {
    // Ignore errors
  }

  return dirs.sort((a, b) => a.name.localeCompare(b.name));
}

// =============================================================================
// Exports
// =============================================================================

export default {
  FileScanner,
  getScanner,
  getFileType,
  getFileExtension,
  formatFileSize,
  hasFileSystemAccess,
  quickCount,
  listSubdirectories,
};
