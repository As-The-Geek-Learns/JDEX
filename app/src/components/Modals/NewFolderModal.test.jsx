/**
 * NewFolderModal Component Tests
 * ==============================
 * Tests for the new folder creation modal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewFolderModal from './NewFolderModal.jsx';

// Mock the db.js function
vi.mock('../../db.js', () => ({
  getNextFolderNumber: vi.fn((categoryId) => ({
    folder_number: `${categoryId}.01`,
    sequence: 1,
  })),
}));

import { getNextFolderNumber } from '../../db.js';

describe('NewFolderModal', () => {
  const mockCategories = [
    { id: 1, number: 11, name: 'Finance', area_name: 'Personal' },
    { id: 2, number: 12, name: 'Health', area_name: 'Personal' },
    { id: 3, number: 21, name: 'Projects', area_name: 'Development' },
  ];

  const mockFolders = [
    { id: 1, folder_number: '11.01', name: 'Banking' },
    { id: 2, folder_number: '11.02', name: 'Taxes' },
  ];

  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    categories: mockCategories,
    folders: mockFolders,
    onSave: mockOnSave,
    preselectedCategory: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getNextFolderNumber.mockReturnValue({
      folder_number: '11.01',
      sequence: 1,
    });
  });

  // ===========================================================================
  // Visibility
  // ===========================================================================

  describe('visibility', () => {
    it('should render when isOpen is true', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('New Folder (XX.XX)')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<NewFolderModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('New Folder (XX.XX)')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Header
  // ===========================================================================

  describe('header', () => {
    it('should render title with folder icon', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('New Folder (XX.XX)')).toBeInTheDocument();
    });

    it('should render close button', () => {
      const { container } = render(<NewFolderModal {...defaultProps} />);

      const closeButton = container.querySelector('button svg.lucide-x');
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button clicked', () => {
      const { container } = render(<NewFolderModal {...defaultProps} />);

      const closeButton = container.querySelector('button svg.lucide-x').closest('button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Form Labels
  // ===========================================================================

  describe('form labels', () => {
    it('should show Category label with required indicator', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('Category *')).toBeInTheDocument();
    });

    it('should show Folder Number label', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('Folder Number')).toBeInTheDocument();
    });

    it('should show Folder Name label with required indicator', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('Folder Name *')).toBeInTheDocument();
    });

    it('should show Description label', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should show Sensitivity label', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('Sensitivity')).toBeInTheDocument();
    });

    it('should show Storage Location label', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('Storage Location')).toBeInTheDocument();
    });

    it('should show Storage Path label', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('Storage Path')).toBeInTheDocument();
    });

    it('should show Keywords label', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('Keywords (comma separated)')).toBeInTheDocument();
    });

    it('should show Notes label', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('Notes')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Category Selection
  // ===========================================================================

  describe('category selection', () => {
    it('should render category dropdown', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('Select category...')).toBeInTheDocument();
    });

    it('should group categories by area', () => {
      render(<NewFolderModal {...defaultProps} />);

      // First combobox is category select
      const selects = screen.getAllByRole('combobox');
      const categorySelect = selects[0];
      const optgroups = categorySelect.querySelectorAll('optgroup');

      expect(optgroups.length).toBe(2);
      expect(optgroups[0]).toHaveAttribute('label', 'Personal');
      expect(optgroups[1]).toHaveAttribute('label', 'Development');
    });

    it('should display category options with padded numbers', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('11 - Finance')).toBeInTheDocument();
      expect(screen.getByText('12 - Health')).toBeInTheDocument();
      expect(screen.getByText('21 - Projects')).toBeInTheDocument();
    });

    it('should update folder number when category selected', async () => {
      getNextFolderNumber.mockReturnValue({
        folder_number: '11.03',
        sequence: 3,
      });

      render(<NewFolderModal {...defaultProps} />);

      const selects = screen.getAllByRole('combobox');
      const categorySelect = selects[0];
      fireEvent.change(categorySelect, { target: { value: '1' } });

      await waitFor(() => {
        expect(getNextFolderNumber).toHaveBeenCalledWith(1);
      });
    });
  });

  // ===========================================================================
  // Preselected Category
  // ===========================================================================

  describe('preselected category', () => {
    it('should preselect category when provided', () => {
      const preselected = { id: 2, number: 12, name: 'Health' };
      render(<NewFolderModal {...defaultProps} preselectedCategory={preselected} />);

      const selects = screen.getAllByRole('combobox');
      const categorySelect = selects[0];
      expect(categorySelect.value).toBe('2');
    });

    it('should calculate folder number for preselected category', async () => {
      getNextFolderNumber.mockReturnValue({
        folder_number: '12.01',
        sequence: 1,
      });

      const preselected = { id: 2, number: 12, name: 'Health' };
      render(<NewFolderModal {...defaultProps} preselectedCategory={preselected} />);

      await waitFor(() => {
        expect(getNextFolderNumber).toHaveBeenCalledWith(2);
      });
    });
  });

  // ===========================================================================
  // Sensitivity Options
  // ===========================================================================

  describe('sensitivity options', () => {
    it('should have Standard option', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Standard (iCloud)' })).toBeInTheDocument();
    });

    it('should have Sensitive option', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Sensitive (ProtonDrive)' })).toBeInTheDocument();
    });

    it('should have Work option', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Work (Work OneDrive)' })).toBeInTheDocument();
    });

    it('should default to Standard sensitivity', () => {
      render(<NewFolderModal {...defaultProps} />);

      const sensitivitySelect = screen.getByDisplayValue('Standard (iCloud)');
      expect(sensitivitySelect).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Editing
  // ===========================================================================

  describe('form editing', () => {
    it('should update name when typed', () => {
      render(<NewFolderModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('e.g., Script Documentation');
      fireEvent.change(nameInput, { target: { value: 'New Folder Name' } });

      expect(screen.getByDisplayValue('New Folder Name')).toBeInTheDocument();
    });

    it('should update description when typed', () => {
      render(<NewFolderModal {...defaultProps} />);

      const descInput = screen.getByPlaceholderText('What belongs in this folder?');
      fireEvent.change(descInput, { target: { value: 'Test description' } });

      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    });

    it('should update location when typed', () => {
      render(<NewFolderModal {...defaultProps} />);

      const locationInput = screen.getByPlaceholderText('e.g., iCloud, Google Drive');
      fireEvent.change(locationInput, { target: { value: 'Dropbox' } });

      expect(screen.getByDisplayValue('Dropbox')).toBeInTheDocument();
    });

    it('should update storage path when typed', () => {
      render(<NewFolderModal {...defaultProps} />);

      const pathInput = screen.getByPlaceholderText('Full path to folder');
      fireEvent.change(pathInput, { target: { value: '/Users/test/Documents' } });

      expect(screen.getByDisplayValue('/Users/test/Documents')).toBeInTheDocument();
    });

    it('should update keywords when typed', () => {
      render(<NewFolderModal {...defaultProps} />);

      const keywordsInput = screen.getByPlaceholderText('keyword1, keyword2, keyword3');
      fireEvent.change(keywordsInput, { target: { value: 'finance, budget' } });

      expect(screen.getByDisplayValue('finance, budget')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Submission
  // ===========================================================================

  describe('form submission', () => {
    it('should render Cancel button', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render Create Folder button', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('Create Folder')).toBeInTheDocument();
    });

    it('should call onClose when Cancel clicked', () => {
      render(<NewFolderModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onSave with form data on submit', async () => {
      getNextFolderNumber.mockReturnValue({
        folder_number: '11.01',
        sequence: 1,
      });

      render(<NewFolderModal {...defaultProps} />);

      // Select category (first combobox)
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: '1' } });

      // Fill name
      const nameInput = screen.getByPlaceholderText('e.g., Script Documentation');
      fireEvent.change(nameInput, { target: { value: 'Test Folder' } });

      // Wait for folder number calculation
      await waitFor(() => {
        expect(getNextFolderNumber).toHaveBeenCalled();
      });

      // Submit
      fireEvent.click(screen.getByText('Create Folder'));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Folder',
          category_id: 1,
        })
      );
    });

    it('should call onClose after successful save', async () => {
      getNextFolderNumber.mockReturnValue({
        folder_number: '11.01',
        sequence: 1,
      });

      render(<NewFolderModal {...defaultProps} />);

      // Select category (first combobox) and fill name
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: '1' } });
      fireEvent.change(screen.getByPlaceholderText('e.g., Script Documentation'), {
        target: { value: 'Test' },
      });

      await waitFor(() => {
        expect(getNextFolderNumber).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText('Create Folder'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Folder Number Display
  // ===========================================================================

  describe('folder number display', () => {
    it('should have a disabled folder number input', () => {
      const { container } = render(<NewFolderModal {...defaultProps} />);

      // Find the disabled input with jd-number class
      const disabledInputs = container.querySelectorAll('input:disabled');
      expect(disabledInputs.length).toBeGreaterThan(0);
    });

    it('should show folder number with jd-number class', () => {
      const { container } = render(<NewFolderModal {...defaultProps} />);

      const jdNumber = container.querySelector('.jd-number');
      expect(jdNumber).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render modal backdrop', () => {
      const { container } = render(<NewFolderModal {...defaultProps} />);

      expect(container.querySelector('.modal-backdrop')).toBeInTheDocument();
    });

    it('should render glass-card container', () => {
      const { container } = render(<NewFolderModal {...defaultProps} />);

      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });

    it('should render form element', () => {
      const { container } = render(<NewFolderModal {...defaultProps} />);

      expect(container.querySelector('form')).toBeInTheDocument();
    });

    it('should have inheritance hint text', () => {
      render(<NewFolderModal {...defaultProps} />);

      expect(screen.getByText('Items can inherit this or override')).toBeInTheDocument();
    });
  });
});
