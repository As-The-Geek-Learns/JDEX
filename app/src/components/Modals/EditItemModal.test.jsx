/**
 * EditItemModal Component Tests
 * =============================
 * Tests for the edit item modal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EditItemModal from './EditItemModal.jsx';

describe('EditItemModal', () => {
  const mockItem = {
    id: 1,
    item_number: '11.01.001',
    name: 'Bank Statement Q1',
    description: 'First quarter bank statement',
    file_type: 'pdf',
    sensitivity: 'standard',
    location: 'iCloud',
    storage_path: '/Finance/Banking/statement_q1.pdf',
    file_size: 2048,
    keywords: 'bank, statement, q1',
    notes: 'Review annually',
  };

  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const defaultProps = {
    item: mockItem,
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Visibility
  // ===========================================================================

  describe('visibility', () => {
    it('should render when isOpen is true and item provided', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByText('Edit Item 11.01.001')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<EditItemModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Edit Item 11.01.001')).not.toBeInTheDocument();
    });

    it('should not render when item is null', () => {
      render(<EditItemModal {...defaultProps} item={null} />);

      expect(screen.queryByText('Edit Item')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Header
  // ===========================================================================

  describe('header', () => {
    it('should render title with item number', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByText('Edit Item 11.01.001')).toBeInTheDocument();
    });

    it('should render close button', () => {
      const { container } = render(<EditItemModal {...defaultProps} />);

      const closeButton = container.querySelector('button svg.lucide-x');
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button clicked', () => {
      const { container } = render(<EditItemModal {...defaultProps} />);

      const closeButton = container.querySelector('button svg.lucide-x').closest('button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Form Fields
  // ===========================================================================

  describe('form fields', () => {
    it('should display item number (disabled)', () => {
      render(<EditItemModal {...defaultProps} />);

      const numberInput = screen.getByDisplayValue('11.01.001');
      expect(numberInput).toBeDisabled();
    });

    it('should display item name', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByDisplayValue('Bank Statement Q1')).toBeInTheDocument();
    });

    it('should display description', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByDisplayValue('First quarter bank statement')).toBeInTheDocument();
    });

    it('should display file type', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByDisplayValue('pdf')).toBeInTheDocument();
    });

    it('should display sensitivity select', () => {
      render(<EditItemModal {...defaultProps} />);

      const select = screen.getByDisplayValue('Standard');
      expect(select).toBeInTheDocument();
    });

    it('should display location', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByDisplayValue('iCloud')).toBeInTheDocument();
    });

    it('should display storage path', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByDisplayValue('/Finance/Banking/statement_q1.pdf')).toBeInTheDocument();
    });

    it('should display file size', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByDisplayValue('2048')).toBeInTheDocument();
    });

    it('should display keywords', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByDisplayValue('bank, statement, q1')).toBeInTheDocument();
    });

    it('should display notes', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByDisplayValue('Review annually')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Labels
  // ===========================================================================

  describe('form labels', () => {
    it('should show Item Number label', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByText('Item Number')).toBeInTheDocument();
    });

    it('should show Name label with required indicator', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByText('Name *')).toBeInTheDocument();
    });

    it('should show File Type label', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByText('File Type')).toBeInTheDocument();
    });

    it('should show Description label', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should show Sensitivity label', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByText('Sensitivity')).toBeInTheDocument();
    });

    it('should show Location label', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('should show Storage Path label', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByText('Storage Path')).toBeInTheDocument();
    });

    it('should show File Size label', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByText('File Size')).toBeInTheDocument();
    });

    it('should show Keywords label', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByText('Keywords')).toBeInTheDocument();
    });

    it('should show Notes label', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByText('Notes')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Editing
  // ===========================================================================

  describe('form editing', () => {
    it('should update name when typed', () => {
      render(<EditItemModal {...defaultProps} />);

      const nameInput = screen.getByDisplayValue('Bank Statement Q1');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      expect(screen.getByDisplayValue('Updated Name')).toBeInTheDocument();
    });

    it('should update description when typed', () => {
      render(<EditItemModal {...defaultProps} />);

      const descInput = screen.getByDisplayValue('First quarter bank statement');
      fireEvent.change(descInput, { target: { value: 'New description' } });

      expect(screen.getByDisplayValue('New description')).toBeInTheDocument();
    });

    it('should update file type when typed', () => {
      render(<EditItemModal {...defaultProps} />);

      const fileTypeInput = screen.getByDisplayValue('pdf');
      fireEvent.change(fileTypeInput, { target: { value: 'docx' } });

      expect(screen.getByDisplayValue('docx')).toBeInTheDocument();
    });

    it('should update sensitivity when changed', () => {
      render(<EditItemModal {...defaultProps} />);

      const select = screen.getByDisplayValue('Standard');
      fireEvent.change(select, { target: { value: 'sensitive' } });

      expect(screen.getByDisplayValue('Sensitive')).toBeInTheDocument();
    });

    it('should update location when typed', () => {
      render(<EditItemModal {...defaultProps} />);

      const locationInput = screen.getByDisplayValue('iCloud');
      fireEvent.change(locationInput, { target: { value: 'Dropbox' } });

      expect(screen.getByDisplayValue('Dropbox')).toBeInTheDocument();
    });

    it('should update storage path when typed', () => {
      render(<EditItemModal {...defaultProps} />);

      const pathInput = screen.getByDisplayValue('/Finance/Banking/statement_q1.pdf');
      fireEvent.change(pathInput, { target: { value: '/new/path.pdf' } });

      expect(screen.getByDisplayValue('/new/path.pdf')).toBeInTheDocument();
    });

    it('should update file size when typed', () => {
      render(<EditItemModal {...defaultProps} />);

      const sizeInput = screen.getByDisplayValue('2048');
      fireEvent.change(sizeInput, { target: { value: '4096' } });

      expect(screen.getByDisplayValue('4096')).toBeInTheDocument();
    });

    it('should update keywords when typed', () => {
      render(<EditItemModal {...defaultProps} />);

      const keywordsInput = screen.getByDisplayValue('bank, statement, q1');
      fireEvent.change(keywordsInput, { target: { value: 'new, keywords' } });

      expect(screen.getByDisplayValue('new, keywords')).toBeInTheDocument();
    });

    it('should update notes when typed', () => {
      render(<EditItemModal {...defaultProps} />);

      const notesInput = screen.getByDisplayValue('Review annually');
      fireEvent.change(notesInput, { target: { value: 'Updated notes' } });

      expect(screen.getByDisplayValue('Updated notes')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Sensitivity Options
  // ===========================================================================

  describe('sensitivity options', () => {
    it('should have Inherit from Folder option', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Inherit from Folder' })).toBeInTheDocument();
    });

    it('should have Standard option', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Standard' })).toBeInTheDocument();
    });

    it('should have Sensitive option', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Sensitive' })).toBeInTheDocument();
    });

    it('should have Work option', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Actions
  // ===========================================================================

  describe('actions', () => {
    it('should render Cancel button', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render Save Changes button', () => {
      render(<EditItemModal {...defaultProps} />);

      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should call onClose when Cancel clicked', () => {
      render(<EditItemModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onSave with form data when submitted', () => {
      render(<EditItemModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Save Changes'));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          item_number: '11.01.001',
          name: 'Bank Statement Q1',
        })
      );
    });

    it('should convert file_size to integer on save', () => {
      render(<EditItemModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Save Changes'));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          file_size: 2048,
        })
      );
    });

    it('should set file_size to null when empty', () => {
      const itemNoSize = { ...mockItem, file_size: '' };
      render(<EditItemModal {...defaultProps} item={itemNoSize} />);

      fireEvent.click(screen.getByText('Save Changes'));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          file_size: null,
        })
      );
    });

    it('should call onClose after save', () => {
      render(<EditItemModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Save Changes'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Empty Item Values
  // ===========================================================================

  describe('empty item values', () => {
    it('should handle item with empty optional fields', () => {
      const emptyItem = {
        id: 2,
        item_number: '12.01.001',
        name: 'Test Item',
      };

      render(<EditItemModal {...defaultProps} item={emptyItem} />);

      expect(screen.getByDisplayValue('Test Item')).toBeInTheDocument();
    });

    it('should default to inherit sensitivity when not provided', () => {
      const itemNoSensitivity = {
        id: 2,
        item_number: '12.01.001',
        name: 'Test Item',
        sensitivity: null,
      };

      render(<EditItemModal {...defaultProps} item={itemNoSensitivity} />);

      // Should default to inherit
      const select = screen.getByRole('combobox');
      expect(select.value).toBe('inherit');
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render modal backdrop', () => {
      const { container } = render(<EditItemModal {...defaultProps} />);

      expect(container.querySelector('.modal-backdrop')).toBeInTheDocument();
    });

    it('should render glass-card container', () => {
      const { container } = render(<EditItemModal {...defaultProps} />);

      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });

    it('should render form element', () => {
      const { container } = render(<EditItemModal {...defaultProps} />);

      expect(container.querySelector('form')).toBeInTheDocument();
    });

    it('should have jd-number class on item number field', () => {
      const { container } = render(<EditItemModal {...defaultProps} />);

      expect(container.querySelector('.jd-number')).toBeInTheDocument();
    });
  });
});
