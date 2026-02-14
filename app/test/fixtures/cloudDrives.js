/**
 * Cloud Drive Fixtures
 *
 * Test data for cloud drive configurations.
 * Used for testing cloud drive detection, routing, and storage.
 */

// =============================================================================
// Individual Cloud Drive Configurations
// =============================================================================

export const iCloudDrive = {
  id: 'icloud-1',
  name: 'iCloud Drive',
  drive_type: 'icloud',
  base_path: '/Users/testuser/Library/Mobile Documents/com~apple~CloudDocs',
  jd_root_path: 'JDex',
  is_default: true,
  is_active: true,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

export const dropboxDrive = {
  id: 'dropbox-1',
  name: 'Dropbox',
  drive_type: 'dropbox',
  base_path: '/Users/testuser/Dropbox',
  jd_root_path: 'JohnnyDecimal',
  is_default: false,
  is_active: true,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

export const oneDriveDrive = {
  id: 'onedrive-1',
  name: 'OneDrive',
  drive_type: 'onedrive',
  base_path: '/Users/testuser/OneDrive',
  jd_root_path: 'JD',
  is_default: false,
  is_active: true,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

export const googleDriveDrive = {
  id: 'gdrive-1',
  name: 'Google Drive',
  drive_type: 'google',
  base_path: '/Users/testuser/Library/CloudStorage/GoogleDrive-user@gmail.com',
  jd_root_path: 'MyJD',
  is_default: false,
  is_active: true,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

export const protonDrive = {
  id: 'proton-1',
  name: 'Proton Drive',
  drive_type: 'proton',
  base_path: '/Users/testuser/Proton Drive',
  jd_root_path: 'JDex',
  is_default: false,
  is_active: true,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

export const localDrive = {
  id: 'local-1',
  name: 'Local Storage',
  drive_type: 'local',
  base_path: '/Users/testuser/Documents',
  jd_root_path: 'JohnnyDecimal',
  is_default: false,
  is_active: true,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

// =============================================================================
// Inactive/Configured But Not Available Drives
// =============================================================================

export const inactiveDrive = {
  id: 'inactive-1',
  name: 'Old Dropbox',
  drive_type: 'dropbox',
  base_path: '/Users/testuser/Dropbox-old',
  jd_root_path: 'JD',
  is_default: false,
  is_active: false,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-06-01T00:00:00.000Z',
};

// =============================================================================
// Drive Collections
// =============================================================================

/**
 * Single iCloud drive (most common scenario)
 */
export const singleDrive = [iCloudDrive];

/**
 * iCloud + Dropbox (common dual-cloud setup)
 */
export const dualDrives = [iCloudDrive, dropboxDrive];

/**
 * All major cloud providers
 */
export const allCloudDrives = [
  iCloudDrive,
  dropboxDrive,
  oneDriveDrive,
  googleDriveDrive,
  protonDrive,
];

/**
 * Drives including local storage
 */
export const drivesWithLocal = [...allCloudDrives, localDrive];

/**
 * Drives including inactive
 */
export const drivesWithInactive = [...allCloudDrives, inactiveDrive];

/**
 * Empty drives (for testing no-drives-configured state)
 */
export const noDrives = [];

// =============================================================================
// Platform-Specific Drive Paths
// =============================================================================

export const macOSDrivePaths = {
  icloud: '/Users/testuser/Library/Mobile Documents/com~apple~CloudDocs',
  dropbox: '/Users/testuser/Dropbox',
  onedrive: '/Users/testuser/OneDrive',
  onedriveBusiness: '/Users/testuser/OneDrive - Company Name',
  googleDrive: '/Users/testuser/Library/CloudStorage/GoogleDrive-user@gmail.com',
  proton: '/Users/testuser/Proton Drive',
};

export const windowsDrivePaths = {
  icloud: 'C:\\Users\\testuser\\iCloudDrive',
  dropbox: 'C:\\Users\\testuser\\Dropbox',
  onedrive: 'C:\\Users\\testuser\\OneDrive',
  onedriveBusiness: 'C:\\Users\\testuser\\OneDrive - Company Name',
  googleDrive: 'G:\\My Drive',
  proton: 'C:\\Users\\testuser\\Proton Drive',
};

export const linuxDrivePaths = {
  dropbox: '/home/testuser/Dropbox',
  onedrive: '/home/testuser/OneDrive',
  googleDrive: '/home/testuser/google-drive',
  proton: '/home/testuser/Proton Drive',
};

// =============================================================================
// Area-to-Drive Storage Mapping
// =============================================================================

/**
 * Map specific JD areas to specific drives
 * (e.g., work files to OneDrive, personal to iCloud)
 */
export const areaStorageMapping = [
  {
    id: 1,
    area_id: 1, // Finance
    cloud_drive_id: 'icloud-1',
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    area_id: 2, // Work
    cloud_drive_id: 'onedrive-1',
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    area_id: 3, // Personal
    cloud_drive_id: 'icloud-1',
    created_at: '2025-01-01T00:00:00.000Z',
  },
];

// =============================================================================
// Drive Detection Test Scenarios
// =============================================================================

/**
 * Simulated detected drives (as returned by detectAllDrives)
 */
export const detectedDrives = {
  icloud: {
    detected: true,
    path: macOSDrivePaths.icloud,
    type: 'icloud',
    displayName: 'iCloud Drive',
  },
  dropbox: {
    detected: true,
    path: macOSDrivePaths.dropbox,
    type: 'dropbox',
    displayName: 'Dropbox',
  },
  onedrive: {
    detected: false,
    path: null,
    type: 'onedrive',
    displayName: 'OneDrive',
  },
  google: {
    detected: true,
    path: macOSDrivePaths.googleDrive,
    type: 'google',
    displayName: 'Google Drive',
  },
  proton: {
    detected: false,
    path: null,
    type: 'proton',
    displayName: 'Proton Drive',
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a custom cloud drive configuration
 * @param {Object} options
 * @returns {Object} Drive configuration
 */
export function createCloudDrive({
  id = `drive-${Date.now()}`,
  name,
  driveType,
  basePath,
  jdRootPath = 'JDex',
  isDefault = false,
  isActive = true,
}) {
  return {
    id,
    name: name || `${driveType} Drive`,
    drive_type: driveType,
    base_path: basePath,
    jd_root_path: jdRootPath,
    is_default: isDefault,
    is_active: isActive,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Get full JD path for a folder on a specific drive
 * @param {Object} drive - Cloud drive config
 * @param {string} folderPath - Relative JD folder path
 * @returns {string} Full path
 */
export function getFullDrivePath(drive, folderPath) {
  return `${drive.base_path}/${drive.jd_root_path}/${folderPath}`;
}

/**
 * Find default drive from a list
 * @param {Array} drives
 * @returns {Object|undefined} Default drive
 */
export function findDefaultDrive(drives) {
  return drives.find((d) => d.is_default && d.is_active);
}

/**
 * Find drive by type
 * @param {Array} drives
 * @param {string} driveType
 * @returns {Object|undefined} Matching drive
 */
export function findDriveByType(drives, driveType) {
  return drives.find((d) => d.drive_type === driveType && d.is_active);
}

/**
 * Get active drives only
 * @param {Array} drives
 * @returns {Array} Active drives
 */
export function getActiveDrives(drives) {
  return drives.filter((d) => d.is_active);
}
