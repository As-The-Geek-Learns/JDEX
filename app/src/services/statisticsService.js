/**
 * Statistics Service
 * ==================
 * Provides aggregated statistics from the JDex database for the Statistics Dashboard.
 * All queries are read-only and optimized for dashboard display.
 * 
 * Security: All numeric parameters are validated before use in queries.
 */

import { getDB } from '../db.js';

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
 * Get total count of organized files
 * @returns {number} Total files with status 'moved'
 */
export function getTotalOrganizedFiles() {
  const db = getDB();
  if (!db) return 0;
  
  try {
    const result = db.exec(`
      SELECT COUNT(*) as count 
      FROM organized_files 
      WHERE status = 'moved'
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
 * Get files organized by day for the last N days
 * @param {number} days - Number of days to look back (default 30)
 * @returns {Array<{date: string, count: number}>} Daily counts
 */
export function getFilesOrganizedByDay(days = 30) {
  const db = getDB();
  if (!db) return [];
  
  // Security: Validate numeric parameter to prevent SQL injection
  const safeDays = validateNumericParam(days, 30, 365);
  
  try {
    const result = db.exec(`
      SELECT DATE(organized_at) as date, COUNT(*) as count 
      FROM organized_files 
      WHERE status = 'moved' 
      AND organized_at >= date('now', '-${safeDays} days')
      GROUP BY DATE(organized_at)
      ORDER BY date ASC
    `);
    
    if (!result[0]) return [];
    
    // Convert to array of objects
    const data = result[0].values.map(row => ({
      date: row[0],
      count: row[1]
    }));
    
    // Fill in missing days with 0
    const filledData = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const existing = data.find(item => item.date === dateStr);
      filledData.push({
        date: dateStr,
        count: existing ? existing.count : 0
      });
    }
    
    return filledData;
  } catch (error) {
    console.error('[StatisticsService] Error getting files by day:', error);
    return [];
  }
}

/**
 * Get files organized grouped by file type
 * @param {number} limit - Maximum number of types to return (default 8)
 * @returns {Array<{type: string, count: number}>} File type counts
 */
export function getFilesByType(limit = 8) {
  const db = getDB();
  if (!db) return [];
  
  // Security: Validate numeric parameter to prevent SQL injection
  const safeLimit = validateNumericParam(limit, 8, 100);
  
  try {
    const result = db.exec(`
      SELECT 
        COALESCE(file_type, 'Unknown') as type, 
        COUNT(*) as count 
      FROM organized_files 
      WHERE status = 'moved'
      GROUP BY file_type
      ORDER BY count DESC
      LIMIT ${safeLimit}
    `);
    
    if (!result[0]) return [];
    
    return result[0].values.map(row => ({
      type: row[0] || 'Unknown',
      count: row[1]
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
    
    return result[0].values.map(row => ({
      name: row[0],
      type: row[1],
      matchCount: row[2]
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
 * @returns {string} Most common category name or "None"
 */
export function getMostCommonCategory() {
  const db = getDB();
  if (!db) return 'None';
  
  try {
    const result = db.exec(`
      SELECT 
        SUBSTR(jd_folder_number, 1, 2) as category_prefix,
        COUNT(*) as count
      FROM organized_files 
      WHERE status = 'moved' AND jd_folder_number IS NOT NULL
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
 * @returns {Object} Complete dashboard statistics
 */
export function getDashboardStats() {
  return {
    totalOrganized: getTotalOrganizedFiles(),
    thisMonth: getFilesOrganizedThisMonth(),
    activeRules: getActiveRulesCount(),
    topCategory: getMostCommonCategory(),
    activityByDay: getFilesOrganizedByDay(30),
    filesByType: getFilesByType(8),
    topRules: getTopRules(5),
    watchActivity: getWatchActivitySummary()
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
