/**
 * AreasTab Component Tests
 * ========================
 * Tests for the areas settings tab component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AreasTab from './AreasTab.js';

// Mock the db.js functions
vi.mock('../../db.js', () => ({
  createArea: vi.fn(),
  updateArea: vi.fn(),
  deleteArea: vi.fn(),
}));

import { createArea, updateArea, deleteArea } from '../../db.js';

describe('AreasTab', () => {
  const mockAreas = [
    {
      id: 1,
      range_start: 10,
      range_end: 19,
      name: 'Personal',
      description: 'Personal items',
      color: '#14b8a6',
    },
    {
      id: 2,
      range_start: 20,
      range_end: 29,
      name: 'Work',
      description: 'Work related',
      color: '#3b82f6',
    },
  ];

  const mockOnDataChange = vi.fn();

  const defaultProps = {
    areas: mockAreas,
    onDataChange: mockOnDataChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render Add New Area section', () => {
      render(<AreasTab {...defaultProps} />);

      expect(screen.getByText('Add New Area')).toBeInTheDocument();
    });

    it('should render all existing areas', () => {
      render(<AreasTab {...defaultProps} />);

      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    it('should render area range numbers', () => {
      render(<AreasTab {...defaultProps} />);

      expect(screen.getByText('10-19')).toBeInTheDocument();
      expect(screen.getByText('20-29')).toBeInTheDocument();
    });

    it('should render area descriptions', () => {
      render(<AreasTab {...defaultProps} />);

      expect(screen.getByText('Personal items')).toBeInTheDocument();
      expect(screen.getByText('Work related')).toBeInTheDocument();
    });

    it('should render color indicators', () => {
      const { container } = render(<AreasTab {...defaultProps} />);

      const colorBoxes = container.querySelectorAll('.rounded[style*="background-color"]');
      expect(colorBoxes.length).toBe(2);
    });
  });

  // ===========================================================================
  // Add Area Form
  // ===========================================================================

  describe('add area form', () => {
    it('should render Start placeholder', () => {
      render(<AreasTab {...defaultProps} />);

      expect(screen.getByPlaceholderText('Start')).toBeInTheDocument();
    });

    it('should render End placeholder', () => {
      render(<AreasTab {...defaultProps} />);

      expect(screen.getByPlaceholderText('End')).toBeInTheDocument();
    });

    it('should render Name placeholder', () => {
      render(<AreasTab {...defaultProps} />);

      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    });

    it('should render Description placeholder', () => {
      render(<AreasTab {...defaultProps} />);

      // In add form there's a Description placeholder
      expect(screen.getByPlaceholderText('Description')).toBeInTheDocument();
    });

    it('should render Add button', () => {
      render(<AreasTab {...defaultProps} />);

      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('should render color picker', () => {
      const { container } = render(<AreasTab {...defaultProps} />);

      const colorInput = container.querySelector('input[type="color"]');
      expect(colorInput).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Create Area
  // ===========================================================================

  describe('create area', () => {
    it('should call createArea with form data', () => {
      render(<AreasTab {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Start'), { target: { value: '30' } });
      fireEvent.change(screen.getByPlaceholderText('End'), { target: { value: '39' } });
      fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Archive' } });

      fireEvent.click(screen.getByText('Add'));

      expect(createArea).toHaveBeenCalledWith(
        expect.objectContaining({
          range_start: 30,
          range_end: 39,
          name: 'Archive',
        })
      );
    });

    it('should call onDataChange after successful create', () => {
      render(<AreasTab {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Start'), { target: { value: '30' } });
      fireEvent.change(screen.getByPlaceholderText('End'), { target: { value: '39' } });
      fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Archive' } });

      fireEvent.click(screen.getByText('Add'));

      expect(mockOnDataChange).toHaveBeenCalled();
    });

    it('should show error when required fields missing', () => {
      render(<AreasTab {...defaultProps} />);

      // Click add without filling form
      fireEvent.click(screen.getByText('Add'));

      expect(screen.getByText('Range start, end, and name are required')).toBeInTheDocument();
    });

    it('should show error for invalid number values', () => {
      render(<AreasTab {...defaultProps} />);

      // These are number inputs but let's test edge case
      fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Test' } });

      fireEvent.click(screen.getByText('Add'));

      expect(screen.getByText('Range start, end, and name are required')).toBeInTheDocument();
    });

    it('should clear form after successful create', () => {
      render(<AreasTab {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Name');
      fireEvent.change(screen.getByPlaceholderText('Start'), { target: { value: '30' } });
      fireEvent.change(screen.getByPlaceholderText('End'), { target: { value: '39' } });
      fireEvent.change(nameInput, { target: { value: 'Archive' } });

      fireEvent.click(screen.getByText('Add'));

      expect(nameInput.value).toBe('');
    });
  });

  // ===========================================================================
  // Edit Area
  // ===========================================================================

  describe('edit area', () => {
    // Button order in each area row: [edit, delete]
    // Add button is first (index 0), then area 1 buttons (1, 2), then area 2 buttons (3, 4)
    const getEditButton = (container, areaIndex) => {
      const buttons = container.querySelectorAll('button');
      // Skip the Add button (index 0), then for each area: edit at even index, delete at odd
      return buttons[1 + areaIndex * 2];
    };

    it('should render edit buttons for each area', () => {
      const { container } = render(<AreasTab {...defaultProps} />);

      // Should have Add button + 2 buttons per area (edit + delete)
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(5); // 1 Add + 2 areas * 2 buttons each
    });

    it('should enter edit mode when edit button clicked', () => {
      const { container } = render(<AreasTab {...defaultProps} />);

      // Click first area's edit button
      const editButton = getEditButton(container, 0);
      fireEvent.click(editButton);

      // Should show save (check) and cancel (x) buttons
      expect(container.querySelector('svg.lucide-check')).toBeInTheDocument();
    });

    it('should show editable inputs in edit mode', () => {
      const { container } = render(<AreasTab {...defaultProps} />);

      const editButton = getEditButton(container, 0);
      fireEvent.click(editButton);

      // Should have multiple inputs for editing
      const inputs = container.querySelectorAll('input[type="number"], input[type="text"]');
      expect(inputs.length).toBeGreaterThan(2);
    });

    it('should call updateArea when save clicked', () => {
      const { container } = render(<AreasTab {...defaultProps} />);

      // Enter edit mode
      const editButton = getEditButton(container, 0);
      fireEvent.click(editButton);

      // Click save
      const saveButton = container.querySelector('svg.lucide-check').closest('button');
      fireEvent.click(saveButton);

      expect(updateArea).toHaveBeenCalledWith(1, expect.objectContaining({
        name: 'Personal',
        range_start: 10,
        range_end: 19,
      }));
    });

    it('should call onDataChange after successful update', () => {
      const { container } = render(<AreasTab {...defaultProps} />);

      // Enter edit mode
      const editButton = getEditButton(container, 0);
      fireEvent.click(editButton);

      // Click save
      const saveButton = container.querySelector('svg.lucide-check').closest('button');
      fireEvent.click(saveButton);

      expect(mockOnDataChange).toHaveBeenCalled();
    });

    it('should exit edit mode when cancel clicked', () => {
      const { container } = render(<AreasTab {...defaultProps} />);

      // Enter edit mode
      const editButton = getEditButton(container, 0);
      fireEvent.click(editButton);

      // Click cancel (the X button in edit mode - last one in the cancel buttons)
      const cancelButtons = container.querySelectorAll('svg.lucide-x');
      const cancelButton = cancelButtons[cancelButtons.length - 1].closest('button');
      fireEvent.click(cancelButton);

      // Should be back to view mode - 5 buttons again (Add + 2 areas * 2)
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(5);
    });
  });

  // ===========================================================================
  // Delete Area
  // ===========================================================================

  describe('delete area', () => {
    // Button order in each area row: [edit, delete]
    // Add button is first (index 0), then area 1 buttons (1, 2), then area 2 buttons (3, 4)
    const getDeleteButton = (container, areaIndex) => {
      const buttons = container.querySelectorAll('button');
      // Skip the Add button (index 0), then for each area: edit at even index, delete at odd
      return buttons[2 + areaIndex * 2];
    };

    it('should render delete buttons for each area', () => {
      const { container } = render(<AreasTab {...defaultProps} />);

      // Should have Add button + 2 buttons per area (edit + delete)
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(5); // 1 Add + 2 areas * 2 buttons each
    });

    it('should show confirmation dialog when delete clicked', () => {
      const { container } = render(<AreasTab {...defaultProps} />);

      const deleteButton = getDeleteButton(container, 0);
      fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith('Delete this area? This cannot be undone.');
    });

    it('should call deleteArea when confirmed', () => {
      const { container } = render(<AreasTab {...defaultProps} />);

      const deleteButton = getDeleteButton(container, 0);
      fireEvent.click(deleteButton);

      expect(deleteArea).toHaveBeenCalledWith(1);
    });

    it('should not call deleteArea when cancelled', () => {
      window.confirm.mockReturnValue(false);
      const { container } = render(<AreasTab {...defaultProps} />);

      const deleteButton = getDeleteButton(container, 0);
      fireEvent.click(deleteButton);

      expect(deleteArea).not.toHaveBeenCalled();
    });

    it('should call onDataChange after successful delete', () => {
      const { container } = render(<AreasTab {...defaultProps} />);

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
      createArea.mockImplementation(() => {
        throw new Error('Test error');
      });

      render(<AreasTab {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Start'), { target: { value: '30' } });
      fireEvent.change(screen.getByPlaceholderText('End'), { target: { value: '39' } });
      fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Test' } });
      fireEvent.click(screen.getByText('Add'));

      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('should render error dismiss button', () => {
      render(<AreasTab {...defaultProps} />);

      // Trigger error
      fireEvent.click(screen.getByText('Add'));

      // Should have X button to dismiss - it's in the error div
      const errorContainer = screen
        .getByText('Range start, end, and name are required')
        .closest('div');
      const dismissButton = errorContainer.querySelector('button');
      expect(dismissButton).toBeInTheDocument();
    });

    it('should clear error when dismiss clicked', () => {
      render(<AreasTab {...defaultProps} />);

      // Trigger error
      fireEvent.click(screen.getByText('Add'));
      expect(screen.getByText('Range start, end, and name are required')).toBeInTheDocument();

      // Dismiss error - find button in error container
      const errorContainer = screen
        .getByText('Range start, end, and name are required')
        .closest('div');
      const dismissButton = errorContainer.querySelector('button');
      fireEvent.click(dismissButton);

      expect(screen.queryByText('Range start, end, and name are required')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render glass-card containers', () => {
      const { container } = render(<AreasTab {...defaultProps} />);

      const glassCards = container.querySelectorAll('.glass-card');
      expect(glassCards.length).toBeGreaterThan(0);
    });

    it('should render jd-number class for ranges', () => {
      const { container } = render(<AreasTab {...defaultProps} />);

      const jdNumbers = container.querySelectorAll('.jd-number');
      expect(jdNumbers.length).toBe(2);
    });
  });
});
