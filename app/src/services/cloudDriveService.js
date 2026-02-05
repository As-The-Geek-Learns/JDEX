/**
 * Cloud Drive Service for JDex
 * ============================
 * Detects and manages cloud storage drives (iCloud, Dropbox, OneDrive, etc.)
 *
 * This service handles:
 * - Auto-detecting installed cloud drives
 * - Resolving platform-specific paths
 * - Checking drive availability
 * - Managing drive configurations in the database
 */

import { validateFilePath, isPathWithinBase } from '../utils/validation.js';
import { CloudDriveError } from '../utils/errors.js';
import {
  getCloudDrives,
  getCloudDrive,
  createCloudDrive,
  updateCloudDrive,
  deleteCloudDrive,
  getDefaultCloudDrive,
  setDefaultCloudDrive,
} from '../db.js';

// =============================================================================
// Platform Detection
// =============================================================================

/**
 * Detect the current operating system.
 * @returns {'macos'|'windows'|'linux'|'unknown'}
 */
export function getPlatform() {
  // In Electron renderer, we can use navigator.platform
  // In Node.js context, use process.platform
  if (typeof process !== 'undefined' && process.platform) {
    switch (process.platform) {
      case 'darwin':
        return 'macos';
      case 'win32':
        return 'windows';
      case 'linux':
        return 'linux';
      default:
        return 'unknown';
    }
  }

  // Fallback for browser context
  if (typeof navigator !== 'undefined') {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('mac')) return 'macos';
    if (platform.includes('win')) return 'windows';
    if (platform.includes('linux')) return 'linux';
  }

  return 'unknown';
}

/**
 * Get the user's home directory path.
 * @returns {string}
 */
export function getHomeDirectory() {
  // In Electron/Node.js
  if (typeof process !== 'undefined') {
    return process.env.HOME || process.env.USERPROFILE || '';
  }
  return '';
}

/**
 * Expand path variables like ~ and %USERPROFILE%.
 * @param {string} path - Path with potential variables
 * @returns {string} Expanded path
 */
export function expandPath(path) {
  if (!path) return '';

  const home = getHomeDirectory();

  let expanded = path
    // Unix home shortcut
    .replace(/^~/, home)
    // Windows environment variables
    .replace(/%USERPROFILE%/gi, home)
    .replace(/%HOME%/gi, home);

  return expanded;
}

// =============================================================================
// Known Cloud Drive Configurations
// =============================================================================

/**
 * Known cloud drive paths by platform.
 * These are the default installation locations for each cloud service.
 */
export const KNOWN_DRIVES = {
  icloud: {
    id: 'icloud',
    name: 'iCloud Drive',
    drive_type: 'icloud',
    paths: {
      macos: '~/Library/Mobile Documents/com~apple~CloudDocs',
      // iCloud for Windows stores in a different location
      windows: '%USERPROFILE%/iCloudDrive',
    },
    description: 'Apple iCloud Drive',
    supportsEncryption: false,
  },

  dropbox: {
    id: 'dropbox',
    name: 'Dropbox',
    drive_type: 'dropbox',
    paths: {
      macos: '~/Dropbox',
      windows: '%USERPROFILE%/Dropbox',
      linux: '~/Dropbox',
    },
    description: 'Dropbox cloud storage',
    supportsEncryption: false,
  },

  onedrive: {
    id: 'onedrive',
    name: 'OneDrive',
    drive_type: 'onedrive',
    paths: {
      macos: '~/OneDrive',
      windows: '%USERPROFILE%/OneDrive',
      linux: '~/OneDrive',
    },
    description: 'Microsoft OneDrive',
    supportsEncryption: false,
  },

  'onedrive-business': {
    id: 'onedrive-business',
    name: 'OneDrive for Business',
    drive_type: 'onedrive',
    paths: {
      // Business OneDrive often has organization name in path
      macos: '~/OneDrive - *', // Wildcard - needs special handling
      windows: '%USERPROFILE%/OneDrive - *',
    },
    description: 'Microsoft OneDrive for Business',
    supportsEncryption: false,
    isWildcard: true,
  },

  googledrive: {
    id: 'googledrive',
    name: 'Google Drive',
    drive_type: 'google',
    paths: {
      macos: '~/Google Drive',
      windows: '%USERPROFILE%/Google Drive',
      linux: '~/Google Drive',
    },
    // Google Drive desktop app (newer) uses different location
    alternatePaths: {
      macos: '~/Library/CloudStorage/GoogleDrive-*',
      windows: '%USERPROFILE%/Google Drive Streaming',
    },
    description: 'Google Drive',
    supportsEncryption: false,
    isWildcard: true,
  },

  proton: {
    id: 'proton',
    name: 'Proton Drive',
    drive_type: 'proton',
    paths: {
      macos: '~/Proton Drive',
      windows: '%USERPROFILE%/Proton Drive',
      linux: '~/Proton Drive',
    },
    // ProtonDrive app may use different locations
    alternatePaths: {
      macos: '~/Library/CloudStorage/ProtonDrive-*',
    },
    description: 'Proton Drive (encrypted)',
    supportsEncryption: true,
    isWildcard: true,
  },
};

