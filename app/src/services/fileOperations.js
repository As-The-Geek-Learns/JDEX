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

// =============================================================================
// Constants
// =============================================================================

/**
 * Conflict resolution strategies.
 */
export const CONFLICT_STRATEGY = {
  RENAME: 'rename',      // Add suffix to new file (e.g., file_1.pdf)
  SKIP: 'skip',          // Don't move, leave original in place
  OVERWRITE: 'overwrite', // Replace existing file (dangerous)
};

/**
 * Operation status codes.
 */
export const OP_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  SUCCESS: 'success',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  ROLLED_BACK: 'rolled_back',
};

// =============================================================================
// File System Helpers
// =============================================================================

/**
 * Gets Node.js fs and path modules in Electron environment.
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
 * Checks if file system access is available.
 */
export function hasFileSystemAccess() {
  return getNodeModules() !== null;
}

/**
 * Checks if a file exists.
 */
export function fileExists(filePath) {
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
export function directoryExists(dirPath) {
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
export function ensureDirectory(dirPath) {
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
    throw new FileSystemError(
      `Failed to create directory: ${error.message}`,
      'mkdir',
      dirPath,
      error
    );
  }
}

/**
 * Generates a unique filename by adding a numeric suffix.
 * Sanitizes the filename to remove invalid characters.
 */
export function generateUniqueFilename(dirPath, filename) {
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
      throw new FileSystemError(
        'Too many files with similar names',
        'rename',
        sanitized
      );
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
 * @param {string} folderNumber - JD folder number (e.g., "11.01")
 * @param {string} filename - Original filename
 * @param {Object} options - Optional configuration
 * @returns {Object} { basePath, folderPath, fullPath }
 */
export function buildDestinationPath(folderNumber, filename, options = {}) {
  const modules = getNodeModules();
  if (!modules) {
    throw new FileSystemError('File system not available', 'buildPath');
  }
  
  const { path } = modules;
  
  // Get folder info from database
  const folder = getFolderByNumber(folderNumber);
  if (!folder) {
    throw new FileSystemError(`Folder ${folderNumber} not found`, 'buildPath');
  }
  
  // Determine base path (cloud drive or custom)
  let basePath;
  
  if (options.cloudDriveId) {
    const drive = getCloudDrive(options.cloudDriveId);
    if (drive) {
      basePath = drive.jd_root_path || drive.base_path;
    }
  }
  
  if (!basePath) {
    const defaultDrive = getDefaultCloudDrive();
    if (defaultDrive) {
      basePath = defaultDrive.jd_root_path || defaultDrive.base_path;
    }
  }
  
  if (!basePath) {
    // Fallback to user's home directory
    basePath = process.env.HOME || process.env.USERPROFILE;
    basePath = path.join(basePath, 'JohnnyDecimal');
  }
  
  // Build folder structure: Area/Category/Folder
  // e.g., 10-19 System/11 Administration/11.01 Documents
  const categoryNumber = folderNumber.split('.')[0];
  const areaStart = Math.floor(parseInt(categoryNumber) / 10) * 10;
  const areaEnd = areaStart + 9;
  
  // Security: Sanitize folder names to prevent path traversal
  // Remove any path separators or traversal sequences from names
  const sanitizeFolderName = (name) => {
    if (!name) return '';
    return name
      .replace(/[\/\\]/g, '_')      // Replace path separators with underscore
      .replace(/\.\./g, '_')         // Remove parent directory references
      .replace(/[<>:"|?*]/g, '_')    // Remove other invalid filename chars
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
    throw new FileSystemError(
      `Invalid destination path: ${error.message}`,
      'buildPath',
      fullPath
    );
  }
  
  // Security: Resolve the base path to its real path (handles symlinks)
  const { fs } = modules;
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
    throw new FileSystemError(
      'Destination path escapes base directory',
      'buildPath',
      fullPath
    );
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
 * @param {Object} params - Operation parameters
 * @param {string} params.sourcePath - Original file path
 * @param {string} params.folderNumber - Target JD folder number
 * @param {string} params.conflictStrategy - How to handle conflicts
 * @param {string} params.cloudDriveId - Optional specific cloud drive
 * @returns {Result} Operation result
 */
export function moveFile(params) {
  const {
    sourcePath,
    folderNumber,
    conflictStrategy = CONFLICT_STRATEGY.RENAME,
    cloudDriveId = null,
  } = params;
  
  const modules = getNodeModules();
  if (!modules) {
    return Result.error(
      new FileSystemError('File system not available', 'move', sourcePath)
    );
  }
  
  const { fs, path } = modules;
  
  // Validate source path
  let validatedSource;
  try {
    validatedSource = validateFilePath(sourcePath, {
      allowHome: true,
      allowSystemPaths: false,
    });
  } catch (error) {
    return Result.error(error);
  }
  
  // Check source exists
  if (!fs.existsSync(validatedSource)) {
    return Result.error(
      new FileSystemError('Source file not found', 'move', sourcePath)
    );
  }
  
  // Build destination path
  const filename = path.basename(validatedSource);
  let destination;
  
  try {
    destination = buildDestinationPath(folderNumber, filename, { cloudDriveId });
  } catch (error) {
    return Result.error(error);
  }
  
  // Ensure destination directory exists
  try {
    ensureDirectory(destination.folderPath);
  } catch (error) {
    return Result.error(error);
  }
  
  // Handle conflicts
  let finalFilename = filename;
  let finalPath = destination.fullPath;
  
  if (fs.existsSync(finalPath)) {
    switch (conflictStrategy) {
      case CONFLICT_STRATEGY.SKIP:
        return Result.ok({
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
        return Result.error(
          new FileSystemError('Unknown conflict strategy', 'move', sourcePath)
        );
    }
  }
  
  // Perform the move
  try {
    // Use rename for same-filesystem moves, copy+delete for cross-filesystem
    try {
      fs.renameSync(validatedSource, finalPath);
    } catch (renameError) {
      // Cross-filesystem move - copy then delete
      if (renameError.code === 'EXDEV') {
        fs.copyFileSync(validatedSource, finalPath);
        fs.unlinkSync(validatedSource);
      } else {
        throw renameError;
      }
    }
    
    // Record in database
    const record = recordOrganizedFile({
      filename: finalFilename,
      original_path: validatedSource,
      current_path: finalPath,
      jd_folder_number: folderNumber,
      file_extension: path.extname(filename).slice(1).toLowerCase(),
      file_type: 'document', // Could be enhanced with file type detection
      file_size: fs.statSync(finalPath).size,
      cloud_drive_id: cloudDriveId || getDefaultCloudDrive()?.id,
      status: 'moved',
    });
    
    return Result.ok({
      status: OP_STATUS.SUCCESS,
      sourcePath: validatedSource,
      destinationPath: finalPath,
      filename: finalFilename,
      folderNumber,
      recordId: record?.id,
    });
    
  } catch (error) {
    return Result.error(
      new FileSystemError(
        `Failed to move file: ${error.message}`,
        'move',
        sourcePath,
        error
      )
    );
  }
}

/**
 * Rolls back a file move operation.
 * 
 * @param {number} recordId - ID of the organized_files record
 * @returns {Result} Rollback result
 */
export function rollbackMove(recordId) {
  const modules = getNodeModules();
  if (!modules) {
    return Result.error(
      new FileSystemError('File system not available', 'rollback')
    );
  }
  
  const { fs, path } = modules;
  
  // Get the record
  const record = getOrganizedFile(recordId);
  if (!record) {
    return Result.error(
      new FileSystemError(`Record ${recordId} not found`, 'rollback')
    );
  }
  
  if (record.status !== 'moved') {
    return Result.error(
      new FileSystemError(`Cannot rollback: status is ${record.status}`, 'rollback')
    );
  }
  
  // Check current file exists
  if (!fs.existsSync(record.current_path)) {
    return Result.error(
      new FileSystemError('File no longer exists at destination', 'rollback')
    );
  }
  
  // Check original location is available
  if (fs.existsSync(record.original_path)) {
    return Result.error(
      new FileSystemError('Original location already has a file', 'rollback')
    );
  }
  
  // Ensure original directory exists
  const originalDir = path.dirname(record.original_path);
  try {
    ensureDirectory(originalDir);
  } catch (error) {
    return Result.error(error);
  }
  
  // Move file back
  try {
    try {
      fs.renameSync(record.current_path, record.original_path);
    } catch (renameError) {
      if (renameError.code === 'EXDEV') {
        fs.copyFileSync(record.current_path, record.original_path);
        fs.unlinkSync(record.current_path);
      } else {
        throw renameError;
      }
    }
    
    // Update database record
    updateOrganizedFile(recordId, { status: 'undone' });
    
    return Result.ok({
      status: OP_STATUS.ROLLED_BACK,
      originalPath: record.original_path,
      fromPath: record.current_path,
    });
    
  } catch (error) {
    return Result.error(
      new FileSystemError(
        `Failed to rollback: ${error.message}`,
        'rollback',
        record.current_path,
        error
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
 * @param {Array} operations - Array of { sourcePath, folderNumber } objects
 * @param {Object} options - Batch options
 * @param {Function} options.onProgress - Progress callback
 * @param {Function} options.onFileComplete - Per-file callback
 * @param {string} options.conflictStrategy - Default conflict strategy
 * @param {boolean} options.stopOnError - Stop batch on first error
 * @returns {Object} Batch result summary
 */
export async function batchMove(operations, options = {}) {
  const {
    onProgress = () => {},
    onFileComplete = () => {},
    conflictStrategy = CONFLICT_STRATEGY.RENAME,
    stopOnError = false,
  } = options;
  
  const results = {
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
    const opResult = {
      ...op,
      success: result.success,
      result: result.success ? result.value : null,
      error: result.success ? null : result.error,
    };
    
    results.operations.push(opResult);
    
    if (result.success) {
      if (result.value.status === OP_STATUS.SKIPPED) {
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
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  return results;
}

/**
 * Batch rollback operation.
 * 
 * @param {Array} recordIds - Array of organized_files record IDs
 * @param {Function} onProgress - Progress callback
 * @returns {Object} Batch rollback result
 */
export async function batchRollback(recordIds, onProgress = () => {}) {
  const results = {
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
      result: result.success ? result.value : null,
      error: result.success ? null : result.error,
    });
    
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 10));
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
 * @param {Array} operations - Array of { sourcePath, folderNumber } objects
 * @returns {Array} Preview of operations
 */
export function previewOperations(operations) {
  const modules = getNodeModules();
  if (!modules) return operations.map(op => ({ ...op, error: 'File system not available' }));
  
  const { fs, path } = modules;
  
  return operations.map(op => {
    const preview = {
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
      preview.error = error.message;
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
