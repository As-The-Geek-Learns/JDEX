/**
 * Drag & Drop Service Tests
 * =========================
 * Tests for file drag & drop operations and validation.
 *
 * Test categories:
 * 1. File validation (validateDroppedFile)
 * 2. File info extraction (extractFileInfo, categorizeFileType)
 * 3. Usage tracking (getDragDropUsageThisMonth, incrementDragDropUsage, canPerformDragDrop)
 * 4. Path building (buildDestinationPath) - with mocks
 * 5. File operations (moveFileToFolder, checkForConflict) - with mocks
 * 6. Database logging (logOrganizedFile) - with mocks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  validateDroppedFile,
  extractFileInfo,
  buildDestinationPath,
  moveFileToFolder,
  logOrganizedFile,
  checkForConflict,
  getDragDropUsageThisMonth,
  incrementDragDropUsage,
  canPerformDragDrop,
} from './dragDropService.js';

// Mock the db.js imports
vi.mock('../db.js', () => ({
  getDB: vi.fn(),
  saveDatabase: vi.fn(),
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
    return true;
  }),
  sanitizeText: vi.fn((text) => text),
}));

import { getDB, saveDatabase } from '../db.js';

// =============================================================================
// Test Suite
// =============================================================================

describe('dragDropService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up window.require mocks if any
    delete globalThis.window;
  });

  // ===========================================================================
  // validateDroppedFile Tests
  // ===========================================================================

  describe('validateDroppedFile', () => {
    it('should return invalid for empty path', () => {
      const result = validateDroppedFile('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No file path provided');
    });

    it('should return invalid for null path', () => {
      const result = validateDroppedFile(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No file path provided');
    });

    it('should return invalid for undefined path', () => {
      const result = validateDroppedFile(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No file path provided');
    });

    it('should block macOS system paths', () => {
      const blockedPaths = [
        '/System/Library/test.txt',
        '/Library/Preferences/test.plist',
        '/usr/local/bin/script',
        '/bin/bash',
        '/sbin/mount',
        '/etc/hosts',
        '/var/log/system.log',
        '/private/var/test',
        '/Applications/Safari.app',
      ];

      blockedPaths.forEach((path) => {
        const result = validateDroppedFile(path);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('System files cannot be organized for safety reasons');
      });
    });

    it('should block Windows system paths', () => {
      const blockedPaths = [
        'C:\\Windows\\System32\\test.dll',
        'C:\\Program Files\\App\\test.exe',
        'C:\\Program Files (x86)\\App\\test.exe',
      ];

      blockedPaths.forEach((path) => {
        const result = validateDroppedFile(path);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('System files cannot be organized for safety reasons');
      });
    });

    it('should block paths case-insensitively', () => {
      const result = validateDroppedFile('/SYSTEM/Library/Test.txt');
      expect(result.valid).toBe(false);
    });

    it('should allow valid user paths', () => {
      const result = validateDroppedFile('/Users/james/Documents/report.pdf');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should warn about application files (.app)', () => {
      const result = validateDroppedFile('/Users/james/Downloads/MyApp.app');
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('application or system file');
    });

    it('should warn about executable files (.exe)', () => {
      const result = validateDroppedFile('/Users/james/Downloads/setup.exe');
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('application or system file');
    });

    it('should warn about DLL files', () => {
      const result = validateDroppedFile('/Users/james/Downloads/library.dll');
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('application or system file');
    });

    it('should warn about other sensitive extensions', () => {
      const sensitiveFiles = [
        '/path/to/file.sys',
        '/path/to/file.kext',
        '/path/to/file.plist',
        '/path/to/file.dylib',
        '/path/to/file.framework',
      ];

      sensitiveFiles.forEach((path) => {
        const result = validateDroppedFile(path);
        expect(result.valid).toBe(true);
        expect(result.warning).toBeDefined();
      });
    });

    it('should not warn about regular document files', () => {
      const result = validateDroppedFile('/Users/james/Documents/report.pdf');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should reject paths with traversal attempts', () => {
      const result = validateDroppedFile('/Users/james/../../../etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Path traversal not allowed');
    });
  });

  // ===========================================================================
  // extractFileInfo Tests
  // ===========================================================================

  describe('extractFileInfo', () => {
    it('should extract basic file properties', () => {
      const file = {
        path: '/Users/james/Documents/report.pdf',
        name: 'report.pdf',
        size: 1024,
        type: 'application/pdf',
      };

      const result = extractFileInfo(file);

      expect(result.path).toBe('/Users/james/Documents/report.pdf');
      expect(result.name).toBe('report.pdf');
      expect(result.size).toBe(1024);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.extension).toBe('pdf');
      expect(result.fileType).toBe('Documents');
    });

    it('should handle missing properties gracefully', () => {
      const file = {};

      const result = extractFileInfo(file);

      expect(result.path).toBe('');
      expect(result.name).toBe('');
      expect(result.size).toBe(0);
      expect(result.mimeType).toBe('');
      expect(result.extension).toBe('');
      expect(result.fileType).toBe('Other');
    });

    it('should extract extension correctly for multi-dot filenames', () => {
      const file = {
        name: 'archive.tar.gz',
        path: '/path/archive.tar.gz',
      };

      const result = extractFileInfo(file);

      expect(result.extension).toBe('gz');
      expect(result.fileType).toBe('Archives');
    });

    it('should handle files without extension', () => {
      const file = {
        name: 'README',
        path: '/path/README',
      };

      const result = extractFileInfo(file);

      expect(result.extension).toBe('');
      expect(result.fileType).toBe('Other');
    });

    it('should categorize document types correctly', () => {
      const docTypes = [
        { ext: 'pdf', type: 'Documents' },
        { ext: 'doc', type: 'Documents' },
        { ext: 'docx', type: 'Documents' },
        { ext: 'txt', type: 'Documents' },
        { ext: 'rtf', type: 'Documents' },
        { ext: 'odt', type: 'Documents' },
        { ext: 'pages', type: 'Documents' },
      ];

      docTypes.forEach(({ ext, type }) => {
        const file = { name: `test.${ext}`, path: `/path/test.${ext}` };
        const result = extractFileInfo(file);
        expect(result.fileType).toBe(type);
      });
    });

    it('should categorize spreadsheet types correctly', () => {
      const spreadsheetTypes = ['xls', 'xlsx', 'csv', 'numbers', 'ods'];

      spreadsheetTypes.forEach((ext) => {
        const file = { name: `data.${ext}`, path: `/path/data.${ext}` };
        const result = extractFileInfo(file);
        expect(result.fileType).toBe('Spreadsheets');
      });
    });

    it('should categorize presentation types correctly', () => {
      const presentationTypes = ['ppt', 'pptx', 'key', 'odp'];

      presentationTypes.forEach((ext) => {
        const file = { name: `slides.${ext}`, path: `/path/slides.${ext}` };
        const result = extractFileInfo(file);
        expect(result.fileType).toBe('Presentations');
      });
    });

    it('should categorize image types correctly', () => {
      const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'heic'];

      imageTypes.forEach((ext) => {
        const file = { name: `photo.${ext}`, path: `/path/photo.${ext}` };
        const result = extractFileInfo(file);
        expect(result.fileType).toBe('Images');
      });
    });

    it('should categorize video types correctly', () => {
      const videoTypes = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv'];

      videoTypes.forEach((ext) => {
        const file = { name: `video.${ext}`, path: `/path/video.${ext}` };
        const result = extractFileInfo(file);
        expect(result.fileType).toBe('Videos');
      });
    });

    it('should categorize audio types correctly', () => {
      const audioTypes = ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg'];

      audioTypes.forEach((ext) => {
        const file = { name: `song.${ext}`, path: `/path/song.${ext}` };
        const result = extractFileInfo(file);
        expect(result.fileType).toBe('Audio');
      });
    });

    it('should categorize archive types correctly', () => {
      const archiveTypes = ['zip', 'rar', '7z', 'tar', 'gz', 'dmg'];

      archiveTypes.forEach((ext) => {
        const file = { name: `archive.${ext}`, path: `/path/archive.${ext}` };
        const result = extractFileInfo(file);
        expect(result.fileType).toBe('Archives');
      });
    });

    it('should categorize code types correctly', () => {
      const codeTypes = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'swift', 'rs'];

      codeTypes.forEach((ext) => {
        const file = { name: `main.${ext}`, path: `/path/main.${ext}` };
        const result = extractFileInfo(file);
        expect(result.fileType).toBe('Code');
      });
    });

    it('should categorize data types correctly', () => {
      const dataTypes = ['json', 'xml', 'yaml', 'yml', 'sql', 'db'];

      dataTypes.forEach((ext) => {
        const file = { name: `config.${ext}`, path: `/path/config.${ext}` };
        const result = extractFileInfo(file);
        expect(result.fileType).toBe('Data');
      });
    });

    it('should return Other for unknown extensions', () => {
      const file = { name: 'file.xyz', path: '/path/file.xyz' };
      const result = extractFileInfo(file);
      expect(result.fileType).toBe('Other');
    });

    it('should handle uppercase extensions', () => {
      const file = { name: 'PHOTO.JPG', path: '/path/PHOTO.JPG' };
      const result = extractFileInfo(file);
      expect(result.extension).toBe('jpg');
      expect(result.fileType).toBe('Images');
    });
  });

  // ===========================================================================
  // Usage Tracking Tests
  // ===========================================================================

  describe('getDragDropUsageThisMonth', () => {
    it('should return 0 when no usage data exists', () => {
      expect(getDragDropUsageThisMonth()).toBe(0);
    });

    it('should return 0 for malformed JSON', () => {
      localStorage.setItem('jdex_dragdrop_usage', 'not valid json');
      expect(getDragDropUsageThisMonth()).toBe(0);
    });

    it('should return count for current month', () => {
      const currentMonth = new Date().toISOString().substring(0, 7);
      localStorage.setItem(
        'jdex_dragdrop_usage',
        JSON.stringify({ month: currentMonth, count: 3 })
      );

      expect(getDragDropUsageThisMonth()).toBe(3);
    });

    it('should return 0 for previous month data', () => {
      // Use a month that's definitely in the past
      localStorage.setItem('jdex_dragdrop_usage', JSON.stringify({ month: '2020-01', count: 5 }));

      expect(getDragDropUsageThisMonth()).toBe(0);
    });
  });

  describe('incrementDragDropUsage', () => {
    it('should start count at 1 for first usage', () => {
      incrementDragDropUsage();

      const data = JSON.parse(localStorage.getItem('jdex_dragdrop_usage'));
      expect(data.count).toBe(1);
    });

    it('should increment existing count', () => {
      const currentMonth = new Date().toISOString().substring(0, 7);
      localStorage.setItem(
        'jdex_dragdrop_usage',
        JSON.stringify({ month: currentMonth, count: 2 })
      );

      incrementDragDropUsage();

      const data = JSON.parse(localStorage.getItem('jdex_dragdrop_usage'));
      expect(data.count).toBe(3);
    });

    it('should reset count for new month', () => {
      localStorage.setItem('jdex_dragdrop_usage', JSON.stringify({ month: '2020-01', count: 100 }));

      incrementDragDropUsage();

      const data = JSON.parse(localStorage.getItem('jdex_dragdrop_usage'));
      expect(data.count).toBe(1);
    });

    it('should set current month', () => {
      incrementDragDropUsage();

      const data = JSON.parse(localStorage.getItem('jdex_dragdrop_usage'));
      const currentMonth = new Date().toISOString().substring(0, 7);
      expect(data.month).toBe(currentMonth);
    });
  });

  describe('canPerformDragDrop', () => {
    it('should always allow for premium users', () => {
      const result = canPerformDragDrop(true);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeUndefined();
    });

    it('should allow free users under limit', () => {
      const result = canPerformDragDrop(false);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
      expect(result.limit).toBe(5);
    });

    it('should reduce remaining count based on usage', () => {
      const currentMonth = new Date().toISOString().substring(0, 7);
      localStorage.setItem(
        'jdex_dragdrop_usage',
        JSON.stringify({ month: currentMonth, count: 3 })
      );

      const result = canPerformDragDrop(false);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should disallow free users at limit', () => {
      const currentMonth = new Date().toISOString().substring(0, 7);
      localStorage.setItem(
        'jdex_dragdrop_usage',
        JSON.stringify({ month: currentMonth, count: 5 })
      );

      const result = canPerformDragDrop(false);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should disallow free users over limit', () => {
      const currentMonth = new Date().toISOString().substring(0, 7);
      localStorage.setItem(
        'jdex_dragdrop_usage',
        JSON.stringify({ month: currentMonth, count: 10 })
      );

      const result = canPerformDragDrop(false);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  // ===========================================================================
  // buildDestinationPath Tests (with mocks)
  // ===========================================================================

  describe('buildDestinationPath', () => {
    const mockPath = {
      join: (...args) => args.join('/'),
    };

    beforeEach(() => {
      globalThis.window = {
        require: (module) => {
          if (module === 'path') return mockPath;
          return null;
        },
      };
    });

    it('should use storage_path when available', () => {
      const folder = {
        storage_path: '/Users/james/JD/12.01 Projects',
        folder_number: '12.01',
        name: 'Projects',
      };

      const result = buildDestinationPath(folder, 'report.pdf', '/JD');
      expect(result).toBe('/Users/james/JD/12.01 Projects/report.pdf');
    });

    it('should build JD structure path when no storage_path', () => {
      const folder = {
        folder_number: '12.01',
        name: 'Projects',
        area_name: 'Work',
        category_name: 'Development',
      };

      const result = buildDestinationPath(folder, 'report.pdf', '/JD');
      expect(result).toContain('10-19 Work');
      expect(result).toContain('12 Development');
      expect(result).toContain('12.01 Projects');
      expect(result).toContain('report.pdf');
    });

    it('should use default names when area/category names missing', () => {
      const folder = {
        folder_number: '22.03',
        name: 'Documents',
      };

      const result = buildDestinationPath(folder, 'file.txt', '/JD');
      expect(result).toContain('20-29 Area');
      expect(result).toContain('22 Category');
      expect(result).toContain('22.03 Documents');
    });

    it('should throw when path module not available', () => {
      globalThis.window = { require: () => null };

      const folder = { folder_number: '12.01', name: 'Test' };
      expect(() => buildDestinationPath(folder, 'file.txt', '/JD')).toThrow(
        'Path module not available'
      );
    });
  });

  // ===========================================================================
  // moveFileToFolder Tests (with mocks)
  // ===========================================================================

  describe('moveFileToFolder', () => {
    let mockFs;
    let mockPath;

    beforeEach(() => {
      mockFs = {
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
        renameSync: vi.fn(),
        copyFileSync: vi.fn(),
        unlinkSync: vi.fn(),
      };

      mockPath = {
        dirname: (p) => p.substring(0, p.lastIndexOf('/')),
      };

      globalThis.window = {
        require: (module) => {
          if (module === 'fs') return mockFs;
          if (module === 'path') return mockPath;
          return null;
        },
      };
    });

    it('should return error when file system not available', async () => {
      globalThis.window = { require: () => null };

      const result = await moveFileToFolder('/source/file.txt', '/dest/file.txt');
      expect(result.success).toBe(false);
      expect(result.error).toBe('File system not available');
    });

    it('should create destination directory if it does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await moveFileToFolder('/source/file.txt', '/dest/folder/file.txt');

      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/dest/folder', { recursive: true });
    });

    it('should return conflict error if destination exists', async () => {
      mockFs.existsSync.mockImplementation((path) => {
        // First call checks dest dir, second checks dest file
        return path.includes('file.txt');
      });

      const result = await moveFileToFolder('/source/file.txt', '/dest/file.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('conflict');
      expect(result.existingPath).toBe('/dest/file.txt');
    });

    it('should move file successfully with rename', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await moveFileToFolder('/source/file.txt', '/dest/file.txt');

      expect(result.success).toBe(true);
      expect(mockFs.renameSync).toHaveBeenCalledWith('/source/file.txt', '/dest/file.txt');
    });

    it('should fallback to copy+delete for cross-filesystem moves', async () => {
      mockFs.existsSync.mockReturnValue(false);
      const exdevError = new Error('Cross-device link not permitted');
      exdevError.code = 'EXDEV';
      mockFs.renameSync.mockImplementation(() => {
        throw exdevError;
      });

      const result = await moveFileToFolder('/source/file.txt', '/dest/file.txt');

      expect(result.success).toBe(true);
      expect(mockFs.copyFileSync).toHaveBeenCalledWith('/source/file.txt', '/dest/file.txt');
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/source/file.txt');
    });

    it('should return error for other rename failures', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.renameSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await moveFileToFolder('/source/file.txt', '/dest/file.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });

  // ===========================================================================
  // checkForConflict Tests (with mocks)
  // ===========================================================================

  describe('checkForConflict', () => {
    let mockFs;
    let mockPath;

    beforeEach(() => {
      mockFs = {
        existsSync: vi.fn(),
      };

      mockPath = {
        dirname: (p) => p.substring(0, p.lastIndexOf('/')),
        extname: (p) => {
          const lastDot = p.lastIndexOf('.');
          return lastDot > 0 ? p.substring(lastDot) : '';
        },
        basename: (p, ext) => {
          const base = p.substring(p.lastIndexOf('/') + 1);
          if (ext && base.endsWith(ext)) {
            return base.substring(0, base.length - ext.length);
          }
          return base;
        },
        join: (...args) => args.join('/'),
      };

      globalThis.window = {
        require: (module) => {
          if (module === 'fs') return mockFs;
          if (module === 'path') return mockPath;
          return null;
        },
      };
    });

    it('should return exists: false when modules not available', () => {
      globalThis.window = { require: () => null };

      const result = checkForConflict('/dest/file.txt');
      expect(result.exists).toBe(false);
    });

    it('should return exists: false when file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = checkForConflict('/dest/file.txt');
      expect(result.exists).toBe(false);
    });

    it('should suggest numbered name when file exists', () => {
      mockFs.existsSync.mockImplementation((path) => {
        // Only the original path exists
        return path === '/dest/file.txt';
      });

      const result = checkForConflict('/dest/file.txt');

      expect(result.exists).toBe(true);
      expect(result.suggestedName).toBe('file (1).txt');
      expect(result.suggestedPath).toBe('/dest/file (1).txt');
    });

    it('should increment counter until unique name found', () => {
      mockFs.existsSync.mockImplementation((path) => {
        // Original and (1), (2) exist
        return ['/dest/file.txt', '/dest/file (1).txt', '/dest/file (2).txt'].includes(path);
      });

      const result = checkForConflict('/dest/file.txt');

      expect(result.exists).toBe(true);
      expect(result.suggestedName).toBe('file (3).txt');
    });

    it('should handle files without extension', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path === '/dest/README';
      });

      const result = checkForConflict('/dest/README');

      expect(result.exists).toBe(true);
      expect(result.suggestedName).toBe('README (1)');
    });
  });

  // ===========================================================================
  // logOrganizedFile Tests (with mocks)
  // ===========================================================================

  describe('logOrganizedFile', () => {
    let mockDb;

    beforeEach(() => {
      mockDb = {
        run: vi.fn(),
      };
      getDB.mockReturnValue(mockDb);
    });

    it('should not throw when db is null', () => {
      getDB.mockReturnValue(null);

      expect(() =>
        logOrganizedFile({
          filename: 'test.pdf',
          originalPath: '/source/test.pdf',
          currentPath: '/dest/test.pdf',
          jdFolderNumber: '12.01',
          fileType: 'Documents',
          fileSize: 1024,
        })
      ).not.toThrow();
    });

    it('should insert record into organized_files table', () => {
      logOrganizedFile({
        filename: 'report.pdf',
        originalPath: '/source/report.pdf',
        currentPath: '/dest/report.pdf',
        jdFolderNumber: '12.01',
        fileType: 'Documents',
        fileSize: 2048,
      });

      expect(mockDb.run).toHaveBeenCalled();
      const [sql, params] = mockDb.run.mock.calls[0];
      expect(sql).toContain('INSERT INTO organized_files');
      expect(params).toContain('report.pdf');
      expect(params).toContain('/source/report.pdf');
      expect(params).toContain('/dest/report.pdf');
      expect(params).toContain('12.01');
      expect(params).toContain('Documents');
      expect(params).toContain(2048);
    });

    it('should save database after logging', () => {
      logOrganizedFile({
        filename: 'test.pdf',
        originalPath: '/source/test.pdf',
        currentPath: '/dest/test.pdf',
        jdFolderNumber: '12.01',
        fileType: 'Documents',
        fileSize: 1024,
      });

      expect(saveDatabase).toHaveBeenCalled();
    });

    it('should handle optional ruleId', () => {
      logOrganizedFile({
        filename: 'test.pdf',
        originalPath: '/source/test.pdf',
        currentPath: '/dest/test.pdf',
        jdFolderNumber: '12.01',
        fileType: 'Documents',
        fileSize: 1024,
        ruleId: 42,
      });

      const [, params] = mockDb.run.mock.calls[0];
      expect(params).toContain(42);
    });

    it('should not crash on database error', () => {
      mockDb.run.mockImplementation(() => {
        throw new Error('Database error');
      });

      expect(() =>
        logOrganizedFile({
          filename: 'test.pdf',
          originalPath: '/source/test.pdf',
          currentPath: '/dest/test.pdf',
          jdFolderNumber: '12.01',
          fileType: 'Documents',
          fileSize: 1024,
        })
      ).not.toThrow();
    });
  });
});
