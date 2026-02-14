/**
 * Import/Export Repository Tests
 * ===============================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EXPORT_VERSION,
  SCHEMA_DESCRIPTION,
  exportDatabase,
  importDatabase,
  exportDatabaseBytes,
  importDatabaseBytes,
  exportToJSON,
  buildExportData,
  exportToJSONString,
  validateImportJSON,
  getExportSummary,
} from '../import-export.js';

// Mock dependencies
vi.mock('../../core/database.js', () => ({
  getDB: vi.fn(),
  setDB: vi.fn(),
  getSQL: vi.fn(),
  saveDatabase: vi.fn(),
}));

vi.mock('../areas.js', () => ({
  getAreas: vi.fn(() => [{ id: 1, name: 'Area 1', range_start: 10, range_end: 19 }]),
}));

vi.mock('../categories.js', () => ({
  getCategories: vi.fn(() => [{ id: 1, name: 'Category 1', number: 11 }]),
}));

vi.mock('../folders.js', () => ({
  getFolders: vi.fn(() => [{ id: 1, name: 'Folder 1', folder_number: '11.01' }]),
}));

vi.mock('../items.js', () => ({
  getItems: vi.fn(() => [{ id: 1, name: 'Item 1' }]),
}));

vi.mock('../storage-locations.js', () => ({
  getStorageLocations: vi.fn(() => [{ id: 1, name: 'Local' }]),
}));

import { getDB, setDB, getSQL, saveDatabase } from '../../core/database.js';
import { getAreas } from '../areas.js';
import { getCategories } from '../categories.js';
import { getFolders } from '../folders.js';
import { getItems } from '../items.js';
import { getStorageLocations } from '../storage-locations.js';

// ============================================
// CONSTANTS
// ============================================

describe('Constants', () => {
  it('exports version', () => {
    expect(EXPORT_VERSION).toBe('2.0');
  });

  it('exports schema description', () => {
    expect(SCHEMA_DESCRIPTION).toBe('4-level (Area > Category > Folder > Item)');
  });
});

// ============================================
// SQLITE EXPORT/IMPORT
// ============================================

describe('exportDatabase', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      export: vi.fn(() => new Uint8Array([1, 2, 3, 4])),
    };
    getDB.mockReturnValue(mockDb);

    // Mock DOM APIs
    global.Blob = vi.fn((content, options) => ({ content, options }));
    global.URL = {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    };
    global.document = {
      createElement: vi.fn(() => ({
        click: vi.fn(),
        href: '',
        download: '',
      })),
    };
  });

  it('exports database as blob download', () => {
    exportDatabase();

    expect(mockDb.export).toHaveBeenCalled();
    expect(global.Blob).toHaveBeenCalledWith([expect.any(Uint8Array)], {
      type: 'application/octet-stream',
    });
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('creates download link with correct filename pattern', () => {
    const mockElement = { click: vi.fn(), href: '', download: '' };
    global.document.createElement.mockReturnValue(mockElement);

    exportDatabase();

    expect(mockElement.download).toMatch(/^jdex-v2-backup-\d{4}-\d{2}-\d{2}\.sqlite$/);
  });

  it('handles null database gracefully', () => {
    getDB.mockReturnValue(null);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    exportDatabase();

    expect(consoleSpy).toHaveBeenCalledWith('[JDex DB] Cannot export: database not initialized');
    consoleSpy.mockRestore();
  });
});

describe('importDatabase', () => {
  let mockSQL;
  let mockNewDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNewDb = { id: 'new-db' };
    mockSQL = {
      Database: vi.fn(() => mockNewDb),
    };
    getSQL.mockReturnValue(mockSQL);
  });

  it('imports a valid SQLite file', async () => {
    // Create a mock file with SQLite header
    const sqliteHeader = new TextEncoder().encode('SQLite format 3\0');
    const fileContent = new Uint8Array([...sqliteHeader, 0, 0, 0, 0]);

    const mockFile = {
      arrayBuffer: vi.fn(() => Promise.resolve(fileContent.buffer)),
    };

    const result = await importDatabase(mockFile);

    expect(result).toBe(true);
    expect(mockSQL.Database).toHaveBeenCalled();
    expect(setDB).toHaveBeenCalledWith(mockNewDb);
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('throws on invalid SQLite file', async () => {
    const invalidContent = new TextEncoder().encode('Not a SQLite file');
    const mockFile = {
      arrayBuffer: vi.fn(() => Promise.resolve(invalidContent.buffer)),
    };

    await expect(importDatabase(mockFile)).rejects.toThrow('Invalid SQLite database file');
  });

  it('throws when SQL.js not loaded', async () => {
    getSQL.mockReturnValue(null);
    const mockFile = { arrayBuffer: vi.fn() };

    await expect(importDatabase(mockFile)).rejects.toThrow(
      'SQL.js not loaded. Call initDatabase first.'
    );
  });
});

describe('exportDatabaseBytes', () => {
  it('returns database bytes', () => {
    const mockBytes = new Uint8Array([1, 2, 3]);
    const mockDb = { export: vi.fn(() => mockBytes) };
    getDB.mockReturnValue(mockDb);

    const result = exportDatabaseBytes();

    expect(result).toBe(mockBytes);
  });

  it('returns null when database not initialized', () => {
    getDB.mockReturnValue(null);

    const result = exportDatabaseBytes();

    expect(result).toBeNull();
  });
});

describe('importDatabaseBytes', () => {
  let mockSQL;
  let mockNewDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNewDb = { id: 'new-db' };
    mockSQL = {
      Database: vi.fn(() => mockNewDb),
    };
    getSQL.mockReturnValue(mockSQL);
  });

  it('imports database from bytes', () => {
    const bytes = new Uint8Array([1, 2, 3]);

    const result = importDatabaseBytes(bytes);

    expect(result).toBe(true);
    expect(mockSQL.Database).toHaveBeenCalledWith(bytes);
    expect(setDB).toHaveBeenCalledWith(mockNewDb);
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('throws when SQL.js not loaded', () => {
    getSQL.mockReturnValue(null);

    expect(() => importDatabaseBytes(new Uint8Array([1]))).toThrow(
      'SQL.js not loaded. Call initDatabase first.'
    );
  });
});

// ============================================
// JSON EXPORT/IMPORT
// ============================================

describe('exportToJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock DOM APIs
    global.Blob = vi.fn((content, options) => ({ content, options }));
    global.URL = {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    };
    global.document = {
      createElement: vi.fn(() => ({
        click: vi.fn(),
        href: '',
        download: '',
      })),
    };
  });

  it('exports data as JSON download', () => {
    exportToJSON();

    expect(global.Blob).toHaveBeenCalledWith([expect.any(String)], { type: 'application/json' });
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('creates download link with correct filename pattern', () => {
    const mockElement = { click: vi.fn(), href: '', download: '' };
    global.document.createElement.mockReturnValue(mockElement);

    exportToJSON();

    expect(mockElement.download).toMatch(/^jdex-v2-export-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

describe('buildExportData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds export data object with all entities', () => {
    const result = buildExportData();

    expect(result).toHaveProperty('exported_at');
    expect(result.version).toBe(EXPORT_VERSION);
    expect(result.schema).toBe(SCHEMA_DESCRIPTION);
    expect(result).toHaveProperty('areas');
    expect(result).toHaveProperty('categories');
    expect(result).toHaveProperty('folders');
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('storage_locations');
  });

  it('calls all entity getters', () => {
    buildExportData();

    expect(getAreas).toHaveBeenCalled();
    expect(getCategories).toHaveBeenCalled();
    expect(getFolders).toHaveBeenCalled();
    expect(getItems).toHaveBeenCalled();
    expect(getStorageLocations).toHaveBeenCalled();
  });

  it('includes ISO timestamp', () => {
    const result = buildExportData();

    expect(result.exported_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('exportToJSONString', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns pretty-printed JSON by default', () => {
    const result = exportToJSONString();

    expect(result).toContain('\n');
    expect(result).toContain('  ');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('returns compact JSON when pretty=false', () => {
    const result = exportToJSONString(false);

    expect(result).not.toContain('\n  ');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('includes all export data', () => {
    const result = JSON.parse(exportToJSONString());

    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('areas');
    expect(result).toHaveProperty('categories');
    expect(result).toHaveProperty('folders');
  });
});

describe('validateImportJSON', () => {
  it('validates a correct import structure', () => {
    const validData = {
      areas: [{ name: 'Area 1', range_start: 10, range_end: 19 }],
      categories: [{ name: 'Category 1', number: 11 }],
      folders: [{ name: 'Folder 1', folder_number: '11.01' }],
    };

    const result = validateImportJSON(validData);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns invalid for null data', () => {
    const result = validateImportJSON(null);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid data format: expected an object');
  });

  it('returns invalid for non-object data', () => {
    const result = validateImportJSON('string');

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid data format: expected an object');
  });

  it('detects missing required fields', () => {
    const result = validateImportJSON({});

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing or invalid required field: areas (expected array)');
    expect(result.errors).toContain(
      'Missing or invalid required field: categories (expected array)'
    );
    expect(result.errors).toContain('Missing or invalid required field: folders (expected array)');
  });

  it('detects non-array fields', () => {
    const result = validateImportJSON({
      areas: 'not an array',
      categories: {},
      folders: null,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('validates area properties', () => {
    const result = validateImportJSON({
      areas: [{ name: 'Area 1' }], // Missing range_start and range_end
      categories: [{ name: 'Cat', number: 1 }],
      folders: [{ name: 'Folder', folder_number: '11.01' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Area at index 0 missing 'range_start'");
    expect(result.errors).toContain("Area at index 0 missing 'range_end'");
  });

  it('validates area name is required', () => {
    const result = validateImportJSON({
      areas: [{ range_start: 10, range_end: 19 }],
      categories: [{ name: 'Cat', number: 1 }],
      folders: [{ name: 'Folder', folder_number: '11.01' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Area at index 0 missing 'name'");
  });

  it('validates category properties', () => {
    const result = validateImportJSON({
      areas: [{ name: 'Area', range_start: 10, range_end: 19 }],
      categories: [{ name: 'Category 1' }], // Missing number
      folders: [{ name: 'Folder', folder_number: '11.01' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Category at index 0 missing 'number'");
  });

  it('validates category name is required', () => {
    const result = validateImportJSON({
      areas: [{ name: 'Area', range_start: 10, range_end: 19 }],
      categories: [{ number: 11 }],
      folders: [{ name: 'Folder', folder_number: '11.01' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Category at index 0 missing 'name'");
  });

  it('validates folder properties', () => {
    const result = validateImportJSON({
      areas: [{ name: 'Area', range_start: 10, range_end: 19 }],
      categories: [{ name: 'Category', number: 11 }],
      folders: [{ name: 'Folder 1' }], // Missing folder_number
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Folder at index 0 missing 'folder_number'");
  });

  it('validates folder name is required', () => {
    const result = validateImportJSON({
      areas: [{ name: 'Area', range_start: 10, range_end: 19 }],
      categories: [{ name: 'Category', number: 11 }],
      folders: [{ folder_number: '11.01' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Folder at index 0 missing 'name'");
  });

  it('validates multiple items and reports all errors', () => {
    const result = validateImportJSON({
      areas: [
        { name: 'Area 1', range_start: 10, range_end: 19 },
        { range_start: 20, range_end: 29 }, // Missing name
      ],
      categories: [{ name: 'Category 1', number: 11 }],
      folders: [{ name: 'Folder 1', folder_number: '11.01' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Area at index 1 missing 'name'");
  });

  it('accepts items array as optional', () => {
    const result = validateImportJSON({
      areas: [{ name: 'Area', range_start: 10, range_end: 19 }],
      categories: [{ name: 'Category', number: 11 }],
      folders: [{ name: 'Folder', folder_number: '11.01' }],
      // items not provided
    });

    expect(result.valid).toBe(true);
  });
});

describe('getExportSummary', () => {
  it('returns summary with counts', () => {
    const data = {
      exported_at: '2026-01-01T00:00:00Z',
      version: '2.0',
      areas: [1, 2, 3],
      categories: [1, 2],
      folders: [1, 2, 3, 4, 5],
      items: [1],
      storage_locations: [1, 2],
    };

    const result = getExportSummary(data);

    expect(result).toEqual({
      exported_at: '2026-01-01T00:00:00Z',
      version: '2.0',
      counts: {
        areas: 3,
        categories: 2,
        folders: 5,
        items: 1,
        storage_locations: 2,
      },
    });
  });

  it('handles missing arrays as zero counts', () => {
    const data = {
      exported_at: '2026-01-01T00:00:00Z',
      version: '2.0',
    };

    const result = getExportSummary(data);

    expect(result.counts).toEqual({
      areas: 0,
      categories: 0,
      folders: 0,
      items: 0,
      storage_locations: 0,
    });
  });

  it('handles non-array values as zero counts', () => {
    const data = {
      exported_at: '2026-01-01T00:00:00Z',
      version: '2.0',
      areas: 'not an array',
      categories: null,
      folders: {},
      items: undefined,
      storage_locations: 123,
    };

    const result = getExportSummary(data);

    expect(result.counts).toEqual({
      areas: 0,
      categories: 0,
      folders: 0,
      items: 0,
      storage_locations: 0,
    });
  });

  it('preserves export metadata', () => {
    const data = {
      exported_at: '2026-02-15T12:30:00Z',
      version: '2.0',
      areas: [],
      categories: [],
      folders: [],
    };

    const result = getExportSummary(data);

    expect(result.exported_at).toBe('2026-02-15T12:30:00Z');
    expect(result.version).toBe('2.0');
  });
});
