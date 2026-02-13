/**
 * StatsDashboard Component Tests
 * ==============================
 * Tests for the premium statistics dashboard component.
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StatsDashboard from './StatsDashboard.jsx';

// Store original ResizeObserver
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

// Mock the LicenseContext
const mockShowUpgradePrompt = vi.fn();
vi.mock('../../context/LicenseContext.jsx', () => ({
  useLicense: vi.fn(() => ({
    isPremium: true,
    showUpgradePrompt: mockShowUpgradePrompt,
  })),
}));

// Mock the statistics service
vi.mock('../../services/statisticsService.js', () => ({
  getDashboardStats: vi.fn(() => ({
    totalOrganized: 250,
    thisMonth: 45,
    activeRules: 8,
    topCategory: 'Finance',
    activityByDay: [
      { date: '2024-01-01', count: 10 },
      { date: '2024-01-02', count: 15 },
    ],
    filesByType: [
      { type: 'PDF', count: 100 },
      { type: 'DOCX', count: 50 },
    ],
    topRules: [{ name: 'PDF Rule', type: 'extension', matchCount: 75 }],
    watchActivity: {
      folders: 3,
      today: 12,
      total: 156,
    },
  })),
  hasStatisticsData: vi.fn(() => true),
}));

import { useLicense } from '../../context/LicenseContext.jsx';
import { getDashboardStats } from '../../services/statisticsService.js';

describe('StatsDashboard', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to premium user by default
    useLicense.mockReturnValue({
      isPremium: true,
      showUpgradePrompt: mockShowUpgradePrompt,
    });
  });

  // ===========================================================================
  // Premium Gate (Free Users)
  // ===========================================================================

  describe('premium gate', () => {
    beforeEach(() => {
      useLicense.mockReturnValue({
        isPremium: false,
        showUpgradePrompt: mockShowUpgradePrompt,
      });
    });

    it('should show premium feature prompt for free users', () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      expect(screen.getByText('Premium Feature')).toBeInTheDocument();
    });

    it('should show upgrade benefits', () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      expect(screen.getByText('Total files organized over time')).toBeInTheDocument();
      expect(screen.getByText('File type distribution charts')).toBeInTheDocument();
      expect(screen.getByText('Most effective rules analysis')).toBeInTheDocument();
    });

    it('should call onClose when Maybe Later clicked', () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      const laterButton = screen.getByText('Maybe Later');
      fireEvent.click(laterButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call showUpgradePrompt when Upgrade clicked', () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      const upgradeButton = screen.getByText('Upgrade');
      fireEvent.click(upgradeButton);

      expect(mockShowUpgradePrompt).toHaveBeenCalledWith('Statistics Dashboard');
    });

    it('should have close button in premium gate', () => {
      const { container } = render(<StatsDashboard onClose={mockOnClose} />);

      // Find the X button in the header
      const closeButtons = container.querySelectorAll('button');
      // Click the close button (first one should be the X)
      fireEvent.click(closeButtons[0]);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Premium User - With Data
  // ===========================================================================

  describe('premium user with data', () => {
    it('should render dashboard header', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Statistics Dashboard')).toBeInTheDocument();
      });
    });

    it('should render PRO badge', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('PRO')).toBeInTheDocument();
      });
    });

    it('should render subtitle', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Your organization activity at a glance')).toBeInTheDocument();
      });
    });

    it('should render period selector', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
    });

    it('should have period options', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
      });

      // Check options exist
      expect(screen.getByText('Last 7 days')).toBeInTheDocument();
      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
      expect(screen.getByText('Last 90 days')).toBeInTheDocument();
    });

    it('should render stat cards', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Total Organized')).toBeInTheDocument();
        expect(screen.getByText('This Month')).toBeInTheDocument();
        expect(screen.getByText('Active Rules')).toBeInTheDocument();
        expect(screen.getByText('Top Category')).toBeInTheDocument();
      });
    });

    it('should display stats values', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('250')).toBeInTheDocument(); // totalOrganized
        expect(screen.getByText('45')).toBeInTheDocument(); // thisMonth
        expect(screen.getByText('8')).toBeInTheDocument(); // activeRules
        expect(screen.getByText('Finance')).toBeInTheDocument(); // topCategory
      });
    });

    it('should render activity chart section', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Files Organized Over Time')).toBeInTheDocument();
      });
    });

    it('should render file type chart section', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Files by Type')).toBeInTheDocument();
      });
    });

    it('should render top rules section', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Top Organization Rules')).toBeInTheDocument();
      });
    });

    it('should render watch activity section', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Watch Folder Activity')).toBeInTheDocument();
      });
    });

    it('should call onClose when close button clicked', async () => {
      const { container } = render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Statistics Dashboard')).toBeInTheDocument();
      });

      // Find the close button (button with X icon)
      const closeButton = container.querySelector('button svg.lucide-x')?.closest('button');
      expect(closeButton).toBeTruthy();

      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Empty State (Premium User, No Data)
  // ===========================================================================

  describe('empty state', () => {
    beforeEach(() => {
      getDashboardStats.mockReturnValue({
        totalOrganized: 0,
        thisMonth: 0,
        activeRules: 0,
        topCategory: null,
        activityByDay: [],
        filesByType: [],
        topRules: [],
        watchActivity: { folders: 0, today: 0, total: 0 },
      });
    });

    it('should show empty state message', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('No Statistics Yet')).toBeInTheDocument();
      });
    });

    it('should show instruction text', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(
          screen.getByText(/Start organizing files with the File Organizer/)
        ).toBeInTheDocument();
      });
    });

    it('should have Start Organizing button', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Start Organizing')).toBeInTheDocument();
      });
    });

    it('should call onClose when Start Organizing clicked', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        const button = screen.getByText('Start Organizing');
        fireEvent.click(button);
      });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Watch Activity States
  // ===========================================================================

  describe('watch activity states', () => {
    it('should show watch activity stats when folders configured', async () => {
      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Active Folders')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('Today')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('Total Events')).toBeInTheDocument();
        expect(screen.getByText('156')).toBeInTheDocument();
      });
    });

    it('should show empty watch state when no folders', async () => {
      getDashboardStats.mockReturnValue({
        totalOrganized: 100,
        thisMonth: 20,
        activeRules: 5,
        topCategory: 'Work',
        activityByDay: [{ date: '2024-01-01', count: 10 }],
        filesByType: [{ type: 'PDF', count: 50 }],
        topRules: [{ name: 'Test', type: 'extension', matchCount: 30 }],
        watchActivity: { folders: 0, today: 0, total: 0 },
      });

      render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('No watch folders configured')).toBeInTheDocument();
        expect(screen.getByText('Set up watch folders to auto-organize files')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Refresh
  // ===========================================================================

  describe('refresh', () => {
    it('should have refresh button', async () => {
      const { container } = render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Statistics Dashboard')).toBeInTheDocument();
      });

      // Look for RefreshCw icon button
      const refreshButton = container.querySelector('button[title="Refresh statistics"]');
      expect(refreshButton).toBeInTheDocument();
    });

    it('should call getDashboardStats on refresh', async () => {
      const { container } = render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Statistics Dashboard')).toBeInTheDocument();
      });

      const refreshButton = container.querySelector('button[title="Refresh statistics"]');
      expect(refreshButton).toBeTruthy();

      fireEvent.click(refreshButton);

      // getDashboardStats should be called again
      await waitFor(() => {
        expect(getDashboardStats).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render as modal overlay', async () => {
      const { container } = render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(container.querySelector('.modal-backdrop')).toBeInTheDocument();
      });
    });

    it('should render glass-card container', async () => {
      const { container } = render(<StatsDashboard onClose={mockOnClose} />);

      await waitFor(() => {
        expect(container.querySelector('.glass-card')).toBeInTheDocument();
      });
    });
  });
});
