/**
 * Area Storage Repository Tests
 * =============================
 * Tests for area-to-cloud-drive mappings (Premium Feature).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAreaStorageMappings,
  getAreaCloudDrive,
  getUnmappedAreas,
  getAreaStorageMappingCount,
  setAreaCloudDrive,
  removeAreaMappingsForDrive,
} from '../area-storage.js';
import { DatabaseError } from '../../../utils/errors.js';

// Mock the utils module
vi.mock('../utils.js', () => ({
  getDB: vi.fn(),
  saveDatabase: vi.fn(),
  validatePositiveInteger: vi.fn((val, name) => {
    if (val === null || val === undefined) {
      throw new DatabaseError(`${name} is required`, 'query');
    }
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    if (typeof num !== 'number' || !Number.isFinite(num) || num < 1 || !Number.isInteger(num)) {
      throw new DatabaseError(`${name} must be a positive whole number`, 'query');
    }
    return num;
  }),
}));

// Mock the cloud-drives module
vi.mock('../cloud-drives.js', () => ({
  getDefaultCloudDrive: vi.fn(),
}));

// Mock the activity-log module
vi.mock('../activity-log.js', () => ({
  logActivity: vi.fn(),
}));

// Mock the validation module
vi.mock('../../../utils/validation.js', () => ({
  validateRequiredString: vi.fn((val, _name, _maxLen) => {
    if (!val || typeof val !== 'string' || val.trim() === '') {
      throw new DatabaseError(`${_name} is required`, 'validation');
    }
    return val.trim();
  }),
  validateOptionalString: vi.fn((val) => (val ? val.trim() : null)),
}));

import { getDB, saveDatabase } from '../utils.js';
import { getDefaultCloudDrive } from '../cloud-drives.js';
import { logActivity } from '../activity-log.js';

describe('getAreaStorageMappings', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn(), run: vi.fn(), prepare: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns all area storage mappings with joined data', () => {
    mockDb.exec.mockReturnValue([
      {
        values: [
          [
            1,
            'icloud-drive',
            'Notes for area 1',
            '2024-01-01',
            '2024-01-02',
            'Personal',
            10,
            19,
            '#blue',
            'iCloud Drive',
            '/Users/test/iCloud',
            '/JDex',
            'icloud',
          ],
          [
            2,
            'onedrive',
            null,
            '2024-01-01',
            '2024-01-02',
            'Work',
            20,
            29,
            '#green',
            'OneDrive',
            '/Users/test/OneDrive',
            '/JDex',
            'onedrive',
          ],
        ],
      },
    ]);

    const result = getAreaStorageMappings();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      area_id: 1,
      cloud_drive_id: 'icloud-drive',
      notes: 'Notes for area 1',
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
      area_name: 'Personal',
      range_start: 10,
      range_end: 19,
      area_color: '#blue',
      drive_name: 'iCloud Drive',
      base_path: '/Users/test/iCloud',
      jd_root_path: '/JDex',
      drive_type: 'icloud',
    });
  });

  it('returns empty array when no mappings exist', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getAreaStorageMappings();

    expect(result).toEqual([]);
  });

  it('queries with correct SQL including joins', () => {
    mockDb.exec.mockReturnValue([]);

    getAreaStorageMappings();

    const query = mockDb.exec.mock.calls[0][0];
    expect(query).toContain('JOIN areas a ON ast.area_id = a.id');
    expect(query).toContain('LEFT JOIN cloud_drives cd ON ast.cloud_drive_id = cd.id');
    expect(query).toContain('ORDER BY a.range_start');
  });

  it('handles null drive for deleted/inactive drives', () => {
    mockDb.exec.mockReturnValue([
      {
        values: [
          [
            1,
            'deleted-drive',
            null,
            '2024-01-01',
            '2024-01-02',
            'Personal',
            10,
            19,
            '#blue',
            null,
            null,
            null,
            null,
          ],
        ],
      },
    ]);

    const result = getAreaStorageMappings();

    expect(result[0].drive_name).toBeNull();
    expect(result[0].base_path).toBeNull();
  });
});

describe('getAreaCloudDrive', () => {
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
    mockDb = { exec: vi.fn(), prepare: vi.fn(() => mockStmt), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns the mapped cloud drive for an area', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([
      'icloud-drive',
      'iCloud',
      '/Users/test/iCloud',
      '/JDex',
      1,
      1,
      'icloud',
      '2024-01-01',
      '2024-01-02',
    ]);

    const result = getAreaCloudDrive(1);

    expect(mockStmt.bind).toHaveBeenCalledWith([1]);
    expect(result).toEqual({
      id: 'icloud-drive',
      name: 'iCloud',
      base_path: '/Users/test/iCloud',
      jd_root_path: '/JDex',
      is_default: true,
      is_active: true,
      drive_type: 'icloud',
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
    });
  });

  it('falls back to default drive when no mapping exists', () => {
    mockStmt.step.mockReturnValue(false);
    const defaultDrive = {
      id: 'default-drive',
      name: 'Default',
      is_default: true,
    };
    getDefaultCloudDrive.mockReturnValue(defaultDrive);

    const result = getAreaCloudDrive(1);

    expect(getDefaultCloudDrive).toHaveBeenCalled();
    expect(result).toEqual(defaultDrive);
  });

  it('returns null when no mapping and no default drive', () => {
    mockStmt.step.mockReturnValue(false);
    getDefaultCloudDrive.mockReturnValue(null);

    const result = getAreaCloudDrive(1);

    expect(result).toBeNull();
  });

  it('throws error for invalid area ID', () => {
    expect(() => getAreaCloudDrive(null)).toThrow(DatabaseError);
    expect(() => getAreaCloudDrive(-1)).toThrow(DatabaseError);
    expect(() => getAreaCloudDrive('abc')).toThrow(DatabaseError);
  });

  it('frees prepared statement after use', () => {
    mockStmt.step.mockReturnValue(false);
    getDefaultCloudDrive.mockReturnValue(null);

    getAreaCloudDrive(1);

    expect(mockStmt.free).toHaveBeenCalled();
  });

  it('uses parameterized query for security', () => {
    mockStmt.step.mockReturnValue(false);
    getDefaultCloudDrive.mockReturnValue(null);

    getAreaCloudDrive(5);

    expect(mockDb.prepare).toHaveBeenCalled();
    const query = mockDb.prepare.mock.calls[0][0];
    expect(query).toContain('WHERE ast.area_id = ?');
    expect(mockStmt.bind).toHaveBeenCalledWith([5]);
  });
});

describe('getUnmappedAreas', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns areas without drive mappings', () => {
    mockDb.exec.mockReturnValue([
      {
        values: [
          [1, 10, 19, 'Personal', 'Personal stuff', '#blue', '2024-01-01'],
          [3, 30, 39, 'Finance', 'Financial docs', '#green', '2024-01-01'],
        ],
      },
    ]);

    const result = getUnmappedAreas();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 1,
      range_start: 10,
      range_end: 19,
      name: 'Personal',
      description: 'Personal stuff',
      color: '#blue',
      created_at: '2024-01-01',
    });
  });

  it('returns empty array when all areas are mapped', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getUnmappedAreas();

    expect(result).toEqual([]);
  });

  it('uses LEFT JOIN to find unmapped areas', () => {
    mockDb.exec.mockReturnValue([]);

    getUnmappedAreas();

    const query = mockDb.exec.mock.calls[0][0];
    expect(query).toContain('LEFT JOIN area_storage ast ON a.id = ast.area_id');
    expect(query).toContain('WHERE ast.area_id IS NULL');
  });

  it('orders results by range_start', () => {
    mockDb.exec.mockReturnValue([]);

    getUnmappedAreas();

    const query = mockDb.exec.mock.calls[0][0];
    expect(query).toContain('ORDER BY a.range_start');
  });
});

describe('getAreaStorageMappingCount', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
  });

  it('returns the count of mappings', () => {
    mockDb.exec.mockReturnValue([{ values: [[5]] }]);

    const result = getAreaStorageMappingCount();

    expect(result).toBe(5);
  });

  it('returns 0 when no mappings exist', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getAreaStorageMappingCount();

    expect(result).toBe(0);
  });

  it('queries correct table', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    getAreaStorageMappingCount();

    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM area_storage');
  });
});

describe('setAreaCloudDrive', () => {
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
    mockDb = {
      exec: vi.fn(),
      prepare: vi.fn(() => mockStmt),
      run: vi.fn(),
    };
    getDB.mockReturnValue(mockDb);
  });

  it('creates a new mapping with drive ID and notes', () => {
    mockStmt.step.mockReturnValueOnce(true).mockReturnValueOnce(true); // area exists, drive exists

    setAreaCloudDrive(1, 'icloud-drive', 'Important notes');

    expect(mockDb.run).toHaveBeenCalled();
    const [query, params] = mockDb.run.mock.calls[0];
    expect(query).toContain('INSERT OR REPLACE INTO area_storage');
    expect(params).toContain(1);
    expect(params).toContain('icloud-drive');
    expect(params).toContain('Important notes');
  });

  it('saves database after creating mapping', () => {
    mockStmt.step.mockReturnValueOnce(true).mockReturnValueOnce(true);

    setAreaCloudDrive(1, 'icloud-drive');

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('logs activity when creating mapping', () => {
    mockStmt.step.mockReturnValueOnce(true).mockReturnValueOnce(true);

    setAreaCloudDrive(1, 'icloud-drive');

    expect(logActivity).toHaveBeenCalledWith(
      'update',
      'area_storage',
      'area-1',
      expect.stringContaining('Mapped area 1')
    );
  });

  it('removes mapping when cloudDriveId is null', () => {
    mockStmt.step.mockReturnValueOnce(true); // area exists

    setAreaCloudDrive(1, null);

    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM area_storage WHERE area_id = ?', [1]);
  });

  it('logs delete activity when removing mapping', () => {
    mockStmt.step.mockReturnValueOnce(true);

    setAreaCloudDrive(1, null);

    expect(logActivity).toHaveBeenCalledWith(
      'delete',
      'area_storage',
      'area-1',
      expect.stringContaining('Removed drive mapping')
    );
  });

  it('throws error if area does not exist', () => {
    mockStmt.step.mockReturnValue(false); // area does not exist

    expect(() => setAreaCloudDrive(999, 'icloud-drive')).toThrow(DatabaseError);
    expect(() => setAreaCloudDrive(999, 'icloud-drive')).toThrow('Area with ID 999 not found');
  });

  it('throws error if drive does not exist', () => {
    // First call: area exists (true), drive doesn't (false)
    mockStmt.step
      .mockReturnValueOnce(true) // area check
      .mockReturnValueOnce(false); // drive check

    expect(() => setAreaCloudDrive(1, 'nonexistent-drive')).toThrow(DatabaseError);
  });

  it('includes drive ID in error message when drive not found', () => {
    mockStmt.step
      .mockReturnValueOnce(true) // area check
      .mockReturnValueOnce(false); // drive check

    expect(() => setAreaCloudDrive(1, 'missing-drive')).toThrow('not found or inactive');
  });

  it('throws error for invalid area ID', () => {
    expect(() => setAreaCloudDrive(null, 'icloud-drive')).toThrow(DatabaseError);
    expect(() => setAreaCloudDrive(-1, 'icloud-drive')).toThrow(DatabaseError);
  });

  it('frees prepared statements after use', () => {
    mockStmt.step.mockReturnValueOnce(true).mockReturnValueOnce(true);

    setAreaCloudDrive(1, 'icloud-drive');

    // Should free statement for both area check and drive check
    expect(mockStmt.free).toHaveBeenCalled();
  });

  it('uses parameterized queries for security', () => {
    mockStmt.step.mockReturnValueOnce(true).mockReturnValueOnce(true);

    setAreaCloudDrive(1, 'icloud-drive');

    const areaQuery = mockDb.prepare.mock.calls[0][0];
    expect(areaQuery).toContain('WHERE id = ?');
  });
});

describe('removeAreaMappingsForDrive', () => {
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
    mockDb = {
      exec: vi.fn(),
      prepare: vi.fn(() => mockStmt),
      run: vi.fn(),
    };
    getDB.mockReturnValue(mockDb);
  });

  it('removes all mappings for a drive and returns count', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([3]); // 3 mappings to remove

    const result = removeAreaMappingsForDrive('icloud-drive');

    expect(result).toBe(3);
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM area_storage WHERE cloud_drive_id = ?', [
      'icloud-drive',
    ]);
  });

  it('saves database after removing mappings', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([2]);

    removeAreaMappingsForDrive('icloud-drive');

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('logs activity when removing mappings', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([3]);

    removeAreaMappingsForDrive('icloud-drive');

    expect(logActivity).toHaveBeenCalledWith(
      'delete',
      'area_storage',
      'icloud-drive',
      expect.stringContaining('Removed 3 area mappings')
    );
  });

  it('returns 0 and does not delete when no mappings exist', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([0]);

    const result = removeAreaMappingsForDrive('empty-drive');

    expect(result).toBe(0);
    expect(mockDb.run).not.toHaveBeenCalled();
    expect(saveDatabase).not.toHaveBeenCalled();
  });

  it('throws error for invalid drive ID', () => {
    expect(() => removeAreaMappingsForDrive('')).toThrow(DatabaseError);
    expect(() => removeAreaMappingsForDrive(null)).toThrow(DatabaseError);
  });

  it('uses parameterized query for count and delete', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([1]);

    removeAreaMappingsForDrive('test-drive');

    const countQuery = mockDb.prepare.mock.calls[0][0];
    expect(countQuery).toContain('WHERE cloud_drive_id = ?');
    expect(mockStmt.bind).toHaveBeenCalledWith(['test-drive']);
  });

  it('frees prepared statement after use', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([0]);

    removeAreaMappingsForDrive('test-drive');

    expect(mockStmt.free).toHaveBeenCalled();
  });
});
