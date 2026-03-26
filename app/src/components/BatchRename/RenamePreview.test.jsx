/**
 * RenamePreview Component Tests
 * =============================
 * Tests for the rename preview table component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RenamePreview from './RenamePreview.jsx';

describe('RenamePreview', () => {
  const mockPreview = [
    { original: 'file1.txt', newName: 'doc_file1.txt', willChange: true, conflict: null },
    { original: 'file2.txt', newName: 'doc_file2.txt', willChange: true, conflict: null },
    { original: 'file3.txt', newName: 'file3.txt', willChange: false, conflict: null },
  ];

  // ===========================================================================
  // Empty State
  // ===========================================================================

  describe('empty state', () => {
    it('should show empty message when preview is empty', () => {
      render(<RenamePreview preview={[]} />);

      expect(
        screen.getByText('Select files and configure options to see preview')
      ).toBeInTheDocument();
    });

    it('should show empty message when preview is null', () => {
      render(<RenamePreview preview={null} />);

      expect(
        screen.getByText('Select files and configure options to see preview')
      ).toBeInTheDocument();
    });

    it('should show empty message when preview is undefined', () => {
      render(<RenamePreview />);

      expect(
        screen.getByText('Select files and configure options to see preview')
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Preview Display
  // ===========================================================================

  describe('preview display', () => {
    it('should render table headers', () => {
      render(<RenamePreview preview={mockPreview} />);

      expect(screen.getByText('Original')).toBeInTheDocument();
      expect(screen.getByText('New Name')).toBeInTheDocument();
    });

    it('should render original file names', () => {
      render(<RenamePreview preview={mockPreview} />);

      expect(screen.getByText('file1.txt')).toBeInTheDocument();
      expect(screen.getByText('file2.txt')).toBeInTheDocument();
      // file3.txt appears twice (original and new name are same), so use getAllByText
      expect(screen.getAllByText('file3.txt').length).toBeGreaterThanOrEqual(1);
    });

    it('should render new file names', () => {
      render(<RenamePreview preview={mockPreview} />);

      expect(screen.getByText('doc_file1.txt')).toBeInTheDocument();
      expect(screen.getByText('doc_file2.txt')).toBeInTheDocument();
    });

    it('should render table element', () => {
      const { container } = render(<RenamePreview preview={mockPreview} />);

      expect(container.querySelector('table')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Stats Summary
  // ===========================================================================

  describe('stats summary', () => {
    it('should show count of files that will change', () => {
      render(<RenamePreview preview={mockPreview} />);

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('will change')).toBeInTheDocument();
    });

    it('should show unchanged count when files are unchanged', () => {
      render(<RenamePreview preview={mockPreview} />);

      expect(screen.getByText('1 unchanged')).toBeInTheDocument();
    });

    it('should not show unchanged if all files change', () => {
      const allChanging = [
        { original: 'file1.txt', newName: 'new1.txt', willChange: true, conflict: null },
        { original: 'file2.txt', newName: 'new2.txt', willChange: true, conflict: null },
      ];

      render(<RenamePreview preview={allChanging} />);

      expect(screen.queryByText(/unchanged/)).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Conflict Indicators
  // ===========================================================================

  describe('conflict indicators', () => {
    it('should show conflict count when there are conflicts', () => {
      const withConflicts = [
        { original: 'file1.txt', newName: 'dup.txt', willChange: true, conflict: 'duplicate' },
        { original: 'file2.txt', newName: 'dup.txt', willChange: true, conflict: 'duplicate' },
      ];

      render(<RenamePreview preview={withConflicts} />);

      expect(screen.getByText('2 conflicts')).toBeInTheDocument();
    });

    it('should render warning icon for duplicate conflicts', () => {
      const withDuplicate = [
        { original: 'file1.txt', newName: 'dup.txt', willChange: true, conflict: 'duplicate' },
      ];

      const { container } = render(<RenamePreview preview={withDuplicate} />);

      // Should have warning icon in the table row
      const warningIcons = container.querySelectorAll('svg.lucide-triangle-alert');
      expect(warningIcons.length).toBeGreaterThan(0);
    });

    it('should render X icon for exists conflicts', () => {
      const withExists = [
        { original: 'file1.txt', newName: 'existing.txt', willChange: true, conflict: 'exists' },
      ];

      const { container } = render(<RenamePreview preview={withExists} />);

      // Should have X icon for exists conflict
      const xIcons = container.querySelectorAll('svg.lucide-x');
      expect(xIcons.length).toBeGreaterThan(0);
    });

    it('should render check icon for files that will change without conflict', () => {
      const willChange = [
        { original: 'file1.txt', newName: 'new1.txt', willChange: true, conflict: null },
      ];

      const { container } = render(<RenamePreview preview={willChange} />);

      // Should have check icon
      const checkIcons = container.querySelectorAll('svg.lucide-check');
      expect(checkIcons.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Truncation / Max Display
  // ===========================================================================

  describe('truncation', () => {
    it('should limit display to maxDisplay items', () => {
      const manyFiles = Array.from({ length: 100 }, (_, i) => ({
        original: `file${i}.txt`,
        newName: `new${i}.txt`,
        willChange: true,
        conflict: null,
      }));

      render(<RenamePreview preview={manyFiles} maxDisplay={10} />);

      // Should show "and X more files" message
      expect(screen.getByText('... and 90 more files')).toBeInTheDocument();
    });

    it('should show all files when under maxDisplay limit', () => {
      const fewFiles = Array.from({ length: 5 }, (_, i) => ({
        original: `file${i}.txt`,
        newName: `new${i}.txt`,
        willChange: true,
        conflict: null,
      }));

      render(<RenamePreview preview={fewFiles} maxDisplay={10} />);

      // Should NOT show "more files" message
      expect(screen.queryByText(/more files/)).not.toBeInTheDocument();
    });

    it('should use default maxDisplay of 50', () => {
      const manyFiles = Array.from({ length: 60 }, (_, i) => ({
        original: `file${i}.txt`,
        newName: `new${i}.txt`,
        willChange: true,
        conflict: null,
      }));

      render(<RenamePreview preview={manyFiles} />);

      // Should show "and 10 more files" message
      expect(screen.getByText('... and 10 more files')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Styling
  // ===========================================================================

  describe('styling', () => {
    it('should apply opacity to unchanged files', () => {
      const { container } = render(<RenamePreview preview={mockPreview} />);

      const rows = container.querySelectorAll('tbody tr');
      // The third row (index 2) should have opacity-50 class
      expect(rows[2]).toHaveClass('opacity-50');
    });

    it('should apply background to conflict files', () => {
      const withConflict = [
        { original: 'file1.txt', newName: 'dup.txt', willChange: true, conflict: 'duplicate' },
      ];

      const { container } = render(<RenamePreview preview={withConflict} />);

      const row = container.querySelector('tbody tr');
      expect(row).toHaveClass('bg-amber-500/10');
    });
  });
});
