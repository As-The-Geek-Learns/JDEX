/**
 * File Operations Service Tests
 * =============================
 * Tests for file system operations used in organizing files.
 *
 * Test categories:
 * 1. Constants (CONFLICT_STRATEGY, OP_STATUS)
 * 2. File system helpers (hasFileSystemAccess, fileExists, directoryExists)
 * 3. Directory operations (ensureDirectory)
 * 4. Filename generation (generateUniqueFilename)
 * 5. Path building (buildDestinationPath)
 * 6. File move operations (moveFile, rollbackMove)
 * 7. Batch operations (batchMove, batchRollback)
 * 8. Preview operations (previewOperations)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  CONFLICT_STRATEGY,
  OP_STATUS,
  hasFileSystemAccess,
  fileExists,
  directoryExists,
  ensureDirectory,
  generateUniqueFilename,
  buildDestinationPath,
  moveFile,
  rollbackMove,
  batchMove,
  batchRollback,
  previewOperations,
} from './fileOperations.js';

// Mock the db.js imports
vi.mock('../db.js', () => ({
  recordOrganizedFile: vi.fn(() => ({ id: 1 })),
  updateOrganizedFile: vi.fn(),
  getOrganizedFile: vi.fn(),
  getFolderByNumber: vi.fn(),
  getDefaultCloudDrive: vi.fn(),
  getCloudDrive: vi.fn(),
}));

// Mock the validation utils
vi.mock('../utils/validation.js', () => ({
  validateFilePath: vi.fn((path) => {
    if (!path || typeof path !== 'string') {
      throw new Error('Invalid file path');
    }
    if (path.includes('..') && path.includes('/../')) {
      throw new Error('Path traversal not allowed');
    }
    return path;
  }),
  isPathWithinBase: vi.fn((path, base) => {
    if (!path || !base) return false;
    return path.startsWith(base);
  }),
}));

// Mock batchRenameService
vi.mock('./batchRenameService.js', () => ({
  sanitizeFilename: vi.fn((filename) => {
    // Simple sanitization - remove invalid characters
    return filename.replace(/[<>:"|?*]/g, '_');
  }),
}));

import {
  recordOrganizedFile,
  updateOrganizedFile,
  getOrganizedFile,
  getFolderByNumber,
  getDefaultCloudDrive,
  getCloudDrive,
} from '../db.js';
import { isPathWithinBase } from '../utils/validation.js';
import { sanitizeFilename } from './batchRenameService.js';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create mock fs module for testing.
 */
function createMockFs(options = {}) {
  const {
    existsSync = vi.fn(() => true),
    statSync = vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
    mkdirSync = vi.fn(),
    renameSync = vi.fn(),
    copyFileSync = vi.fn(),
    unlinkSync = vi.fn(),
    realpathSync = vi.fn((p) => p),
  } = options;

  return {
    existsSync,
    statSync,
    mkdirSync,
    renameSync,
    copyFileSync,
    unlinkSync,
    realpathSync,
  };
}

/**
 * Create mock path module for testing.
 */
function createMockPath() {
  return {
    extname: vi.fn((filename) => {
      const lastDot = filename.lastIndexOf('.');
      return lastDot >= 0 ? filename.slice(lastDot) : '';
    }),
    basename: vi.fn((filepath, ext) => {
      const name = filepath.split('/').pop() || filepath;
      if (ext && name.endsWith(ext)) {
        return name.slice(0, -ext.length);
      }
      return name;
    }),
    dirname: vi.fn((filepath) => {
      const parts = filepath.split('/');
      parts.pop();
      return parts.join('/') || '/';
    }),
    join: vi.fn((...parts) => parts.filter(Boolean).join('/')),
    resolve: vi.fn((...parts) => parts.filter(Boolean).join('/')),
  };
}

/**
 * Setup window.require mock with fs and path.
 */
