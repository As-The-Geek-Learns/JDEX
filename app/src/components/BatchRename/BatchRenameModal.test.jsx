/**
 * BatchRenameModal Component Tests
 * =================================
 * Tests for the main batch rename modal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BatchRenameModal from './BatchRenameModal.jsx';

// Mock the LicenseContext
vi.mock('../../context/LicenseContext.jsx', () => ({
  useLicense: vi.fn(() => ({
    isPremium: false,
  })),
  UpgradePrompt: function MockUpgradePrompt({ feature, onClose }) {
    return (
      <div data-testid="upgrade-prompt">
        <span>Upgrade to Premium for {feature}</span>
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

// Mock the batchRenameService
vi.mock('../../services/batchRenameService.js', () => ({
  generatePreview: vi.fn(() => []),
  executeBatchRename: vi.fn(async () => ({ success: true, count: 0, total: 0 })),
  undoBatchRename: vi.fn(async () => ({ success: true, count: 0 })),
  getMostRecentUndoLog: vi.fn(() => null),
  checkBatchLimit: vi.fn(() => ({ allowed: true, limit: 5 })),
}));

// Mock child components
vi.mock('./FileSelector.jsx', () => ({
  default: function MockFileSelector({ onFilesChange }) {
    return (
      <div data-testid="file-selector">
        <button onClick={() => onFilesChange([{ name: 'test.txt', path: '/test.txt' }])}>
          Mock Select Files
        </button>
      </div>
    );
  },
}));

vi.mock('./RenamePreview.jsx', () => ({
  default: function MockRenamePreview({ preview }) {
    return (
      <div data-testid="rename-preview">
        {preview?.length > 0 ? `${preview.length} files previewed` : 'No preview'}
      </div>
    );
  },
}));

import { useLicense } from '../../context/LicenseContext.jsx';
import {
  generatePreview,
  executeBatchRename,
  undoBatchRename,
  getMostRecentUndoLog,
  checkBatchLimit,
} from '../../services/batchRenameService.js';

describe('BatchRenameModal', () => {
  const mockOnClose = vi.fn();

  const defaultProps = {
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useLicense.mockReturnValue({
      isPremium: false,
    });
    getMostRecentUndoLog.mockReturnValue(null);
    checkBatchLimit.mockReturnValue({ allowed: true, limit: 5 });
    generatePreview.mockReturnValue([]);
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render modal header with title', () => {
      render(<BatchRenameModal {...defaultProps} />);

      expect(screen.getByText('Batch Rename')).toBeInTheDocument();
    });

    it('should render close button', () => {
      const { container } = render(<BatchRenameModal {...defaultProps} />);

      const closeButton = container.querySelector('svg.lucide-x');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render FileSelector component', () => {
      render(<BatchRenameModal {...defaultProps} />);

      expect(screen.getByTestId('file-selector')).toBeInTheDocument();
    });

    it('should render Select Files section', () => {
      render(<BatchRenameModal {...defaultProps} />);

      expect(screen.getByText('Select Files')).toBeInTheDocument();
    });

    it('should render Cancel button', () => {
      render(<BatchRenameModal {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render Rename button showing 0 files initially', () => {
      render(<BatchRenameModal {...defaultProps} />);

      expect(screen.getByText('Rename 0 Files')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Free Tier Limit Badge
  // ===========================================================================

  describe('free tier limit badge', () => {
    it('should show free tier limit badge when not premium', () => {
      render(<BatchRenameModal {...defaultProps} />);

      expect(screen.getByText('Free: 5 files max')).toBeInTheDocument();
    });

    it('should not show limit badge when premium', () => {
      useLicense.mockReturnValue({
        isPremium: true,
        showUpgradePrompt: vi.fn(),
      });

      render(<BatchRenameModal {...defaultProps} />);

      expect(screen.queryByText(/files max/)).not.toBeInTheDocument();
    });

    it('should render lock icon in free tier badge', () => {
      const { container } = render(<BatchRenameModal {...defaultProps} />);

      expect(container.querySelector('svg.lucide-lock')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Close Modal
  // ===========================================================================

  describe('close modal', () => {
    it('should call onClose when close button clicked', () => {
      const { container } = render(<BatchRenameModal {...defaultProps} />);

      const closeButton = container.querySelector('svg.lucide-x').closest('button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Cancel button clicked', () => {
      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Rename Options (shown after files selected)
  // ===========================================================================

  describe('rename options', () => {
    beforeEach(() => {
      generatePreview.mockReturnValue([
        { original: 'test.txt', newName: 'test.txt', willChange: false, conflict: null },
      ]);
    });

    it('should show Rename Options section when files selected', () => {
      render(<BatchRenameModal {...defaultProps} />);

      // Click mock file selector button
      fireEvent.click(screen.getByText('Mock Select Files'));

      expect(screen.getByText('Rename Options')).toBeInTheDocument();
    });

    it('should show Add Prefix option', () => {
      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Mock Select Files'));

      expect(screen.getByText('Add Prefix')).toBeInTheDocument();
    });

    it('should show Add Suffix option', () => {
      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Mock Select Files'));

      expect(screen.getByText('Add Suffix')).toBeInTheDocument();
    });

    it('should show Find & Replace option', () => {
      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Mock Select Files'));

      expect(screen.getByText('Find & Replace')).toBeInTheDocument();
    });

    it('should show Add Sequential Number option', () => {
      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Mock Select Files'));

      expect(screen.getByText('Add Sequential Number')).toBeInTheDocument();
    });

    it('should show Change Case option', () => {
      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Mock Select Files'));

      expect(screen.getByText('Change Case')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Prefix Option
  // ===========================================================================

  describe('prefix option', () => {
    beforeEach(() => {
      generatePreview.mockReturnValue([
        { original: 'test.txt', newName: 'test.txt', willChange: false, conflict: null },
      ]);
    });

    it('should show prefix input when checkbox checked', () => {
      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Mock Select Files'));
      fireEvent.click(screen.getByText('Add Prefix'));

      expect(screen.getByPlaceholderText('e.g., 12.01_')).toBeInTheDocument();
    });

    it('should call generatePreview when prefix value changes', () => {
      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Mock Select Files'));
      fireEvent.click(screen.getByText('Add Prefix'));

      generatePreview.mockClear();

      fireEvent.change(screen.getByPlaceholderText('e.g., 12.01_'), {
        target: { value: 'doc_' },
      });

      expect(generatePreview).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Preview Section
  // ===========================================================================

  describe('preview section', () => {
    beforeEach(() => {
      generatePreview.mockReturnValue([
        { original: 'test.txt', newName: 'new_test.txt', willChange: true, conflict: null },
      ]);
    });

    it('should show Preview section when files selected', () => {
      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Mock Select Files'));

      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('should render RenamePreview component', () => {
      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Mock Select Files'));

      expect(screen.getByTestId('rename-preview')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Execute Rename
  // ===========================================================================

  describe('execute rename', () => {
    beforeEach(() => {
      generatePreview.mockReturnValue([
        { original: 'test.txt', newName: 'new_test.txt', willChange: true, conflict: null },
      ]);
      executeBatchRename.mockResolvedValue({
        success: true,
        count: 1,
        total: 1,
        undoId: 'undo-123',
      });
    });

    it('should update rename button count based on preview', () => {
      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Mock Select Files'));

      expect(screen.getByText('Rename 1 File')).toBeInTheDocument();
    });

    it('should call executeBatchRename when rename button clicked', async () => {
      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Mock Select Files'));
      fireEvent.click(screen.getByText('Rename 1 File'));

      await waitFor(() => {
        expect(executeBatchRename).toHaveBeenCalled();
      });
    });

    it('should show success message after rename', async () => {
      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Mock Select Files'));
      fireEvent.click(screen.getByText('Rename 1 File'));

      await waitFor(() => {
        expect(screen.getByText('Renamed 1 of 1 file')).toBeInTheDocument();
      });
    });

    it('should show upgrade prompt when batch limit not allowed', async () => {
      useLicense.mockReturnValue({
        isPremium: false,
      });
      checkBatchLimit.mockReturnValue({ allowed: false, limit: 5 });

      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Mock Select Files'));
      fireEvent.click(screen.getByText('Rename 1 File'));

      // Should show the upgrade prompt
      expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument();
      expect(screen.getByText('Upgrade to Premium for batchRename')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Undo Functionality
  // ===========================================================================

  describe('undo functionality', () => {
    beforeEach(() => {
      getMostRecentUndoLog.mockReturnValue({ id: 'undo-existing' });
      undoBatchRename.mockResolvedValue({ success: true, count: 5 });
    });

    it('should show Undo Last button when undo log exists', () => {
      render(<BatchRenameModal {...defaultProps} />);

      expect(screen.getByText('Undo Last')).toBeInTheDocument();
    });

    it('should not show Undo button when no undo log', () => {
      getMostRecentUndoLog.mockReturnValue(null);

      render(<BatchRenameModal {...defaultProps} />);

      expect(screen.queryByText('Undo Last')).not.toBeInTheDocument();
    });

    it('should call undoBatchRename when Undo clicked', async () => {
      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Undo Last'));

      await waitFor(() => {
        expect(undoBatchRename).toHaveBeenCalledWith('undo-existing', expect.any(Function));
      });
    });

    it('should show undo success message', async () => {
      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Undo Last'));

      await waitFor(() => {
        expect(screen.getByText('Undone 5 file renames')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Conflicts Warning
  // ===========================================================================

  describe('conflicts warning', () => {
    it('should show conflicts warning when there are conflicts', () => {
      generatePreview.mockReturnValue([
        { original: 'test.txt', newName: 'dup.txt', willChange: true, conflict: 'duplicate' },
        { original: 'test2.txt', newName: 'dup.txt', willChange: true, conflict: 'duplicate' },
      ]);

      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Mock Select Files'));

      expect(screen.getByText('Some files have conflicts and will be skipped')).toBeInTheDocument();
    });

    it('should not show conflicts warning when no conflicts', () => {
      generatePreview.mockReturnValue([
        { original: 'test.txt', newName: 'new.txt', willChange: true, conflict: null },
      ]);

      render(<BatchRenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Mock Select Files'));

      expect(screen.queryByText(/conflicts/i)).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render modal backdrop', () => {
      const { container } = render(<BatchRenameModal {...defaultProps} />);

      expect(container.querySelector('.modal-backdrop')).toBeInTheDocument();
    });

    it('should render glass-card container', () => {
      const { container } = render(<BatchRenameModal {...defaultProps} />);

      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });

    it('should render FileEdit icon in header', () => {
      const { container } = render(<BatchRenameModal {...defaultProps} />);

      // FileEdit component renders as lucide-file-pen class
      expect(container.querySelector('svg.lucide-file-pen')).toBeInTheDocument();
    });
  });
});
