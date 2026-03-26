/**
 * StatCard Component Tests
 * =========================
 * Tests for the StatCard presentational component
 *
 * Categories:
 * - Snapshot: Visual regression testing
 * - Rendering: Core prop rendering
 * - Color Variants: All 7 color options
 * - Trend Display: Positive/negative trend indicators
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from './StatCard';
import { Activity, Folder } from 'lucide-react';

// =============================================================================
// Snapshot Tests
// =============================================================================

describe('StatCard Snapshot', () => {
  it('matches snapshot with default props', () => {
    const { container } = render(<StatCard title="Files Organized" value={42} />);

    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot with all props', () => {
    const { container } = render(
      <StatCard
        title="Monthly Stats"
        value={1234}
        subtitle="This month"
        icon={Activity}
        color="purple"
        trend={{ value: 15, isPositive: true }}
      />
    );

    expect(container.firstChild).toMatchSnapshot();
  });
});

// =============================================================================
// Rendering Tests
// =============================================================================

describe('StatCard Rendering', () => {
  it('renders title correctly', () => {
    render(<StatCard title="Total Files" value={100} />);

    expect(screen.getByText('Total Files')).toBeInTheDocument();
  });

  it('renders numeric value formatted with locale', () => {
    render(<StatCard title="Count" value={1000} />);

    // 1000 should be formatted as "1,000" in most locales
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });

  it('renders string value as-is', () => {
    render(<StatCard title="Status" value="Active" />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<StatCard title="Files" value={50} subtitle="Last 30 days" />);

    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(<StatCard title="Files" value={50} />);

    // Subtitle would have text-xs text-slate-500 class
    const subtitleElement = container.querySelector('.text-xs.text-slate-500');
    expect(subtitleElement).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<StatCard title="Activity" value={10} icon={Activity} />);

    // Lucide icons render as SVG elements
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('does not render icon when not provided', () => {
    render(<StatCard title="Count" value={5} />);

    const svg = document.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
  });
});

// =============================================================================
// Color Variants Tests
// =============================================================================

describe('StatCard Color Variants', () => {
  it('applies teal color class by default', () => {
    render(<StatCard title="Default" value={1} />);

    const valueElement = screen.getByText('1');
    expect(valueElement).toHaveClass('text-teal-400');
  });

  it.each([
    ['teal', 'text-teal-400'],
    ['amber', 'text-amber-400'],
    ['purple', 'text-purple-400'],
    ['blue', 'text-blue-400'],
    ['green', 'text-green-400'],
    ['red', 'text-red-400'],
    ['white', 'text-white'],
  ])('applies %s color class correctly', (color, expectedClass) => {
    render(<StatCard title="Test" value={1} color={color} />);

    const valueElement = screen.getByText('1');
    expect(valueElement).toHaveClass(expectedClass);
  });

  it('falls back to teal for unknown color', () => {
    render(<StatCard title="Unknown" value={1} color="invalid-color" />);

    const valueElement = screen.getByText('1');
    expect(valueElement).toHaveClass('text-teal-400');
  });
});

// =============================================================================
// Trend Display Tests
// =============================================================================

describe('StatCard Trend Display', () => {
  it('does not render trend when not provided', () => {
    render(<StatCard title="No Trend" value={100} />);

    // Trend would show an arrow character
    expect(screen.queryByText(/↑/)).not.toBeInTheDocument();
    expect(screen.queryByText(/↓/)).not.toBeInTheDocument();
  });

  it('renders positive trend with up arrow and green color', () => {
    render(<StatCard title="Growth" value={100} trend={{ value: 25, isPositive: true }} />);

    const trendElement = screen.getByText(/↑.*25%/);
    expect(trendElement).toBeInTheDocument();
    expect(trendElement).toHaveClass('text-green-400');
  });

  it('renders negative trend with down arrow and red color', () => {
    render(<StatCard title="Decline" value={100} trend={{ value: 10, isPositive: false }} />);

    const trendElement = screen.getByText(/↓.*10%/);
    expect(trendElement).toBeInTheDocument();
    expect(trendElement).toHaveClass('text-red-400');
  });

  it('displays absolute value of trend percentage', () => {
    // Even with negative number, should display absolute value
    render(<StatCard title="Test" value={50} trend={{ value: -15, isPositive: false }} />);

    // Math.abs(-15) = 15
    expect(screen.getByText(/15%/)).toBeInTheDocument();
  });

  it('renders trend with zero value', () => {
    render(<StatCard title="Flat" value={100} trend={{ value: 0, isPositive: true }} />);

    expect(screen.getByText(/↑.*0%/)).toBeInTheDocument();
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('StatCard Edge Cases', () => {
  it('handles large numbers correctly', () => {
    render(<StatCard title="Big Number" value={1234567890} />);

    // Should be formatted with commas
    expect(screen.getByText('1,234,567,890')).toBeInTheDocument();
  });

  it('handles zero value', () => {
    render(<StatCard title="Zero" value={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('handles negative numbers', () => {
    render(<StatCard title="Negative" value={-42} />);

    expect(screen.getByText('-42')).toBeInTheDocument();
  });

  it('handles decimal numbers', () => {
    render(<StatCard title="Decimal" value={3.14159} />);

    // toLocaleString may format differently based on locale
    expect(screen.getByText(/3\.14/)).toBeInTheDocument();
  });

  it('renders with all optional props provided', () => {
    render(
      <StatCard
        title="Complete Card"
        value={999}
        subtitle="All features"
        icon={Folder}
        color="amber"
        trend={{ value: 50, isPositive: true }}
      />
    );

    expect(screen.getByText('Complete Card')).toBeInTheDocument();
    expect(screen.getByText('999')).toBeInTheDocument();
    expect(screen.getByText('All features')).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('999')).toHaveClass('text-amber-400');
    expect(screen.getByText(/↑.*50%/)).toBeInTheDocument();
  });
});
