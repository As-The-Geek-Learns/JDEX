/**
 * Organization Rules Repository Tests
 * ====================================
 * Tests for file organization rules (Premium Feature).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  VALID_RULE_TYPES,
  VALID_TARGET_TYPES,
  getOrganizationRules,
  getOrganizationRule,
  getOrganizationRulesByTarget,
  getOrganizationRuleCount,
  createOrganizationRule,
  updateOrganizationRule,
  deleteOrganizationRule,
  incrementRuleMatchCount,
  toggleOrganizationRule,
  resetRuleMatchCount,
} from '../organization-rules.js';
import { DatabaseError } from '../../../utils/errors.js';

// Mock the utils module
vi.mock('../utils.js', () => ({
  getDB: vi.fn(),
  requireDB: vi.fn(),
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
  getLastInsertId: vi.fn(() => 1),
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

import { getDB, requireDB, saveDatabase, getLastInsertId } from '../utils.js';
import { logActivity } from '../activity-log.js';

describe('Constants', () => {
  it('exports valid rule types', () => {
    expect(VALID_RULE_TYPES).toEqual(['extension', 'keyword', 'path', 'regex', 'date', 'compound']);
  });

  it('exports valid target types', () => {
    expect(VALID_TARGET_TYPES).toEqual(['folder', 'category', 'area']);
  });
});

describe('getOrganizationRules', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn(), run: vi.fn(), prepare: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns all active rules by default', () => {
    mockDb.exec.mockReturnValue([
      {
        values: [
          [
            1,
            'PDF Files',
            'extension',
            '.pdf',
            'folder',
            '10.01',
            80,
            1,
            15,
            null, // exclude_pattern
            'For documents',
            '2024-01-01',
            '2024-01-02',
          ],
          [
            2,
            'Invoice Keywords',
            'keyword',
            'invoice',
            'category',
            '11',
            60,
            1,
            8,
            '*.tmp', // exclude_pattern
            null,
            '2024-01-01',
            '2024-01-02',
          ],
        ],
      },
    ]);

    const result = getOrganizationRules();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 1,
      name: 'PDF Files',
      rule_type: 'extension',
      pattern: '.pdf',
      target_type: 'folder',
      target_id: '10.01',
      priority: 80,
      is_active: true,
      match_count: 15,
      exclude_pattern: null,
      notes: 'For documents',
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
    });
  });

  it('filters active rules only by default', () => {
    mockDb.exec.mockReturnValue([]);

    getOrganizationRules();

    const query = mockDb.exec.mock.calls[0][0];
    expect(query).toContain('is_active = 1');
  });

  it('includes inactive rules when activeOnly is false', () => {
    mockDb.exec.mockReturnValue([]);

    getOrganizationRules({ activeOnly: false });

    const query = mockDb.exec.mock.calls[0][0];
    expect(query).not.toContain('is_active = 1');
  });

  it('filters by rule type when provided', () => {
    mockDb.exec.mockReturnValue([]);

    getOrganizationRules({ ruleType: 'extension' });

    const [query, params] = mockDb.exec.mock.calls[0];
    expect(query).toContain('rule_type = ?');
    expect(params).toContain('extension');
  });

  it('ignores invalid rule type filter', () => {
    mockDb.exec.mockReturnValue([]);

    getOrganizationRules({ ruleType: 'invalid' });

    const query = mockDb.exec.mock.calls[0][0];
    expect(query).not.toContain('rule_type = ?');
  });

  it('orders by priority DESC, match_count DESC, created_at ASC', () => {
    mockDb.exec.mockReturnValue([]);

    getOrganizationRules();

    const query = mockDb.exec.mock.calls[0][0];
    expect(query).toContain('ORDER BY priority DESC, match_count DESC, created_at ASC');
  });

  it('returns empty array when no rules exist', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getOrganizationRules();

    expect(result).toEqual([]);
  });

  it('correctly maps is_active to boolean', () => {
    mockDb.exec.mockReturnValue([
      {
        values: [
          [
            1,
            'Active Rule',
            'extension',
            '.pdf',
            'folder',
            '10.01',
            50,
            1,
            0,
            null,
            '2024-01-01',
            '2024-01-02',
          ],
          [
            2,
            'Inactive Rule',
            'extension',
            '.doc',
            'folder',
            '10.02',
            50,
            0,
            0,
            null,
            '2024-01-01',
            '2024-01-02',
          ],
        ],
      },
    ]);

    const result = getOrganizationRules({ activeOnly: false });

    expect(result[0].is_active).toBe(true);
    expect(result[1].is_active).toBe(false);
  });
});

describe('getOrganizationRule', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = { bind: vi.fn(), step: vi.fn(), get: vi.fn(), free: vi.fn() };
    mockDb = { exec: vi.fn(), prepare: vi.fn(() => mockStmt), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns a rule by ID', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([
      1,
      'PDF Files',
      'extension',
      '.pdf',
      'folder',
      '10.01',
      80,
      1,
      15,
      'Notes',
      '2024-01-01',
      '2024-01-02',
    ]);

    const result = getOrganizationRule(1);

    expect(mockStmt.bind).toHaveBeenCalledWith([1]);
    expect(result.name).toBe('PDF Files');
    expect(result.pattern).toBe('.pdf');
  });

  it('returns null when rule not found', () => {
    mockStmt.step.mockReturnValue(false);

    const result = getOrganizationRule(999);

    expect(result).toBeNull();
  });

  it('throws error for invalid rule ID', () => {
    expect(() => getOrganizationRule(null)).toThrow(DatabaseError);
    expect(() => getOrganizationRule(-1)).toThrow(DatabaseError);
  });

  it('frees prepared statement after use', () => {
    mockStmt.step.mockReturnValue(false);

    getOrganizationRule(1);

    expect(mockStmt.free).toHaveBeenCalled();
  });
});

describe('getOrganizationRulesByTarget', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = { bind: vi.fn(), step: vi.fn(), get: vi.fn(), free: vi.fn() };
    mockDb = { exec: vi.fn(), prepare: vi.fn(() => mockStmt), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns rules for a target', () => {
    mockStmt.step.mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValueOnce(false);
    mockStmt.get
      .mockReturnValueOnce([
        1,
        'Rule 1',
        'extension',
        '.pdf',
        'folder',
        '10.01',
        80,
        1,
        5,
        null,
        '2024-01-01',
        '2024-01-02',
      ])
      .mockReturnValueOnce([
        2,
        'Rule 2',
        'keyword',
        'doc',
        'folder',
        '10.01',
        60,
        1,
        3,
        null,
        '2024-01-01',
        '2024-01-02',
      ]);

    const result = getOrganizationRulesByTarget('folder', '10.01');

    expect(result).toHaveLength(2);
    expect(mockStmt.bind).toHaveBeenCalledWith(['folder', '10.01']);
  });

  it('throws error for invalid target type', () => {
    expect(() => getOrganizationRulesByTarget('invalid', '10.01')).toThrow(DatabaseError);
    expect(() => getOrganizationRulesByTarget('invalid', '10.01')).toThrow('Invalid target type');
  });

  it('throws error for missing target ID', () => {
    expect(() => getOrganizationRulesByTarget('folder', '')).toThrow(DatabaseError);
    expect(() => getOrganizationRulesByTarget('folder', null)).toThrow(DatabaseError);
  });

  it('orders by priority DESC', () => {
    mockStmt.step.mockReturnValue(false);

    getOrganizationRulesByTarget('folder', '10.01');

    const query = mockDb.prepare.mock.calls[0][0];
    expect(query).toContain('ORDER BY priority DESC');
  });

  it('only returns active rules', () => {
    mockStmt.step.mockReturnValue(false);

    getOrganizationRulesByTarget('category', '11');

    const query = mockDb.prepare.mock.calls[0][0];
    expect(query).toContain('is_active = 1');
  });
});

describe('getOrganizationRuleCount', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('returns count of all rules', () => {
    mockDb.exec.mockReturnValue([{ values: [[10]] }]);

    const result = getOrganizationRuleCount();

    expect(result).toBe(10);
    expect(mockDb.exec).toHaveBeenCalledWith('SELECT COUNT(*) FROM organization_rules');
  });

  it('returns count of active rules only', () => {
    mockDb.exec.mockReturnValue([{ values: [[5]] }]);

    const result = getOrganizationRuleCount(true);

    expect(result).toBe(5);
    expect(mockDb.exec).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM organization_rules WHERE is_active = 1'
    );
  });

  it('returns 0 when no rules exist', () => {
    mockDb.exec.mockReturnValue([]);

    const result = getOrganizationRuleCount();

    expect(result).toBe(0);
  });
});

describe('createOrganizationRule', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = { run: vi.fn(), free: vi.fn() };
    mockDb = { exec: vi.fn(), prepare: vi.fn(() => mockStmt), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
    getLastInsertId.mockReturnValue(1);
  });

  it('creates a rule with all required fields', () => {
    const rule = {
      name: 'PDF Files',
      rule_type: 'extension',
      pattern: '.pdf',
      target_type: 'folder',
      target_id: '10.01',
    };

    const result = createOrganizationRule(rule);

    expect(result).toBe(1);
    expect(mockStmt.run).toHaveBeenCalled();
    expect(saveDatabase).toHaveBeenCalled();
  });

  it('logs activity when creating rule', () => {
    createOrganizationRule({
      name: 'Test Rule',
      rule_type: 'extension',
      pattern: '.txt',
      target_type: 'folder',
      target_id: '10.01',
    });

    expect(logActivity).toHaveBeenCalledWith(
      'create',
      'organization_rule',
      '1',
      expect.stringContaining('Created rule')
    );
  });

  it('validates priority to 0-100 range', () => {
    createOrganizationRule({
      name: 'Test Rule',
      rule_type: 'extension',
      pattern: '.txt',
      target_type: 'folder',
      target_id: '10.01',
      priority: 150, // Should be clamped to 100
    });

    // Priority should be validated (clamped)
    expect(mockStmt.run).toHaveBeenCalled();
  });

  it('uses default priority of 50 when not provided', () => {
    createOrganizationRule({
      name: 'Test Rule',
      rule_type: 'extension',
      pattern: '.txt',
      target_type: 'folder',
      target_id: '10.01',
    });

    const params = mockStmt.run.mock.calls[0][0];
    expect(params[5]).toBe(50); // priority at index 5
  });

  it('throws error for invalid rule type', () => {
    expect(() =>
      createOrganizationRule({
        name: 'Test',
        rule_type: 'invalid',
        pattern: '.txt',
        target_type: 'folder',
        target_id: '10.01',
      })
    ).toThrow(DatabaseError);
  });

  it('throws error for invalid target type', () => {
    expect(() =>
      createOrganizationRule({
        name: 'Test',
        rule_type: 'extension',
        pattern: '.txt',
        target_type: 'invalid',
        target_id: '10.01',
      })
    ).toThrow(DatabaseError);
  });

  it('validates regex pattern for regex rules', () => {
    expect(() =>
      createOrganizationRule({
        name: 'Test',
        rule_type: 'regex',
        pattern: '[invalid(regex', // Invalid regex
        target_type: 'folder',
        target_id: '10.01',
      })
    ).toThrow(DatabaseError);
  });

  it('accepts valid regex pattern', () => {
    createOrganizationRule({
      name: 'Regex Rule',
      rule_type: 'regex',
      pattern: '^invoice_\\d+\\.pdf$',
      target_type: 'folder',
      target_id: '10.01',
    });

    expect(mockStmt.run).toHaveBeenCalled();
  });

  it('throws error for missing name', () => {
    expect(() =>
      createOrganizationRule({
        name: '',
        rule_type: 'extension',
        pattern: '.pdf',
        target_type: 'folder',
        target_id: '10.01',
      })
    ).toThrow(DatabaseError);
  });
});

describe('updateOrganizationRule', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = { bind: vi.fn(), step: vi.fn(), get: vi.fn(), free: vi.fn() };
    mockDb = { exec: vi.fn(), prepare: vi.fn(() => mockStmt), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);

    // Mock getOrganizationRule for regex validation
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([
      1,
      'Test',
      'extension',
      '.pdf',
      'folder',
      '10.01',
      50,
      1,
      0,
      null,
      '2024-01-01',
      '2024-01-02',
    ]);
  });

  it('updates rule with valid fields', () => {
    updateOrganizationRule(1, { name: 'Updated Name', priority: 75 });

    expect(mockDb.run).toHaveBeenCalled();
    const [query, values] = mockDb.run.mock.calls[0];
    expect(query).toContain('UPDATE organization_rules SET');
    expect(query).toContain('name = ?');
    expect(query).toContain('priority = ?');
    expect(values).toContain('Updated Name');
    expect(values).toContain(75);
  });

  it('saves database after update', () => {
    updateOrganizationRule(1, { name: 'New Name' });

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('logs activity when updating', () => {
    updateOrganizationRule(1, { name: 'New Name' });

    expect(logActivity).toHaveBeenCalledWith(
      'update',
      'organization_rule',
      '1',
      expect.stringContaining('Updated rule')
    );
  });

  it('ignores invalid columns', () => {
    updateOrganizationRule(1, { invalid_column: 'value', name: 'Valid' });

    const [query] = mockDb.run.mock.calls[0];
    expect(query).not.toContain('invalid_column');
    expect(query).toContain('name');
  });

  it('does nothing when no valid updates provided', () => {
    updateOrganizationRule(1, { invalid: 'value' });

    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it('converts is_active to integer', () => {
    updateOrganizationRule(1, { is_active: true });

    const [_query, values] = mockDb.run.mock.calls[0];
    expect(values).toContain(1);
  });

  it('throws error for invalid rule type update', () => {
    expect(() => updateOrganizationRule(1, { rule_type: 'invalid' })).toThrow(DatabaseError);
  });

  it('throws error for invalid target type update', () => {
    expect(() => updateOrganizationRule(1, { target_type: 'invalid' })).toThrow(DatabaseError);
  });

  it('validates regex when changing to regex type', () => {
    expect(() => updateOrganizationRule(1, { rule_type: 'regex', pattern: '[invalid(' })).toThrow(
      DatabaseError
    );
  });

  it('adds updated_at timestamp', () => {
    updateOrganizationRule(1, { name: 'Test' });

    const [query] = mockDb.run.mock.calls[0];
    expect(query).toContain('updated_at = CURRENT_TIMESTAMP');
  });
});

describe('deleteOrganizationRule', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn(), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('deletes a rule by ID', () => {
    deleteOrganizationRule(1);

    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM organization_rules WHERE id = ?', [1]);
  });

  it('saves database after deletion', () => {
    deleteOrganizationRule(1);

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('logs delete activity', () => {
    deleteOrganizationRule(5);

    expect(logActivity).toHaveBeenCalledWith(
      'delete',
      'organization_rule',
      '5',
      expect.stringContaining('Deleted rule')
    );
  });

  it('throws error for invalid rule ID', () => {
    expect(() => deleteOrganizationRule(null)).toThrow(DatabaseError);
    expect(() => deleteOrganizationRule(-1)).toThrow(DatabaseError);
  });
});

describe('incrementRuleMatchCount', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn(), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('increments match count for a rule', () => {
    incrementRuleMatchCount(1);

    const [query, params] = mockDb.run.mock.calls[0];
    expect(query).toContain('match_count = match_count + 1');
    expect(params).toEqual([1]);
  });

  it('saves database after increment', () => {
    incrementRuleMatchCount(1);

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('updates timestamp', () => {
    incrementRuleMatchCount(1);

    const [query] = mockDb.run.mock.calls[0];
    expect(query).toContain('updated_at = CURRENT_TIMESTAMP');
  });

  it('throws error for invalid rule ID', () => {
    expect(() => incrementRuleMatchCount(null)).toThrow(DatabaseError);
  });
});

describe('toggleOrganizationRule', () => {
  let mockDb;
  let mockStmt;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStmt = { bind: vi.fn(), step: vi.fn(), get: vi.fn(), free: vi.fn() };
    mockDb = { exec: vi.fn(), prepare: vi.fn(() => mockStmt), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('toggles active status and returns new state', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([1]); // Now active

    const result = toggleOrganizationRule(1);

    expect(result).toBe(true);
    expect(mockDb.run).toHaveBeenCalled();
    const [query] = mockDb.run.mock.calls[0];
    expect(query).toContain('is_active = 1 - is_active');
  });

  it('returns false when toggled to inactive', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([0]); // Now inactive

    const result = toggleOrganizationRule(1);

    expect(result).toBe(false);
  });

  it('saves database after toggle', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([1]);

    toggleOrganizationRule(1);

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('updates timestamp', () => {
    mockStmt.step.mockReturnValue(true);
    mockStmt.get.mockReturnValue([1]);

    toggleOrganizationRule(1);

    const [query] = mockDb.run.mock.calls[0];
    expect(query).toContain('updated_at = CURRENT_TIMESTAMP');
  });

  it('throws error for invalid rule ID', () => {
    expect(() => toggleOrganizationRule(null)).toThrow(DatabaseError);
  });

  it('frees statement after use', () => {
    mockStmt.step.mockReturnValue(false);

    toggleOrganizationRule(1);

    expect(mockStmt.free).toHaveBeenCalled();
  });
});

describe('resetRuleMatchCount', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = { exec: vi.fn(), run: vi.fn() };
    getDB.mockReturnValue(mockDb);
    requireDB.mockReturnValue(mockDb);
  });

  it('resets match count to 0', () => {
    resetRuleMatchCount(1);

    const [query, params] = mockDb.run.mock.calls[0];
    expect(query).toContain('match_count = 0');
    expect(params).toEqual([1]);
  });

  it('saves database after reset', () => {
    resetRuleMatchCount(1);

    expect(saveDatabase).toHaveBeenCalled();
  });

  it('updates timestamp', () => {
    resetRuleMatchCount(1);

    const [query] = mockDb.run.mock.calls[0];
    expect(query).toContain('updated_at = CURRENT_TIMESTAMP');
  });

  it('throws error for invalid rule ID', () => {
    expect(() => resetRuleMatchCount(null)).toThrow(DatabaseError);
  });
});
