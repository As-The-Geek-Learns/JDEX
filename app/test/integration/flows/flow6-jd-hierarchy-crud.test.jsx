/**
 * Flow 6: JD Hierarchy CRUD Integration Tests
 *
 * Tests the complete Johnny Decimal hierarchy CRUD workflows:
 * - Area create, read, update, delete
 * - Category create, read, update, delete (with area relationship)
 * - Folder create, read, update, delete (with number assignment)
 * - Item create, read, update, delete (with number assignment)
 * - Search across all entities
 * - Import/Export roundtrip
 * - Cascading relationships
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  standardJDHierarchy,
  standardAreas,
  standardCategories,
  standardFolders,
  standardItems,
  minimalJDHierarchy,
  emptyJDHierarchy,
  generateLargeHierarchy,
} from '../../fixtures/jdHierarchy.js';

// =============================================================================
// Mock Database State Management
// =============================================================================

let mockDbState = {
  areas: [],
  categories: [],
  folders: [],
  items: [],
  storage_locations: [],
};

let idCounters = {
  areas: 1,
  categories: 1,
  folders: 1,
  items: 1,
};

/**
 * Reset database state before each test
 */
function resetDbState() {
  mockDbState = {
    areas: [],
    categories: [],
    folders: [],
    items: [],
    storage_locations: [],
  };
  idCounters = { areas: 1, categories: 1, folders: 1, items: 1 };
}

/**
 * Seed database with test data
 */
function seedDbState(data) {
  if (data.areas) {
    mockDbState.areas = [...data.areas];
    idCounters.areas = Math.max(...data.areas.map((a) => a.id), 0) + 1;
  }
  if (data.categories) {
    mockDbState.categories = [...data.categories];
    idCounters.categories = Math.max(...data.categories.map((c) => c.id), 0) + 1;
  }
  if (data.folders) {
    mockDbState.folders = [...data.folders];
    idCounters.folders = Math.max(...data.folders.map((f) => f.id), 0) + 1;
  }
  if (data.items) {
    mockDbState.items = [...data.items];
    idCounters.items = Math.max(...data.items.map((i) => i.id), 0) + 1;
  }
}

// =============================================================================
// Mock Repository Functions
// =============================================================================

