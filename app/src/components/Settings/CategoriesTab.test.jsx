/**
 * CategoriesTab Component Tests
 * =============================
 * Tests for the categories settings tab component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CategoriesTab from './CategoriesTab.jsx';

// Mock the db.js functions
vi.mock('../../db.js', () => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

import { createCategory, updateCategory, deleteCategory } from '../../db.js';

describe('CategoriesTab', () => {
  const mockAreas = [
    { id: 1, range_start: 10, range_end: 19, name: 'Personal' },
    { id: 2, range_start: 20, range_end: 29, name: 'Work' },
  ];

  const mockCategories = [
    {
      id: 1,
      number: 11,
      name: 'Finance',
      description: 'Financial records',
      area_id: 1,
      area_name: 'Personal',
    },
    {
      id: 2,
      number: 12,
      name: 'Health',
      description: 'Health records',
      area_id: 1,
      area_name: 'Personal',
    },
    {
      id: 3,
      number: 21,
      name: 'Projects',
      description: 'Work projects',
      area_id: 2,
      area_name: 'Work',
    },
  ];

  const mockOnDataChange = vi.fn();

  const defaultProps = {
    areas: mockAreas,
    categories: mockCategories,
    onDataChange: mockOnDataChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render Add New Category section', () => {
      render(<CategoriesTab {...defaultProps} />);

      expect(screen.getByText('Add New Category')).toBeInTheDocument();
    });

    it('should render all existing categories', () => {
      render(<CategoriesTab {...defaultProps} />);

      expect(screen.getByText('Finance')).toBeInTheDocument();
      expect(screen.getByText('Health')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    it('should render category numbers with padding', () => {
      render(<CategoriesTab {...defaultProps} />);

      expect(screen.getByText('11')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('21')).toBeInTheDocument();
    });

    it('should render category descriptions', () => {
      render(<CategoriesTab {...defaultProps} />);

      expect(screen.getByText('Financial records')).toBeInTheDocument();
      expect(screen.getByText('Health records')).toBeInTheDocument();
      expect(screen.getByText('Work projects')).toBeInTheDocument();
    });

    it('should render area names', () => {
      render(<CategoriesTab {...defaultProps} />);

      // Two categories have Personal, one has Work
      expect(screen.getAllByText('Personal').length).toBe(2);
      expect(screen.getByText('Work')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Add Category Form
  // ===========================================================================

  describe('add category form', () => {
    it('should render Number placeholder', () => {
      render(<CategoriesTab {...defaultProps} />);

      expect(screen.getByPlaceholderText('Number')).toBeInTheDocument();
    });

    it('should render area dropdown', () => {
      render(<CategoriesTab {...defaultProps} />);

      expect(screen.getByText('Select Area...')).toBeInTheDocument();
    });

    it('should render area options in dropdown', () => {
      render(<CategoriesTab {...defaultProps} />);

      expect(screen.getByText('10-19 Personal')).toBeInTheDocument();
      expect(screen.getByText('20-29 Work')).toBeInTheDocument();
    });

    it('should render Name placeholder', () => {
      render(<CategoriesTab {...defaultProps} />);

      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    });

    it('should render Description placeholder', () => {
      render(<CategoriesTab {...defaultProps} />);

      expect(screen.getByPlaceholderText('Description')).toBeInTheDocument();
    });

    it('should render Add button', () => {
      render(<CategoriesTab {...defaultProps} />);

      expect(screen.getByText('Add')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Create Category
  // ===========================================================================

  describe('create category', () => {
    it('should call createCategory with form data', () => {
      render(<CategoriesTab {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Number'), { target: { value: '13' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
      fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Travel' } });

      fireEvent.click(screen.getByText('Add'));

      expect(createCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          number: 13,
          area_id: 1,
          name: 'Travel',
        })
      );
    });

    it('should call onDataChange after successful create', () => {
      render(<CategoriesTab {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Number'), { target: { value: '13' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
      fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Travel' } });

      fireEvent.click(screen.getByText('Add'));

      expect(mockOnDataChange).toHaveBeenCalled();
    });

    it('should show error when required fields missing', () => {
      render(<CategoriesTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Add'));

      expect(screen.getByText('Number, area, and name are required')).toBeInTheDocument();
    });

    it('should clear form after successful create', () => {
      render(<CategoriesTab {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Name');
      fireEvent.change(screen.getByPlaceholderText('Number'), { target: { value: '13' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
      fireEvent.change(nameInput, { target: { value: 'Travel' } });

      fireEvent.click(screen.getByText('Add'));

      expect(nameInput.value).toBe('');
    });
  });

  // ===========================================================================
  // Edit Category
  // ===========================================================================

  describe('edit category', () => {
    // Button order in each category row: [edit, delete]
    // Add button is first (index 0), then category 1 buttons (1, 2), category 2 (3, 4), category 3 (5, 6)
    const getEditButton = (container, categoryIndex) => {
      const buttons = container.querySelectorAll('button');
      // Skip the Add button (index 0), then for each category: edit at even index, delete at odd
      return buttons[1 + categoryIndex * 2];
    };

    it('should render edit buttons for each category', () => {
      const { container } = render(<CategoriesTab {...defaultProps} />);

      // Should have Add button + 2 buttons per category (edit + delete)
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(7); // 1 Add + 3 categories * 2 buttons each
    });

    it('should enter edit mode when edit button clicked', () => {
      const { container } = render(<CategoriesTab {...defaultProps} />);

      const editButton = getEditButton(container, 0);
      fireEvent.click(editButton);

      expect(container.querySelector('svg.lucide-check')).toBeInTheDocument();
    });

    it('should show area dropdown in edit mode', () => {
      const { container } = render(<CategoriesTab {...defaultProps} />);

      const editButton = getEditButton(container, 0);
      fireEvent.click(editButton);

      // Should have select element with area options
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBeGreaterThan(1); // One for add form, one for edit
    });

    it('should call updateCategory when save clicked', () => {
      const { container } = render(<CategoriesTab {...defaultProps} />);

      const editButton = getEditButton(container, 0);
      fireEvent.click(editButton);

      const saveButton = container.querySelector('svg.lucide-check').closest('button');
      fireEvent.click(saveButton);

      expect(updateCategory).toHaveBeenCalledWith(1, expect.objectContaining({ id: 1 }));
    });

    it('should call onDataChange after successful update', () => {
      const { container } = render(<CategoriesTab {...defaultProps} />);

      const editButton = getEditButton(container, 0);
      fireEvent.click(editButton);

      const saveButton = container.querySelector('svg.lucide-check').closest('button');
      fireEvent.click(saveButton);

      expect(mockOnDataChange).toHaveBeenCalled();
    });

    it('should exit edit mode when cancel clicked', () => {
      const { container } = render(<CategoriesTab {...defaultProps} />);

      const editButton = getEditButton(container, 0);
      fireEvent.click(editButton);

      const cancelButtons = container.querySelectorAll('svg.lucide-x');
      const cancelButton = cancelButtons[cancelButtons.length - 1].closest('button');
      fireEvent.click(cancelButton);

      // Should be back to view mode - 7 buttons again (Add + 3 categories * 2)
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(7);
    });
  });

  // ===========================================================================
  // Delete Category
  // ===========================================================================

  describe('delete category', () => {
    // Button order in each category row: [edit, delete]
    // Add button is first (index 0), then category 1 buttons (1, 2), category 2 (3, 4), category 3 (5, 6)
    const getDeleteButton = (container, categoryIndex) => {
      const buttons = container.querySelectorAll('button');
      // Skip the Add button (index 0), then for each category: edit at even index, delete at odd
      return buttons[2 + categoryIndex * 2];
    };

    it('should render delete buttons for each category', () => {
      const { container } = render(<CategoriesTab {...defaultProps} />);

      // Should have Add button + 2 buttons per category (edit + delete)
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(7); // 1 Add + 3 categories * 2 buttons each
    });

    it('should show confirmation dialog when delete clicked', () => {
      const { container } = render(<CategoriesTab {...defaultProps} />);

      const deleteButton = getDeleteButton(container, 0);
      fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith('Delete this category? This cannot be undone.');
    });

    it('should call deleteCategory when confirmed', () => {
      const { container } = render(<CategoriesTab {...defaultProps} />);

      const deleteButton = getDeleteButton(container, 0);
      fireEvent.click(deleteButton);

      expect(deleteCategory).toHaveBeenCalledWith(1);
    });

    it('should not call deleteCategory when cancelled', () => {
      window.confirm.mockReturnValue(false);
      const { container } = render(<CategoriesTab {...defaultProps} />);

      const deleteButton = getDeleteButton(container, 0);
      fireEvent.click(deleteButton);

      expect(deleteCategory).not.toHaveBeenCalled();
    });

    it('should call onDataChange after successful delete', () => {
      const { container } = render(<CategoriesTab {...defaultProps} />);

      const deleteButton = getDeleteButton(container, 0);
      fireEvent.click(deleteButton);

      expect(mockOnDataChange).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('should display error message', () => {
      createCategory.mockImplementation(() => {
        throw new Error('Category error');
      });

      render(<CategoriesTab {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Number'), { target: { value: '13' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
      fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Test' } });
      fireEvent.click(screen.getByText('Add'));

      expect(screen.getByText('Category error')).toBeInTheDocument();
    });

    it('should render error dismiss button', () => {
      render(<CategoriesTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Add'));

      // Should have X button to dismiss - it's in the error div
      const errorContainer = screen.getByText('Number, area, and name are required').closest('div');
      const dismissButton = errorContainer.querySelector('button');
      expect(dismissButton).toBeInTheDocument();
    });

    it('should clear error when dismiss clicked', () => {
      render(<CategoriesTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Add'));
      expect(screen.getByText('Number, area, and name are required')).toBeInTheDocument();

      // Dismiss error - find button in error container
      const errorContainer = screen.getByText('Number, area, and name are required').closest('div');
      const dismissButton = errorContainer.querySelector('button');
      fireEvent.click(dismissButton);

      expect(screen.queryByText('Number, area, and name are required')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render glass-card containers', () => {
      const { container } = render(<CategoriesTab {...defaultProps} />);

      const glassCards = container.querySelectorAll('.glass-card');
      expect(glassCards.length).toBeGreaterThan(0);
    });

    it('should render jd-number class for category numbers', () => {
      const { container } = render(<CategoriesTab {...defaultProps} />);

      const jdNumbers = container.querySelectorAll('.jd-number');
      expect(jdNumbers.length).toBe(3);
    });
  });
});
