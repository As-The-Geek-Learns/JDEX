/**
 * Batch Rename Service Tests
 * ==========================
 * Tests for batch file renaming operations.
 *
 * Test categories:
 * 1. Pure functions (getBaseName, getExtension, sanitizeFilename, transformCase)
 * 2. Name generation (generateNewName with various options)
 * 3. Batch limits (checkBatchLimit)
 * 4. Preview generation (with fs/path mocks)
 * 5. Undo log operations (localStorage)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  getBaseName,
  getExtension,
  sanitizeFilename,
  transformCase,
  generateNewName,
  generatePreview,
  checkBatchLimit,
  getUndoLog,
  getMostRecentUndoLog,
} from './batchRenameService.js';

// =============================================================================
// Test Suite
// =============================================================================

describe('batchRenameService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ===========================================================================
  // getBaseName Tests
  // ===========================================================================

  describe('getBaseName', () => {
    it('should return filename without extension', () => {
      expect(getBaseName('document.pdf')).toBe('document');
    });

    it('should handle multiple dots in filename', () => {
      expect(getBaseName('my.file.name.txt')).toBe('my.file.name');
    });

    it('should return full name if no extension', () => {
      expect(getBaseName('README')).toBe('README');
    });

    it('should handle dotfiles (hidden files)', () => {
      expect(getBaseName('.gitignore')).toBe('.gitignore');
    });

    it('should handle empty string', () => {
      expect(getBaseName('')).toBe('');
    });

    it('should handle file starting with dot and having extension', () => {
      expect(getBaseName('.eslintrc.json')).toBe('.eslintrc');
    });
  });

  // ===========================================================================
  // getExtension Tests
  // ===========================================================================

  describe('getExtension', () => {
    it('should return extension without dot', () => {
      expect(getExtension('document.pdf')).toBe('pdf');
    });

    it('should return last extension for multiple dots', () => {
      expect(getExtension('archive.tar.gz')).toBe('gz');
    });

    it('should return empty string if no extension', () => {
      expect(getExtension('README')).toBe('');
    });

    it('should return empty string for dotfiles', () => {
      expect(getExtension('.gitignore')).toBe('');
    });

    it('should handle empty string', () => {
      expect(getExtension('')).toBe('');
    });

    it('should return extension for dotfile with extension', () => {
      expect(getExtension('.eslintrc.json')).toBe('json');
    });
  });

  // ===========================================================================
  // sanitizeFilename Tests
  // ===========================================================================

  describe('sanitizeFilename', () => {
    it('should return valid filename unchanged', () => {
      expect(sanitizeFilename('valid-file_name.txt')).toBe('valid-file_name.txt');
    });

    it('should replace invalid characters with underscore', () => {
      expect(sanitizeFilename('file<>:"/\\|?*.txt')).toBe('file_________.txt');
    });

    it('should handle null/undefined input', () => {
      expect(sanitizeFilename(null)).toBe('unnamed');
      expect(sanitizeFilename(undefined)).toBe('unnamed');
      expect(sanitizeFilename('')).toBe('unnamed');
    });

    it('should trim spaces from ends', () => {
      expect(sanitizeFilename('  file.txt  ')).toBe('file.txt');
    });

    it('should remove leading/trailing dots', () => {
      expect(sanitizeFilename('...file...')).toBe('file');
    });

    it('should prefix Windows reserved names', () => {
      expect(sanitizeFilename('CON')).toBe('_CON');
      expect(sanitizeFilename('PRN.txt')).toBe('_PRN.txt');
      expect(sanitizeFilename('AUX')).toBe('_AUX');
      expect(sanitizeFilename('NUL')).toBe('_NUL');
      expect(sanitizeFilename('COM1')).toBe('_COM1');
      expect(sanitizeFilename('LPT1.doc')).toBe('_LPT1.doc');
    });

    it('should handle reserved names case-insensitively', () => {
      expect(sanitizeFilename('con')).toBe('_con');
      expect(sanitizeFilename('Con.txt')).toBe('_Con.txt');
    });

    it('should truncate filenames over 250 characters', () => {
      const longName = 'a'.repeat(260) + '.txt';
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(250);
      expect(result.endsWith('.txt')).toBe(true);
    });

    it('should return unnamed for only dots', () => {
      expect(sanitizeFilename('...')).toBe('unnamed');
    });
  });

  // ===========================================================================
  // transformCase Tests
  // ===========================================================================

  describe('transformCase', () => {
    it('should convert to lowercase', () => {
      expect(transformCase('Hello World', 'lowercase')).toBe('hello world');
    });

    it('should convert to uppercase', () => {
      expect(transformCase('Hello World', 'uppercase')).toBe('HELLO WORLD');
    });

    it('should convert to titlecase', () => {
      expect(transformCase('hello world', 'titlecase')).toBe('Hello World');
    });

    it('should convert to sentencecase', () => {
      expect(transformCase('HELLO WORLD', 'sentencecase')).toBe('Hello world');
    });

    it('should return unchanged for unknown case type', () => {
      expect(transformCase('Hello World', 'unknown')).toBe('Hello World');
    });

    it('should return unchanged for no case type', () => {
      expect(transformCase('Hello World', null)).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(transformCase('', 'uppercase')).toBe('');
    });

    it('should handle single character', () => {
      expect(transformCase('a', 'uppercase')).toBe('A');
      expect(transformCase('A', 'lowercase')).toBe('a');
    });
  });

  // ===========================================================================
  // generateNewName Tests
  // ===========================================================================

  describe('generateNewName', () => {
    it('should return original name with no options', () => {
      const result = generateNewName('document.pdf', {});
      expect(result).toBe('document.pdf');
    });

    describe('findReplace option', () => {
      it('should replace first occurrence by default', () => {
        const result = generateNewName('foo-bar-foo.txt', {
          findReplace: true,
          find: 'foo',
          replace: 'baz',
        });
        expect(result).toBe('baz-bar-foo.txt');
      });

      it('should replace all occurrences with replaceAll', () => {
        const result = generateNewName('foo-bar-foo.txt', {
          findReplace: true,
          find: 'foo',
          replace: 'baz',
          replaceAll: true,
        });
        expect(result).toBe('baz-bar-baz.txt');
      });

      it('should handle empty replace (deletion)', () => {
        const result = generateNewName('prefix_file.txt', {
          findReplace: true,
          find: 'prefix_',
          replace: '',
        });
        expect(result).toBe('file.txt');
      });
    });

    describe('changeCase option', () => {
      it('should change basename to lowercase', () => {
        const result = generateNewName('MyDocument.PDF', {
          changeCase: true,
          caseType: 'lowercase',
        });
        expect(result).toBe('mydocument.pdf');
      });

      it('should change basename to uppercase', () => {
        const result = generateNewName('MyDocument.pdf', {
          changeCase: true,
          caseType: 'uppercase',
        });
        expect(result).toBe('MYDOCUMENT.PDF');
      });

      it('should change basename to titlecase', () => {
        const result = generateNewName('my document.txt', {
          changeCase: true,
          caseType: 'titlecase',
        });
        expect(result).toBe('My Document.txt');
      });
    });

    describe('addPrefix option', () => {
      it('should add prefix to filename', () => {
        const result = generateNewName('file.txt', {
          addPrefix: true,
          prefix: '2026-02-08_',
        });
        expect(result).toBe('2026-02-08_file.txt');
      });

      it('should sanitize prefix', () => {
        const result = generateNewName('file.txt', {
          addPrefix: true,
          prefix: '<script>',
        });
        // sanitizeText should handle this
        expect(result).not.toContain('<script>');
      });
    });

    describe('addSuffix option', () => {
      it('should add suffix to filename', () => {
        const result = generateNewName('file.txt', {
          addSuffix: true,
          suffix: '_backup',
        });
        expect(result).toBe('file_backup.txt');
      });
    });

    describe('addNumber option', () => {
      it('should add sequential number as suffix', () => {
        const result = generateNewName('file.txt', {
          addNumber: true,
          startNumber: 1,
          digits: 3,
        });
        expect(result).toBe('file_001.txt');
      });

      it('should add sequential number as prefix', () => {
        const result = generateNewName('file.txt', {
          addNumber: true,
          startNumber: 1,
          digits: 3,
          numberPosition: 'prefix',
        });
        expect(result).toBe('001_file.txt');
      });

      it('should use index for sequential numbering', () => {
        const result = generateNewName(
          'file.txt',
          { addNumber: true, startNumber: 10, digits: 4 },
          5
        );
        expect(result).toBe('file_0015.txt');
      });

      it('should default to 3 digits', () => {
        const result = generateNewName('file.txt', { addNumber: true, startNumber: 1 });
        expect(result).toBe('file_001.txt');
      });

      it('should default to start at 1', () => {
        const result = generateNewName('file.txt', { addNumber: true, digits: 2 });
        expect(result).toBe('file_01.txt');
      });
    });

    describe('combined options', () => {
      it('should apply options in correct order', () => {
        // Order: findReplace → changeCase → addPrefix → addSuffix → addNumber
        const result = generateNewName('OLD_file.txt', {
          findReplace: true,
          find: 'OLD_',
          replace: '',
          changeCase: true,
          caseType: 'uppercase',
          addPrefix: true,
          prefix: 'NEW_',
          addSuffix: true,
          suffix: '_v2',
          addNumber: true,
          startNumber: 1,
          digits: 2,
        });
        expect(result).toBe('NEW_FILE_v2_01.TXT');
      });
    });

    describe('edge cases', () => {
      it('should handle file without extension', () => {
        const result = generateNewName('README', {
          addSuffix: true,
          suffix: '_backup',
        });
        expect(result).toBe('README_backup');
      });

      it('should handle dotfile', () => {
        const result = generateNewName('.gitignore', {
          addPrefix: true,
          prefix: 'backup_',
        });
        expect(result).toBe('backup_.gitignore');
      });
    });
  });

  // ===========================================================================
  // checkBatchLimit Tests
  // ===========================================================================

  describe('checkBatchLimit', () => {
    it('should allow any count for premium users', () => {
      const result = checkBatchLimit(100, true);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
    });

    it('should allow up to 5 files for free users', () => {
      expect(checkBatchLimit(5, false).allowed).toBe(true);
      expect(checkBatchLimit(3, false).allowed).toBe(true);
      expect(checkBatchLimit(1, false).allowed).toBe(true);
    });

    it('should reject more than 5 files for free users', () => {
      const result = checkBatchLimit(6, false);
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(5);
    });

    it('should return correct limit for free users', () => {
      const result = checkBatchLimit(10, false);
      expect(result.limit).toBe(5);
    });
  });

  // ===========================================================================
  // generatePreview Tests (with mocked window.require)
  // ===========================================================================

  describe('generatePreview', () => {
    beforeEach(() => {
      // Mock window.require for fs and path
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(false),
      };

      const mockPath = {
        join: vi.fn((...args) => args.join('/')),
        dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
      };

      vi.stubGlobal('window', {
        ...globalThis.window,
        require: vi.fn((module) => {
          if (module === 'fs') return mockFs;
          if (module === 'path') return mockPath;
          return null;
        }),
      });
    });

    afterEach(() => {
      // Restore original globals to prevent test leakage
      vi.unstubAllGlobals();
    });

    it('should generate preview for files', () => {
      const files = [
        { name: 'file1.txt', path: '/docs/file1.txt' },
        { name: 'file2.txt', path: '/docs/file2.txt' },
      ];

      const preview = generatePreview(files, {
        addPrefix: true,
        prefix: 'new_',
      });

      expect(preview).toHaveLength(2);
      expect(preview[0].original).toBe('file1.txt');
      expect(preview[0].newName).toBe('new_file1.txt');
      expect(preview[0].willChange).toBe(true);
    });

    it('should detect duplicate conflicts', () => {
      // Use files that will result in the same name after replacement
      // Note: generateNewName uses string.replace() which only handles string patterns
      const files = [
        { name: 'prefix_same.txt', path: '/docs/prefix_same.txt' },
        { name: 'other_same.txt', path: '/docs/other_same.txt' },
      ];

      // First file becomes 'other_same.txt', matching second file
      const preview = generatePreview(files, {
        findReplace: true,
        find: 'prefix_',
        replace: 'other_',
      });

      // Second file should have duplicate conflict since first becomes 'other_same.txt'
      const duplicates = preview.filter((p) => p.conflict === 'duplicate');
      expect(duplicates.length).toBeGreaterThanOrEqual(1);
    });

    it('should mark files with no change', () => {
      const files = [{ name: 'file.txt', path: '/docs/file.txt' }];

      const preview = generatePreview(files, {});

      expect(preview[0].willChange).toBe(false);
    });

    it('should detect existing file conflicts', () => {
      // Mock fs.existsSync to return true for conflict check
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
      };
      const mockPath = {
        join: vi.fn((...args) => args.join('/')),
        dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
      };

      vi.stubGlobal('window', {
        ...globalThis.window,
        require: vi.fn((module) => {
          if (module === 'fs') return mockFs;
          if (module === 'path') return mockPath;
          return null;
        }),
      });

      const files = [{ name: 'old.txt', path: '/docs/old.txt' }];

      const preview = generatePreview(files, {
        findReplace: true,
        find: 'old',
        replace: 'new',
      });

      expect(preview[0].conflict).toBe('exists');
    });
  });

  // ===========================================================================
  // Undo Log Tests
  // ===========================================================================

  describe('getUndoLog', () => {
    it('should return null for non-existent undo ID', () => {
      expect(getUndoLog('non-existent')).toBeNull();
    });

    it('should return stored undo log', () => {
      const undoData = {
        12345: {
          timestamp: Date.now(),
          log: [{ original: '/a.txt', renamed: '/b.txt' }],
        },
      };
      localStorage.setItem('jdex_batch_rename_undo', JSON.stringify(undoData));

      const log = getUndoLog('12345');
      expect(log).toEqual([{ original: '/a.txt', renamed: '/b.txt' }]);
    });

    it('should handle invalid JSON gracefully', () => {
      localStorage.setItem('jdex_batch_rename_undo', 'invalid-json');
      expect(getUndoLog('12345')).toBeNull();
    });
  });

  describe('getMostRecentUndoLog', () => {
    it('should return null when no undo logs exist', () => {
      expect(getMostRecentUndoLog()).toBeNull();
    });

    it('should return most recent undo log', () => {
      const undoData = {
        10000: { timestamp: 10000, log: [{ original: '/old.txt' }] },
        20000: { timestamp: 20000, log: [{ original: '/newer.txt' }] },
        15000: { timestamp: 15000, log: [{ original: '/middle.txt' }] },
      };
      localStorage.setItem('jdex_batch_rename_undo', JSON.stringify(undoData));

      const recent = getMostRecentUndoLog();
      // Keys are sorted, so '20000' is the highest/most recent
      expect(recent.id).toBe('20000');
      expect(recent.log[0].original).toBe('/newer.txt');
    });

    it('should handle invalid JSON gracefully', () => {
      localStorage.setItem('jdex_batch_rename_undo', 'not-json');
      expect(getMostRecentUndoLog()).toBeNull();
    });
  });
});
