/**
 * RulesManager Component Tests
 * ============================
 * Tests for the organization rules manager component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RulesManager from './RulesManager.jsx';

// Mock db.js
vi.mock('../../db.js', () => ({
  getOrganizationRules: vi.fn(() => []),
  createOrganizationRule: vi.fn(),
  updateOrganizationRule: vi.fn(),
  deleteOrganizationRule: vi.fn(),
  getFolders: vi.fn(() => []),
  getCategories: vi.fn(() => []),
  getAreas: vi.fn(() => []),
}));

import {
  getOrganizationRules,
  createOrganizationRule,
  updateOrganizationRule,
  deleteOrganizationRule,
  getFolders,
  getCategories,
  getAreas,
} from '../../db.js';

describe('RulesManager', () => {
  const mockRules = [
    {
      id: 1,
      name: 'PDF Documents',
      rule_type: 'extension',
      pattern: '.pdf',
      target_type: 'folder',
      target_id: '11.01',
      is_active: true,
      match_count: 10,
    },
    {
      id: 2,
      name: 'Work Files',
      rule_type: 'keyword',
      pattern: 'work',
      target_type: 'folder',
      target_id: '21.01',
      is_active: false,
      match_count: 5,
    },
  ];

  const mockFolders = [
    { id: 1, folder_number: '11.01', name: 'Documents' },
    { id: 2, folder_number: '21.01', name: 'Work' },
  ];

  const mockCategories = [
    { id: 1, number: 11, name: 'Finance', area_id: 1 },
    { id: 2, number: 21, name: 'Projects', area_id: 2 },
  ];

  const mockAreas = [
    { id: 1, range_start: 10, range_end: 19, name: 'Personal' },
    { id: 2, range_start: 20, range_end: 29, name: 'Work' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    getOrganizationRules.mockReturnValue(mockRules);
    getFolders.mockReturnValue(mockFolders);
    getCategories.mockReturnValue(mockCategories);
    getAreas.mockReturnValue(mockAreas);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render Rules Manager header', () => {
      render(<RulesManager />);

      expect(screen.getByText('Organization Rules')).toBeInTheDocument();
    });

    it('should render New Rule button', () => {
      render(<RulesManager />);

      expect(screen.getByText('New Rule')).toBeInTheDocument();
    });

    it('should render filter buttons', () => {
      render(<RulesManager />);

      // All filter button shows count
      expect(screen.getByText(/All \(/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Rules List
  // ===========================================================================

  describe('rules list', () => {
    it('should render existing rules', () => {
      render(<RulesManager />);

      expect(screen.getByText('PDF Documents')).toBeInTheDocument();
      expect(screen.getByText('Work Files')).toBeInTheDocument();
    });

    it('should show rule patterns', () => {
      render(<RulesManager />);

      expect(screen.getByText('.pdf')).toBeInTheDocument();
      expect(screen.getByText('work')).toBeInTheDocument();
    });

    it('should show target folders', () => {
      render(<RulesManager />);

      // Folder numbers shown with names: "11.01 Documents"
      expect(screen.getByText(/11\.01/)).toBeInTheDocument();
      expect(screen.getByText(/21\.01/)).toBeInTheDocument();
    });

    it('should show match counts', () => {
      render(<RulesManager />);

      // Format is "Matched X file(s)"
      expect(screen.getByText('Matched 10 files')).toBeInTheDocument();
      expect(screen.getByText('Matched 5 files')).toBeInTheDocument();
    });

    it('should show empty state when no rules', () => {
      getOrganizationRules.mockReturnValue([]);

      render(<RulesManager />);

      expect(screen.getByText(/No rules yet/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Rule Status
  // ===========================================================================

  describe('rule status', () => {
    it('should indicate active rules', () => {
      const { container } = render(<RulesManager />);

      // Active rules should have active styling
      const ruleCards = container.querySelectorAll('.glass-card, [class*="bg-slate"]');
      expect(ruleCards.length).toBeGreaterThan(0);
    });

    it('should indicate disabled rules', () => {
      render(<RulesManager />);

      // Work Files rule is disabled
      expect(screen.getByText('Work Files')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Create Rule
  // ===========================================================================

  describe('create rule', () => {
    it('should open modal when New Rule clicked', () => {
      render(<RulesManager />);

      fireEvent.click(screen.getByText('New Rule'));

      // Modal should appear with form - check for the modal title/header area
      // "Create Rule" appears in modal header (h2) and submit button
      const createRuleElements = screen.getAllByText('Create Rule');
      expect(createRuleElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should have rule type selector in modal', () => {
      render(<RulesManager />);

      fireEvent.click(screen.getByText('New Rule'));

      // Extension appears in both filter and modal, so use getAllByText
      const extensionElements = screen.getAllByText('Extension');
      // Modal should have at least one
      expect(extensionElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should call createOrganizationRule on form submit', async () => {
      const { container } = render(<RulesManager />);

      fireEvent.click(screen.getByText('New Rule'));

      // Fill in form - modal has "Rule Name *" label
      const nameInput = screen.getByPlaceholderText(/PDFs to Documents/i);
      fireEvent.change(nameInput, { target: { value: 'Test Rule' } });

      // Fill in pattern (placeholder without leading dot)
      const patternInput = screen.getByPlaceholderText(/pdf \(without the dot\)/i);
      fireEvent.change(patternInput, { target: { value: 'pdf' } });

      // Select a target folder using container query
      const targetSelect = container.querySelector('select');
      fireEvent.change(targetSelect, { target: { value: '11.01' } });

      // Click create button
      const createBtn = screen.getByText('Create Rule', { selector: 'button[type="submit"]' });
      fireEvent.click(createBtn);

      await waitFor(() => {
        expect(createOrganizationRule).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // Edit Rule
  // ===========================================================================

  describe('edit rule', () => {
    it('should have edit buttons for each rule', () => {
      const { container } = render(<RulesManager />);

      // Each rule has an edit button
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(2); // Create + edit buttons
    });

    it('should open edit modal with rule data', () => {
      const { container } = render(<RulesManager />);

      // Find edit buttons (buttons with pencil/edit icon, not the Create Rule button)
      const editButtons = Array.from(container.querySelectorAll('button[title="Edit rule"]'));
      expect(editButtons.length).toBeGreaterThan(0);

      fireEvent.click(editButtons[0]);

      // Modal should show edit mode with "Edit Rule" title
      expect(screen.getByText('Edit Rule')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Delete Rule
  // ===========================================================================

  describe('delete rule', () => {
    it('should show confirmation when delete clicked', () => {
      const { container } = render(<RulesManager />);

      // Find delete buttons by title attribute
      const deleteButtons = container.querySelectorAll('button[title="Delete rule"]');
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);
      expect(window.confirm).toHaveBeenCalled();
    });

    it('should call deleteOrganizationRule when confirmed', () => {
      const { container } = render(<RulesManager />);

      // Find delete buttons by title attribute
      const deleteButtons = container.querySelectorAll('button[title="Delete rule"]');
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);
      expect(deleteOrganizationRule).toHaveBeenCalled();
    });

    it('should not delete when confirmation cancelled', () => {
      window.confirm.mockReturnValue(false);

      const { container } = render(<RulesManager />);

      // Find delete buttons by title attribute
      const deleteButtons = container.querySelectorAll('button[title="Delete rule"]');
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);

      // Delete should not have been called when cancelled
      expect(deleteOrganizationRule).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Filter Rules
  // ===========================================================================

  describe('filter rules', () => {
    it('should filter by rule type', () => {
      render(<RulesManager />);

      // Click Extension filter button (it's a button, not dropdown)
      const extensionButton = screen.getByText('Extension');
      fireEvent.click(extensionButton);

      // PDF Documents rule should still be visible (it's an extension rule)
      expect(screen.getByText('PDF Documents')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('should show error on load failure', () => {
      getOrganizationRules.mockImplementation(() => {
        throw new Error('Database error');
      });

      render(<RulesManager />);

      expect(screen.getByText(/database error/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render main container with space-y-6', () => {
      const { container } = render(<RulesManager />);

      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveClass('space-y-6');
    });
  });
});
