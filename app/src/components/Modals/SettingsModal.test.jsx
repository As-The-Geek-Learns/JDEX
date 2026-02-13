/**
 * SettingsModal Component Tests
 * =============================
 * Tests for the settings modal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsModal from './SettingsModal.jsx';

// Mock child components
vi.mock('../Settings/AreasTab.jsx', () => ({
  default: vi.fn(() => <div data-testid="areas-tab">Areas Tab Content</div>),
}));

vi.mock('../Settings/CategoriesTab.jsx', () => ({
  default: vi.fn(() => <div data-testid="categories-tab">Categories Tab Content</div>),
}));

vi.mock('../Settings/DatabaseTab.jsx', () => ({
  default: vi.fn(() => <div data-testid="database-tab">Database Tab Content</div>),
}));

vi.mock('../Settings/CloudDriveSettings.jsx', () => ({
  default: vi.fn(() => <div data-testid="cloud-tab">Cloud Drive Settings</div>),
}));

vi.mock('../Settings/LicenseSettings.jsx', () => ({
  default: vi.fn(() => <div data-testid="license-tab">License Settings</div>),
}));

vi.mock('../Settings/FeedbackSettings.jsx', () => ({
  default: vi.fn(() => <div data-testid="feedback-tab">Feedback Settings</div>),
}));

describe('SettingsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnDataChange = vi.fn();

  const mockAreas = [
    { id: 1, name: 'Finance', range_start: 10, range_end: 19 },
    { id: 2, name: 'Personal', range_start: 20, range_end: 29 },
  ];

  const mockCategories = [
    { id: 1, number: 11, name: 'Banking', area_id: 1 },
    { id: 2, number: 12, name: 'Investments', area_id: 1 },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    areas: mockAreas,
    categories: mockCategories,
    onDataChange: mockOnDataChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Visibility
  // ===========================================================================

  describe('visibility', () => {
    it('should render when isOpen is true', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByText('System Settings')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<SettingsModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('System Settings')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Header
  // ===========================================================================

  describe('header', () => {
    it('should render title', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByText('System Settings')).toBeInTheDocument();
    });

    it('should render close button', () => {
      const { container } = render(<SettingsModal {...defaultProps} />);

      const closeButtons = container.querySelectorAll('button');
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('should call onClose when close button clicked', () => {
      const { container } = render(<SettingsModal {...defaultProps} />);

      // Find close button (button with X icon)
      const closeButton = container.querySelector('button svg.lucide-x')?.closest('button');
      expect(closeButton).toBeTruthy();

      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Tabs
  // ===========================================================================

  describe('tabs', () => {
    it('should render Areas tab', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByText('Areas')).toBeInTheDocument();
    });

    it('should render Categories tab', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByText('Categories')).toBeInTheDocument();
    });

    it('should render Cloud Storage tab', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByText('Cloud Storage')).toBeInTheDocument();
    });

    it('should render License tab', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByText('License')).toBeInTheDocument();
    });

    it('should render Database tab', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByText('Database')).toBeInTheDocument();
    });

    it('should render Feedback tab', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByText('Feedback')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Tab Navigation
  // ===========================================================================

  describe('tab navigation', () => {
    it('should show Areas tab content by default', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByTestId('areas-tab')).toBeInTheDocument();
    });

    it('should switch to Categories tab when clicked', () => {
      render(<SettingsModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Categories'));

      expect(screen.getByTestId('categories-tab')).toBeInTheDocument();
      expect(screen.queryByTestId('areas-tab')).not.toBeInTheDocument();
    });

    it('should switch to Cloud Storage tab when clicked', () => {
      render(<SettingsModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Cloud Storage'));

      expect(screen.getByTestId('cloud-tab')).toBeInTheDocument();
    });

    it('should switch to License tab when clicked', () => {
      render(<SettingsModal {...defaultProps} />);

      fireEvent.click(screen.getByText('License'));

      expect(screen.getByTestId('license-tab')).toBeInTheDocument();
    });

    it('should switch to Database tab when clicked', () => {
      render(<SettingsModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Database'));

      expect(screen.getByTestId('database-tab')).toBeInTheDocument();
    });

    it('should switch to Feedback tab when clicked', () => {
      render(<SettingsModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Feedback'));

      expect(screen.getByTestId('feedback-tab')).toBeInTheDocument();
    });

    it('should highlight active tab', () => {
      render(<SettingsModal {...defaultProps} />);

      const areasTab = screen.getByText('Areas').closest('button');
      expect(areasTab).toHaveClass('text-teal-400');
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render modal backdrop', () => {
      const { container } = render(<SettingsModal {...defaultProps} />);

      expect(container.querySelector('.modal-backdrop')).toBeInTheDocument();
    });

    it('should render glass-card container', () => {
      const { container } = render(<SettingsModal {...defaultProps} />);

      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });

    it('should have fixed positioning', () => {
      const { container } = render(<SettingsModal {...defaultProps} />);

      const backdrop = container.querySelector('.fixed');
      expect(backdrop).toBeInTheDocument();
    });
  });
});
