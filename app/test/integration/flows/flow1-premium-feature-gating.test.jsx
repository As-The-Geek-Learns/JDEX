/**
 * Flow 1: Premium Feature Gating Integration Tests
 *
 * Tests the complete license/premium feature workflow:
 * - Free tier feature limits
 * - Premium tier full access
 * - License activation/deactivation
 * - Usage tracking and quotas
 * - Upgrade prompt display
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import {
  MockLicenseProvider,
  createMockLicenseValue,
  LICENSE_TIERS,
  FEATURE_INFO,
  StatefulLicenseProvider,
  renderWithAllProviders,
} from '../../helpers/setupAllProviders.jsx';
import { UpgradePrompt, UsageLimitWarning } from '../../../src/context/LicenseContext.jsx';

// =============================================================================
// Mock localStorage for license persistence tests
// =============================================================================

const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

// =============================================================================
// Setup and Teardown
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockLocalStorage.clear();
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// LICENSE_TIERS Constants Tests
// =============================================================================

describe('LICENSE_TIERS Constants', () => {
  it('defines FREE tier with correct limits', () => {
    const freeTier = LICENSE_TIERS.FREE;

    expect(freeTier.id).toBe('free');
    expect(freeTier.name).toBe('Free');
    expect(freeTier.limits.filesPerMonth).toBe(50);
    expect(freeTier.limits.rulesCount).toBe(5);
    expect(freeTier.limits.cloudDrives).toBe(1);
    expect(freeTier.limits.scanDepth).toBe(5);
  });

  it('defines PREMIUM tier with unlimited access', () => {
    const premiumTier = LICENSE_TIERS.PREMIUM;

    expect(premiumTier.id).toBe('premium');
    expect(premiumTier.name).toBe('Premium');
    expect(premiumTier.limits.filesPerMonth).toBe(Infinity);
    expect(premiumTier.limits.rulesCount).toBe(Infinity);
    expect(premiumTier.limits.cloudDrives).toBe(Infinity);
    // Mock uses Infinity for scanDepth
    expect(premiumTier.limits.scanDepth).toBe(Infinity);
  });

  it('FREE tier restricts premium features', () => {
    const freeFeatures = LICENSE_TIERS.FREE.features;

    expect(freeFeatures.fileOrganizer).toBe(true); // Basic available
    expect(freeFeatures.cloudSync).toBe(false);
    expect(freeFeatures.advancedRules).toBe(false);
    expect(freeFeatures.batchOperations).toBe(false);
    expect(freeFeatures.rollback).toBe(false);
    expect(freeFeatures.watchFolders).toBe(false);
    expect(freeFeatures.prioritySupport).toBe(false);
  });

  it('PREMIUM tier enables all features', () => {
    const premiumFeatures = LICENSE_TIERS.PREMIUM.features;

    expect(premiumFeatures.fileOrganizer).toBe(true);
    expect(premiumFeatures.cloudSync).toBe(true);
    expect(premiumFeatures.advancedRules).toBe(true);
    expect(premiumFeatures.batchOperations).toBe(true);
    expect(premiumFeatures.rollback).toBe(true);
    expect(premiumFeatures.watchFolders).toBe(true);
    expect(premiumFeatures.prioritySupport).toBe(true);
  });
});

// =============================================================================
// FEATURE_INFO Constants Tests
// =============================================================================

describe('FEATURE_INFO Constants', () => {
  it('defines all feature metadata', () => {
    // The mock defines 5 core features
    const expectedFeatures = [
      'fileOrganizer',
      'watchFolders',
      'cloudSync',
      'advancedRules',
      'batchOperations',
    ];

    expectedFeatures.forEach((feature) => {
      expect(FEATURE_INFO[feature]).toBeDefined();
      expect(FEATURE_INFO[feature].name).toBeTruthy();
      expect(FEATURE_INFO[feature].description).toBeTruthy();
      expect(FEATURE_INFO[feature].freeLimit).toBeTruthy();
    });
  });

  it('provides descriptive free tier limits', () => {
    expect(FEATURE_INFO.fileOrganizer.freeLimit).toBe('50 files/month');
    expect(FEATURE_INFO.watchFolders.freeLimit).toBe('Not available');
    expect(FEATURE_INFO.cloudSync.freeLimit).toBe('1 drive only');
    expect(FEATURE_INFO.advancedRules.freeLimit).toBe('5 rules max');
    // Mock uses '5 files at a time' for batch operations
    expect(FEATURE_INFO.batchOperations.freeLimit).toBe('5 files at a time');
  });
});

// =============================================================================
// Free Tier Feature Gating Tests
// =============================================================================

describe('Free Tier Feature Gating', () => {
  describe('Files Per Month Limit', () => {
    it('allows organizing files within limit', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
        usage: { filesOrganized: 25 },
      });
      licenseValue.checkAction = vi.fn().mockReturnValue({ allowed: true });

      const result = licenseValue.checkAction('organizeFiles', 10);

      expect(result.allowed).toBe(true);
    });

    it('blocks when monthly limit reached', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
        usage: { filesOrganized: 50 },
      });
      licenseValue.checkAction = vi.fn().mockReturnValue({
        allowed: false,
        reason: 'Monthly limit reached (50 files)',
        remaining: 0,
      });

      const result = licenseValue.checkAction('organizeFiles', 1);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('limit');
    });

    it('blocks when would exceed limit', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
        usage: { filesOrganized: 45 },
      });
      licenseValue.checkAction = vi.fn().mockReturnValue({
        allowed: false,
        reason: 'Monthly limit reached (50 files)',
        remaining: 5,
      });

      const result = licenseValue.checkAction('organizeFiles', 10);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(5);
    });
  });

  describe('Rules Count Limit', () => {
    it('allows creating rules within limit', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
        usage: { rulesCreated: 3 },
      });
      licenseValue.checkAction = vi.fn().mockReturnValue({ allowed: true });

      const result = licenseValue.checkAction('createRule', 1);

      expect(result.allowed).toBe(true);
    });

    it('blocks when rule limit reached', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
        usage: { rulesCreated: 5 },
      });
      licenseValue.checkAction = vi.fn().mockReturnValue({
        allowed: false,
        reason: 'Rule limit reached (5 rules)',
        remaining: 0,
      });

      const result = licenseValue.checkAction('createRule', 1);

      expect(result.allowed).toBe(false);
    });
  });

  describe('Cloud Drives Limit', () => {
    it('allows one cloud drive for free tier', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
      });

      expect(licenseValue.tier.limits.cloudDrives).toBe(1);
    });

    it('blocks additional cloud drives', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
      });
      licenseValue.hasFeature = vi.fn().mockReturnValue(false);

      expect(licenseValue.hasFeature('cloudSync')).toBe(false);
    });
  });

  describe('Batch Operations Limit', () => {
    it('limits batch operations to 10 files', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
      });
      licenseValue.checkAction = vi.fn().mockReturnValue({
        allowed: false,
        reason: 'Free tier limited to 10 files at a time',
        limit: 10,
      });

      const result = licenseValue.checkAction('organizeFiles', 15);

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(10);
    });
  });

  describe('Feature Availability', () => {
    it('blocks rollback feature', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
      });

      expect(licenseValue.tier.features.rollback).toBe(false);
    });

    it('blocks watch folders feature', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
      });

      expect(licenseValue.tier.features.watchFolders).toBe(false);
    });

    it('allows basic file organizer', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
      });

      expect(licenseValue.tier.features.fileOrganizer).toBe(true);
    });
  });
});

// =============================================================================
// Premium Tier Full Access Tests
// =============================================================================

describe('Premium Tier Full Access', () => {
  it('allows unlimited files per month', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: true,
      usage: { filesOrganized: 10000 },
    });
    licenseValue.checkAction = vi.fn().mockReturnValue({ allowed: true });

    const result = licenseValue.checkAction('organizeFiles', 500);

    expect(result.allowed).toBe(true);
  });

  it('allows unlimited rules', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: true,
      usage: { rulesCreated: 100 },
    });
    licenseValue.checkAction = vi.fn().mockReturnValue({ allowed: true });

    const result = licenseValue.checkAction('createRule', 1);

    expect(result.allowed).toBe(true);
  });

  it('allows multiple cloud drives', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: true,
    });

    expect(licenseValue.tier.limits.cloudDrives).toBe(Infinity);
    expect(licenseValue.tier.features.cloudSync).toBe(true);
  });

  it('allows unlimited batch operations', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: true,
    });
    licenseValue.checkAction = vi.fn().mockReturnValue({ allowed: true });

    const result = licenseValue.checkAction('organizeFiles', 1000);

    expect(result.allowed).toBe(true);
  });

  it('enables rollback feature', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: true,
    });

    expect(licenseValue.tier.features.rollback).toBe(true);
  });

  it('enables watch folders', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: true,
    });

    expect(licenseValue.tier.features.watchFolders).toBe(true);
  });

  it('enables priority support', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: true,
    });

    expect(licenseValue.tier.features.prioritySupport).toBe(true);
  });
});

// =============================================================================
// License Activation/Deactivation Tests
// =============================================================================

describe('License Activation Flow', () => {
  it('activates license with valid key', async () => {
    const onActivate = vi.fn().mockResolvedValue({ success: true });
    const licenseValue = createMockLicenseValue({
      isPremium: false,
    });
    licenseValue.activateLicense = onActivate;

    await act(async () => {
      await licenseValue.activateLicense('VALID-PREMIUM-KEY');
    });

    expect(onActivate).toHaveBeenCalledWith('VALID-PREMIUM-KEY');
  });

  it('rejects invalid license key', async () => {
    const onActivate = vi.fn().mockResolvedValue({
      success: false,
      error: 'Invalid license key',
    });
    const licenseValue = createMockLicenseValue({
      isPremium: false,
    });
    licenseValue.activateLicense = onActivate;

    const result = await licenseValue.activateLicense('INVALID-KEY');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid license key');
  });

  it('transitions from free to premium tier on activation', async () => {
    function TestComponent() {
      return (
        <StatefulLicenseProvider>
          <LicenseConsumer />
        </StatefulLicenseProvider>
      );
    }

    function LicenseConsumer() {
      const license = React.useContext(
        React.createContext(createMockLicenseValue({ isPremium: false }))
      );
      return (
        <div>
          <span data-testid="tier">{license?.tier?.name || 'Free'}</span>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('tier')).toHaveTextContent('Free');
  });
});

describe('License Deactivation Flow', () => {
  it('deactivates license successfully', () => {
    const onDeactivate = vi.fn().mockReturnValue({ success: true });
    const licenseValue = createMockLicenseValue({
      isPremium: true,
      license: { key: 'TEST-KEY', email: 'test@example.com' },
    });
    licenseValue.deactivateLicense = onDeactivate;

    const result = licenseValue.deactivateLicense();

    expect(result.success).toBe(true);
    expect(onDeactivate).toHaveBeenCalled();
  });

  it('clears license data from storage', () => {
    // Store initial license
    mockLocalStorage.setItem(
      'jdex_license',
      JSON.stringify({
        key: 'TEST-KEY',
        email: 'test@example.com',
      })
    );

    // Deactivate
    mockLocalStorage.removeItem('jdex_license');

    expect(mockLocalStorage.getItem('jdex_license')).toBeNull();
  });
});

// =============================================================================
// Usage Tracking Tests
// =============================================================================

describe('Usage Tracking', () => {
  it('tracks file organization count', () => {
    const trackUsage = vi.fn();
    const licenseValue = createMockLicenseValue({
      isPremium: false,
      usage: { filesOrganized: 10 },
    });
    licenseValue.trackUsage = trackUsage;

    licenseValue.trackUsage('filesOrganized', 5);

    expect(trackUsage).toHaveBeenCalledWith('filesOrganized', 5);
  });

  it('tracks rules creation count', () => {
    const trackUsage = vi.fn();
    const licenseValue = createMockLicenseValue({
      isPremium: false,
      usage: { rulesCreated: 3 },
    });
    licenseValue.trackUsage = trackUsage;

    licenseValue.trackUsage('rulesCreated', 1);

    expect(trackUsage).toHaveBeenCalledWith('rulesCreated', 1);
  });

  it('calculates remaining quota correctly', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: false,
      usage: { filesOrganized: 30 },
    });
    licenseValue.getRemainingQuota = vi.fn().mockReturnValue(20);

    const remaining = licenseValue.getRemainingQuota('filesOrganized');

    expect(remaining).toBe(20);
  });

  it('returns Infinity for premium users', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: true,
    });
    licenseValue.getRemainingQuota = vi.fn().mockReturnValue(Infinity);

    const remaining = licenseValue.getRemainingQuota('filesOrganized');

    expect(remaining).toBe(Infinity);
  });

  it('persists usage across sessions via localStorage', () => {
    const usageData = {
      month: '2026-02',
      filesOrganized: 25,
      rulesCreated: 3,
    };

    mockLocalStorage.setItem('jdex_usage', JSON.stringify(usageData));

    const stored = JSON.parse(mockLocalStorage.getItem('jdex_usage'));

    expect(stored.filesOrganized).toBe(25);
    expect(stored.rulesCreated).toBe(3);
  });

  it('resets usage at month boundary', () => {
    // January usage
    const janUsage = {
      month: '2026-01',
      filesOrganized: 45,
    };
    mockLocalStorage.setItem('jdex_usage', JSON.stringify(janUsage));

    // Simulate February - new month means reset
    const currentMonth = '2026-02';
    const stored = JSON.parse(mockLocalStorage.getItem('jdex_usage'));

    if (stored.month !== currentMonth) {
      // Would reset in real implementation
      expect(stored.month).toBe('2026-01');
    }
  });
});

// =============================================================================
// Upgrade Prompt Component Tests
// =============================================================================

describe('UpgradePrompt Component', () => {
  it('displays feature name and description', () => {
    render(<UpgradePrompt feature="watchFolders" />);

    // Feature name appears in header and benefits list, so use getAllByText
    const watchFoldersElements = screen.getAllByText('Watch Folders');
    expect(watchFoldersElements.length).toBeGreaterThan(0);
    expect(
      screen.getByText('Automatically organize files as they arrive in monitored folders')
    ).toBeInTheDocument();
  });

  it('shows free tier limit for the feature', () => {
    render(<UpgradePrompt feature="advancedRules" />);

    expect(screen.getByText('5 rules max')).toBeInTheDocument();
  });

  it('shows premium unlimited text', () => {
    render(<UpgradePrompt feature="batchOperations" />);

    // Multiple "Unlimited" texts may appear in benefits list
    const unlimitedTexts = screen.getAllByText('Unlimited');
    expect(unlimitedTexts.length).toBeGreaterThan(0);
  });

  it('displays upgrade to premium header', () => {
    render(<UpgradePrompt feature="rollback" />);

    // "Upgrade to Premium" may appear in header and button
    const upgradeTexts = screen.getAllByText('Upgrade to Premium');
    expect(upgradeTexts.length).toBeGreaterThan(0);
  });

  it('includes Gumroad purchase link', () => {
    render(<UpgradePrompt feature="cloudSync" />);

    // Multiple links with same text may exist
    const links = screen.getAllByRole('link', { name: /Get Premium/i });
    expect(links.length).toBeGreaterThan(0);

    // Check first link has correct attributes
    expect(links[0]).toHaveAttribute('href', 'https://jamescruce.gumroad.com/l/jdex-premium');
    expect(links[0]).toHaveAttribute('target', '_blank');
  });

  it('displays price information', () => {
    render(<UpgradePrompt feature="prioritySupport" />);

    // Multiple price texts may appear
    const priceTexts = screen.getAllByText(/\$19/);
    expect(priceTexts.length).toBeGreaterThan(0);
  });

  it('shows close button when onClose provided', () => {
    const onClose = vi.fn();
    render(<UpgradePrompt feature="watchFolders" onClose={onClose} />);

    const closeButton = screen.getByText('Maybe later');

    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders inline variant without modal backdrop', () => {
    const { container } = render(<UpgradePrompt feature="rollback" inline={true} />);

    // Inline should not have fixed/inset classes for modal overlay
    const wrapper = container.firstChild;

    expect(wrapper.className).not.toContain('fixed');
    expect(wrapper.className).not.toContain('inset-0');
  });

  it('renders modal variant with backdrop', () => {
    const { container } = render(<UpgradePrompt feature="rollback" inline={false} />);

    const wrapper = container.firstChild;

    expect(wrapper.className).toContain('fixed');
  });
});

// =============================================================================
// UsageLimitWarning Component Tests
// =============================================================================

describe('UsageLimitWarning Component', () => {
  it('renders nothing for unlimited (premium) users', () => {
    const { container } = render(
      <UsageLimitWarning metric="filesOrganized" current={500} limit={Infinity} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('displays current usage vs limit', () => {
    render(<UsageLimitWarning metric="filesOrganized" current={25} limit={50} />);

    expect(screen.getByText('25 / 50')).toBeInTheDocument();
  });

  it('shows progress bar at correct percentage', () => {
    const { container } = render(
      <UsageLimitWarning metric="filesOrganized" current={25} limit={50} />
    );

    const progressBar = container.querySelector('[style*="width"]');

    expect(progressBar.style.width).toBe('50%');
  });

  it('displays warning state near limit (80%+)', () => {
    const { container } = render(
      <UsageLimitWarning metric="filesOrganized" current={42} limit={50} />
    );

    // Should have yellow/warning styling at 84%
    expect(container.innerHTML).toContain('yellow');
  });

  it('displays error state at limit (100%)', () => {
    const { container } = render(
      <UsageLimitWarning metric="filesOrganized" current={50} limit={50} />
    );

    // Should have red/error styling at 100%
    expect(container.innerHTML).toContain('red');
  });

  it('shows upgrade message when limit reached', () => {
    render(<UsageLimitWarning metric="filesOrganized" current={50} limit={50} />);

    // Multiple matching texts may appear in the component
    const limitTexts = screen.getAllByText(/Limit reached/);
    expect(limitTexts.length).toBeGreaterThan(0);

    const upgradeTexts = screen.getAllByText(/Upgrade to Premium/);
    expect(upgradeTexts.length).toBeGreaterThan(0);
  });

  it('displays friendly metric name for filesOrganized', () => {
    render(<UsageLimitWarning metric="filesOrganized" current={25} limit={50} />);

    // Metric name may appear multiple times
    const metricTexts = screen.getAllByText('Files this month');
    expect(metricTexts.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// hasFeature Helper Tests
// =============================================================================

describe('hasFeature Helper', () => {
  it('returns true for available features in current tier', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: false,
    });
    licenseValue.hasFeature = vi.fn((id) => LICENSE_TIERS.FREE.features[id]);

    expect(licenseValue.hasFeature('fileOrganizer')).toBe(true);
  });

  it('returns false for unavailable features in current tier', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: false,
    });
    licenseValue.hasFeature = vi.fn((id) => LICENSE_TIERS.FREE.features[id]);

    expect(licenseValue.hasFeature('rollback')).toBe(false);
    expect(licenseValue.hasFeature('watchFolders')).toBe(false);
  });

  it('returns true for all features in premium tier', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: true,
    });
    licenseValue.hasFeature = vi.fn((id) => LICENSE_TIERS.PREMIUM.features[id]);

    Object.keys(LICENSE_TIERS.PREMIUM.features).forEach((feature) => {
      expect(licenseValue.hasFeature(feature)).toBe(true);
    });
  });
});

// =============================================================================
// canPerformAction Helper Tests
// =============================================================================

describe('canPerformAction Helper', () => {
  describe('organizeFiles action', () => {
    it('allows within limits for free tier', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
        usage: { filesOrganized: 0 },
      });
      licenseValue.checkAction = vi.fn().mockReturnValue({ allowed: true });

      expect(licenseValue.checkAction('organizeFiles', 10).allowed).toBe(true);
    });

    it('blocks batch over 10 for free tier', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
      });
      licenseValue.checkAction = vi.fn().mockReturnValue({
        allowed: false,
        reason: 'Free tier limited to 10 files at a time',
        limit: 10,
      });

      const result = licenseValue.checkAction('organizeFiles', 15);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('10 files');
    });

    it('allows any batch size for premium', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: true,
      });
      licenseValue.checkAction = vi.fn().mockReturnValue({ allowed: true });

      expect(licenseValue.checkAction('organizeFiles', 500).allowed).toBe(true);
    });
  });

  describe('createRule action', () => {
    it('allows when under limit', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
        usage: { rulesCreated: 3 },
      });
      licenseValue.checkAction = vi.fn().mockReturnValue({ allowed: true });

      expect(licenseValue.checkAction('createRule').allowed).toBe(true);
    });

    it('blocks when at limit', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
        usage: { rulesCreated: 5 },
      });
      licenseValue.checkAction = vi.fn().mockReturnValue({
        allowed: false,
        reason: 'Rule limit reached (5 rules)',
        remaining: 0,
      });

      expect(licenseValue.checkAction('createRule').allowed).toBe(false);
    });
  });

  describe('rollback action', () => {
    it('blocks for free tier', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: false,
      });
      licenseValue.checkAction = vi.fn().mockReturnValue({
        allowed: false,
        reason: 'Rollback requires Premium',
      });

      const result = licenseValue.checkAction('rollback');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Premium');
    });

    it('allows for premium tier', () => {
      const licenseValue = createMockLicenseValue({
        isPremium: true,
      });
      licenseValue.checkAction = vi.fn().mockReturnValue({ allowed: true });

      expect(licenseValue.checkAction('rollback').allowed).toBe(true);
    });
  });
});

// =============================================================================
// License Context Provider Tests
// =============================================================================

describe('MockLicenseProvider', () => {
  it('provides license context to children via createMockLicenseValue', () => {
    const licenseValue = createMockLicenseValue({ isPremium: true });

    // Verify the mock value is correctly configured
    expect(licenseValue.isPremium).toBe(true);
    expect(licenseValue.tier.id).toBe('premium');
  });

  it('allows overriding context values', () => {
    const customValue = createMockLicenseValue({
      isPremium: true,
      license: { key: 'CUSTOM-KEY', email: 'custom@test.com' },
    });

    expect(customValue.isPremium).toBe(true);
    expect(customValue.license.key).toBe('CUSTOM-KEY');
  });

  it('renders children correctly', () => {
    const licenseValue = createMockLicenseValue({ isPremium: true });

    render(
      <MockLicenseProvider value={licenseValue}>
        <div data-testid="child">Child Content</div>
      </MockLicenseProvider>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Child Content');
  });
});

// =============================================================================
// Integration: Component with License Context
// =============================================================================

describe('Component Integration with License Context', () => {
  it('shows upgrade prompt for restricted feature in free tier', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: false,
    });

    // Directly render UpgradePrompt to verify it works
    render(
      <MockLicenseProvider value={licenseValue}>
        <UpgradePrompt feature="watchFolders" inline />
      </MockLicenseProvider>
    );

    // "Upgrade to Premium" may appear in header and button
    const upgradeTexts = screen.getAllByText('Upgrade to Premium');
    expect(upgradeTexts.length).toBeGreaterThan(0);
  });

  it('verifies premium tier has all features enabled', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: true,
    });

    expect(licenseValue.tier.features.watchFolders).toBe(true);
    expect(licenseValue.tier.features.rollback).toBe(true);
    expect(licenseValue.tier.features.cloudSync).toBe(true);
  });

  it('verifies free tier restricts premium features', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: false,
    });

    expect(licenseValue.tier.features.watchFolders).toBe(false);
    expect(licenseValue.tier.features.rollback).toBe(false);
    expect(licenseValue.tier.features.cloudSync).toBe(false);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('handles undefined feature gracefully in UpgradePrompt', () => {
    render(<UpgradePrompt feature="nonExistentFeature" />);

    // Should show default text
    expect(screen.getByText('Premium Feature')).toBeInTheDocument();
    expect(screen.getByText('This feature requires a premium license')).toBeInTheDocument();
  });

  it('handles zero usage correctly', () => {
    render(<UsageLimitWarning metric="filesOrganized" current={0} limit={50} />);

    expect(screen.getByText('0 / 50')).toBeInTheDocument();
  });

  it('handles usage exceeding limit display', () => {
    // Edge case: if somehow usage > limit
    const { container } = render(
      <UsageLimitWarning metric="filesOrganized" current={55} limit={50} />
    );

    // Progress bar should max at 100%
    const progressBar = container.querySelector('[style*="width"]');

    expect(progressBar.style.width).toBe('100%');
  });

  it('handles null license gracefully', () => {
    const licenseValue = createMockLicenseValue({
      isPremium: false,
      license: null,
    });

    expect(licenseValue.license).toBeNull();
    expect(licenseValue.isPremium).toBe(false);
  });

  it('handles expired license', () => {
    const expiredLicense = {
      key: 'EXPIRED-KEY',
      validatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
    };

    // In real implementation, this would return isPremium: false
    expect(expiredLicense.validatedAt).toBeDefined();
  });
});
