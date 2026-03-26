/**
 * EditFolderModal Component Tests
 * ================================
 * Tests for the edit folder modal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EditFolderModal from './EditFolderModal.jsx';

describe('EditFolderModal', () => {
  const mockFolder = {
    id: 1,
    folder_number: '11.01',
    name: 'Client Invoices',
    description: 'All client invoice documents',
    sensitivity: 'standard',
    location: 'Local Drive',
    storage_path: '/Finance/Invoices',
    keywords: 'invoice, client',
    notes: 'Review monthly',
  };

  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const defaultProps = {
    folder: mockFolder,
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
    it('should render when isOpen is true and folder provided', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByText('Edit Folder 11.01')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<EditFolderModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Edit Folder 11.01')).not.toBeInTheDocument();
    });

    it('should not render when folder is null', () => {
      render(<EditFolderModal {...defaultProps} folder={null} />);

      expect(screen.queryByText('Edit Folder')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Fields
  // ===========================================================================

  describe('form fields', () => {
    it('should display folder number (disabled)', () => {
      render(<EditFolderModal {...defaultProps} />);

      const numberInput = screen.getByDisplayValue('11.01');
      expect(numberInput).toBeDisabled();
    });

    it('should display folder name', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByDisplayValue('Client Invoices')).toBeInTheDocument();
    });

    it('should display description', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByDisplayValue('All client invoice documents')).toBeInTheDocument();
    });

    it('should display sensitivity select', () => {
      render(<EditFolderModal {...defaultProps} />);

      const select = screen.getByDisplayValue('Standard');
      expect(select).toBeInTheDocument();
    });

    it('should display location', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByDisplayValue('Local Drive')).toBeInTheDocument();
    });

    it('should display storage path', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByDisplayValue('/Finance/Invoices')).toBeInTheDocument();
    });

    it('should display keywords', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByDisplayValue('invoice, client')).toBeInTheDocument();
    });

    it('should display notes', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByDisplayValue('Review monthly')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Labels
  // ===========================================================================

  describe('form labels', () => {
    it('should show Folder Number label', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByText('Folder Number')).toBeInTheDocument();
    });

    it('should show Name label with required indicator', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByText('Name *')).toBeInTheDocument();
    });

    it('should show Description label', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should show Sensitivity label', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByText('Sensitivity')).toBeInTheDocument();
    });

    it('should show Location label', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('should show Storage Path label', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByText('Storage Path')).toBeInTheDocument();
    });

    it('should show Keywords label', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByText('Keywords')).toBeInTheDocument();
    });

    it('should show Notes label', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByText('Notes')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Editing
  // ===========================================================================

  describe('form editing', () => {
    it('should update name when typed', () => {
      render(<EditFolderModal {...defaultProps} />);

      const nameInput = screen.getByDisplayValue('Client Invoices');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      expect(screen.getByDisplayValue('Updated Name')).toBeInTheDocument();
    });

    it('should update description when typed', () => {
      render(<EditFolderModal {...defaultProps} />);

      const descInput = screen.getByDisplayValue('All client invoice documents');
      fireEvent.change(descInput, { target: { value: 'New description' } });

      expect(screen.getByDisplayValue('New description')).toBeInTheDocument();
    });

    it('should update sensitivity when changed', () => {
      render(<EditFolderModal {...defaultProps} />);

      const select = screen.getByDisplayValue('Standard');
      fireEvent.change(select, { target: { value: 'sensitive' } });

      expect(screen.getByDisplayValue('Sensitive')).toBeInTheDocument();
    });

    it('should update location when typed', () => {
      render(<EditFolderModal {...defaultProps} />);

      const locationInput = screen.getByDisplayValue('Local Drive');
      fireEvent.change(locationInput, { target: { value: 'Cloud Storage' } });

      expect(screen.getByDisplayValue('Cloud Storage')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Sensitivity Options
  // ===========================================================================

  describe('sensitivity options', () => {
    it('should have Standard option', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Standard' })).toBeInTheDocument();
    });

    it('should have Sensitive option', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Sensitive' })).toBeInTheDocument();
    });

    it('should have Work option', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Actions
  // ===========================================================================

  describe('actions', () => {
    it('should render Cancel button', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render Save Changes button', () => {
      render(<EditFolderModal {...defaultProps} />);

      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should call onClose when Cancel clicked', () => {
      render(<EditFolderModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onSave with form data when submitted', () => {
      render(<EditFolderModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Save Changes'));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          folder_number: '11.01',
          name: 'Client Invoices',
        })
      );
    });

    it('should call onClose after save', () => {
      render(<EditFolderModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Save Changes'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Empty Folder Values
  // ===========================================================================

  describe('empty folder values', () => {
    it('should handle folder with empty optional fields', () => {
      const emptyFolder = {
        id: 2,
        folder_number: '12.01',
        name: 'Test Folder',
      };

      render(<EditFolderModal {...defaultProps} folder={emptyFolder} />);

      expect(screen.getByDisplayValue('Test Folder')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render modal backdrop', () => {
      const { container } = render(<EditFolderModal {...defaultProps} />);

      expect(container.querySelector('.modal-backdrop')).toBeInTheDocument();
    });

    it('should render glass-card container', () => {
      const { container } = render(<EditFolderModal {...defaultProps} />);

      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });

    it('should render form element', () => {
      const { container } = render(<EditFolderModal {...defaultProps} />);

      expect(container.querySelector('form')).toBeInTheDocument();
    });
  });
});
