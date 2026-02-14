/**
 * File Operations Service
 * =======================
 * Handles actual file system operations for organizing files.
 *
 * Features:
 * - Move files to JD folder destinations
 * - Handle naming conflicts (rename, skip, overwrite)
 * - Rollback support for undoing moves
 * - Batch operations with progress tracking
 * - Safe operations with validation
 *
 * Security:
 * - All paths are validated before operations
 * - Operations are logged for audit trail
 * - Rollback data is preserved
 */

import { validateFilePath, isPathWithinBase } from '../utils/validation.js';
import { FileSystemError, Result } from '../utils/errors.js';
import { sanitizeFilename } from './batchRenameService.js';
import {
  recordOrganizedFile,
  updateOrganizedFile,
  getOrganizedFile,
  getFolderByNumber,
  getDefaultCloudDrive,
  getCloudDrive,
} from '../db.js';
import type { CloudDrive, Folder, OrganizedFile } from '../types/index.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Conflict resolution strategy.
 */
export type ConflictStrategy = 'rename' | 'skip' | 'overwrite';

/**
 * Operation status code.
 */
export type OperationStatus =
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'rolled_back';

/**
 * Node.js fs module type (simplified).
 */
interface NodeFs {
  existsSync(path: string): boolean;
  statSync(path: string): { isDirectory(): boolean; size: number };
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  renameSync(oldPath: string, newPath: string): void;
  copyFileSync(src: string, dest: string): void;
  unlinkSync(path: string): void;
  realpathSync(path: string): string;
}

/**
 * Node.js path module type (simplified).
 */
