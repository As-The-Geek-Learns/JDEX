/**
 * Breadcrumb Component Tests
 * ==========================
 * Tests for the navigation breadcrumb component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Breadcrumb from './Breadcrumb.jsx';

describe('Breadcrumb', () => {
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render home button', () => {
      render(<Breadcrumb path={[]} onNavigate={mockOnNavigate} />);

      // Home button should be present (it's the first button)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('should render empty path without crashing', () => {
      render(<Breadcrumb path={[]} onNavigate={mockOnNavigate} />);

      // Should only have home button
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);
    });

    it('should render path items', () => {
      const path = [
        { type: 'area', label: '10-19 Finance', data: { id: 1 } },
        { type: 'category', label: '11 Invoices', data: { id: 2 } },
      ];

      render(<Breadcrumb path={path} onNavigate={mockOnNavigate} />);

      expect(screen.getByText('10-19 Finance')).toBeInTheDocument();
      expect(screen.getByText('11 Invoices')).toBeInTheDocument();
    });

    it('should render correct number of buttons for path', () => {
      const path = [
        { type: 'area', label: 'Area 1', data: {} },
        { type: 'category', label: 'Category 1', data: {} },
        { type: 'folder', label: 'Folder 1', data: {} },
      ];

      render(<Breadcrumb path={path} onNavigate={mockOnNavigate} />);

      // Home button + 3 path items
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4);
    });
  });

  // ===========================================================================
  // Navigation
  // ===========================================================================

  describe('navigation', () => {
    it('should call onNavigate with home when home button clicked', () => {
      render(<Breadcrumb path={[]} onNavigate={mockOnNavigate} />);

      const homeButton = screen.getByRole('button');
      fireEvent.click(homeButton);

      expect(mockOnNavigate).toHaveBeenCalledWith('home');
    });

    it('should call onNavigate with item type and data when path item clicked', () => {
      const path = [{ type: 'area', label: 'Finance', data: { id: 1, name: 'Finance' } }];

      render(<Breadcrumb path={path} onNavigate={mockOnNavigate} />);

      const areaButton = screen.getByText('Finance');
      fireEvent.click(areaButton);

      expect(mockOnNavigate).toHaveBeenCalledWith('area', { id: 1, name: 'Finance' });
    });

    it('should navigate to correct item when middle breadcrumb clicked', () => {
      const path = [
        { type: 'area', label: 'Area', data: { id: 1 } },
        { type: 'category', label: 'Category', data: { id: 2 } },
        { type: 'folder', label: 'Folder', data: { id: 3 } },
      ];

      render(<Breadcrumb path={path} onNavigate={mockOnNavigate} />);

      const categoryButton = screen.getByText('Category');
      fireEvent.click(categoryButton);

      expect(mockOnNavigate).toHaveBeenCalledWith('category', { id: 2 });
    });
  });

  // ===========================================================================
  // Styling
  // ===========================================================================

  describe('styling', () => {
    it('should highlight last item differently (current location)', () => {
      const path = [
        { type: 'area', label: 'Area', data: {} },
        { type: 'category', label: 'Current', data: {} },
      ];

      render(<Breadcrumb path={path} onNavigate={mockOnNavigate} />);

      const currentButton = screen.getByText('Current');
      expect(currentButton).toHaveClass('text-teal-400');
      expect(currentButton).toHaveClass('font-medium');
    });

    it('should not highlight non-last items', () => {
      const path = [
        { type: 'area', label: 'Not Current', data: {} },
        { type: 'category', label: 'Current', data: {} },
      ];

      render(<Breadcrumb path={path} onNavigate={mockOnNavigate} />);

      const notCurrentButton = screen.getByText('Not Current');
      expect(notCurrentButton).toHaveClass('text-slate-400');
      expect(notCurrentButton).not.toHaveClass('font-medium');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle single item path', () => {
      const path = [{ type: 'area', label: 'Only Item', data: { id: 1 } }];

      render(<Breadcrumb path={path} onNavigate={mockOnNavigate} />);

      expect(screen.getByText('Only Item')).toBeInTheDocument();
      // Single item should be highlighted as current
      expect(screen.getByText('Only Item')).toHaveClass('text-teal-400');
    });

    it('should handle path items with special characters in label', () => {
      const path = [{ type: 'area', label: '10-19 Finance & Accounting', data: {} }];

      render(<Breadcrumb path={path} onNavigate={mockOnNavigate} />);

      expect(screen.getByText('10-19 Finance & Accounting')).toBeInTheDocument();
    });

    it('should handle path items with empty data', () => {
      const path = [{ type: 'area', label: 'Test', data: {} }];

      render(<Breadcrumb path={path} onNavigate={mockOnNavigate} />);

      fireEvent.click(screen.getByText('Test'));
      expect(mockOnNavigate).toHaveBeenCalledWith('area', {});
    });
  });
});
