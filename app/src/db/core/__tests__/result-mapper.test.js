/**
 * ResultMapper Tests
 * ==================
 */

import { describe, it, expect } from 'vitest';
import {
  mapRow,
  mapRows,
  mapSingle,
  hasResults,
  getCount,
  getScalar,
  COLUMNS,
  createMapper,
  mappers,
} from '../result-mapper.js';

describe('ResultMapper', () => {
  describe('mapRow', () => {
    it('maps a row array to an object', () => {
      const row = [1, '10', '19', 'Admin', 'Administration', '2024-01-01'];
      const columns = ['id', 'range_start', 'range_end', 'name', 'description', 'created_at'];

      const result = mapRow(row, columns);

      expect(result).toEqual({
        id: 1,
        range_start: '10',
        range_end: '19',
        name: 'Admin',
        description: 'Administration',
        created_at: '2024-01-01',
      });
    });

    it('returns null for null row', () => {
      expect(mapRow(null, ['id', 'name'])).toBeNull();
    });

    it('returns null for undefined row', () => {
      expect(mapRow(undefined, ['id', 'name'])).toBeNull();
    });

    it('handles rows with fewer values than columns', () => {
      const row = [1, 'Name'];
      const columns = ['id', 'name', 'description'];

      const result = mapRow(row, columns);

      expect(result).toEqual({
        id: 1,
        name: 'Name',
        description: null,
      });
    });

    it('throws if columns is not an array', () => {
      expect(() => mapRow([1], null)).toThrow(/Columns must be an array/);
    });
  });

  describe('mapRows', () => {
    it('maps sql.js results to array of objects', () => {
      const results = [
        {
          columns: ['id', 'name'],
          values: [
            [1, 'Area 1'],
            [2, 'Area 2'],
            [3, 'Area 3'],
          ],
        },
      ];
      const columns = ['id', 'name'];

      const result = mapRows(results, columns);

      expect(result).toEqual([
        { id: 1, name: 'Area 1' },
        { id: 2, name: 'Area 2' },
        { id: 3, name: 'Area 3' },
      ]);
    });

    it('returns empty array for null results', () => {
      expect(mapRows(null, ['id'])).toEqual([]);
    });

    it('returns empty array for empty results', () => {
      expect(mapRows([], ['id'])).toEqual([]);
    });

    it('returns empty array for results with no values', () => {
      expect(mapRows([{ columns: ['id'], values: [] }], ['id'])).toEqual([]);
    });
  });

  describe('mapSingle', () => {
    it('returns first row as object', () => {
      const results = [
        {
          columns: ['id', 'name'],
          values: [
            [1, 'Area 1'],
            [2, 'Area 2'],
          ],
        },
      ];
      const columns = ['id', 'name'];

      const result = mapSingle(results, columns);

      expect(result).toEqual({ id: 1, name: 'Area 1' });
    });

    it('returns null for empty results', () => {
      expect(mapSingle([], ['id'])).toBeNull();
    });

    it('returns null for results with no values', () => {
      expect(mapSingle([{ values: [] }], ['id'])).toBeNull();
    });
  });

  describe('hasResults', () => {
    it('returns true for results with values', () => {
      const results = [{ values: [[1, 'Test']] }];
      expect(hasResults(results)).toBe(true);
    });

    it('returns false for null', () => {
      expect(hasResults(null)).toBe(false);
    });

    it('returns false for empty array', () => {
      expect(hasResults([])).toBe(false);
    });

    it('returns false for empty values', () => {
      expect(hasResults([{ values: [] }])).toBe(false);
    });
  });

  describe('getCount', () => {
    it('extracts count from COUNT(*) query', () => {
      const results = [{ values: [[42]] }];
      expect(getCount(results)).toBe(42);
    });

    it('returns 0 for empty results', () => {
      expect(getCount([])).toBe(0);
    });

    it('returns 0 for null count', () => {
      const results = [{ values: [[null]] }];
      expect(getCount(results)).toBe(0);
    });
  });

  describe('getScalar', () => {
    it('extracts scalar value', () => {
      const results = [{ values: [['value']] }];
      expect(getScalar(results)).toBe('value');
    });

    it('returns default for empty results', () => {
      expect(getScalar([], 'default')).toBe('default');
    });

    it('returns default for null value', () => {
      const results = [{ values: [[null]] }];
      expect(getScalar(results, 'default')).toBe('default');
    });

    it('returns null as default if not specified', () => {
      expect(getScalar([])).toBeNull();
    });
  });

  describe('COLUMNS', () => {
    it('defines columns for areas table', () => {
      expect(COLUMNS.areas).toContain('id');
      expect(COLUMNS.areas).toContain('range_start');
      expect(COLUMNS.areas).toContain('range_end');
      expect(COLUMNS.areas).toContain('name');
    });

    it('defines columns for folders table', () => {
      expect(COLUMNS.folders).toContain('id');
      expect(COLUMNS.folders).toContain('folder_number');
      expect(COLUMNS.folders).toContain('category_id');
      expect(COLUMNS.folders).toContain('path');
    });

    it('defines columns for organization_rules table', () => {
      expect(COLUMNS.organizationRules).toContain('id');
      expect(COLUMNS.organizationRules).toContain('rule_type');
      expect(COLUMNS.organizationRules).toContain('pattern');
      expect(COLUMNS.organizationRules).toContain('priority');
    });
  });

  describe('createMapper', () => {
    it('creates a mapper with row/rows/single functions', () => {
      const mapper = createMapper(['id', 'name']);

      expect(typeof mapper.row).toBe('function');
      expect(typeof mapper.rows).toBe('function');
      expect(typeof mapper.single).toBe('function');
      expect(mapper.columns).toEqual(['id', 'name']);
    });

    it('mapper.row works correctly', () => {
      const mapper = createMapper(['id', 'name']);
      const result = mapper.row([1, 'Test']);

      expect(result).toEqual({ id: 1, name: 'Test' });
    });

    it('mapper.rows works correctly', () => {
      const mapper = createMapper(['id', 'name']);
      const results = [
        {
          values: [
            [1, 'A'],
            [2, 'B'],
          ],
        },
      ];

      expect(mapper.rows(results)).toEqual([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ]);
    });
  });

  describe('mappers', () => {
    it('provides pre-built mappers for all tables', () => {
      expect(mappers.areas).toBeDefined();
      expect(mappers.categories).toBeDefined();
      expect(mappers.folders).toBeDefined();
      expect(mappers.items).toBeDefined();
      expect(mappers.cloudDrives).toBeDefined();
      expect(mappers.organizationRules).toBeDefined();
    });

    it('mappers work correctly', () => {
      const results = [
        {
          values: [[1, '10', '19', 'Admin', 'Description', '2024-01-01', '2024-01-01']],
        },
      ];

      const area = mappers.areas.single(results);

      expect(area.id).toBe(1);
      expect(area.range_start).toBe('10');
      expect(area.name).toBe('Admin');
    });
  });
});
