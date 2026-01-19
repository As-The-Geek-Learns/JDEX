/**
 * Batch Rename Service
 * =====================
 * Handles batch file renaming operations with pattern support,
 * preview generation, and undo tracking.
 */

import { validateFilePath, sanitizeText } from '../utils/validation.js';

// =============================================================================
// Constants
// =============================================================================

// Characters not allowed in filenames
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

// Windows reserved names
const RESERVED_NAMES = [
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
];

// Undo log key in localStorage
const UNDO_LOG_KEY = 'jdex_batch_rename_undo';

// =============================================================================
// Filename Utilities
// =============================================================================

/**
 * Get base name without extension
 */
export function getBaseName(filename) {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) return filename;
  return filename.substring(0, lastDot);
}

/**
 * Get file extension (without dot)
 */
export function getExtension(filename) {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) return '';
  return filename.substring(lastDot + 1);
}

/**
 * Sanitize a filename to remove invalid characters
 */
export function sanitizeFilename(filename) {
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
  if (sanitized.length > 250) {
    const ext = getExtension(sanitized);
    const base = getBaseName(sanitized);
    sanitized = base.substring(0, 245 - ext.length) + '.' + ext;
  }
  
  return sanitized;
}

/**
 * Transform case of a string
 */
export function transformCase(str, caseType) {
  switch (caseType) {
    case 'lowercase':
      return str.toLowerCase();
    case 'uppercase':
      return str.toUpperCase();
    case 'titlecase':
      return str.replace(/\b\w/g, c => c.toUpperCase());
    case 'sentencecase':
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    default:
      return str;
  }
}

// =============================================================================
// Name Generation
// =============================================================================

/**
 * Generate new filename based on rename options
 * 
 * @param {string} originalName - Original filename
 * @param {Object} options - Rename options
 * @param {number} index - File index in batch (for numbering)
 * @returns {string} New filename
 */
export function generateNewName(originalName, options, index = 0) {
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
    const startNum = parseInt(options.startNumber) || 1;
    const digits = parseInt(options.digits) || 3;
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
    const finalExt = (options.changeCase && options.caseType === 'lowercase') 
      ? ext.toLowerCase() 
      : (options.changeCase && options.caseType === 'uppercase')
        ? ext.toUpperCase()
        : ext;
    newFilename = name + '.' + finalExt;
  }
  
  return sanitizeFilename(newFilename);
}

/**
 * Generate preview of all renames
 * 
 * @param {Array} files - Array of { name, path } objects
 * @param {Object} options - Rename options
 * @returns {Array} Array of { original, newName, path, newPath, conflict }
 */
export function generatePreview(files, options) {
  const fs = window.require ? window.require('fs') : null;
  const pathModule = window.require ? window.require('path') : null;
  
  const newNames = new Set();
  const preview = [];
  
  files.forEach((file, index) => {
    const newName = generateNewName(file.name, options, index);
    const newPath = pathModule ? pathModule.join(pathModule.dirname(file.path), newName) : '';
    
    // Check for conflicts
    let conflict = null;
    
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

// =============================================================================
// Rename Execution
// =============================================================================

/**
 * Execute batch rename operation
 * 
 * @param {Array} preview - Preview array from generatePreview
 * @param {Object} options - Additional options
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Object} { success, count, errors, undoId }
 */
export async function executeBatchRename(preview, options = {}, onProgress = () => {}) {
  const fs = window.require ? window.require('fs') : null;
  
  if (!fs) {
    return { success: false, error: 'File system not available' };
  }
  
  const undoLog = [];
  const errors = [];
  let successCount = 0;
  
  // Filter to only files that will change
  const toRename = preview.filter(p => p.willChange && !p.conflict);
  
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
        error: error.message || 'Failed to rename' 
      });
    }
    
    // Small delay to prevent UI blocking
    await new Promise(resolve => setTimeout(resolve, 5));
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

// =============================================================================
// Undo Support
// =============================================================================

/**
 * Save undo log to localStorage
 */
function saveUndoLog(undoId, log) {
  try {
    const existing = JSON.parse(localStorage.getItem(UNDO_LOG_KEY) || '{}');
    existing[undoId] = {
      timestamp: Date.now(),
      log,
    };
    
    // Keep only last 10 undo logs
    const keys = Object.keys(existing).sort().reverse();
    if (keys.length > 10) {
      keys.slice(10).forEach(k => delete existing[k]);
    }
    
    localStorage.setItem(UNDO_LOG_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('[BatchRename] Failed to save undo log:', error);
  }
}

/**
 * Get undo log by ID
 */
export function getUndoLog(undoId) {
  try {
    const existing = JSON.parse(localStorage.getItem(UNDO_LOG_KEY) || '{}');
    return existing[undoId]?.log || null;
  } catch {
    return null;
  }
}

/**
 * Get most recent undo log
 */
export function getMostRecentUndoLog() {
  try {
    const existing = JSON.parse(localStorage.getItem(UNDO_LOG_KEY) || '{}');
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
 * Execute undo operation
 * 
 * @param {string} undoId - Undo log ID
 * @param {Function} onProgress - Progress callback
 * @returns {Object} { success, count, errors }
 */
export async function undoBatchRename(undoId, onProgress = () => {}) {
  const fs = window.require ? window.require('fs') : null;
  
  if (!fs) {
    return { success: false, error: 'File system not available' };
  }
  
  const log = getUndoLog(undoId);
  if (!log) {
    return { success: false, error: 'Undo log not found' };
  }
  
  const errors = [];
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
        error: error.message || 'Failed to undo',
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 5));
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
 * Remove an undo log
 */
function removeUndoLog(undoId) {
  try {
    const existing = JSON.parse(localStorage.getItem(UNDO_LOG_KEY) || '{}');
    delete existing[undoId];
    localStorage.setItem(UNDO_LOG_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('[BatchRename] Failed to remove undo log:', error);
  }
}

// =============================================================================
// File Selection Helpers
// =============================================================================

/**
 * Read files from a directory
 * 
 * @param {string} dirPath - Directory path
 * @returns {Array} Array of { name, path, size, isDirectory }
 */
export function readDirectoryFiles(dirPath) {
  const fs = window.require ? window.require('fs') : null;
  const pathModule = window.require ? window.require('path') : null;
  
  if (!fs || !pathModule) {
    return [];
  }
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    return entries
      .filter(entry => entry.isFile())
      .map(entry => {
        const fullPath = pathModule.join(dirPath, entry.name);
        let size = 0;
        try {
          size = fs.statSync(fullPath).size;
        } catch {}
        
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

// =============================================================================
// Premium Limits
// =============================================================================

const FREE_TIER_BATCH_LIMIT = 5;

/**
 * Check if batch size is within limits
 * 
 * @param {number} fileCount - Number of files to rename
 * @param {boolean} isPremium - User's premium status
 * @returns {{ allowed: boolean, limit: number }}
 */
export function checkBatchLimit(fileCount, isPremium) {
  if (isPremium) {
    return { allowed: true, limit: Infinity };
  }
  
  return {
    allowed: fileCount <= FREE_TIER_BATCH_LIMIT,
    limit: FREE_TIER_BATCH_LIMIT,
  };
}

// =============================================================================
// Exports
// =============================================================================

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
