/**
 * CloudDriveSettings Component Tests
 * ===================================
 * Tests for the cloud drive configuration settings component
 *
 * Categories:
 * - Loading State: Skeleton display
 * - No Drives State: Empty message, instructions
 * - Detected Drives: Section title, DriveCards, Add button
 * - Configured Drives: Section title, DriveCards, star icon, Remove button
 * - DriveCard: Name/type, path, JD folder, buttons
 * - JDPathModal: Modal render, input, validation, save/cancel
 * - Rescan: Click handler, spinner, disabled state
 * - Error Handling: Error display
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CloudDriveSettings from './CloudDriveSettings';

// =============================================================================
// Mock Setup
// =============================================================================

const mockDetectedDrives = [
  {
    id: 'icloud-detected',
    name: 'iCloud Drive',
    drive_type: 'icloud',
    detectedPath: '/Users/test/Library/Mobile Documents',
  },
  {
    id: 'dropbox-detected',
    name: 'Dropbox',
    drive_type: 'dropbox',
    detectedPath: '/Users/test/Dropbox',
  },
];

const mockConfiguredDrives = [
  {
    id: 'onedrive-configured',
    name: 'OneDrive',
    drive_type: 'onedrive',
    base_path: '/Users/test/OneDrive',
    jd_root_path: 'JohnnyDecimal',
  },
];

const {
  mockDetectAllDrives,
  mockGetCloudDrives,
  mockGetDefaultCloudDrive,
  mockSetDefaultCloudDrive,
  mockConfigureDetectedDrive,
  mockDeleteCloudDrive,
  mockUpdateCloudDrive,
  mockDirectoryExists,
} = vi.hoisted(() => ({
  mockDetectAllDrives: vi.fn(),
  mockGetCloudDrives: vi.fn(),
  mockGetDefaultCloudDrive: vi.fn(),
  mockSetDefaultCloudDrive: vi.fn(),
  mockConfigureDetectedDrive: vi.fn(),
  mockDeleteCloudDrive: vi.fn(),
  mockUpdateCloudDrive: vi.fn(),
  mockDirectoryExists: vi.fn(),
}));

vi.mock('../../services/cloudDriveService.js', () => ({
  detectAllDrives: () => mockDetectAllDrives(),
  detectAndCompare: vi.fn(),
  configureDetectedDrive: (...args) => mockConfigureDetectedDrive(...args),
  addCustomDrive: vi.fn(),
  setDriveJDRoot: vi.fn(),
  getDrivePath: vi.fn(),
  getCloudDrives: () => mockGetCloudDrives(),
  getDefaultCloudDrive: () => mockGetDefaultCloudDrive(),
  setDefaultCloudDrive: (...args) => mockSetDefaultCloudDrive(...args),
  updateCloudDrive: (...args) => mockUpdateCloudDrive(...args),
  deleteCloudDrive: (...args) => mockDeleteCloudDrive(...args),
  directoryExists: (...args) => mockDirectoryExists(...args),
}));

vi.mock('../../utils/errors.js', () => ({
  sanitizeErrorForUser: (e) => e.message || 'An error occurred',
}));

// =============================================================================
// Helper Functions
// =============================================================================

function setupMocks({ configured = [], detected = [], defaultDrive = null } = {}) {
  mockGetCloudDrives.mockReturnValue(configured);
  mockDetectAllDrives.mockResolvedValue(detected);
  mockGetDefaultCloudDrive.mockReturnValue(defaultDrive);
  mockDirectoryExists.mockResolvedValue(true);
}

// =============================================================================
// Loading State Tests
// =============================================================================

describe('CloudDriveSettings Loading State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton initially', async () => {
    // Make the promise never resolve to keep loading state
    mockGetCloudDrives.mockReturnValue([]);
    mockDetectAllDrives.mockImplementation(() => new Promise(() => {}));
    mockGetDefaultCloudDrive.mockReturnValue(null);

    render(<CloudDriveSettings />);

    // Should show skeleton (animate-pulse class)
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('hides loading skeleton after data loads', async () => {
    setupMocks({ configured: [], detected: [] });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });
  });
});

// =============================================================================
// No Drives State Tests
// =============================================================================

describe('CloudDriveSettings No Drives State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state message when no drives detected or configured', async () => {
    setupMocks({ configured: [], detected: [] });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('No cloud drives detected.')).toBeInTheDocument();
    });
  });

  it('shows instructions for installing cloud drives', async () => {
    setupMocks({ configured: [], detected: [] });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(
        screen.getByText(/Install iCloud, Dropbox, OneDrive, or Google Drive/)
      ).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Detected Drives Tests
// =============================================================================

describe('CloudDriveSettings Detected Drives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Available Drives section when drives detected', async () => {
    setupMocks({ detected: mockDetectedDrives });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('Available Drives')).toBeInTheDocument();
    });
  });

  it('renders DriveCard for each detected drive', async () => {
    setupMocks({ detected: mockDetectedDrives });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('iCloud Drive')).toBeInTheDocument();
      // "Dropbox" appears both as drive name and type, use getAllByText
      const dropboxElements = screen.getAllByText('Dropbox');
      expect(dropboxElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows Add button on detected drives', async () => {
    setupMocks({ detected: mockDetectedDrives });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      const addButtons = screen.getAllByRole('button', { name: /Add/i });
      expect(addButtons).toHaveLength(2);
    });
  });

  it('calls configureDetectedDrive when clicking Add', async () => {
    setupMocks({ detected: mockDetectedDrives });
    const user = userEvent.setup();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('iCloud Drive')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole('button', { name: /Add/i });
    await user.click(addButtons[0]);

    expect(mockConfigureDetectedDrive).toHaveBeenCalled();
  });

  it('shows helpful description text', async () => {
    setupMocks({ detected: mockDetectedDrives });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(
        screen.getByText(/These cloud drives were detected on your system/)
      ).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Configured Drives Tests
// =============================================================================

describe('CloudDriveSettings Configured Drives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Active Drives section when drives configured', async () => {
    setupMocks({ configured: mockConfiguredDrives });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('Active Drives')).toBeInTheDocument();
    });
  });

  it('renders DriveCard for each configured drive', async () => {
    setupMocks({ configured: mockConfiguredDrives });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      // "OneDrive" appears both as drive name and type, use getAllByText
      const onedriveElements = screen.getAllByText('OneDrive');
      expect(onedriveElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows Remove button on configured drives', async () => {
    setupMocks({ configured: mockConfiguredDrives });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
    });
  });

  it('shows star button for default selection', async () => {
    setupMocks({
      configured: mockConfiguredDrives,
      defaultDrive: { id: 'onedrive-configured' },
    });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByTitle('Default drive')).toBeInTheDocument();
    });
  });

  it('shows JD folder path', async () => {
    setupMocks({ configured: mockConfiguredDrives });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('JD Folder:')).toBeInTheDocument();
      expect(screen.getByText('JohnnyDecimal')).toBeInTheDocument();
    });
  });

  it('calls setDefaultCloudDrive when clicking star', async () => {
    setupMocks({
      configured: mockConfiguredDrives,
      defaultDrive: null,
    });
    const user = userEvent.setup();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByTitle('Set as default')).toBeInTheDocument();
    });

    await user.click(screen.getByTitle('Set as default'));

    expect(mockSetDefaultCloudDrive).toHaveBeenCalledWith('onedrive-configured');
  });
});

// =============================================================================
// Remove Drive Tests
// =============================================================================

describe('CloudDriveSettings Remove Drive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows confirmation dialog when removing', async () => {
    setupMocks({ configured: mockConfiguredDrives });
    const user = userEvent.setup();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Remove/i }));

    expect(window.confirm).toHaveBeenCalled();
  });

  it('calls deleteCloudDrive when confirmed', async () => {
    setupMocks({ configured: mockConfiguredDrives });
    const user = userEvent.setup();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Remove/i }));

    expect(mockDeleteCloudDrive).toHaveBeenCalledWith('onedrive-configured');
  });

  it('does not remove when canceled', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => false);
    setupMocks({ configured: mockConfiguredDrives });
    const user = userEvent.setup();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Remove/i }));

    expect(mockDeleteCloudDrive).not.toHaveBeenCalled();
  });
});

// =============================================================================
// JDPathModal Tests
// =============================================================================

describe('CloudDriveSettings JDPathModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens modal when clicking JD folder path', async () => {
    setupMocks({ configured: mockConfiguredDrives });
    const user = userEvent.setup();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('JohnnyDecimal')).toBeInTheDocument();
    });

    await user.click(screen.getByText('JohnnyDecimal'));

    await waitFor(() => {
      expect(screen.getByText('Set JD Folder Location')).toBeInTheDocument();
    });
  });

  it('shows input field in modal', async () => {
    setupMocks({ configured: mockConfiguredDrives });
    const user = userEvent.setup();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('JohnnyDecimal')).toBeInTheDocument();
    });

    await user.click(screen.getByText('JohnnyDecimal'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/JohnnyDecimal or Documents/)).toBeInTheDocument();
    });
  });

  it('closes modal when clicking Cancel', async () => {
    setupMocks({ configured: mockConfiguredDrives });
    const user = userEvent.setup();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('JohnnyDecimal')).toBeInTheDocument();
    });

    await user.click(screen.getByText('JohnnyDecimal'));

    await waitFor(() => {
      expect(screen.getByText('Set JD Folder Location')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Set JD Folder Location')).not.toBeInTheDocument();
    });
  });

  it('calls updateCloudDrive when saving', async () => {
    setupMocks({ configured: mockConfiguredDrives });
    const user = userEvent.setup();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('JohnnyDecimal')).toBeInTheDocument();
    });

    await user.click(screen.getByText('JohnnyDecimal'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/JohnnyDecimal or Documents/)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/JohnnyDecimal or Documents/);
    await user.clear(input);
    await user.type(input, 'NewFolder');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdateCloudDrive).toHaveBeenCalledWith('onedrive-configured', {
        jd_root_path: 'NewFolder',
      });
    });
  });

  it('shows error when directory does not exist', async () => {
    setupMocks({ configured: mockConfiguredDrives });
    // Override AFTER setupMocks (which sets it to true by default)
    mockDirectoryExists.mockResolvedValue(false);
    const user = userEvent.setup();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('JohnnyDecimal')).toBeInTheDocument();
    });

    await user.click(screen.getByText('JohnnyDecimal'));

    const input = screen.getByPlaceholderText(/JohnnyDecimal or Documents/);
    await user.clear(input);
    await user.type(input, 'NonExistentFolder');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText(/Folder not found/)).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Rescan Tests
// =============================================================================

describe('CloudDriveSettings Rescan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Rescan button', async () => {
    setupMocks();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Rescan/i })).toBeInTheDocument();
    });
  });

  it('calls detectAllDrives when clicking Rescan', async () => {
    setupMocks();
    const user = userEvent.setup();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Rescan/i })).toBeInTheDocument();
    });

    // Clear the call count from initial load
    mockDetectAllDrives.mockClear();

    await user.click(screen.getByRole('button', { name: /Rescan/i }));

    await waitFor(() => {
      expect(mockDetectAllDrives).toHaveBeenCalled();
    });
  });

  it('shows spinning animation while scanning', async () => {
    // Make detection slow
    mockDetectAllDrives.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 1000))
    );
    setupMocks();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Rescan/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Rescan/i }));

    // Check for spinning animation
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('CloudDriveSettings Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error when detection fails', async () => {
    mockGetCloudDrives.mockReturnValue([]);
    mockDetectAllDrives.mockRejectedValue(new Error('Detection failed'));
    mockGetDefaultCloudDrive.mockReturnValue(null);

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('Detection failed')).toBeInTheDocument();
    });
  });

  it('displays error when configure fails', async () => {
    setupMocks({ detected: mockDetectedDrives });
    mockConfigureDetectedDrive.mockImplementation(() => {
      throw new Error('Configuration failed');
    });
    const user = userEvent.setup();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('iCloud Drive')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole('button', { name: /Add/i });
    await user.click(addButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Configuration failed')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Header and Info Box Tests
// =============================================================================

describe('CloudDriveSettings Header and Info', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header with title', async () => {
    setupMocks();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Cloud Storage' })).toBeInTheDocument();
    });
  });

  it('renders description text', async () => {
    setupMocks();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('Configure where your JDex files are stored')).toBeInTheDocument();
    });
  });

  it('renders how it works info box', async () => {
    setupMocks();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('How it works')).toBeInTheDocument();
    });
  });

  it('explains default drive in info box', async () => {
    setupMocks();

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText(/default drive/)).toBeInTheDocument();
    });
  });
});

// =============================================================================
// DriveCard Type Display Tests
// =============================================================================

describe('CloudDriveSettings DriveCard Types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows correct label for iCloud drive', async () => {
    setupMocks({
      detected: [
        { id: 'test-icloud', name: 'My iCloud', drive_type: 'icloud', detectedPath: '/test' },
      ],
    });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('iCloud')).toBeInTheDocument();
    });
  });

  it('shows correct label for Dropbox drive', async () => {
    setupMocks({
      detected: [
        { id: 'test-dropbox', name: 'My Dropbox', drive_type: 'dropbox', detectedPath: '/test' },
      ],
    });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('Dropbox')).toBeInTheDocument();
    });
  });

  it('shows correct label for OneDrive', async () => {
    setupMocks({
      detected: [
        { id: 'test-onedrive', name: 'My OneDrive', drive_type: 'onedrive', detectedPath: '/test' },
      ],
    });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('OneDrive')).toBeInTheDocument();
    });
  });

  it('shows drive path in card', async () => {
    setupMocks({ configured: mockConfiguredDrives });

    render(<CloudDriveSettings />);

    await waitFor(() => {
      expect(screen.getByText('/Users/test/OneDrive')).toBeInTheDocument();
    });
  });
});