// =============================================================================
// File System Helpers (Electron/Node.js)
// =============================================================================

/**
 * Check if a directory exists.
 * Uses Electron's Node.js integration.
 *
 * @param {string} dirPath - Path to check
 * @returns {Promise<boolean>} True if directory exists
 */
export async function directoryExists(dirPath) {
  try {
    // In Electron, we have access to Node.js fs module
    const fs = window.require ? window.require('fs').promises : null;

    if (!fs) {
      console.warn('[CloudDrive] fs module not available - running in browser mode');
      return false;
    }

    const expanded = expandPath(dirPath);
    const stats = await fs.stat(expanded);
    return stats.isDirectory();
  } catch (error) {
    // ENOENT = doesn't exist, which is fine
    if (error.code === 'ENOENT') {
      return false;
    }
    // Other errors (permission, etc.) - log but return false
    console.warn(`[CloudDrive] Error checking ${dirPath}:`, error.message);
    return false;
  }
}

/**
 * List directories matching a pattern (for wildcard paths).
 *
 * @param {string} pattern - Path pattern with * wildcard
 * @returns {Promise<string[]>} Array of matching directory paths
 */
export async function findMatchingDirectories(pattern) {
  try {
    const fs = window.require ? window.require('fs').promises : null;
    const path = window.require ? window.require('path') : null;

    if (!fs || !path) {
      return [];
    }

    const expanded = expandPath(pattern);
    const dir = path.dirname(expanded);
    const filePattern = path.basename(expanded);

    // Convert wildcard to regex
    const regex = new RegExp('^' + filePattern.replace(/\*/g, '.*') + '$');

    const entries = await fs.readdir(dir, { withFileTypes: true });
    const matches = entries
      .filter((entry) => entry.isDirectory() && regex.test(entry.name))
      .map((entry) => path.join(dir, entry.name));

    return matches;
  } catch (error) {
    console.warn(`[CloudDrive] Error finding matches for ${pattern}:`, error.message);
    return [];
  }
}

// =============================================================================
// Cloud Drive Detection
// =============================================================================

/**
 * Detect a single known cloud drive.
 *
 * @param {string} driveKey - Key from KNOWN_DRIVES (e.g., 'icloud', 'dropbox')
 * @returns {Promise<Object|null>} Detected drive info or null
 */
export async function detectDrive(driveKey) {
  const driveConfig = KNOWN_DRIVES[driveKey];
  if (!driveConfig) {
    return null;
  }

  const platform = getPlatform();
  const primaryPath = driveConfig.paths[platform];
  const alternatePath = driveConfig.alternatePaths?.[platform];

  // Try primary path first
  if (primaryPath) {
    if (driveConfig.isWildcard) {
      const matches = await findMatchingDirectories(primaryPath);
      if (matches.length > 0) {
        return {
          ...driveConfig,
          detectedPath: matches[0],
          allMatches: matches,
        };
      }
    } else {
      const exists = await directoryExists(primaryPath);
      if (exists) {
        return {
          ...driveConfig,
          detectedPath: expandPath(primaryPath),
        };
      }
    }
  }

  // Try alternate path
  if (alternatePath) {
    if (driveConfig.isWildcard) {
      const matches = await findMatchingDirectories(alternatePath);
      if (matches.length > 0) {
        return {
          ...driveConfig,
          detectedPath: matches[0],
          allMatches: matches,
        };
      }
    } else {
      const exists = await directoryExists(alternatePath);
      if (exists) {
        return {
          ...driveConfig,
          detectedPath: expandPath(alternatePath),
        };
      }
    }
  }

  return null;
}

/**
 * Detect all installed cloud drives on the system.
 *
 * @returns {Promise<Array>} Array of detected drive objects
 */
export async function detectAllDrives() {
  const detected = [];

  for (const driveKey of Object.keys(KNOWN_DRIVES)) {
    try {
      const drive = await detectDrive(driveKey);
      if (drive) {
        detected.push(drive);
      }
    } catch (error) {
      console.warn(`[CloudDrive] Error detecting ${driveKey}:`, error.message);
    }
  }

  return detected;
}

/**
 * Detect drives and compare with configured drives.
 * Returns status of each drive (detected, configured, missing, etc.)
 *
 * @returns {Promise<Object>} Detection results with status
 */
export async function detectAndCompare() {
  const detected = await detectAllDrives();
  const configured = getCloudDrives();

  const results = {
    detected: [], // Drives found on system but not configured
    configured: [], // Drives configured and present
    missing: [], // Drives configured but not found
    available: [], // All available drives (detected + configured present)
  };

  // Check each detected drive
  for (const drive of detected) {
    const isConfigured = configured.some((c) => c.id === drive.id);

    if (isConfigured) {
      results.configured.push(drive);
      results.available.push(drive);
    } else {
      results.detected.push(drive);
      results.available.push(drive);
    }
  }

  // Check for configured drives that weren't detected
  for (const config of configured) {
    const wasDetected = detected.some((d) => d.id === config.id);
    if (!wasDetected) {
      // Check if the configured path still exists
      const exists = await directoryExists(config.base_path);
      if (exists) {
        results.configured.push(config);
        results.available.push(config);
      } else {
        results.missing.push(config);
      }
    }
  }

  return results;
}

