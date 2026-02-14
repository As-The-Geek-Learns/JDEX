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

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * sql.js Database interface (minimal subset for this service).
 */
interface Database {
  exec(sql: string): QueryExecResult[];
}

/**
 * Result from sql.js exec() method.
 */
interface QueryExecResult {
  columns: string[];
  values: unknown[][];
}

/**
 * Daily file count entry.
 */
export interface DailyCount {
  date: string;
  count: number;
}

/**
 * File type count entry.
 */
export interface FileTypeCount {
  type: string;
  count: number;
}

/**
 * Top rule statistics entry.
 */
export interface TopRule {
  name: string;
  type: string;
  matchCount: number;
}

/**
 * Watch activity summary.
 */
export interface WatchActivitySummary {
  total: number;
  today: number;
  folders: number;
}

/**
 * Date range for filtering.
 */
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/**
 * Complete dashboard statistics.
 */
export interface DashboardStats {
  totalOrganized: number;
  thisMonth: number;
  activeRules: number;
  topCategory: string;
  activityByDay: DailyCount[];
  filesByType: FileTypeCount[];
  topRules: TopRule[];
  watchActivity: WatchActivitySummary;
  dateRange: DateRange;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate and sanitize a numeric parameter for SQL queries.
 * Prevents SQL injection by ensuring the value is a positive integer.
 */
function validateNumericParam(
  value: unknown,
  defaultValue: number,
  maxValue: number = 1000
): number {
  const num = parseInt(String(value), 10);
  if (isNaN(num) || num < 1) {
    return defaultValue;
  }
  return Math.min(num, maxValue);
}

/**
 * Format a date for SQL queries (YYYY-MM-DD format).
 */
function formatDateForSQL(date: Date | null | undefined): string | null {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  return format(date, 'yyyy-MM-dd');
}

/**
 * Build a WHERE clause fragment for date range filtering.
 */
function buildDateRangeClause(
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
  dateColumn: string = 'organized_at'
): string {
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
 * Fill in missing days with 0 counts.
 */
function fillMissingDays(data: DailyCount[], startDate: Date, endDate: Date): DailyCount[] {
  const filledData: DailyCount[] = [];
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

// ============================================
// STATISTICS FUNCTIONS
// ============================================

/**
 * Get total count of organized files.
 */
export function getTotalOrganizedFiles(
  startDate: Date | null = null,
  endDate: Date | null = null
): number {
  const db = getDB() as Database | null;
  if (!db) return 0;

  try {
    const dateClause = buildDateRangeClause(startDate, endDate, 'organized_at');
    const result = db.exec(`
      SELECT COUNT(*) as count
      FROM organized_files
      WHERE status = 'moved'
      ${dateClause}
    `);
    return (result[0]?.values[0]?.[0] as number) || 0;
  } catch (error) {
    console.error('[StatisticsService] Error getting total organized files:', error);
    return 0;
  }
}

/**
 * Get count of files organized this month.
 */
export function getFilesOrganizedThisMonth(): number {
  const db = getDB() as Database | null;
  if (!db) return 0;

  try {
    const result = db.exec(`
      SELECT COUNT(*) as count
      FROM organized_files
      WHERE status = 'moved'
      AND organized_at >= date('now', 'start of month')
    `);
    return (result[0]?.values[0]?.[0] as number) || 0;
  } catch (error) {
    console.error('[StatisticsService] Error getting files this month:', error);
    return 0;
  }
}

/**
 * Get count of active organization rules.
 */
export function getActiveRulesCount(): number {
  const db = getDB() as Database | null;
  if (!db) return 0;

  try {
    const result = db.exec(`
      SELECT COUNT(*) as count
      FROM organization_rules
      WHERE is_active = 1
    `);
    return (result[0]?.values[0]?.[0] as number) || 0;
  } catch (error) {
    console.error('[StatisticsService] Error getting active rules count:', error);
    return 0;
  }
}

/**
 * Get files organized by day for a date range.
 */
export function getFilesOrganizedByDay(
  startDate: Date | null = null,
  endDate: Date | null = null
): DailyCount[] {
  const db = getDB() as Database | null;
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
    const data: DailyCount[] = result[0].values.map((row) => ({
      date: row[0] as string,
      count: row[1] as number,
    }));

    // Fill in missing days with 0
    return fillMissingDays(data, start, end);
  } catch (error) {
    console.error('[StatisticsService] Error getting files by day:', error);
    return [];
  }
}

/**
 * Get files organized grouped by file type.
 */
export function getFilesByType(
  limit: number = 8,
  startDate: Date | null = null,
  endDate: Date | null = null
): FileTypeCount[] {
  const db = getDB() as Database | null;
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
      type: (row[0] as string) || 'Unknown',
      count: row[1] as number,
    }));
  } catch (error) {
    console.error('[StatisticsService] Error getting files by type:', error);
    return [];
  }
}

/**
 * Get top organization rules by match count.
 */
export function getTopRules(limit: number = 5): TopRule[] {
  const db = getDB() as Database | null;
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
      name: row[0] as string,
      type: row[1] as string,
      matchCount: row[2] as number,
    }));
  } catch (error) {
    console.error('[StatisticsService] Error getting top rules:', error);
    return [];
  }
}

/**
 * Get watch folder activity summary.
 */
export function getWatchActivitySummary(): WatchActivitySummary {
  const db = getDB() as Database | null;
  if (!db) return { total: 0, today: 0, folders: 0 };

  try {
    // Total watch activity
    const totalResult = db.exec(`
      SELECT COUNT(*) FROM watch_activity
    `);
    const total = (totalResult[0]?.values[0]?.[0] as number) || 0;

    // Today's activity
    const todayResult = db.exec(`
      SELECT COUNT(*) FROM watch_activity
      WHERE DATE(created_at) = DATE('now')
    `);
    const today = (todayResult[0]?.values[0]?.[0] as number) || 0;

    // Active watch folders
    const foldersResult = db.exec(`
      SELECT COUNT(*) FROM watched_folders WHERE is_active = 1
    `);
    const folders = (foldersResult[0]?.values[0]?.[0] as number) || 0;

    return { total, today, folders };
  } catch (error) {
    console.error('[StatisticsService] Error getting watch activity:', error);
    return { total: 0, today: 0, folders: 0 };
  }
}

/**
 * Get the most common file category (based on JD folder destinations).
 */
export function getMostCommonCategory(
  startDate: Date | null = null,
  endDate: Date | null = null
): string {
  const db = getDB() as Database | null;
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

    return (catResult[0]?.values[0]?.[0] as string) || `Category ${safeCategoryNum}`;
  } catch (error) {
    console.error('[StatisticsService] Error getting most common category:', error);
    return 'None';
  }
}

/**
 * Get all dashboard statistics in a single call.
 */
export function getDashboardStats(
  startDate: Date | null = null,
  endDate: Date | null = null
): DashboardStats {
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
 * Check if there's any statistics data to display.
 */
export function hasStatisticsData(): boolean {
  const total = getTotalOrganizedFiles();
  const rules = getActiveRulesCount();
  return total > 0 || rules > 0;
}
