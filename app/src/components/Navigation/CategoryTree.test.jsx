/**
 * CategoryTree Component Tests
 * ============================
 * Tests for the navigation tree component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CategoryTree from './CategoryTree.jsx';

describe('CategoryTree', () => {
  const mockAreas = [
    { id: 1, name: 'Personal', range_start: 10, range_end: 19, color: '#14b8a6' },
    { id: 2, name: 'Development', range_start: 20, range_end: 29, color: '#3b82f6' },
    { id: 3, name: 'Archive', range_start: 90, range_end: 99, color: '#6b7280' },
  ];

  const mockCategories = [
    { id: 1, number: 11, name: 'Finance', area_id: 1 },
    { id: 2, number: 12, name: 'Health', area_id: 1 },
    { id: 3, number: 21, name: 'Projects', area_id: 2 },
    { id: 4, number: 22, name: 'Learning', area_id: 2 },
  ];

  const mockOnSelectCategory = vi.fn();
  const mockOnSelectArea = vi.fn();

  const defaultProps = {
    areas: mockAreas,
    categories: mockCategories,
    selectedCategory: null,
    onSelectCategory: mockOnSelectCategory,
    onSelectArea: mockOnSelectArea,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render all areas', () => {
      render(<CategoryTree {...defaultProps} />);

      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();
    });

    it('should render area range numbers', () => {
      render(<CategoryTree {...defaultProps} />);

      expect(screen.getByText('10-19')).toBeInTheDocument();
      expect(screen.getByText('20-29')).toBeInTheDocument();
      expect(screen.getByText('90-99')).toBeInTheDocument();
    });

    it('should render categories under their areas', () => {
      render(<CategoryTree {...defaultProps} />);

      expect(screen.getByText('Finance')).toBeInTheDocument();
      expect(screen.getByText('Health')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Learning')).toBeInTheDocument();
    });

    it('should render category numbers', () => {
      render(<CategoryTree {...defaultProps} />);

      expect(screen.getByText('11')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('21')).toBeInTheDocument();
      expect(screen.getByText('22')).toBeInTheDocument();
    });

    it('should render expand/collapse icons', () => {
      const { container } = render(<CategoryTree {...defaultProps} />);

      // Should have chevron icons for each area
      const chevrons = container.querySelectorAll(
        'svg.lucide-chevron-down, svg.lucide-chevron-right'
      );
      expect(chevrons.length).toBeGreaterThanOrEqual(mockAreas.length);
    });
  });

  // ===========================================================================
  // Area Selection
  // ===========================================================================

  describe('area selection', () => {
    it('should call onSelectArea when area name clicked', () => {
      render(<CategoryTree {...defaultProps} />);

      fireEvent.click(screen.getByText('Personal'));

      expect(mockOnSelectArea).toHaveBeenCalledWith(mockAreas[0]);
    });

    it('should call onSelectArea when area range clicked', () => {
      render(<CategoryTree {...defaultProps} />);

      fireEvent.click(screen.getByText('10-19'));

      expect(mockOnSelectArea).toHaveBeenCalledWith(mockAreas[0]);
    });
  });

  // ===========================================================================
  // Category Selection
  // ===========================================================================

  describe('category selection', () => {
    it('should call onSelectCategory when category clicked', () => {
      render(<CategoryTree {...defaultProps} />);

      fireEvent.click(screen.getByText('Finance'));

      expect(mockOnSelectCategory).toHaveBeenCalledWith(mockCategories[0]);
    });

    it('should highlight selected category', () => {
      render(<CategoryTree {...defaultProps} selectedCategory={mockCategories[0]} />);

      const financeButton = screen.getByText('Finance').closest('button');
      expect(financeButton).toHaveClass('bg-teal-600/30');
    });

    it('should not highlight unselected categories', () => {
      render(<CategoryTree {...defaultProps} selectedCategory={mockCategories[0]} />);

      const healthButton = screen.getByText('Health').closest('button');
      expect(healthButton).not.toHaveClass('bg-teal-600/30');
    });
  });

  // ===========================================================================
  // Expand/Collapse
  // ===========================================================================

  describe('expand/collapse', () => {
    it('should start with areas expanded', () => {
      render(<CategoryTree {...defaultProps} />);

      // Categories should be visible (expanded by default)
      expect(screen.getByText('Finance')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    it('should collapse area when chevron clicked', () => {
      const { container } = render(<CategoryTree {...defaultProps} />);

      // Click the first expand/collapse button
      const toggleButtons = container.querySelectorAll('button[aria-label="Collapse area"]');
      fireEvent.click(toggleButtons[0]);

      // Categories for that area should be hidden
      expect(screen.queryByText('Finance')).not.toBeInTheDocument();
      expect(screen.queryByText('Health')).not.toBeInTheDocument();
    });

    it('should expand collapsed area when chevron clicked', () => {
      const { container } = render(<CategoryTree {...defaultProps} />);

      // Collapse first
      const toggleButtons = container.querySelectorAll('button[aria-label="Collapse area"]');
      fireEvent.click(toggleButtons[0]);

      // Then expand
      const expandButton = container.querySelector('button[aria-label="Expand area"]');
      fireEvent.click(expandButton);

      // Categories should be visible again
      expect(screen.getByText('Finance')).toBeInTheDocument();
      expect(screen.getByText('Health')).toBeInTheDocument();
    });

    it('should not select area when toggling expand/collapse', () => {
      const { container } = render(<CategoryTree {...defaultProps} />);

      const toggleButtons = container.querySelectorAll('button[aria-label="Collapse area"]');
      fireEvent.click(toggleButtons[0]);

      expect(mockOnSelectArea).not.toHaveBeenCalled();
    });

    it('should only collapse clicked area', () => {
      const { container } = render(<CategoryTree {...defaultProps} />);

      const toggleButtons = container.querySelectorAll('button[aria-label="Collapse area"]');
      fireEvent.click(toggleButtons[0]); // Collapse Personal

      // Personal categories hidden
      expect(screen.queryByText('Finance')).not.toBeInTheDocument();

      // Development categories still visible
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Empty States
  // ===========================================================================

  describe('empty states', () => {
    it('should handle empty areas', () => {
      render(<CategoryTree {...defaultProps} areas={[]} />);

      expect(screen.queryByText('Personal')).not.toBeInTheDocument();
    });

    it('should handle empty categories', () => {
      render(<CategoryTree {...defaultProps} categories={[]} />);

      // Areas should still render
      expect(screen.getByText('Personal')).toBeInTheDocument();
      // But no categories
      expect(screen.queryByText('Finance')).not.toBeInTheDocument();
    });

    it('should handle area with no categories', () => {
      const areasWithNoCategories = [
        ...mockAreas,
        { id: 99, name: 'Empty Area', range_start: 80, range_end: 89, color: '#999' },
      ];

      render(<CategoryTree {...defaultProps} areas={areasWithNoCategories} />);

      expect(screen.getByText('Empty Area')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Area Icons
  // ===========================================================================

  describe('area icons', () => {
    it('should render icons for known area names', () => {
      const { container } = render(<CategoryTree {...defaultProps} />);

      // Should have SVG icons for areas
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(mockAreas.length);
    });

    it('should apply area color to icon', () => {
      const { container } = render(<CategoryTree {...defaultProps} />);

      // Find icons with style attribute containing color
      const coloredIcons = container.querySelectorAll('svg[style*="color"]');
      expect(coloredIcons.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Number Formatting
  // ===========================================================================

  describe('number formatting', () => {
    it('should pad single digit category numbers', () => {
      const singleDigitCat = { id: 10, number: 1, name: 'Test', area_id: 1 };

      render(<CategoryTree {...defaultProps} categories={[singleDigitCat]} />);

      expect(screen.getByText('01')).toBeInTheDocument();
    });

    it('should pad single digit area ranges', () => {
      const singleDigitArea = {
        id: 10,
        name: 'Test',
        range_start: 1,
        range_end: 9,
        color: '#999',
      };

      render(<CategoryTree {...defaultProps} areas={[singleDigitArea]} categories={[]} />);

      expect(screen.getByText('01-09')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should have proper nesting structure', () => {
      const { container } = render(<CategoryTree {...defaultProps} />);

      // Categories should be nested under areas
      const categoryList = container.querySelector('.ml-6');
      expect(categoryList).toBeInTheDocument();
    });

    it('should have jd-number class on category numbers', () => {
      const { container } = render(<CategoryTree {...defaultProps} />);

      const jdNumbers = container.querySelectorAll('.jd-number');
      expect(jdNumbers.length).toBe(mockCategories.length);
    });
  });
});
