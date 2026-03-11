/**
 * Organization Rules Fixtures
 *
 * Test data for file organization rules.
 * Rules determine how files are matched to JD folders.
 */

// =============================================================================
// Extension-Based Rules
// =============================================================================

export const extensionRules = [
  {
    id: 1,
    name: 'PDF to Client Invoices',
    rule_type: 'extension',
    pattern: 'pdf',
    target_type: 'folder',
    target_value: '11.01',
    priority: 50,
    is_active: true,
    match_count: 0,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'JPG to Family Photos',
    rule_type: 'extension',
    pattern: 'jpg',
    target_type: 'folder',
    target_value: '31.01',
    priority: 50,
    is_active: true,
    match_count: 0,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    name: 'PNG to Family Photos',
    rule_type: 'extension',
    pattern: 'png',
    target_type: 'folder',
    target_value: '31.01',
    priority: 50,
    is_active: true,
    match_count: 0,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 4,
    name: 'DOCX to ProjectX',
    rule_type: 'extension',
    pattern: 'docx',
    target_type: 'folder',
    target_value: '21.01',
    priority: 40,
    is_active: true,
    match_count: 0,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
];

// =============================================================================
// Keyword-Based Rules
// =============================================================================

export const keywordRules = [
  {
    id: 10,
    name: 'Invoice Keyword',
    rule_type: 'keyword',
    pattern: 'invoice,bill,statement',
    target_type: 'folder',
    target_value: '11.01',
    priority: 60,
    is_active: true,
    match_count: 0,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 11,
    name: 'Receipt Keyword',
    rule_type: 'keyword',
    pattern: 'receipt,purchase,payment',
    target_type: 'folder',
    target_value: '12.01',
    priority: 60,
    is_active: true,
    match_count: 0,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 12,
    name: 'Project Keywords',
    rule_type: 'keyword',
    pattern: 'project,spec,requirements',
    target_type: 'folder',
    target_value: '21.01',
    priority: 55,
    is_active: true,
    match_count: 0,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 13,
    name: 'Travel Photos Keyword',
    rule_type: 'keyword',
    pattern: 'vacation,travel,trip,holiday',
    target_type: 'folder',
    target_value: '31.02',
    priority: 65,
    is_active: true,
    match_count: 0,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
];

// =============================================================================
// Regex-Based Rules
// =============================================================================

export const regexRules = [
  {
    id: 20,
    name: 'Date Pattern (YYYY-MM-DD)',
    rule_type: 'regex',
    pattern: '\\d{4}-\\d{2}-\\d{2}',
    target_type: 'folder',
    target_value: '11.01',
    priority: 30,
    is_active: true,
    match_count: 0,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 21,
    name: 'Invoice Number Pattern',
    rule_type: 'regex',
    pattern: 'INV-\\d{5,}',
    target_type: 'folder',
    target_value: '11.01',
    priority: 70,
    is_active: true,
    match_count: 0,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 22,
    name: 'Screenshot Pattern',
    rule_type: 'regex',
    pattern: 'Screen\\s*Shot|screenshot|Screenshot',
    target_type: 'folder',
    target_value: '31.01',
    priority: 45,
    is_active: true,
    match_count: 0,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
];

// =============================================================================
// Path-Based Rules
// =============================================================================

export const pathRules = [
  {
    id: 30,
    name: 'Downloads Folder',
    rule_type: 'path',
    pattern: '/Downloads/',
    target_type: 'folder',
    target_value: '11.01',
    priority: 20,
    is_active: true,
    match_count: 0,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 31,
    name: 'Desktop Files',
    rule_type: 'path',
    pattern: '/Desktop/',
    target_type: 'folder',
    target_value: '11.01',
    priority: 15,
    is_active: true,
    match_count: 0,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
];

// =============================================================================
// Inactive Rules (For Testing Active/Inactive Filtering)
// =============================================================================

export const inactiveRules = [
  {
    id: 40,
    name: 'Disabled PDF Rule',
    rule_type: 'extension',
    pattern: 'pdf',
    target_type: 'folder',
    target_value: '12.01',
    priority: 100,
    is_active: false,
    match_count: 50,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-06-01T00:00:00.000Z',
  },
];

// =============================================================================
// Rule Collections
// =============================================================================

/**
 * All active rules combined
 */
export const allActiveRules = [...extensionRules, ...keywordRules, ...regexRules, ...pathRules];

/**
 * All rules including inactive
 */
export const allRules = [...allActiveRules, ...inactiveRules];

/**
 * Minimal rule set for simple tests
 */
export const minimalRules = [extensionRules[0], keywordRules[0]];

/**
 * Rules with varying match counts for statistics testing
 */
export const rulesWithUsage = [
  { ...extensionRules[0], match_count: 150 },
  { ...extensionRules[1], match_count: 89 },
  { ...keywordRules[0], match_count: 234 },
  { ...keywordRules[1], match_count: 45 },
  { ...regexRules[0], match_count: 12 },
];

// =============================================================================
// Rule Creation Helpers
// =============================================================================

/**
 * Create a new extension rule
 * @param {Object} options
 * @returns {Object} Rule object
 */
export function createExtensionRule({
  id = Date.now(),
  name,
  extension,
  targetFolder,
  priority = 50,
  isActive = true,
}) {
  return {
    id,
    name: name || `${extension.toUpperCase()} Rule`,
    rule_type: 'extension',
    pattern: extension.toLowerCase().replace(/^\./, ''),
    target_type: 'folder',
    target_value: targetFolder,
    priority,
    is_active: isActive,
    match_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Create a new keyword rule
 * @param {Object} options
 * @returns {Object} Rule object
 */
export function createKeywordRule({
  id = Date.now(),
  name,
  keywords,
  targetFolder,
  priority = 60,
  isActive = true,
}) {
  const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
  return {
    id,
    name: name || `Keyword Rule: ${keywordArray[0]}`,
    rule_type: 'keyword',
    pattern: keywordArray.join(','),
    target_type: 'folder',
    target_value: targetFolder,
    priority,
    is_active: isActive,
    match_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Create a new regex rule
 * @param {Object} options
 * @returns {Object} Rule object
 */
export function createRegexRule({
  id = Date.now(),
  name,
  pattern,
  targetFolder,
  priority = 40,
  isActive = true,
}) {
  return {
    id,
    name: name || `Regex Rule: ${pattern.slice(0, 20)}`,
    rule_type: 'regex',
    pattern,
    target_type: 'folder',
    target_value: targetFolder,
    priority,
    is_active: isActive,
    match_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// =============================================================================
// Rule Lookup Helpers
// =============================================================================

/**
 * Find rules targeting a specific folder
 * @param {string} folderNumber
 * @param {Array} rules - Rules to search (defaults to allActiveRules)
 * @returns {Array} Matching rules
 */
export function findRulesForFolder(folderNumber, rules = allActiveRules) {
  return rules.filter((r) => r.target_value === folderNumber);
}

/**
 * Find rules by type
 * @param {string} ruleType - 'extension', 'keyword', 'regex', 'path'
 * @param {Array} rules
 * @returns {Array} Matching rules
 */
export function findRulesByType(ruleType, rules = allActiveRules) {
  return rules.filter((r) => r.rule_type === ruleType);
}

/**
 * Sort rules by priority (highest first)
 * @param {Array} rules
 * @returns {Array} Sorted rules
 */
export function sortByPriority(rules) {
  return [...rules].sort((a, b) => b.priority - a.priority);
}
