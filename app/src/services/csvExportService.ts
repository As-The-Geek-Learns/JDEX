/**
 * CSV Export Service
 * ==================
 * Provides CSV export functionality for statistics dashboard data.
 *
 * Privacy Note: This service intentionally excludes full file paths
 * to protect user privacy. Only aggregate statistics are exported.
 */

import { format } from 'date-fns';
import type {
  DailyCount,
  FileTypeCount,
  TopRule,
  WatchActivitySummary,
} from './statisticsService.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Header mapping for CSV columns.
 */
type HeaderMapping = Record<string, string>;

/**
 * Date range for report filtering.
 */
export interface ReportDateRange {
  start?: Date | null;
  end?: Date | null;
}

/**
 * Dashboard statistics for export.
 */
export interface ExportableStats {
  totalOrganized?: number;
  thisMonth?: number;
  activeRules?: number;
  topCategory?: string;
  activityByDay?: DailyCount[];
  filesByType?: FileTypeCount[];
  topRules?: TopRule[];
  watchActivity?: WatchActivitySummary;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Escape a value for CSV format.
 * Handles commas, quotes, and newlines.
 */
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Convert an array of objects to CSV string.
 */
function arrayToCSV<T>(
  data: T[],
  columns: (keyof T & string)[],
  headers: HeaderMapping = {}
): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Header row
  const headerRow = columns.map((col) => escapeCSV(headers[col] || col)).join(',');

  // Data rows
  const dataRows = data.map((row) =>
    columns.map((col) => escapeCSV(row[col] as unknown as string | number | null)).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Generate CSV for daily activity data.
 */
export function exportActivityByDay(activityByDay: DailyCount[] | undefined): string {
  if (!activityByDay || activityByDay.length === 0) {
    return 'Date,Files Organized\n';
  }

  return arrayToCSV(activityByDay, ['date', 'count'], {
    date: 'Date',
    count: 'Files Organized',
  });
}

/**
 * Generate CSV for file type distribution.
 */
export function exportFilesByType(filesByType: FileTypeCount[] | undefined): string {
  if (!filesByType || filesByType.length === 0) {
    return 'File Type,Count\n';
  }

  return arrayToCSV(filesByType, ['type', 'count'], {
    type: 'File Type',
    count: 'Count',
  });
}

/**
 * Generate CSV for top rules data.
 */
export function exportTopRules(topRules: TopRule[] | undefined): string {
  if (!topRules || topRules.length === 0) {
    return 'Rule Name,Rule Type,Match Count\n';
  }

  return arrayToCSV(topRules, ['name', 'type', 'matchCount'], {
    name: 'Rule Name',
    type: 'Rule Type',
    matchCount: 'Match Count',
  });
}

/**
 * Generate a complete statistics report as CSV.
 * Combines all statistics sections into a single exportable document.
 */
export function exportFullStatisticsReport(
  stats: ExportableStats,
  dateRange: ReportDateRange = {}
): string {
  const sections: string[] = [];
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');

  // Report header
  sections.push('JDex Statistics Report');
  sections.push(`Generated: ${timestamp}`);

  if (dateRange.start && dateRange.end) {
    sections.push(
      `Date Range: ${format(dateRange.start, 'yyyy-MM-dd')} to ${format(dateRange.end, 'yyyy-MM-dd')}`
    );
  }

  sections.push('');

  // Summary section
  sections.push('=== Summary ===');
  sections.push(`Total Files Organized,${stats.totalOrganized || 0}`);
  sections.push(`Files This Month,${stats.thisMonth || 0}`);
  sections.push(`Active Rules,${stats.activeRules || 0}`);
  sections.push(`Top Category,${escapeCSV(stats.topCategory || 'None')}`);
  sections.push('');

  // Daily activity section
  sections.push('=== Daily Activity ===');
  sections.push(exportActivityByDay(stats.activityByDay));
  sections.push('');

  // File types section
  sections.push('=== Files by Type ===');
  sections.push(exportFilesByType(stats.filesByType));
  sections.push('');

  // Top rules section
  sections.push('=== Top Organization Rules ===');
  sections.push(exportTopRules(stats.topRules));
  sections.push('');

  // Watch activity section
  if (stats.watchActivity) {
    sections.push('=== Watch Folder Activity ===');
    sections.push(`Active Folders,${stats.watchActivity.folders || 0}`);
    sections.push(`Events Today,${stats.watchActivity.today || 0}`);
    sections.push(`Total Events,${stats.watchActivity.total || 0}`);
  }

  return sections.join('\n');
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCSV(csvContent: string, filename: string = 'jdex-statistics.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Export and download the full statistics report.
 * Convenience function that combines export and download.
 */
export function downloadStatisticsReport(
  stats: ExportableStats,
  dateRange: ReportDateRange = {}
): void {
  const csvContent = exportFullStatisticsReport(stats, dateRange);
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  const filename = `jdex-statistics-${timestamp}.csv`;

  downloadCSV(csvContent, filename);
}
