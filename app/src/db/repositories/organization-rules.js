/**
 * Organization Rules Repository
 * =============================
 * CRUD operations for file organization rules (Premium Feature).
 * Uses parameterized queries for security.
 */

import { getDB, saveDatabase, validatePositiveInteger, getLastInsertId } from './utils.js';
import { logActivity } from './activity-log.js';
import { validateRequiredString, validateOptionalString } from '../../utils/validation.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// CONSTANTS
// ============================================

/**
 * Valid rule types for organization_rules.
 */
export const VALID_RULE_TYPES = ['extension', 'keyword', 'path', 'regex'];

/**
 * Valid target types (what the rule points to).
 */
export const VALID_TARGET_TYPES = ['folder', 'category', 'area'];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map a database row to an organization rule object.
 * @param {Array} row - Database row
 * @returns {Object} Organization rule object
 */
function mapRowToRule(row) {
  return {
    id: row[0],
    name: row[1],
    rule_type: row[2],
    pattern: row[3],
    target_type: row[4],
    target_id: row[5],
    priority: row[6],
    is_active: row[7] === 1,
    match_count: row[8],
    notes: row[9],
    created_at: row[10],
    updated_at: row[11],
  };
}

/**
 * Validate a priority value (0-100).
 * @param {unknown} value - Value to validate
 * @returns {number} Validated priority (0-100)
 */
function validatePriority(value) {
  if (value === undefined || value === null) return 50;
  const num = parseInt(value, 10);
  if (isNaN(num)) return 50;
  return Math.min(100, Math.max(0, num));
}

/**
 * Validate a regex pattern.
 * @param {string} pattern - Pattern to validate
 * @throws {DatabaseError} If pattern is invalid regex
 */
