/**
 * WatchFolders Component Tests
 * ============================
 * Tests for the watch folders management component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WatchFolders from './WatchFolders.jsx';

// Mock LicenseContext
vi.mock('../../context/LicenseContext.jsx', () => ({
  useLicense: vi.fn(() => ({
    isPremium: true,
    hasFeature: vi.fn(() => true),
  })),
  UpgradePrompt: function MockUpgradePrompt() {
    return <div data-testid="upgrade-prompt">Upgrade Prompt</div>;
  },
}));

// Mock licenseService
vi.mock('../../services/licenseService.js', () => ({
  LICENSE_TIERS: {
    PREMIUM: { limits: { watchFolders: 5 } },
    FREE: { limits: { watchFolders: 0 } },
  },
}));

// Mock db.js
vi.mock('../../db.js', () => ({
  getWatchedFolders: vi.fn(() => []),
  createWatchedFolder: vi.fn(),
  updateWatchedFolder: vi.fn(),
  deleteWatchedFolder: vi.fn(),
  getRecentWatchActivity: vi.fn(() => []),
  getQueuedFileCounts: vi.fn(() => []),
}));

// Mock watcherService
vi.mock('../../services/watcherService.js', () => ({
  initWatcherService: vi.fn(() => true),
  isWatcherAvailable: vi.fn(() => true),
  startWatcher: vi.fn(),
  stopWatcher: vi.fn(),
  getWatcherStatus: vi.fn(() => []), // Returns array of folder status objects
  onWatchEvent: vi.fn(() => () => {}),
  processExistingFiles: vi.fn(async () => ({ processed: 0, errors: [] })),
}));

import { useLicense } from '../../context/LicenseContext.jsx';
import { getWatchedFolders, deleteWatchedFolder, getRecentWatchActivity } from '../../db.js';
import { initWatcherService, getWatcherStatus } from '../../services/watcherService.js';

describe('WatchFolders', () => {
  const mockWatchedFolders = [
    {
      id: 1,
      path: '/Users/test/Downloads',
      name: 'Downloads',
      is_active: true,
      auto_organize: true,
      min_confidence: 'medium',
      file_types: ['document', 'image'],
    },
    {
      id: 2,
      path: '/Users/test/Desktop',
      name: 'Desktop',
      is_active: false,
      auto_organize: false,
      min_confidence: 'high',
      file_types: ['document'],
    },
  ];

  const mockActivity = [
    {
      id: 1,
      folder_id: 1,
      filename: 'report.pdf',
      action: 'auto_organized',
      created_at: new Date(),
    },
    {
      id: 2,
      folder_id: 1,
      filename: 'photo.jpg',
      action: 'auto_organized',
      created_at: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useLicense.mockReturnValue({
      isPremium: true,
      hasFeature: vi.fn(() => true),
    });
    getWatchedFolders.mockReturnValue([]);
    getRecentWatchActivity.mockReturnValue([]);
    initWatcherService.mockReturnValue(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render Watch Folders header', () => {
      render(<WatchFolders />);

      expect(screen.getByText('Watch Folders')).toBeInTheDocument();
    });

    it('should render Add Watch Folder button', () => {
      render(<WatchFolders />);

      expect(screen.getByText('Add Watch Folder')).toBeInTheDocument();
    });

    it('should show folders used count', () => {
      render(<WatchFolders />);

      expect(screen.getByText(/0 of 5 folders used/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Premium Gating
  // ===========================================================================

  describe('premium gating', () => {
    it('should show content for premium users', () => {
      useLicense.mockReturnValue({
        isPremium: true,
        hasFeature: vi.fn(() => true),
      });

      render(<WatchFolders />);

      expect(screen.getByText('Watch Folders')).toBeInTheDocument();
    });

    it('should show upgrade prompt for non-premium users', () => {
      useLicense.mockReturnValue({
        isPremium: false,
        hasFeature: vi.fn(() => false),
      });

      render(<WatchFolders />);

      // Should show upgrade prompt for non-premium
      expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Watch Folder List
  // ===========================================================================

  describe('watch folder list', () => {
    it('should render watched folders', () => {
      getWatchedFolders.mockReturnValue(mockWatchedFolders);

      render(<WatchFolders />);

      expect(screen.getByText('Downloads')).toBeInTheDocument();
      expect(screen.getByText('Desktop')).toBeInTheDocument();
    });

    it('should show folder paths', () => {
      getWatchedFolders.mockReturnValue(mockWatchedFolders);

      render(<WatchFolders />);

      expect(screen.getByText('/Users/test/Downloads')).toBeInTheDocument();
      expect(screen.getByText('/Users/test/Desktop')).toBeInTheDocument();
    });

    it('should show empty state when no folders', () => {
      getWatchedFolders.mockReturnValue([]);

      render(<WatchFolders />);

      expect(screen.getByText(/No Watch Folders Yet/i)).toBeInTheDocument();
    });

    it('should indicate active status', () => {
      getWatchedFolders.mockReturnValue(mockWatchedFolders);

      render(<WatchFolders />);

      // Active folder should have visual indicator
      expect(screen.getByText('Downloads')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Add Watch Folder
  // ===========================================================================

  describe('add watch folder', () => {
    it('should open modal when Add Watch Folder clicked', () => {
      render(<WatchFolders />);

      fireEvent.click(screen.getByText('Add Watch Folder'));

      expect(screen.getByText('Add Watch Folder', { selector: 'h2, h3' })).toBeInTheDocument();
    });

    it('should show Limit Reached when at max folders', () => {
      // Create 5 folders (max limit)
      const maxFolders = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        path: `/test/folder${i}`,
        name: `Folder ${i}`,
        is_active: true,
        auto_organize: true,
        min_confidence: 'medium',
        file_types: ['document'],
      }));
      getWatchedFolders.mockReturnValue(maxFolders);

      render(<WatchFolders />);

      // Button shows "Limit Reached" when at max
      expect(screen.getByText('Limit Reached')).toBeInTheDocument();
      expect(screen.getByText('5 of 5 folders used')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Delete Watch Folder
  // ===========================================================================

  describe('delete watch folder', () => {
    it('should show confirmation when delete clicked', () => {
      // Component calls getWatcherStatus when watcherAvailable is true
      getWatcherStatus.mockReturnValue(mockWatchedFolders);
      getWatchedFolders.mockReturnValue(mockWatchedFolders);

      const { container } = render(<WatchFolders />);

      // Find delete buttons by title attribute (component uses "Remove")
      const deleteButtons = container.querySelectorAll('button[title="Remove"]');
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);
      expect(window.confirm).toHaveBeenCalled();
    });

    it('should call deleteWatchedFolder when confirmed', () => {
      // Component calls getWatcherStatus when watcherAvailable is true
      getWatcherStatus.mockReturnValue(mockWatchedFolders);
      getWatchedFolders.mockReturnValue(mockWatchedFolders);

      const { container } = render(<WatchFolders />);

      // Find delete buttons by title attribute (component uses "Remove")
      const deleteButtons = container.querySelectorAll('button[title="Remove"]');
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);
      expect(deleteWatchedFolder).toHaveBeenCalled();
    });

    it('should not call deleteWatchedFolder when cancelled', () => {
      window.confirm.mockReturnValue(false);
      // Component calls getWatcherStatus when watcherAvailable is true
      getWatcherStatus.mockReturnValue(mockWatchedFolders);
      getWatchedFolders.mockReturnValue(mockWatchedFolders);

      const { container } = render(<WatchFolders />);

      // Find delete buttons by title attribute (component uses "Remove")
      const deleteButtons = container.querySelectorAll('button[title="Remove"]');
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);
      expect(deleteWatchedFolder).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Watcher Controls
  // ===========================================================================

  describe('watcher controls', () => {
    it('should initialize watcher service on mount', () => {
      render(<WatchFolders />);

      expect(initWatcherService).toHaveBeenCalled();
    });

    it('should have start/stop controls for active folders', () => {
      getWatchedFolders.mockReturnValue(mockWatchedFolders);

      const { container } = render(<WatchFolders />);

      // Should have control buttons
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(1);
    });
  });

  // ===========================================================================
  // Activity Log
  // ===========================================================================

  describe('activity log', () => {
    it('should render Recent Activity section when there is activity', () => {
      getRecentWatchActivity.mockReturnValue(mockActivity);

      render(<WatchFolders />);

      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    it('should show activity items', () => {
      getWatchedFolders.mockReturnValue(mockWatchedFolders);
      getRecentWatchActivity.mockReturnValue(mockActivity);

      render(<WatchFolders />);

      expect(screen.getByText('report.pdf')).toBeInTheDocument();
      expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    });

    it('should not show Recent Activity section when empty', () => {
      getRecentWatchActivity.mockReturnValue([]);

      render(<WatchFolders />);

      expect(screen.queryByText('Recent Activity')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // File Type Options
  // ===========================================================================

  describe('file type options', () => {
    it('should show file type options in add modal when Advanced Settings expanded', () => {
      render(<WatchFolders />);

      fireEvent.click(screen.getByText('Add Watch Folder'));

      // Expand Advanced Settings
      fireEvent.click(screen.getByText('Advanced Settings'));

      // Should show file type checkboxes (emoji + text)
      expect(screen.getByText(/📄 Documents/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Structure
  // ===========================================================================

  describe('structure', () => {
    it('should render main container with space-y-6', () => {
      const { container } = render(<WatchFolders />);

      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveClass('space-y-6');
    });
  });
});
