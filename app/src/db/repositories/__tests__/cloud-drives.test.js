/**
 * Cloud Drives Repository Tests
 * ==============================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  VALID_DRIVE_TYPES,
  getCloudDrives,
  getCloudDrive,
  getDefaultCloudDrive,
  getCloudDriveCount,
  createCloudDrive,
  updateCloudDrive,
  deleteCloudDrive,
  setDefaultCloudDrive,
} from '../cloud-drives.js';

// Mock dependencies
vi.mock('../utils.js', () => ({
  getDB: vi.fn(),
  saveDatabase: vi.fn(),
}));

vi.mock('../activity-log.js', () => ({
  logActivity: vi.fn(),
}));

vi.mock('../../../utils/validation.js', () => ({
  validateRequiredString: vi.fn((val, name, _max) => {
    if (!val || typeof val !== 'string' || val.trim() === '') {
      const error = new Error(`${name} is required`);
      error.name = 'ValidationError';
      throw error;
    }
    return val.trim();
  }),
  validateOptionalString: vi.fn((val, _name, _max) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'string') return null;
    return val.trim() || null;
  }),
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

import { getDB, saveDatabase } from '../utils.js';
import { logActivity } from '../activity-log.js';
import { validateRequiredString } from '../../../utils/validation.js';

// ============================================
// CONSTANTS
// ============================================

describe('Constants', () => {
  it('exports valid drive types', () => {
    expect(VALID_DRIVE_TYPES).toEqual([
      'icloud',
      'dropbox',
      'onedrive',
      'google',
      'proton',
      'generic',
    ]);
  });
});

// ============================================
// READ OPERATIONS
// ============================================

describe('getCloudDrives', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns all active cloud drives', () => {
    mockDb.exec.mockReturnValue([
      {
        values: [
          [
            'icloud',
            'iCloud Drive',
            '/Users/test/Library/Mobile Documents',
            '/Users/test/Library/Mobile Documents/JD',
            1,
            1,
            'icloud',
            '2026-01-01',
            '2026-01-01',
          ],
        ],
      },
    ]);

    const result = getCloudDrives();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'icloud',
      name: 'iCloud Drive',
      base_path: '/Users/test/Library/Mobile Documents',
      jd_root_path: '/Users/test/Library/Mobile Documents/JD',
      is_default: true,
      is_active: true,
      drive_type: 'icloud',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    });
  });

  it('returns empty array when no drives configured', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getCloudDrives();

    expect(result).toEqual([]);
  });

  it('converts is_default and is_active to booleans', () => {
    mockDb.exec.mockReturnValue([
      {
        values: [['drive1', 'Drive 1', '/path', '/path/JD', 0, 1, 'generic', null, null]],
      },
    ]);

    const result = getCloudDrives();

    expect(result[0].is_default).toBe(false);
    expect(result[0].is_active).toBe(true);
  });

  it('orders by is_default DESC, name ASC', () => {
    mockDb.exec.mockReturnValue([]);

    getCloudDrives();

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY is_default DESC, name ASC')
    );
  });

  it('only returns active drives', () => {
    mockDb.exec.mockReturnValue([]);

    getCloudDrives();

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('WHERE is_active = 1'));
  });
});

describe('getCloudDrive', () => {
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

  it('returns a cloud drive by ID', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([
      'icloud',
      'iCloud Drive',
      '/path',
      '/path/JD',
      1,
      1,
      'icloud',
      '2026-01-01',
      '2026-01-01',
    ]);

    const result = getCloudDrive('icloud');

    expect(result).toEqual({
      id: 'icloud',
      name: 'iCloud Drive',
      base_path: '/path',
      jd_root_path: '/path/JD',
      is_default: true,
      is_active: true,
      drive_type: 'icloud',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    });
    expect(mockStmt.bind).toHaveBeenCalledWith(['icloud']);
    expect(mockStmt.free).toHaveBeenCalled();
  });

  it('returns null when drive not found', () => {
    mockStmt.step.mockReturnValue(false);

    const result = getCloudDrive('nonexistent');

    expect(result).toBeNull();
    expect(mockStmt.free).toHaveBeenCalled();
  });

  it('validates drive ID', () => {
    mockStmt.step.mockReturnValue(false);

    getCloudDrive('test-drive');

    expect(validateRequiredString).toHaveBeenCalledWith('test-drive', 'Drive ID', 50);
  });
});

describe('getDefaultCloudDrive', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns the default cloud drive', () => {
    mockDb.exec.mockReturnValue([
      {
        values: [
          ['icloud', 'iCloud', '/path', '/path/JD', 1, 1, 'icloud', '2026-01-01', '2026-01-01'],
        ],
      },
    ]);

    const result = getDefaultCloudDrive();

    expect(result).not.toBeNull();
    expect(result.is_default).toBe(true);
  });

  it('returns null when no default drive', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getDefaultCloudDrive();

    expect(result).toBeNull();
  });

  it('returns null when result values are empty', () => {
    mockDb.exec.mockReturnValue([{ values: [] }]);

    const result = getDefaultCloudDrive();

    expect(result).toBeNull();
  });

  it('queries for active default drive with limit 1', () => {
    mockDb.exec.mockReturnValue([]);

    getDefaultCloudDrive();

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('WHERE is_default = 1 AND is_active = 1 LIMIT 1')
    );
  });
});

describe('getCloudDriveCount', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns count of active cloud drives', () => {
    mockDb.exec.mockReturnValue([{ values: [[5]] }]);

    const result = getCloudDriveCount();

    expect(result).toBe(5);
  });

  it('returns 0 when no drives', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getCloudDriveCount();

    expect(result).toBe(0);
  });

  it('returns 0 when result is null', () => {
    mockDb.exec.mockReturnValue([{ values: [[null]] }]);

    const result = getCloudDriveCount();

    expect(result).toBe(0);
  });

  it('only counts active drives', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    getCloudDriveCount();

    expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('WHERE is_active = 1'));
  });
});

// ============================================
// WRITE OPERATIONS
// ============================================

describe('createCloudDrive', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = {
      run: vi.fn(),
      free: vi.fn(),
    };
    mockDb = {
      prepare: vi.fn(() => mockStmt),
      run: vi.fn(),
    };
    getDB.mockReturnValue(mockDb);
  });

  it('creates a cloud drive with required fields', () => {
    const drive = {
      id: 'icloud',
      name: 'iCloud Drive',
      base_path: '/Users/test/Library/Mobile Documents',
    };

    const result = createCloudDrive(drive);

    expect(result).toBe('icloud');
    expect(mockStmt.run).toHaveBeenCalledWith([
      'icloud',
      'iCloud Drive',
      '/Users/test/Library/Mobile Documents',
      null,
      0,
      'generic',
    ]);
    expect(logActivity).toHaveBeenCalledWith(
      'create',
      'cloud_drive',
      'icloud',
      'Added cloud drive: iCloud Drive'
    );
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('creates a cloud drive with all optional fields', () => {
    const drive = {
      id: 'icloud',
      name: 'iCloud Drive',
      base_path: '/path',
      jd_root_path: '/path/JD',
      is_default: true,
      drive_type: 'icloud',
    };

    createCloudDrive(drive);

    expect(mockStmt.run).toHaveBeenCalledWith([
      'icloud',
      'iCloud Drive',
      '/path',
      '/path/JD',
      1,
      'icloud',
    ]);
  });

  it('unsets existing default when creating new default', () => {
    const drive = {
      id: 'new-default',
      name: 'New Default',
      base_path: '/path',
      is_default: true,
    };

    createCloudDrive(drive);

    expect(mockDb.run).toHaveBeenCalledWith(
      'UPDATE cloud_drives SET is_default = 0 WHERE is_default = 1'
    );
  });

  it('does not unset default when is_default is false', () => {
    const drive = {
      id: 'not-default',
      name: 'Not Default',
      base_path: '/path',
      is_default: false,
    };

    createCloudDrive(drive);

    expect(mockDb.run).not.toHaveBeenCalledWith(
      'UPDATE cloud_drives SET is_default = 0 WHERE is_default = 1'
    );
  });

  it('defaults invalid drive type to generic', () => {
    const drive = {
      id: 'test',
      name: 'Test',
      base_path: '/path',
      drive_type: 'invalid',
    };

    createCloudDrive(drive);

    const callArgs = mockStmt.run.mock.calls[0][0];
    expect(callArgs[5]).toBe('generic');
  });

  it('throws ValidationError on missing required fields', () => {
    expect(() => createCloudDrive({})).toThrow();
  });

  it('throws DatabaseError on database failure', () => {
    mockStmt.run.mockImplementation(() => {
      throw new Error('Database error');
    });

    const drive = {
      id: 'test',
      name: 'Test',
      base_path: '/path',
    };

    expect(() => createCloudDrive(drive)).toThrow('Failed to create cloud drive');
  });

  it('re-throws ValidationError without wrapping', () => {
    validateRequiredString.mockImplementation(() => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      throw error;
    });

    expect(() => createCloudDrive({ id: '', name: '', base_path: '' })).toThrow();
  });
});

describe('updateCloudDrive', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('updates cloud drive name', () => {
    updateCloudDrive('icloud', { name: 'New Name' });

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE cloud_drives SET'),
      expect.arrayContaining(['New Name', 'icloud'])
    );
    expect(logActivity).toHaveBeenCalled();
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('updates multiple fields', () => {
    updateCloudDrive('icloud', {
      name: 'New Name',
      base_path: '/new/path',
      jd_root_path: '/new/path/JD',
    });

    const [query, params] = mockDb.run.mock.calls[mockDb.run.mock.calls.length - 1];
    expect(query).toContain('name = ?');
    expect(query).toContain('base_path = ?');
    expect(query).toContain('jd_root_path = ?');
    expect(params).toContain('New Name');
    expect(params).toContain('/new/path');
    expect(params).toContain('/new/path/JD');
  });

  it('unsets existing default when setting new default', () => {
    updateCloudDrive('icloud', { is_default: true });

    expect(mockDb.run).toHaveBeenCalledWith(
      'UPDATE cloud_drives SET is_default = 0 WHERE is_default = 1'
    );
  });

  it('converts boolean is_default to integer', () => {
    updateCloudDrive('icloud', { is_default: true });

    const calls = mockDb.run.mock.calls;
    const updateCall = calls[calls.length - 1];
    expect(updateCall[1]).toContain(1); // is_default = 1
  });

  it('converts boolean is_active to integer', () => {
    updateCloudDrive('icloud', { is_active: false });

    const updateCall = mockDb.run.mock.calls[mockDb.run.mock.calls.length - 1];
    expect(updateCall[1]).toContain(0); // is_active = 0
  });

  it('validates drive type', () => {
    updateCloudDrive('icloud', { drive_type: 'invalid' });

    const updateCall = mockDb.run.mock.calls[mockDb.run.mock.calls.length - 1];
    expect(updateCall[1]).toContain('generic');
  });

  it('ignores invalid columns', () => {
    updateCloudDrive('icloud', { invalid_column: 'value', name: 'Valid' });

    const updateCall = mockDb.run.mock.calls[mockDb.run.mock.calls.length - 1];
    expect(updateCall[0]).not.toContain('invalid_column');
    expect(updateCall[0]).toContain('name');
  });

  it('does nothing when no valid updates provided', () => {
    updateCloudDrive('icloud', { invalid: 'value' });

    // Only the unset default call if is_default was involved
    expect(logActivity).not.toHaveBeenCalled();
  });

  it('adds updated_at timestamp', () => {
    updateCloudDrive('icloud', { name: 'Test' });

    const updateCall = mockDb.run.mock.calls[mockDb.run.mock.calls.length - 1];
    expect(updateCall[0]).toContain('updated_at = CURRENT_TIMESTAMP');
  });

  it('throws DatabaseError on database failure', () => {
    mockDb.run.mockImplementation(() => {
      throw new Error('Database error');
    });

    expect(() => updateCloudDrive('icloud', { name: 'Test' })).toThrow(
      'Failed to update cloud drive'
    );
  });
});

describe('deleteCloudDrive', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('soft deletes a cloud drive', () => {
    deleteCloudDrive('icloud');

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE cloud_drives SET is_active = 0'),
      ['icloud']
    );
    expect(logActivity).toHaveBeenCalledWith(
      'delete',
      'cloud_drive',
      'icloud',
      'Removed cloud drive: icloud'
    );
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('updates timestamp on delete', () => {
    deleteCloudDrive('icloud');

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('updated_at = CURRENT_TIMESTAMP'),
      expect.any(Array)
    );
  });

  it('validates drive ID', () => {
    deleteCloudDrive('test-drive');

    expect(validateRequiredString).toHaveBeenCalledWith('test-drive', 'Drive ID', 50);
  });
});

describe('setDefaultCloudDrive', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { run: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('sets a cloud drive as default', () => {
    setDefaultCloudDrive('icloud');

    // First call unsets current default
    expect(mockDb.run).toHaveBeenCalledWith(
      'UPDATE cloud_drives SET is_default = 0 WHERE is_default = 1'
    );

    // Second call sets new default
    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('SET is_default = 1'), [
      'icloud',
    ]);

    expect(logActivity).toHaveBeenCalledWith(
      'update',
      'cloud_drive',
      'icloud',
      'Set as default cloud drive: icloud'
    );
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('updates timestamp when setting default', () => {
    setDefaultCloudDrive('icloud');

    const setDefaultCall = mockDb.run.mock.calls[1];
    expect(setDefaultCall[0]).toContain('updated_at = CURRENT_TIMESTAMP');
  });

  it('validates drive ID', () => {
    setDefaultCloudDrive('test-drive');

    expect(validateRequiredString).toHaveBeenCalledWith('test-drive', 'Drive ID', 50);
  });
});
