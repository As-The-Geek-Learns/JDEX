/**
 * DatabaseTab Component Tests
 * ===========================
 * Tests for the database settings tab component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DatabaseTab from './DatabaseTab.jsx';

// Mock the db.js functions
vi.mock('../../db.js', () => ({
  executeSQL: vi.fn(() => ({ success: true, results: [] })),
  getTableData: vi.fn(() => ({
    columns: ['id', 'name'],
    rows: [
      [1, 'Test Row 1'],
      [2, 'Test Row 2'],
    ],
  })),
  resetDatabase: vi.fn(),
}));

import { executeSQL, getTableData, resetDatabase } from '../../db.js';

describe('DatabaseTab', () => {
  const mockOnDataChange = vi.fn();

  const defaultProps = {
    onDataChange: mockOnDataChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'prompt').mockReturnValue('RESET');
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render Table Browser section', () => {
      render(<DatabaseTab {...defaultProps} />);

      expect(screen.getByText('Table Browser')).toBeInTheDocument();
    });

    it('should render SQL Console section', () => {
      render(<DatabaseTab {...defaultProps} />);

      expect(screen.getByText('SQL Console')).toBeInTheDocument();
    });

    it('should render Execute button', () => {
      render(<DatabaseTab {...defaultProps} />);

      expect(screen.getByText('Execute')).toBeInTheDocument();
    });

    it('should render Clear button', () => {
      render(<DatabaseTab {...defaultProps} />);

      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('should render Reset Database button', () => {
      render(<DatabaseTab {...defaultProps} />);

      expect(screen.getByText('Reset Database')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Table Browser
  // ===========================================================================

  describe('table browser', () => {
    it('should render all table buttons', () => {
      render(<DatabaseTab {...defaultProps} />);

      expect(screen.getByText('areas')).toBeInTheDocument();
      expect(screen.getByText('categories')).toBeInTheDocument();
      expect(screen.getByText('folders')).toBeInTheDocument();
      expect(screen.getByText('items')).toBeInTheDocument();
      expect(screen.getByText('storage_locations')).toBeInTheDocument();
      expect(screen.getByText('activity_log')).toBeInTheDocument();
    });

    it('should call getTableData when table button clicked', () => {
      render(<DatabaseTab {...defaultProps} />);

      fireEvent.click(screen.getByText('areas'));

      expect(getTableData).toHaveBeenCalledWith('areas');
    });

    it('should display table data after selection', () => {
      render(<DatabaseTab {...defaultProps} />);

      fireEvent.click(screen.getByText('areas'));

      expect(screen.getByText('id')).toBeInTheDocument();
      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('Test Row 1')).toBeInTheDocument();
      expect(screen.getByText('Test Row 2')).toBeInTheDocument();
    });

    it('should highlight selected table button', () => {
      render(<DatabaseTab {...defaultProps} />);

      fireEvent.click(screen.getByText('areas'));

      const areasButton = screen.getByText('areas');
      expect(areasButton).toHaveClass('bg-teal-600');
    });

    it('should show empty state when table has no data', () => {
      getTableData.mockReturnValue({ columns: ['id'], rows: [] });

      render(<DatabaseTab {...defaultProps} />);

      fireEvent.click(screen.getByText('areas'));

      expect(screen.getByText('No data in table')).toBeInTheDocument();
    });

    it('should display NULL for null values', () => {
      getTableData.mockReturnValue({
        columns: ['id', 'description'],
        rows: [[1, null]],
      });

      render(<DatabaseTab {...defaultProps} />);

      fireEvent.click(screen.getByText('areas'));

      expect(screen.getByText('NULL')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // SQL Console
  // ===========================================================================

  describe('SQL console', () => {
    it('should render SQL textarea', () => {
      render(<DatabaseTab {...defaultProps} />);

      expect(screen.getByPlaceholderText('Enter SQL query...')).toBeInTheDocument();
    });

    it('should update textarea value when typed', () => {
      render(<DatabaseTab {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter SQL query...');
      fireEvent.change(textarea, { target: { value: 'SELECT * FROM areas' } });

      expect(textarea.value).toBe('SELECT * FROM areas');
    });

    it('should show confirmation when execute clicked', () => {
      render(<DatabaseTab {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter SQL query...');
      fireEvent.change(textarea, { target: { value: 'SELECT * FROM areas' } });
      fireEvent.click(screen.getByText('Execute'));

      expect(window.confirm).toHaveBeenCalled();
    });

    it('should call executeSQL when confirmed', () => {
      render(<DatabaseTab {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter SQL query...');
      fireEvent.change(textarea, { target: { value: 'SELECT * FROM areas' } });
      fireEvent.click(screen.getByText('Execute'));

      expect(executeSQL).toHaveBeenCalledWith('SELECT * FROM areas');
    });

    it('should not call executeSQL when cancelled', () => {
      window.confirm.mockReturnValue(false);

      render(<DatabaseTab {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter SQL query...');
      fireEvent.change(textarea, { target: { value: 'SELECT * FROM areas' } });
      fireEvent.click(screen.getByText('Execute'));

      expect(executeSQL).not.toHaveBeenCalled();
    });

    it('should not call executeSQL for empty query', () => {
      render(<DatabaseTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Execute'));

      expect(executeSQL).not.toHaveBeenCalled();
    });

    it('should show success message after successful query', () => {
      executeSQL.mockReturnValue({ success: true, results: [] });

      render(<DatabaseTab {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter SQL query...');
      fireEvent.change(textarea, { target: { value: 'SELECT * FROM areas' } });
      fireEvent.click(screen.getByText('Execute'));

      expect(screen.getByText('Query executed successfully')).toBeInTheDocument();
    });

    it('should show error message after failed query', () => {
      executeSQL.mockReturnValue({ success: false, error: 'Syntax error' });

      render(<DatabaseTab {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter SQL query...');
      fireEvent.change(textarea, { target: { value: 'INVALID SQL' } });
      fireEvent.click(screen.getByText('Execute'));

      expect(screen.getByText('Error: Syntax error')).toBeInTheDocument();
    });

    it('should display query results in table', () => {
      executeSQL.mockReturnValue({
        success: true,
        results: [
          {
            columns: ['id', 'name'],
            values: [
              [1, 'Personal'],
              [2, 'Work'],
            ],
          },
        ],
      });

      render(<DatabaseTab {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter SQL query...');
      fireEvent.change(textarea, { target: { value: 'SELECT * FROM areas' } });
      fireEvent.click(screen.getByText('Execute'));

      // Results should be displayed
      const tables = document.querySelectorAll('table');
      expect(tables.length).toBeGreaterThan(0);
    });

    it('should call onDataChange after successful modifying query', () => {
      executeSQL.mockReturnValue({ success: true, results: [] });

      render(<DatabaseTab {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter SQL query...');
      fireEvent.change(textarea, { target: { value: 'UPDATE areas SET name = "Test"' } });
      fireEvent.click(screen.getByText('Execute'));

      expect(mockOnDataChange).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Clear Button
  // ===========================================================================

  describe('clear button', () => {
    it('should clear textarea when clicked', () => {
      render(<DatabaseTab {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter SQL query...');
      fireEvent.change(textarea, { target: { value: 'SELECT * FROM areas' } });
      fireEvent.click(screen.getByText('Clear'));

      expect(textarea.value).toBe('');
    });

    it('should clear results when clicked', () => {
      executeSQL.mockReturnValue({ success: true, results: [] });

      render(<DatabaseTab {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter SQL query...');
      fireEvent.change(textarea, { target: { value: 'SELECT * FROM areas' } });
      fireEvent.click(screen.getByText('Execute'));

      expect(screen.getByText('Query executed successfully')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Clear'));

      expect(screen.queryByText('Query executed successfully')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Reset Database
  // ===========================================================================

  describe('reset database', () => {
    it('should show first confirmation dialog', () => {
      render(<DatabaseTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Reset Database'));

      expect(window.confirm).toHaveBeenCalled();
    });

    it('should show second confirmation dialog', () => {
      render(<DatabaseTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Reset Database'));

      expect(window.confirm).toHaveBeenCalledTimes(2);
    });

    it('should show prompt for RESET confirmation', () => {
      render(<DatabaseTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Reset Database'));

      expect(window.prompt).toHaveBeenCalledWith('Type RESET to confirm:');
    });

    it('should call resetDatabase when confirmed with RESET', () => {
      render(<DatabaseTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Reset Database'));

      expect(resetDatabase).toHaveBeenCalled();
    });

    it('should not call resetDatabase when prompt answer is wrong', () => {
      window.prompt.mockReturnValue('wrong');

      render(<DatabaseTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Reset Database'));

      expect(resetDatabase).not.toHaveBeenCalled();
    });

    it('should not call resetDatabase when first confirm cancelled', () => {
      window.confirm.mockReturnValueOnce(false);

      render(<DatabaseTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Reset Database'));

      expect(resetDatabase).not.toHaveBeenCalled();
    });

    it('should call onDataChange after successful reset', () => {
      render(<DatabaseTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Reset Database'));

      expect(mockOnDataChange).toHaveBeenCalled();
    });

    it('should show alert after successful reset', () => {
      render(<DatabaseTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Reset Database'));

      expect(window.alert).toHaveBeenCalledWith('Database has been reset to defaults.');
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render glass-card containers', () => {
      const { container } = render(<DatabaseTab {...defaultProps} />);

      const glassCards = container.querySelectorAll('.glass-card');
      expect(glassCards.length).toBe(2);
    });

    it('should render table icon', () => {
      const { container } = render(<DatabaseTab {...defaultProps} />);

      expect(container.querySelector('svg.lucide-table')).toBeInTheDocument();
    });

    it('should render terminal icon', () => {
      const { container } = render(<DatabaseTab {...defaultProps} />);

      expect(container.querySelector('svg.lucide-terminal')).toBeInTheDocument();
    });
  });
});
