/**
 * ContentArea Component Tests
 * ===========================
 * Tests for the main content area component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContentArea from './ContentArea.jsx';

// Mock child components to isolate ContentArea testing
vi.mock('../Common/index.js', () => ({
  Breadcrumb: vi.fn(({ path, onNavigate: _onNavigate }) => (
    <div data-testid="breadcrumb">
      <span data-testid="breadcrumb-path">{path.length} items</span>
    </div>
  )),
  QuickStatsOverview: vi.fn(({ stats: _stats }) => (
    <div data-testid="quick-stats">
      <span>Stats Overview</span>
    </div>
  )),
}));

vi.mock('../Cards/index.js', () => ({
  FolderCard: vi.fn(({ folder, onEdit, onDelete, onOpen: _onOpen }) => (
    <div data-testid={`folder-card-${folder.id}`}>
      <span>{folder.name}</span>
      <button onClick={() => onEdit(folder)}>Edit</button>
      <button onClick={() => onDelete(folder)}>Delete</button>
    </div>
  )),
  ItemCard: vi.fn(({ item, onEdit, onDelete }) => (
    <div data-testid={`item-card-${item.id}`}>
      <span>{item.name}</span>
      <button onClick={() => onEdit(item)}>Edit</button>
      <button onClick={() => onDelete(item)}>Delete</button>
    </div>
  )),
}));

vi.mock('../DragDrop/DropZone.jsx', () => ({
  default: vi.fn(({ children, folder, onSuccess: _onSuccess }) => (
    <div data-testid={`dropzone-${folder.id}`}>{children}</div>
  )),
}));

describe('ContentArea', () => {
  const mockCallbacks = {
    onNavigate: vi.fn(),
    onEditFolder: vi.fn(),
    onDeleteFolder: vi.fn(),
    onEditItem: vi.fn(),
    onDeleteItem: vi.fn(),
    onNewFolder: vi.fn(),
    onNewItem: vi.fn(),
    onRefresh: vi.fn(),
  };

  const mockFolders = [
    { id: 1, folder_number: '11.01', name: 'Invoices' },
    { id: 2, folder_number: '11.02', name: 'Receipts' },
  ];

  const mockItems = [
    { id: 1, item_number: '11.01.001', name: 'Invoice Q1' },
    { id: 2, item_number: '11.01.002', name: 'Invoice Q2' },
  ];

  const mockStats = {
    totalFolders: 10,
    totalItems: 50,
    sensitiveFolders: 2,
    sensitiveItems: 5,
    workFolders: 3,
    workItems: 10,
  };

  const defaultProps = {
    currentView: 'home',
    searchQuery: '',
    selectedArea: null,
    selectedCategory: null,
    selectedFolder: null,
    breadcrumbPath: [],
    stats: mockStats,
    displayFolders: mockFolders,
    displayItems: [],
    ...mockCallbacks,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // View Titles
  // ===========================================================================

  describe('view titles', () => {
    it('should show All Folders title on home view', () => {
      render(<ContentArea {...defaultProps} />);

      expect(screen.getByText('All Folders')).toBeInTheDocument();
    });

    it('should show search title when searching', () => {
      render(<ContentArea {...defaultProps} searchQuery="invoices" />);

      expect(screen.getByText('Search: "invoices"')).toBeInTheDocument();
    });

    it('should show folder title in folder view', () => {
      const folder = { folder_number: '11.01', name: 'Client Invoices' };
      render(<ContentArea {...defaultProps} currentView="folder" selectedFolder={folder} />);

      expect(screen.getByText('11.01 Client Invoices')).toBeInTheDocument();
    });

    it('should show category title in category view', () => {
      const category = { number: 11, name: 'Finance' };
      render(<ContentArea {...defaultProps} currentView="category" selectedCategory={category} />);

      expect(screen.getByText('11 Finance')).toBeInTheDocument();
    });

    it('should show area title in area view', () => {
      const area = { range_start: 10, range_end: 19, name: 'Administration' };
      render(<ContentArea {...defaultProps} currentView="area" selectedArea={area} />);

      expect(screen.getByText('10-19 Administration')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Breadcrumb
  // ===========================================================================

  describe('breadcrumb', () => {
    it('should render breadcrumb when path exists', () => {
      render(
        <ContentArea
          {...defaultProps}
          breadcrumbPath={[{ type: 'home' }, { type: 'area', name: 'Finance' }]}
        />
      );

      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
    });

    it('should not render breadcrumb when path is empty', () => {
      render(<ContentArea {...defaultProps} breadcrumbPath={[]} />);

      expect(screen.queryByTestId('breadcrumb')).not.toBeInTheDocument();
    });

    it('should not render breadcrumb when searching', () => {
      render(
        <ContentArea {...defaultProps} searchQuery="test" breadcrumbPath={[{ type: 'home' }]} />
      );

      expect(screen.queryByTestId('breadcrumb')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Quick Stats
  // ===========================================================================

  describe('quick stats', () => {
    it('should render quick stats on home view', () => {
      render(<ContentArea {...defaultProps} currentView="home" />);

      expect(screen.getByTestId('quick-stats')).toBeInTheDocument();
    });

    it('should not render quick stats when searching', () => {
      render(<ContentArea {...defaultProps} currentView="home" searchQuery="test" />);

      expect(screen.queryByTestId('quick-stats')).not.toBeInTheDocument();
    });

    it('should not render quick stats on folder view', () => {
      render(<ContentArea {...defaultProps} currentView="folder" />);

      expect(screen.queryByTestId('quick-stats')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Folders Section
  // ===========================================================================

  describe('folders section', () => {
    it('should render folders section when folders exist', () => {
      render(<ContentArea {...defaultProps} />);

      expect(screen.getByText('Folders (2)')).toBeInTheDocument();
    });

    it('should render folder cards', () => {
      render(<ContentArea {...defaultProps} />);

      expect(screen.getByTestId('folder-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('folder-card-2')).toBeInTheDocument();
    });

    it('should wrap folders in DropZone', () => {
      render(<ContentArea {...defaultProps} />);

      expect(screen.getByTestId('dropzone-1')).toBeInTheDocument();
      expect(screen.getByTestId('dropzone-2')).toBeInTheDocument();
    });

    it('should not render folders section in folder view without search', () => {
      render(<ContentArea {...defaultProps} currentView="folder" displayFolders={mockFolders} />);

      expect(screen.queryByText('Folders (2)')).not.toBeInTheDocument();
    });

    it('should render folders in folder view when searching', () => {
      render(
        <ContentArea
          {...defaultProps}
          currentView="folder"
          searchQuery="test"
          displayFolders={mockFolders}
        />
      );

      expect(screen.getByText('Folders (2)')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Items Section
  // ===========================================================================

  describe('items section', () => {
    it('should render items section in folder view', () => {
      render(<ContentArea {...defaultProps} currentView="folder" displayItems={mockItems} />);

      expect(screen.getByText('Items (2)')).toBeInTheDocument();
    });

    it('should render item cards', () => {
      render(<ContentArea {...defaultProps} currentView="folder" displayItems={mockItems} />);

      expect(screen.getByTestId('item-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-card-2')).toBeInTheDocument();
    });

    it('should render items when searching', () => {
      render(<ContentArea {...defaultProps} searchQuery="invoice" displayItems={mockItems} />);

      expect(screen.getByText('Items (2)')).toBeInTheDocument();
    });

    it('should not render items section on home view without search', () => {
      render(<ContentArea {...defaultProps} currentView="home" displayItems={mockItems} />);

      expect(screen.queryByText('Items (2)')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Empty States
  // ===========================================================================

  describe('empty states', () => {
    it('should show no folders empty state', () => {
      render(<ContentArea {...defaultProps} displayFolders={[]} displayItems={[]} />);

      expect(screen.getByText('No folders yet')).toBeInTheDocument();
    });

    it('should show create folder button in empty state', () => {
      render(<ContentArea {...defaultProps} displayFolders={[]} displayItems={[]} />);

      expect(screen.getByText('Create First Folder')).toBeInTheDocument();
    });

    it('should call onNewFolder when create button clicked', () => {
      render(<ContentArea {...defaultProps} displayFolders={[]} displayItems={[]} />);

      fireEvent.click(screen.getByText('Create First Folder'));

      expect(mockCallbacks.onNewFolder).toHaveBeenCalled();
    });

    it('should show search empty state when no results', () => {
      render(
        <ContentArea
          {...defaultProps}
          searchQuery="nonexistent"
          displayFolders={[]}
          displayItems={[]}
        />
      );

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('should not show create button in search empty state', () => {
      render(
        <ContentArea
          {...defaultProps}
          searchQuery="nonexistent"
          displayFolders={[]}
          displayItems={[]}
        />
      );

      expect(screen.queryByText('Create First Folder')).not.toBeInTheDocument();
    });

    it('should show folder is empty state', () => {
      render(
        <ContentArea {...defaultProps} currentView="folder" displayFolders={[]} displayItems={[]} />
      );

      expect(screen.getByText('This folder is empty')).toBeInTheDocument();
    });

    it('should show add item button in empty folder', () => {
      render(
        <ContentArea {...defaultProps} currentView="folder" displayFolders={[]} displayItems={[]} />
      );

      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });

    it('should call onNewItem when add item clicked', () => {
      render(
        <ContentArea {...defaultProps} currentView="folder" displayFolders={[]} displayItems={[]} />
      );

      fireEvent.click(screen.getByText('Add Item'));

      expect(mockCallbacks.onNewItem).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Back Navigation
  // ===========================================================================

  describe('back navigation', () => {
    it('should show back button when not on home', () => {
      render(<ContentArea {...defaultProps} currentView="folder" />);

      expect(screen.getByText('Back to Overview')).toBeInTheDocument();
    });

    it('should not show back button on home view', () => {
      render(<ContentArea {...defaultProps} currentView="home" />);

      expect(screen.queryByText('Back to Overview')).not.toBeInTheDocument();
    });

    it('should not show back button when searching', () => {
      render(<ContentArea {...defaultProps} currentView="folder" searchQuery="test" />);

      expect(screen.queryByText('Back to Overview')).not.toBeInTheDocument();
    });

    it('should call onNavigate with home when back clicked', () => {
      render(<ContentArea {...defaultProps} currentView="folder" />);

      fireEvent.click(screen.getByText('Back to Overview'));

      expect(mockCallbacks.onNavigate).toHaveBeenCalledWith('home');
    });
  });

  // ===========================================================================
  // Callbacks
  // ===========================================================================

  describe('callbacks', () => {
    it('should pass onEditFolder to FolderCard', () => {
      render(<ContentArea {...defaultProps} />);

      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);

      expect(mockCallbacks.onEditFolder).toHaveBeenCalledWith(mockFolders[0]);
    });

    it('should pass onDeleteFolder to FolderCard', () => {
      render(<ContentArea {...defaultProps} />);

      const deleteButton = screen.getAllByText('Delete')[0];
      fireEvent.click(deleteButton);

      expect(mockCallbacks.onDeleteFolder).toHaveBeenCalledWith(mockFolders[0]);
    });

    it('should pass onEditItem to ItemCard', () => {
      render(<ContentArea {...defaultProps} currentView="folder" displayItems={mockItems} />);

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      expect(mockCallbacks.onEditItem).toHaveBeenCalledWith(mockItems[0]);
    });

    it('should pass onDeleteItem to ItemCard', () => {
      render(<ContentArea {...defaultProps} currentView="folder" displayItems={mockItems} />);

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(mockCallbacks.onDeleteItem).toHaveBeenCalledWith(mockItems[0]);
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should have scrollable container', () => {
      const { container } = render(<ContentArea {...defaultProps} />);

      const contentDiv = container.firstChild;
      expect(contentDiv).toHaveClass('overflow-y-auto');
    });

    it('should have flex-1 for filling space', () => {
      const { container } = render(<ContentArea {...defaultProps} />);

      const contentDiv = container.firstChild;
      expect(contentDiv).toHaveClass('flex-1');
    });
  });
});
