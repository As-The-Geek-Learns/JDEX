/**
 * Schema Constants Tests
 * ======================
 */

import { describe, it, expect } from 'vitest';
import {
  SCHEMA_VERSION,
  VALID_DRIVE_TYPES,
  DEFAULT_DRIVE_TYPE,
  RULE_TYPES,
  TARGET_TYPES,
  DEFAULT_RULE_PRIORITY,
  FILE_STATUSES,
  DEFAULT_FILE_STATUS,
  CONFIDENCE_LEVELS,
  DEFAULT_CONFIDENCE,
  USER_DECISIONS,
  DEFAULT_USER_DECISION,
  WATCH_ACTIONS,
  SENSITIVITY_LEVELS,
  ITEM_SENSITIVITY_LEVELS,
  DEFAULT_SENSITIVITY,
  DEFAULT_ITEM_SENSITIVITY,
  TABLE_NAMES,
  STORAGE_KEY,
  isValidDriveType,
  isValidRuleType,
  isValidTargetType,
  isValidFileStatus,
  isValidConfidenceLevel,
  isValidTableName,
  isValidSensitivity,
  isValidItemSensitivity,
} from '../constants.js';

describe('Schema Constants', () => {
  describe('SCHEMA_VERSION', () => {
    it('is a positive integer', () => {
      expect(typeof SCHEMA_VERSION).toBe('number');
      expect(SCHEMA_VERSION).toBeGreaterThan(0);
      expect(Number.isInteger(SCHEMA_VERSION)).toBe(true);
    });

    it('is currently version 9', () => {
      expect(SCHEMA_VERSION).toBe(9);
    });
  });

  describe('VALID_DRIVE_TYPES', () => {
    it('is a frozen array', () => {
      expect(Array.isArray(VALID_DRIVE_TYPES)).toBe(true);
      expect(Object.isFrozen(VALID_DRIVE_TYPES)).toBe(true);
    });

    it('contains expected drive types', () => {
      expect(VALID_DRIVE_TYPES).toContain('icloud');
      expect(VALID_DRIVE_TYPES).toContain('dropbox');
      expect(VALID_DRIVE_TYPES).toContain('onedrive');
      expect(VALID_DRIVE_TYPES).toContain('google');
      expect(VALID_DRIVE_TYPES).toContain('proton');
      expect(VALID_DRIVE_TYPES).toContain('generic');
    });

    it('has generic as default', () => {
      expect(DEFAULT_DRIVE_TYPE).toBe('generic');
      expect(VALID_DRIVE_TYPES).toContain(DEFAULT_DRIVE_TYPE);
    });
  });

  describe('RULE_TYPES', () => {
    it('is a frozen array', () => {
      expect(Object.isFrozen(RULE_TYPES)).toBe(true);
    });

    it('contains all rule types', () => {
      expect(RULE_TYPES).toEqual(['extension', 'keyword', 'path', 'regex', 'compound', 'date']);
    });
  });

  describe('TARGET_TYPES', () => {
    it('is a frozen array', () => {
      expect(Object.isFrozen(TARGET_TYPES)).toBe(true);
    });

    it('contains all target types', () => {
      expect(TARGET_TYPES).toEqual(['folder', 'category', 'area']);
    });
  });

  describe('FILE_STATUSES', () => {
    it('is a frozen array', () => {
      expect(Object.isFrozen(FILE_STATUSES)).toBe(true);
    });

    it('contains all statuses', () => {
      expect(FILE_STATUSES).toEqual(['moved', 'tracked', 'undone', 'deleted']);
    });

    it('has moved as default', () => {
      expect(DEFAULT_FILE_STATUS).toBe('moved');
    });
  });

  describe('CONFIDENCE_LEVELS', () => {
    it('is a frozen array', () => {
      expect(Object.isFrozen(CONFIDENCE_LEVELS)).toBe(true);
    });

    it('contains all confidence levels', () => {
      expect(CONFIDENCE_LEVELS).toEqual(['none', 'low', 'medium', 'high']);
    });

    it('has none as default', () => {
      expect(DEFAULT_CONFIDENCE).toBe('none');
    });
  });

  describe('USER_DECISIONS', () => {
    it('is a frozen array', () => {
      expect(Object.isFrozen(USER_DECISIONS)).toBe(true);
    });

    it('contains all decisions', () => {
      expect(USER_DECISIONS).toEqual(['pending', 'accepted', 'changed', 'skipped']);
    });

    it('has pending as default', () => {
      expect(DEFAULT_USER_DECISION).toBe('pending');
    });
  });

  describe('WATCH_ACTIONS', () => {
    it('is a frozen array', () => {
      expect(Object.isFrozen(WATCH_ACTIONS)).toBe(true);
    });

    it('contains all watch actions', () => {
      expect(WATCH_ACTIONS).toEqual(['detected', 'queued', 'auto_organized', 'skipped', 'error']);
    });
  });

  describe('SENSITIVITY_LEVELS', () => {
    it('is a frozen array', () => {
      expect(Object.isFrozen(SENSITIVITY_LEVELS)).toBe(true);
    });

    it('contains folder sensitivity levels', () => {
      expect(SENSITIVITY_LEVELS).toEqual(['standard', 'sensitive', 'work']);
    });

    it('has standard as default', () => {
      expect(DEFAULT_SENSITIVITY).toBe('standard');
    });
  });

  describe('ITEM_SENSITIVITY_LEVELS', () => {
    it('is a frozen array', () => {
      expect(Object.isFrozen(ITEM_SENSITIVITY_LEVELS)).toBe(true);
    });

    it('includes inherit plus all folder levels', () => {
      expect(ITEM_SENSITIVITY_LEVELS).toContain('inherit');
      SENSITIVITY_LEVELS.forEach((level) => {
        expect(ITEM_SENSITIVITY_LEVELS).toContain(level);
      });
    });

    it('has inherit as default for items', () => {
      expect(DEFAULT_ITEM_SENSITIVITY).toBe('inherit');
    });
  });

  describe('TABLE_NAMES', () => {
    it('is a frozen array', () => {
      expect(Object.isFrozen(TABLE_NAMES)).toBe(true);
    });

    it('contains all core tables', () => {
      const expectedTables = [
        'areas',
        'categories',
        'folders',
        'items',
        'cloud_drives',
        'area_storage',
        'organization_rules',
        'organized_files',
        'scanned_files',
        'watched_folders',
        'watch_activity',
        'storage_locations',
        'activity_log',
        'schema_version',
      ];

      expectedTables.forEach((table) => {
        expect(TABLE_NAMES).toContain(table);
      });
    });

    it('has 14 tables', () => {
      expect(TABLE_NAMES.length).toBe(14);
    });
  });

  describe('STORAGE_KEY', () => {
    it('is the correct localStorage key', () => {
      expect(STORAGE_KEY).toBe('jdex_database_v2');
    });
  });

  describe('DEFAULT_RULE_PRIORITY', () => {
    it('is 50', () => {
      expect(DEFAULT_RULE_PRIORITY).toBe(50);
    });
  });
});

