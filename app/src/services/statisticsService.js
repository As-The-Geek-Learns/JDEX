/**
 * Statistics Service
 * ==================
 * Provides aggregated statistics from the JDex database for the Statistics Dashboard.
 * All queries are read-only and optimized for dashboard display.
 *
 * Security: All numeric parameters are validated before use in queries.
 * Date parameters are validated and sanitized before use.
 */

import { getDB } from '../db.js';
import { format, differenceInDays } from 'date-fns';

/**
 * Validate and sanitize a numeric parameter for SQL queries.
 * Prevents SQL injection by ensuring the value is a positive integer.
 *
 * @param {unknown} value - The value to validate
 * @param {number} defaultValue - Default if invalid
 * @param {number} maxValue - Maximum allowed value
 * @returns {number} Safe integer value
 */
function validateNumericParam(value, defaultValue, maxValue = 1000) {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1) {
    return defaultValue;
  }
  return Math.min(num, maxValue);
}

/**
 * Format a date for SQL queries (YYYY-MM-DD format).
 * @param {Date|null} date - Date to format
 * @returns {string|null} Formatted date string or null
 */
function formatDateForSQL(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  return format(date, 'yyyy-MM-dd');
}

/**
 * Build a WHERE clause fragment for date range filtering.
 * @param {Date|null} startDate - Start of range
 * @param {Date|null} endDate - End of range
 * @param {string} dateColumn - Column name to filter on
 * @returns {string} WHERE clause fragment (may be empty)
 */
function buildDateRangeClause(startDate, endDate, dateColumn = 'organized_at') {
  const start = formatDateForSQL(startDate);
  const end = formatDateForSQL(endDate);

  if (!start && !end) return '';
  if (start && end) {
    return `AND DATE(${dateColumn}) >= '${start}' AND DATE(${dateColumn}) <= '${end}'`;
  }
  if (start) return `AND DATE(${dateColumn}) >= '${start}'`;
  if (end) return `AND DATE(${dateColumn}) <= '${end}'`;
  return '';
}

/**
 * Get total count of organized files
 * @param {Date|null} startDate - Start of date range (optional)
 * @param {Date|null} endDate - End of date range (optional)
 * @returns {number} Total files with status 'moved'
 */
export function getTotalOrganizedFiles(startDate = null, endDate = null) {
  const db = getDB();
  if (!db) return 0;

  try {
    const dateClause = buildDateRangeClause(startDate, endDate, 'organized_at');
    const result = db.exec(`
      SELECT COUNT(*) as count
      FROM organized_files
      WHERE status = 'moved'
      ${dateClause}
    `);
    return result[0]?.values[0]?.[0] || 0;
  } catch (error) {
    console.error('[StatisticsService] Error getting total organized files:', error);
    return 0;
  }
}

/**
 * Get count of files organized this month
 * @returns {number} Files organized in current month
 */
export function getFilesOrganizedThisMonth() {
  const db = getDB();
  if (!db) return 0;

  try {
    const result = db.exec(`
      SELECT COUNT(*) as count 
      FROM organized_files 
      WHERE status = 'moved' 
      AND organized_at >= date('now', 'start of month')
    `);
    return result[0]?.values[0]?.[0] || 0;
  } catch (error) {
    console.error('[StatisticsService] Error getting files this month:', error);
    return 0;
  }
}

/**
 * Get count of active organization rules
 * @returns {number} Active rules count
 */
export function getActiveRulesCount() {
  const db = getDB();
  if (!db) return 0;

  try {
    const result = db.exec(`
      SELECT COUNT(*) as count 
      FROM organization_rules 
      WHERE is_active = 1
    `);
    return result[0]?.values[0]?.[0] || 0;
  } catch (error) {
    console.error('[StatisticsService] Error getting active rules count:', error);
    return 0;
  }
}

/**
 * Get files organized by day for a date range
 * @param {Date|null} startDate - Start of date range
 * @param {Date|null} endDate - End of date range
 * @returns {Array<{date: string, count: number}>} Daily counts
 */
export function getFilesOrganizedByDay(startDate = null, endDate = null) {
  const db = getDB();
  if (!db) return [];

  // Default to last 30 days if no range specified
  const end = endDate || new Date();
  const start = startDate || new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);

  try {
    const dateClause = buildDateRangeClause(start, end, 'organized_at');
    const result = db.exec(`
      SELECT DATE(organized_at) as date, COUNT(*) as count
      FROM organized_files
      WHERE status = 'moved'
      ${dateClause}
      GROUP BY DATE(organized_at)
      ORDER BY date ASC
    `);

    if (!result[0]) {
      // Return empty data for date range
      return fillMissingDays([], start, end);
    }

    // Convert to array of objects
    const data = result[0].values.map((row) => ({
      date: row[0],
      count: row[1],
    }));

    // Fill in missing days with 0
    return fillMissingDays(data, start, end);
  } catch (error) {
    console.error('[StatisticsService] Error getting files by day:', error);
    return [];
  }
}

/**
 * Fill in missing days with 0 counts
 * @param {Array<{date: string, count: number}>} data - Existing data
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array<{date: string, count: number}>} Filled data
 */
function fillMissingDays(data, startDate, endDate) {
  const filledData = [];
  const days = differenceInDays(endDate, startDate) + 1;

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const existing = data.find((item) => item.date === dateStr);
    filledData.push({
      date: dateStr,
      count: existing ? existing.count : 0,
    });
  }

  return filledData;
}

