/**
 * Scanned Files Repository Tests
 * ==============================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  VALID_DECISIONS,
  VALID_CONFIDENCE_LEVELS,
  generateScanSessionId,
  clearScannedFiles,
  getScannedFiles,
  getScannedFile,
  getFilesReadyToOrganize,
  getScanStats,
  getScannedFileCount,
  addScannedFile,
  addScannedFilesBatch,
  updateScannedFileDecision,
  acceptScannedFileSuggestion,
  skipScannedFile,
  changeScannedFileTarget,
  updateScannedFileSuggestion,
  deleteScannedFile,
} from '../scanned-files.js';

// Mock dependencies
vi.mock('../utils.js', () => ({
  getDB: vi.fn(),
  saveDatabase: vi.fn(),
  validatePositiveInteger: vi.fn((val, name) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      throw new Error(`${name} must be a positive integer`);
    }
    return num;
  }),
  getLastInsertId: vi.fn(() => 1),
}));

vi.mock('../../../utils/validation.js', () => ({
  validateRequiredString: vi.fn((val, name, _max) => {
    if (!val || typeof val !== 'string' || val.trim() === '') {
      throw new Error(`${name} is required`);
    }
    return val.trim();
  }),
  sanitizeText: vi.fn((val) => (val ? val.trim() : '')),
}));

vi.mock('../../../utils/errors.js', () => ({
  DatabaseError: class DatabaseError extends Error {
    constructor(message, operation) {
      super(message);
      this.name = 'DatabaseError';
      this.operation = operation;
    }
  },
}));

import { getDB, saveDatabase, getLastInsertId } from '../utils.js';
import { validateRequiredString } from '../../../utils/validation.js';

// ============================================
// CONSTANTS
// ============================================

describe('Constants', () => {
  it('exports valid decisions', () => {
    expect(VALID_DECISIONS).toEqual(['pending', 'accepted', 'changed', 'skipped']);
  });

  it('exports valid confidence levels', () => {
    expect(VALID_CONFIDENCE_LEVELS).toEqual(['none', 'low', 'medium', 'high']);
  });
});

// ============================================
// SESSION MANAGEMENT
// ============================================

describe('generateScanSessionId', () => {
  it('generates a unique session ID with timestamp', () => {
    const id = generateScanSessionId();
    expect(id).toMatch(/^scan_\d+$/);
  });

  it('generates different IDs on consecutive calls', async () => {
    const id1 = generateScanSessionId();
    await new Promise((resolve) => setTimeout(resolve, 2));
    const id2 = generateScanSessionId();
    expect(id1).not.toBe(id2);
  });
});

describe('clearScannedFiles', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('clears all scanned files when no session ID provided', () => {
    clearScannedFiles();

    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM scanned_files');
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('clears files for specific session when session ID provided', () => {
    clearScannedFiles('scan_123');

    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM scanned_files WHERE scan_session_id = ?', [
      'scan_123',
    ]);
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('validates session ID when provided', () => {
    clearScannedFiles('scan_456');

    expect(validateRequiredString).toHaveBeenCalledWith('scan_456', 'Session ID', 50);
  });
});

// ============================================
// READ OPERATIONS
// ============================================

describe('getScannedFiles', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns scanned files for a session', () => {
    mockDb.exec.mockReturnValue([
      {
        values: [
          [
            1,
            'scan_123',
            'test.pdf',
            '/path/to/test.pdf',
            '/path/to',
            'pdf',
            'document',
            1024,
            '2026-01-01',
            '11.01',
            5,
            'high',
            'pending',
            null,
            '2026-01-01T00:00:00Z',
          ],
        ],
      },
    ]);

    const result = getScannedFiles('scan_123');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 1,
      scan_session_id: 'scan_123',
      filename: 'test.pdf',
      path: '/path/to/test.pdf',
      parent_folder: '/path/to',
      file_extension: 'pdf',
      file_type: 'document',
      file_size: 1024,
      file_modified_at: '2026-01-01',
      suggested_jd_folder: '11.01',
      suggested_rule_id: 5,
      suggestion_confidence: 'high',
      user_decision: 'pending',
      user_target_folder: null,
      scanned_at: '2026-01-01T00:00:00Z',
    });
  });

  it('returns empty array when no files found', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getScannedFiles('scan_123');

    expect(result).toEqual([]);
  });

  it('filters by decision when provided', () => {
    mockDb.exec.mockReturnValue([]);

    getScannedFiles('scan_123', { decision: 'accepted' });

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('AND user_decision = ?'),
      expect.arrayContaining(['scan_123', 'accepted'])
    );
  });

  it('ignores invalid decision filter', () => {
    mockDb.exec.mockReturnValue([]);

    getScannedFiles('scan_123', { decision: 'invalid' });

    const call = mockDb.exec.mock.calls[0];
    expect(call[0]).not.toContain('user_decision');
  });

  it('filters by file type when provided', () => {
    mockDb.exec.mockReturnValue([]);

    getScannedFiles('scan_123', { fileType: 'document' });

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('AND file_type = ?'),
      expect.arrayContaining(['scan_123', 'document'])
    );
  });

  it('filters for files with suggestions when hasSuggestion is true', () => {
    mockDb.exec.mockReturnValue([]);

    getScannedFiles('scan_123', { hasSuggestion: true });

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('AND suggested_jd_folder IS NOT NULL'),
      expect.any(Array)
    );
  });

  it('filters for files without suggestions when hasSuggestion is false', () => {
    mockDb.exec.mockReturnValue([]);

    getScannedFiles('scan_123', { hasSuggestion: false });

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('AND suggested_jd_folder IS NULL'),
      expect.any(Array)
    );
  });

  it('combines multiple filters', () => {
    mockDb.exec.mockReturnValue([]);

    getScannedFiles('scan_123', { decision: 'pending', fileType: 'image', hasSuggestion: true });

    const call = mockDb.exec.mock.calls[0];
    expect(call[0]).toContain('user_decision = ?');
    expect(call[0]).toContain('file_type = ?');
    expect(call[0]).toContain('suggested_jd_folder IS NOT NULL');
  });

  it('orders results by filename', () => {
    mockDb.exec.mockReturnValue([]);

    getScannedFiles('scan_123');

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY filename ASC'),
      expect.any(Array)
    );
  });
});

describe('getScannedFile', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = {
      bind: vi.fn(),
      step: vi.fn(),
      get: vi.fn(),
      free: vi.fn(),
    };
    mockDb = { prepare: vi.fn(() => mockStmt) };
    getDB.mockReturnValue(mockDb);
  });

  it('returns a scanned file by ID', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([
      1,
      'scan_123',
      'test.pdf',
      '/path/test.pdf',
      '/path',
      'pdf',
      'document',
      1024,
      '2026-01-01',
      '11.01',
      5,
      'high',
      'pending',
      null,
      '2026-01-01T00:00:00Z',
    ]);

    const result = getScannedFile(1);

    expect(result).toEqual({
      id: 1,
      scan_session_id: 'scan_123',
      filename: 'test.pdf',
      path: '/path/test.pdf',
      parent_folder: '/path',
      file_extension: 'pdf',
      file_type: 'document',
      file_size: 1024,
      file_modified_at: '2026-01-01',
      suggested_jd_folder: '11.01',
      suggested_rule_id: 5,
      suggestion_confidence: 'high',
      user_decision: 'pending',
      user_target_folder: null,
      scanned_at: '2026-01-01T00:00:00Z',
    });
    expect(mockStmt.free).toHaveBeenCalled();
  });

  it('returns null when file not found', () => {
    mockStmt.step.mockReturnValue(false);

    const result = getScannedFile(999);

    expect(result).toBeNull();
    expect(mockStmt.free).toHaveBeenCalled();
  });
});

describe('getFilesReadyToOrganize', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = {
      bind: vi.fn(),
      step: vi.fn(),
      get: vi.fn(),
      free: vi.fn(),
    };
    mockDb = { prepare: vi.fn(() => mockStmt) };
    getDB.mockReturnValue(mockDb);
  });

  it('returns files with accepted or changed decisions', () => {
    mockStmt.step.mockReturnValueOnce(true).mockReturnValueOnce(false);
    mockStmt.get.mockReturnValue([
      1,
      'scan_123',
      'test.pdf',
      '/path/test.pdf',
      '/path',
      'pdf',
      'document',
      1024,
      '2026-01-01',
      '11.01',
      5,
      'high',
      'accepted',
      null,
      '2026-01-01T00:00:00Z',
    ]);

    const result = getFilesReadyToOrganize('scan_123');

    expect(result).toHaveLength(1);
    expect(result[0].final_target).toBe('11.01');
    expect(mockStmt.free).toHaveBeenCalled();
  });

  it('uses user_target_folder when available', () => {
    mockStmt.step.mockReturnValueOnce(true).mockReturnValueOnce(false);
    mockStmt.get.mockReturnValue([
      1,
      'scan_123',
      'test.pdf',
      '/path/test.pdf',
      '/path',
      'pdf',
      'document',
      1024,
      '2026-01-01',
      '11.01',
      5,
      'high',
      'changed',
      '12.05',
      '2026-01-01T00:00:00Z',
    ]);

    const result = getFilesReadyToOrganize('scan_123');

    expect(result[0].final_target).toBe('12.05');
  });

  it('returns empty array when no files ready', () => {
    mockStmt.step.mockReturnValue(false);

    const result = getFilesReadyToOrganize('scan_123');

    expect(result).toEqual([]);
  });
});

describe('getScanStats', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = {
      bind: vi.fn(),
      step: vi.fn(),
      get: vi.fn(() => [0]),
      free: vi.fn(),
    };
    mockDb = { prepare: vi.fn(() => mockStmt) };
    getDB.mockReturnValue(mockDb);
  });

  it('returns comprehensive scan statistics', () => {
    const mockStatStmt = {
      bind: vi.fn(),
      step: vi.fn(() => true),
      get: vi.fn(),
      free: vi.fn(),
    };

    // Setup mock to return different values for different queries
    let callCount = 0;
    mockDb.prepare.mockImplementation(() => {
      callCount++;
      const stmt = { ...mockStatStmt };
      if (callCount <= 6) {
        // Count queries
        stmt.get = vi.fn(() => [callCount * 5]);
      } else if (callCount === 7) {
        // Size query
        stmt.get = vi.fn(() => [102400]);
      } else {
        // Type query - return empty after first step
        let typeStep = 0;
        stmt.step = vi.fn(() => {
          typeStep++;
          return typeStep <= 2;
        });
        stmt.get = vi.fn(() => {
          if (typeStep === 1) return ['document', 10];
          return ['image', 5];
        });
      }
      return stmt;
    });

    const result = getScanStats('scan_123');

    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('pending');
    expect(result).toHaveProperty('accepted');
    expect(result).toHaveProperty('changed');
    expect(result).toHaveProperty('skipped');
    expect(result).toHaveProperty('withSuggestions');
    expect(result).toHaveProperty('withoutSuggestions');
    expect(result).toHaveProperty('totalSize');
    expect(result).toHaveProperty('byType');
  });

  it('returns zero values for empty session', () => {
    mockStmt.get.mockReturnValue([0]);
    mockStmt.step.mockReturnValue(false);

    const result = getScanStats('scan_123');

    expect(result.total).toBe(0);
    expect(result.byType).toEqual({});
  });
});

describe('getScannedFileCount', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = {
      bind: vi.fn(),
      step: vi.fn(() => true),
      get: vi.fn(() => [42]),
      free: vi.fn(),
    };
    mockDb = { prepare: vi.fn(() => mockStmt) };
    getDB.mockReturnValue(mockDb);
  });

  it('returns count of scanned files in session', () => {
    const result = getScannedFileCount('scan_123');

    expect(result).toBe(42);
    expect(mockStmt.bind).toHaveBeenCalledWith(['scan_123']);
    expect(mockStmt.free).toHaveBeenCalled();
  });

  it('returns zero when no files', () => {
    mockStmt.get.mockReturnValue([0]);

    const result = getScannedFileCount('scan_123');

    expect(result).toBe(0);
  });
});

// ============================================
// WRITE OPERATIONS
// ============================================

describe('addScannedFile', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = {
      run: vi.fn(),
      free: vi.fn(),
    };
    mockDb = { prepare: vi.fn(() => mockStmt) };
    getDB.mockReturnValue(mockDb);
    getLastInsertId.mockReturnValue(1);
  });

  it('adds a scanned file with required fields', () => {
    const file = {
      scan_session_id: 'scan_123',
      filename: 'test.pdf',
      path: '/path/to/test.pdf',
    };

    const result = addScannedFile(file);

    expect(result).toBe(1);
    expect(mockStmt.run).toHaveBeenCalledWith([
      'scan_123',
      'test.pdf',
      '/path/to/test.pdf',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'none',
    ]);
    expect(mockStmt.free).toHaveBeenCalled();
  });

  it('adds a scanned file with all optional fields', () => {
    const file = {
      scan_session_id: 'scan_123',
      filename: 'test.pdf',
      path: '/path/to/test.pdf',
      parent_folder: '/path/to',
      file_extension: 'pdf',
      file_type: 'document',
      file_size: 1024,
      file_modified_at: '2026-01-01',
      suggested_jd_folder: '11.01',
      suggested_rule_id: 5,
      suggestion_confidence: 'high',
    };

    addScannedFile(file);

    expect(mockStmt.run).toHaveBeenCalledWith([
      'scan_123',
      'test.pdf',
      '/path/to/test.pdf',
      '/path/to',
      'pdf',
      'document',
      1024,
      '2026-01-01',
      '11.01',
      5,
      'high',
    ]);
  });

  it('defaults invalid confidence to none', () => {
    const file = {
      scan_session_id: 'scan_123',
      filename: 'test.pdf',
      path: '/path/to/test.pdf',
      suggestion_confidence: 'invalid',
    };

    addScannedFile(file);

    const callArgs = mockStmt.run.mock.calls[0][0];
    expect(callArgs[10]).toBe('none');
  });

  it('throws on missing required fields', () => {
    validateRequiredString.mockImplementation((val, name) => {
      if (!val) throw new Error(`${name} is required`);
      return val;
    });

    expect(() => addScannedFile({})).toThrow();
  });
});

describe('addScannedFilesBatch', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = {
      run: vi.fn(),
      free: vi.fn(),
    };
    mockDb = { prepare: vi.fn(() => mockStmt) };
    getDB.mockReturnValue(mockDb);
    getLastInsertId.mockReturnValue(1);
  });

  it('adds multiple files and returns count', () => {
    const files = [
      { scan_session_id: 'scan_123', filename: 'a.pdf', path: '/a.pdf' },
      { scan_session_id: 'scan_123', filename: 'b.pdf', path: '/b.pdf' },
    ];

    const result = addScannedFilesBatch(files);

    expect(result).toBe(2);
    expect(saveDatabase).toHaveBeenCalledTimes(1);
  });

  it('returns 0 for empty array', () => {
    const result = addScannedFilesBatch([]);

    expect(result).toBe(0);
    expect(saveDatabase).not.toHaveBeenCalled();
  });

  it('returns 0 for non-array input', () => {
    const result = addScannedFilesBatch(null);

    expect(result).toBe(0);
  });

  it('skips invalid files and continues', () => {
    let callCount = 0;
    validateRequiredString.mockImplementation((val, name) => {
      callCount++;
      if (callCount === 1 && !val) throw new Error(`${name} is required`);
      if (!val) throw new Error(`${name} is required`);
      return val;
    });

    const files = [
      { scan_session_id: 'scan_123', filename: 'a.pdf', path: '/a.pdf' },
      { filename: 'b.pdf', path: '/b.pdf' }, // Missing session ID
    ];

    // First file succeeds, second might fail validation
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = addScannedFilesBatch(files);

    // At least some files should be processed
    expect(saveDatabase).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('updateScannedFileDecision', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('updates decision without target folder', () => {
    updateScannedFileDecision(1, 'accepted');

    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('UPDATE scanned_files'), [
      'accepted',
      null,
      1,
    ]);
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('updates decision with target folder', () => {
    updateScannedFileDecision(1, 'changed', '12.05');

    expect(mockDb.run).toHaveBeenCalledWith(expect.any(String), ['changed', '12.05', 1]);
  });

  it('throws on invalid decision', () => {
    expect(() => updateScannedFileDecision(1, 'invalid')).toThrow('Invalid decision value');
  });
});

describe('acceptScannedFileSuggestion', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('sets decision to accepted', () => {
    acceptScannedFileSuggestion(1);

    expect(mockDb.run).toHaveBeenCalledWith(expect.any(String), ['accepted', null, 1]);
  });
});

describe('skipScannedFile', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('sets decision to skipped', () => {
    skipScannedFile(1);

    expect(mockDb.run).toHaveBeenCalledWith(expect.any(String), ['skipped', null, 1]);
  });
});

describe('changeScannedFileTarget', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('sets decision to changed with target folder', () => {
    changeScannedFileTarget(1, '12.05');

    expect(mockDb.run).toHaveBeenCalledWith(expect.any(String), ['changed', '12.05', 1]);
  });
});

describe('updateScannedFileSuggestion', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('updates suggestion with default confidence', () => {
    updateScannedFileSuggestion(1, '11.01', 5);

    expect(mockDb.run).toHaveBeenCalledWith(expect.any(String), ['11.01', 5, 'medium', 1]);
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('updates suggestion with specified confidence', () => {
    updateScannedFileSuggestion(1, '11.01', 5, 'high');

    expect(mockDb.run).toHaveBeenCalledWith(expect.any(String), ['11.01', 5, 'high', 1]);
  });

  it('defaults invalid confidence to medium', () => {
    updateScannedFileSuggestion(1, '11.01', 5, 'invalid');

    expect(mockDb.run).toHaveBeenCalledWith(expect.any(String), ['11.01', 5, 'medium', 1]);
  });

  it('allows null rule ID', () => {
    updateScannedFileSuggestion(1, '11.01');

    expect(mockDb.run).toHaveBeenCalledWith(expect.any(String), ['11.01', null, 'medium', 1]);
  });
});

describe('deleteScannedFile', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('deletes a scanned file by ID', () => {
    deleteScannedFile(1);

    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM scanned_files WHERE id = ?', [1]);
    expect(saveDatabase).toHaveBeenCalled();
  });
});