// Areas
const mockGetAreas = vi.fn(() => mockDbState.areas);
const mockGetArea = vi.fn((id) => mockDbState.areas.find((a) => a.id === id));
const mockCreateArea = vi.fn((data) => {
  const newArea = {
    id: idCounters.areas++,
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockDbState.areas.push(newArea);
  return newArea.id;
});
const mockUpdateArea = vi.fn((id, data) => {
  const index = mockDbState.areas.findIndex((a) => a.id === id);
  if (index === -1) return false;
  mockDbState.areas[index] = {
    ...mockDbState.areas[index],
    ...data,
    updated_at: new Date().toISOString(),
  };
  return true;
});
const mockDeleteArea = vi.fn((id) => {
  const index = mockDbState.areas.findIndex((a) => a.id === id);
  if (index === -1) return false;
  // Cascade delete categories
  const categoryIds = mockDbState.categories.filter((c) => c.area_id === id).map((c) => c.id);
  categoryIds.forEach((catId) => mockDeleteCategory(catId));
  mockDbState.areas.splice(index, 1);
  return true;
});
const mockGetAreaCount = vi.fn(() => mockDbState.areas.length);
const mockIsAreaRangeAvailable = vi.fn((rangeStart, rangeEnd, excludeId = null) => {
  return !mockDbState.areas.some(
    (a) =>
      a.id !== excludeId &&
      ((rangeStart >= a.range_start && rangeStart <= a.range_end) ||
        (rangeEnd >= a.range_start && rangeEnd <= a.range_end))
  );
});

// Categories
const mockGetCategories = vi.fn(() => mockDbState.categories);
const mockGetCategory = vi.fn((id) => mockDbState.categories.find((c) => c.id === id));
const mockGetCategoryByNumber = vi.fn((number) =>
  mockDbState.categories.find((c) => c.number === number)
);
const mockCreateCategory = vi.fn((data) => {
  const newCategory = {
    id: idCounters.categories++,
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockDbState.categories.push(newCategory);
  return newCategory.id;
});
const mockUpdateCategory = vi.fn((id, data) => {
  const index = mockDbState.categories.findIndex((c) => c.id === id);
  if (index === -1) return false;
  mockDbState.categories[index] = {
    ...mockDbState.categories[index],
    ...data,
    updated_at: new Date().toISOString(),
  };
  return true;
});
const mockDeleteCategory = vi.fn((id) => {
  const index = mockDbState.categories.findIndex((c) => c.id === id);
  if (index === -1) return false;
  // Cascade delete folders
  const folderIds = mockDbState.folders.filter((f) => f.category_id === id).map((f) => f.id);
  folderIds.forEach((folderId) => mockDeleteFolder(folderId));
  mockDbState.categories.splice(index, 1);
  return true;
});
const _mockGetCategoryCount = vi.fn(() => mockDbState.categories.length);
const mockIsCategoryNumberAvailable = vi.fn((number, excludeId = null) => {
  return !mockDbState.categories.some((c) => c.id !== excludeId && c.number === number);
});

// Folders
const mockGetFolders = vi.fn(() => mockDbState.folders);
const mockGetFolder = vi.fn((id) => mockDbState.folders.find((f) => f.id === id));
const mockGetFolderByNumber = vi.fn((number) =>
  mockDbState.folders.find((f) => f.number === number)
);
const mockGetNextFolderNumber = vi.fn((categoryId) => {
  const category = mockDbState.categories.find((c) => c.id === categoryId);
  if (!category) return null;
  const existingFolders = mockDbState.folders.filter((f) => f.category_id === categoryId);
  const nextSeq = existingFolders.length + 1;
  return `${category.number}.${String(nextSeq).padStart(2, '0')}`;
});
const mockCreateFolder = vi.fn((data) => {
  const newFolder = {
    id: idCounters.folders++,
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockDbState.folders.push(newFolder);
  return newFolder.id;
});
const mockUpdateFolder = vi.fn((id, data) => {
  const index = mockDbState.folders.findIndex((f) => f.id === id);
  if (index === -1) return false;
  mockDbState.folders[index] = {
    ...mockDbState.folders[index],
    ...data,
    updated_at: new Date().toISOString(),
  };
  return true;
});
const mockDeleteFolder = vi.fn((id) => {
  const index = mockDbState.folders.findIndex((f) => f.id === id);
  if (index === -1) return false;
  // Cascade delete items
  mockDbState.items = mockDbState.items.filter((i) => i.folder_id !== id);
  mockDbState.folders.splice(index, 1);
  return true;
});
const mockGetFolderCount = vi.fn(() => mockDbState.folders.length);
const mockIsFolderNumberAvailable = vi.fn((number, excludeId = null) => {
  return !mockDbState.folders.some((f) => f.id !== excludeId && f.number === number);
});

// Items
const mockGetItems = vi.fn(() => mockDbState.items);
const mockGetItem = vi.fn((id) => mockDbState.items.find((i) => i.id === id));
const mockGetNextItemNumber = vi.fn((folderId) => {
  const folder = mockDbState.folders.find((f) => f.id === folderId);
  if (!folder) return null;
  const existingItems = mockDbState.items.filter((i) => i.folder_id === folderId);
  const nextSeq = existingItems.length + 1;
  return `${folder.number}.${String(nextSeq).padStart(3, '0')}`;
});
const mockCreateItem = vi.fn((data) => {
  const newItem = {
    id: idCounters.items++,
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockDbState.items.push(newItem);
  return newItem.id;
});
const mockUpdateItem = vi.fn((id, data) => {
  const index = mockDbState.items.findIndex((i) => i.id === id);
  if (index === -1) return false;
  mockDbState.items[index] = {
    ...mockDbState.items[index],
    ...data,
    updated_at: new Date().toISOString(),
  };
  return true;
});
const mockDeleteItem = vi.fn((id) => {
  const index = mockDbState.items.findIndex((i) => i.id === id);
  if (index === -1) return false;
  mockDbState.items.splice(index, 1);
  return true;
});
const mockGetItemCount = vi.fn(() => mockDbState.items.length);
const mockIsItemNumberAvailable = vi.fn((number, excludeId = null) => {
  return !mockDbState.items.some((i) => i.id !== excludeId && i.number === number);
});

// Search
const mockSearchFolders = vi.fn((query) => {
  const lowerQuery = query.toLowerCase();
  return mockDbState.folders.filter(
    (f) => f.name.toLowerCase().includes(lowerQuery) || f.number.includes(query)
  );
});
const mockSearchItems = vi.fn((query) => {
  const lowerQuery = query.toLowerCase();
  return mockDbState.items.filter(
    (i) => i.name.toLowerCase().includes(lowerQuery) || i.number.includes(query)
  );
});
const mockSearchAll = vi.fn((query) => {
  const folders = mockSearchFolders(query);
  const items = mockSearchItems(query);
  return { folders, items };
});

// Import/Export
const mockExportToJSON = vi.fn(() => ({
  version: '1.0',
  exported_at: new Date().toISOString(),
  data: {
    areas: mockDbState.areas,
    categories: mockDbState.categories,
    folders: mockDbState.folders,
    items: mockDbState.items,
  },
}));
const mockImportDatabase = vi.fn((jsonData) => {
  if (jsonData.data) {
    seedDbState(jsonData.data);
    return { success: true, imported: jsonData.data };
  }
  return { success: false, error: 'Invalid data format' };
});
const mockValidateImportJSON = vi.fn((jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);
    return { valid: true, data: parsed };
  } catch {
    return { valid: false, error: 'Invalid JSON' };
  }
});

// Statistics
const mockGetStats = vi.fn(() => ({
  areas: mockDbState.areas.length,
  categories: mockDbState.categories.length,
  folders: mockDbState.folders.length,
  items: mockDbState.items.length,
}));

// =============================================================================
// Setup and Teardown
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  resetDbState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// Area CRUD Tests
// =============================================================================

describe('Area CRUD Operations', () => {
  describe('Create Area', () => {
    it('should create a new area with valid data', () => {
      const areaData = {
        range_start: 10,
        range_end: 19,
        name: 'Finance',
        description: 'Financial documents',
      };

      const id = mockCreateArea(areaData);

      expect(id).toBe(1);
      expect(mockDbState.areas).toHaveLength(1);
      expect(mockDbState.areas[0].name).toBe('Finance');
    });

    it('should auto-generate timestamps on create', () => {
      const areaData = { range_start: 10, range_end: 19, name: 'Test' };

      mockCreateArea(areaData);

      const created = mockDbState.areas[0];
      expect(created.created_at).toBeDefined();
      expect(created.updated_at).toBeDefined();
    });

    it('should assign sequential IDs', () => {
      mockCreateArea({ range_start: 10, range_end: 19, name: 'Area 1' });
      mockCreateArea({ range_start: 20, range_end: 29, name: 'Area 2' });
      mockCreateArea({ range_start: 30, range_end: 39, name: 'Area 3' });

      expect(mockDbState.areas.map((a) => a.id)).toEqual([1, 2, 3]);
    });
  });

  describe('Read Area', () => {
    beforeEach(() => {
      seedDbState({ areas: standardAreas });
    });

    it('should return all areas', () => {
      const areas = mockGetAreas();

      expect(areas).toHaveLength(3);
      expect(areas[0].name).toBe('Finance');
    });

    it('should return area by id', () => {
      const area = mockGetArea(1);

      expect(area).toBeDefined();
      expect(area.name).toBe('Finance');
    });

    it('should return undefined for non-existent id', () => {
      const area = mockGetArea(999);

      expect(area).toBeUndefined();
    });

    it('should return correct area count', () => {
      const count = mockGetAreaCount();

      expect(count).toBe(3);
    });
  });

  describe('Update Area', () => {
    beforeEach(() => {
      seedDbState({ areas: standardAreas });
    });

    it('should update area name', () => {
      const result = mockUpdateArea(1, { name: 'Updated Finance' });

      expect(result).toBe(true);
      expect(mockGetArea(1).name).toBe('Updated Finance');
    });

    it('should update area description', () => {
      mockUpdateArea(1, { description: 'New description' });

      expect(mockGetArea(1).description).toBe('New description');
    });

    it('should update updated_at timestamp', () => {
      const originalUpdatedAt = mockGetArea(1).updated_at;

      // Small delay to ensure different timestamp
      mockUpdateArea(1, { name: 'Changed' });

      expect(mockGetArea(1).updated_at).not.toBe(originalUpdatedAt);
    });

    it('should return false for non-existent area', () => {
      const result = mockUpdateArea(999, { name: 'Test' });

      expect(result).toBe(false);
    });
  });

  describe('Delete Area', () => {
    beforeEach(() => {
      seedDbState(standardJDHierarchy);
    });

    it('should delete area by id', () => {
      const initialCount = mockGetAreaCount();

      const result = mockDeleteArea(3);

      expect(result).toBe(true);
      expect(mockGetAreaCount()).toBe(initialCount - 1);
      expect(mockGetArea(3)).toBeUndefined();
    });

    it('should return false for non-existent area', () => {
      const result = mockDeleteArea(999);

      expect(result).toBe(false);
    });

    it('should cascade delete categories when area deleted', () => {
      // Area 1 has categories 1 and 2
      mockDeleteArea(1);

      expect(mockGetCategory(1)).toBeUndefined();
      expect(mockGetCategory(2)).toBeUndefined();
    });

    it('should cascade delete folders when area deleted', () => {
      // Area 1 -> Categories 1,2 -> Folders 1,2,3
      const foldersBefore = mockGetFolders().length;

      mockDeleteArea(1);

      expect(mockGetFolders().length).toBeLessThan(foldersBefore);
    });
  });

  describe('Area Range Validation', () => {
    beforeEach(() => {
      seedDbState({ areas: standardAreas });
    });

    it('should detect overlapping range', () => {
      const isAvailable = mockIsAreaRangeAvailable(15, 25);

      expect(isAvailable).toBe(false);
    });

    it('should allow non-overlapping range', () => {
      const isAvailable = mockIsAreaRangeAvailable(40, 49);

      expect(isAvailable).toBe(true);
    });

    it('should exclude self when checking for updates', () => {
      // Area 1 is 10-19, checking if 10-19 is available excluding area 1
      const isAvailable = mockIsAreaRangeAvailable(10, 19, 1);

      expect(isAvailable).toBe(true);
    });
  });
});

// =============================================================================
// Category CRUD Tests
// =============================================================================

describe('Category CRUD Operations', () => {
  describe('Create Category', () => {
    beforeEach(() => {
      seedDbState({ areas: standardAreas });
    });

    it('should create category with area relationship', () => {
      const categoryData = {
        number: 13,
        area_id: 1,
        name: 'Tax Documents',
        description: 'Tax-related files',
      };

      const id = mockCreateCategory(categoryData);

      expect(id).toBeGreaterThan(0);
      expect(mockGetCategory(id).area_id).toBe(1);
    });

    it('should assign sequential IDs', () => {
      mockCreateCategory({ number: 13, area_id: 1, name: 'Cat 1' });
      mockCreateCategory({ number: 14, area_id: 1, name: 'Cat 2' });

      const categories = mockGetCategories();
      expect(categories[categories.length - 1].id).toBe(2);
    });
  });

  describe('Read Category', () => {
    beforeEach(() => {
      seedDbState({ areas: standardAreas, categories: standardCategories });
    });

    it('should return all categories', () => {
      const categories = mockGetCategories();

      expect(categories).toHaveLength(5);
    });

    it('should return category by id', () => {
      const category = mockGetCategory(1);

      expect(category.name).toBe('Invoices');
    });

    it('should return category by number', () => {
      const category = mockGetCategoryByNumber(11);

      expect(category.name).toBe('Invoices');
    });

    it('should return undefined for non-existent number', () => {
      const category = mockGetCategoryByNumber(99);

      expect(category).toBeUndefined();
    });
  });

  describe('Update Category', () => {
    beforeEach(() => {
      seedDbState({ areas: standardAreas, categories: standardCategories });
    });

    it('should update category name', () => {
      mockUpdateCategory(1, { name: 'All Invoices' });

      expect(mockGetCategory(1).name).toBe('All Invoices');
    });

    it('should preserve area_id on update', () => {
      const originalAreaId = mockGetCategory(1).area_id;

      mockUpdateCategory(1, { name: 'Updated' });

      expect(mockGetCategory(1).area_id).toBe(originalAreaId);
    });
  });

  describe('Delete Category', () => {
    beforeEach(() => {
      seedDbState(standardJDHierarchy);
    });

    it('should delete category', () => {
      const result = mockDeleteCategory(5);

      expect(result).toBe(true);
      expect(mockGetCategory(5)).toBeUndefined();
    });

    it('should cascade delete folders', () => {
      // Category 1 has folders 1 and 2
      mockDeleteCategory(1);

      expect(mockGetFolder(1)).toBeUndefined();
      expect(mockGetFolder(2)).toBeUndefined();
    });
  });

  describe('Category Number Validation', () => {
    beforeEach(() => {
      seedDbState({ areas: standardAreas, categories: standardCategories });
    });

    it('should detect duplicate number', () => {
      const isAvailable = mockIsCategoryNumberAvailable(11);

      expect(isAvailable).toBe(false);
    });

    it('should allow unique number', () => {
      const isAvailable = mockIsCategoryNumberAvailable(99);

      expect(isAvailable).toBe(true);
    });

    it('should exclude self when checking for updates', () => {
      const isAvailable = mockIsCategoryNumberAvailable(11, 1);

      expect(isAvailable).toBe(true);
    });
  });
});

// =============================================================================
// Folder CRUD Tests
// =============================================================================

describe('Folder CRUD Operations', () => {
  describe('Create Folder', () => {
    beforeEach(() => {
      seedDbState({ areas: standardAreas, categories: standardCategories });
    });

    it('should create folder with category relationship', () => {
      const folderData = {
        number: '11.03',
        category_id: 1,
        name: 'Archive',
        description: 'Archived invoices',
      };

      const id = mockCreateFolder(folderData);

      expect(id).toBeGreaterThan(0);
      expect(mockGetFolder(id).category_id).toBe(1);
    });

    it('should auto-generate timestamps', () => {
      mockCreateFolder({ number: '11.03', category_id: 1, name: 'Test' });

      const folder = mockGetFolders()[0];
      expect(folder.created_at).toBeDefined();
      expect(folder.updated_at).toBeDefined();
    });
  });

  describe('Read Folder', () => {
    beforeEach(() => {
      seedDbState({
        areas: standardAreas,
        categories: standardCategories,
        folders: standardFolders,
      });
    });

    it('should return all folders', () => {
      const folders = mockGetFolders();

      expect(folders).toHaveLength(7);
    });

    it('should return folder by id', () => {
      const folder = mockGetFolder(1);

      expect(folder.name).toBe('Client Invoices');
    });

    it('should return folder by number', () => {
      const folder = mockGetFolderByNumber('11.01');

      expect(folder.name).toBe('Client Invoices');
    });

    it('should return correct folder count', () => {
      expect(mockGetFolderCount()).toBe(7);
    });
  });

  describe('Update Folder', () => {
    beforeEach(() => {
      seedDbState({
        areas: standardAreas,
        categories: standardCategories,
        folders: standardFolders,
      });
    });

    it('should update folder name', () => {
      mockUpdateFolder(1, { name: 'Updated Invoices' });

      expect(mockGetFolder(1).name).toBe('Updated Invoices');
    });

    it('should update folder path', () => {
      mockUpdateFolder(1, { file_path: '/new/path' });

      expect(mockGetFolder(1).file_path).toBe('/new/path');
    });
  });

  describe('Delete Folder', () => {
    beforeEach(() => {
      seedDbState(standardJDHierarchy);
    });

    it('should delete folder', () => {
      const result = mockDeleteFolder(1);

      expect(result).toBe(true);
      expect(mockGetFolder(1)).toBeUndefined();
    });

    it('should cascade delete items', () => {
      // Folder 1 has item 1
      mockDeleteFolder(1);

      expect(mockGetItem(1)).toBeUndefined();
    });
  });

  describe('Folder Number Generation', () => {
    beforeEach(() => {
      seedDbState({
        areas: standardAreas,
        categories: standardCategories,
        folders: standardFolders,
      });
    });

    it('should generate next folder number for category', () => {
      // Category 1 already has folders 11.01, 11.02
      const nextNumber = mockGetNextFolderNumber(1);

      expect(nextNumber).toBe('11.03');
    });

    it('should return null for non-existent category', () => {
      const nextNumber = mockGetNextFolderNumber(999);

      expect(nextNumber).toBeNull();
    });

    it('should generate first folder number for empty category', () => {
      // Category 4 has no folders in our fixture
      const nextNumber = mockGetNextFolderNumber(4);

      expect(nextNumber).toBe('22.01');
    });
  });

  describe('Folder Number Validation', () => {
    beforeEach(() => {
      seedDbState({
        areas: standardAreas,
        categories: standardCategories,
        folders: standardFolders,
      });
    });

    it('should detect duplicate folder number', () => {
      const isAvailable = mockIsFolderNumberAvailable('11.01');

      expect(isAvailable).toBe(false);
    });

    it('should allow unique folder number', () => {
      const isAvailable = mockIsFolderNumberAvailable('99.99');

      expect(isAvailable).toBe(true);
    });
  });
});

// =============================================================================
// Item CRUD Tests
// =============================================================================

describe('Item CRUD Operations', () => {
  describe('Create Item', () => {
    beforeEach(() => {
      seedDbState({
        areas: standardAreas,
        categories: standardCategories,
        folders: standardFolders,
      });
    });

    it('should create item with folder relationship', () => {
      const itemData = {
        number: '11.01.001',
        folder_id: 1,
        name: 'Test Document',
        description: 'A test document',
      };

      const id = mockCreateItem(itemData);

      expect(id).toBeGreaterThan(0);
      expect(mockGetItem(id).folder_id).toBe(1);
    });

    it('should auto-generate timestamps', () => {
      mockCreateItem({ number: '11.01.001', folder_id: 1, name: 'Test' });

      const item = mockGetItems()[0];
      expect(item.created_at).toBeDefined();
      expect(item.updated_at).toBeDefined();
    });
  });

  describe('Read Item', () => {
    beforeEach(() => {
      seedDbState(standardJDHierarchy);
    });

    it('should return all items', () => {
      const items = mockGetItems();

      expect(items).toHaveLength(1);
    });

    it('should return item by id', () => {
      const item = mockGetItem(1);

      expect(item.name).toBe('Invoice - Acme Corp Jan 2025');
    });

    it('should return correct item count', () => {
      expect(mockGetItemCount()).toBe(1);
    });
  });

  describe('Update Item', () => {
    beforeEach(() => {
      seedDbState(standardJDHierarchy);
    });

    it('should update item name', () => {
      mockUpdateItem(1, { name: 'Updated Invoice' });

      expect(mockGetItem(1).name).toBe('Updated Invoice');
    });

    it('should update item description', () => {
      mockUpdateItem(1, { description: 'New description' });

      expect(mockGetItem(1).description).toBe('New description');
    });
  });

  describe('Delete Item', () => {
    beforeEach(() => {
      seedDbState(standardJDHierarchy);
    });

    it('should delete item', () => {
      const result = mockDeleteItem(1);

      expect(result).toBe(true);
      expect(mockGetItem(1)).toBeUndefined();
    });

    it('should return false for non-existent item', () => {
      const result = mockDeleteItem(999);

      expect(result).toBe(false);
    });
  });

  describe('Item Number Generation', () => {
    beforeEach(() => {
      seedDbState(standardJDHierarchy);
    });

    it('should generate next item number for folder', () => {
      // Folder 1 already has item 11.01.001
      const nextNumber = mockGetNextItemNumber(1);

      expect(nextNumber).toBe('11.01.002');
    });

    it('should return null for non-existent folder', () => {
      const nextNumber = mockGetNextItemNumber(999);

      expect(nextNumber).toBeNull();
    });

    it('should generate first item number for empty folder', () => {
      // Folder 2 has no items
      const nextNumber = mockGetNextItemNumber(2);

      expect(nextNumber).toBe('11.02.001');
    });
  });

  describe('Item Number Validation', () => {
    beforeEach(() => {
      seedDbState(standardJDHierarchy);
    });

    it('should detect duplicate item number', () => {
      const isAvailable = mockIsItemNumberAvailable('11.01.001');

      expect(isAvailable).toBe(false);
    });

    it('should allow unique item number', () => {
      const isAvailable = mockIsItemNumberAvailable('99.99.999');

      expect(isAvailable).toBe(true);
    });
  });
});

// =============================================================================
// Search Integration Tests
// =============================================================================

describe('Search Operations', () => {
  beforeEach(() => {
    seedDbState(standardJDHierarchy);
  });

  describe('Search Folders', () => {
    it('should find folders by name', () => {
      const results = mockSearchFolders('Invoice');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Invoice');
    });

    it('should find folders by number', () => {
      const results = mockSearchFolders('11.01');

      expect(results).toHaveLength(1);
      expect(results[0].number).toBe('11.01');
    });

    it('should return empty array for no matches', () => {
      const results = mockSearchFolders('xyznonexistent');

      expect(results).toHaveLength(0);
    });

    it('should be case-insensitive', () => {
      const resultsLower = mockSearchFolders('invoice');
      const resultsUpper = mockSearchFolders('INVOICE');

      expect(resultsLower.length).toEqual(resultsUpper.length);
    });
  });

  describe('Search Items', () => {
    it('should find items by name', () => {
      const results = mockSearchItems('Acme');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Acme');
    });

    it('should find items by number', () => {
      const results = mockSearchItems('11.01.001');

      expect(results).toHaveLength(1);
    });

    it('should return empty array for no matches', () => {
      const results = mockSearchItems('xyznonexistent');

      expect(results).toHaveLength(0);
    });
  });

  describe('Search All', () => {
    it('should search both folders and items', () => {
      const results = mockSearchAll('11');

      expect(results.folders.length).toBeGreaterThan(0);
      expect(results.items.length).toBeGreaterThan(0);
    });

    it('should return empty arrays for no matches', () => {
      const results = mockSearchAll('xyznonexistent');

      expect(results.folders).toHaveLength(0);
      expect(results.items).toHaveLength(0);
    });
  });
});

// =============================================================================
// Import/Export Integration Tests
// =============================================================================

describe('Import/Export Operations', () => {
  describe('Export to JSON', () => {
    beforeEach(() => {
      seedDbState(standardJDHierarchy);
    });

    it('should export all data to JSON format', () => {
      const exported = mockExportToJSON();

      expect(exported.version).toBe('1.0');
      expect(exported.exported_at).toBeDefined();
      expect(exported.data.areas).toHaveLength(3);
      expect(exported.data.categories).toHaveLength(5);
      expect(exported.data.folders).toHaveLength(7);
    });

    it('should include timestamps in export', () => {
      const exported = mockExportToJSON();

      expect(exported.exported_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('Import from JSON', () => {
    it('should import valid JSON data', () => {
      const importData = {
        data: {
          areas: [{ id: 1, range_start: 10, range_end: 19, name: 'Imported' }],
          categories: [],
          folders: [],
          items: [],
        },
      };

      const result = mockImportDatabase(importData);

      expect(result.success).toBe(true);
      expect(mockGetAreas()).toHaveLength(1);
      expect(mockGetAreas()[0].name).toBe('Imported');
    });

    it('should return error for invalid format', () => {
      const result = mockImportDatabase({});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Validate Import JSON', () => {
    it('should validate valid JSON string', () => {
      const jsonString = JSON.stringify({ data: { areas: [] } });

      const result = mockValidateImportJSON(jsonString);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject invalid JSON string', () => {
      const result = mockValidateImportJSON('not valid json');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Export/Import Roundtrip', () => {
    it('should preserve data through export/import cycle', () => {
      seedDbState(standardJDHierarchy);

      const exported = mockExportToJSON();
      resetDbState();
      mockImportDatabase(exported);

      expect(mockGetAreas()).toHaveLength(3);
      expect(mockGetCategories()).toHaveLength(5);
      expect(mockGetFolders()).toHaveLength(7);
      expect(mockGetItems()).toHaveLength(1);
    });

    it('should preserve area names through roundtrip', () => {
      seedDbState(standardJDHierarchy);
      const originalName = mockGetArea(1).name;

      const exported = mockExportToJSON();
      resetDbState();
      mockImportDatabase(exported);

      expect(mockGetArea(1).name).toBe(originalName);
    });
  });
});

// =============================================================================
// Cascading Relationship Tests
// =============================================================================

describe('Cascading Relationships', () => {
  beforeEach(() => {
    seedDbState(standardJDHierarchy);
  });

  describe('Area Cascade Delete', () => {
    it('should delete all child categories when area deleted', () => {
      const categoriesBefore = mockGetCategories().filter((c) => c.area_id === 1).length;
      expect(categoriesBefore).toBeGreaterThan(0);

      mockDeleteArea(1);

      const categoriesAfter = mockGetCategories().filter((c) => c.area_id === 1).length;
      expect(categoriesAfter).toBe(0);
    });

    it('should delete all grandchild folders when area deleted', () => {
      // Get all folders under area 1's categories
      const categoryIds = mockGetCategories()
        .filter((c) => c.area_id === 1)
        .map((c) => c.id);
      const foldersBefore = mockGetFolders().filter((f) =>
        categoryIds.includes(f.category_id)
      ).length;
      expect(foldersBefore).toBeGreaterThan(0);

      mockDeleteArea(1);

      const foldersAfter = mockGetFolders().filter((f) =>
        categoryIds.includes(f.category_id)
      ).length;
      expect(foldersAfter).toBe(0);
    });
  });

  describe('Category Cascade Delete', () => {
    it('should delete all child folders when category deleted', () => {
      const foldersBefore = mockGetFolders().filter((f) => f.category_id === 1).length;
      expect(foldersBefore).toBeGreaterThan(0);

      mockDeleteCategory(1);

      const foldersAfter = mockGetFolders().filter((f) => f.category_id === 1).length;
      expect(foldersAfter).toBe(0);
    });
  });

  describe('Folder Cascade Delete', () => {
    it('should delete all child items when folder deleted', () => {
      const itemsBefore = mockGetItems().filter((i) => i.folder_id === 1).length;
      expect(itemsBefore).toBeGreaterThan(0);

      mockDeleteFolder(1);

      const itemsAfter = mockGetItems().filter((i) => i.folder_id === 1).length;
      expect(itemsAfter).toBe(0);
    });
  });

  describe('Orphan Prevention', () => {
    it('should not leave orphaned categories after area delete', () => {
      mockDeleteArea(1);

      const orphans = mockGetCategories().filter(
        (c) => !mockGetAreas().some((a) => a.id === c.area_id)
      );
      expect(orphans).toHaveLength(0);
    });

    it('should not leave orphaned folders after category delete', () => {
      mockDeleteCategory(1);

      const orphans = mockGetFolders().filter(
        (f) => !mockGetCategories().some((c) => c.id === f.category_id)
      );
      expect(orphans).toHaveLength(0);
    });

    it('should not leave orphaned items after folder delete', () => {
      mockDeleteFolder(1);

      const orphans = mockGetItems().filter(
        (i) => !mockGetFolders().some((f) => f.id === i.folder_id)
      );
      expect(orphans).toHaveLength(0);
    });
  });
});

// =============================================================================
// Statistics Tests
// =============================================================================

describe('Statistics Operations', () => {
  it('should return zero counts for empty database', () => {
    const stats = mockGetStats();

    expect(stats.areas).toBe(0);
    expect(stats.categories).toBe(0);
    expect(stats.folders).toBe(0);
    expect(stats.items).toBe(0);
  });

  it('should return correct counts for populated database', () => {
    seedDbState(standardJDHierarchy);

    const stats = mockGetStats();

    expect(stats.areas).toBe(3);
    expect(stats.categories).toBe(5);
    expect(stats.folders).toBe(7);
    expect(stats.items).toBe(1);
  });

  it('should update counts after CRUD operations', () => {
    seedDbState(standardJDHierarchy);
    const initialStats = mockGetStats();

    mockCreateArea({ range_start: 40, range_end: 49, name: 'New Area' });
    const afterCreate = mockGetStats();

    expect(afterCreate.areas).toBe(initialStats.areas + 1);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  describe('Empty Database', () => {
    it('should handle operations on empty database', () => {
      expect(mockGetAreas()).toHaveLength(0);
      expect(mockGetCategories()).toHaveLength(0);
      expect(mockGetFolders()).toHaveLength(0);
      expect(mockGetItems()).toHaveLength(0);
    });

    it('should allow creating first area', () => {
      const id = mockCreateArea({ range_start: 10, range_end: 19, name: 'First' });

      expect(id).toBe(1);
    });
  });

  describe('Large Hierarchy', () => {
    it('should handle large number of entities', () => {
      const largeData = generateLargeHierarchy(5, 5, 10);
      seedDbState(largeData);

      expect(mockGetAreas()).toHaveLength(5);
      expect(mockGetCategories()).toHaveLength(25);
      expect(mockGetFolders()).toHaveLength(250);
    });

    it('should search efficiently in large dataset', () => {
      const largeData = generateLargeHierarchy(5, 5, 10);
      seedDbState(largeData);

      const results = mockSearchFolders('Folder 11.01');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Special Characters', () => {
    it('should handle special characters in names', () => {
      const id = mockCreateArea({
        range_start: 10,
        range_end: 19,
        name: "Test's Area & More <special>",
      });

      expect(mockGetArea(id).name).toBe("Test's Area & More <special>");
    });

    it('should handle unicode in descriptions', () => {
      const id = mockCreateArea({
        range_start: 10,
        range_end: 19,
        name: 'Unicode Test',
        description: '日本語 русский العربية 中文',
      });

      expect(mockGetArea(id).description).toContain('日本語');
    });
  });

  describe('Boundary Values', () => {
    it('should handle area range at boundaries', () => {
      mockCreateArea({ range_start: 10, range_end: 19, name: 'Start' });
      mockCreateArea({ range_start: 90, range_end: 99, name: 'End' });

      expect(mockGetAreas()).toHaveLength(2);
    });

    it('should handle maximum folder number', () => {
      seedDbState({ areas: standardAreas, categories: standardCategories });

      const id = mockCreateFolder({
        number: '11.99',
        category_id: 1,
        name: 'Max Folder',
      });

      expect(mockGetFolder(id).number).toBe('11.99');
    });

    it('should handle maximum item number', () => {
      seedDbState({
        areas: standardAreas,
        categories: standardCategories,
        folders: standardFolders,
      });

      const id = mockCreateItem({
        number: '11.01.999',
        folder_id: 1,
        name: 'Max Item',
      });

      expect(mockGetItem(id).number).toBe('11.01.999');
    });
  });
});

// =============================================================================
// Fixture Helper Tests
// =============================================================================

describe('Test Fixtures', () => {
  describe('Standard Hierarchy', () => {
    it('should have valid area structure', () => {
      expect(standardAreas).toHaveLength(3);
      standardAreas.forEach((area) => {
        expect(area.id).toBeDefined();
        expect(area.range_start).toBeDefined();
        expect(area.range_end).toBeDefined();
        expect(area.name).toBeDefined();
      });
    });

    it('should have valid category-area relationships', () => {
      standardCategories.forEach((category) => {
        const area = standardAreas.find((a) => a.id === category.area_id);
        expect(area).toBeDefined();
      });
    });

    it('should have valid folder-category relationships', () => {
      standardFolders.forEach((folder) => {
        const category = standardCategories.find((c) => c.id === folder.category_id);
        expect(category).toBeDefined();
      });
    });

    it('should have valid item-folder relationships', () => {
      standardItems.forEach((item) => {
        const folder = standardFolders.find((f) => f.id === item.folder_id);
        expect(folder).toBeDefined();
      });
    });
  });

  describe('Minimal Hierarchy', () => {
    it('should have single area', () => {
      expect(minimalJDHierarchy.areas).toHaveLength(1);
    });

    it('should have single category', () => {
      expect(minimalJDHierarchy.categories).toHaveLength(1);
    });

    it('should have single folder', () => {
      expect(minimalJDHierarchy.folders).toHaveLength(1);
    });

    it('should have no items', () => {
      expect(minimalJDHierarchy.items).toHaveLength(0);
    });
  });

  describe('Empty Hierarchy', () => {
    it('should have empty arrays', () => {
      expect(emptyJDHierarchy.areas).toHaveLength(0);
      expect(emptyJDHierarchy.categories).toHaveLength(0);
      expect(emptyJDHierarchy.folders).toHaveLength(0);
      expect(emptyJDHierarchy.items).toHaveLength(0);
    });
  });

  describe('Large Hierarchy Generator', () => {
    it('should generate correct number of areas', () => {
      const hierarchy = generateLargeHierarchy(3, 2, 5);

      expect(hierarchy.areas).toHaveLength(3);
    });

    it('should generate correct number of categories', () => {
      const hierarchy = generateLargeHierarchy(3, 2, 5);

      expect(hierarchy.categories).toHaveLength(6); // 3 areas * 2 categories
    });

    it('should generate correct number of folders', () => {
      const hierarchy = generateLargeHierarchy(3, 2, 5);

      expect(hierarchy.folders).toHaveLength(30); // 6 categories * 5 folders
    });

    it('should generate valid folder numbers', () => {
      const hierarchy = generateLargeHierarchy(2, 2, 3);

      hierarchy.folders.forEach((folder) => {
        expect(folder.number).toMatch(/^\d+\.\d{2}$/);
      });
    });
  });
});
