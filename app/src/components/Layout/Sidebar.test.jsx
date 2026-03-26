/**
 * Sidebar Component Tests
 * =======================
 * Tests for the main navigation sidebar component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar.jsx';

// Mock CategoryTree since it's a separate component
vi.mock('../Navigation/index.js', () => ({
  CategoryTree: vi.fn(
    ({ areas, categories, onSelectCategory: _onSelectCategory, onSelectArea: _onSelectArea }) => (
      <div data-testid="category-tree">
        <span>Mock CategoryTree</span>
        <span data-testid="areas-count">{areas?.length || 0}</span>
        <span data-testid="categories-count">{categories?.length || 0}</span>
      </div>
    )
  ),
}));

describe('Sidebar', () => {
  const mockCallbacks = {
    onNewFolder: vi.fn(),
    onNewItem: vi.fn(),
    onFileOrganizer: vi.fn(),
    onStatsDashboard: vi.fn(),
    onBatchRename: vi.fn(),
    onSettings: vi.fn(),
    onNavigate: vi.fn(),
    onExportDatabase: vi.fn(),
    onExportJSON: vi.fn(),
    onImport: vi.fn(),
  };

  const mockAreas = [
    { id: 1, name: 'Finance', range_start: 10, range_end: 19 },
    { id: 2, name: 'Personal', range_start: 20, range_end: 29 },
  ];

  const mockCategories = [
    { id: 1, number: 11, name: 'Banking', area_id: 1 },
    { id: 2, number: 12, name: 'Investments', area_id: 1 },
  ];

  const defaultProps = {
    isOpen: true,
    areas: mockAreas,
    categories: mockCategories,
    currentView: 'home',
    searchQuery: '',
    selectedCategory: null,
    ...mockCallbacks,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render logo section', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('JDex')).toBeInTheDocument();
    });

    it('should render version badge', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('v2.0')).toBeInTheDocument();
    });

    it('should render tagline', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('4-Level Johnny Decimal')).toBeInTheDocument();
    });

    it('should render JD logo', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Quick Actions
  // ===========================================================================

  describe('quick actions', () => {
    it('should render New Folder button', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('New Folder (XX.XX)')).toBeInTheDocument();
    });

    it('should render New Item button', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('New Item (XX.XX.XX)')).toBeInTheDocument();
    });

    it('should render File Organizer button', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('File Organizer')).toBeInTheDocument();
    });

    it('should render Statistics button', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });

    it('should render Batch Rename button', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('Batch Rename')).toBeInTheDocument();
    });

    it('should render Settings button', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should call onNewFolder when clicked', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('New Folder (XX.XX)'));

      expect(mockCallbacks.onNewFolder).toHaveBeenCalled();
    });

    it('should call onNewItem when clicked', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('New Item (XX.XX.XX)'));

      expect(mockCallbacks.onNewItem).toHaveBeenCalled();
    });

    it('should call onFileOrganizer when clicked', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('File Organizer'));

      expect(mockCallbacks.onFileOrganizer).toHaveBeenCalled();
    });

    it('should call onStatsDashboard when clicked', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Statistics'));

      expect(mockCallbacks.onStatsDashboard).toHaveBeenCalled();
    });

    it('should call onBatchRename when clicked', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Batch Rename'));

      expect(mockCallbacks.onBatchRename).toHaveBeenCalled();
    });

    it('should call onSettings when clicked', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Settings'));

      expect(mockCallbacks.onSettings).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Navigation
  // ===========================================================================

  describe('navigation', () => {
    it('should render Overview button', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    it('should call onNavigate with home when Overview clicked', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Overview'));

      expect(mockCallbacks.onNavigate).toHaveBeenCalledWith('home');
    });

    it('should highlight Overview when on home view', () => {
      render(<Sidebar {...defaultProps} currentView="home" />);

      const overviewButton = screen.getByText('Overview').closest('button');
      expect(overviewButton).toHaveClass('bg-teal-600/30');
    });

    it('should not highlight Overview when not on home view', () => {
      render(<Sidebar {...defaultProps} currentView="folder" />);

      const overviewButton = screen.getByText('Overview').closest('button');
      expect(overviewButton).not.toHaveClass('bg-teal-600/30');
    });

    it('should render Areas & Categories label', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('Areas & Categories')).toBeInTheDocument();
    });

    it('should render CategoryTree component', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByTestId('category-tree')).toBeInTheDocument();
    });

    it('should pass areas to CategoryTree', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByTestId('areas-count')).toHaveTextContent('2');
    });

    it('should pass categories to CategoryTree', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByTestId('categories-count')).toHaveTextContent('2');
    });
  });

  // ===========================================================================
  // Export/Import
  // ===========================================================================

  describe('export/import', () => {
    it('should render Backup button', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('Backup')).toBeInTheDocument();
    });

    it('should render JSON button', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('JSON')).toBeInTheDocument();
    });

    it('should render Import Backup label', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('Import Backup')).toBeInTheDocument();
    });

    it('should call onExportDatabase when Backup clicked', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Backup'));

      expect(mockCallbacks.onExportDatabase).toHaveBeenCalled();
    });

    it('should call onExportJSON when JSON clicked', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('JSON'));

      expect(mockCallbacks.onExportJSON).toHaveBeenCalled();
    });

    it('should have file input for import', () => {
      const { container } = render(<Sidebar {...defaultProps} />);

      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', '.sqlite');
    });

    it('should call onImport when file selected', () => {
      const { container } = render(<Sidebar {...defaultProps} />);

      const fileInput = container.querySelector('input[type="file"]');
      const file = new File(['test'], 'backup.sqlite', { type: 'application/octet-stream' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(mockCallbacks.onImport).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Open/Close State
  // ===========================================================================

  describe('open/close state', () => {
    it('should have full width when open', () => {
      const { container } = render(<Sidebar {...defaultProps} isOpen={true} />);

      const aside = container.querySelector('aside');
      expect(aside).toHaveClass('w-80');
    });

    it('should have zero width when closed', () => {
      const { container } = render(<Sidebar {...defaultProps} isOpen={false} />);

      const aside = container.querySelector('aside');
      expect(aside).toHaveClass('w-0');
    });

    it('should have transition class', () => {
      const { container } = render(<Sidebar {...defaultProps} />);

      const aside = container.querySelector('aside');
      expect(aside).toHaveClass('transition-all');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle empty areas', () => {
      render(<Sidebar {...defaultProps} areas={[]} />);

      expect(screen.getByTestId('areas-count')).toHaveTextContent('0');
    });

    it('should handle empty categories', () => {
      render(<Sidebar {...defaultProps} categories={[]} />);

      expect(screen.getByTestId('categories-count')).toHaveTextContent('0');
    });

    it('should not highlight overview when searching', () => {
      render(<Sidebar {...defaultProps} currentView="home" searchQuery="test" />);

      const overviewButton = screen.getByText('Overview').closest('button');
      expect(overviewButton).not.toHaveClass('bg-teal-600/30');
    });
  });
});
