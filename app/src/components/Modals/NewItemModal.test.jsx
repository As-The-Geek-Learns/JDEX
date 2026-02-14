/**
 * NewItemModal Component Tests
 * ============================
 * Tests for the new item creation modal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewItemModal from './NewItemModal.jsx';

// Mock the db.js function
vi.mock('../../db.js', () => ({
  getNextItemNumber: vi.fn((folderId) => ({
    item_number: `11.0${folderId}.001`,
    sequence: 1,
  })),
}));

import { getNextItemNumber } from '../../db.js';

describe('NewItemModal', () => {
  const mockFolders = [
    {
      id: 1,
      folder_number: '11.01',
      name: 'Banking',
      category_number: 11,
      category_name: 'Finance',
    },
    { id: 2, folder_number: '11.02', name: 'Taxes', category_number: 11, category_name: 'Finance' },
    {
      id: 3,
      folder_number: '21.01',
      name: 'Active',
      category_number: 21,
      category_name: 'Projects',
    },
  ];

  const mockItems = [
    { id: 1, item_number: '11.01.001', name: 'Statement' },
    { id: 2, item_number: '11.01.002', name: 'Receipt' },
  ];

  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    folders: mockFolders,
    items: mockItems,
    onSave: mockOnSave,
    preselectedFolder: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getNextItemNumber.mockReturnValue({
      item_number: '11.01.003',
      sequence: 3,
    });
  });

  // ===========================================================================
  // Visibility
  // ===========================================================================

  describe('visibility', () => {
    it('should render when isOpen is true', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('New Item (XX.XX.XX)')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<NewItemModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('New Item (XX.XX.XX)')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Header
  // ===========================================================================

  describe('header', () => {
    it('should render title with file icon', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('New Item (XX.XX.XX)')).toBeInTheDocument();
    });

    it('should render close button', () => {
      const { container } = render(<NewItemModal {...defaultProps} />);

      const closeButton = container.querySelector('button svg.lucide-x');
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button clicked', () => {
      const { container } = render(<NewItemModal {...defaultProps} />);

      const closeButton = container.querySelector('button svg.lucide-x').closest('button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Form Labels
  // ===========================================================================

  describe('form labels', () => {
    it('should show Folder Container label with required indicator', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('Folder Container *')).toBeInTheDocument();
    });

    it('should show Item Number label', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('Item Number')).toBeInTheDocument();
    });

    it('should show Item Name label with required indicator', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('Item Name *')).toBeInTheDocument();
    });

    it('should show File Type label', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('File Type')).toBeInTheDocument();
    });

    it('should show Description label', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should show Sensitivity label', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('Sensitivity')).toBeInTheDocument();
    });

    it('should show Storage Location label', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('Storage Location')).toBeInTheDocument();
    });

    it('should show Storage Path label', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('Storage Path')).toBeInTheDocument();
    });

    it('should show File Size label', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('File Size (bytes)')).toBeInTheDocument();
    });

    it('should show Keywords label', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('Keywords')).toBeInTheDocument();
    });

    it('should show Notes label', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('Notes')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Folder Selection
  // ===========================================================================

  describe('folder selection', () => {
    it('should render folder dropdown', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('Select folder...')).toBeInTheDocument();
    });

    it('should group folders by category', () => {
      render(<NewItemModal {...defaultProps} />);

      // First combobox is folder select
      const selects = screen.getAllByRole('combobox');
      const folderSelect = selects[0];
      const optgroups = folderSelect.querySelectorAll('optgroup');

      expect(optgroups.length).toBe(2);
      expect(optgroups[0]).toHaveAttribute('label', '11 Finance');
      expect(optgroups[1]).toHaveAttribute('label', '21 Projects');
    });

    it('should display folder options with numbers', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('11.01 - Banking')).toBeInTheDocument();
      expect(screen.getByText('11.02 - Taxes')).toBeInTheDocument();
      expect(screen.getByText('21.01 - Active')).toBeInTheDocument();
    });

    it('should update item number when folder selected', async () => {
      getNextItemNumber.mockReturnValue({
        item_number: '11.01.003',
        sequence: 3,
      });

      render(<NewItemModal {...defaultProps} />);

      // First combobox is folder select
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: '1' } });

      await waitFor(() => {
        expect(getNextItemNumber).toHaveBeenCalledWith(1);
      });
    });
  });

  // ===========================================================================
  // Preselected Folder
  // ===========================================================================

  describe('preselected folder', () => {
    it('should preselect folder when provided', () => {
      const preselected = { id: 2, folder_number: '11.02', name: 'Taxes' };
      render(<NewItemModal {...defaultProps} preselectedFolder={preselected} />);

      // First combobox is folder select
      const selects = screen.getAllByRole('combobox');
      expect(selects[0].value).toBe('2');
    });

    it('should calculate item number for preselected folder', async () => {
      getNextItemNumber.mockReturnValue({
        item_number: '11.02.001',
        sequence: 1,
      });

      const preselected = { id: 2, folder_number: '11.02', name: 'Taxes' };
      render(<NewItemModal {...defaultProps} preselectedFolder={preselected} />);

      await waitFor(() => {
        expect(getNextItemNumber).toHaveBeenCalledWith(2);
      });
    });
  });

  // ===========================================================================
  // Sensitivity Options
  // ===========================================================================

  describe('sensitivity options', () => {
    it('should have Inherit from Folder option', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Inherit from Folder' })).toBeInTheDocument();
    });

    it('should have Standard option', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Standard (iCloud)' })).toBeInTheDocument();
    });

    it('should have Sensitive option', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Sensitive (ProtonDrive)' })).toBeInTheDocument();
    });

    it('should have Work option', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Work (Work OneDrive)' })).toBeInTheDocument();
    });

    it('should default to Inherit from Folder sensitivity', () => {
      render(<NewItemModal {...defaultProps} />);

      const sensitivitySelect = screen.getByDisplayValue('Inherit from Folder');
      expect(sensitivitySelect).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Editing
  // ===========================================================================

  describe('form editing', () => {
    it('should update name when typed', () => {
      render(<NewItemModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('e.g., README.md');
      fireEvent.change(nameInput, { target: { value: 'New Item Name' } });

      expect(screen.getByDisplayValue('New Item Name')).toBeInTheDocument();
    });

    it('should update file type when typed', () => {
      render(<NewItemModal {...defaultProps} />);

      const fileTypeInput = screen.getByPlaceholderText('e.g., pdf, docx, folder, url');
      fireEvent.change(fileTypeInput, { target: { value: 'pdf' } });

      expect(screen.getByDisplayValue('pdf')).toBeInTheDocument();
    });

    it('should update description when typed', () => {
      render(<NewItemModal {...defaultProps} />);

      const descInput = screen.getByPlaceholderText('What is this item?');
      fireEvent.change(descInput, { target: { value: 'Test description' } });

      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    });

    it('should update location when typed', () => {
      render(<NewItemModal {...defaultProps} />);

      const locationInput = screen.getByPlaceholderText('Leave blank to inherit from folder');
      fireEvent.change(locationInput, { target: { value: 'Custom Location' } });

      expect(screen.getByDisplayValue('Custom Location')).toBeInTheDocument();
    });

    it('should update storage path when typed', () => {
      render(<NewItemModal {...defaultProps} />);

      const pathInput = screen.getByPlaceholderText('Full path to file');
      fireEvent.change(pathInput, { target: { value: '/Users/test/doc.pdf' } });

      expect(screen.getByDisplayValue('/Users/test/doc.pdf')).toBeInTheDocument();
    });

    it('should update file size when typed', () => {
      render(<NewItemModal {...defaultProps} />);

      const sizeInput = screen.getByPlaceholderText('Optional');
      fireEvent.change(sizeInput, { target: { value: '1024' } });

      expect(screen.getByDisplayValue('1024')).toBeInTheDocument();
    });

    it('should update keywords when typed', () => {
      render(<NewItemModal {...defaultProps} />);

      const keywordsInput = screen.getByPlaceholderText('keyword1, keyword2, keyword3');
      fireEvent.change(keywordsInput, { target: { value: 'doc, important' } });

      expect(screen.getByDisplayValue('doc, important')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Submission
  // ===========================================================================

  describe('form submission', () => {
    it('should render Cancel button', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render Create Item button', () => {
      render(<NewItemModal {...defaultProps} />);

      expect(screen.getByText('Create Item')).toBeInTheDocument();
    });

    it('should call onClose when Cancel clicked', () => {
      render(<NewItemModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onSave with form data on submit', async () => {
      getNextItemNumber.mockReturnValue({
        item_number: '11.01.003',
        sequence: 3,
      });

      render(<NewItemModal {...defaultProps} />);

      // Select folder (first combobox)
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: '1' } });

      // Fill name
      const nameInput = screen.getByPlaceholderText('e.g., README.md');
      fireEvent.change(nameInput, { target: { value: 'Test Item' } });

      // Wait for item number calculation
      await waitFor(() => {
        expect(getNextItemNumber).toHaveBeenCalled();
      });

      // Submit
      fireEvent.click(screen.getByText('Create Item'));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Item',
          folder_id: 1,
        })
      );
    });

    it('should convert file_size to integer on submit', async () => {
      getNextItemNumber.mockReturnValue({
        item_number: '11.01.003',
        sequence: 3,
      });

      render(<NewItemModal {...defaultProps} />);

      // Select folder (first combobox) and fill name
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: '1' } });
      fireEvent.change(screen.getByPlaceholderText('e.g., README.md'), {
        target: { value: 'Test' },
      });
      fireEvent.change(screen.getByPlaceholderText('Optional'), { target: { value: '2048' } });

      await waitFor(() => {
        expect(getNextItemNumber).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText('Create Item'));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          file_size: 2048,
        })
      );
    });

    it('should set file_size to null when empty', async () => {
      getNextItemNumber.mockReturnValue({
        item_number: '11.01.003',
        sequence: 3,
      });

      render(<NewItemModal {...defaultProps} />);

      // Select folder (first combobox) and fill name
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: '1' } });
      fireEvent.change(screen.getByPlaceholderText('e.g., README.md'), {
        target: { value: 'Test' },
      });

      await waitFor(() => {
        expect(getNextItemNumber).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText('Create Item'));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          file_size: null,
        })
      );
    });

    it('should call onClose after successful save', async () => {
      getNextItemNumber.mockReturnValue({
        item_number: '11.01.003',
        sequence: 3,
      });

      render(<NewItemModal {...defaultProps} />);

      // Select folder (first combobox) and fill name
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: '1' } });
      fireEvent.change(screen.getByPlaceholderText('e.g., README.md'), {
        target: { value: 'Test' },
      });

      await waitFor(() => {
        expect(getNextItemNumber).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText('Create Item'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Item Number Display
  // ===========================================================================

  describe('item number display', () => {
    it('should disable item number input', () => {
      const { container } = render(<NewItemModal {...defaultProps} />);

      const disabledInputs = container.querySelectorAll('input:disabled');
      expect(disabledInputs.length).toBeGreaterThan(0);
    });

    it('should show item number with jd-number class', () => {
      const { container } = render(<NewItemModal {...defaultProps} />);

      const jdNumber = container.querySelector('.jd-number');
      expect(jdNumber).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render modal backdrop', () => {
      const { container } = render(<NewItemModal {...defaultProps} />);

      expect(container.querySelector('.modal-backdrop')).toBeInTheDocument();
    });

    it('should render glass-card container', () => {
      const { container } = render(<NewItemModal {...defaultProps} />);

      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });

    it('should render form element', () => {
      const { container } = render(<NewItemModal {...defaultProps} />);

      expect(container.querySelector('form')).toBeInTheDocument();
    });
  });
});
