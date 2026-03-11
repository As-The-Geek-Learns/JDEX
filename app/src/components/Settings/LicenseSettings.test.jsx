/**
 * LicenseSettings Component Tests
 * ================================
 * Tests for the license management settings component
 *
 * Categories:
 * - Free Tier Display: Status, activation form, usage warning, features
 * - Premium Tier Display: Status, email, deactivate button
 * - License Activation: Validation, uppercase conversion, loading, success/error
 * - Deactivation Flow: Confirmation dialog, cancel, confirm
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LicenseSettings from './LicenseSettings';

// =============================================================================
// Mock Setup
// =============================================================================

const { mockUseLicense, mockActivateLicense, mockDeactivateLicense, LICENSE_TIERS, FEATURE_INFO } =
  vi.hoisted(() => {
    const LICENSE_TIERS = {
      FREE: {
        id: 'free',
        name: 'Free',
        limits: {
          filesPerMonth: 50,
          rulesCount: 5,
          cloudDrives: 1,
          scanDepth: 5,
        },
        features: {
          fileOrganizer: true,
          cloudSync: false,
          advancedRules: false,
          batchOperations: false,
          rollback: false,
          watchFolders: false,
          prioritySupport: false,
        },
      },
      PREMIUM: {
        id: 'premium',
        name: 'Premium',
        limits: {
          filesPerMonth: Infinity,
          rulesCount: Infinity,
          cloudDrives: Infinity,
          scanDepth: Infinity,
        },
        features: {
          fileOrganizer: true,
          cloudSync: true,
          advancedRules: true,
          batchOperations: true,
          rollback: true,
          watchFolders: true,
          prioritySupport: true,
        },
      },
    };

    const FEATURE_INFO = {
      fileOrganizer: {
        name: 'File Organizer',
        description: 'Scan and organize files into JD folders',
        freeLimit: '50 files/month',
      },
      watchFolders: {
        name: 'Watch Folders',
        description: 'Automatically organize files as they arrive',
        freeLimit: 'Not available',
      },
      cloudSync: {
        name: 'Cloud Drive Integration',
        description: 'Connect multiple cloud drives',
        freeLimit: '1 drive only',
      },
    };

    return {
      mockUseLicense: vi.fn(),
      mockActivateLicense: vi.fn(),
      mockDeactivateLicense: vi.fn(),
      LICENSE_TIERS,
      FEATURE_INFO,
    };
  });

// Mock the LicenseContext
vi.mock('../../context/LicenseContext.jsx', () => ({
  useLicense: () => mockUseLicense(),
  UsageLimitWarning: ({ metric, current, limit }) => (
    <div data-testid="usage-limit-warning">
      {metric}: {current}/{limit === Infinity ? '∞' : limit}
    </div>
  ),
}));

// =============================================================================
// Helper Functions
// =============================================================================

function createFreeLicenseState(overrides = {}) {
  return {
    isPremium: false,
    tier: LICENSE_TIERS.FREE,
    license: null,
    usage: { filesOrganized: 15, rulesCreated: 2 },
    loading: false,
    error: null,
    activateLicense: mockActivateLicense,
    deactivateLicense: mockDeactivateLicense,
    FEATURE_INFO,
    ...overrides,
  };
}

function createPremiumLicenseState(overrides = {}) {
  return {
    isPremium: true,
    tier: LICENSE_TIERS.PREMIUM,
    license: {
      key: 'TEST-LICENSE-KEY-1234',
      email: 'test@example.com',
      activatedAt: '2026-01-15T10:00:00Z',
    },
    usage: { filesOrganized: 500, rulesCreated: 25 },
    loading: false,
    error: null,
    activateLicense: mockActivateLicense,
    deactivateLicense: mockDeactivateLicense,
    FEATURE_INFO,
    ...overrides,
  };
}

// =============================================================================
// Free Tier Display Tests
// =============================================================================

describe('LicenseSettings Free Tier Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Free Tier status', () => {
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    render(<LicenseSettings />);

    expect(screen.getByText('Free Tier')).toBeInTheDocument();
  });

  it('shows license activation form', () => {
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    render(<LicenseSettings />);

    expect(screen.getByText('Activate License')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
  });

  it('shows Gumroad purchase link', () => {
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    render(<LicenseSettings />);

    const link = screen.getByRole('link', { name: /Get Premium License/i });
    expect(link).toHaveAttribute('href', 'https://jamescruce.gumroad.com/l/jdex-premium');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows usage warning component', () => {
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    render(<LicenseSettings />);

    expect(screen.getByTestId('usage-limit-warning')).toBeInTheDocument();
    expect(screen.getByText('filesOrganized: 15/50')).toBeInTheDocument();
  });

  it('shows feature list with premium badges for locked features', () => {
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    render(<LicenseSettings />);

    // Check that locked features show "Premium" badge
    const premiumBadges = screen.getAllByText('Premium');
    expect(premiumBadges.length).toBeGreaterThan(0);

    // File Organizer is available on free tier
    expect(screen.getByText('File Organizer')).toBeInTheDocument();
  });

  it('does not show deactivate button on free tier', () => {
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    render(<LicenseSettings />);

    expect(screen.queryByText('Deactivate')).not.toBeInTheDocument();
  });
});

// =============================================================================
// Premium Tier Display Tests
// =============================================================================

describe('LicenseSettings Premium Tier Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Premium License status', () => {
    mockUseLicense.mockReturnValue(createPremiumLicenseState());
    render(<LicenseSettings />);

    expect(screen.getByText('Premium License')).toBeInTheDocument();
  });

  it('shows license email', () => {
    mockUseLicense.mockReturnValue(createPremiumLicenseState());
    render(<LicenseSettings />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows activation date', () => {
    mockUseLicense.mockReturnValue(createPremiumLicenseState());
    render(<LicenseSettings />);

    // Date formatting may vary by locale
    expect(screen.getByText(/Activated:/)).toBeInTheDocument();
  });

  it('shows deactivate button', () => {
    mockUseLicense.mockReturnValue(createPremiumLicenseState());
    render(<LicenseSettings />);

    expect(screen.getByText('Deactivate')).toBeInTheDocument();
  });

  it('does not show activation form', () => {
    mockUseLicense.mockReturnValue(createPremiumLicenseState());
    render(<LicenseSettings />);

    expect(screen.queryByText('Activate License')).not.toBeInTheDocument();
  });

  it('shows all features as available (no Premium badges)', () => {
    mockUseLicense.mockReturnValue(createPremiumLicenseState());
    render(<LicenseSettings />);

    expect(screen.queryByText('Premium')).not.toBeInTheDocument();
  });
});

// =============================================================================
// License Activation Tests
// =============================================================================

describe('LicenseSettings Activation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables activate button when input is empty', () => {
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    render(<LicenseSettings />);

    const activateButton = screen.getByRole('button', { name: 'Activate' });
    expect(activateButton).toBeDisabled();
  });

  it('converts license key input to uppercase', async () => {
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    const user = userEvent.setup();
    render(<LicenseSettings />);

    const input = screen.getByPlaceholderText('XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX');
    await user.type(input, 'abc123');

    expect(input).toHaveValue('ABC123');
  });

  it('disables input and button while activating', async () => {
    mockActivateLicense.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
    );
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    const user = userEvent.setup();
    render(<LicenseSettings />);

    const input = screen.getByPlaceholderText('XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX');
    await user.type(input, 'TEST-KEY');

    const activateButton = screen.getByRole('button', { name: 'Activate' });
    fireEvent.click(activateButton);

    expect(screen.getByText('Activating...')).toBeInTheDocument();
    expect(input).toBeDisabled();
  });

  it('calls activateLicense with the key on submit', async () => {
    mockActivateLicense.mockResolvedValue({ success: true });
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    const user = userEvent.setup();
    render(<LicenseSettings />);

    const input = screen.getByPlaceholderText('XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX');
    await user.type(input, 'MY-LICENSE-KEY');

    const activateButton = screen.getByRole('button', { name: 'Activate' });
    fireEvent.click(activateButton);

    await waitFor(() => {
      expect(mockActivateLicense).toHaveBeenCalledWith('MY-LICENSE-KEY');
    });
  });

  it('clears input on successful activation', async () => {
    mockActivateLicense.mockResolvedValue({ success: true });
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    const user = userEvent.setup();
    render(<LicenseSettings />);

    const input = screen.getByPlaceholderText('XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX');
    await user.type(input, 'VALID-KEY');

    const activateButton = screen.getByRole('button', { name: 'Activate' });
    fireEvent.click(activateButton);

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('shows error message on activation failure', async () => {
    mockActivateLicense.mockResolvedValue({ success: false, error: 'Invalid license key' });
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    const user = userEvent.setup();
    render(<LicenseSettings />);

    const input = screen.getByPlaceholderText('XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX');
    await user.type(input, 'INVALID-KEY');

    const activateButton = screen.getByRole('button', { name: 'Activate' });
    fireEvent.click(activateButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid license key')).toBeInTheDocument();
    });
  });

  it('shows generic error if no error message provided', async () => {
    mockActivateLicense.mockResolvedValue({ success: false });
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    const user = userEvent.setup();
    render(<LicenseSettings />);

    const input = screen.getByPlaceholderText('XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX');
    await user.type(input, 'BAD-KEY');

    const activateButton = screen.getByRole('button', { name: 'Activate' });
    fireEvent.click(activateButton);

    await waitFor(() => {
      expect(screen.getByText('Activation failed')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Deactivation Flow Tests
// =============================================================================

describe('LicenseSettings Deactivation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows confirmation dialog when clicking deactivate', () => {
    mockUseLicense.mockReturnValue(createPremiumLicenseState());
    render(<LicenseSettings />);

    const deactivateButton = screen.getByText('Deactivate');
    fireEvent.click(deactivateButton);

    expect(
      screen.getByText(/Are you sure you want to deactivate your license/)
    ).toBeInTheDocument();
    expect(screen.getByText('Yes, Deactivate')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('hides confirmation dialog when clicking cancel', () => {
    mockUseLicense.mockReturnValue(createPremiumLicenseState());
    render(<LicenseSettings />);

    const deactivateButton = screen.getByText('Deactivate');
    fireEvent.click(deactivateButton);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(
      screen.queryByText(/Are you sure you want to deactivate your license/)
    ).not.toBeInTheDocument();
  });

  it('calls deactivateLicense when confirming', () => {
    mockUseLicense.mockReturnValue(createPremiumLicenseState());
    render(<LicenseSettings />);

    const deactivateButton = screen.getByText('Deactivate');
    fireEvent.click(deactivateButton);

    const confirmButton = screen.getByText('Yes, Deactivate');
    fireEvent.click(confirmButton);

    expect(mockDeactivateLicense).toHaveBeenCalled();
  });

  it('hides confirmation after confirming deactivation', () => {
    mockUseLicense.mockReturnValue(createPremiumLicenseState());
    render(<LicenseSettings />);

    const deactivateButton = screen.getByText('Deactivate');
    fireEvent.click(deactivateButton);

    const confirmButton = screen.getByText('Yes, Deactivate');
    fireEvent.click(confirmButton);

    expect(
      screen.queryByText(/Are you sure you want to deactivate your license/)
    ).not.toBeInTheDocument();
  });
});

// =============================================================================
// Header and Layout Tests
// =============================================================================

describe('LicenseSettings Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header with title and description', () => {
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    render(<LicenseSettings />);

    // The main heading is h2 with "License" text
    expect(screen.getByRole('heading', { level: 2, name: /License/i })).toBeInTheDocument();
    expect(screen.getByText('Manage your JDex license and view usage')).toBeInTheDocument();
  });

  it('renders usage section with title', () => {
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    render(<LicenseSettings />);

    expect(screen.getByText("This Month's Usage")).toBeInTheDocument();
  });

  it('renders features section with title', () => {
    mockUseLicense.mockReturnValue(createFreeLicenseState());
    render(<LicenseSettings />);

    expect(screen.getByText('Features')).toBeInTheDocument();
  });
});
