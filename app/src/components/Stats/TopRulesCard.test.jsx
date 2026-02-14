/**
 * TopRulesCard Component Tests
 * ============================
 * Tests for the top organization rules card component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TopRulesCard from './TopRulesCard.jsx';

describe('TopRulesCard', () => {
  const mockRules = [
    { name: 'PDF Documents', type: 'extension', matchCount: 150 },
    { name: 'Invoice Keywords', type: 'keyword', matchCount: 85 },
    { name: 'Work Files Path', type: 'path', matchCount: 42 },
    { name: 'Code Pattern', type: 'regex', matchCount: 28 },
  ];

  // ===========================================================================
  // Empty State
  // ===========================================================================

  describe('empty state', () => {
    it('should render empty state when no rules', () => {
      render(<TopRulesCard rules={[]} />);

      expect(screen.getByText('No active rules yet')).toBeInTheDocument();
    });

    it('should show instruction text in empty state', () => {
      render(<TopRulesCard rules={[]} />);

      expect(screen.getByText('Create rules to see usage stats')).toBeInTheDocument();
    });

    it('should render title in empty state', () => {
      render(<TopRulesCard rules={[]} title="Custom Title" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should use default title in empty state', () => {
      render(<TopRulesCard rules={[]} />);

      expect(screen.getByText('Top Organization Rules')).toBeInTheDocument();
    });

    it('should render zap emoji in empty state', () => {
      render(<TopRulesCard rules={[]} />);

      expect(screen.getByText('⚡')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // With Rules
  // ===========================================================================

  describe('with rules', () => {
    it('should render title', () => {
      render(<TopRulesCard rules={mockRules} />);

      expect(screen.getByText('Top Organization Rules')).toBeInTheDocument();
    });

    it('should render custom title', () => {
      render(<TopRulesCard rules={mockRules} title="Active Rules" />);

      expect(screen.getByText('Active Rules')).toBeInTheDocument();
    });

    it('should render all rule names', () => {
      render(<TopRulesCard rules={mockRules} />);

      expect(screen.getByText('PDF Documents')).toBeInTheDocument();
      expect(screen.getByText('Invoice Keywords')).toBeInTheDocument();
      expect(screen.getByText('Work Files Path')).toBeInTheDocument();
      expect(screen.getByText('Code Pattern')).toBeInTheDocument();
    });

    it('should render rule types', () => {
      render(<TopRulesCard rules={mockRules} />);

      expect(screen.getByText('extension')).toBeInTheDocument();
      expect(screen.getByText('keyword')).toBeInTheDocument();
      expect(screen.getByText('path')).toBeInTheDocument();
      expect(screen.getByText('regex')).toBeInTheDocument();
    });

    it('should render match counts', () => {
      render(<TopRulesCard rules={mockRules} />);

      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('28')).toBeInTheDocument();
    });

    it('should render rank numbers', () => {
      render(<TopRulesCard rules={mockRules} />);

      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('2.')).toBeInTheDocument();
      expect(screen.getByText('3.')).toBeInTheDocument();
      expect(screen.getByText('4.')).toBeInTheDocument();
    });

    it('should display total matches', () => {
      render(<TopRulesCard rules={mockRules} />);

      // Total: 150 + 85 + 42 + 28 = 305
      expect(screen.getByText('Total matches: 305')).toBeInTheDocument();
    });

    it('should render glass-card container', () => {
      const { container } = render(<TopRulesCard rules={mockRules} />);

      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Default Props
  // ===========================================================================

  describe('default props', () => {
    it('should handle undefined rules', () => {
      render(<TopRulesCard />);

      expect(screen.getByText('No active rules yet')).toBeInTheDocument();
    });

    it('should use default title', () => {
      render(<TopRulesCard rules={mockRules} />);

      expect(screen.getByText('Top Organization Rules')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle single rule', () => {
      const singleRule = [{ name: 'My Rule', type: 'extension', matchCount: 100 }];

      render(<TopRulesCard rules={singleRule} />);

      expect(screen.getByText('My Rule')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Total matches: 100')).toBeInTheDocument();
    });

    it('should handle large match counts with formatting', () => {
      const largeRules = [{ name: 'Big Rule', type: 'extension', matchCount: 12345 }];

      render(<TopRulesCard rules={largeRules} />);

      // toLocaleString formats 12345 as "12,345"
      expect(screen.getByText('12,345')).toBeInTheDocument();
    });

    it('should handle unknown rule type', () => {
      const unknownType = [{ name: 'Unknown Rule', type: 'custom', matchCount: 10 }];

      render(<TopRulesCard rules={unknownType} />);

      expect(screen.getByText('Unknown Rule')).toBeInTheDocument();
      expect(screen.getByText('custom')).toBeInTheDocument();
    });

    it('should handle rules with same match count', () => {
      const sameCount = [
        { name: 'Rule A', type: 'extension', matchCount: 50 },
        { name: 'Rule B', type: 'keyword', matchCount: 50 },
      ];

      render(<TopRulesCard rules={sameCount} />);

      expect(screen.getByText('Rule A')).toBeInTheDocument();
      expect(screen.getByText('Rule B')).toBeInTheDocument();
    });

    it('should handle zero match count', () => {
      const zeroCount = [{ name: 'Unused Rule', type: 'extension', matchCount: 0 }];

      render(<TopRulesCard rules={zeroCount} />);

      expect(screen.getByText('Unused Rule')).toBeInTheDocument();
      expect(screen.getByText('Total matches: 0')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Icons
  // ===========================================================================

  describe('icons', () => {
    it('should render icons for each rule type', () => {
      const { container } = render(<TopRulesCard rules={mockRules} />);

      // Lucide icons render as SVG
      const icons = container.querySelectorAll('svg');
      // Title icon + 4 rule type icons
      expect(icons.length).toBe(5);
    });
  });
});
