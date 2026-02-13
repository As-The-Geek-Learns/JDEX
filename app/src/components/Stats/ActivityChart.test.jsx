/**
 * ActivityChart Component Tests
 * =============================
 * Tests for the activity over time chart component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityChart from './ActivityChart.jsx';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('ActivityChart', () => {
  const mockData = [
    { date: '2024-01-01', count: 5 },
    { date: '2024-01-02', count: 10 },
    { date: '2024-01-03', count: 3 },
    { date: '2024-01-04', count: 15 },
  ];

  // ===========================================================================
  // Empty State
  // ===========================================================================

  describe('empty state', () => {
    it('should render empty state when no data', () => {
      render(<ActivityChart data={[]} />);

      expect(screen.getByText('No activity data yet')).toBeInTheDocument();
    });

    it('should show instruction text in empty state', () => {
      render(<ActivityChart data={[]} />);

      expect(screen.getByText('Organize files to see your progress')).toBeInTheDocument();
    });

    it('should render title in empty state', () => {
      render(<ActivityChart data={[]} title="Test Title" />);

      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should use default title in empty state', () => {
      render(<ActivityChart data={[]} />);

      expect(screen.getByText('Files Organized Over Time')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // With Data
  // ===========================================================================

  describe('with data', () => {
    it('should render title', () => {
      render(<ActivityChart data={mockData} />);

      expect(screen.getByText('Files Organized Over Time')).toBeInTheDocument();
    });

    it('should render custom title', () => {
      render(<ActivityChart data={mockData} title="Custom Activity" />);

      expect(screen.getByText('Custom Activity')).toBeInTheDocument();
    });

    it('should calculate and display total', () => {
      render(<ActivityChart data={mockData} />);

      // Total: 5 + 10 + 3 + 15 = 33
      expect(screen.getByText('33')).toBeInTheDocument();
    });

    it('should display period text', () => {
      render(<ActivityChart data={mockData} />);

      expect(screen.getByText('last 30 days')).toBeInTheDocument();
    });

    it('should render chart container', () => {
      const { container } = render(<ActivityChart data={mockData} />);

      // Check for the glass-card container that holds the chart
      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Default Props
  // ===========================================================================

  describe('default props', () => {
    it('should handle undefined data', () => {
      render(<ActivityChart />);

      expect(screen.getByText('No activity data yet')).toBeInTheDocument();
    });

    it('should use default title', () => {
      render(<ActivityChart data={mockData} />);

      expect(screen.getByText('Files Organized Over Time')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle single data point', () => {
      const singlePoint = [{ date: '2024-01-01', count: 7 }];

      render(<ActivityChart data={singlePoint} />);

      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('should handle zero counts', () => {
      const zeroData = [
        { date: '2024-01-01', count: 0 },
        { date: '2024-01-02', count: 0 },
      ];

      render(<ActivityChart data={zeroData} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle large numbers', () => {
      const largeData = [
        { date: '2024-01-01', count: 1000 },
        { date: '2024-01-02', count: 5000 },
      ];

      render(<ActivityChart data={largeData} />);

      expect(screen.getByText('6000')).toBeInTheDocument();
    });
  });
});