function setupWindowRequire(mockFs = createMockFs(), mockPath = createMockPath()) {
  globalThis.window = {
    require: vi.fn((module) => {
      if (module === 'fs') return mockFs;
      if (module === 'path') return mockPath;
      throw new Error(`Unknown module: ${module}`);
    }),
  };
  return { mockFs, mockPath };
}

// =============================================================================
// Test Suite
// =============================================================================

describe('fileOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any existing window mock
    delete globalThis.window;
  });

  afterEach(() => {
    delete globalThis.window;
  });

  // ===========================================================================
  // Constants Tests
  // ===========================================================================

  describe('CONFLICT_STRATEGY', () => {
    it('should define RENAME strategy', () => {
      expect(CONFLICT_STRATEGY.RENAME).toBe('rename');
    });

    it('should define SKIP strategy', () => {
      expect(CONFLICT_STRATEGY.SKIP).toBe('skip');
    });

    it('should define OVERWRITE strategy', () => {
      expect(CONFLICT_STRATEGY.OVERWRITE).toBe('overwrite');
    });

    it('should have exactly 3 strategies', () => {
      expect(Object.keys(CONFLICT_STRATEGY)).toHaveLength(3);
    });
  });

  describe('OP_STATUS', () => {
    it('should define PENDING status', () => {
      expect(OP_STATUS.PENDING).toBe('pending');
    });

    it('should define IN_PROGRESS status', () => {
      expect(OP_STATUS.IN_PROGRESS).toBe('in_progress');
    });

    it('should define SUCCESS status', () => {
      expect(OP_STATUS.SUCCESS).toBe('success');
    });

    it('should define FAILED status', () => {
      expect(OP_STATUS.FAILED).toBe('failed');
    });

    it('should define SKIPPED status', () => {
      expect(OP_STATUS.SKIPPED).toBe('skipped');
    });

    it('should define ROLLED_BACK status', () => {
      expect(OP_STATUS.ROLLED_BACK).toBe('rolled_back');
    });

    it('should have exactly 6 statuses', () => {
      expect(Object.keys(OP_STATUS)).toHaveLength(6);
    });
  });

  // ===========================================================================
  // hasFileSystemAccess Tests
  // ===========================================================================

  describe('hasFileSystemAccess', () => {
    it('should return false when window is not defined', () => {
      delete globalThis.window;
      expect(hasFileSystemAccess()).toBe(false);
    });

    it('should return false when window.require is not defined', () => {
      globalThis.window = {};
      expect(hasFileSystemAccess()).toBe(false);
    });

    it('should return true when window.require returns fs module', () => {
      setupWindowRequire();
      expect(hasFileSystemAccess()).toBe(true);
    });

    it('should return false when window.require throws', () => {
      globalThis.window = {
        require: vi.fn(() => {
          throw new Error('Not in Electron');
        }),
      };
      expect(hasFileSystemAccess()).toBe(false);
    });
  });

  // ===========================================================================
  // fileExists Tests
  // ===========================================================================

  describe('fileExists', () => {
    it('should return false when file system is not available', () => {
      delete globalThis.window;
      expect(fileExists('/some/path/file.txt')).toBe(false);
    });

    it('should return true when file exists', () => {
      const mockFs = createMockFs({ existsSync: vi.fn(() => true) });
      setupWindowRequire(mockFs);

      expect(fileExists('/some/path/file.txt')).toBe(true);
      expect(mockFs.existsSync).toHaveBeenCalledWith('/some/path/file.txt');
    });

    it('should return false when file does not exist', () => {
      const mockFs = createMockFs({ existsSync: vi.fn(() => false) });
      setupWindowRequire(mockFs);

      expect(fileExists('/some/path/missing.txt')).toBe(false);
    });

    it('should return false when existsSync throws', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => {
          throw new Error('Permission denied');
        }),
      });
      setupWindowRequire(mockFs);

      expect(fileExists('/protected/file.txt')).toBe(false);
    });
  });

  // ===========================================================================
  // directoryExists Tests
  // ===========================================================================

  describe('directoryExists', () => {
    it('should return false when file system is not available', () => {
      delete globalThis.window;
      expect(directoryExists('/some/path')).toBe(false);
    });

    it('should return true when directory exists', () => {
      const mockFs = createMockFs({
        statSync: vi.fn(() => ({ isDirectory: () => true })),
      });
      setupWindowRequire(mockFs);

      expect(directoryExists('/some/path')).toBe(true);
      expect(mockFs.statSync).toHaveBeenCalledWith('/some/path');
    });

    it('should return false when path is a file not a directory', () => {
      const mockFs = createMockFs({
        statSync: vi.fn(() => ({ isDirectory: () => false })),
      });
      setupWindowRequire(mockFs);

      expect(directoryExists('/some/file.txt')).toBe(false);
    });

    it('should return false when statSync throws', () => {
      const mockFs = createMockFs({
        statSync: vi.fn(() => {
          throw new Error('ENOENT');
        }),
      });
      setupWindowRequire(mockFs);

      expect(directoryExists('/missing/path')).toBe(false);
    });
  });

  // ===========================================================================
  // ensureDirectory Tests
  // ===========================================================================

  describe('ensureDirectory', () => {
    it('should throw FileSystemError when file system is not available', () => {
      delete globalThis.window;
      expect(() => ensureDirectory('/some/path')).toThrow('File system not available');
    });

    it('should create directory when it does not exist', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => false),
        mkdirSync: vi.fn(),
      });
      setupWindowRequire(mockFs);

      const result = ensureDirectory('/new/directory');

      expect(result).toBe(true);
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/new/directory', { recursive: true });
    });

    it('should not create directory when it already exists', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        mkdirSync: vi.fn(),
      });
      setupWindowRequire(mockFs);

      const result = ensureDirectory('/existing/directory');

      expect(result).toBe(true);
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should throw FileSystemError when mkdirSync fails', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => false),
        mkdirSync: vi.fn(() => {
          throw new Error('Permission denied');
        }),
      });
      setupWindowRequire(mockFs);

      expect(() => ensureDirectory('/protected/path')).toThrow('Failed to create directory');
    });
  });

  // ===========================================================================
  // generateUniqueFilename Tests
  // ===========================================================================

  describe('generateUniqueFilename', () => {
    it('should return sanitized filename when no conflict exists', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => false),
      });
      const mockPath = createMockPath();
      setupWindowRequire(mockFs, mockPath);

      const result = generateUniqueFilename('/dest', 'report.pdf');

      expect(result).toBe('report.pdf');
    });

    it('should return original filename when file system is not available', () => {
      delete globalThis.window;
      expect(generateUniqueFilename('/dest', 'file.txt')).toBe('file.txt');
    });

    it('should add numeric suffix when file exists', () => {
      let callCount = 0;
      const mockFs = createMockFs({
        existsSync: vi.fn(() => {
          callCount++;
          // First file exists, second doesn't
          return callCount <= 1;
        }),
      });
      const mockPath = createMockPath();
      setupWindowRequire(mockFs, mockPath);

      const result = generateUniqueFilename('/dest', 'report.pdf');

      expect(result).toBe('report_1.pdf');
    });

    it('should increment suffix until unique name found', () => {
      let callCount = 0;
      const mockFs = createMockFs({
        existsSync: vi.fn(() => {
          callCount++;
          // First 3 files exist
          return callCount <= 3;
        }),
      });
      const mockPath = createMockPath();
      setupWindowRequire(mockFs, mockPath);

      const result = generateUniqueFilename('/dest', 'report.pdf');

      expect(result).toBe('report_3.pdf');
    });

    it('should sanitize filename by removing invalid characters', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => false),
      });
      setupWindowRequire(mockFs);

      // sanitizeFilename mock replaces invalid chars with underscore
      generateUniqueFilename('/dest', 'file<name>.txt');

      expect(sanitizeFilename).toHaveBeenCalledWith('file<name>.txt');
    });

    it('should throw error when too many files with similar names exist', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true), // Always exists
      });
      const mockPath = createMockPath();
      setupWindowRequire(mockFs, mockPath);

      expect(() => generateUniqueFilename('/dest', 'report.pdf')).toThrow(
        'Too many files with similar names'
      );
    });
  });

  // ===========================================================================
  // buildDestinationPath Tests
  // ===========================================================================

  describe('buildDestinationPath', () => {
    it('should throw when file system is not available', () => {
      delete globalThis.window;
      expect(() => buildDestinationPath('11.01', 'file.pdf')).toThrow('File system not available');
    });

    it('should throw when folder is not found', () => {
      setupWindowRequire();
      getFolderByNumber.mockReturnValue(null);

      expect(() => buildDestinationPath('99.99', 'file.pdf')).toThrow('Folder 99.99 not found');
    });

    it('should build correct path structure for JD folder', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => false),
      });
      setupWindowRequire(mockFs);

      getFolderByNumber.mockReturnValue({
        number: '11.01',
        name: 'Documents',
        area_name: 'System',
        category_name: 'Administration',
      });
      getDefaultCloudDrive.mockReturnValue({
        base_path: '/Users/test/JD',
        jd_root_path: '/Users/test/JD',
      });
      isPathWithinBase.mockReturnValue(true);

      const result = buildDestinationPath('11.01', 'report.pdf');

      expect(result.basePath).toBe('/Users/test/JD');
      expect(result.folder.number).toBe('11.01');
    });

    it('should use specific cloud drive when provided', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => false),
      });
      setupWindowRequire(mockFs);

      getFolderByNumber.mockReturnValue({
        number: '11.01',
        name: 'Documents',
        area_name: 'System',
        category_name: 'Administration',
      });
      getCloudDrive.mockReturnValue({
        id: 'icloud',
        base_path: '/Users/test/iCloud/JD',
        jd_root_path: '/Users/test/iCloud/JD',
      });
      isPathWithinBase.mockReturnValue(true);

      const result = buildDestinationPath('11.01', 'report.pdf', { cloudDriveId: 'icloud' });

      expect(result.basePath).toBe('/Users/test/iCloud/JD');
      expect(getCloudDrive).toHaveBeenCalledWith('icloud');
    });

    it('should sanitize folder names to prevent path traversal', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => false),
      });
      setupWindowRequire(mockFs);

      getFolderByNumber.mockReturnValue({
        number: '11.01',
        name: 'Documents/../../../etc',
        area_name: 'System',
        category_name: 'Admin/istration',
      });
      getDefaultCloudDrive.mockReturnValue({
        base_path: '/Users/test/JD',
        jd_root_path: '/Users/test/JD',
      });
      isPathWithinBase.mockReturnValue(true);

      const result = buildDestinationPath('11.01', 'report.pdf');

      // Folder names should be sanitized (.. and / replaced)
      expect(result.folder).toBeDefined();
    });

    it('should throw when destination escapes base directory', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => false),
      });
      setupWindowRequire(mockFs);

      getFolderByNumber.mockReturnValue({
        number: '11.01',
        name: 'Documents',
        area_name: 'System',
        category_name: 'Administration',
      });
      getDefaultCloudDrive.mockReturnValue({
        base_path: '/Users/test/JD',
        jd_root_path: '/Users/test/JD',
      });
      isPathWithinBase.mockReturnValue(false);

      expect(() => buildDestinationPath('11.01', 'report.pdf')).toThrow(
        'Destination path escapes base directory'
      );
    });
  });

  // ===========================================================================
  // moveFile Tests
  // ===========================================================================

  describe('moveFile', () => {
    it('should return error when file system is not available', () => {
      delete globalThis.window;

      const result = moveFile({
        sourcePath: '/source/file.pdf',
        folderNumber: '11.01',
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('File system not available');
    });

    it('should return error when source file does not exist', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => false),
      });
      setupWindowRequire(mockFs);

      const result = moveFile({
        sourcePath: '/missing/file.pdf',
        folderNumber: '11.01',
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Source file not found');
    });

    it('should skip file when conflict strategy is SKIP and file exists', () => {
      let _existsCallCount = 0;
      const mockFs = createMockFs({
        existsSync: vi.fn(() => {
          _existsCallCount++;
          return true; // Both source and destination exist
        }),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      setupWindowRequire(mockFs);

      getFolderByNumber.mockReturnValue({
        number: '11.01',
        name: 'Documents',
        area_name: 'System',
        category_name: 'Administration',
      });
      getDefaultCloudDrive.mockReturnValue({
        base_path: '/Users/test/JD',
        jd_root_path: '/Users/test/JD',
      });
      isPathWithinBase.mockReturnValue(true);

      const result = moveFile({
        sourcePath: '/source/file.pdf',
        folderNumber: '11.01',
        conflictStrategy: CONFLICT_STRATEGY.SKIP,
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe(OP_STATUS.SKIPPED);
      expect(result.data.reason).toContain('already exists');
    });

    it('should rename file when conflict strategy is RENAME and file exists', () => {
      let existsCallCount = 0;
      const mockFs = createMockFs({
        existsSync: vi.fn((path) => {
          existsCallCount++;
          // Source exists, destination exists first time, not second
          if (path.includes('source')) return true;
          return existsCallCount <= 3;
        }),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
        renameSync: vi.fn(),
        mkdirSync: vi.fn(),
      });
      setupWindowRequire(mockFs);

      getFolderByNumber.mockReturnValue({
        number: '11.01',
        name: 'Documents',
        area_name: 'System',
        category_name: 'Administration',
      });
      getDefaultCloudDrive.mockReturnValue({
        base_path: '/Users/test/JD',
        jd_root_path: '/Users/test/JD',
      });
      isPathWithinBase.mockReturnValue(true);

      const result = moveFile({
        sourcePath: '/source/file.pdf',
        folderNumber: '11.01',
        conflictStrategy: CONFLICT_STRATEGY.RENAME,
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe(OP_STATUS.SUCCESS);
    });

    it('should move file successfully', () => {
      let existsCallCount = 0;
      const mockFs = createMockFs({
        existsSync: vi.fn((path) => {
          existsCallCount++;
          // Source exists, destination doesn't
          if (path.includes('source')) return true;
          if (existsCallCount <= 2) return true; // folder check
          return false;
        }),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
        renameSync: vi.fn(),
        mkdirSync: vi.fn(),
      });
      setupWindowRequire(mockFs);

      getFolderByNumber.mockReturnValue({
        number: '11.01',
        name: 'Documents',
        area_name: 'System',
        category_name: 'Administration',
      });
      getDefaultCloudDrive.mockReturnValue({
        id: 'default',
        base_path: '/Users/test/JD',
        jd_root_path: '/Users/test/JD',
      });
      isPathWithinBase.mockReturnValue(true);
      recordOrganizedFile.mockReturnValue({ id: 123 });

      const result = moveFile({
        sourcePath: '/source/file.pdf',
        folderNumber: '11.01',
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe(OP_STATUS.SUCCESS);
      expect(result.data.folderNumber).toBe('11.01');
      expect(recordOrganizedFile).toHaveBeenCalled();
    });

    it('should handle cross-filesystem move with copy+delete', () => {
      let existsCallCount = 0;
      const mockFs = createMockFs({
        existsSync: vi.fn((path) => {
          existsCallCount++;
          if (path.includes('source')) return true;
          if (existsCallCount <= 2) return true;
          return false;
        }),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
        renameSync: vi.fn(() => {
          const error = new Error('Cross-device link');
          error.code = 'EXDEV';
          throw error;
        }),
        copyFileSync: vi.fn(),
        unlinkSync: vi.fn(),
        mkdirSync: vi.fn(),
      });
      setupWindowRequire(mockFs);

      getFolderByNumber.mockReturnValue({
        number: '11.01',
        name: 'Documents',
        area_name: 'System',
        category_name: 'Administration',
      });
      getDefaultCloudDrive.mockReturnValue({
        base_path: '/Users/test/JD',
        jd_root_path: '/Users/test/JD',
      });
      isPathWithinBase.mockReturnValue(true);

      const result = moveFile({
        sourcePath: '/external/drive/file.pdf',
        folderNumber: '11.01',
      });

      expect(result.success).toBe(true);
      expect(mockFs.copyFileSync).toHaveBeenCalled();
      expect(mockFs.unlinkSync).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // rollbackMove Tests
  // ===========================================================================

  describe('rollbackMove', () => {
    it('should return error when file system is not available', () => {
      delete globalThis.window;

      const result = rollbackMove(123);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('File system not available');
    });

    it('should return error when record is not found', () => {
      setupWindowRequire();
      getOrganizedFile.mockReturnValue(null);

      const result = rollbackMove(999);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Record 999 not found');
    });

    it('should return error when status is not moved', () => {
      setupWindowRequire();
      getOrganizedFile.mockReturnValue({
        id: 1,
        status: 'undone',
        current_path: '/dest/file.pdf',
        original_path: '/source/file.pdf',
      });

      const result = rollbackMove(1);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Cannot rollback: status is undone');
    });

    it('should return error when file no longer exists at destination', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => false),
      });
      setupWindowRequire(mockFs);
      getOrganizedFile.mockReturnValue({
        id: 1,
        status: 'moved',
        current_path: '/dest/file.pdf',
        original_path: '/source/file.pdf',
      });

      const result = rollbackMove(1);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('File no longer exists at destination');
    });

    it('should return error when original location already has a file', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true), // Both current and original exist
      });
      setupWindowRequire(mockFs);
      getOrganizedFile.mockReturnValue({
        id: 1,
        status: 'moved',
        current_path: '/dest/file.pdf',
        original_path: '/source/file.pdf',
      });

      const result = rollbackMove(1);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Original location already has a file');
    });

    it('should successfully rollback a move operation', () => {
      let existsCallCount = 0;
      const mockFs = createMockFs({
        existsSync: vi.fn(() => {
          existsCallCount++;
          // Current exists, original doesn't, then original dir check
          if (existsCallCount === 1) return true; // current_path exists
          if (existsCallCount === 2) return false; // original_path doesn't exist
          return true; // original dir exists
        }),
        renameSync: vi.fn(),
        mkdirSync: vi.fn(),
      });
      setupWindowRequire(mockFs);
      getOrganizedFile.mockReturnValue({
        id: 1,
        status: 'moved',
        current_path: '/dest/file.pdf',
        original_path: '/source/file.pdf',
      });

      const result = rollbackMove(1);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe(OP_STATUS.ROLLED_BACK);
      expect(updateOrganizedFile).toHaveBeenCalledWith(1, { status: 'undone' });
    });

    it('should handle cross-filesystem rollback with copy+delete', () => {
      let existsCallCount = 0;
      const mockFs = createMockFs({
        existsSync: vi.fn(() => {
          existsCallCount++;
          if (existsCallCount === 1) return true;
          if (existsCallCount === 2) return false;
          return true;
        }),
        renameSync: vi.fn(() => {
          const error = new Error('Cross-device link');
          error.code = 'EXDEV';
          throw error;
        }),
        copyFileSync: vi.fn(),
        unlinkSync: vi.fn(),
        mkdirSync: vi.fn(),
      });
      setupWindowRequire(mockFs);
      getOrganizedFile.mockReturnValue({
        id: 1,
        status: 'moved',
        current_path: '/external/dest/file.pdf',
        original_path: '/local/source/file.pdf',
      });

      const result = rollbackMove(1);

      expect(result.success).toBe(true);
      expect(mockFs.copyFileSync).toHaveBeenCalled();
      expect(mockFs.unlinkSync).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // batchMove Tests
  // ===========================================================================

  describe('batchMove', () => {
    it('should process multiple files', async () => {
      let existsCallCount = 0;
      const mockFs = createMockFs({
        existsSync: vi.fn(() => {
          existsCallCount++;
          // Alternate source exists, destination doesn't
          return existsCallCount % 2 === 1;
        }),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
        renameSync: vi.fn(),
        mkdirSync: vi.fn(),
      });
      setupWindowRequire(mockFs);

      getFolderByNumber.mockReturnValue({
        number: '11.01',
        name: 'Documents',
        area_name: 'System',
        category_name: 'Administration',
      });
      getDefaultCloudDrive.mockReturnValue({
        base_path: '/Users/test/JD',
        jd_root_path: '/Users/test/JD',
      });
      isPathWithinBase.mockReturnValue(true);

      const operations = [
        { sourcePath: '/source/file1.pdf', folderNumber: '11.01' },
        { sourcePath: '/source/file2.pdf', folderNumber: '11.01' },
      ];

      const result = await batchMove(operations);

      expect(result.total).toBe(2);
    });

    it('should call onProgress callback', async () => {
      setupWindowRequire();
      const onProgress = vi.fn();

      const operations = [{ sourcePath: '/source/file1.pdf', folderNumber: '11.01' }];

      await batchMove(operations, { onProgress });

      expect(onProgress).toHaveBeenCalled();
    });

    it('should call onFileComplete callback for each file', async () => {
      setupWindowRequire();
      const onFileComplete = vi.fn();

      const operations = [
        { sourcePath: '/source/file1.pdf', folderNumber: '11.01' },
        { sourcePath: '/source/file2.pdf', folderNumber: '11.01' },
      ];

      await batchMove(operations, { onFileComplete });

      expect(onFileComplete).toHaveBeenCalledTimes(2);
    });

    it('should stop on error when stopOnError is true', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => false), // Source doesn't exist - will fail
      });
      setupWindowRequire(mockFs);

      const operations = [
        { sourcePath: '/missing/file1.pdf', folderNumber: '11.01' },
        { sourcePath: '/missing/file2.pdf', folderNumber: '11.01' },
        { sourcePath: '/missing/file3.pdf', folderNumber: '11.01' },
      ];

      const result = await batchMove(operations, { stopOnError: true });

      expect(result.failed).toBe(1);
      expect(result.operations).toHaveLength(1);
    });

    it('should continue on error when stopOnError is false', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => false),
      });
      setupWindowRequire(mockFs);

      const operations = [
        { sourcePath: '/missing/file1.pdf', folderNumber: '11.01' },
        { sourcePath: '/missing/file2.pdf', folderNumber: '11.01' },
      ];

      const result = await batchMove(operations, { stopOnError: false });

      expect(result.failed).toBe(2);
      expect(result.operations).toHaveLength(2);
    });
  });

  // ===========================================================================
  // batchRollback Tests
  // ===========================================================================

  describe('batchRollback', () => {
    it('should process multiple rollback operations', async () => {
      let callCount = 0;
      const mockFs = createMockFs({
        existsSync: vi.fn(() => {
          callCount++;
          // Pattern: current exists, original doesn't, original dir exists
          const mod = callCount % 3;
          if (mod === 1) return true; // current_path
          if (mod === 2) return false; // original_path
          return true; // original dir
        }),
        renameSync: vi.fn(),
        mkdirSync: vi.fn(),
      });
      setupWindowRequire(mockFs);

      getOrganizedFile.mockImplementation((id) => ({
        id,
        status: 'moved',
        current_path: `/dest/file${id}.pdf`,
        original_path: `/source/file${id}.pdf`,
      }));

      const result = await batchRollback([1, 2, 3]);

      expect(result.total).toBe(3);
      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should call onProgress callback', async () => {
      setupWindowRequire();
      getOrganizedFile.mockReturnValue(null); // Will fail but still calls progress
      const onProgress = vi.fn();

      await batchRollback([1, 2], onProgress);

      expect(onProgress).toHaveBeenCalledTimes(2);
    });

    it('should track failed rollbacks', async () => {
      setupWindowRequire();
      getOrganizedFile.mockReturnValue(null); // Record not found

      const result = await batchRollback([1, 2, 3]);

      expect(result.failed).toBe(3);
      expect(result.success).toBe(0);
    });
  });

  // ===========================================================================
  // previewOperations Tests
  // ===========================================================================

  describe('previewOperations', () => {
    it('should return error for each operation when file system is not available', () => {
      delete globalThis.window;

      const operations = [
        { sourcePath: '/source/file1.pdf', folderNumber: '11.01' },
        { sourcePath: '/source/file2.pdf', folderNumber: '11.01' },
      ];

      const result = previewOperations(operations);

      expect(result).toHaveLength(2);
      expect(result[0].error).toBe('File system not available');
      expect(result[1].error).toBe('File system not available');
    });

    it('should check if source file exists', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
      });
      setupWindowRequire(mockFs);

      getFolderByNumber.mockReturnValue({
        number: '11.01',
        name: 'Documents',
        area_name: 'System',
        category_name: 'Administration',
      });
      getDefaultCloudDrive.mockReturnValue({
        base_path: '/Users/test/JD',
        jd_root_path: '/Users/test/JD',
      });
      isPathWithinBase.mockReturnValue(true);

      const operations = [{ sourcePath: '/source/file.pdf', folderNumber: '11.01' }];

      const result = previewOperations(operations);

      expect(result[0].sourceExists).toBe(true);
    });

    it('should detect conflicts at destination', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true), // Both source and destination exist
      });
      setupWindowRequire(mockFs);

      getFolderByNumber.mockReturnValue({
        number: '11.01',
        name: 'Documents',
        area_name: 'System',
        category_name: 'Administration',
      });
      getDefaultCloudDrive.mockReturnValue({
        base_path: '/Users/test/JD',
        jd_root_path: '/Users/test/JD',
      });
      isPathWithinBase.mockReturnValue(true);

      const operations = [{ sourcePath: '/source/file.pdf', folderNumber: '11.01' }];

      const result = previewOperations(operations);

      expect(result[0].wouldConflict).toBe(true);
    });

    it('should handle errors in buildDestinationPath gracefully', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
      });
      setupWindowRequire(mockFs);

      getFolderByNumber.mockReturnValue(null); // Will cause buildDestinationPath to throw

      const operations = [{ sourcePath: '/source/file.pdf', folderNumber: '99.99' }];

      const result = previewOperations(operations);

      expect(result[0].error).toContain('Folder 99.99 not found');
    });

    it('should return folder information in preview', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => false),
      });
      setupWindowRequire(mockFs);

      const mockFolder = {
        number: '11.01',
        name: 'Documents',
        area_name: 'System',
        category_name: 'Administration',
      };
      getFolderByNumber.mockReturnValue(mockFolder);
      getDefaultCloudDrive.mockReturnValue({
        base_path: '/Users/test/JD',
        jd_root_path: '/Users/test/JD',
      });
      isPathWithinBase.mockReturnValue(true);

      const operations = [{ sourcePath: '/source/file.pdf', folderNumber: '11.01' }];

      const result = previewOperations(operations);

      expect(result[0].folder).toEqual(mockFolder);
      expect(result[0].destinationPath).toBeDefined();
    });
  });
});
