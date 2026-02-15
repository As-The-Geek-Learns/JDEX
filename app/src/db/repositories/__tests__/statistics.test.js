/**
 * Statistics Repository Tests
 * ===========================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStats, getAreaStats, getCategoryStats, getFolderStats } from '../statistics.js';

// Mock the utils module
vi.mock('../utils.js', () => ({
  getDB: vi.fn(),
  requireDB: vi.fn(),
}));

import { getDB, requireDB } from '../utils.js';

describe('getStats', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns all statistics with counts', () => {
    // Mock all the COUNT queries in order
    mockDb.exec
      .mockReturnValueOnce([{ values: [[10]] }]) // totalFolders
      .mockReturnValueOnce([{ values: [[25]] }]) // totalItems
      .mockReturnValueOnce([{ values: [[8]] }]) // totalCategories
      .mockReturnValueOnce([{ values: [[2]] }]) // sensitiveFolders
      .mockReturnValueOnce([{ values: [[3]] }]) // workFolders
      .mockReturnValueOnce([{ values: [[5]] }]) // inheritItems
      .mockReturnValueOnce([{ values: [[4]] }]) // sensitiveItems
      .mockReturnValueOnce([{ values: [[6]] }]); // workItems

    const result = getStats();

    expect(result).toEqual({
      totalFolders: 10,
      totalItems: 25,
      totalCategories: 8,
      sensitiveFolders: 2,
      workFolders: 3,
      standardFolders: 5, // 10 - 2 - 3
      inheritItems: 5,
      sensitiveItems: 4,
      workItems: 6,
      standardItems: 10, // 25 - 5 - 4 - 6
    });
  });

  it('returns zero counts when database is empty', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getStats();

    expect(result).toEqual({
      totalFolders: 0,
      totalItems: 0,
      totalCategories: 0,
      sensitiveFolders: 0,
      workFolders: 0,
      standardFolders: 0,
      inheritItems: 0,
      sensitiveItems: 0,
      workItems: 0,
      standardItems: 0,
    });
  });

  it('handles null result from query', () => {
    // When query returns empty result set
    mockDb.exec.mockReturnValue([{ values: [[null]] }]);

    const result = getStats();

    // null || 0 returns 0
    expect(result.totalFolders).toBe(0);
  });

  it('handles missing first element', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getStats();

    expect(result.totalFolders).toBe(0);
    expect(result.totalItems).toBe(0);
  });

  it('queries correct tables for folder counts', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    getStats();

    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM folders');
    expect(mockDb.exec).toHaveBeenCalledWith(
      "SELECT COUNT(*) FROM folders WHERE sensitivity = 'sensitive'"
    );
    expect(mockDb.exec).toHaveBeenCalledWith(
      "SELECT COUNT(*) FROM folders WHERE sensitivity = 'work'"
    );
  });

  it('queries correct tables for item counts', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    getStats();

    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM items');
    expect(mockDb.exec).toHaveBeenCalledWith(
      "SELECT COUNT(*) FROM items WHERE sensitivity = 'inherit'"
    );
    expect(mockDb.exec).toHaveBeenCalledWith(
      "SELECT COUNT(*) FROM items WHERE sensitivity = 'sensitive'"
    );
    expect(mockDb.exec).toHaveBeenCalledWith(
      "SELECT COUNT(*) FROM items WHERE sensitivity = 'work'"
    );
  });

  it('calculates standardFolders correctly', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[100]] }]) // totalFolders
      .mockReturnValueOnce([{ values: [[0]] }]) // totalItems
      .mockReturnValueOnce([{ values: [[0]] }]) // totalCategories
      .mockReturnValueOnce([{ values: [[20]] }]) // sensitiveFolders
      .mockReturnValueOnce([{ values: [[30]] }]) // workFolders
      .mockReturnValueOnce([{ values: [[0]] }])
      .mockReturnValueOnce([{ values: [[0]] }])
      .mockReturnValueOnce([{ values: [[0]] }]);

    const result = getStats();

    expect(result.standardFolders).toBe(50); // 100 - 20 - 30
  });

  it('calculates standardItems correctly', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[0]] }]) // totalFolders
      .mockReturnValueOnce([{ values: [[100]] }]) // totalItems
      .mockReturnValueOnce([{ values: [[0]] }]) // totalCategories
      .mockReturnValueOnce([{ values: [[0]] }]) // sensitiveFolders
      .mockReturnValueOnce([{ values: [[0]] }]) // workFolders
      .mockReturnValueOnce([{ values: [[10]] }]) // inheritItems
      .mockReturnValueOnce([{ values: [[20]] }]) // sensitiveItems
      .mockReturnValueOnce([{ values: [[30]] }]); // workItems

    const result = getStats();

    expect(result.standardItems).toBe(40); // 100 - 10 - 20 - 30
  });
});

describe('getAreaStats', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns area statistics with category counts', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[3]] }]) // totalAreas
      .mockReturnValueOnce([
        {
          values: [
            [1, 'Personal', 5],
            [2, 'Work', 8],
            [3, 'Finance', 3],
          ],
        },
      ]);

    const result = getAreaStats();

    expect(result).toEqual({
      totalAreas: 3,
      areasWithCounts: [
        { id: 1, name: 'Personal', category_count: 5 },
        { id: 2, name: 'Work', category_count: 8 },
        { id: 3, name: 'Finance', category_count: 3 },
      ],
    });
  });

  it('returns empty areasWithCounts when no areas exist', () => {
    mockDb.exec.mockReturnValueOnce([{ values: [[0]] }]).mockReturnValueOnce([]);

    const result = getAreaStats();

    expect(result).toEqual({
      totalAreas: 0,
      areasWithCounts: [],
    });
  });

  it('handles areas with zero categories', () => {
    mockDb.exec.mockReturnValueOnce([{ values: [[2]] }]).mockReturnValueOnce([
      {
        values: [
          [1, 'Empty Area', 0],
          [2, 'Another Empty', 0],
        ],
      },
    ]);

    const result = getAreaStats();

    expect(result.areasWithCounts[0].category_count).toBe(0);
    expect(result.areasWithCounts[1].category_count).toBe(0);
  });

  it('queries correct SQL for area count', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    getAreaStats();

    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM areas');
  });

  it('joins areas with categories correctly', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    getAreaStats();

    const joinQuery = mockDb.exec.mock.calls[1][0];
    expect(joinQuery).toContain('LEFT JOIN categories c ON a.id = c.area_id');
    expect(joinQuery).toContain('GROUP BY a.id');
    expect(joinQuery).toContain('ORDER BY a.range_start');
  });

  it('handles empty results array for category query', () => {
    mockDb.exec.mockReturnValueOnce([{ values: [[2]] }]).mockReturnValueOnce([]); // No results object

    const result = getAreaStats();

    expect(result.areasWithCounts).toEqual([]);
  });

  it('handles null in area name', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[1]] }])
      .mockReturnValueOnce([{ values: [[1, null, 3]] }]);

    const result = getAreaStats();

    expect(result.areasWithCounts[0].name).toBeNull();
  });
});

describe('getCategoryStats', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns category statistics with folder counts', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[5]] }]) // totalCategories
      .mockReturnValueOnce([
        {
          values: [
            [1, 10, 'Inbox', 3],
            [2, 11, 'Projects', 8],
            [3, 12, 'Reference', 2],
          ],
        },
      ]);

    const result = getCategoryStats();

    expect(result).toEqual({
      totalCategories: 5,
      topCategories: [
        { id: 1, number: 10, name: 'Inbox', folder_count: 3 },
        { id: 2, number: 11, name: 'Projects', folder_count: 8 },
        { id: 3, number: 12, name: 'Reference', folder_count: 2 },
      ],
    });
  });

  it('returns empty topCategories when no categories exist', () => {
    mockDb.exec.mockReturnValueOnce([{ values: [[0]] }]).mockReturnValueOnce([]);

    const result = getCategoryStats();

    expect(result).toEqual({
      totalCategories: 0,
      topCategories: [],
    });
  });

  it('limits results to 20 categories', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    getCategoryStats();

    const query = mockDb.exec.mock.calls[1][0];
    expect(query).toContain('LIMIT 20');
  });

  it('orders categories by number', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    getCategoryStats();

    const query = mockDb.exec.mock.calls[1][0];
    expect(query).toContain('ORDER BY c.number');
  });

  it('joins categories with folders correctly', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    getCategoryStats();

    const query = mockDb.exec.mock.calls[1][0];
    expect(query).toContain('LEFT JOIN folders f ON c.id = f.category_id');
    expect(query).toContain('GROUP BY c.id');
  });

  it('handles categories with zero folders', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[1]] }])
      .mockReturnValueOnce([{ values: [[1, 10, 'Empty Category', 0]] }]);

    const result = getCategoryStats();

    expect(result.topCategories[0].folder_count).toBe(0);
  });

  it('handles empty results array for folder query', () => {
    mockDb.exec.mockReturnValueOnce([{ values: [[5]] }]).mockReturnValueOnce([]); // No results object

    const result = getCategoryStats();

    expect(result.topCategories).toEqual([]);
  });

  it('handles null values in category data', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[1]] }])
      .mockReturnValueOnce([{ values: [[1, 10, null, 0]] }]);

    const result = getCategoryStats();

    expect(result.topCategories[0].name).toBeNull();
    expect(result.topCategories[0].number).toBe(10);
  });
});

describe('getFolderStats', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns folder statistics with item counts', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[4]] }]) // totalFolders
      .mockReturnValueOnce([
        {
          values: [
            [1, '10.01', 'Documentation', 15],
            [2, '10.02', 'Scripts', 8],
            [3, '11.01', 'Reports', 5],
          ],
        },
      ]);

    const result = getFolderStats();

    expect(result).toEqual({
      totalFolders: 4,
      topFolders: [
        { id: 1, folder_number: '10.01', name: 'Documentation', item_count: 15 },
        { id: 2, folder_number: '10.02', name: 'Scripts', item_count: 8 },
        { id: 3, folder_number: '11.01', name: 'Reports', item_count: 5 },
      ],
    });
  });

  it('returns empty topFolders when no folders exist', () => {
    mockDb.exec.mockReturnValueOnce([{ values: [[0]] }]).mockReturnValueOnce([]);

    const result = getFolderStats();

    expect(result).toEqual({
      totalFolders: 0,
      topFolders: [],
    });
  });

  it('orders folders by item_count descending', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    getFolderStats();

    const query = mockDb.exec.mock.calls[1][0];
    expect(query).toContain('ORDER BY item_count DESC');
  });

  it('limits results to 20 folders', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    getFolderStats();

    const query = mockDb.exec.mock.calls[1][0];
    expect(query).toContain('LIMIT 20');
  });

  it('joins folders with items correctly', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    getFolderStats();

    const query = mockDb.exec.mock.calls[1][0];
    expect(query).toContain('LEFT JOIN items i ON f.id = i.folder_id');
    expect(query).toContain('GROUP BY f.id');
  });

  it('handles folders with zero items', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[1]] }])
      .mockReturnValueOnce([{ values: [[1, '10.01', 'Empty Folder', 0]] }]);

    const result = getFolderStats();

    expect(result.topFolders[0].item_count).toBe(0);
  });

  it('handles empty results array for items query', () => {
    mockDb.exec.mockReturnValueOnce([{ values: [[10]] }]).mockReturnValueOnce([]); // No results object

    const result = getFolderStats();

    expect(result.topFolders).toEqual([]);
  });

  it('handles null values in folder data', () => {
    mockDb.exec
      .mockReturnValueOnce([{ values: [[1]] }])
      .mockReturnValueOnce([{ values: [[1, '10.01', null, 5]] }]);

    const result = getFolderStats();

    expect(result.topFolders[0].name).toBeNull();
    expect(result.topFolders[0].folder_number).toBe('10.01');
  });

  it('selects correct columns', () => {
    mockDb.exec.mockReturnValue([{ values: [[0]] }]);

    getFolderStats();

    const query = mockDb.exec.mock.calls[1][0];
    expect(query).toContain('f.id');
    expect(query).toContain('f.folder_number');
    expect(query).toContain('f.name');
    expect(query).toContain('COUNT(i.id) as item_count');
  });
});
