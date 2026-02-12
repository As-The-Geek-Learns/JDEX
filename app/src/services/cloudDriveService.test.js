/**
 * Cloud Drive Service Tests
 * =========================
 * Tests for cloud drive detection, configuration, and path management.
 *
 * Test categories:
 * 1. Platform detection (getPlatform, getHomeDirectory)
 * 2. Path expansion (expandPath)
 * 3. Known drives configuration (KNOWN_DRIVES)
 * 4. Directory operations (directoryExists, findMatchingDirectories) - with mocks
 * 5. Drive detection (detectDrive, detectAllDrives, detectAndCompare) - with mocks
 * 6. Drive configuration (configureDetectedDrive, addCustomDrive, setDriveJDRoot) - with mocks
 * 7. Path building (getDrivePath) - with mocks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  getPlatform,
  getHomeDirectory,
  expandPath,
  KNOWN_DRIVES,
  directoryExists,
  findMatchingDirectories,
  detectDrive,
  detectAllDrives,
  detectAndCompare,
  configureDetectedDrive,
  addCustomDrive,
  setDriveJDRoot,
  getDrivePath,
} from './cloudDriveService.js';

// Mock the db.js imports
vi.mock('../db.js', () => ({
  getCloudDrives: vi.fn(() => []),
  getCloudDrive: vi.fn(),
  createCloudDrive: vi.fn((drive) => drive.id),
  updateCloudDrive: vi.fn(),
  deleteCloudDrive: vi.fn(),
  getDefaultCloudDrive: vi.fn(),
  setDefaultCloudDrive: vi.fn(),
}));

// Mock the validation utils
vi.mock('../utils/validation.js', () => ({
  validateFilePath: vi.fn((path) => {
    if (!path || typeof path !== 'string') {
      throw new Error('Invalid file path');
    }
    if (path.includes('..')) {
      throw new Error('Path traversal not allowed');
    }
    return path;
  }),
  isPathWithinBase: vi.fn((fullPath, basePath) => {
    // Simple mock: check if fullPath starts with basePath
    return fullPath.startsWith(basePath);
  }),
}));

import { getCloudDrives, getCloudDrive, createCloudDrive, updateCloudDrive } from '../db.js';

import { validateFilePath, isPathWithinBase } from '../utils/validation.js';

// =============================================================================
// Test Suite
// =============================================================================

describe('cloudDriveService', () => {
  // Store original values
  const originalProcess = globalThis.process;
  const originalNavigator = globalThis.navigator;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original values
    globalThis.process = originalProcess;
    globalThis.navigator = originalNavigator;
    globalThis.window = originalWindow;
  });

  // ===========================================================================
  // getPlatform Tests
  // ===========================================================================

  describe('getPlatform', () => {
    it('should return "macos" for darwin platform', () => {
      globalThis.process = { platform: 'darwin' };
      expect(getPlatform()).toBe('macos');
    });

    it('should return "windows" for win32 platform', () => {
      globalThis.process = { platform: 'win32' };
      expect(getPlatform()).toBe('windows');
    });

    it('should return "linux" for linux platform', () => {
      globalThis.process = { platform: 'linux' };
      expect(getPlatform()).toBe('linux');
    });

    it('should return "unknown" for unrecognized platform', () => {
      globalThis.process = { platform: 'freebsd' };
      expect(getPlatform()).toBe('unknown');
    });

    it('should fallback to navigator when process is undefined', () => {
      globalThis.process = undefined;
      globalThis.navigator = { platform: 'MacIntel' };
      expect(getPlatform()).toBe('macos');
    });

    it('should detect Windows from navigator', () => {
      globalThis.process = undefined;
      globalThis.navigator = { platform: 'Win32' };
      expect(getPlatform()).toBe('windows');
    });

    it('should detect Linux from navigator', () => {
      globalThis.process = undefined;
      globalThis.navigator = { platform: 'Linux x86_64' };
      expect(getPlatform()).toBe('linux');
    });

    it('should return "unknown" when neither process nor navigator available', () => {
      globalThis.process = undefined;
      globalThis.navigator = undefined;
      expect(getPlatform()).toBe('unknown');
    });
  });

  // ===========================================================================
  // getHomeDirectory Tests
  // ===========================================================================

  describe('getHomeDirectory', () => {
    it('should return HOME env variable on Unix', () => {
      globalThis.process = { env: { HOME: '/Users/testuser' } };
      expect(getHomeDirectory()).toBe('/Users/testuser');
    });

    it('should return USERPROFILE env variable on Windows', () => {
      globalThis.process = { env: { USERPROFILE: 'C:\\Users\\testuser' } };
      expect(getHomeDirectory()).toBe('C:\\Users\\testuser');
    });

    it('should prefer HOME over USERPROFILE', () => {
      globalThis.process = {
        env: {
          HOME: '/Users/testuser',
          USERPROFILE: 'C:\\Users\\testuser',
        },
      };
      expect(getHomeDirectory()).toBe('/Users/testuser');
    });

    it('should return empty string when no process available', () => {
      globalThis.process = undefined;
      expect(getHomeDirectory()).toBe('');
    });

    it('should return empty string when no home vars set', () => {
      globalThis.process = { env: {} };
      expect(getHomeDirectory()).toBe('');
    });
  });

  // ===========================================================================
  // expandPath Tests
  // ===========================================================================

  describe('expandPath', () => {
    beforeEach(() => {
      globalThis.process = { env: { HOME: '/Users/testuser' } };
    });

    it('should expand ~ to home directory', () => {
      expect(expandPath('~/Documents')).toBe('/Users/testuser/Documents');
    });

    it('should expand %USERPROFILE% to home directory', () => {
      expect(expandPath('%USERPROFILE%/Documents')).toBe('/Users/testuser/Documents');
    });

    it('should expand %HOME% to home directory', () => {
      expect(expandPath('%HOME%/Documents')).toBe('/Users/testuser/Documents');
    });

    it('should handle case-insensitive Windows variables', () => {
      expect(expandPath('%userprofile%/Documents')).toBe('/Users/testuser/Documents');
    });

    it('should return empty string for empty input', () => {
      expect(expandPath('')).toBe('');
    });

    it('should return empty string for null input', () => {
      expect(expandPath(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(expandPath(undefined)).toBe('');
    });

    it('should not modify paths without variables', () => {
      expect(expandPath('/absolute/path')).toBe('/absolute/path');
    });

    it('should handle paths with multiple tildes (only first)', () => {
      // Only the leading ~ should be expanded
      expect(expandPath('~/path/to~/file')).toBe('/Users/testuser/path/to~/file');
    });
  });

  // ===========================================================================
  // KNOWN_DRIVES Configuration Tests
  // ===========================================================================

  describe('KNOWN_DRIVES', () => {
    it('should contain iCloud configuration', () => {
      expect(KNOWN_DRIVES.icloud).toBeDefined();
      expect(KNOWN_DRIVES.icloud.name).toBe('iCloud Drive');
      expect(KNOWN_DRIVES.icloud.drive_type).toBe('icloud');
      expect(KNOWN_DRIVES.icloud.paths.macos).toBeDefined();
    });

    it('should contain Dropbox configuration', () => {
      expect(KNOWN_DRIVES.dropbox).toBeDefined();
      expect(KNOWN_DRIVES.dropbox.name).toBe('Dropbox');
      expect(KNOWN_DRIVES.dropbox.drive_type).toBe('dropbox');
      expect(KNOWN_DRIVES.dropbox.paths.macos).toBeDefined();
      expect(KNOWN_DRIVES.dropbox.paths.windows).toBeDefined();
      expect(KNOWN_DRIVES.dropbox.paths.linux).toBeDefined();
    });

    it('should contain OneDrive configuration', () => {
      expect(KNOWN_DRIVES.onedrive).toBeDefined();
      expect(KNOWN_DRIVES.onedrive.name).toBe('OneDrive');
      expect(KNOWN_DRIVES.onedrive.drive_type).toBe('onedrive');
    });

    it('should contain OneDrive Business configuration', () => {
      expect(KNOWN_DRIVES['onedrive-business']).toBeDefined();
      expect(KNOWN_DRIVES['onedrive-business'].isWildcard).toBe(true);
    });

    it('should contain Google Drive configuration', () => {
      expect(KNOWN_DRIVES.googledrive).toBeDefined();
      expect(KNOWN_DRIVES.googledrive.name).toBe('Google Drive');
      expect(KNOWN_DRIVES.googledrive.alternatePaths).toBeDefined();
    });

    it('should contain Proton Drive configuration', () => {
      expect(KNOWN_DRIVES.proton).toBeDefined();
      expect(KNOWN_DRIVES.proton.name).toBe('Proton Drive');
      expect(KNOWN_DRIVES.proton.supportsEncryption).toBe(true);
    });

    it('should have 6 known drive types', () => {
      expect(Object.keys(KNOWN_DRIVES)).toHaveLength(6);
    });
  });

  // ===========================================================================
  // directoryExists Tests (mocked)
  // ===========================================================================

  describe('directoryExists', () => {
    it('should return false when fs module not available', async () => {
      globalThis.window = { require: null };
      globalThis.process = { env: { HOME: '/Users/testuser' } };

      const result = await directoryExists('~/Documents');
      expect(result).toBe(false);
    });

    it('should return true when directory exists', async () => {
      const mockStat = vi.fn().mockResolvedValue({ isDirectory: () => true });
      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };
      globalThis.process = { env: { HOME: '/Users/testuser' } };

      const result = await directoryExists('~/Documents');
      expect(result).toBe(true);
      expect(mockStat).toHaveBeenCalledWith('/Users/testuser/Documents');
    });

    it('should return false when path is not a directory', async () => {
      const mockStat = vi.fn().mockResolvedValue({ isDirectory: () => false });
      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };
      globalThis.process = { env: { HOME: '/Users/testuser' } };

      const result = await directoryExists('~/file.txt');
      expect(result).toBe(false);
    });

    it('should return false when path does not exist (ENOENT)', async () => {
      const error = new Error('Not found');
      error.code = 'ENOENT';
      const mockStat = vi.fn().mockRejectedValue(error);
      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };
      globalThis.process = { env: { HOME: '/Users/testuser' } };

      const result = await directoryExists('~/nonexistent');
      expect(result).toBe(false);
    });

    it('should return false on permission error', async () => {
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      const mockStat = vi.fn().mockRejectedValue(error);
      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };
      globalThis.process = { env: { HOME: '/Users/testuser' } };

      const result = await directoryExists('~/protected');
      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // findMatchingDirectories Tests (mocked)
  // ===========================================================================

  describe('findMatchingDirectories', () => {
    it('should return empty array when fs module not available', async () => {
      globalThis.window = { require: null };
      globalThis.process = { env: { HOME: '/Users/testuser' } };

      const result = await findMatchingDirectories('~/OneDrive - *');
      expect(result).toEqual([]);
    });

    it('should return matching directories', async () => {
      const mockReaddir = vi.fn().mockResolvedValue([
        { name: 'OneDrive - Company A', isDirectory: () => true },
        { name: 'OneDrive - Company B', isDirectory: () => true },
        { name: 'Documents', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false },
      ]);
      const mockPath = {
        dirname: vi.fn((p) => p.substring(0, p.lastIndexOf('/'))),
        basename: vi.fn((p) => p.substring(p.lastIndexOf('/') + 1)),
        join: vi.fn((dir, name) => `${dir}/${name}`),
      };

      globalThis.window = {
        require: vi.fn((module) => {
          if (module === 'fs') return { promises: { readdir: mockReaddir } };
          if (module === 'path') return mockPath;
          return null;
        }),
      };
      globalThis.process = { env: { HOME: '/Users/testuser' } };

      const result = await findMatchingDirectories('/Users/testuser/OneDrive - *');
      expect(result).toHaveLength(2);
      expect(result).toContain('/Users/testuser/OneDrive - Company A');
      expect(result).toContain('/Users/testuser/OneDrive - Company B');
    });

    it('should return empty array on read error', async () => {
      const mockReaddir = vi.fn().mockRejectedValue(new Error('Permission denied'));
      const mockPath = {
        dirname: vi.fn((p) => p.substring(0, p.lastIndexOf('/'))),
        basename: vi.fn((p) => p.substring(p.lastIndexOf('/') + 1)),
      };

      globalThis.window = {
        require: vi.fn((module) => {
          if (module === 'fs') return { promises: { readdir: mockReaddir } };
          if (module === 'path') return mockPath;
          return null;
        }),
      };
      globalThis.process = { env: { HOME: '/Users/testuser' } };

      const result = await findMatchingDirectories('/Users/testuser/OneDrive - *');
      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // detectDrive Tests (mocked)
  // ===========================================================================

  describe('detectDrive', () => {
    beforeEach(() => {
      globalThis.process = { platform: 'darwin', env: { HOME: '/Users/testuser' } };
    });

    it('should return null for unknown drive key', async () => {
      const result = await detectDrive('unknowndrive');
      expect(result).toBeNull();
    });

    it('should detect non-wildcard drive when directory exists', async () => {
      const mockStat = vi.fn().mockResolvedValue({ isDirectory: () => true });
      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };

      const result = await detectDrive('dropbox');
      expect(result).not.toBeNull();
      expect(result.id).toBe('dropbox');
      expect(result.name).toBe('Dropbox');
      expect(result.detectedPath).toBe('/Users/testuser/Dropbox');
    });

    it('should return null when drive directory does not exist', async () => {
      const error = new Error('Not found');
      error.code = 'ENOENT';
      const mockStat = vi.fn().mockRejectedValue(error);
      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };

      const result = await detectDrive('dropbox');
      expect(result).toBeNull();
    });

    it('should detect wildcard drive with matching directories', async () => {
      const mockReaddir = vi
        .fn()
        .mockResolvedValue([{ name: 'OneDrive - Contoso', isDirectory: () => true }]);
      const mockPath = {
        dirname: vi.fn(() => '/Users/testuser'),
        basename: vi.fn(() => 'OneDrive - *'),
        join: vi.fn((dir, name) => `${dir}/${name}`),
      };

      globalThis.window = {
        require: vi.fn((module) => {
          if (module === 'fs') return { promises: { readdir: mockReaddir } };
          if (module === 'path') return mockPath;
          return null;
        }),
      };

      const result = await detectDrive('onedrive-business');
      expect(result).not.toBeNull();
      expect(result.id).toBe('onedrive-business');
      expect(result.detectedPath).toBe('/Users/testuser/OneDrive - Contoso');
      expect(result.allMatches).toHaveLength(1);
    });
  });

  // ===========================================================================
  // detectAllDrives Tests (mocked)
  // ===========================================================================

  describe('detectAllDrives', () => {
    it('should return empty array when no drives detected', async () => {
      const error = new Error('Not found');
      error.code = 'ENOENT';
      const mockStat = vi.fn().mockRejectedValue(error);
      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };
      globalThis.process = { platform: 'darwin', env: { HOME: '/Users/testuser' } };

      const result = await detectAllDrives();
      expect(result).toEqual([]);
    });

    it('should return detected drives', async () => {
      // Mock to detect only Dropbox
      const mockStat = vi.fn().mockImplementation((path) => {
        if (path === '/Users/testuser/Dropbox') {
          return Promise.resolve({ isDirectory: () => true });
        }
        const error = new Error('Not found');
        error.code = 'ENOENT';
        return Promise.reject(error);
      });

      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };
      globalThis.process = { platform: 'darwin', env: { HOME: '/Users/testuser' } };

      const result = await detectAllDrives();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('dropbox');
    });
  });

  // ===========================================================================
  // detectAndCompare Tests (mocked)
  // ===========================================================================

  describe('detectAndCompare', () => {
    beforeEach(() => {
      globalThis.process = { platform: 'darwin', env: { HOME: '/Users/testuser' } };
    });

    it('should categorize detected but not configured drives', async () => {
      // Mock Dropbox exists
      const mockStat = vi.fn().mockImplementation((path) => {
        if (path === '/Users/testuser/Dropbox') {
          return Promise.resolve({ isDirectory: () => true });
        }
        const error = new Error('Not found');
        error.code = 'ENOENT';
        return Promise.reject(error);
      });

      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };

      getCloudDrives.mockReturnValue([]);

      const result = await detectAndCompare();
      expect(result.detected).toHaveLength(1);
      expect(result.detected[0].id).toBe('dropbox');
      expect(result.configured).toHaveLength(0);
      expect(result.missing).toHaveLength(0);
      expect(result.available).toHaveLength(1);
    });

    it('should categorize configured and present drives', async () => {
      const mockStat = vi.fn().mockImplementation((path) => {
        if (path === '/Users/testuser/Dropbox') {
          return Promise.resolve({ isDirectory: () => true });
        }
        const error = new Error('Not found');
        error.code = 'ENOENT';
        return Promise.reject(error);
      });

      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };

      getCloudDrives.mockReturnValue([{ id: 'dropbox', base_path: '/Users/testuser/Dropbox' }]);

      const result = await detectAndCompare();
      expect(result.configured).toHaveLength(1);
      expect(result.detected).toHaveLength(0);
      expect(result.available).toHaveLength(1);
    });

    it('should categorize configured but missing drives', async () => {
      const error = new Error('Not found');
      error.code = 'ENOENT';
      const mockStat = vi.fn().mockRejectedValue(error);

      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };

      getCloudDrives.mockReturnValue([
        { id: 'customdrive', base_path: '/Users/testuser/CustomCloud' },
      ]);

      const result = await detectAndCompare();
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].id).toBe('customdrive');
    });
  });

  // ===========================================================================
  // configureDetectedDrive Tests
  // ===========================================================================

  describe('configureDetectedDrive', () => {
    it('should create cloud drive from detected drive', () => {
      const detectedDrive = {
        id: 'dropbox',
        name: 'Dropbox',
        detectedPath: '/Users/testuser/Dropbox',
        drive_type: 'dropbox',
      };

      configureDetectedDrive(detectedDrive);

      expect(createCloudDrive).toHaveBeenCalledWith({
        id: 'dropbox',
        name: 'Dropbox',
        base_path: '/Users/testuser/Dropbox',
        jd_root_path: null,
        drive_type: 'dropbox',
        is_default: false,
      });
    });

    it('should set JD root path when provided', () => {
      const detectedDrive = {
        id: 'dropbox',
        name: 'Dropbox',
        detectedPath: '/Users/testuser/Dropbox',
        drive_type: 'dropbox',
      };

      configureDetectedDrive(detectedDrive, { jdRootPath: 'JohnnyDecimal' });

      expect(createCloudDrive).toHaveBeenCalledWith(
        expect.objectContaining({
          jd_root_path: 'JohnnyDecimal',
        })
      );
    });

    it('should set as default when specified', () => {
      const detectedDrive = {
        id: 'dropbox',
        name: 'Dropbox',
        detectedPath: '/Users/testuser/Dropbox',
        drive_type: 'dropbox',
      };

      configureDetectedDrive(detectedDrive, { isDefault: true });

      expect(createCloudDrive).toHaveBeenCalledWith(
        expect.objectContaining({
          is_default: true,
        })
      );
    });
  });

  // ===========================================================================
  // addCustomDrive Tests
  // ===========================================================================

  describe('addCustomDrive', () => {
    beforeEach(() => {
      globalThis.process = { env: { HOME: '/Users/testuser' } };
    });

    it('should throw error when directory does not exist', async () => {
      const error = new Error('Not found');
      error.code = 'ENOENT';
      const mockStat = vi.fn().mockRejectedValue(error);
      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };

      await expect(
        addCustomDrive({
          id: 'custom',
          name: 'Custom Drive',
          path: '/nonexistent/path',
        })
      ).rejects.toThrow('Directory does not exist');
    });

    it('should create custom drive when directory exists', async () => {
      const mockStat = vi.fn().mockResolvedValue({ isDirectory: () => true });
      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };

      await addCustomDrive({
        id: 'custom',
        name: 'Custom Drive',
        path: '/Users/testuser/CustomCloud',
      });

      expect(createCloudDrive).toHaveBeenCalledWith({
        id: 'custom',
        name: 'Custom Drive',
        base_path: '/Users/testuser/CustomCloud',
        jd_root_path: null,
        drive_type: 'generic',
        is_default: false,
      });
    });

    it('should validate jdRootPath is within base path', async () => {
      const mockStat = vi.fn().mockResolvedValue({ isDirectory: () => true });
      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };

      // Mock isPathWithinBase to return false for path traversal
      isPathWithinBase.mockReturnValue(false);

      await expect(
        addCustomDrive({
          id: 'custom',
          name: 'Custom Drive',
          path: '/Users/testuser/CustomCloud',
          jdRootPath: '/etc/passwd',
        })
      ).rejects.toThrow('JD root path must be within the drive base path');
    });

    it('should accept valid jdRootPath', async () => {
      const mockStat = vi.fn().mockResolvedValue({ isDirectory: () => true });
      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };

      isPathWithinBase.mockReturnValue(true);

      await addCustomDrive({
        id: 'custom',
        name: 'Custom Drive',
        path: '/Users/testuser/CustomCloud',
        jdRootPath: 'JD-Files',
      });

      expect(createCloudDrive).toHaveBeenCalledWith(
        expect.objectContaining({
          jd_root_path: 'JD-Files',
        })
      );
    });
  });

  // ===========================================================================
  // setDriveJDRoot Tests
  // ===========================================================================

  describe('setDriveJDRoot', () => {
    beforeEach(() => {
      globalThis.process = { env: { HOME: '/Users/testuser' } };
    });

    it('should throw error when drive not found', async () => {
      getCloudDrive.mockReturnValue(null);

      await expect(setDriveJDRoot('nonexistent', 'JD')).rejects.toThrow('Drive not found');
    });

    it('should throw error when JD root path is outside base path', async () => {
      getCloudDrive.mockReturnValue({
        id: 'dropbox',
        name: 'Dropbox',
        base_path: '/Users/testuser/Dropbox',
      });
      isPathWithinBase.mockReturnValue(false);

      await expect(setDriveJDRoot('dropbox', '/etc/passwd')).rejects.toThrow(
        'JD root path must be within the drive base path'
      );
    });

    it('should throw error when JD root folder does not exist', async () => {
      getCloudDrive.mockReturnValue({
        id: 'dropbox',
        name: 'Dropbox',
        base_path: '/Users/testuser/Dropbox',
      });
      isPathWithinBase.mockReturnValue(true);

      const error = new Error('Not found');
      error.code = 'ENOENT';
      const mockStat = vi.fn().mockRejectedValue(error);
      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };

      await expect(setDriveJDRoot('dropbox', 'NonexistentFolder')).rejects.toThrow(
        'JD root folder does not exist'
      );
    });

    it('should update drive JD root when valid', async () => {
      getCloudDrive.mockReturnValue({
        id: 'dropbox',
        name: 'Dropbox',
        base_path: '/Users/testuser/Dropbox',
      });
      isPathWithinBase.mockReturnValue(true);

      const mockStat = vi.fn().mockResolvedValue({ isDirectory: () => true });
      globalThis.window = {
        require: vi.fn(() => ({ promises: { stat: mockStat } })),
      };

      await setDriveJDRoot('dropbox', 'JohnnyDecimal');

      expect(updateCloudDrive).toHaveBeenCalledWith('dropbox', { jd_root_path: 'JohnnyDecimal' });
    });
  });

  // ===========================================================================
  // getDrivePath Tests
  // ===========================================================================

  describe('getDrivePath', () => {
    it('should return null when drive not found', () => {
      getCloudDrive.mockReturnValue(null);

      const result = getDrivePath('nonexistent');
      expect(result).toBeNull();
    });

    it('should return base path when no JD root configured', () => {
      getCloudDrive.mockReturnValue({
        id: 'dropbox',
        base_path: '/Users/testuser/Dropbox',
        jd_root_path: null,
      });

      const result = getDrivePath('dropbox');
      expect(result).toBe('/Users/testuser/Dropbox');
    });

    it('should return JD root path when configured', () => {
      getCloudDrive.mockReturnValue({
        id: 'dropbox',
        base_path: '/Users/testuser/Dropbox',
        jd_root_path: 'JohnnyDecimal',
      });

      const result = getDrivePath('dropbox');
      expect(result).toBe('/Users/testuser/Dropbox/JohnnyDecimal');
    });

    it('should append folder path when provided', () => {
      getCloudDrive.mockReturnValue({
        id: 'dropbox',
        base_path: '/Users/testuser/Dropbox',
        jd_root_path: 'JD',
      });

      const result = getDrivePath('dropbox', '10-19 Personal/11 Finance');
      expect(result).toBe('/Users/testuser/Dropbox/JD/10-19 Personal/11 Finance');
    });

    it('should handle empty folder path', () => {
      getCloudDrive.mockReturnValue({
        id: 'dropbox',
        base_path: '/Users/testuser/Dropbox',
        jd_root_path: 'JD',
      });

      const result = getDrivePath('dropbox', '');
      expect(result).toBe('/Users/testuser/Dropbox/JD');
    });
  });
});
