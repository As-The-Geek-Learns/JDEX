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
import { addScannedFile, clearScannedFiles, getScannedFiles } from '../db.js';

// =============================================================================
// File Type Mappings
// =============================================================================

/**
 * Maps file extensions to file types for categorization.
 */
const EXTENSION_TO_TYPE = {
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
export function getFileType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_TO_TYPE[ext] || 'other';
}

/**
 * Gets the file extension from a filename.
 */
export function getFileExtension(filename) {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts.pop()?.toLowerCase() || '';
}

/**
 * Checks if a directory should be skipped.
 */
function shouldSkipDirectory(dirname) {
  return SKIP_DIRECTORIES.has(dirname) || dirname.startsWith('.');
}

/**
 * Checks if a file should be skipped.
 */
function shouldSkipFile(filename) {
  return SKIP_FILES.has(filename) || filename.startsWith('.');
}

/**
 * Formats bytes to human-readable size.
 */
export function formatFileSize(bytes) {
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
function getNodeModules() {
  if (typeof window !== 'undefined' && window.require) {
    try {
      const fs = window.require('fs');
      const path = window.require('path');
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
export function hasFileSystemAccess() {
  return getNodeModules() !== null;
}

// =============================================================================
// Scanner Class
// =============================================================================

/**
 * File scanner with progress tracking and cancellation support.
 */
export class FileScanner {
  constructor() {
    this.sessionId = null;
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
   * Generates a new scan session ID.
   * Uses crypto.randomUUID if available, otherwise timestamp-based.
   */
  generateSessionId() {
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
  reset() {
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
  cancel() {
    this.isCancelled = true;
  }

  /**
   * Scans a directory recursively.
   *
   * @param {string} rootPath - The directory to scan
   * @param {Object} options - Scan options
   * @param {Function} options.onProgress - Progress callback (progress) => void
   * @param {Function} options.onFile - File found callback (fileInfo) => void
   * @param {number} options.maxDepth - Maximum recursion depth (default: 10)
   * @param {boolean} options.saveToDb - Whether to save results to database (default: true)
   * @returns {Promise<Result>} Scan result
   */
  async scan(rootPath, options = {}) {
    const { onProgress = () => {}, onFile = () => {}, maxDepth = 10, saveToDb = true } = options;

    // Validate path
    let validatedPath;
    try {
      validatedPath = validateFilePath(rootPath, {
        allowHome: true,
        allowSystemPaths: false,
      });
    } catch (error) {
      return Result.error(error);
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
      return Result.error(
        new FileSystemError(`Cannot access directory: ${error.message}`, 'scan', rootPath, error)
      );
    }

    // Initialize scan
    this.reset();
    this.isScanning = true;

    // Clear previous scan session from DB if saving
    if (saveToDb) {
      try {
        clearScannedFiles(this.sessionId);
      } catch {
        // Ignore - session might not exist
      }
    }

    const scannedFiles = [];

    /**
     * Recursive scan function.
     */
    const scanDirectory = async (dirPath, depth = 0) => {
      if (this.isCancelled || depth > maxDepth) {
        return;
      }

      this.progress.currentPath = dirPath;
      this.progress.scannedDirs++;
      onProgress({ ...this.progress });

      let entries;
      try {
        entries = fs.readdirSync(dirPath, { withFileTypes: true });
      } catch (error) {
        this.progress.errors.push({
          path: dirPath,
          error: error.message,
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
            const fileInfo = {
              filename: entry.name,
              path: fullPath,
              file_extension: getFileExtension(entry.name),
              file_type: getFileType(entry.name),
              file_size: stats.size,
              scan_session_id: this.sessionId,
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
                this.progress.errors.push({
                  path: fullPath,
                  error: `DB save failed: ${dbError.message}`,
                });
              }
            }

            // Update progress periodically
            if (this.progress.scannedFiles % 50 === 0) {
              onProgress({ ...this.progress });
            }
          } catch (error) {
            this.progress.errors.push({
              path: fullPath,
              error: error.message,
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
      return Result.error(new FileSystemError('Scan failed', 'scan', rootPath, error));
    }

    this.isScanning = false;
    this.progress.currentPath = '';
    onProgress({ ...this.progress });

    return Result.ok({
      sessionId: this.sessionId,
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
  getProgress() {
    return { ...this.progress };
  }

  /**
   * Checks if a scan is currently running.
   */
  isRunning() {
    return this.isScanning;
  }
}

// =============================================================================
// Singleton Scanner Instance
// =============================================================================

let scannerInstance = null;

/**
 * Gets the singleton scanner instance.
 */
export function getScanner() {
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
 * @param {string} dirPath - Directory to count
 * @returns {Object} Count of files by type
 */
export function quickCount(dirPath) {
  const modules = getNodeModules();
  if (!modules) {
    return { total: 0, byType: {} };
  }

  const { fs } = modules;
  const counts = { total: 0, byType: {} };

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
 * @param {string} dirPath - Directory to list
 * @returns {Array} Array of { name, path } objects
 */
export function listSubdirectories(dirPath) {
  const modules = getNodeModules();
  if (!modules) {
    return [];
  }

  const { fs, path } = modules;
  const dirs = [];

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
