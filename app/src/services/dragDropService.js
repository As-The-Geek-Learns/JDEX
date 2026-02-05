/**
 * Drag & Drop Service
 * ====================
 * Handles file drop operations for organizing files into JD folders.
 * Includes validation, file operations, and database logging.
 */

import { validateFilePath, sanitizeText } from '../utils/validation.js';
import { getDB, saveDatabase } from '../db.js';

// System directories that should never be touched
const BLOCKED_PATHS = [
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

// File extensions to warn about
const SENSITIVE_EXTENSIONS = [
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
 * Validate a dropped file path for safety
 * @param {string} filePath - Full path to the dropped file
 * @returns {{ valid: boolean, error?: string, warning?: string }}
 */
export function validateDroppedFile(filePath) {
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
    return { valid: false, error: error.message };
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

/**
 * Extract file info from a dropped file
 * @param {File} file - File object from drag event
 * @returns {Object} File information
 */
export function extractFileInfo(file) {
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

/**
 * Categorize file type based on extension
 */
function categorizeFileType(extension) {
  const categories = {
    Documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'pages'],
    Spreadsheets: ['xls', 'xlsx', 'csv', 'numbers', 'ods'],
    Presentations: ['ppt', 'pptx', 'key', 'odp'],
    Images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'heic'],
    Videos: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv'],
    Audio: ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg'],
    Archives: ['zip', 'rar', '7z', 'tar', 'gz', 'dmg'],
    Code: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'swift', 'rs'],
    Data: ['json', 'xml', 'yaml', 'yml', 'sql', 'db'],
  };

  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(extension)) {
      return category;
    }
  }
  return 'Other';
}

/**
 * Build the destination path for a file in a JD folder
 * @param {Object} folder - Target folder object with folder_number and storage_path
 * @param {string} fileName - Name of the file being moved
 * @param {string} jdRootPath - Root path for JD structure (from cloud drive settings)
 * @returns {string} Full destination path
 */
export function buildDestinationPath(folder, fileName, jdRootPath) {
  const fs = window.require ? window.require('fs') : null;
  const path = window.require ? window.require('path') : null;

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
  const areaRange = `${Math.floor(parseInt(categoryNum) / 10) * 10}-${Math.floor(parseInt(categoryNum) / 10) * 10 + 9}`;
  const areaFolder = `${areaRange} ${folder.area_name || 'Area'}`;
  const categoryFolder = `${categoryNum} ${folder.category_name || 'Category'}`;
  const jdFolder = `${folderNumber} ${folder.name}`;

  return path.join(jdRootPath, areaFolder, categoryFolder, jdFolder, fileName);
}

/**
 * Move a file to a JD folder
 * @param {string} sourcePath - Current file location
 * @param {string} destPath - Destination in JD structure
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function moveFileToFolder(sourcePath, destPath) {
  const fs = window.require ? window.require('fs') : null;
  const path = window.require ? window.require('path') : null;

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
      if (renameError.code === 'EXDEV') {
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
      error: error.message || 'Failed to move file',
    };
  }
}

/**
 * Log an organized file to the database
 * @param {Object} params - File organization details
 */
export function logOrganizedFile({
  filename,
  originalPath,
  currentPath,
  jdFolderNumber,
  fileType,
  fileSize,
  ruleId = null,
}) {
  const db = getDB();
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

/**
 * Check if a file already exists at destination with conflict resolution options
 * @param {string} destPath - Proposed destination path
 * @returns {{ exists: boolean, suggestedName?: string }}
 */
export function checkForConflict(destPath) {
  const fs = window.require ? window.require('fs') : null;
  const path = window.require ? window.require('path') : null;

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

/**
 * Get drag & drop usage count for the current month (for free tier limits)
 * @returns {number} Number of drag & drop operations this month
 */
export function getDragDropUsageThisMonth() {
  const usageData = localStorage.getItem('jdex_dragdrop_usage');
  if (!usageData) return 0;

  try {
    const { month, count } = JSON.parse(usageData);
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
 * Increment drag & drop usage counter
 */
export function incrementDragDropUsage() {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentCount = getDragDropUsageThisMonth();

  localStorage.setItem(
    'jdex_dragdrop_usage',
    JSON.stringify({
      month: currentMonth,
      count: currentCount + 1,
    })
  );
}

/**
 * Check if user can perform drag & drop (premium or under limit)
 * @param {boolean} isPremium - Whether user has premium license
 * @returns {{ allowed: boolean, remaining?: number }}
 */
export function canPerformDragDrop(isPremium) {
  if (isPremium) {
    return { allowed: true };
  }

  const FREE_TIER_LIMIT = 5;
  const used = getDragDropUsageThisMonth();
  const remaining = FREE_TIER_LIMIT - used;

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit: FREE_TIER_LIMIT,
  };
}