/**
 * Get files organized grouped by file type
 * @param {number} limit - Maximum number of types to return (default 8)
 * @param {Date|null} startDate - Start of date range (optional)
 * @param {Date|null} endDate - End of date range (optional)
 * @returns {Array<{type: string, count: number}>} File type counts
 */
export function getFilesByType(limit = 8, startDate = null, endDate = null) {
  const db = getDB();
  if (!db) return [];

  // Security: Validate numeric parameter to prevent SQL injection
  const safeLimit = validateNumericParam(limit, 8, 100);

  try {
    const dateClause = buildDateRangeClause(startDate, endDate, 'organized_at');
    const result = db.exec(`
      SELECT
        COALESCE(file_type, 'Unknown') as type,
        COUNT(*) as count
      FROM organized_files
      WHERE status = 'moved'
      ${dateClause}
      GROUP BY file_type
      ORDER BY count DESC
      LIMIT ${safeLimit}
    `);

    if (!result[0]) return [];

    return result[0].values.map((row) => ({
      type: row[0] || 'Unknown',
      count: row[1],
    }));
  } catch (error) {
    console.error('[StatisticsService] Error getting files by type:', error);
    return [];
  }
}

/**
 * Get top organization rules by match count
 * @param {number} limit - Maximum number of rules to return (default 5)
 * @returns {Array<{name: string, type: string, matchCount: number}>} Top rules
 */
export function getTopRules(limit = 5) {
  const db = getDB();
  if (!db) return [];

  // Security: Validate numeric parameter to prevent SQL injection
  const safeLimit = validateNumericParam(limit, 5, 100);

  try {
    const result = db.exec(`
      SELECT name, rule_type, match_count 
      FROM organization_rules 
      WHERE is_active = 1 AND match_count > 0
      ORDER BY match_count DESC
      LIMIT ${safeLimit}
    `);

    if (!result[0]) return [];

    return result[0].values.map((row) => ({
      name: row[0],
      type: row[1],
      matchCount: row[2],
    }));
  } catch (error) {
    console.error('[StatisticsService] Error getting top rules:', error);
    return [];
  }
}

/**
 * Get watch folder activity summary
 * @returns {Object} Watch activity stats
 */
export function getWatchActivitySummary() {
  const db = getDB();
  if (!db) return { total: 0, today: 0, folders: 0 };

  try {
    // Total watch activity
    const totalResult = db.exec(`
      SELECT COUNT(*) FROM watch_activity
    `);
    const total = totalResult[0]?.values[0]?.[0] || 0;

    // Today's activity
    const todayResult = db.exec(`
      SELECT COUNT(*) FROM watch_activity 
      WHERE DATE(created_at) = DATE('now')
    `);
    const today = todayResult[0]?.values[0]?.[0] || 0;

    // Active watch folders
    const foldersResult = db.exec(`
      SELECT COUNT(*) FROM watched_folders WHERE is_active = 1
    `);
    const folders = foldersResult[0]?.values[0]?.[0] || 0;

    return { total, today, folders };
  } catch (error) {
    console.error('[StatisticsService] Error getting watch activity:', error);
    return { total: 0, today: 0, folders: 0 };
  }
}

/**
 * Get the most common file category (based on JD folder destinations)
 * @param {Date|null} startDate - Start of date range (optional)
 * @param {Date|null} endDate - End of date range (optional)
 * @returns {string} Most common category name or "None"
 */
export function getMostCommonCategory(startDate = null, endDate = null) {
  const db = getDB();
  if (!db) return 'None';

  try {
    const dateClause = buildDateRangeClause(startDate, endDate, 'organized_at');
    const result = db.exec(`
      SELECT
        SUBSTR(jd_folder_number, 1, 2) as category_prefix,
        COUNT(*) as count
      FROM organized_files
      WHERE status = 'moved' AND jd_folder_number IS NOT NULL
      ${dateClause}
      GROUP BY category_prefix
      ORDER BY count DESC
      LIMIT 1
    `);

    if (!result[0]?.values[0]) return 'None';

    const categoryPrefix = result[0].values[0][0];

    // Security: Validate category number before using in query
    const safeCategoryNum = validateNumericParam(categoryPrefix, 0, 99);

    // Look up category name
    const catResult = db.exec(`
      SELECT name FROM categories WHERE number = ${safeCategoryNum}
    `);

    return catResult[0]?.values[0]?.[0] || `Category ${safeCategoryNum}`;
  } catch (error) {
    console.error('[StatisticsService] Error getting most common category:', error);
    return 'None';
  }
}

/**
 * Get all dashboard statistics in a single call
 * @param {Date|null} startDate - Start of date range (optional)
 * @param {Date|null} endDate - End of date range (optional)
 * @returns {Object} Complete dashboard statistics
 */
export function getDashboardStats(startDate = null, endDate = null) {
  return {
    totalOrganized: getTotalOrganizedFiles(startDate, endDate),
    thisMonth: getFilesOrganizedThisMonth(),
    activeRules: getActiveRulesCount(),
    topCategory: getMostCommonCategory(startDate, endDate),
    activityByDay: getFilesOrganizedByDay(startDate, endDate),
    filesByType: getFilesByType(8, startDate, endDate),
    topRules: getTopRules(5),
    watchActivity: getWatchActivitySummary(),
    dateRange: { start: startDate, end: endDate },
  };
}

/**
 * Check if there's any statistics data to display
 * @returns {boolean} True if there's data
 */
export function hasStatisticsData() {
  const total = getTotalOrganizedFiles();
  const rules = getActiveRulesCount();
  return total > 0 || rules > 0;
}