describe('Validation Helpers', () => {
  describe('isValidDriveType', () => {
    it('returns true for valid drive types', () => {
      expect(isValidDriveType('icloud')).toBe(true);
      expect(isValidDriveType('generic')).toBe(true);
    });

    it('returns false for invalid drive types', () => {
      expect(isValidDriveType('invalid')).toBe(false);
      expect(isValidDriveType('')).toBe(false);
      expect(isValidDriveType(null)).toBe(false);
    });
  });

  describe('isValidRuleType', () => {
    it('returns true for valid rule types', () => {
      expect(isValidRuleType('extension')).toBe(true);
      expect(isValidRuleType('regex')).toBe(true);
    });

    it('returns false for invalid rule types', () => {
      expect(isValidRuleType('invalid')).toBe(false);
    });
  });

  describe('isValidTargetType', () => {
    it('returns true for valid target types', () => {
      expect(isValidTargetType('folder')).toBe(true);
      expect(isValidTargetType('area')).toBe(true);
    });

    it('returns false for invalid target types', () => {
      expect(isValidTargetType('file')).toBe(false);
    });
  });

  describe('isValidFileStatus', () => {
    it('returns true for valid statuses', () => {
      expect(isValidFileStatus('moved')).toBe(true);
      expect(isValidFileStatus('deleted')).toBe(true);
    });

    it('returns false for invalid statuses', () => {
      expect(isValidFileStatus('pending')).toBe(false);
    });
  });

  describe('isValidConfidenceLevel', () => {
    it('returns true for valid levels', () => {
      expect(isValidConfidenceLevel('high')).toBe(true);
      expect(isValidConfidenceLevel('none')).toBe(true);
    });

    it('returns false for invalid levels', () => {
      expect(isValidConfidenceLevel('very_high')).toBe(false);
    });
  });

  describe('isValidTableName', () => {
    it('returns true for valid table names', () => {
      expect(isValidTableName('areas')).toBe(true);
      expect(isValidTableName('folders')).toBe(true);
    });

    it('returns false for invalid table names', () => {
      expect(isValidTableName('users')).toBe(false);
      expect(isValidTableName('DROP TABLE')).toBe(false);
    });
  });

  describe('isValidSensitivity', () => {
    it('returns true for folder sensitivity levels', () => {
      expect(isValidSensitivity('standard')).toBe(true);
      expect(isValidSensitivity('sensitive')).toBe(true);
    });

    it('returns false for inherit (folder level)', () => {
      expect(isValidSensitivity('inherit')).toBe(false);
    });
  });

  describe('isValidItemSensitivity', () => {
    it('returns true for item sensitivity levels including inherit', () => {
      expect(isValidItemSensitivity('inherit')).toBe(true);
      expect(isValidItemSensitivity('standard')).toBe(true);
    });

    it('returns false for invalid levels', () => {
      expect(isValidItemSensitivity('secret')).toBe(false);
    });
  });
});
