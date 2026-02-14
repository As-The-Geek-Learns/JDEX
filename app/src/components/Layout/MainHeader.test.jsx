/**
 * MainHeader Component Tests
 * ==========================
 * Tests for the main application header component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MainHeader from './MainHeader.jsx';

// Helper to get the search input (placeholder now includes keyboard shortcut)
const getSearchInput = () => screen.getByPlaceholderText(/Search folders and items/i);

describe('MainHeader', () => {
  const mockOnSearchChange = vi.fn();
  const mockOnToggleSidebar = vi.fn();

  const defaultProps = {
    searchQuery: '',
    onSearchChange: mockOnSearchChange,
    onToggleSidebar: mockOnToggleSidebar,
    folderCount: 25,
    itemCount: 150,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render search input', () => {
      render(<MainHeader {...defaultProps} />);

      expect(getSearchInput()).toBeInTheDocument();
    });

    it('should render menu toggle button', () => {
      const { container } = render(<MainHeader {...defaultProps} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('should display folder count', () => {
      render(<MainHeader {...defaultProps} />);

      expect(screen.getByText('25 folders, 150 items')).toBeInTheDocument();
    });

    it('should display item count', () => {
      render(<MainHeader {...defaultProps} />);

      expect(screen.getByText('25 folders, 150 items')).toBeInTheDocument();
    });

    it('should render in a header element', () => {
      const { container } = render(<MainHeader {...defaultProps} />);

      expect(container.querySelector('header')).toBeInTheDocument();
    });

    it('should have glass-card styling', () => {
      const { container } = render(<MainHeader {...defaultProps} />);

      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Search Functionality
  // ===========================================================================

  describe('search functionality', () => {
    it('should display current search query', () => {
      render(<MainHeader {...defaultProps} searchQuery="invoices" />);

      expect(getSearchInput()).toHaveValue('invoices');
    });

    it('should call onSearchChange when typing', () => {
      render(<MainHeader {...defaultProps} />);

      fireEvent.change(getSearchInput(), { target: { value: 'test search' } });

      expect(mockOnSearchChange).toHaveBeenCalledWith('test search');
    });

    it('should handle empty search query', () => {
      render(<MainHeader {...defaultProps} searchQuery="" />);

      expect(getSearchInput()).toHaveValue('');
    });

    it('should render search icon', () => {
      const { container } = render(<MainHeader {...defaultProps} />);

      // Lucide Search icon renders as SVG
      const svg = container.querySelector('svg.lucide-search');
      expect(svg).toBeInTheDocument();
    });

    it('should show keyboard shortcut in placeholder', () => {
      render(<MainHeader {...defaultProps} />);

      const input = getSearchInput();
      // Placeholder should include keyboard shortcut (Cmd+K or Ctrl+K)
      expect(input.placeholder).toMatch(/\((Cmd|Ctrl)\+K\)/);
    });
  });

  // ===========================================================================
  // Sidebar Toggle
  // ===========================================================================

  describe('sidebar toggle', () => {
    it('should call onToggleSidebar when menu button clicked', () => {
      const { container } = render(<MainHeader {...defaultProps} />);

      const menuButton = container.querySelector('button');
      fireEvent.click(menuButton);

      expect(mockOnToggleSidebar).toHaveBeenCalled();
    });

    it('should render menu icon', () => {
      const { container } = render(<MainHeader {...defaultProps} />);

      // Lucide Menu icon renders as SVG
      const svg = container.querySelector('svg.lucide-menu');
      expect(svg).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Counts Display
  // ===========================================================================

  describe('counts display', () => {
    it('should display zero counts', () => {
      render(<MainHeader {...defaultProps} folderCount={0} itemCount={0} />);

      expect(screen.getByText('0 folders, 0 items')).toBeInTheDocument();
    });

    it('should display large counts', () => {
      render(<MainHeader {...defaultProps} folderCount={1000} itemCount={5000} />);

      expect(screen.getByText('1000 folders, 5000 items')).toBeInTheDocument();
    });

    it('should update when counts change', () => {
      const { rerender } = render(<MainHeader {...defaultProps} />);

      expect(screen.getByText('25 folders, 150 items')).toBeInTheDocument();

      rerender(<MainHeader {...defaultProps} folderCount={30} itemCount={200} />);

      expect(screen.getByText('30 folders, 200 items')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Styling
  // ===========================================================================

  describe('styling', () => {
    it('should have search input styling', () => {
      render(<MainHeader {...defaultProps} />);

      const input = getSearchInput();
      expect(input).toHaveClass('bg-slate-800');
      expect(input).toHaveClass('rounded-lg');
    });

    it('should have border styling', () => {
      const { container } = render(<MainHeader {...defaultProps} />);

      const header = container.querySelector('header');
      expect(header).toHaveClass('border-b');
    });
  });
});
