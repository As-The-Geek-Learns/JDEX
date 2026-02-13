/**
 * QuickStatsOverview Component Tests
 * ===================================
 * Tests for the quick statistics overview component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuickStatsOverview from './QuickStatsOverview.jsx';

describe('QuickStatsOverview', () => {
  // Use unique values to avoid test collisions
  const mockStats = {
    totalFolders: 42,
    totalItems: 156,
    sensitiveFolders: 7,
    sensitiveItems: 21,
    workFolders: 12,
    workItems: 48,
  };

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render all four stat cards', () => {
      render(<QuickStatsOverview stats={mockStats} />);

      expect(screen.getByText('Folders (XX.XX)')).toBeInTheDocument();
      expect(screen.getByText('Items (XX.XX.XX)')).toBeInTheDocument();
      expect(screen.getByText('Sensitive')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    it('should display correct folder count', () => {
      render(<QuickStatsOverview stats={mockStats} />);

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should display correct item count', () => {
      render(<QuickStatsOverview stats={mockStats} />);

      expect(screen.getByText('156')).toBeInTheDocument();
    });

    it('should display combined sensitive count', () => {
      render(<QuickStatsOverview stats={mockStats} />);

      // sensitiveFolders (7) + sensitiveItems (21) = 28
      expect(screen.getByText('28')).toBeInTheDocument();
    });

    it('should display combined work count', () => {
      render(<QuickStatsOverview stats={mockStats} />);

      // workFolders (12) + workItems (48) = 60
      expect(screen.getByText('60')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Different Stats Values
  // ===========================================================================

  describe('different stats values', () => {
    it('should handle zero values', () => {
      const emptyStats = {
        totalFolders: 0,
        totalItems: 0,
        sensitiveFolders: 0,
        sensitiveItems: 0,
        workFolders: 0,
        workItems: 0,
      };

      render(<QuickStatsOverview stats={emptyStats} />);

      // All values should be 0
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBe(4);
    });

    it('should handle large numbers', () => {
      const largeStats = {
        totalFolders: 1000,
        totalItems: 50000,
        sensitiveFolders: 100,
        sensitiveItems: 500,
        workFolders: 200,
        workItems: 1000,
      };

      render(<QuickStatsOverview stats={largeStats} />);

      expect(screen.getByText('1000')).toBeInTheDocument();
      expect(screen.getByText('50000')).toBeInTheDocument();
      expect(screen.getByText('600')).toBeInTheDocument(); // 100 + 500
      expect(screen.getByText('1200')).toBeInTheDocument(); // 200 + 1000
    });

    it('should handle only folders having values', () => {
      const folderOnlyStats = {
        totalFolders: 10,
        totalItems: 0,
        sensitiveFolders: 2,
        sensitiveItems: 0,
        workFolders: 3,
        workItems: 0,
      };

      render(<QuickStatsOverview stats={folderOnlyStats} />);

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render in a grid layout', () => {
      const { container } = render(<QuickStatsOverview stats={mockStats} />);

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('grid-cols-2');
      expect(grid).toHaveClass('md:grid-cols-4');
    });

    it('should render four stat-card elements', () => {
      const { container } = render(<QuickStatsOverview stats={mockStats} />);

      const statCards = container.querySelectorAll('.stat-card');
      expect(statCards).toHaveLength(4);
    });

    it('should include icons for each stat', () => {
      const { container } = render(<QuickStatsOverview stats={mockStats} />);

      // Lucide icons render as SVG
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBe(4);
    });
  });

  // ===========================================================================
  // Styling
  // ===========================================================================

  describe('styling', () => {
    it('should apply animation class', () => {
      const { container } = render(<QuickStatsOverview stats={mockStats} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('animate-stagger');
    });

    it('should have gradient styling for values', () => {
      const { container } = render(<QuickStatsOverview stats={mockStats} />);

      // Check for gradient text styling
      const gradientElements = container.querySelectorAll('.bg-gradient-to-r');
      expect(gradientElements.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle missing stats properties gracefully', () => {
      const partialStats = {
        totalFolders: 5,
        totalItems: 10,
        // Missing sensitive and work counts
      };

      // This may cause NaN - testing the component behavior
      render(<QuickStatsOverview stats={partialStats} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should render with undefined stats properties', () => {
      const statsWithUndefined = {
        totalFolders: undefined,
        totalItems: undefined,
        sensitiveFolders: undefined,
        sensitiveItems: undefined,
        workFolders: undefined,
        workItems: undefined,
      };

      // Should not crash
      render(<QuickStatsOverview stats={statsWithUndefined} />);

      expect(screen.getByText('Folders (XX.XX)')).toBeInTheDocument();
    });
  });
});
