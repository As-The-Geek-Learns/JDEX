/**
 * FolderCard Component Tests
 * ==========================
 * Tests for the folder card display component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FolderCard from './FolderCard.jsx';

describe('FolderCard', () => {
  const mockFolder = {
    id: 1,
    folder_number: '11.01',
    name: 'Client Invoices',
    category_name: 'Invoices',
    area_name: 'Finance',
    area_color: '#14b8a6',
    sensitivity: 'standard',
    description: 'All client invoice documents',
    location: 'Cloud Storage',
    storage_path: '/Finance/Invoices/ClientInvoices',
    keywords: 'invoice, client, billing',
    notes: 'Review monthly',
  };

  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render folder number', () => {
      render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      expect(screen.getByText('11.01')).toBeInTheDocument();
    });

    it('should render folder name', () => {
      render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      expect(screen.getByText('Client Invoices')).toBeInTheDocument();
    });

    it('should render category and area info', () => {
      render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      expect(screen.getByText('Invoices • Finance')).toBeInTheDocument();
    });

    it('should render sensitivity badge', () => {
      render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      expect(screen.getByText('Standard')).toBeInTheDocument();
    });

    it('should apply area color to border', () => {
      const { container } = render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({ borderLeftColor: '#14b8a6' });
    });
  });

  // ===========================================================================
  // Interactions
  // ===========================================================================

  describe('interactions', () => {
    it('should call onOpen when main area clicked', () => {
      render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      const mainContent = screen.getByText('Client Invoices').closest('.flex-1');
      fireEvent.click(mainContent);

      expect(mockOnOpen).toHaveBeenCalledWith(mockFolder);
    });

    it('should call onEdit when edit button clicked', () => {
      const { container } = render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      // Edit button is the second button (after expand)
      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[1]);

      expect(mockOnEdit).toHaveBeenCalledWith(mockFolder);
      expect(mockOnOpen).not.toHaveBeenCalled();
    });

    it('should call onDelete when delete button clicked', () => {
      const { container } = render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      // Delete button is the third button
      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[2]);

      expect(mockOnDelete).toHaveBeenCalledWith(mockFolder);
      expect(mockOnOpen).not.toHaveBeenCalled();
    });

    it('should not call onOpen when edit button clicked', () => {
      const { container } = render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[1]);

      expect(mockOnOpen).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Expansion
  // ===========================================================================

  describe('expansion', () => {
    it('should not show details initially', () => {
      render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      expect(screen.queryByText('All client invoice documents')).not.toBeInTheDocument();
    });

    it('should show details when expand button clicked', () => {
      const { container } = render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      // Expand button is the first button
      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[0]);

      expect(screen.getByText('All client invoice documents')).toBeInTheDocument();
    });

    it('should show location when expanded', () => {
      const { container } = render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[0]);

      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Cloud Storage')).toBeInTheDocument();
    });

    it('should show storage path when expanded', () => {
      const { container } = render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[0]);

      expect(screen.getByText('Path')).toBeInTheDocument();
      expect(screen.getByText('/Finance/Invoices/ClientInvoices')).toBeInTheDocument();
    });

    it('should show keywords when expanded', () => {
      const { container } = render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[0]);

      expect(screen.getByText('Keywords')).toBeInTheDocument();
      expect(screen.getByText('invoice')).toBeInTheDocument();
      expect(screen.getByText('client')).toBeInTheDocument();
      expect(screen.getByText('billing')).toBeInTheDocument();
    });

    it('should show notes when expanded', () => {
      const { container } = render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[0]);

      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('Review monthly')).toBeInTheDocument();
    });

    it('should collapse when expand button clicked again', () => {
      const { container } = render(
        <FolderCard
          folder={mockFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      const buttons = container.querySelectorAll('button');

      // Expand
      fireEvent.click(buttons[0]);
      expect(screen.getByText('All client invoice documents')).toBeInTheDocument();

      // Collapse
      fireEvent.click(buttons[0]);
      expect(screen.queryByText('All client invoice documents')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Optional Fields
  // ===========================================================================

  describe('optional fields', () => {
    it('should not render description section if not provided', () => {
      const folderWithoutDescription = { ...mockFolder, description: null };

      const { container } = render(
        <FolderCard
          folder={folderWithoutDescription}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[0]);

      expect(screen.queryByText('All client invoice documents')).not.toBeInTheDocument();
    });

    it('should not render location if not provided', () => {
      const folderWithoutLocation = { ...mockFolder, location: null };

      const { container } = render(
        <FolderCard
          folder={folderWithoutLocation}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[0]);

      expect(screen.queryByText('Location')).not.toBeInTheDocument();
    });

    it('should not render notes if not provided', () => {
      const folderWithoutNotes = { ...mockFolder, notes: null };

      const { container } = render(
        <FolderCard
          folder={folderWithoutNotes}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[0]);

      expect(screen.queryByText('Notes')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Different Sensitivity Levels
  // ===========================================================================

  describe('sensitivity levels', () => {
    it('should display sensitive badge', () => {
      const sensitiveFolder = { ...mockFolder, sensitivity: 'sensitive' };

      render(
        <FolderCard
          folder={sensitiveFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      expect(screen.getByText('Sensitive')).toBeInTheDocument();
    });

    it('should display work badge', () => {
      const workFolder = { ...mockFolder, sensitivity: 'work' };

      render(
        <FolderCard
          folder={workFolder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpen={mockOnOpen}
        />
      );

      expect(screen.getByText('Work')).toBeInTheDocument();
    });
  });
});