// =============================================================================
// Drive Configuration Management
// =============================================================================

/**
 * Add a detected drive to the configuration.
 *
 * @param {Object} detectedDrive - Drive from detectDrive()
 * @param {Object} options - Additional options
 * @param {string} [options.jdRootPath] - Path to JD folder within drive
 * @param {boolean} [options.isDefault] - Set as default drive
 * @returns {string} The created drive ID
 */
export function configureDetectedDrive(detectedDrive, options = {}) {
  const { jdRootPath, isDefault = false } = options;

  return createCloudDrive({
    id: detectedDrive.id,
    name: detectedDrive.name,
    base_path: detectedDrive.detectedPath,
    jd_root_path: jdRootPath || null,
    drive_type: detectedDrive.drive_type,
    is_default: isDefault,
  });
}

/**
 * Add a custom cloud drive location.
 *
 * @param {Object} drive - Drive configuration
 * @param {string} drive.id - Unique ID for the drive
 * @param {string} drive.name - Display name
 * @param {string} drive.path - Path to the drive
 * @param {string} [drive.jdRootPath] - Path to JD folder
 * @param {boolean} [drive.isDefault] - Set as default
 * @returns {string} The created drive ID
 */
export async function addCustomDrive(drive) {
  // Validate the path exists
  const exists = await directoryExists(drive.path);
  if (!exists) {
    throw new CloudDriveError(`Directory does not exist: ${drive.path}`, drive.name, 'connect');
  }

  // Validate path is safe
  validateFilePath(drive.path, { allowHome: true });
  const expandedBasePath = expandPath(drive.path);

  // Security: Validate jdRootPath if provided
  let validatedJdRootPath = null;
  if (drive.jdRootPath) {
    // Sanitize and validate the jdRootPath
    validateFilePath(drive.jdRootPath, { allowHome: true, allowRelative: true });

    // Build full path and ensure it's within the base path
    const fullJdPath = drive.jdRootPath.startsWith('/')
      ? drive.jdRootPath
      : `${expandedBasePath}/${drive.jdRootPath}`;

    if (!isPathWithinBase(fullJdPath, expandedBasePath)) {
      throw new CloudDriveError(
        'JD root path must be within the drive base path',
        drive.name,
        'connect'
      );
    }
    validatedJdRootPath = drive.jdRootPath;
  }

  return createCloudDrive({
    id: drive.id,
    name: drive.name,
    base_path: expandedBasePath,
    jd_root_path: validatedJdRootPath,
    drive_type: 'generic',
    is_default: drive.isDefault || false,
  });
}

/**
 * Update a drive's JD root path.
 *
 * @param {string} driveId - The drive ID
 * @param {string} jdRootPath - New JD root path
 */
export async function setDriveJDRoot(driveId, jdRootPath) {
  const drive = getCloudDrive(driveId);
  if (!drive) {
    throw new CloudDriveError(`Drive not found: ${driveId}`, driveId, 'connect');
  }

  // Security: Validate jdRootPath before use
  validateFilePath(jdRootPath, { allowHome: true, allowRelative: true });

  // Build full path and verify it exists
  const fullPath = jdRootPath.startsWith('/') ? jdRootPath : `${drive.base_path}/${jdRootPath}`;

  // Security: Ensure the full path is within the drive's base path
  if (!isPathWithinBase(fullPath, drive.base_path)) {
    throw new CloudDriveError(
      'JD root path must be within the drive base path',
      drive.name,
      'connect'
    );
  }

  const exists = await directoryExists(fullPath);
  if (!exists) {
    throw new CloudDriveError(`JD root folder does not exist: ${fullPath}`, drive.name, 'connect');
  }

  updateCloudDrive(driveId, { jd_root_path: jdRootPath });
}

/**
 * Get the full path to a JD folder on a drive.
 *
 * @param {string} driveId - The drive ID
 * @param {string} [folderPath] - Optional subfolder path
 * @returns {string|null} Full path or null if drive not found
 */
export function getDrivePath(driveId, folderPath = '') {
  const drive = getCloudDrive(driveId);
  if (!drive) return null;

  const basePath = drive.jd_root_path
    ? `${drive.base_path}/${drive.jd_root_path}`
    : drive.base_path;

  return folderPath ? `${basePath}/${folderPath}` : basePath;
}

// =============================================================================
// Exports for Database Operations (re-exported for convenience)
// =============================================================================

export {
  getCloudDrives,
  getCloudDrive,
  getDefaultCloudDrive,
  setDefaultCloudDrive,
  updateCloudDrive,
  deleteCloudDrive,
};
