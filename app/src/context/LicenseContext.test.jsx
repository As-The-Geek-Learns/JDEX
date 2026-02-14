/**
 * LicenseContext Tests
 * ====================
 * Tests for the license context provider, hook, HOC, and sub-components
 *
 * Categories:
 * - LicenseProvider: Context provider functionality
 * - useLicense Hook: Consumer hook behavior
 * - activateLicense: License activation flow
 * - deactivateLicense: License deactivation flow
 * - withPremiumFeature HOC: Feature gating
 * - UpgradePrompt: Upgrade modal component
 * - UsageLimitWarning: Usage progress bar component
 * - Periodic Validation: License revalidation interval
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  LicenseProvider,
  useLicense,
  withPremiumFeature,
  UpgradePrompt,
  UsageLimitWarning,
} from './LicenseContext';

// =============================================================================
// Mock licenseService
// =============================================================================

// =============================================================================
// Mock licenseService - vi.mock is hoisted, so we need to use vi.hoisted
// =============================================================================

const {
  mockGetLicenseState,
  mockActivateLicense,
  mockDeactivateLicense,
  mockValidateLicenseKey,
  mockCanPerformAction,
  mockIncrementUsage,
  mockHasFeature,
  mockGetRemainingQuota,
  LICENSE_TIERS,
  FEATURE_INFO,
} = vi.hoisted(() => {
  const LICENSE_TIERS = {
    FREE: {
      id: 'free',
      name: 'Free',
      limits: { filesPerMonth: 50, rulesCount: 5 },
      features: {
        fileOrganizer: true,
        cloudSync: false,
        advancedRules: false,
        watchFolders: false,
      },
    },
    PREMIUM: {
      id: 'premium',
      name: 'Premium',
      limits: { filesPerMonth: Infinity, rulesCount: Infinity },
      features: {
        fileOrganizer: true,
        cloudSync: true,
        advancedRules: true,
        watchFolders: true,
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
      description: 'Automatically organize files',
      freeLimit: 'Not available',
    },
    cloudSync: {
      name: 'Cloud Drive Integration',
      description: 'Connect cloud drives',
      freeLimit: '1 drive only',
    },
    advancedRules: {
      name: 'Advanced Rules',
      description: 'Create regex rules',
      freeLimit: '5 rules max',
    },
  };

  return {
    mockGetLicenseState: vi.fn(),
    mockActivateLicense: vi.fn(),
    mockDeactivateLicense: vi.fn(),
    mockValidateLicenseKey: vi.fn(),
    mockCanPerformAction: vi.fn(),
    mockIncrementUsage: vi.fn(),
    mockHasFeature: vi.fn(),
    mockGetRemainingQuota: vi.fn(),
    LICENSE_TIERS,
    FEATURE_INFO,
  };
});

vi.mock('../services/licenseService.js', () => ({
  getLicenseState: () => mockGetLicenseState(),
  activateLicense: (key) => mockActivateLicense(key),
  deactivateLicense: () => mockDeactivateLicense(),
  validateLicenseKey: (key) => mockValidateLicenseKey(key),
  canPerformAction: (action, count) => mockCanPerformAction(action, count),
  incrementUsage: (metric, amount) => mockIncrementUsage(metric, amount),
  hasFeature: (featureId) => mockHasFeature(featureId),
  getRemainingQuota: (metric) => mockGetRemainingQuota(metric),
  LICENSE_TIERS,
  FEATURE_INFO,
}));

// =============================================================================
// Test Setup
// =============================================================================

// Test component that uses useLicense hook
function TestConsumer({ onRender }) {
  const license = useLicense();
  if (onRender) onRender(license);
  return (
    <div>
      <span data-testid="isPremium">{String(license.isPremium)}</span>
      <span data-testid="tierName">{license.tier?.name}</span>
      <span data-testid="loading">{String(license.loading)}</span>
      <span data-testid="error">{license.error || 'none'}</span>
    </div>
  );
}

// Test component for HOC testing
function PremiumFeatureComponent() {
  return <div>Premium Feature Content</div>;
}

beforeEach(() => {
  vi.clearAllMocks();

  // Default mock implementations
  mockGetLicenseState.mockReturnValue({
    isPremium: false,
    tier: LICENSE_TIERS.FREE,
    license: null,
    usage: { filesOrganized: 0 },
  });

  mockHasFeature.mockImplementation((featureId) => {
    return LICENSE_TIERS.FREE.features[featureId] ?? false;
  });

  mockGetRemainingQuota.mockReturnValue(50);
  mockCanPerformAction.mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

// =============================================================================
// LicenseProvider Tests
// =============================================================================

describe('LicenseProvider', () => {
  it('provides initial license state from getLicenseState', () => {
    mockGetLicenseState.mockReturnValue({
      isPremium: true,
      tier: LICENSE_TIERS.PREMIUM,
      license: { key: 'TEST-KEY' },
      usage: { filesOrganized: 10 },
    });

    render(
      <LicenseProvider>
        <TestConsumer />
      </LicenseProvider>
    );

    expect(screen.getByTestId('isPremium')).toHaveTextContent('true');
    expect(screen.getByTestId('tierName')).toHaveTextContent('Premium');
  });

  it('provides loading state initially false', () => {
    render(
      <LicenseProvider>
        <TestConsumer />
      </LicenseProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('provides error state initially null', () => {
    render(
      <LicenseProvider>
        <TestConsumer />
      </LicenseProvider>
    );

    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  it('provides all expected context values', () => {
    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    expect(contextValue).toHaveProperty('isPremium');
    expect(contextValue).toHaveProperty('tier');
    expect(contextValue).toHaveProperty('license');
    expect(contextValue).toHaveProperty('usage');
    expect(contextValue).toHaveProperty('loading');
    expect(contextValue).toHaveProperty('error');
    expect(contextValue).toHaveProperty('activateLicense');
    expect(contextValue).toHaveProperty('deactivateLicense');
    expect(contextValue).toHaveProperty('checkAction');
    expect(contextValue).toHaveProperty('trackUsage');
    expect(contextValue).toHaveProperty('refreshState');
    expect(contextValue).toHaveProperty('hasFeature');
    expect(contextValue).toHaveProperty('getRemainingQuota');
    expect(contextValue).toHaveProperty('LICENSE_TIERS');
    expect(contextValue).toHaveProperty('FEATURE_INFO');
  });

  it('renders children correctly', () => {
    render(
      <LicenseProvider>
        <div data-testid="child">Child Content</div>
      </LicenseProvider>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Child Content');
  });
});

// =============================================================================
// useLicense Hook Tests
// =============================================================================

describe('useLicense hook', () => {
  it('returns context when used within provider', () => {
    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    expect(contextValue).toBeDefined();
    expect(typeof contextValue.activateLicense).toBe('function');
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useLicense must be used within a LicenseProvider');

    consoleError.mockRestore();
  });

  it('provides hasFeature function that works', () => {
    mockHasFeature.mockImplementation((id) => id === 'fileOrganizer');

    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    expect(contextValue.hasFeature('fileOrganizer')).toBe(true);
    expect(contextValue.hasFeature('watchFolders')).toBe(false);
  });

  it('provides getRemainingQuota function that works', () => {
    mockGetRemainingQuota.mockReturnValue(25);

    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    expect(contextValue.getRemainingQuota('filesOrganized')).toBe(25);
  });
});

// =============================================================================
// activateLicense Tests
// =============================================================================

describe('activateLicense', () => {
  it('sets loading to true during activation', async () => {
    const loadingStates = [];
    mockActivateLicense.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ valid: true }), 100))
    );

    render(
      <LicenseProvider>
        <TestConsumer
          onRender={(ctx) => {
            loadingStates.push(ctx.loading);
          }}
        />
      </LicenseProvider>
    );

    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    // Start activation
    act(() => {
      contextValue.activateLicense('TEST-KEY');
    });

    // Should be loading now
    await waitFor(() => {
      expect(screen.getAllByTestId('loading')[1]).toHaveTextContent('true');
    });
  });

  it('returns success with license data for valid key', async () => {
    mockActivateLicense.mockResolvedValue({
      valid: true,
      license: { key: 'VALID-KEY', email: 'test@example.com' },
    });

    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    let result;
    await act(async () => {
      result = await contextValue.activateLicense('VALID-KEY');
    });

    expect(result.success).toBe(true);
    expect(result.license).toEqual({ key: 'VALID-KEY', email: 'test@example.com' });
  });

  it('refreshes state after successful activation', async () => {
    mockActivateLicense.mockResolvedValue({ valid: true, license: { key: 'KEY' } });

    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    await act(async () => {
      await contextValue.activateLicense('KEY');
    });

    // getLicenseState should have been called again to refresh
    expect(mockGetLicenseState).toHaveBeenCalledTimes(2);
  });

  it('sets error for invalid license', async () => {
    mockActivateLicense.mockResolvedValue({ valid: false, error: 'Invalid license key' });

    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    await act(async () => {
      await contextValue.activateLicense('INVALID-KEY');
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Invalid license key');
  });

  it('returns error object for failed activation', async () => {
    mockActivateLicense.mockResolvedValue({ valid: false, error: 'License expired' });

    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    let result;
    await act(async () => {
      result = await contextValue.activateLicense('EXPIRED-KEY');
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('License expired');
  });

  it('handles exception during activation', async () => {
    mockActivateLicense.mockRejectedValue(new Error('Network error'));

    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    let result;
    await act(async () => {
      result = await contextValue.activateLicense('KEY');
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('sets loading to false after completion', async () => {
    mockActivateLicense.mockResolvedValue({ valid: true, license: {} });

    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    await act(async () => {
      await contextValue.activateLicense('KEY');
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });
});

// =============================================================================
// deactivateLicense Tests
// =============================================================================

describe('deactivateLicense', () => {
  it('calls doDeactivate from licenseService', () => {
    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    act(() => {
      contextValue.deactivateLicense();
    });

    expect(mockDeactivateLicense).toHaveBeenCalledTimes(1);
  });

  it('refreshes state after deactivation', () => {
    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    const initialCallCount = mockGetLicenseState.mock.calls.length;

    act(() => {
      contextValue.deactivateLicense();
    });

    expect(mockGetLicenseState).toHaveBeenCalledTimes(initialCallCount + 1);
  });

  it('returns success object', () => {
    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    let result;
    act(() => {
      result = contextValue.deactivateLicense();
    });

    expect(result).toEqual({ success: true });
  });
});

// =============================================================================
// checkAction and trackUsage Tests
// =============================================================================

describe('checkAction', () => {
  it('calls canPerformAction with correct arguments', () => {
    mockCanPerformAction.mockReturnValue(true);

    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    const result = contextValue.checkAction('organizeFile', 5);

    expect(mockCanPerformAction).toHaveBeenCalledWith('organizeFile', 5);
    expect(result).toBe(true);
  });

  it('uses default count of 1 when not provided', () => {
    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    contextValue.checkAction('organizeFile');

    expect(mockCanPerformAction).toHaveBeenCalledWith('organizeFile', 1);
  });
});

describe('trackUsage', () => {
  it('calls incrementUsage with correct arguments', () => {
    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    act(() => {
      contextValue.trackUsage('filesOrganized', 10);
    });

    expect(mockIncrementUsage).toHaveBeenCalledWith('filesOrganized', 10);
  });

  it('uses default amount of 1 when not provided', () => {
    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    act(() => {
      contextValue.trackUsage('filesOrganized');
    });

    expect(mockIncrementUsage).toHaveBeenCalledWith('filesOrganized', 1);
  });

  it('refreshes state after tracking', () => {
    let contextValue;
    render(
      <LicenseProvider>
        <TestConsumer onRender={(ctx) => (contextValue = ctx)} />
      </LicenseProvider>
    );

    const initialCallCount = mockGetLicenseState.mock.calls.length;

    act(() => {
      contextValue.trackUsage('filesOrganized', 1);
    });

    expect(mockGetLicenseState).toHaveBeenCalledTimes(initialCallCount + 1);
  });
});

// =============================================================================
// Periodic Validation Tests
// =============================================================================

describe('Periodic Validation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('sets up validation interval when license has key', () => {
    mockGetLicenseState.mockReturnValue({
      isPremium: true,
      tier: LICENSE_TIERS.PREMIUM,
      license: { key: 'PREMIUM-KEY' },
      usage: {},
    });

    mockValidateLicenseKey.mockResolvedValue({ valid: true });

    render(
      <LicenseProvider>
        <TestConsumer />
      </LicenseProvider>
    );

    // Advance time by 1 hour
    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });

    expect(mockValidateLicenseKey).toHaveBeenCalledWith('PREMIUM-KEY');
  });

  it('does not set up interval when no license key', () => {
    mockGetLicenseState.mockReturnValue({
      isPremium: false,
      tier: LICENSE_TIERS.FREE,
      license: null,
      usage: {},
    });

    render(
      <LicenseProvider>
        <TestConsumer />
      </LicenseProvider>
    );

    // Advance time by 1 hour
    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });

    expect(mockValidateLicenseKey).not.toHaveBeenCalled();
  });

  it('deactivates license when validation fails', async () => {
    mockGetLicenseState.mockReturnValue({
      isPremium: true,
      tier: LICENSE_TIERS.PREMIUM,
      license: { key: 'REVOKED-KEY' },
      usage: {},
    });

    // Create a promise we can resolve manually
    let resolveValidation;
    mockValidateLicenseKey.mockReturnValue(
      new Promise((resolve) => {
        resolveValidation = resolve;
      })
    );

    render(
      <LicenseProvider>
        <TestConsumer />
      </LicenseProvider>
    );

    // Advance time by 1 hour to trigger the interval
    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });

    // Verify validation was called
    expect(mockValidateLicenseKey).toHaveBeenCalledWith('REVOKED-KEY');

    // Now resolve the validation promise with failure
    await act(async () => {
      resolveValidation({ valid: false, offline: false });
    });

    expect(mockDeactivateLicense).toHaveBeenCalled();
  });

  it('does not deactivate when offline and validation fails', async () => {
    mockGetLicenseState.mockReturnValue({
      isPremium: true,
      tier: LICENSE_TIERS.PREMIUM,
      license: { key: 'OFFLINE-KEY' },
      usage: {},
    });

    // Create a promise we can resolve manually
    let resolveValidation;
    mockValidateLicenseKey.mockReturnValue(
      new Promise((resolve) => {
        resolveValidation = resolve;
      })
    );

    render(
      <LicenseProvider>
        <TestConsumer />
      </LicenseProvider>
    );

    // Advance time by 1 hour to trigger the interval
    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });

    // Verify validation was called
    expect(mockValidateLicenseKey).toHaveBeenCalledWith('OFFLINE-KEY');

    // Resolve with offline mode (validation fails but offline=true)
    await act(async () => {
      resolveValidation({ valid: false, offline: true });
    });

    // Should NOT deactivate when offline
    expect(mockDeactivateLicense).not.toHaveBeenCalled();
  });

  it('cleans up interval on unmount', () => {
    mockGetLicenseState.mockReturnValue({
      isPremium: true,
      tier: LICENSE_TIERS.PREMIUM,
      license: { key: 'KEY' },
      usage: {},
    });

    const { unmount } = render(
      <LicenseProvider>
        <TestConsumer />
      </LicenseProvider>
    );

    unmount();

    // Advance time - validation should not be called after unmount
    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });

    expect(mockValidateLicenseKey).not.toHaveBeenCalled();
  });
});

// =============================================================================
// withPremiumFeature HOC Tests
// =============================================================================

describe('withPremiumFeature HOC', () => {
  it('renders wrapped component when feature is available', () => {
    mockHasFeature.mockReturnValue(true);

    const WrappedComponent = withPremiumFeature(PremiumFeatureComponent, 'fileOrganizer');

    render(
      <LicenseProvider>
        <WrappedComponent />
      </LicenseProvider>
    );

    expect(screen.getByText('Premium Feature Content')).toBeInTheDocument();
  });

  it('renders UpgradePrompt when feature is not available', () => {
    mockHasFeature.mockReturnValue(false);

    const WrappedComponent = withPremiumFeature(PremiumFeatureComponent, 'watchFolders');

    render(
      <LicenseProvider>
        <WrappedComponent />
      </LicenseProvider>
    );

    expect(screen.queryByText('Premium Feature Content')).not.toBeInTheDocument();
    expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument();
  });

  it('passes props through to wrapped component', () => {
    mockHasFeature.mockReturnValue(true);

    function ComponentWithProps({ message }) {
      return <div>{message}</div>;
    }

    const WrappedComponent = withPremiumFeature(ComponentWithProps, 'fileOrganizer');

    render(
      <LicenseProvider>
        <WrappedComponent message="Hello World" />
      </LicenseProvider>
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});

// =============================================================================
// UpgradePrompt Component Tests
// =============================================================================

describe('UpgradePrompt', () => {
  it('renders feature name in header from FEATURE_INFO', () => {
    render(<UpgradePrompt feature="watchFolders" />);

    // Feature name appears in header (h4) - use role to be more specific
    const heading = screen.getByRole('heading', { name: 'Watch Folders', level: 4 });
    expect(heading).toBeInTheDocument();
  });

  it('renders feature description', () => {
    render(<UpgradePrompt feature="watchFolders" />);

    expect(screen.getByText('Automatically organize files')).toBeInTheDocument();
  });

  it('renders free vs premium comparison', () => {
    render(<UpgradePrompt feature="watchFolders" />);

    expect(screen.getByText('Free tier:')).toBeInTheDocument();
    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(screen.getByText('Premium:')).toBeInTheDocument();
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
  });

  it('renders purchase link to Gumroad', () => {
    render(<UpgradePrompt feature="fileOrganizer" />);

    const purchaseLink = screen.getByRole('link', { name: /Get Premium/i });
    expect(purchaseLink).toHaveAttribute('href', 'https://jamescruce.gumroad.com/l/jdex-premium');
    expect(purchaseLink).toHaveAttribute('target', '_blank');
  });

  it('renders close button when onClose provided', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<UpgradePrompt feature="fileOrganizer" onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /Maybe later/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render close button when onClose not provided', () => {
    render(<UpgradePrompt feature="fileOrganizer" />);

    expect(screen.queryByRole('button', { name: /Maybe later/i })).not.toBeInTheDocument();
  });

  it('applies inline styles when inline prop is true', () => {
    const { container } = render(<UpgradePrompt feature="fileOrganizer" inline />);

    // When inline, it should not have the fixed inset-0 classes
    const outerDiv = container.firstChild;
    expect(outerDiv).not.toHaveClass('fixed');
  });

  it('renders benefits list with feature names', () => {
    render(<UpgradePrompt feature="fileOrganizer" />);

    // Benefits are in a ul with list items containing checkmarks
    const benefitsList = screen.getByRole('list');
    const listItems = benefitsList.querySelectorAll('li');

    // Should have 4 list items (first 4 features)
    expect(listItems.length).toBe(4);

    // Check that the list contains expected feature names
    expect(benefitsList).toHaveTextContent('File Organizer');
    expect(benefitsList).toHaveTextContent('Watch Folders');
    expect(benefitsList).toHaveTextContent('Cloud Drive Integration');
    expect(benefitsList).toHaveTextContent('Advanced Rules');
  });

  it('handles unknown feature gracefully', () => {
    render(<UpgradePrompt feature="unknownFeature" />);

    // Should show default text in h4 heading
    const heading = screen.getByRole('heading', { name: 'Premium Feature', level: 4 });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('This feature requires a premium license')).toBeInTheDocument();
  });
});

// =============================================================================
// UsageLimitWarning Component Tests
// =============================================================================

describe('UsageLimitWarning', () => {
  it('returns null when limit is Infinity', () => {
    const { container } = render(
      <UsageLimitWarning metric="filesOrganized" current={100} limit={Infinity} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders progress bar at correct percentage', () => {
    const { container } = render(
      <UsageLimitWarning metric="filesOrganized" current={25} limit={50} />
    );

    // 25/50 = 50%
    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).toHaveStyle({ width: '50%' });
  });

  it('shows current and limit values', () => {
    render(<UsageLimitWarning metric="filesOrganized" current={30} limit={50} />);

    expect(screen.getByText('30 / 50')).toBeInTheDocument();
  });

  it('shows "Files this month" for filesOrganized metric', () => {
    render(<UsageLimitWarning metric="filesOrganized" current={10} limit={50} />);

    expect(screen.getByText('Files this month')).toBeInTheDocument();
  });

  it('shows metric name for other metrics', () => {
    render(<UsageLimitWarning metric="rulesCreated" current={3} limit={5} />);

    expect(screen.getByText('rulesCreated')).toBeInTheDocument();
  });

  it('applies yellow styling when >= 80% usage', () => {
    const { container } = render(
      <UsageLimitWarning metric="filesOrganized" current={40} limit={50} />
    );

    // 40/50 = 80%
    const warningDiv = container.firstChild;
    expect(warningDiv).toHaveClass('bg-yellow-900/30');
    expect(warningDiv).toHaveClass('border-yellow-700');
  });

  it('applies red styling when >= 100% usage', () => {
    const { container } = render(
      <UsageLimitWarning metric="filesOrganized" current={50} limit={50} />
    );

    const warningDiv = container.firstChild;
    expect(warningDiv).toHaveClass('bg-red-900/30');
    expect(warningDiv).toHaveClass('border-red-700');
  });

  it('applies default styling when < 80% usage', () => {
    const { container } = render(
      <UsageLimitWarning metric="filesOrganized" current={20} limit={50} />
    );

    // 20/50 = 40%
    const warningDiv = container.firstChild;
    expect(warningDiv).toHaveClass('bg-slate-800');
  });

  it('shows limit reached message at 100%', () => {
    render(<UsageLimitWarning metric="filesOrganized" current={50} limit={50} />);

    expect(screen.getByText(/Limit reached/)).toBeInTheDocument();
    expect(screen.getByText(/Upgrade to Premium/)).toBeInTheDocument();
  });

  it('does not show limit message below 100%', () => {
    render(<UsageLimitWarning metric="filesOrganized" current={49} limit={50} />);

    expect(screen.queryByText(/Limit reached/)).not.toBeInTheDocument();
  });

  it('caps progress bar width at 100%', () => {
    const { container } = render(
      <UsageLimitWarning metric="filesOrganized" current={75} limit={50} />
    );

    // 75/50 = 150%, but should be capped at 100%
    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).toHaveStyle({ width: '100%' });
  });

  it('handles zero limit edge case', () => {
    // Edge case: 0 limit would cause division by zero
    const { container } = render(
      <UsageLimitWarning metric="filesOrganized" current={0} limit={0} />
    );

    // Should still render (NaN percentage), just may look weird
    expect(container).not.toBeEmptyDOMElement();
  });
});
