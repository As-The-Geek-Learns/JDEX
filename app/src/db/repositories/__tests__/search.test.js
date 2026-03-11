/**
 * Search Repository Tests
 * =======================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchFolders, searchItems, searchAll } from '../search.js';

// Mock the utils module
vi.mock('../utils.js', () => ({
  getDB: vi.fn(),
  mapResults: vi.fn(),
}));

// Mock validation
vi.mock('../../../utils/validation.js', () => ({
  sanitizeText: vi.fn((text) => text),
}));

import { getDB, mapResults } from '../utils.js';
import { sanitizeText } from '../../../utils/validation.js';

describe('searchFolders', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns matching folders', () => {
    const mockResults = [{ values: [] }];
    mockDb.exec.mockReturnValue(mockResults);
    const mockMapped = [
      {
        id: 1,
        folder_number: '11.01',
        name: 'Budget',
        category_number: 11,
        category_name: 'Finance',
      },
    ];
    mapResults.mockReturnValue(mockMapped);

    const result = searchFolders('budget');

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('WHERE f.folder_number LIKE ?'),
      expect.arrayContaining(['%budget%'])
    );
    expect(result).toEqual(mockMapped);
  });

  it('returns empty array for empty query', () => {
    const result = searchFolders('');

    expect(mockDb.exec).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('returns empty array for null query', () => {
    const result = searchFolders(null);

    expect(mockDb.exec).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('returns empty array for non-string query', () => {
    const result = searchFolders(123);

    expect(mockDb.exec).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('sanitizes the search query', () => {
    mockDb.exec.mockReturnValue([]);
    mapResults.mockReturnValue([]);

    searchFolders('test query');

    expect(sanitizeText).toHaveBeenCalledWith('test query');
  });

  it('searches multiple fields', () => {
    mockDb.exec.mockReturnValue([]);
    mapResults.mockReturnValue([]);

    searchFolders('test');

    const call = mockDb.exec.mock.calls[0];
    const query = call[0];

    expect(query).toContain('f.folder_number LIKE ?');
    expect(query).toContain('f.name LIKE ?');
    expect(query).toContain('f.description LIKE ?');
    expect(query).toContain('f.keywords LIKE ?');
    expect(query).toContain('f.notes LIKE ?');
    expect(query).toContain('c.name LIKE ?');
    expect(query).toContain('a.name LIKE ?');
  });

  it('orders results by folder_number', () => {
    mockDb.exec.mockReturnValue([]);
    mapResults.mockReturnValue([]);

    searchFolders('test');

    const call = mockDb.exec.mock.calls[0];
    expect(call[0]).toContain('ORDER BY f.folder_number');
  });
});

describe('searchItems', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns matching items with effective_sensitivity', () => {
    const mockResults = [{ values: [] }];
    mockDb.exec.mockReturnValue(mockResults);
    const mockMapped = [
      {
        id: 1,
        item_number: '11.01.01',
        name: 'Budget Report',
        sensitivity: 'inherit',
        folder_sensitivity: 'confidential',
      },
    ];
    mapResults.mockReturnValue(mockMapped);

    const result = searchItems('budget');

    expect(result).toHaveLength(1);
    expect(result[0].effective_sensitivity).toBe('confidential');
  });

  it('uses item sensitivity when not inherit', () => {
    const mockMapped = [
      {
        id: 1,
        item_number: '11.01.01',
        name: 'Test',
        sensitivity: 'restricted',
        folder_sensitivity: 'standard',
      },
    ];
    mockDb.exec.mockReturnValue([{ values: [] }]);
    mapResults.mockReturnValue(mockMapped);

    const result = searchItems('test');

    expect(result[0].effective_sensitivity).toBe('restricted');
  });

  it('returns empty array for empty query', () => {
    const result = searchItems('');

    expect(mockDb.exec).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('returns empty array for null query', () => {
    const result = searchItems(null);

    expect(mockDb.exec).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('searches multiple fields', () => {
    mockDb.exec.mockReturnValue([]);
    mapResults.mockReturnValue([]);

    searchItems('test');

    const call = mockDb.exec.mock.calls[0];
    const query = call[0];

    expect(query).toContain('i.item_number LIKE ?');
    expect(query).toContain('i.name LIKE ?');
    expect(query).toContain('i.description LIKE ?');
    expect(query).toContain('i.keywords LIKE ?');
    expect(query).toContain('i.notes LIKE ?');
    expect(query).toContain('f.name LIKE ?');
    expect(query).toContain('c.name LIKE ?');
    expect(query).toContain('a.name LIKE ?');
  });

  it('orders results by item_number', () => {
    mockDb.exec.mockReturnValue([]);
    mapResults.mockReturnValue([]);

    searchItems('test');

    const call = mockDb.exec.mock.calls[0];
    expect(call[0]).toContain('ORDER BY i.item_number');
  });
});

describe('searchAll', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    mapResults.mockReturnValue([]);
  });

  it('returns both folders and items', () => {
    mockDb.exec.mockReturnValue([{ values: [] }]);
    const mockFolders = [{ id: 1, folder_number: '11.01' }];
    const mockItems = [
      { id: 1, item_number: '11.01.01', sensitivity: 'standard', folder_sensitivity: 'standard' },
    ];
    mapResults.mockReturnValueOnce(mockFolders).mockReturnValueOnce(mockItems);

    const result = searchAll('test');

    expect(result).toHaveProperty('folders');
    expect(result).toHaveProperty('items');
    expect(result.folders).toEqual(mockFolders);
    expect(result.items).toHaveLength(1);
  });

  it('returns empty arrays for empty query', () => {
    const result = searchAll('');

    expect(result).toEqual({
      folders: [],
      items: [],
    });
  });

  it('calls both searchFolders and searchItems', () => {
    mockDb.exec.mockReturnValue([]);
    mapResults.mockReturnValue([]);

    searchAll('test');

    // Should have called exec twice - once for folders, once for items
    expect(mockDb.exec).toHaveBeenCalledTimes(2);
  });
});
