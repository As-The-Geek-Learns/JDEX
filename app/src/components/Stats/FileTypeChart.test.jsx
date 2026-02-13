/**
 * FileTypeChart Component Tests
 * =============================
 * Tests for the file type distribution pie chart component.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import FileTypeChart from './FileTypeChart.jsx';

describe('FileTypeChart', () => {
  // Store original ResizeObserver and restore after tests
  const OriginalResizeObserver = global.ResizeObserver;

  beforeAll(() => {
    // Mock ResizeObserver for Recharts
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterAll(() => {
    global.ResizeObserver = OriginalResizeObserver;
  });
  const mockData = [
    { type: 'PDF', count: 25 },
    { type: 'DOCX', count: 15 },
    { type: 'XLSX', count: 10 },
    { type: 'TXT', count: 5 },
  ];

  // ===========================================================================
  // Empty State
  // ===========================================================================

  describe('empty state', () => {
    it('should render empty state when no data', () => {
      render(<FileTypeChart data={[]} />);

      expect(screen.getByText('No file type data')).toBeInTheDocument();
    });

    it('should show instruction text in empty state', () => {
      render(<FileTypeChart data={[]} />);

      expect(screen.getByText('Organize files to see distribution')).toBeInTheDocument();
    });

    it('should render title in empty state', () => {
      render(<FileTypeChart data={[]} title="Custom Title" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should use default title in empty state', () => {
      render(<FileTypeChart data={[]} />);

      expect(screen.getByText('Files by Type')).toBeInTheDocument();
    });

    it('should render folder emoji in empty state', () => {
      render(<FileTypeChart data={[]} />);

      expect(screen.getByText('📁')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // With Data
  // ===========================================================================

  describe('with data', () => {
    it('should render title', () => {
      render(<FileTypeChart data={mockData} />);

      expect(screen.getByText('Files by Type')).toBeInTheDocument();
    });

    it('should render custom title', () => {
      render(<FileTypeChart data={mockData} title="File Distribution" />);

      expect(screen.getByText('File Distribution')).toBeInTheDocument();
    });

    it('should calculate and display total', () => {
      render(<FileTypeChart data={mockData} />);

      // Total: 25 + 15 + 10 + 5 = 55
      expect(screen.getByText('55')).toBeInTheDocument();
    });

    it('should display files label', () => {
      render(<FileTypeChart data={mockData} />);

      expect(screen.getByText('files')).toBeInTheDocument();
    });

    it('should render chart container', () => {
      const { container } = render(<FileTypeChart data={mockData} />);

      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Default Props
  // ===========================================================================

  describe('default props', () => {
    it('should handle undefined data', () => {
      render(<FileTypeChart />);

      expect(screen.getByText('No file type data')).toBeInTheDocument();
    });

    it('should use default title', () => {
      render(<FileTypeChart data={mockData} />);

      expect(screen.getByText('Files by Type')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle single data point', () => {
      const singlePoint = [{ type: 'PDF', count: 42 }];

      render(<FileTypeChart data={singlePoint} />);

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should handle many file types', () => {
      const manyTypes = [
        { type: 'PDF', count: 10 },
        { type: 'DOCX', count: 8 },
        { type: 'XLSX', count: 6 },
        { type: 'TXT', count: 4 },
        { type: 'PNG', count: 3 },
        { type: 'JPG', count: 2 },
        { type: 'MP3', count: 1 },
        { type: 'ZIP', count: 1 },
        { type: 'HTML', count: 1 },
      ];

      render(<FileTypeChart data={manyTypes} />);

      // Total: 10+8+6+4+3+2+1+1+1 = 36
      expect(screen.getByText('36')).toBeInTheDocument();
    });

    it('should handle large counts', () => {
      const largeData = [
        { type: 'PDF', count: 5000 },
        { type: 'DOCX', count: 3000 },
      ];

      render(<FileTypeChart data={largeData} />);

      expect(screen.getByText('8000')).toBeInTheDocument();
    });
  });
});
