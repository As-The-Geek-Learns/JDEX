/**
 * CSV Export Service Tests
 * ========================
 * Tests for CSV export functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportActivityByDay,
  exportFilesByType,
  exportTopRules,
  exportFullStatisticsReport,
  downloadCSV,
} from './csvExportService.js';

// =============================================================================
// exportActivityByDay Tests
// =============================================================================

describe('exportActivityByDay', () => {
  it('should return header only for empty array', () => {
    const result = exportActivityByDay([]);
    expect(result).toBe('Date,Files Organized\n');
  });

  it('should return header only for null input', () => {
    const result = exportActivityByDay(null);
    expect(result).toBe('Date,Files Organized\n');
  });

  it('should export daily activity data', () => {
    const data = [
      { date: '2024-01-01', count: 5 },
      { date: '2024-01-02', count: 10 },
      { date: '2024-01-03', count: 3 },
    ];

    const result = exportActivityByDay(data);
    const lines = result.split('\n');

    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe('Date,Files Organized');
    expect(lines[1]).toBe('2024-01-01,5');
    expect(lines[2]).toBe('2024-01-02,10');
    expect(lines[3]).toBe('2024-01-03,3');
  });

  it('should handle zero counts', () => {
    const data = [{ date: '2024-01-01', count: 0 }];
    const result = exportActivityByDay(data);

    expect(result).toContain('2024-01-01,0');
  });
});

// =============================================================================
// exportFilesByType Tests
// =============================================================================

describe('exportFilesByType', () => {
  it('should return header only for empty array', () => {
    const result = exportFilesByType([]);
    expect(result).toBe('File Type,Count\n');
  });

  it('should export file type distribution', () => {
    const data = [
      { type: 'pdf', count: 25 },
      { type: 'docx', count: 15 },
      { type: 'jpg', count: 50 },
    ];

    const result = exportFilesByType(data);
    const lines = result.split('\n');

    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe('File Type,Count');
    expect(lines[1]).toBe('pdf,25');
    expect(lines[2]).toBe('docx,15');
    expect(lines[3]).toBe('jpg,50');
  });

  it('should handle type names with special characters', () => {
    const data = [{ type: 'file, type', count: 5 }];
    const result = exportFilesByType(data);

    expect(result).toContain('"file, type"');
  });
});

// =============================================================================
// exportTopRules Tests
// =============================================================================

describe('exportTopRules', () => {
  it('should return header only for empty array', () => {
    const result = exportTopRules([]);
    expect(result).toBe('Rule Name,Rule Type,Match Count\n');
  });

  it('should export top rules data', () => {
    const data = [
      { name: 'PDF Documents', type: 'extension', matchCount: 100 },
      { name: 'Invoice Files', type: 'keyword', matchCount: 50 },
    ];

    const result = exportTopRules(data);
    const lines = result.split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Rule Name,Rule Type,Match Count');
    expect(lines[1]).toBe('PDF Documents,extension,100');
    expect(lines[2]).toBe('Invoice Files,keyword,50');
  });

  it('should escape rule names with commas', () => {
    const data = [{ name: 'Rule, with comma', type: 'keyword', matchCount: 10 }];
    const result = exportTopRules(data);

    expect(result).toContain('"Rule, with comma"');
  });

  it('should escape rule names with quotes', () => {
    const data = [{ name: 'Rule "quoted"', type: 'keyword', matchCount: 10 }];
    const result = exportTopRules(data);

    expect(result).toContain('"Rule ""quoted"""');
  });
});

// =============================================================================
// exportFullStatisticsReport Tests
// =============================================================================

describe('exportFullStatisticsReport', () => {
  const mockStats = {
    totalOrganized: 150,
    thisMonth: 25,
    activeRules: 10,
    topCategory: 'Finance',
    activityByDay: [
      { date: '2024-01-01', count: 5 },
      { date: '2024-01-02', count: 10 },
    ],
    filesByType: [
      { type: 'pdf', count: 50 },
      { type: 'docx', count: 30 },
    ],
    topRules: [{ name: 'PDF Rule', type: 'extension', matchCount: 50 }],
    watchActivity: {
      folders: 3,
      today: 5,
      total: 100,
    },
  };

  it('should include report header', () => {
    const result = exportFullStatisticsReport(mockStats);

    expect(result).toContain('JDex Statistics Report');
    expect(result).toContain('Generated:');
  });

  it('should include summary section', () => {
    const result = exportFullStatisticsReport(mockStats);

    expect(result).toContain('=== Summary ===');
    expect(result).toContain('Total Files Organized,150');
    expect(result).toContain('Files This Month,25');
    expect(result).toContain('Active Rules,10');
    expect(result).toContain('Top Category,Finance');
  });

  it('should include daily activity section', () => {
    const result = exportFullStatisticsReport(mockStats);

    expect(result).toContain('=== Daily Activity ===');
    expect(result).toContain('Date,Files Organized');
    expect(result).toContain('2024-01-01,5');
  });

  it('should include file types section', () => {
    const result = exportFullStatisticsReport(mockStats);

    expect(result).toContain('=== Files by Type ===');
    expect(result).toContain('File Type,Count');
    expect(result).toContain('pdf,50');
  });

  it('should include top rules section', () => {
    const result = exportFullStatisticsReport(mockStats);

    expect(result).toContain('=== Top Organization Rules ===');
    expect(result).toContain('PDF Rule,extension,50');
  });

  it('should include watch activity section', () => {
    const result = exportFullStatisticsReport(mockStats);

    expect(result).toContain('=== Watch Folder Activity ===');
    expect(result).toContain('Active Folders,3');
    expect(result).toContain('Events Today,5');
    expect(result).toContain('Total Events,100');
  });

  it('should include date range when provided', () => {
    const dateRange = {
      start: new Date(2024, 0, 1),
      end: new Date(2024, 0, 31),
    };

    const result = exportFullStatisticsReport(mockStats, dateRange);

    expect(result).toContain('Date Range: 2024-01-01 to 2024-01-31');
  });

  it('should handle missing stats gracefully', () => {
    const result = exportFullStatisticsReport({});

    expect(result).toContain('Total Files Organized,0');
    expect(result).toContain('Files This Month,0');
    expect(result).toContain('Active Rules,0');
    expect(result).toContain('Top Category,None');
  });
});

// =============================================================================
// downloadCSV Tests
// =============================================================================

describe('downloadCSV', () => {
  let originalCreateElement;
  let originalCreateObjectURL;
  let originalRevokeObjectURL;
  let mockLink;

  beforeEach(() => {
    // Mock link element
    mockLink = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      style: {},
    };

    // Mock document.createElement
    originalCreateElement = document.createElement;
    document.createElement = vi.fn(() => mockLink);

    // Mock document.body methods
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();

    // Mock URL methods
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:test-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('should create and trigger download link', () => {
    downloadCSV('test,data', 'test.csv');

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:test-url');
    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'test.csv');
    expect(mockLink.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
  });

  it('should use default filename', () => {
    downloadCSV('test,data');

    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'jdex-statistics.csv');
  });

  it('should create blob with correct content type', () => {
    downloadCSV('test,data');

    expect(URL.createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'text/csv;charset=utf-8;',
      })
    );
  });
});

// =============================================================================
// CSV Escaping Tests
// =============================================================================

describe('CSV escaping', () => {
  it('should escape values with commas', () => {
    const data = [{ type: 'test,value', count: 1 }];
    const result = exportFilesByType(data);

    expect(result).toContain('"test,value"');
  });

  it('should escape values with quotes', () => {
    const data = [{ type: 'test"value', count: 1 }];
    const result = exportFilesByType(data);

    expect(result).toContain('"test""value"');
  });

  it('should escape values with newlines', () => {
    const data = [{ type: 'test\nvalue', count: 1 }];
    const result = exportFilesByType(data);

    expect(result).toContain('"test\nvalue"');
  });

  it('should handle null values', () => {
    const data = [{ type: null, count: 5 }];
    const result = exportFilesByType(data);

    expect(result).toContain(',5');
  });

  it('should handle undefined values', () => {
    const data = [{ type: undefined, count: 5 }];
    const result = exportFilesByType(data);

    expect(result).toContain(',5');
  });
});
