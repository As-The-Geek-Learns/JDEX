/**
 * ItemCard Component Tests
 * ========================
 * Tests for the item card display component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ItemCard from './ItemCard.jsx';

describe('ItemCard', () => {
  const mockItem = {
    id: 1,
    item_number: '11.01.001',
    name: 'Invoice Q1 2024',
    folder_number: '11.01',
    folder_name: 'Client Invoices',
    area_color: '#14b8a6',
    sensitivity: 'standard',
    effective_sensitivity: 'standard',
    file_type: 'PDF',
    file_size: 1048576, // 1 MB
    description: 'Q1 2024 invoice summary',
    location: 'Local Drive',
    storage_path: '/Finance/Invoices/Q1-2024.pdf',
    keywords: 'invoice, quarterly',
    notes: 'Verified and approved',
  };

  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render item number', () => {
      render(<ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText('11.01.001')).toBeInTheDocument();
    });

    it('should render item name', () => {
      render(<ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText('Invoice Q1 2024')).toBeInTheDocument();
    });

    it('should render folder info', () => {
      render(<ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText('in 11.01 Client Invoices')).toBeInTheDocument();
    });

    it('should render sensitivity badge', () => {
      render(<ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText('Standard')).toBeInTheDocument();
    });

    it('should render file type badge', () => {
      render(<ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('should apply area color to border', () => {
      const { container } = render(
        <ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');
      expect(card).toHaveStyle({ borderLeftColor: '#14b8a6' });
    });
  });

  // ===========================================================================
  // Sensitivity Inheritance
  // ===========================================================================

  describe('sensitivity inheritance', () => {
    it('should show effective sensitivity when set to inherit', () => {
      const inheritItem = {
        ...mockItem,
        sensitivity: 'inherit',
        effective_sensitivity: 'sensitive',
      };

      render(<ItemCard item={inheritItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      // Should show inherited sensitivity with parentheses
      expect(screen.getByText('(Sensitive)')).toBeInTheDocument();
    });

    it('should show own sensitivity when not inheriting', () => {
      const sensitiveItem = {
        ...mockItem,
        sensitivity: 'sensitive',
        effective_sensitivity: 'sensitive',
      };

      render(<ItemCard item={sensitiveItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText('Sensitive')).toBeInTheDocument();
      expect(screen.queryByText('(Sensitive)')).not.toBeInTheDocument();
    });

    it('should show work badge when sensitivity is work', () => {
      const workItem = { ...mockItem, sensitivity: 'work' };

      render(<ItemCard item={workItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText('Work')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Interactions
  // ===========================================================================

  describe('interactions', () => {
    it('should call onEdit when edit button clicked', () => {
      const { container } = render(
        <ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      // Edit button is the first button
      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[0]);

      expect(mockOnEdit).toHaveBeenCalledWith(mockItem);
    });

    it('should call onDelete when delete button clicked', () => {
      const { container } = render(
        <ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      // Delete button is the second button
      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[1]);

      expect(mockOnDelete).toHaveBeenCalledWith(mockItem);
    });

    it('should expand when card clicked', () => {
      const { container } = render(
        <ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');
      fireEvent.click(card);

      expect(screen.getByText('Q1 2024 invoice summary')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Expansion
  // ===========================================================================

  describe('expansion', () => {
    it('should not show details initially', () => {
      render(<ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.queryByText('Q1 2024 invoice summary')).not.toBeInTheDocument();
    });

    it('should show description when expanded', () => {
      const { container } = render(
        <ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');
      fireEvent.click(card);

      expect(screen.getByText('Q1 2024 invoice summary')).toBeInTheDocument();
    });

    it('should show location when expanded', () => {
      const { container } = render(
        <ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');
      fireEvent.click(card);

      expect(screen.getByText('Location:')).toBeInTheDocument();
      expect(screen.getByText('Local Drive')).toBeInTheDocument();
    });

    it('should show storage path when expanded', () => {
      const { container } = render(
        <ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');
      fireEvent.click(card);

      expect(screen.getByText('Path:')).toBeInTheDocument();
      expect(screen.getByText('/Finance/Invoices/Q1-2024.pdf')).toBeInTheDocument();
    });

    it('should show formatted file size when expanded', () => {
      const { container } = render(
        <ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');
      fireEvent.click(card);

      expect(screen.getByText('Size:')).toBeInTheDocument();
      expect(screen.getByText('1.0 MB')).toBeInTheDocument();
    });

    it('should show keywords when expanded', () => {
      const { container } = render(
        <ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');
      fireEvent.click(card);

      expect(screen.getByText('Keywords:')).toBeInTheDocument();
      expect(screen.getByText('invoice, quarterly')).toBeInTheDocument();
    });

    it('should show notes when expanded', () => {
      const { container } = render(
        <ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');
      fireEvent.click(card);

      expect(screen.getByText('Notes:')).toBeInTheDocument();
      expect(screen.getByText('Verified and approved')).toBeInTheDocument();
    });

    it('should collapse when clicked again', () => {
      const { container } = render(
        <ItemCard item={mockItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');

      // Expand
      fireEvent.click(card);
      expect(screen.getByText('Q1 2024 invoice summary')).toBeInTheDocument();

      // Collapse
      fireEvent.click(card);
      expect(screen.queryByText('Q1 2024 invoice summary')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // File Size Formatting
  // ===========================================================================

  describe('file size formatting', () => {
    it('should format bytes correctly', () => {
      const smallItem = { ...mockItem, file_size: 500 };

      const { container } = render(
        <ItemCard item={smallItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');
      fireEvent.click(card);

      expect(screen.getByText('500.0 B')).toBeInTheDocument();
    });

    it('should format KB correctly', () => {
      const kbItem = { ...mockItem, file_size: 2048 };

      const { container } = render(
        <ItemCard item={kbItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');
      fireEvent.click(card);

      expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    });

    it('should format GB correctly', () => {
      const gbItem = { ...mockItem, file_size: 1073741824 }; // 1 GB

      const { container } = render(
        <ItemCard item={gbItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');
      fireEvent.click(card);

      expect(screen.getByText('1.0 GB')).toBeInTheDocument();
    });

    it('should not show size if not provided', () => {
      const noSizeItem = { ...mockItem, file_size: null };

      const { container } = render(
        <ItemCard item={noSizeItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');
      fireEvent.click(card);

      expect(screen.queryByText('Size:')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Optional Fields
  // ===========================================================================

  describe('optional fields', () => {
    it('should not render file type if not provided', () => {
      const noTypeItem = { ...mockItem, file_type: null };

      render(<ItemCard item={noTypeItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.queryByText('PDF')).not.toBeInTheDocument();
    });

    it('should not render description if not provided', () => {
      const noDescItem = { ...mockItem, description: null };

      const { container } = render(
        <ItemCard item={noDescItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');
      fireEvent.click(card);

      expect(screen.queryByText('Q1 2024 invoice summary')).not.toBeInTheDocument();
    });

    it('should not render location if not provided', () => {
      const noLocItem = { ...mockItem, location: null };

      const { container } = render(
        <ItemCard item={noLocItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');
      fireEvent.click(card);

      expect(screen.queryByText('Location:')).not.toBeInTheDocument();
    });

    it('should not render notes if not provided', () => {
      const noNotesItem = { ...mockItem, notes: null };

      const { container } = render(
        <ItemCard item={noNotesItem} onEdit={mockOnEdit} onDelete={mockOnDelete} />
      );

      const card = container.querySelector('.glass-card');
      fireEvent.click(card);

      expect(screen.queryByText('Notes:')).not.toBeInTheDocument();
    });
  });
});