function validateRegexPattern(pattern) {
  try {
    new RegExp(pattern);
  } catch (e) {
    throw new DatabaseError('Invalid regular expression pattern', 'query');
  }
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all organization rules, optionally filtered by type.
 * Rules are returned in priority order (highest first).
 *
 * @param {Object} options - Filter options
 * @param {string} [options.ruleType] - Filter by rule type
 * @param {boolean} [options.activeOnly=true] - Only return active rules
 * @returns {Array} Array of rule objects
 */
export function getOrganizationRules(options = {}) {
  const db = getDB();
  const { ruleType, activeOnly = true } = options;

  let query = 'SELECT * FROM organization_rules WHERE 1=1';
  const params = [];

  if (activeOnly) {
    query += ' AND is_active = 1';
  }

  if (ruleType && VALID_RULE_TYPES.includes(ruleType)) {
    query += ' AND rule_type = ?';
    params.push(ruleType);
  }

  query += ' ORDER BY priority DESC, match_count DESC, created_at ASC';

  const results = params.length > 0 ? db.exec(query, params) : db.exec(query);

  return results[0]?.values.map(mapRowToRule) || [];
}

/**
 * Get a single organization rule by ID.
 *
 * @param {number} ruleId - The rule ID
 * @returns {Object|null} The rule or null
 */
export function getOrganizationRule(ruleId) {
  const db = getDB();
  const id = validatePositiveInteger(ruleId, 'Rule ID');

  const stmt = db.prepare('SELECT * FROM organization_rules WHERE id = ?');
  stmt.bind([id]);

  let result = null;
  if (stmt.step()) {
    result = mapRowToRule(stmt.get());
  }
  stmt.free();

  return result;
}

/**
 * Get organization rules by target.
 *
 * @param {string} targetType - Target type (folder, category, area)
 * @param {string} targetId - Target ID
 * @returns {Array} Array of rule objects
 */
export function getOrganizationRulesByTarget(targetType, targetId) {
  const db = getDB();

  if (!VALID_TARGET_TYPES.includes(targetType)) {
    throw new DatabaseError(`Invalid target type: ${targetType}`, 'query');
  }

  const validTargetId = validateRequiredString(targetId, 'Target ID', 50);

  const stmt = db.prepare(
    'SELECT * FROM organization_rules WHERE target_type = ? AND target_id = ? AND is_active = 1 ORDER BY priority DESC'
  );
  stmt.bind([targetType, validTargetId]);

  const rules = [];
  while (stmt.step()) {
    rules.push(mapRowToRule(stmt.get()));
  }
  stmt.free();

  return rules;
}

/**
 * Get count of organization rules.
 * @param {boolean} [activeOnly=false] - Only count active rules
 * @returns {number} Number of rules
 */
export function getOrganizationRuleCount(activeOnly = false) {
  const db = getDB();
  const query = activeOnly
    ? 'SELECT COUNT(*) FROM organization_rules WHERE is_active = 1'
    : 'SELECT COUNT(*) FROM organization_rules';
  const results = db.exec(query);
  return results[0]?.values[0]?.[0] || 0;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Create a new organization rule.
 *
 * @param {Object} rule - The rule to create
 * @param {string} rule.name - Display name for the rule
 * @param {string} rule.rule_type - Type: 'extension', 'keyword', 'path', 'regex'
 * @param {string} rule.pattern - The pattern to match (e.g., '.pdf', 'invoice', '/Downloads/')
 * @param {string} rule.target_type - What to target: 'folder', 'category', 'area'
 * @param {string} rule.target_id - ID of the target (folder_number, category number, or area id)
 * @param {number} [rule.priority=50] - Priority (higher = checked first)
 * @param {string} [rule.notes] - Optional notes
 * @returns {number} The created rule ID
 */
export function createOrganizationRule(rule) {
  const db = getDB();

  try {
    // Validate inputs
    const name = validateRequiredString(rule.name, 'Name', 100);
    const pattern = validateRequiredString(rule.pattern, 'Pattern', 500);
    const targetId = validateRequiredString(rule.target_id, 'Target ID', 50);
    const notes = validateOptionalString(rule.notes, 'Notes', 500);

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

    const stmt = db.prepare(`
      INSERT INTO organization_rules (name, rule_type, pattern, target_type, target_id, priority, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([name, rule.rule_type, pattern, rule.target_type, targetId, priority, notes]);
    stmt.free();

    const newId = getLastInsertId();

    logActivity('create', 'organization_rule', newId.toString(), `Created rule: ${name}`);
    saveDatabase();

    return newId;
  } catch (error) {
    if (error.name === 'ValidationError' || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to create rule: ${error.message}`, 'insert');
  }
}

/**
 * Update an organization rule.
 *
 * @param {number} ruleId - The rule ID to update
 * @param {Object} updates - Fields to update
 */
export function updateOrganizationRule(ruleId, updates) {
  const db = getDB();

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
      'notes',
    ];
    const fields = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (validColumns.includes(key) && value !== undefined) {
        // Validate based on field
        if (key === 'name') {
          value = validateRequiredString(value, 'Name', 100);
        } else if (key === 'pattern') {
          value = validateRequiredString(value, 'Pattern', 500);
        } else if (key === 'target_id') {
          value = validateRequiredString(value, 'Target ID', 50);
        } else if (key === 'notes') {
          value = validateOptionalString(value, 'Notes', 500);
        } else if (key === 'rule_type') {
          if (!VALID_RULE_TYPES.includes(value)) {
            throw new DatabaseError(`Invalid rule type: ${value}`, 'update');
          }
        } else if (key === 'target_type') {
          if (!VALID_TARGET_TYPES.includes(value)) {
            throw new DatabaseError(`Invalid target type: ${value}`, 'update');
          }
        } else if (key === 'priority') {
          value = validatePriority(value);
        } else if (key === 'is_active') {
          value = value ? 1 : 0;
        }

        fields.push(`${key} = ?`);
        values.push(value);
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
    if (error.name === 'ValidationError' || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to update rule: ${error.message}`, 'update');
  }
}

/**
 * Delete an organization rule.
 *
 * @param {number} ruleId - The rule ID to delete
 */
export function deleteOrganizationRule(ruleId) {
  const db = getDB();
  const id = validatePositiveInteger(ruleId, 'Rule ID');

  db.run('DELETE FROM organization_rules WHERE id = ?', [id]);

  logActivity('delete', 'organization_rule', id.toString(), `Deleted rule ID: ${id}`);
  saveDatabase();
}

/**
 * Increment the match count for a rule.
 * Called when a rule successfully matches a file.
 *
 * @param {number} ruleId - The rule ID
 */
export function incrementRuleMatchCount(ruleId) {
  const db = getDB();
  const id = validatePositiveInteger(ruleId, 'Rule ID');

  db.run(
    'UPDATE organization_rules SET match_count = match_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  saveDatabase();
}

/**
 * Toggle a rule's active status.
 *
 * @param {number} ruleId - The rule ID
 * @returns {boolean} The new active status
 */
export function toggleOrganizationRule(ruleId) {
  const db = getDB();
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
 *
 * @param {number} ruleId - The rule ID
 */
export function resetRuleMatchCount(ruleId) {
  const db = getDB();
  const id = validatePositiveInteger(ruleId, 'Rule ID');

  db.run(
    'UPDATE organization_rules SET match_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  saveDatabase();
}
