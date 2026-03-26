/**
 * Organization Rules Repository
 * =============================
 * CRUD operations for file organization rules (Premium Feature).
 * Uses parameterized queries for security.
 */

import { requireDB, saveDatabase, validatePositiveInteger, getLastInsertId } from './utils.js';
import { logActivity } from './activity-log.js';
import { validateRequiredString, validateOptionalString } from '../../utils/validation.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Valid rule types.
 */
export type RuleType = 'extension' | 'keyword' | 'path' | 'regex' | 'date' | 'compound';

/**
 * Valid target types.
 */
export type TargetType = 'folder' | 'category' | 'area';

/**
 * Organization rule record.
 */
export interface OrganizationRule {
  id: number;
  name: string;
  rule_type: RuleType;
  pattern: string;
  target_type: TargetType;
  target_id: string;
  priority: number;
  is_active: boolean;
  match_count: number;
  exclude_pattern: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating an organization rule.
 */
export interface CreateOrganizationRuleInput {
  name: string;
  rule_type: RuleType;
  pattern: string;
  target_type: TargetType;
  target_id: string;
  priority?: number;
  exclude_pattern?: string | null;
  notes?: string | null;
}

/**
 * Input for updating an organization rule.
 */
export interface UpdateOrganizationRuleInput {
  name?: string;
  rule_type?: RuleType;
  pattern?: string;
  target_type?: TargetType;
  target_id?: string;
  priority?: number;
  is_active?: boolean;
  exclude_pattern?: string | null;
  notes?: string | null;
}

/**
 * Options for getting organization rules.
 */
export interface GetOrganizationRulesOptions {
  ruleType?: RuleType;
  activeOnly?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Valid rule types for organization_rules.
 */
export const VALID_RULE_TYPES: readonly RuleType[] = [
  'extension',
  'keyword',
  'path',
  'regex',
  'date',
  'compound',
];

/**
 * Valid target types (what the rule points to).
 */
export const VALID_TARGET_TYPES: readonly TargetType[] = ['folder', 'category', 'area'];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map a database row to an organization rule object.
 */
function mapRowToRule(row: unknown[]): OrganizationRule {
  return {
    id: row[0] as number,
    name: row[1] as string,
    rule_type: row[2] as RuleType,
    pattern: row[3] as string,
    target_type: row[4] as TargetType,
    target_id: row[5] as string,
    priority: row[6] as number,
    is_active: row[7] === 1,
    match_count: row[8] as number,
    exclude_pattern: row[9] as string | null,
    notes: row[10] as string | null,
    created_at: row[11] as string,
    updated_at: row[12] as string,
  };
}

/**
 * Validate a priority value (0-100).
 */
function validatePriority(value: unknown): number {
  if (value === undefined || value === null) return 50;
  const num = parseInt(String(value), 10);
  if (isNaN(num)) return 50;
  return Math.min(100, Math.max(0, num));
}

/**
 * Validate a regex pattern.
 */
function validateRegexPattern(pattern: string): void {
  try {
    new RegExp(pattern);
  } catch (_e) {
    throw new DatabaseError('Invalid regular expression pattern', 'query');
  }
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all organization rules, optionally filtered by type.
 * Rules are returned in priority order (highest first).
 */
export function getOrganizationRules(
  options: GetOrganizationRulesOptions = {}
): OrganizationRule[] {
  const db = requireDB();
  const { ruleType, activeOnly = true } = options;

  let query = 'SELECT * FROM organization_rules WHERE 1=1';
  const params: unknown[] = [];

  if (activeOnly) {
    query += ' AND is_active = 1';
  }

  if (ruleType && VALID_RULE_TYPES.includes(ruleType)) {
    query += ' AND rule_type = ?';
    params.push(ruleType);
  }

  query += ' ORDER BY priority DESC, match_count DESC, created_at ASC';

  const results = params.length > 0 ? db.exec(query, params) : db.exec(query);

  return results[0]?.values?.map(mapRowToRule) || [];
}

/**
 * Get a single organization rule by ID.
 */
export function getOrganizationRule(ruleId: number | string): OrganizationRule | null {
  const db = requireDB();
  const id = validatePositiveInteger(ruleId, 'Rule ID');

  const stmt = db.prepare('SELECT * FROM organization_rules WHERE id = ?');
  stmt.bind([id]);

  let result: OrganizationRule | null = null;
  if (stmt.step()) {
    result = mapRowToRule(stmt.get());
  }
  stmt.free();

  return result;
}

/**
 * Get organization rules by target.
 */
export function getOrganizationRulesByTarget(
  targetType: TargetType,
  targetId: string
): OrganizationRule[] {
  const db = requireDB();

  if (!VALID_TARGET_TYPES.includes(targetType)) {
    throw new DatabaseError(`Invalid target type: ${targetType}`, 'query');
  }

  const validTargetId = validateRequiredString(targetId, 'Target ID', 50);

  const stmt = db.prepare(
    'SELECT * FROM organization_rules WHERE target_type = ? AND target_id = ? AND is_active = 1 ORDER BY priority DESC'
  );
  stmt.bind([targetType, validTargetId]);

  const rules: OrganizationRule[] = [];
  while (stmt.step()) {
    rules.push(mapRowToRule(stmt.get()));
  }
  stmt.free();

  return rules;
}

/**
 * Get count of organization rules.
 */
export function getOrganizationRuleCount(activeOnly: boolean = false): number {
  const db = requireDB();
  const query = activeOnly
    ? 'SELECT COUNT(*) FROM organization_rules WHERE is_active = 1'
    : 'SELECT COUNT(*) FROM organization_rules';
  const results = db.exec(query);
  const count = results[0]?.values?.[0]?.[0];
  return typeof count === 'number' ? count : 0;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Create a new organization rule.
 */
export function createOrganizationRule(rule: CreateOrganizationRuleInput): number {
  const db = requireDB();

  try {
    // Validate inputs
    const name = validateRequiredString(rule.name, 'Name', 100);
    const pattern = validateRequiredString(rule.pattern, 'Pattern', 500);
    const targetId = validateRequiredString(rule.target_id, 'Target ID', 50);
    const notes = validateOptionalString(rule.notes ?? null, 'Notes', 500);

    // Validate rule_type
    if (!rule.rule_type || !VALID_RULE_TYPES.includes(rule.rule_type)) {
      throw new DatabaseError(`Rule type must be one of: ${VALID_RULE_TYPES.join(', ')}`, 'insert');
    }

    // Validate target_type
    if (!rule.target_type || !VALID_TARGET_TYPES.includes(rule.target_type)) {
      throw new DatabaseError(
        `Target type must be one of: ${VALID_TARGET_TYPES.join(', ')}`,
        'insert'
      );
    }

    // Validate priority (0-100)
    const priority = validatePriority(rule.priority);

    // For regex rules, validate the regex is valid
    if (rule.rule_type === 'regex') {
      validateRegexPattern(pattern);
    }

    // Validate exclude_pattern (optional)
    const excludePattern = validateOptionalString(
      rule.exclude_pattern ?? null,
      'Exclude Pattern',
      500
    );

    const stmt = db.prepare(`
      INSERT INTO organization_rules (name, rule_type, pattern, target_type, target_id, priority, exclude_pattern, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      name,
      rule.rule_type,
      pattern,
      rule.target_type,
      targetId,
      priority,
      excludePattern,
      notes,
    ]);
    stmt.free();

    const newId = getLastInsertId();

    logActivity('create', 'organization_rule', newId.toString(), `Created rule: ${name}`);
    saveDatabase();

    return newId;
  } catch (error) {
    if ((error as Error).name === 'ValidationError' || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to create rule: ${(error as Error).message}`, 'insert');
  }
}

/**
 * Update an organization rule.
 */
export function updateOrganizationRule(
  ruleId: number | string,
  updates: UpdateOrganizationRuleInput
): void {
  const db = requireDB();

  try {
    const id = validatePositiveInteger(ruleId, 'Rule ID');

    const validColumns = [
      'name',
      'rule_type',
      'pattern',
      'target_type',
      'target_id',
      'priority',
      'is_active',
      'exclude_pattern',
      'notes',
    ];
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (validColumns.includes(key) && value !== undefined) {
        let processedValue: unknown = value;

        // Validate based on field
        if (key === 'name') {
          processedValue = validateRequiredString(value as string, 'Name', 100);
        } else if (key === 'pattern') {
          processedValue = validateRequiredString(value as string, 'Pattern', 500);
        } else if (key === 'target_id') {
          processedValue = validateRequiredString(value as string, 'Target ID', 50);
        } else if (key === 'notes') {
          processedValue = validateOptionalString(value as string | null, 'Notes', 500);
        } else if (key === 'exclude_pattern') {
          processedValue = validateOptionalString(value as string | null, 'Exclude Pattern', 500);
        } else if (key === 'rule_type') {
          if (!VALID_RULE_TYPES.includes(value as RuleType)) {
            throw new DatabaseError(`Invalid rule type: ${value}`, 'update');
          }
        } else if (key === 'target_type') {
          if (!VALID_TARGET_TYPES.includes(value as TargetType)) {
            throw new DatabaseError(`Invalid target type: ${value}`, 'update');
          }
        } else if (key === 'priority') {
          processedValue = validatePriority(value);
        } else if (key === 'is_active') {
          processedValue = value ? 1 : 0;
        }

        fields.push(`${key} = ?`);
        values.push(processedValue);
      }
    });

    if (fields.length === 0) return;

    // Validate regex if pattern or rule_type changed to regex
    const currentRule = getOrganizationRule(id);
    if (updates.rule_type === 'regex' || (updates.pattern && currentRule?.rule_type === 'regex')) {
      const patternToCheck = updates.pattern || currentRule?.pattern;
      if (patternToCheck) {
        validateRegexPattern(patternToCheck);
      }
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.run(`UPDATE organization_rules SET ${fields.join(', ')} WHERE id = ?`, values);

    logActivity('update', 'organization_rule', id.toString(), `Updated rule ID: ${id}`);
    saveDatabase();
  } catch (error) {
    if ((error as Error).name === 'ValidationError' || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to update rule: ${(error as Error).message}`, 'update');
  }
}

/**
 * Delete an organization rule.
 */
export function deleteOrganizationRule(ruleId: number | string): void {
  const db = requireDB();
  const id = validatePositiveInteger(ruleId, 'Rule ID');

  db.run('DELETE FROM organization_rules WHERE id = ?', [id]);

  logActivity('delete', 'organization_rule', id.toString(), `Deleted rule ID: ${id}`);
  saveDatabase();
}

/**
 * Increment the match count for a rule.
 * Called when a rule successfully matches a file.
 */
export function incrementRuleMatchCount(ruleId: number | string): void {
  const db = requireDB();
  const id = validatePositiveInteger(ruleId, 'Rule ID');

  db.run(
    'UPDATE organization_rules SET match_count = match_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  saveDatabase();
}

/**
 * Toggle a rule's active status.
 */
export function toggleOrganizationRule(ruleId: number | string): boolean {
  const db = requireDB();
  const id = validatePositiveInteger(ruleId, 'Rule ID');

  db.run(
    'UPDATE organization_rules SET is_active = 1 - is_active, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  saveDatabase();

  const stmt = db.prepare('SELECT is_active FROM organization_rules WHERE id = ?');
  stmt.bind([id]);
  let isActive = false;
  if (stmt.step()) {
    isActive = stmt.get()[0] === 1;
  }
  stmt.free();

  return isActive;
}

/**
 * Reset match count for a rule.
 */
export function resetRuleMatchCount(ruleId: number | string): void {
  const db = requireDB();
  const id = validatePositiveInteger(ruleId, 'Rule ID');

  db.run(
    'UPDATE organization_rules SET match_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  saveDatabase();
}
