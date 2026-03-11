/**
 * Seeds Tests
 * ============
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_AREAS,
  DEFAULT_CATEGORIES,
  DEFAULT_LOCATIONS,
  seedAreas,
  seedCategories,
  seedLocations,
  seedInitialData,
  getSeedCounts,
} from '../seeds.js';

describe('Seed Data', () => {
  describe('DEFAULT_AREAS', () => {
    it('is a frozen array', () => {
      expect(Object.isFrozen(DEFAULT_AREAS)).toBe(true);
    });

    it('contains 8 areas', () => {
      expect(DEFAULT_AREAS.length).toBe(8);
    });

    it('each area has required fields', () => {
      for (const area of DEFAULT_AREAS) {
        expect(area).toHaveProperty('range_start');
        expect(area).toHaveProperty('range_end');
        expect(area).toHaveProperty('name');
        expect(area).toHaveProperty('description');
        expect(area).toHaveProperty('color');
      }
    });

    it('areas have valid range values', () => {
      for (const area of DEFAULT_AREAS) {
        expect(area.range_start).toBeLessThanOrEqual(area.range_end);
        expect(area.range_end - area.range_start).toBe(9);
      }
    });

    it('includes expected areas', () => {
      const names = DEFAULT_AREAS.map((a) => a.name);
      expect(names).toContain('System');
      expect(names).toContain('Personal');
      expect(names).toContain('Development');
      expect(names).toContain('Archive');
    });

    it('colors are valid hex codes', () => {
      const hexPattern = /^#[0-9a-f]{6}$/i;
      for (const area of DEFAULT_AREAS) {
        expect(area.color).toMatch(hexPattern);
      }
    });
  });

  describe('DEFAULT_CATEGORIES', () => {
    it('is a frozen array', () => {
      expect(Object.isFrozen(DEFAULT_CATEGORIES)).toBe(true);
    });

    it('contains 43 categories', () => {
      expect(DEFAULT_CATEGORIES.length).toBe(43);
    });

    it('each category has required fields', () => {
      for (const cat of DEFAULT_CATEGORIES) {
        expect(cat).toHaveProperty('number');
        expect(cat).toHaveProperty('area_id');
        expect(cat).toHaveProperty('name');
        expect(cat).toHaveProperty('description');
      }
    });

    it('category numbers are valid', () => {
      for (const cat of DEFAULT_CATEGORIES) {
        expect(cat.number).toBeGreaterThanOrEqual(0);
        expect(cat.number).toBeLessThan(100);
      }
    });

    it('area_ids reference valid areas', () => {
      for (const cat of DEFAULT_CATEGORIES) {
        expect(cat.area_id).toBeGreaterThanOrEqual(1);
        expect(cat.area_id).toBeLessThanOrEqual(DEFAULT_AREAS.length);
      }
    });

    it('includes expected categories', () => {
      const names = DEFAULT_CATEGORIES.map((c) => c.name);
      expect(names).toContain('Index');
      expect(names).toContain('Inbox');
      expect(names).toContain('Health');
      expect(names).toContain('KlockThingy');
    });
  });

  describe('DEFAULT_LOCATIONS', () => {
    it('is a frozen array', () => {
      expect(Object.isFrozen(DEFAULT_LOCATIONS)).toBe(true);
    });

    it('contains 8 locations', () => {
      expect(DEFAULT_LOCATIONS.length).toBe(8);
    });

    it('each location has required fields', () => {
      for (const loc of DEFAULT_LOCATIONS) {
        expect(loc).toHaveProperty('name');
        expect(loc).toHaveProperty('type');
        expect(loc).toHaveProperty('is_encrypted');
        expect(loc).toHaveProperty('notes');
      }
    });

    it('includes cloud and email types', () => {
      const types = DEFAULT_LOCATIONS.map((l) => l.type);
      expect(types).toContain('cloud');
      expect(types).toContain('email');
    });

    it('encrypted locations are marked correctly', () => {
      const proton = DEFAULT_LOCATIONS.find((l) => l.name === 'ProtonDrive');
      expect(proton.is_encrypted).toBe(1);

      const icloud = DEFAULT_LOCATIONS.find((l) => l.name === 'iCloud Drive');
      expect(icloud.is_encrypted).toBe(0);
    });
  });
});

describe('Seed Functions', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      run: vi.fn(),
    };
  });

  describe('seedAreas', () => {
    it('throws if db is null', () => {
      expect(() => seedAreas(null)).toThrow('Database instance is required');
    });

    it('inserts all areas with parameterized queries', () => {
      seedAreas(mockDb);

      expect(mockDb.run).toHaveBeenCalledTimes(DEFAULT_AREAS.length);

      // Check first call structure
      const firstCall = mockDb.run.mock.calls[0];
      expect(firstCall[0]).toContain('INSERT INTO areas');
      expect(firstCall[1]).toEqual([
        DEFAULT_AREAS[0].range_start,
        DEFAULT_AREAS[0].range_end,
        DEFAULT_AREAS[0].name,
        DEFAULT_AREAS[0].description,
        DEFAULT_AREAS[0].color,
      ]);
    });
  });

  describe('seedCategories', () => {
    it('throws if db is null', () => {
      expect(() => seedCategories(null)).toThrow('Database instance is required');
    });

    it('inserts all categories with parameterized queries', () => {
      seedCategories(mockDb);

      expect(mockDb.run).toHaveBeenCalledTimes(DEFAULT_CATEGORIES.length);

      // Check first call structure
      const firstCall = mockDb.run.mock.calls[0];
      expect(firstCall[0]).toContain('INSERT INTO categories');
      expect(firstCall[1]).toEqual([
        DEFAULT_CATEGORIES[0].number,
        DEFAULT_CATEGORIES[0].area_id,
        DEFAULT_CATEGORIES[0].name,
        DEFAULT_CATEGORIES[0].description,
      ]);
    });
  });

  describe('seedLocations', () => {
    it('throws if db is null', () => {
      expect(() => seedLocations(null)).toThrow('Database instance is required');
    });

    it('inserts all locations with parameterized queries', () => {
      seedLocations(mockDb);

      expect(mockDb.run).toHaveBeenCalledTimes(DEFAULT_LOCATIONS.length);

      // Check first call structure
      const firstCall = mockDb.run.mock.calls[0];
      expect(firstCall[0]).toContain('INSERT INTO storage_locations');
    });
  });

  describe('seedInitialData', () => {
    it('throws if db is null', () => {
      expect(() => seedInitialData(null)).toThrow('Database instance is required');
    });

    it('seeds all data types', () => {
      seedInitialData(mockDb);

      const expectedCalls =
        DEFAULT_AREAS.length + DEFAULT_CATEGORIES.length + DEFAULT_LOCATIONS.length;
      expect(mockDb.run).toHaveBeenCalledTimes(expectedCalls);
    });
  });

  describe('getSeedCounts', () => {
    it('returns correct counts', () => {
      const counts = getSeedCounts();

      expect(counts.areas).toBe(8);
      expect(counts.categories).toBe(43);
      expect(counts.locations).toBe(8);
    });
  });
});
