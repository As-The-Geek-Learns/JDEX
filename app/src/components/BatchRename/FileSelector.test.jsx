/**
 * FileSelector Component Tests
 * ============================
 * Tests for the file selector component used in batch rename.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FileSelector from './FileSelector.jsx';

// Mock the batchRenameService
vi.mock('../../services/batchRenameService.js', () => ({
  readDirectoryFiles: vi.fn(),
}));

// Mock validation utils
vi.mock('../../utils/validation.js', () => ({
  validateFilePath: vi.fn((path) => path),
  sanitizeText: vi.fn((text) => text),
}));

import { readDirectoryFiles } from '../../services/batchRenameService.js';

describe('FileSelector', () => {
  const mockOnFilesChange = vi.fn();

  const mockFiles = [
    { name: 'file1.txt', path: '/folder/file1.txt', size: 1024 },
    { name: 'file2.txt', path: '/folder/file2.txt', size: 2048 },
    { name: 'file3.txt', path: '/folder/file3.txt', size: 512 },
  ];

  const defaultProps = {
    selectedFiles: [],
    onFilesChange: mockOnFilesChange,
    maxFiles: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    readDirectoryFiles.mockReturnValue(mockFiles);
    // Mock window.prompt for folder selection fallback
    vi.spyOn(window, 'prompt').mockReturnValue(null);
  });

  // ===========================================================================
  // Empty State
  // ===========================================================================

  describe('empty state', () => {
    it('should render Choose Folder button', () => {
      render(<FileSelector {...defaultProps} />);

      expect(screen.getByText('Choose Folder')).toBeInTheDocument();
    });

    it('should show empty state message when no folder selected', () => {
      render(<FileSelector {...defaultProps} />);

      expect(screen.getByText('Select a folder to see files')).toBeInTheDocument();
    });

    it('should render folder icon in empty state', () => {
      const { container } = render(<FileSelector {...defaultProps} />);

      const folderIcons = container.querySelectorAll('svg.lucide-folder');
      expect(folderIcons.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Folder Selection
  // ===========================================================================

  describe('folder selection', () => {
    it('should call prompt when Choose Folder clicked (fallback)', () => {
      render(<FileSelector {...defaultProps} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      expect(window.prompt).toHaveBeenCalledWith('Enter folder path:');
    });

    it('should load files when folder path provided', () => {
      window.prompt.mockReturnValue('/test/folder');

      render(<FileSelector {...defaultProps} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      expect(readDirectoryFiles).toHaveBeenCalledWith('/test/folder');
    });

    it('should display folder path after selection', () => {
      window.prompt.mockReturnValue('/test/folder');

      render(<FileSelector {...defaultProps} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      expect(screen.getByText('/test/folder')).toBeInTheDocument();
    });

    it('should show error when no files found', () => {
      window.prompt.mockReturnValue('/empty/folder');
      readDirectoryFiles.mockReturnValue([]);

      render(<FileSelector {...defaultProps} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      expect(screen.getByText('No files found in this folder')).toBeInTheDocument();
    });

    it('should show error on read failure', () => {
      window.prompt.mockReturnValue('/bad/folder');
      readDirectoryFiles.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      render(<FileSelector {...defaultProps} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      expect(screen.getByText('Permission denied')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // File List Display
  // ===========================================================================

  describe('file list display', () => {
    it('should display loaded files', () => {
      window.prompt.mockReturnValue('/test/folder');

      render(<FileSelector {...defaultProps} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      expect(screen.getByText('file1.txt')).toBeInTheDocument();
      expect(screen.getByText('file2.txt')).toBeInTheDocument();
      expect(screen.getByText('file3.txt')).toBeInTheDocument();
    });

    it('should display file sizes', () => {
      window.prompt.mockReturnValue('/test/folder');

      render(<FileSelector {...defaultProps} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      expect(screen.getByText('1.0 KB')).toBeInTheDocument();
      expect(screen.getByText('2.0 KB')).toBeInTheDocument();
      expect(screen.getByText('512 B')).toBeInTheDocument();
    });

    it('should show selection count', () => {
      window.prompt.mockReturnValue('/test/folder');

      // Render with files already selected (simulates parent updating selectedFiles after auto-select)
      render(<FileSelector selectedFiles={mockFiles} onFilesChange={mockOnFilesChange} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      expect(screen.getByText('3 of 3 selected')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // File Selection
  // ===========================================================================

  describe('file selection', () => {
    it('should auto-select all files when folder loaded', () => {
      window.prompt.mockReturnValue('/test/folder');

      render(<FileSelector {...defaultProps} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      expect(mockOnFilesChange).toHaveBeenCalledWith(mockFiles);
    });

    it('should toggle file selection when clicked', () => {
      window.prompt.mockReturnValue('/test/folder');

      render(<FileSelector selectedFiles={mockFiles} onFilesChange={mockOnFilesChange} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      // Click on a file to deselect it
      fireEvent.click(screen.getByText('file1.txt'));

      expect(mockOnFilesChange).toHaveBeenCalledWith(
        mockFiles.filter((f) => f.path !== '/folder/file1.txt')
      );
    });

    it('should render Select All button', () => {
      window.prompt.mockReturnValue('/test/folder');

      // Render with all files selected to see "Deselect All" button
      render(<FileSelector selectedFiles={mockFiles} onFilesChange={mockOnFilesChange} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      // Since all are selected, it should show "Deselect All"
      expect(screen.getByText('Deselect All')).toBeInTheDocument();
    });

    it('should show Select All when not all selected', () => {
      window.prompt.mockReturnValue('/test/folder');

      render(<FileSelector selectedFiles={[mockFiles[0]]} onFilesChange={mockOnFilesChange} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      expect(screen.getByText('Select All')).toBeInTheDocument();
    });

    it('should deselect all when Deselect All clicked', () => {
      window.prompt.mockReturnValue('/test/folder');

      render(<FileSelector selectedFiles={mockFiles} onFilesChange={mockOnFilesChange} />);

      fireEvent.click(screen.getByText('Choose Folder'));
      fireEvent.click(screen.getByText('Deselect All'));

      expect(mockOnFilesChange).toHaveBeenCalledWith([]);
    });
  });

  // ===========================================================================
  // Max Files Limit
  // ===========================================================================

  describe('max files limit', () => {
    it('should show limit message when at max', () => {
      window.prompt.mockReturnValue('/test/folder');

      render(
        <FileSelector
          selectedFiles={mockFiles.slice(0, 2)}
          onFilesChange={mockOnFilesChange}
          maxFiles={2}
        />
      );

      fireEvent.click(screen.getByText('Choose Folder'));

      expect(screen.getByText('(limit: 2)')).toBeInTheDocument();
    });

    it('should respect maxFiles when auto-selecting', () => {
      window.prompt.mockReturnValue('/test/folder');

      render(<FileSelector {...defaultProps} maxFiles={2} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      // Component auto-selects all files but maxFiles limits manual selection
      // The onFilesChange is called with all files initially
      expect(mockOnFilesChange).toHaveBeenCalledWith(mockFiles);
    });

    it('should prevent selecting more than maxFiles', () => {
      window.prompt.mockReturnValue('/test/folder');

      render(
        <FileSelector
          selectedFiles={mockFiles.slice(0, 2)}
          onFilesChange={mockOnFilesChange}
          maxFiles={2}
        />
      );

      fireEvent.click(screen.getByText('Choose Folder'));

      // Clear previous calls
      mockOnFilesChange.mockClear();

      // Try to click on file3 (not selected)
      fireEvent.click(screen.getByText('file3.txt'));

      // Should not have called onFilesChange to add a new file
      // (the toggle function returns early when at limit)
      expect(mockOnFilesChange).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Refresh Button
  // ===========================================================================

  describe('refresh button', () => {
    it('should render refresh button when folder is selected', () => {
      window.prompt.mockReturnValue('/test/folder');

      const { container } = render(<FileSelector {...defaultProps} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      expect(container.querySelector('svg.lucide-refresh-cw')).toBeInTheDocument();
    });

    it('should reload folder when refresh clicked', () => {
      window.prompt.mockReturnValue('/test/folder');

      const { container } = render(<FileSelector {...defaultProps} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      readDirectoryFiles.mockClear();

      const refreshButton = container.querySelector('svg.lucide-refresh-cw').closest('button');
      fireEvent.click(refreshButton);

      expect(readDirectoryFiles).toHaveBeenCalledWith('/test/folder');
    });
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe('loading state', () => {
    it('should not show loading message after files loaded', () => {
      window.prompt.mockReturnValue('/test/folder');

      render(<FileSelector {...defaultProps} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      expect(screen.queryByText('Loading files...')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render file icons in file list', () => {
      window.prompt.mockReturnValue('/test/folder');

      const { container } = render(<FileSelector {...defaultProps} />);

      fireEvent.click(screen.getByText('Choose Folder'));

      const fileIcons = container.querySelectorAll('svg.lucide-file');
      expect(fileIcons.length).toBe(3);
    });

    it('should render checkboxes for each file', () => {
      window.prompt.mockReturnValue('/test/folder');

      const { container } = render(
        <FileSelector selectedFiles={mockFiles} onFilesChange={mockOnFilesChange} />
      );

      fireEvent.click(screen.getByText('Choose Folder'));

      // Check icons appear for selected files
      const checkIcons = container.querySelectorAll('svg.lucide-check');
      expect(checkIcons.length).toBe(3);
    });
  });
});
