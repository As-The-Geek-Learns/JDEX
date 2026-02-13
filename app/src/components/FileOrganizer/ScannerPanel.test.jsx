/**
 * ScannerPanel Component Tests
 * ============================
 * Tests for the folder scanning panel component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScannerPanel from './ScannerPanel.jsx';

// Mock the fileScannerService
vi.mock('../../services/fileScannerService.js', () => ({
  getScanner: vi.fn(() => ({
    scan: vi.fn(async () => ({
      success: true,
      value: {
        sessionId: 'session-123',
        files: [{ id: 1, name: 'file1.txt' }],
        stats: { totalFiles: 1, totalSize: 1024, totalDirs: 1 },
      },
    })),
    cancel: vi.fn(),
  })),
  formatFileSize: vi.fn((size) => `${size} bytes`),
  hasFileSystemAccess: vi.fn(() => true),
  listSubdirectories: vi.fn(() => []), // Returns sync array, not async
  quickCount: vi.fn(async () => ({ files: 0, folders: 0, totalSize: 0 })),
}));

// Mock db.js
vi.mock('../../db.js', () => ({
  getCloudDrives: vi.fn(() => []),
  getScannedFiles: vi.fn(() => []),
}));

import { getScanner, hasFileSystemAccess } from '../../services/fileScannerService.js';

describe('ScannerPanel', () => {
  const mockOnScanComplete = vi.fn();

  const defaultProps = {
    onScanComplete: mockOnScanComplete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render Scan Files header', () => {
      render(<ScannerPanel {...defaultProps} />);

      expect(screen.getByText('Scan Files')).toBeInTheDocument();
    });

    it('should render path input', () => {
      render(<ScannerPanel {...defaultProps} />);

      expect(screen.getByPlaceholderText(/Users\/yourname\/Documents/i)).toBeInTheDocument();
    });

    it('should render Start Scanning button', () => {
      render(<ScannerPanel {...defaultProps} />);

      expect(screen.getByText('Start Scanning')).toBeInTheDocument();
    });

    it('should render Browse button', () => {
      render(<ScannerPanel {...defaultProps} />);

      expect(screen.getByText('Browse')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Path Input
  // ===========================================================================

  describe('path input', () => {
    it('should allow typing a path', () => {
      render(<ScannerPanel {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Users\/yourname\/Documents/i);
      fireEvent.change(input, { target: { value: '/test/folder' } });

      expect(input.value).toBe('/test/folder');
    });

    it('should disable scan button when no path', () => {
      render(<ScannerPanel {...defaultProps} />);

      // Button is disabled when path is empty
      const scanButton = screen.getByText('Start Scanning');
      expect(scanButton).toBeDisabled();
    });
  });

  // ===========================================================================
  // Scan Operation
  // ===========================================================================

  describe('scan operation', () => {
    it('should call scanner.scan when Start Scanning clicked with path', async () => {
      const mockScan = vi.fn(async () => ({
        success: true,
        value: {
          sessionId: 'test',
          files: [],
          stats: { totalFiles: 0, totalSize: 0, totalDirs: 0 },
        },
      }));
      getScanner.mockReturnValue({ scan: mockScan, cancel: vi.fn() });

      render(<ScannerPanel {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Users\/yourname\/Documents/i);
      fireEvent.change(input, { target: { value: '/test/folder' } });
      fireEvent.click(screen.getByText('Start Scanning'));

      await waitFor(() => {
        expect(mockScan).toHaveBeenCalledWith(
          '/test/folder',
          expect.objectContaining({ maxDepth: 15, saveToDb: true })
        );
      });
    });

    it('should show error on scan failure', async () => {
      const mockScan = vi.fn(async () => ({
        success: false,
        error: new Error('Permission denied'),
      }));
      getScanner.mockReturnValue({ scan: mockScan, cancel: vi.fn() });

      render(<ScannerPanel {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Users\/yourname\/Documents/i);
      fireEvent.change(input, { target: { value: '/test/folder' } });
      fireEvent.click(screen.getByText('Start Scanning'));

      await waitFor(() => {
        expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Cancel Scan
  // ===========================================================================

  describe('cancel scan', () => {
    it('should call scanner.cancel when Cancel clicked during scan', async () => {
      const mockCancel = vi.fn();
      // Create a promise that stays pending and reports progress
      let resolvePromise;
      const mockScan = vi.fn((path, options) => {
        // Call onProgress to trigger the Cancel button to appear
        if (options?.onProgress) {
          options.onProgress({
            scannedFiles: 10,
            scannedDirs: 2,
            totalSize: 1024,
            currentPath: '/test/folder/file.txt',
            errors: [],
          });
        }
        return new Promise((resolve) => {
          resolvePromise = resolve;
        });
      });
      getScanner.mockReturnValue({ scan: mockScan, cancel: mockCancel });

      render(<ScannerPanel {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Users\/yourname\/Documents/i);
      fireEvent.change(input, { target: { value: '/test/folder' } });
      fireEvent.click(screen.getByText('Start Scanning'));

      // Wait for Cancel button to appear (scan is in progress with progress data)
      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(mockCancel).toHaveBeenCalled();

      // Clean up by resolving the promise
      resolvePromise({ success: true, value: {} });
    });
  });

  // ===========================================================================
  // File System Access
  // ===========================================================================

  describe('file system access', () => {
    it('should check for file system access on render', () => {
      render(<ScannerPanel {...defaultProps} />);

      expect(hasFileSystemAccess).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render main container with space-y-6', () => {
      const { container } = render(<ScannerPanel {...defaultProps} />);

      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveClass('space-y-6');
    });
  });
});
