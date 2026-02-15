/**
 * SensitivityBadge Component Tests
 * ================================
 * Tests for the sensitivity level badge component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SensitivityBadge from './SensitivityBadge.jsx';

describe('SensitivityBadge', () => {
  // ===========================================================================
  // Sensitivity Types
  // ===========================================================================

  describe('sensitivity types', () => {
    it('should render standard sensitivity', () => {
      render(<SensitivityBadge sensitivity="standard" />);

      expect(screen.getByText('Standard')).toBeInTheDocument();
    });

    it('should render sensitive sensitivity', () => {
      render(<SensitivityBadge sensitivity="sensitive" />);

      expect(screen.getByText('Sensitive')).toBeInTheDocument();
    });

    it('should render work sensitivity', () => {
      render(<SensitivityBadge sensitivity="work" />);

      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    it('should render inherit sensitivity', () => {
      render(<SensitivityBadge sensitivity="inherit" />);

      expect(screen.getByText('Inherit')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Styling
  // ===========================================================================

  describe('styling', () => {
    it('should apply slate styling for standard', () => {
      const { container } = render(<SensitivityBadge sensitivity="standard" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-slate-300');
    });

    it('should apply red styling for sensitive', () => {
      const { container } = render(<SensitivityBadge sensitivity="sensitive" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-red-400');
    });

    it('should apply blue styling for work', () => {
      const { container } = render(<SensitivityBadge sensitivity="work" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-blue-400');
    });

    it('should apply purple styling for inherit', () => {
      const { container } = render(<SensitivityBadge sensitivity="inherit" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-purple-400');
    });
  });

  // ===========================================================================
  // Inherited Flag
  // ===========================================================================

  describe('inherited flag', () => {
    it('should show label without parentheses when not inherited', () => {
      render(<SensitivityBadge sensitivity="sensitive" isInherited={false} />);

      expect(screen.getByText('Sensitive')).toBeInTheDocument();
      expect(screen.queryByText('(Sensitive)')).not.toBeInTheDocument();
    });

    it('should show label with parentheses when inherited', () => {
      render(<SensitivityBadge sensitivity="sensitive" isInherited={true} />);

      expect(screen.getByText('(Sensitive)')).toBeInTheDocument();
    });

    it('should default to not inherited', () => {
      render(<SensitivityBadge sensitivity="work" />);

      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.queryByText('(Work)')).not.toBeInTheDocument();
    });

    it('should show inherited format for each sensitivity type', () => {
      const { rerender } = render(<SensitivityBadge sensitivity="standard" isInherited={true} />);
      expect(screen.getByText('(Standard)')).toBeInTheDocument();

      rerender(<SensitivityBadge sensitivity="work" isInherited={true} />);
      expect(screen.getByText('(Work)')).toBeInTheDocument();

      rerender(<SensitivityBadge sensitivity="inherit" isInherited={true} />);
      expect(screen.getByText('(Inherit)')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Fallback Behavior
  // ===========================================================================

  describe('fallback behavior', () => {
    it('should fall back to standard for unknown sensitivity', () => {
      render(<SensitivityBadge sensitivity="unknown" />);

      expect(screen.getByText('Standard')).toBeInTheDocument();
    });

    it('should fall back to standard for null sensitivity', () => {
      render(<SensitivityBadge sensitivity={null} />);

      expect(screen.getByText('Standard')).toBeInTheDocument();
    });

    it('should fall back to standard for undefined sensitivity', () => {
      render(<SensitivityBadge sensitivity={undefined} />);

      expect(screen.getByText('Standard')).toBeInTheDocument();
    });

    it('should apply standard styling for unknown sensitivity', () => {
      const { container } = render(<SensitivityBadge sensitivity="invalid" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-slate-300');
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render as a span element', () => {
      const { container } = render(<SensitivityBadge sensitivity="standard" />);

      const badge = container.querySelector('span');
      expect(badge).toBeInTheDocument();
    });

    it('should include badge styling classes', () => {
      const { container } = render(<SensitivityBadge sensitivity="standard" />);

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-medium');
    });

    it('should include an icon', () => {
      const { container } = render(<SensitivityBadge sensitivity="standard" />);

      // Lucide icons render as SVG
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });
});
