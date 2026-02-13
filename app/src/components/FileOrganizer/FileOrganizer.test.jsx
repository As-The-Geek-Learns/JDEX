/**
 * FileOrganizer Component Tests
 * =============================
 * Tests for the main file organizer component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FileOrganizer from './FileOrganizer.jsx';

// Mock sub-components
vi.mock('./ScannerPanel.jsx', () => ({
  default: function MockScannerPanel({ onScanComplete }) {
    return (
      <div data-testid="scanner-panel">
        <button onClick={() => onScanComplete('session-123', [{ id: 1, name: 'test.txt' }])}>
          Mock Scan Complete
        </button>
      </div>
    );
  },
}));

vi.mock('./RulesManager.jsx', () => ({
  default: function MockRulesManager() {
    return <div data-testid="rules-manager">Rules Manager</div>;
  },
}));

vi.mock('./WatchFolders.jsx', () => ({
  default: function MockWatchFolders() {
    return <div data-testid="watch-folders">Watch Folders</div>;
  },
}));

// Mock services
vi.mock('../../services/matchingEngine.js', () => ({
  getMatchingEngine: vi.fn(() => ({
    batchMatch: vi.fn(() => []),
  })),
  CONFIDENCE: { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' },
}));

vi.mock('../../services/fileOperations.js', () => ({
  batchMove: vi.fn(async () => ({ success: true, succeeded: [], failed: [] })),
  previewOperations: vi.fn(() => []),
  CONFLICT_STRATEGY: { RENAME: 'rename', SKIP: 'skip', OVERWRITE: 'overwrite' },
  OP_STATUS: { SUCCESS: 'success', FAILED: 'failed', SKIPPED: 'skipped' },
}));

vi.mock('../../services/fileScannerService.js', () => ({
  formatFileSize: vi.fn((size) => `${size} bytes`),
}));

vi.mock('../../db.js', () => ({
  getScannedFiles: vi.fn(() => []),
  updateScannedFileDecision: vi.fn(),
  getFolders: vi.fn(() => []),
}));

describe('FileOrganizer', () => {
  const mockOnClose = vi.fn();

  const defaultProps = {
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render header with title', () => {
      render(<FileOrganizer {...defaultProps} />);

      expect(screen.getByText('File Organizer')).toBeInTheDocument();
    });

    it('should render subtitle', () => {
      render(<FileOrganizer {...defaultProps} />);

      expect(
        screen.getByText('Scan, organize, and manage your files with Johnny Decimal')
      ).toBeInTheDocument();
    });

    it('should render close button', () => {
      const { container } = render(<FileOrganizer {...defaultProps} />);

      // Close button is in the header
      const closeButton = container.querySelector('header button');
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button clicked', () => {
      const { container } = render(<FileOrganizer {...defaultProps} />);

      const closeButton = container.querySelector('header button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Tab Navigation
  // ===========================================================================

  describe('tab navigation', () => {
    it('should render Scan tab', () => {
      render(<FileOrganizer {...defaultProps} />);

      expect(screen.getByText('Scan')).toBeInTheDocument();
    });

    it('should render Organize tab', () => {
      render(<FileOrganizer {...defaultProps} />);

      expect(screen.getByText('Organize')).toBeInTheDocument();
    });

    it('should render Rules tab', () => {
      render(<FileOrganizer {...defaultProps} />);

      expect(screen.getByText('Rules')).toBeInTheDocument();
    });

    it('should render Watch tab', () => {
      render(<FileOrganizer {...defaultProps} />);

      expect(screen.getByText('Watch')).toBeInTheDocument();
    });

    it('should show Scanner panel by default (Scan tab active)', () => {
      render(<FileOrganizer {...defaultProps} />);

      expect(screen.getByTestId('scanner-panel')).toBeInTheDocument();
    });

    it('should switch to Rules Manager when Rules tab clicked', () => {
      render(<FileOrganizer {...defaultProps} />);

      fireEvent.click(screen.getByText('Rules'));

      expect(screen.getByTestId('rules-manager')).toBeInTheDocument();
    });

    it('should switch to Watch Folders when Watch tab clicked', () => {
      render(<FileOrganizer {...defaultProps} />);

      fireEvent.click(screen.getByText('Watch'));

      expect(screen.getByTestId('watch-folders')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Scan Flow
  // ===========================================================================

  describe('scan flow', () => {
    it('should switch to Organize tab after scan complete', () => {
      render(<FileOrganizer {...defaultProps} />);

      // Trigger scan complete
      fireEvent.click(screen.getByText('Mock Scan Complete'));

      // Should now show Organize panel (not scanner)
      expect(screen.queryByTestId('scanner-panel')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render fixed fullscreen container', () => {
      const { container } = render(<FileOrganizer {...defaultProps} />);

      const outerDiv = container.firstChild;
      expect(outerDiv).toHaveClass('fixed', 'inset-0');
    });

    it('should render header with border', () => {
      const { container } = render(<FileOrganizer {...defaultProps} />);

      const header = container.querySelector('header');
      expect(header).toHaveClass('border-b');
    });
  });
});
