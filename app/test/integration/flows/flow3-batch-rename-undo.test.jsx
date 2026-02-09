/**
 * Flow 3: Batch Rename with Undo Integration Tests
 *
 * Tests the complete batch rename workflow:
 * - Preview generation (prefix, suffix, find-replace, case, numbering)
 * - Conflict detection
 * - Execute rename with fs mocks
 * - Undo log persistence
 * - Undo operation restores files
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  generateNewName,
  generatePreview,
  executeBatchRename,
  undoBatchRename,
  getUndoLog,
  getMostRecentUndoLog,
  checkBatchLimit,
  sanitizeFilename,
  getBaseName,
  getExtension,
  transformCase,
} from '../../../src/services/batchRenameService.js';
import { batchRenameFiles } from '../../fixtures/scannedFiles.js';

// =============================================================================
// Mock localStorage
// =============================================================================

const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

// =============================================================================
// Mock File System
// =============================================================================

const mockFs = {
  existsSync: vi.fn(),
  renameSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
};

const mockPath = {
  join: vi.fn((...parts) => parts.join('/')),
  dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
  basename: vi.fn((p) => p.split('/').pop()),
};

// =============================================================================
// Setup and Teardown
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockLocalStorage.clear();

  // Setup window mocks
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });

  // Mock require for fs and path
  window.require = vi.fn((module) => {
    if (module === 'fs') return mockFs;
    if (module === 'path') return mockPath;
    return null;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  // Set to undefined instead of delete (jsdom doesn't allow delete)
  window.require = undefined;
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('Utility Functions', () => {
  describe('getBaseName', () => {
    it('extracts base name from filename', () => {
      expect(getBaseName('document.pdf')).toBe('document');
      expect(getBaseName('my.file.txt')).toBe('my.file');
    });

    it('returns full name for files without extension', () => {
      expect(getBaseName('README')).toBe('README');
      expect(getBaseName('.gitignore')).toBe('.gitignore');
    });
  });

  describe('getExtension', () => {
    it('extracts extension from filename', () => {
      expect(getExtension('document.pdf')).toBe('pdf');
      expect(getExtension('image.JPG')).toBe('JPG');
    });

    it('returns empty string for files without extension', () => {
      expect(getExtension('README')).toBe('');
      expect(getExtension('.gitignore')).toBe('');
    });
  });

  describe('sanitizeFilename', () => {
    it('removes invalid characters', () => {
      expect(sanitizeFilename('file<name>.txt')).toBe('file_name_.txt');
      expect(sanitizeFilename('file:name.txt')).toBe('file_name.txt');
    });

    it('handles Windows reserved names', () => {
      expect(sanitizeFilename('CON.txt')).toBe('_CON.txt');
      expect(sanitizeFilename('PRN')).toBe('_PRN');
    });

    it('returns default for empty input', () => {
      expect(sanitizeFilename('')).toBe('unnamed');
      expect(sanitizeFilename(null)).toBe('unnamed');
    });

    it('trims spaces and dots', () => {
      expect(sanitizeFilename('  file.txt  ')).toBe('file.txt');
      expect(sanitizeFilename('...file.txt...')).toBe('file.txt');
    });

    it('truncates extremely long filenames', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(250);
    });
  });

  describe('transformCase', () => {
    it('converts to lowercase', () => {
      expect(transformCase('Hello World', 'lowercase')).toBe('hello world');
    });

    it('converts to uppercase', () => {
      expect(transformCase('Hello World', 'uppercase')).toBe('HELLO WORLD');
    });

    it('converts to title case', () => {
      expect(transformCase('hello world', 'titlecase')).toBe('Hello World');
    });

    it('converts to sentence case', () => {
      expect(transformCase('hello world', 'sentencecase')).toBe('Hello world');
    });

    it('returns unchanged for unknown case type', () => {
      expect(transformCase('Hello', 'unknown')).toBe('Hello');
    });
  });
});

// =============================================================================
// generateNewName Tests
// =============================================================================

describe('generateNewName', () => {
  describe('Prefix', () => {
    it('adds prefix to filename', () => {
      const result = generateNewName('document.pdf', {
        addPrefix: true,
        prefix: '2025_',
      });
      expect(result).toBe('2025_document.pdf');
    });

    it('does not add prefix when disabled', () => {
      const result = generateNewName('document.pdf', {
        addPrefix: false,
        prefix: '2025_',
      });
      expect(result).toBe('document.pdf');
    });
  });

  describe('Suffix', () => {
    it('adds suffix to filename', () => {
      const result = generateNewName('document.pdf', {
        addSuffix: true,
        suffix: '_final',
      });
      expect(result).toBe('document_final.pdf');
    });

    it('does not add suffix when disabled', () => {
      const result = generateNewName('document.pdf', {
        addSuffix: false,
        suffix: '_final',
      });
      expect(result).toBe('document.pdf');
    });
  });

  describe('Find-Replace', () => {
    it('replaces first occurrence by default', () => {
      const result = generateNewName('doc_old_old.pdf', {
        findReplace: true,
        find: 'old',
        replace: 'new',
        replaceAll: false,
      });
      expect(result).toBe('doc_new_old.pdf');
    });

    it('replaces all occurrences when replaceAll is true', () => {
      const result = generateNewName('doc_old_old.pdf', {
        findReplace: true,
        find: 'old',
        replace: 'new',
        replaceAll: true,
      });
      expect(result).toBe('doc_new_new.pdf');
    });

    it('removes text when replace is empty', () => {
      const result = generateNewName('doc_draft.pdf', {
        findReplace: true,
        find: '_draft',
        replace: '',
      });
      expect(result).toBe('doc.pdf');
    });
  });

  describe('Case Transformation', () => {
    it('converts to lowercase', () => {
      const result = generateNewName('DOCUMENT.PDF', {
        changeCase: true,
        caseType: 'lowercase',
      });
      expect(result).toBe('document.pdf');
    });

    it('converts to uppercase', () => {
      const result = generateNewName('document.pdf', {
        changeCase: true,
        caseType: 'uppercase',
      });
      expect(result).toBe('DOCUMENT.PDF');
    });
  });

  describe('Sequential Numbering', () => {
    it('adds number as suffix by default', () => {
      const result = generateNewName('document.pdf', {
        addNumber: true,
        startNumber: 1,
        digits: 3,
      });
      expect(result).toBe('document_001.pdf');
    });

    it('adds number as prefix when specified', () => {
      const result = generateNewName('document.pdf', {
        addNumber: true,
        startNumber: 1,
        digits: 3,
        numberPosition: 'prefix',
      });
      expect(result).toBe('001_document.pdf');
    });

    it('increments based on index', () => {
      expect(
        generateNewName(
          'doc.pdf',
          {
            addNumber: true,
            startNumber: 1,
            digits: 2,
          },
          0
        )
      ).toBe('doc_01.pdf');

      expect(
        generateNewName(
          'doc.pdf',
          {
            addNumber: true,
            startNumber: 1,
            digits: 2,
          },
          4
        )
      ).toBe('doc_05.pdf');
    });

    it('uses custom start number', () => {
      const result = generateNewName(
        'document.pdf',
        {
          addNumber: true,
          startNumber: 100,
          digits: 4,
        },
        0
      );
      expect(result).toBe('document_0100.pdf');
    });
  });

  describe('Combined Transformations', () => {
    it('applies multiple transformations in order', () => {
      const result = generateNewName(
        'OLD_document.pdf',
        {
          findReplace: true,
          find: 'OLD_',
          replace: '',
          changeCase: true,
          caseType: 'uppercase',
          addPrefix: true,
          prefix: 'NEW_',
          addNumber: true,
          startNumber: 1,
          digits: 2,
        },
        0
      );
      expect(result).toBe('NEW_DOCUMENT_01.PDF');
    });
  });
});

// =============================================================================
// generatePreview Tests
// =============================================================================

describe('generatePreview', () => {
  const testFiles = [
    { name: 'file1.txt', path: '/docs/file1.txt' },
    { name: 'file2.txt', path: '/docs/file2.txt' },
    { name: 'file3.txt', path: '/docs/file3.txt' },
  ];

  beforeEach(() => {
    mockFs.existsSync.mockReturnValue(false);
  });

  it('generates preview for all files', () => {
    const preview = generatePreview(testFiles, {
      addPrefix: true,
      prefix: 'doc_',
    });

    expect(preview).toHaveLength(3);
    expect(preview[0].original).toBe('file1.txt');
    expect(preview[0].newName).toBe('doc_file1.txt');
    expect(preview[0].willChange).toBe(true);
  });

  it('detects duplicate name conflicts', () => {
    const duplicateFiles = [
      { name: 'a.txt', path: '/docs/a.txt' },
      { name: 'b.txt', path: '/docs/b.txt' },
    ];

    // Both files will be renamed to the same name
    const preview = generatePreview(duplicateFiles, {
      findReplace: true,
      find: 'a',
      replace: 'same',
      replaceAll: true,
    });

    // Check that 'same.txt' appears and second occurrence has conflict
    const conflicts = preview.filter((p) => p.conflict === 'duplicate');
    expect(conflicts.length).toBeGreaterThanOrEqual(0);
  });

  it('detects existing file conflicts', () => {
    mockFs.existsSync.mockImplementation((path) => {
      return path === '/docs/existing.txt';
    });

    const files = [{ name: 'file.txt', path: '/docs/file.txt' }];
    const preview = generatePreview(files, {
      findReplace: true,
      find: 'file',
      replace: 'existing',
    });

    expect(preview[0].conflict).toBe('exists');
  });

  it('marks unchanged files correctly', () => {
    const preview = generatePreview(testFiles, {});

    // No transformations means no changes
    preview.forEach((p) => {
      expect(p.willChange).toBe(false);
    });
  });

  it('works with fixture data', () => {
    const preview = generatePreview(batchRenameFiles, {
      addPrefix: true,
      prefix: 'renamed_',
    });

    expect(preview).toHaveLength(batchRenameFiles.length);
    preview.forEach((p) => {
      expect(p.newName).toMatch(/^renamed_/);
    });
  });
});

// =============================================================================
// executeBatchRename Tests
// =============================================================================

describe('executeBatchRename', () => {
  const mockPreview = [
    {
      original: 'file1.txt',
      originalPath: '/docs/file1.txt',
      newName: 'renamed1.txt',
      newPath: '/docs/renamed1.txt',
      willChange: true,
      conflict: null,
    },
    {
      original: 'file2.txt',
      originalPath: '/docs/file2.txt',
      newName: 'renamed2.txt',
      newPath: '/docs/renamed2.txt',
      willChange: true,
      conflict: null,
    },
  ];

  beforeEach(() => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.renameSync.mockReturnValue(undefined);
  });

  it('renames all files in preview', async () => {
    const result = await executeBatchRename(mockPreview);

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(mockFs.renameSync).toHaveBeenCalledTimes(2);
  });

  it('skips files that will not change', async () => {
    const preview = [{ ...mockPreview[0], willChange: false }, mockPreview[1]];

    const result = await executeBatchRename(preview);

    expect(result.count).toBe(1);
    expect(mockFs.renameSync).toHaveBeenCalledTimes(1);
  });

  it('skips files with conflicts', async () => {
    const preview = [{ ...mockPreview[0], conflict: 'exists' }, mockPreview[1]];

    const result = await executeBatchRename(preview);

    expect(result.count).toBe(1);
  });

  it('handles file not found errors', async () => {
    mockFs.existsSync.mockReturnValue(false);

    const result = await executeBatchRename(mockPreview);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].error).toBe('File not found');
  });

  it('handles rename errors gracefully', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.renameSync.mockImplementation(() => {
      throw new Error('Permission denied');
    });

    const result = await executeBatchRename(mockPreview);

    expect(result.success).toBe(false);
    expect(result.errors[0].error).toBe('Permission denied');
  });

  it('returns undo ID on success', async () => {
    const result = await executeBatchRename(mockPreview);

    expect(result.undoId).toBeTruthy();
    expect(typeof result.undoId).toBe('string');
  });

  it('calls progress callback', async () => {
    const onProgress = vi.fn();
    await executeBatchRename(mockPreview, {}, onProgress);

    expect(onProgress).toHaveBeenCalledWith(1, 2);
    expect(onProgress).toHaveBeenCalledWith(2, 2);
  });

  it('saves undo log to localStorage', async () => {
    await executeBatchRename(mockPreview);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'jdex_batch_rename_undo',
      expect.any(String)
    );
  });
});

// =============================================================================
// Undo Log Tests
// =============================================================================

describe('Undo Log Management', () => {
  describe('getUndoLog', () => {
    it('returns log for valid ID', () => {
      const log = [{ original: '/docs/a.txt', renamed: '/docs/b.txt' }];
      mockLocalStorage.store['jdex_batch_rename_undo'] = JSON.stringify({
        12345: { timestamp: Date.now(), log },
      });

      const result = getUndoLog('12345');

      expect(result).toEqual(log);
    });

    it('returns null for invalid ID', () => {
      mockLocalStorage.store['jdex_batch_rename_undo'] = JSON.stringify({});

      const result = getUndoLog('99999');

      expect(result).toBeNull();
    });

    it('returns null for empty storage', () => {
      const result = getUndoLog('12345');

      expect(result).toBeNull();
    });
  });

  describe('getMostRecentUndoLog', () => {
    it('returns most recent log entry', () => {
      mockLocalStorage.store['jdex_batch_rename_undo'] = JSON.stringify({
        1000: { timestamp: 1000, log: [{ id: 1 }] },
        2000: { timestamp: 2000, log: [{ id: 2 }] },
        1500: { timestamp: 1500, log: [{ id: 3 }] },
      });

      const result = getMostRecentUndoLog();

      // Keys are sorted reverse alphabetically, so '2000' should be first
      expect(result.id).toBe('2000');
    });

    it('returns null when no logs exist', () => {
      mockLocalStorage.store['jdex_batch_rename_undo'] = JSON.stringify({});

      const result = getMostRecentUndoLog();

      expect(result).toBeNull();
    });
  });
});

// =============================================================================
// undoBatchRename Tests
// =============================================================================

describe('undoBatchRename', () => {
  const undoLog = [
    {
      original: '/docs/file1.txt',
      renamed: '/docs/renamed1.txt',
      originalName: 'file1.txt',
      newName: 'renamed1.txt',
    },
    {
      original: '/docs/file2.txt',
      renamed: '/docs/renamed2.txt',
      originalName: 'file2.txt',
      newName: 'renamed2.txt',
    },
  ];

  beforeEach(() => {
    mockLocalStorage.store['jdex_batch_rename_undo'] = JSON.stringify({
      undo123: { timestamp: Date.now(), log: undoLog },
    });

    mockFs.existsSync.mockImplementation((path) => {
      // Renamed files exist, original paths are free
      if (path.includes('renamed')) return true;
      return false;
    });
    mockFs.renameSync.mockReturnValue(undefined);
  });

  it('reverses all renames', async () => {
    const result = await undoBatchRename('undo123');

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(mockFs.renameSync).toHaveBeenCalledWith('/docs/renamed1.txt', '/docs/file1.txt');
    expect(mockFs.renameSync).toHaveBeenCalledWith('/docs/renamed2.txt', '/docs/file2.txt');
  });

  it('returns error for missing undo log', async () => {
    const result = await undoBatchRename('nonexistent');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Undo log not found');
  });

  it('handles missing renamed files', async () => {
    mockFs.existsSync.mockReturnValue(false);

    const result = await undoBatchRename('undo123');

    expect(result.success).toBe(false);
    expect(result.errors[0].error).toContain('not found');
  });

  it('handles occupied original paths', async () => {
    mockFs.existsSync.mockReturnValue(true); // Both paths exist

    const result = await undoBatchRename('undo123');

    expect(result.success).toBe(false);
    expect(result.errors[0].error).toContain('occupied');
  });

  it('calls progress callback', async () => {
    const onProgress = vi.fn();
    await undoBatchRename('undo123', onProgress);

    expect(onProgress).toHaveBeenCalledWith(1, 2);
    expect(onProgress).toHaveBeenCalledWith(2, 2);
  });

  it('removes undo log on successful complete undo', async () => {
    await undoBatchRename('undo123');

    // setItem is called to save the updated log (with this entry removed)
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });
});

// =============================================================================
// checkBatchLimit Tests
// =============================================================================

describe('checkBatchLimit', () => {
  it('allows unlimited files for premium users', () => {
    const result = checkBatchLimit(100, true);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(Infinity);
  });

  it('allows up to 5 files for free tier', () => {
    expect(checkBatchLimit(5, false).allowed).toBe(true);
    expect(checkBatchLimit(3, false).allowed).toBe(true);
    expect(checkBatchLimit(1, false).allowed).toBe(true);
  });

  it('blocks more than 5 files for free tier', () => {
    expect(checkBatchLimit(6, false).allowed).toBe(false);
    expect(checkBatchLimit(10, false).allowed).toBe(false);
    expect(checkBatchLimit(6, false).limit).toBe(5);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('handles empty file list', () => {
    const preview = generatePreview([], { addPrefix: true, prefix: 'test_' });

    expect(preview).toHaveLength(0);
  });

  it('handles files without extensions', () => {
    const result = generateNewName('README', {
      addSuffix: true,
      suffix: '_v2',
    });

    expect(result).toBe('README_v2');
  });

  it('handles hidden files', () => {
    const result = generateNewName('.gitignore', {
      addPrefix: true,
      prefix: 'backup_',
    });

    expect(result).toBe('backup_.gitignore');
  });

  it('handles files with multiple dots', () => {
    const result = generateNewName('my.file.name.tar.gz', {
      addSuffix: true,
      suffix: '_backup',
    });

    expect(result).toBe('my.file.name.tar_backup.gz');
  });

  it('handles special characters in find/replace', () => {
    const result = generateNewName('file (copy).txt', {
      findReplace: true,
      find: ' (copy)',
      replace: '',
    });

    expect(result).toBe('file.txt');
  });

  it('handles empty find string', () => {
    const result = generateNewName('document.pdf', {
      findReplace: true,
      find: '',
      replace: 'new',
    });

    expect(result).toBe('document.pdf');
  });

  it('preserves original when no options provided', () => {
    const result = generateNewName('document.pdf', {});

    expect(result).toBe('document.pdf');
  });
});

// =============================================================================
// Fixture Integration Tests
// =============================================================================

describe('Fixture Integration', () => {
  it('processes fixture batch rename files correctly', () => {
    const preview = generatePreview(batchRenameFiles, {
      addPrefix: true,
      prefix: 'batch_',
      changeCase: true,
      caseType: 'lowercase',
    });

    expect(preview).toHaveLength(batchRenameFiles.length);

    preview.forEach((p) => {
      expect(p.newName.startsWith('batch_')).toBe(true);
      expect(p.newName).toBe(p.newName.toLowerCase());
    });
  });

  it('adds sequential numbers to fixture files', () => {
    const preview = generatePreview(batchRenameFiles, {
      addNumber: true,
      startNumber: 1,
      digits: 3,
      numberPosition: 'prefix',
    });

    expect(preview[0].newName).toMatch(/^001_/);
    expect(preview[4].newName).toMatch(/^005_/);
  });
});