interface NodePath {
  basename(path: string, ext?: string): string;
  extname(path: string): string;
  dirname(path: string): string;
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
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

/**
 * Extended folder info from database.
 */
interface FolderWithInfo extends Folder {
  area_name?: string;
  category_name?: string;
}

/**
 * Destination path info.
 */
export interface DestinationPath {
  basePath: string;
  folderPath: string;
  fullPath: string;
  folder: FolderWithInfo;
}

/**
 * Build destination options.
 */
export interface BuildDestinationOptions {
  cloudDriveId?: string | null;
}

/**
 * Move file parameters.
 */
export interface MoveFileParams {
  sourcePath: string;
  folderNumber: string;
  conflictStrategy?: ConflictStrategy;
  cloudDriveId?: string | null;
}

/**
 * Successful move result.
 */
export interface MoveSuccessResult {
  status: OperationStatus;
  sourcePath: string;
  destinationPath: string;
  filename?: string;
  folderNumber?: string;
  recordId?: number;
  reason?: string;
}

/**
 * Rollback success result.
 */
export interface RollbackSuccessResult {
  status: OperationStatus;
  originalPath: string;
  fromPath: string;
}

/**
 * Batch operation input.
 */
export interface BatchOperation {
  sourcePath: string;
  folderNumber: string;
  conflictStrategy?: ConflictStrategy;
  cloudDriveId?: string | null;
}

/**
 * Progress callback info.
 */
export interface ProgressInfo {
  current: number;
  total: number;
  percent: number;
  currentFile?: string;
}

/**
 * Batch operation options.
 */
export interface BatchMoveOptions {
  onProgress?: (info: ProgressInfo) => void;
  onFileComplete?: (result: BatchOperationResult) => void;
  conflictStrategy?: ConflictStrategy;
  stopOnError?: boolean;
}

/**
 * Single batch operation result.
 */
export interface BatchOperationResult extends BatchOperation {
  success: boolean;
  result: MoveSuccessResult | null;
  error: Error | null;
}

/**
 * Batch move results summary.
 */
export interface BatchMoveResults {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  operations: BatchOperationResult[];
}

/**
 * Batch rollback result item.
 */
export interface BatchRollbackItem {
  recordId: number;
  success: boolean;
  result: RollbackSuccessResult | null;
  error: Error | null;
}

/**
 * Batch rollback results summary.
 */
export interface BatchRollbackResults {
  total: number;
  success: number;
  failed: number;
  operations: BatchRollbackItem[];
}

/**
 * Preview operation result.
 */
export interface PreviewResult extends BatchOperation {
  sourceExists: boolean;
  destinationPath: string | null;
  wouldConflict: boolean;
  folder: FolderWithInfo | null;
  error: string | null;
}

// Extend Window for Electron's require
declare global {
  interface Window {
    require?: (module: string) => unknown;
  }
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Conflict resolution strategies.
 */
export const CONFLICT_STRATEGY = {
  RENAME: 'rename' as ConflictStrategy,
  SKIP: 'skip' as ConflictStrategy,
  OVERWRITE: 'overwrite' as ConflictStrategy,
} as const;

/**
 * Operation status codes.
 */
export const OP_STATUS = {
  PENDING: 'pending' as OperationStatus,
  IN_PROGRESS: 'in_progress' as OperationStatus,
  SUCCESS: 'success' as OperationStatus,
  FAILED: 'failed' as OperationStatus,
  SKIPPED: 'skipped' as OperationStatus,
  ROLLED_BACK: 'rolled_back' as OperationStatus,
} as const;

// =============================================================================
// File System Helpers
// =============================================================================

/**
 * Gets Node.js fs and path modules in Electron environment.
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
 * Checks if file system access is available.
 */
export function hasFileSystemAccess(): boolean {
  return getNodeModules() !== null;
}

/**
 * Checks if a file exists.
 */
export function fileExists(filePath: string): boolean {
  const modules = getNodeModules();
  if (!modules) return false;

  try {
    return modules.fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Checks if a directory exists.
 */
export function directoryExists(dirPath: string): boolean {
  const modules = getNodeModules();
  if (!modules) return false;

  try {
    const stats = modules.fs.statSync(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Creates a directory recursively if it doesn't exist.
 */
export function ensureDirectory(dirPath: string): boolean {
  const modules = getNodeModules();
  if (!modules) {
    throw new FileSystemError('File system not available', 'mkdir', dirPath);
  }

  try {
    if (!modules.fs.existsSync(dirPath)) {
      modules.fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    const nodeError = error as NodeError;
    throw new FileSystemError(
      `Failed to create directory: ${nodeError.message}`,
      'mkdir',
      dirPath,
      nodeError
    );
  }
}

/**
 * Generates a unique filename by adding a numeric suffix.
 * Sanitizes the filename to remove invalid characters.
 */
export function generateUniqueFilename(dirPath: string, filename: string): string {
  const modules = getNodeModules();
  if (!modules) return filename;

  const { path, fs } = modules;

  // Security: Sanitize filename to remove invalid/dangerous characters
  const sanitized = sanitizeFilename(filename);

  const ext = path.extname(sanitized);
  const base = path.basename(sanitized, ext);

  let candidate = sanitized;
  let counter = 1;

  while (fs.existsSync(path.join(dirPath, candidate))) {
    candidate = `${base}_${counter}${ext}`;
    counter++;

    // Safety limit
    if (counter > 1000) {
      throw new FileSystemError('Too many files with similar names', 'rename', sanitized);
    }
  }

  return candidate;
}

// =============================================================================
// Path Building
// =============================================================================

/**
 * Builds the full destination path for a file based on JD folder.
 *
 * @param folderNumber - JD folder number (e.g., "11.01")
 * @param filename - Original filename
 * @param options - Optional configuration
 * @returns Destination path info
 */
export function buildDestinationPath(
  folderNumber: string,
  filename: string,
  options: BuildDestinationOptions = {}
): DestinationPath {
  const modules = getNodeModules();
  if (!modules) {
    throw new FileSystemError('File system not available', 'buildPath');
  }

  const { path, fs } = modules;

  // Get folder info from database
  const folder = getFolderByNumber(folderNumber) as FolderWithInfo | null;
  if (!folder) {
    throw new FileSystemError(`Folder ${folderNumber} not found`, 'buildPath');
  }

  // Determine base path (cloud drive or custom)
  let basePath: string | undefined;

  if (options.cloudDriveId) {
    const drive = getCloudDrive(options.cloudDriveId) as CloudDrive | null;
    if (drive) {
      basePath = drive.jd_root_path || drive.base_path;
    }
  }

  if (!basePath) {
    const defaultDrive = getDefaultCloudDrive() as CloudDrive | null;
    if (defaultDrive) {
      basePath = defaultDrive.jd_root_path || defaultDrive.base_path;
    }
  }

  if (!basePath) {
    // Fallback to user's home directory
    basePath = process.env.HOME || process.env.USERPROFILE || '';
    basePath = path.join(basePath, 'JohnnyDecimal');
  }

  // Build folder structure: Area/Category/Folder
  // e.g., 10-19 System/11 Administration/11.01 Documents
  const categoryNumber = folderNumber.split('.')[0];
  const areaStart = Math.floor(parseInt(categoryNumber) / 10) * 10;
  const areaEnd = areaStart + 9;

  // Security: Sanitize folder names to prevent path traversal
  // Remove any path separators or traversal sequences from names
  const sanitizeFolderName = (name: string | undefined): string => {
    if (!name) return '';
    return name
      .replace(/[/\\]/g, '_') // Replace path separators with underscore
      .replace(/\.\./g, '_') // Remove parent directory references
      .replace(/[<>:"|?*]/g, '_') // Remove other invalid filename chars
      .trim();
  };

  const safeAreaName = sanitizeFolderName(folder.area_name) || 'Area';
  const safeCategoryName = sanitizeFolderName(folder.category_name) || 'Category';
  const safeFolderName = sanitizeFolderName(folder.name) || 'Folder';

  const areaFolder = `${areaStart.toString().padStart(2, '0')}-${areaEnd.toString().padStart(2, '0')} ${safeAreaName}`;
  const categoryFolder = `${categoryNumber.padStart(2, '0')} ${safeCategoryName}`;
  const jdFolder = `${folderNumber} ${safeFolderName}`;

  // Use path.resolve to normalize paths
  const folderPath = path.resolve(path.join(basePath, areaFolder, categoryFolder, jdFolder));
  const fullPath = path.resolve(path.join(folderPath, sanitizeFilename(filename)));

  // Security: Validate constructed paths to prevent path traversal
  try {
    validateFilePath(folderPath, { allowHome: true });
    validateFilePath(fullPath, { allowHome: true });
  } catch (error) {
    const err = error as Error;
    throw new FileSystemError(`Invalid destination path: ${err.message}`, 'buildPath', fullPath);
  }

  // Security: Resolve the base path to its real path (handles symlinks)
  let realBasePath = basePath;
  try {
    if (fs.existsSync(basePath)) {
      realBasePath = fs.realpathSync(basePath);
    }
  } catch {
    // If we can't resolve, use the original path
  }

  // Security: Ensure destination is within the base path
  // This check catches symlink attacks where a folder might point outside the intended directory
  if (!isPathWithinBase(fullPath, basePath) && !isPathWithinBase(fullPath, realBasePath)) {
    throw new FileSystemError('Destination path escapes base directory', 'buildPath', fullPath);
  }

  return {
    basePath,
    folderPath,
    fullPath,
    folder,
  };
}

// =============================================================================
// File Move Operations
// =============================================================================

/**
 * Moves a single file to its destination.
 *
 * @param params - Operation parameters
 * @returns Operation result
 */
export function moveFile(
  params: MoveFileParams
): ReturnType<typeof Result.ok<MoveSuccessResult>> | ReturnType<typeof Result.error> {
  const {
    sourcePath,
    folderNumber,
    conflictStrategy = CONFLICT_STRATEGY.RENAME,
    cloudDriveId = null,
  } = params;

  const modules = getNodeModules();
  if (!modules) {
    return Result.error(new FileSystemError('File system not available', 'move', sourcePath));
  }

  const { fs, path } = modules;

  // Validate source path
  let validatedSource: string;
  try {
    validatedSource = validateFilePath(sourcePath, {
      allowHome: true,
    });
  } catch (error) {
    return Result.error(error as Error);
  }

  // Check source exists
  if (!fs.existsSync(validatedSource)) {
    const notFoundError = new Error('Source file not found') as NodeError;
    notFoundError.code = 'ENOENT';
    return Result.error(
      new FileSystemError('Source file not found', 'move', sourcePath, notFoundError)
    );
  }

  // Build destination path
  const filename = path.basename(validatedSource);
  let destination: DestinationPath;

  try {
    destination = buildDestinationPath(folderNumber, filename, { cloudDriveId });
  } catch (error) {
    return Result.error(error as Error);
  }

  // Ensure destination directory exists
  try {
    ensureDirectory(destination.folderPath);
  } catch (error) {
    return Result.error(error as Error);
  }

  // Handle conflicts
  let finalFilename = filename;
  let finalPath = destination.fullPath;

  if (fs.existsSync(finalPath)) {
    switch (conflictStrategy) {
      case CONFLICT_STRATEGY.SKIP:
        return Result.ok<MoveSuccessResult>({
          status: OP_STATUS.SKIPPED,
          reason: 'File already exists at destination',
          sourcePath: validatedSource,
          destinationPath: finalPath,
        });

      case CONFLICT_STRATEGY.RENAME:
        finalFilename = generateUniqueFilename(destination.folderPath, filename);
        finalPath = path.join(destination.folderPath, finalFilename);
        break;

      case CONFLICT_STRATEGY.OVERWRITE:
        // Will overwrite below
        break;

      default:
        return Result.error(new FileSystemError('Unknown conflict strategy', 'move', sourcePath));
    }
  }

  // Perform the move
  try {
    // Use rename for same-filesystem moves, copy+delete for cross-filesystem
    try {
      fs.renameSync(validatedSource, finalPath);
    } catch (renameError) {
      const nodeError = renameError as NodeError;
      // Cross-filesystem move - copy then delete
      if (nodeError.code === 'EXDEV') {
        try {
          fs.copyFileSync(validatedSource, finalPath);
          fs.unlinkSync(validatedSource);
        } catch (copyError) {
          const copyNodeError = copyError as NodeError;
          // Classify copy/delete errors
          const fsError = new FileSystemError(
            `Failed to copy file: ${copyNodeError.message}`,
            'move',
            sourcePath,
            copyNodeError
          );
          return Result.error(fsError);
        }
      } else {
        throw renameError;
      }
    }

    // Record in database
    const defaultDrive = getDefaultCloudDrive() as CloudDrive | null;
    const recordId = recordOrganizedFile({
      filename: finalFilename,
      original_path: validatedSource,
      current_path: finalPath,
      jd_folder_number: folderNumber,
      file_extension: path.extname(filename).slice(1).toLowerCase(),
      file_type: 'document', // Could be enhanced with file type detection
      file_size: fs.statSync(finalPath).size,
      cloud_drive_id: cloudDriveId || defaultDrive?.id,
      status: 'moved',
    }) as number | undefined;

    return Result.ok<MoveSuccessResult>({
      status: OP_STATUS.SUCCESS,
      sourcePath: validatedSource,
      destinationPath: finalPath,
      filename: finalFilename,
      folderNumber,
      recordId,
    });
  } catch (error) {
    const nodeError = error as NodeError;
    // Create FileSystemError with proper classification
    const fsError = new FileSystemError(
      `Failed to move file: ${nodeError.message}`,
      'move',
      sourcePath,
      nodeError
    );
    return Result.error(fsError);
  }
}

/**
 * Rolls back a file move operation.
 *
 * @param recordId - ID of the organized_files record
 * @returns Rollback result
 */
export function rollbackMove(
  recordId: number
): ReturnType<typeof Result.ok<RollbackSuccessResult>> | ReturnType<typeof Result.error> {
  const modules = getNodeModules();
  if (!modules) {
    return Result.error(new FileSystemError('File system not available', 'rollback'));
  }

  const { fs, path } = modules;

  // Get the record
  const record = getOrganizedFile(recordId) as OrganizedFile | null;
  if (!record) {
    return Result.error(new FileSystemError(`Record ${recordId} not found`, 'rollback'));
  }

  if (record.status !== 'moved') {
    return Result.error(
      new FileSystemError(`Cannot rollback: status is ${record.status}`, 'rollback')
    );
  }

  // Check current file exists
  if (!fs.existsSync(record.current_path)) {
    const notFoundError = new Error('File no longer exists at destination') as NodeError;
    notFoundError.code = 'ENOENT';
    return Result.error(
      new FileSystemError(
        'File no longer exists at destination',
        'rollback',
        record.current_path,
        notFoundError
      )
    );
  }

  // Check original location is available
  if (fs.existsSync(record.original_path)) {
    return Result.error(
      new FileSystemError('Original location already has a file', 'rollback', record.original_path)
    );
  }

  // Ensure original directory exists
  const originalDir = path.dirname(record.original_path);
  try {
    ensureDirectory(originalDir);
  } catch (error) {
    return Result.error(error as Error);
  }

  // Move file back
  try {
    try {
      fs.renameSync(record.current_path, record.original_path);
    } catch (renameError) {
      const nodeError = renameError as NodeError;
      if (nodeError.code === 'EXDEV') {
        fs.copyFileSync(record.current_path, record.original_path);
        fs.unlinkSync(record.current_path);
      } else {
        throw renameError;
      }
    }

    // Update database record
    updateOrganizedFile(recordId, { status: 'undone' });

    return Result.ok<RollbackSuccessResult>({
      status: OP_STATUS.ROLLED_BACK,
      originalPath: record.original_path,
      fromPath: record.current_path,
    });
  } catch (error) {
    const nodeError = error as NodeError;
    return Result.error(
      new FileSystemError(
        `Failed to rollback: ${nodeError.message}`,
        'rollback',
        record.current_path,
        nodeError
      )
    );
  }
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Batch move operation with progress tracking.
 *
 * @param operations - Array of operation objects
 * @param options - Batch options
 * @returns Batch result summary
 */
export async function batchMove(
  operations: BatchOperation[],
  options: BatchMoveOptions = {}
): Promise<BatchMoveResults> {
  const {
    onProgress = () => {},
    onFileComplete = () => {},
    conflictStrategy = CONFLICT_STRATEGY.RENAME,
    stopOnError = false,
  } = options;

  const results: BatchMoveResults = {
    total: operations.length,
    success: 0,
    failed: 0,
    skipped: 0,
    operations: [],
  };

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];

    // Update progress
    onProgress({
      current: i + 1,
      total: operations.length,
      percent: Math.round(((i + 1) / operations.length) * 100),
      currentFile: op.sourcePath,
    });

    // Perform move
    const result = moveFile({
      sourcePath: op.sourcePath,
      folderNumber: op.folderNumber,
      conflictStrategy: op.conflictStrategy || conflictStrategy,
      cloudDriveId: op.cloudDriveId,
    });

    // Track result
    const opResult: BatchOperationResult = {
      ...op,
      success: result.success,
      result: result.success ? (result.data as MoveSuccessResult) : null,
      error: result.success ? null : (result.error as Error),
    };

    results.operations.push(opResult);

    if (result.success) {
      const data = result.data as MoveSuccessResult;
      if (data.status === OP_STATUS.SKIPPED) {
        results.skipped++;
      } else {
        results.success++;
      }
    } else {
      results.failed++;
      if (stopOnError) {
        break;
      }
    }

    // Per-file callback
    onFileComplete(opResult);

    // Small delay to prevent UI blocking
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  return results;
}

/**
 * Batch rollback operation.
 *
 * @param recordIds - Array of organized_files record IDs
 * @param onProgress - Progress callback
 * @returns Batch rollback result
 */
export async function batchRollback(
  recordIds: number[],
  onProgress: (info: ProgressInfo) => void = () => {}
): Promise<BatchRollbackResults> {
  const results: BatchRollbackResults = {
    total: recordIds.length,
    success: 0,
    failed: 0,
    operations: [],
  };

  for (let i = 0; i < recordIds.length; i++) {
    const recordId = recordIds[i];

    onProgress({
      current: i + 1,
      total: recordIds.length,
      percent: Math.round(((i + 1) / recordIds.length) * 100),
    });

    const result = rollbackMove(recordId);

    results.operations.push({
      recordId,
      success: result.success,
      result: result.success ? (result.data as RollbackSuccessResult) : null,
      error: result.success ? null : (result.error as Error),
    });

    if (result.success) {
      results.success++;
    } else {
      results.failed++;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  return results;
}

// =============================================================================
// Dry Run / Preview
// =============================================================================

/**
 * Previews what would happen if files were organized.
 * Does not actually move any files.
 *
 * @param operations - Array of operation objects
 * @returns Preview of operations
 */
export function previewOperations(operations: BatchOperation[]): PreviewResult[] {
  const modules = getNodeModules();
  if (!modules) {
    return operations.map((op) => ({
      ...op,
      sourceExists: false,
      destinationPath: null,
      wouldConflict: false,
      folder: null,
      error: 'File system not available',
    }));
  }

  const { fs, path } = modules;

  return operations.map((op) => {
    const preview: PreviewResult = {
      ...op,
      sourceExists: false,
      destinationPath: null,
      wouldConflict: false,
      folder: null,
      error: null,
    };

    // Check source
    try {
      preview.sourceExists = fs.existsSync(op.sourcePath);
    } catch {
      preview.error = 'Cannot check source file';
      return preview;
    }

    // Build destination
    try {
      const filename = path.basename(op.sourcePath);
      const dest = buildDestinationPath(op.folderNumber, filename);
      preview.destinationPath = dest.fullPath;
      preview.folder = dest.folder;
      preview.wouldConflict = fs.existsSync(dest.fullPath);
    } catch (error) {
      const err = error as Error;
      preview.error = err.message;
    }

    return preview;
  });
}

// =============================================================================
// Exports
// =============================================================================

export default {
  moveFile,
  rollbackMove,
  batchMove,
  batchRollback,
  previewOperations,
  buildDestinationPath,
  hasFileSystemAccess,
  fileExists,
  directoryExists,
  ensureDirectory,
  generateUniqueFilename,
  CONFLICT_STRATEGY,
  OP_STATUS,
};
