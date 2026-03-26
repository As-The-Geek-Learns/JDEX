/**
 * File Scanner Service Tests
 * ==========================
 * Tests for directory scanning, file type detection, and metadata extraction.
 *
 * Test categories:
 * 1. File type detection (getFileType)
 * 2. File extension extraction (getFileExtension)
 * 3. File size formatting (formatFileSize)
 * 4. File system access detection (hasFileSystemAccess)
 * 5. FileScanner class (generateSessionId, reset, cancel, getProgress, isRunning)
 * 6. Singleton scanner (getScanner)
 * 7. Quick operations (quickCount, listSubdirectories) - with mocks
 * 8. Scan operation (scan) - with mocks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  getFileType,
  getFileExtension,
  formatFileSize,
  hasFileSystemAccess,
  FileScanner,
  getScanner,
  quickCount,
  listSubdirectories,
} from './fileScannerService.js';

// Mock the db.js imports
vi.mock('../db.js', () => ({
  addScannedFile: vi.fn(),
  clearScannedFiles: vi.fn(),
  getScannedFiles: vi.fn(() => []),
}));

// Mock the validation utils
vi.mock('../utils/validation.js', () => ({
  validateFilePath: vi.fn((path, _options) => {
    if (!path || typeof path !== 'string') {
      throw new Error('Invalid file path');
    }
    if (path.includes('..')) {
      throw new Error('Path traversal not allowed');
    }
    return path;
  }),
}));

import { addScannedFile } from '../db.js';
import { validateFilePath } from '../utils/validation.js';

// =============================================================================
// Test Suite
// =============================================================================

describe('fileScannerService', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  // ===========================================================================
  // getFileType Tests
  // ===========================================================================

  describe('getFileType', () => {
    describe('documents', () => {
      it('should detect PDF files', () => {
        expect(getFileType('report.pdf')).toBe('document');
      });

      it('should detect Word documents', () => {
        expect(getFileType('document.doc')).toBe('document');
        expect(getFileType('document.docx')).toBe('document');
      });

      it('should detect text files', () => {
        expect(getFileType('readme.txt')).toBe('document');
        expect(getFileType('notes.md')).toBe('document');
        expect(getFileType('notes.markdown')).toBe('document');
      });

      it('should detect RTF and ODT files', () => {
        expect(getFileType('file.rtf')).toBe('document');
        expect(getFileType('file.odt')).toBe('document');
      });

      it('should detect Apple Pages files', () => {
        expect(getFileType('doc.pages')).toBe('document');
      });
    });

    describe('spreadsheets', () => {
      it('should detect Excel files', () => {
        expect(getFileType('data.xls')).toBe('spreadsheet');
        expect(getFileType('data.xlsx')).toBe('spreadsheet');
      });

      it('should detect CSV files', () => {
        expect(getFileType('export.csv')).toBe('spreadsheet');
      });

      it('should detect Apple Numbers files', () => {
        expect(getFileType('budget.numbers')).toBe('spreadsheet');
      });
    });

    describe('presentations', () => {
      it('should detect PowerPoint files', () => {
        expect(getFileType('slides.ppt')).toBe('presentation');
        expect(getFileType('slides.pptx')).toBe('presentation');
      });

      it('should detect Keynote files', () => {
        expect(getFileType('presentation.key')).toBe('presentation');
      });
    });

    describe('images', () => {
      it('should detect common image formats', () => {
        expect(getFileType('photo.jpg')).toBe('image');
        expect(getFileType('photo.jpeg')).toBe('image');
        expect(getFileType('image.png')).toBe('image');
        expect(getFileType('animation.gif')).toBe('image');
      });

      it('should detect modern image formats', () => {
        expect(getFileType('photo.webp')).toBe('image');
        expect(getFileType('photo.heic')).toBe('image');
        expect(getFileType('photo.heif')).toBe('image');
      });

      it('should detect RAW image formats', () => {
        expect(getFileType('photo.raw')).toBe('image');
        expect(getFileType('photo.cr2')).toBe('image');
        expect(getFileType('photo.nef')).toBe('image');
      });

      it('should detect vector formats', () => {
        expect(getFileType('icon.svg')).toBe('image');
      });
    });

    describe('videos', () => {
      it('should detect common video formats', () => {
        expect(getFileType('movie.mp4')).toBe('video');
        expect(getFileType('movie.mov')).toBe('video');
        expect(getFileType('movie.avi')).toBe('video');
        expect(getFileType('movie.mkv')).toBe('video');
      });

      it('should detect web video formats', () => {
        expect(getFileType('video.webm')).toBe('video');
      });
    });

    describe('audio', () => {
      it('should detect common audio formats', () => {
        expect(getFileType('song.mp3')).toBe('audio');
        expect(getFileType('song.wav')).toBe('audio');
        expect(getFileType('song.flac')).toBe('audio');
        expect(getFileType('song.aac')).toBe('audio');
      });

      it('should detect Apple audio formats', () => {
        expect(getFileType('song.m4a')).toBe('audio');
        expect(getFileType('song.aiff')).toBe('audio');
      });
    });

    describe('archives', () => {
      it('should detect common archive formats', () => {
        expect(getFileType('backup.zip')).toBe('archive');
        expect(getFileType('backup.rar')).toBe('archive');
        expect(getFileType('backup.7z')).toBe('archive');
        expect(getFileType('backup.tar')).toBe('archive');
      });

      it('should detect disk images', () => {
        expect(getFileType('installer.dmg')).toBe('archive');
        expect(getFileType('disk.iso')).toBe('archive');
      });
    });

    describe('code', () => {
      it('should detect JavaScript/TypeScript files', () => {
        expect(getFileType('app.js')).toBe('code');
        expect(getFileType('app.jsx')).toBe('code');
        expect(getFileType('app.ts')).toBe('code');
        expect(getFileType('app.tsx')).toBe('code');
      });

      it('should detect Python files', () => {
        expect(getFileType('script.py')).toBe('code');
      });

      it('should detect web files', () => {
        expect(getFileType('index.html')).toBe('code');
        expect(getFileType('styles.css')).toBe('code');
        expect(getFileType('styles.scss')).toBe('code');
      });

      it('should detect config files', () => {
        expect(getFileType('config.json')).toBe('code');
        expect(getFileType('config.yaml')).toBe('code');
        expect(getFileType('config.yml')).toBe('code');
        expect(getFileType('config.toml')).toBe('code');
      });

      it('should detect shell scripts', () => {
        expect(getFileType('script.sh')).toBe('code');
        expect(getFileType('script.bash')).toBe('code');
        expect(getFileType('script.ps1')).toBe('code');
      });
    });

    describe('data', () => {
      it('should detect database files', () => {
        expect(getFileType('data.db')).toBe('data');
        expect(getFileType('data.sqlite')).toBe('data');
        expect(getFileType('data.sqlite3')).toBe('data');
      });
    });

    describe('fonts', () => {
      it('should detect font files', () => {
        expect(getFileType('font.ttf')).toBe('font');
        expect(getFileType('font.otf')).toBe('font');
        expect(getFileType('font.woff')).toBe('font');
        expect(getFileType('font.woff2')).toBe('font');
      });
    });

    describe('ebooks', () => {
      it('should detect ebook formats', () => {
        expect(getFileType('book.epub')).toBe('ebook');
        expect(getFileType('book.mobi')).toBe('ebook');
        expect(getFileType('book.azw')).toBe('ebook');
      });
    });

    describe('design', () => {
      it('should detect design files', () => {
        expect(getFileType('design.psd')).toBe('design');
        expect(getFileType('design.ai')).toBe('design');
        expect(getFileType('design.sketch')).toBe('design');
        expect(getFileType('design.fig')).toBe('design');
        expect(getFileType('design.xd')).toBe('design');
      });
    });

    describe('other/unknown', () => {
      it('should return "other" for unknown extensions', () => {
        expect(getFileType('file.xyz')).toBe('other');
        expect(getFileType('file.unknown')).toBe('other');
      });

      it('should return "other" for files without extension', () => {
        expect(getFileType('Makefile')).toBe('other');
        expect(getFileType('README')).toBe('other');
      });

      it('should handle uppercase extensions', () => {
        expect(getFileType('FILE.PDF')).toBe('document');
        expect(getFileType('IMAGE.PNG')).toBe('image');
      });

      it('should handle mixed case extensions', () => {
        expect(getFileType('file.PdF')).toBe('document');
        expect(getFileType('file.JpG')).toBe('image');
      });
    });
  });

  // ===========================================================================
  // getFileExtension Tests
  // ===========================================================================

  describe('getFileExtension', () => {
    it('should extract simple extension', () => {
      expect(getFileExtension('file.txt')).toBe('txt');
    });

    it('should extract extension from path with directories', () => {
      expect(getFileExtension('path/to/file.pdf')).toBe('pdf');
    });

    it('should return lowercase extension', () => {
      expect(getFileExtension('FILE.TXT')).toBe('txt');
      expect(getFileExtension('File.PDF')).toBe('pdf');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('Makefile')).toBe('');
      expect(getFileExtension('README')).toBe('');
    });

    it('should handle multiple dots in filename', () => {
      expect(getFileExtension('file.backup.tar.gz')).toBe('gz');
      expect(getFileExtension('app.min.js')).toBe('js');
    });

    it('should handle hidden files with extension', () => {
      expect(getFileExtension('.eslintrc.json')).toBe('json');
      expect(getFileExtension('.gitignore')).toBe('gitignore');
    });

    it('should handle empty filename', () => {
      expect(getFileExtension('')).toBe('');
    });
  });

  // ===========================================================================
  // formatFileSize Tests
  // ===========================================================================

  describe('formatFileSize', () => {
    it('should format zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(10240)).toBe('10 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(5242880)).toBe('5 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(2147483648)).toBe('2 GB');
    });

    it('should format terabytes', () => {
      expect(formatFileSize(1099511627776)).toBe('1 TB');
    });

    it('should round to one decimal place', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1843)).toBe('1.8 KB');
    });
  });

  // ===========================================================================
  // hasFileSystemAccess Tests
  // ===========================================================================

  describe('hasFileSystemAccess', () => {
    it('should return true when window.require is available', () => {
      globalThis.window = {
        require: vi.fn(() => ({})),
      };
      expect(hasFileSystemAccess()).toBe(true);
    });

    it('should return false when window.require is not available', () => {
      globalThis.window = { require: null };
      expect(hasFileSystemAccess()).toBe(false);
    });

    it('should return false when window is not defined', () => {
      globalThis.window = undefined;
      expect(hasFileSystemAccess()).toBe(false);
    });

    it('should return false when require throws', () => {
      globalThis.window = {
        require: vi.fn(() => {
          throw new Error('Module not found');
        }),
      };
      expect(hasFileSystemAccess()).toBe(false);
    });
  });

  // ===========================================================================
  // FileScanner Class Tests
  // ===========================================================================

  describe('FileScanner', () => {
    describe('constructor', () => {
      it('should initialize with default state', () => {
        const scanner = new FileScanner();
        expect(scanner.sessionId).toBeNull();
        expect(scanner.isScanning).toBe(false);
        expect(scanner.isCancelled).toBe(false);
        expect(scanner.progress).toEqual({
          scannedFiles: 0,
          scannedDirs: 0,
          totalSize: 0,
          currentPath: '',
          errors: [],
        });
      });
    });

    describe('generateSessionId', () => {
      it('should generate a session ID', () => {
        const scanner = new FileScanner();
        const id = scanner.generateSessionId();
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });

      it('should generate unique IDs', () => {
        const scanner = new FileScanner();
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
          ids.add(scanner.generateSessionId());
        }
        expect(ids.size).toBe(100);
      });
    });

    describe('reset', () => {
      it('should reset scanner state', () => {
        const scanner = new FileScanner();
        scanner.isScanning = true;
        scanner.isCancelled = true;
        scanner.progress.scannedFiles = 100;

        scanner.reset();

        expect(scanner.sessionId).not.toBeNull();
        expect(scanner.isScanning).toBe(false);
        expect(scanner.isCancelled).toBe(false);
        expect(scanner.progress.scannedFiles).toBe(0);
      });

      it('should generate new session ID on reset', () => {
        const scanner = new FileScanner();
        scanner.reset();
        const firstId = scanner.sessionId;

        scanner.reset();
        const secondId = scanner.sessionId;

        expect(firstId).not.toBe(secondId);
      });
    });

    describe('cancel', () => {
      it('should set isCancelled to true', () => {
        const scanner = new FileScanner();
        expect(scanner.isCancelled).toBe(false);

        scanner.cancel();

        expect(scanner.isCancelled).toBe(true);
      });
    });

    describe('getProgress', () => {
      it('should return copy of progress object', () => {
        const scanner = new FileScanner();
        scanner.progress.scannedFiles = 50;
        scanner.progress.totalSize = 1000;

        const progress = scanner.getProgress();

        expect(progress.scannedFiles).toBe(50);
        expect(progress.totalSize).toBe(1000);

        // Verify it's a copy
        progress.scannedFiles = 999;
        expect(scanner.progress.scannedFiles).toBe(50);
      });
    });

    describe('isRunning', () => {
      it('should return false initially', () => {
        const scanner = new FileScanner();
        expect(scanner.isRunning()).toBe(false);
      });

      it('should return true when scanning', () => {
        const scanner = new FileScanner();
        scanner.isScanning = true;
        expect(scanner.isRunning()).toBe(true);
      });
    });

    describe('scan', () => {
      it('should return error for invalid path', async () => {
        const scanner = new FileScanner();
        validateFilePath.mockImplementation(() => {
          throw new Error('Invalid path');
        });

        const result = await scanner.scan('');
        expect(result.success).toBe(false);
      });

      it('should return error when file system access not available', async () => {
        const scanner = new FileScanner();
        globalThis.window = { require: null };

        const result = await scanner.scan('/valid/path');

        expect(result.success).toBe(false);
        expect(result.error.message).toContain('File system access not available');
      });

      it('should return error when path is not a directory', async () => {
        const scanner = new FileScanner();
        const mockFs = {
          statSync: vi.fn().mockReturnValue({ isDirectory: () => false }),
          readdirSync: vi.fn(),
        };
        globalThis.window = {
          require: vi.fn(() => mockFs),
        };

        const result = await scanner.scan('/path/to/file.txt');

        expect(result.success).toBe(false);
        expect(result.error.message).toContain('not a directory');
      });

      it('should successfully scan directory with files', async () => {
        const scanner = new FileScanner();
        const mockStatSync = vi.fn().mockImplementation((filePath) => {
          if (filePath === '/test/dir') {
            return { isDirectory: () => true };
          }
          return { isDirectory: () => false, size: 1024 };
        });
        const mockReaddirSync = vi.fn().mockReturnValue([
          { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
          { name: 'file2.pdf', isDirectory: () => false, isFile: () => true },
        ]);
        const mockJoin = vi.fn((dir, name) => `${dir}/${name}`);

        globalThis.window = {
          require: vi.fn((module) => {
            if (module === 'fs') return { statSync: mockStatSync, readdirSync: mockReaddirSync };
            if (module === 'path') return { join: mockJoin };
            return null;
          }),
        };

        const result = await scanner.scan('/test/dir', { saveToDb: false });

        expect(result.success).toBe(true);
        expect(result.data.files).toHaveLength(2);
        expect(result.data.stats.totalFiles).toBe(2);
      });

      it('should skip system directories', async () => {
        const scanner = new FileScanner();
        const mockFs = {
          statSync: vi.fn().mockReturnValue({ isDirectory: () => true, size: 0 }),
          readdirSync: vi.fn().mockReturnValue([
            { name: 'node_modules', isDirectory: () => true, isFile: () => false },
            { name: '.git', isDirectory: () => true, isFile: () => false },
            { name: 'src', isDirectory: () => true, isFile: () => false },
          ]),
        };
        const mockPath = {
          join: vi.fn((dir, name) => `${dir}/${name}`),
        };

        globalThis.window = {
          require: vi.fn((module) => {
            if (module === 'fs') return mockFs;
            if (module === 'path') return mockPath;
            return null;
          }),
        };

        // Since this is recursive and we're mocking, we mainly verify it runs
        const result = await scanner.scan('/test/project', { saveToDb: false, maxDepth: 1 });
        expect(result.success).toBe(true);
      });

      it('should skip system files', async () => {
        const scanner = new FileScanner();
        const mockStatSync = vi.fn().mockImplementation((filePath) => {
          if (filePath === '/test/dir') {
            return { isDirectory: () => true };
          }
          return { isDirectory: () => false, size: 1024 };
        });
        const mockReaddirSync = vi.fn().mockReturnValue([
          { name: '.DS_Store', isDirectory: () => false, isFile: () => true },
          { name: 'Thumbs.db', isDirectory: () => false, isFile: () => true },
          { name: 'document.pdf', isDirectory: () => false, isFile: () => true },
        ]);
        const mockJoin = vi.fn((dir, name) => `${dir}/${name}`);

        globalThis.window = {
          require: vi.fn((module) => {
            if (module === 'fs') return { statSync: mockStatSync, readdirSync: mockReaddirSync };
            if (module === 'path') return { join: mockJoin };
            return null;
          }),
        };

        const result = await scanner.scan('/test/dir', { saveToDb: false });

        expect(result.success).toBe(true);
        expect(result.data.files).toHaveLength(1);
        expect(result.data.files[0].filename).toBe('document.pdf');
      });

      it('should call onProgress callback', async () => {
        const scanner = new FileScanner();
        const mockFs = {
          statSync: vi.fn().mockReturnValue({ isDirectory: () => true, size: 0 }),
          readdirSync: vi.fn().mockReturnValue([]),
        };

        globalThis.window = {
          require: vi.fn(() => mockFs),
        };

        const onProgress = vi.fn();
        await scanner.scan('/test/dir', { saveToDb: false, onProgress });

        expect(onProgress).toHaveBeenCalled();
      });

      it('should call onFile callback for each file', async () => {
        const scanner = new FileScanner();
        const mockFs = {
          statSync: vi.fn().mockImplementation((path) => {
            if (path === '/test/dir') {
              return { isDirectory: () => true };
            }
            return { isDirectory: () => false, size: 500 };
          }),
          readdirSync: vi
            .fn()
            .mockReturnValue([{ name: 'file.txt', isDirectory: () => false, isFile: () => true }]),
        };
        const mockPath = {
          join: vi.fn((dir, name) => `${dir}/${name}`),
        };

        globalThis.window = {
          require: vi.fn((module) => {
            if (module === 'fs') return mockFs;
            if (module === 'path') return mockPath;
            return null;
          }),
        };

        const onFile = vi.fn();
        await scanner.scan('/test/dir', { saveToDb: false, onFile });

        expect(onFile).toHaveBeenCalledWith(
          expect.objectContaining({
            filename: 'file.txt',
            file_extension: 'txt',
            file_type: 'document',
          })
        );
      });

      it('should save files to database when enabled', async () => {
        const scanner = new FileScanner();
        const mockFs = {
          statSync: vi.fn().mockImplementation((path) => {
            if (path === '/test/dir') {
              return { isDirectory: () => true };
            }
            return { isDirectory: () => false, size: 100 };
          }),
          readdirSync: vi
            .fn()
            .mockReturnValue([{ name: 'file.txt', isDirectory: () => false, isFile: () => true }]),
        };
        const mockPath = {
          join: vi.fn((dir, name) => `${dir}/${name}`),
        };

        globalThis.window = {
          require: vi.fn((module) => {
            if (module === 'fs') return mockFs;
            if (module === 'path') return mockPath;
            return null;
          }),
        };

        await scanner.scan('/test/dir', { saveToDb: true });

        expect(addScannedFile).toHaveBeenCalled();
      });

      it('should respect cancellation', async () => {
        const scanner = new FileScanner();
        const mockFs = {
          statSync: vi.fn().mockReturnValue({ isDirectory: () => true, size: 0 }),
          readdirSync: vi.fn().mockReturnValue([
            { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
            { name: 'file2.txt', isDirectory: () => false, isFile: () => true },
          ]),
        };
        const mockPath = {
          join: vi.fn((dir, name) => `${dir}/${name}`),
        };

        globalThis.window = {
          require: vi.fn((module) => {
            if (module === 'fs') return mockFs;
            if (module === 'path') return mockPath;
            return null;
          }),
        };

        // Cancel immediately
        scanner.cancel();

        const result = await scanner.scan('/test/dir', { saveToDb: false });
        expect(result.success).toBe(true);
        // Should have stopped early due to cancellation
      });
    });
  });

  // ===========================================================================
  // getScanner (Singleton) Tests
  // ===========================================================================

  describe('getScanner', () => {
    it('should return a FileScanner instance', () => {
      const scanner = getScanner();
      expect(scanner).toBeInstanceOf(FileScanner);
    });

    it('should return the same instance on multiple calls', () => {
      const scanner1 = getScanner();
      const scanner2 = getScanner();
      expect(scanner1).toBe(scanner2);
    });
  });

  // ===========================================================================
  // quickCount Tests (mocked)
  // ===========================================================================

  describe('quickCount', () => {
    it('should return zero counts when fs not available', () => {
      globalThis.window = { require: null };

      const result = quickCount('/some/path');

      expect(result.total).toBe(0);
      expect(result.byType).toEqual({});
    });

    it('should count files by type', () => {
      const mockFs = {
        readdirSync: vi.fn().mockReturnValue([
          { name: 'doc1.pdf', isFile: () => true },
          { name: 'doc2.pdf', isFile: () => true },
          { name: 'image.png', isFile: () => true },
          { name: 'folder', isFile: () => false },
        ]),
      };

      globalThis.window = {
        require: vi.fn(() => mockFs),
      };

      const result = quickCount('/test/dir');

      expect(result.total).toBe(3);
      expect(result.byType.document).toBe(2);
      expect(result.byType.image).toBe(1);
    });

    it('should skip system files', () => {
      const mockFs = {
        readdirSync: vi.fn().mockReturnValue([
          { name: '.DS_Store', isFile: () => true },
          { name: 'Thumbs.db', isFile: () => true },
          { name: 'real-file.txt', isFile: () => true },
        ]),
      };

      globalThis.window = {
        require: vi.fn(() => mockFs),
      };

      const result = quickCount('/test/dir');

      expect(result.total).toBe(1);
    });

    it('should handle read errors gracefully', () => {
      const mockFs = {
        readdirSync: vi.fn().mockImplementation(() => {
          throw new Error('Permission denied');
        }),
      };

      globalThis.window = {
        require: vi.fn(() => mockFs),
      };

      const result = quickCount('/protected/dir');

      expect(result.total).toBe(0);
      expect(result.byType).toEqual({});
    });
  });

  // ===========================================================================
  // listSubdirectories Tests (mocked)
  // ===========================================================================

  describe('listSubdirectories', () => {
    it('should return empty array when fs not available', () => {
      globalThis.window = { require: null };

      const result = listSubdirectories('/some/path');

      expect(result).toEqual([]);
    });

    it('should list subdirectories', () => {
      const mockFs = {
        readdirSync: vi.fn().mockReturnValue([
          { name: 'folder1', isDirectory: () => true },
          { name: 'folder2', isDirectory: () => true },
          { name: 'file.txt', isDirectory: () => false },
        ]),
      };
      const mockPath = {
        join: vi.fn((dir, name) => `${dir}/${name}`),
      };

      globalThis.window = {
        require: vi.fn((module) => {
          if (module === 'fs') return mockFs;
          if (module === 'path') return mockPath;
          return null;
        }),
      };

      const result = listSubdirectories('/test/dir');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'folder1', path: '/test/dir/folder1' });
      expect(result[1]).toEqual({ name: 'folder2', path: '/test/dir/folder2' });
    });

    it('should skip system directories', () => {
      const mockFs = {
        readdirSync: vi.fn().mockReturnValue([
          { name: 'node_modules', isDirectory: () => true },
          { name: '.git', isDirectory: () => true },
          { name: '.hidden', isDirectory: () => true },
          { name: 'src', isDirectory: () => true },
        ]),
      };
      const mockPath = {
        join: vi.fn((dir, name) => `${dir}/${name}`),
      };

      globalThis.window = {
        require: vi.fn((module) => {
          if (module === 'fs') return mockFs;
          if (module === 'path') return mockPath;
          return null;
        }),
      };

      const result = listSubdirectories('/test/project');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('src');
    });

    it('should sort directories alphabetically', () => {
      const mockFs = {
        readdirSync: vi.fn().mockReturnValue([
          { name: 'zebra', isDirectory: () => true },
          { name: 'apple', isDirectory: () => true },
          { name: 'mango', isDirectory: () => true },
        ]),
      };
      const mockPath = {
        join: vi.fn((dir, name) => `${dir}/${name}`),
      };

      globalThis.window = {
        require: vi.fn((module) => {
          if (module === 'fs') return mockFs;
          if (module === 'path') return mockPath;
          return null;
        }),
      };

      const result = listSubdirectories('/test/dir');

      expect(result[0].name).toBe('apple');
      expect(result[1].name).toBe('mango');
      expect(result[2].name).toBe('zebra');
    });

    it('should handle read errors gracefully', () => {
      const mockFs = {
        readdirSync: vi.fn().mockImplementation(() => {
          throw new Error('Permission denied');
        }),
      };

      globalThis.window = {
        require: vi.fn(() => mockFs),
      };

      const result = listSubdirectories('/protected/dir');

      expect(result).toEqual([]);
    });
  });
});
