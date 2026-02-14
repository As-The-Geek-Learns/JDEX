/**
 * CSV Export Service
 * ==================
 * Provides CSV export functionality for statistics dashboard data.
 *
 * Privacy Note: This service intentionally excludes full file paths
 * to protect user privacy. Only aggregate statistics are exported.
 */

import { format } from 'date-fns';

/**
 * Escape a value for CSV format.
 * Handles commas, quotes, and newlines.
 * @param {string|number|null} value - Value to escape
 * @returns {string} CSV-safe string
 */
function escapeCSV(value) {
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
 * @param {Array<Object>} data - Array of objects to convert
 * @param {Array<string>} columns - Column names (keys from objects)
 * @param {Object<string, string>} headers - Optional column name to header label mapping
 * @returns {string} CSV string
 */
function arrayToCSV(data, columns, headers = {}) {
  if (!data || data.length === 0) {
    return '';
  }

  // Header row
  const headerRow = columns.map((col) => escapeCSV(headers[col] || col)).join(',');

  // Data rows
  const dataRows = data.map((row) => columns.map((col) => escapeCSV(row[col])).join(','));

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Generate CSV for daily activity data.
 * @param {Array<{date: string, count: number}>} activityByDay - Daily activity data
 * @returns {string} CSV string
 */
export function exportActivityByDay(activityByDay) {
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
 * @param {Array<{type: string, count: number}>} filesByType - File type data
 * @returns {string} CSV string
 */
export function exportFilesByType(filesByType) {
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
 * @param {Array<{name: string, type: string, matchCount: number}>} topRules - Top rules data
 * @returns {string} CSV string
 */
export function exportTopRules(topRules) {
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
 *
 * @param {Object} stats - Dashboard statistics object
 * @param {Object} dateRange - Selected date range
 * @returns {string} Complete CSV report
 */
export function exportFullStatisticsReport(stats, dateRange = {}) {
  const sections = [];
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
 * @param {string} csvContent - CSV content to download
 * @param {string} filename - Filename for download
 */
export function downloadCSV(csvContent, filename = 'jdex-statistics.csv') {
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
 *
 * @param {Object} stats - Dashboard statistics object
 * @param {Object} dateRange - Selected date range
 */
export function downloadStatisticsReport(stats, dateRange = {}) {
  const csvContent = exportFullStatisticsReport(stats, dateRange);
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  const filename = `jdex-statistics-${timestamp}.csv`;

  downloadCSV(csvContent, filename);
}
