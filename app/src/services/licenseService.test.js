/**
 * License Service Tests
 * =====================
 * Tests for premium license validation and feature gating.
 *
 * Test categories:
 * 1. Constants validation (LICENSE_TIERS, FEATURE_INFO)
 * 2. Storage helpers (localStorage operations)
 * 3. License state (isPremium, getCurrentTier)
 * 4. Usage tracking (getUsage, incrementUsage, limits)
 * 5. Feature gating (hasFeature, canPerformAction)
 * 6. API validation (validateLicenseKey, activateLicense) - uses msw
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import {
  LICENSE_TIERS,
  FEATURE_INFO,
  validateLicenseKey,
  activateLicense,
  deactivateLicense,
  getStoredLicense,
  isPremium,
  getCurrentTier,
  getUsage,
  incrementUsage,
  isLimitReached,
  getRemainingQuota,
  hasFeature,
  canPerformAction,
  getLicenseState,
} from './licenseService.js';

// =============================================================================
// MSW Server Setup for Gumroad API
// =============================================================================

const GUMROAD_API_URL = 'https://api.gumroad.com/v2/licenses/verify';

const server = setupServer(
  http.post(GUMROAD_API_URL, async ({ request }) => {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const licenseKey = params.get('license_key');

    // Valid license key
    if (licenseKey === 'VALID-PREMIUM-KEY') {
      return HttpResponse.json({
        success: true,
        purchase: {
          email: 'test@example.com',
          product_name: 'JDex Premium',
          created_at: '2026-01-01T00:00:00Z',
          refunded: false,
          disputed: false,
          chargebacked: false,
        },
      });
    }

    // Refunded license
    if (licenseKey === 'REFUNDED-KEY') {
      return HttpResponse.json({
        success: true,
        purchase: {
          email: 'refund@example.com',
          product_name: 'JDex Premium',
          created_at: '2026-01-01T00:00:00Z',
          refunded: true,
          disputed: false,
          chargebacked: false,
        },
      });
    }

    // Disputed license
    if (licenseKey === 'DISPUTED-KEY') {
      return HttpResponse.json({
        success: true,
        purchase: {
          email: 'dispute@example.com',
          product_name: 'JDex Premium',
          created_at: '2026-01-01T00:00:00Z',
          refunded: false,
          disputed: true,
          chargebacked: false,
        },
      });
    }

    // Chargebacked license
    if (licenseKey === 'CHARGEBACKED-KEY') {
      return HttpResponse.json({
        success: true,
        purchase: {
          email: 'chargeback@example.com',
          product_name: 'JDex Premium',
          created_at: '2026-01-01T00:00:00Z',
          refunded: false,
          disputed: false,
          chargebacked: true,
        },
      });
    }

    // Invalid license key
    return HttpResponse.json({
      success: false,
      message: 'That license does not exist for the provided product.',
    });
  })
);

// Start server before all tests
// Using 'warn' instead of 'error' to prevent brittleness from unmocked requests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

// =============================================================================
// Test Suite
// =============================================================================

describe('licenseService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Constants Tests
  // ===========================================================================

  describe('LICENSE_TIERS', () => {
    it('should define FREE tier with correct structure', () => {
      expect(LICENSE_TIERS.FREE).toBeDefined();
      expect(LICENSE_TIERS.FREE.id).toBe('free');
      expect(LICENSE_TIERS.FREE.name).toBe('Free');
      expect(LICENSE_TIERS.FREE.limits).toBeDefined();
      expect(LICENSE_TIERS.FREE.features).toBeDefined();
    });

    it('should define PREMIUM tier with correct structure', () => {
      expect(LICENSE_TIERS.PREMIUM).toBeDefined();
      expect(LICENSE_TIERS.PREMIUM.id).toBe('premium');
      expect(LICENSE_TIERS.PREMIUM.name).toBe('Premium');
      expect(LICENSE_TIERS.PREMIUM.limits).toBeDefined();
      expect(LICENSE_TIERS.PREMIUM.features).toBeDefined();
    });

    it('should have FREE tier with limited filesPerMonth', () => {
      expect(LICENSE_TIERS.FREE.limits.filesPerMonth).toBe(50);
    });

    it('should have PREMIUM tier with unlimited filesPerMonth', () => {
      expect(LICENSE_TIERS.PREMIUM.limits.filesPerMonth).toBe(Infinity);
    });

    it('should have FREE tier with limited rulesCount', () => {
      expect(LICENSE_TIERS.FREE.limits.rulesCount).toBe(5);
    });

    it('should have PREMIUM tier with unlimited rulesCount', () => {
      expect(LICENSE_TIERS.PREMIUM.limits.rulesCount).toBe(Infinity);
    });

    it('should have FREE tier with fileOrganizer enabled but not cloudSync', () => {
      expect(LICENSE_TIERS.FREE.features.fileOrganizer).toBe(true);
      expect(LICENSE_TIERS.FREE.features.cloudSync).toBe(false);
    });

    it('should have PREMIUM tier with all features enabled', () => {
      expect(LICENSE_TIERS.PREMIUM.features.fileOrganizer).toBe(true);
      expect(LICENSE_TIERS.PREMIUM.features.cloudSync).toBe(true);
      expect(LICENSE_TIERS.PREMIUM.features.advancedRules).toBe(true);
      expect(LICENSE_TIERS.PREMIUM.features.batchOperations).toBe(true);
      expect(LICENSE_TIERS.PREMIUM.features.rollback).toBe(true);
      expect(LICENSE_TIERS.PREMIUM.features.watchFolders).toBe(true);
      expect(LICENSE_TIERS.PREMIUM.features.prioritySupport).toBe(true);
    });
  });

  describe('FEATURE_INFO', () => {
    it('should define all expected features', () => {
      const expectedFeatures = [
        'fileOrganizer',
        'watchFolders',
        'cloudSync',
        'advancedRules',
        'batchOperations',
        'rollback',
        'prioritySupport',
      ];

      expectedFeatures.forEach((feature) => {
        expect(FEATURE_INFO[feature]).toBeDefined();
        expect(FEATURE_INFO[feature].name).toBeDefined();
        expect(FEATURE_INFO[feature].description).toBeDefined();
      });
    });

    it('should have freeLimit for each feature', () => {
      Object.values(FEATURE_INFO).forEach((info) => {
        expect(info.freeLimit).toBeDefined();
      });
    });
  });

  // ===========================================================================
  // Storage Helper Tests
  // ===========================================================================

  describe('getStoredLicense', () => {
    it('should return null when no license is stored', () => {
      expect(getStoredLicense()).toBeNull();
    });

    it('should return stored license data', () => {
      const licenseData = {
        key: 'TEST-KEY',
        email: 'test@example.com',
        tier: 'premium',
        validatedAt: new Date().toISOString(),
      };
      localStorage.setItem('jdex_license', JSON.stringify(licenseData));

      const result = getStoredLicense();
      expect(result).toEqual(licenseData);
    });

    it('should return null if stored data is invalid JSON', () => {
      localStorage.setItem('jdex_license', 'not-valid-json');
      expect(getStoredLicense()).toBeNull();
    });
  });

  describe('deactivateLicense', () => {
    it('should remove stored license and return success', () => {
      localStorage.setItem('jdex_license', JSON.stringify({ key: 'TEST' }));

      const result = deactivateLicense();

      expect(result).toEqual({ success: true });
      expect(localStorage.getItem('jdex_license')).toBeNull();
    });

    it('should succeed even if no license was stored', () => {
      const result = deactivateLicense();
      expect(result).toEqual({ success: true });
    });
  });

  // ===========================================================================
  // License State Tests
  // ===========================================================================

  describe('isPremium', () => {
    it('should return false when no license is stored', () => {
      expect(isPremium()).toBe(false);
    });

    it('should return true for valid premium license', () => {
      const licenseData = {
        key: 'TEST-KEY',
        tier: 'premium',
        validatedAt: new Date().toISOString(),
      };
      localStorage.setItem('jdex_license', JSON.stringify(licenseData));

      expect(isPremium()).toBe(true);
    });

    it('should return false if license tier is not premium', () => {
      const licenseData = {
        key: 'TEST-KEY',
        tier: 'free',
        validatedAt: new Date().toISOString(),
      };
      localStorage.setItem('jdex_license', JSON.stringify(licenseData));

      expect(isPremium()).toBe(false);
    });

    it('should return false if license validation is older than 30 days', () => {
      // Use fake timers for deterministic date testing
      vi.useFakeTimers();
      const now = new Date('2026-02-15T12:00:00Z');
      vi.setSystemTime(now);

      const oldDate = new Date('2026-01-14T12:00:00Z'); // 32 days ago

      const licenseData = {
        key: 'TEST-KEY',
        tier: 'premium',
        validatedAt: oldDate.toISOString(),
      };
      localStorage.setItem('jdex_license', JSON.stringify(licenseData));

      expect(isPremium()).toBe(false);

      vi.useRealTimers();
    });

    it('should return true if license validation is exactly 30 days old', () => {
      // Use fake timers for deterministic date testing
      vi.useFakeTimers();
      const now = new Date('2026-02-15T12:00:00Z');
      vi.setSystemTime(now);

      const exactDate = new Date('2026-01-16T12:00:00Z'); // Exactly 30 days ago

      const licenseData = {
        key: 'TEST-KEY',
        tier: 'premium',
        validatedAt: exactDate.toISOString(),
      };
      localStorage.setItem('jdex_license', JSON.stringify(licenseData));

      // At exactly 30 days, daysSinceValidation === 30, not > 30
      expect(isPremium()).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('getCurrentTier', () => {
    it('should return FREE tier when no license', () => {
      const tier = getCurrentTier();
      expect(tier).toEqual(LICENSE_TIERS.FREE);
    });

    it('should return PREMIUM tier with valid premium license', () => {
      const licenseData = {
        key: 'TEST-KEY',
        tier: 'premium',
        validatedAt: new Date().toISOString(),
      };
      localStorage.setItem('jdex_license', JSON.stringify(licenseData));

      const tier = getCurrentTier();
      expect(tier).toEqual(LICENSE_TIERS.PREMIUM);
    });
  });

  // ===========================================================================
  // Usage Tracking Tests
  // ===========================================================================

  describe('getUsage', () => {
    it('should return default usage for new month', () => {
      const usage = getUsage();
      const currentMonth = new Date().toISOString().slice(0, 7);

      expect(usage.month).toBe(currentMonth);
      expect(usage.filesOrganized).toBe(0);
      expect(usage.scansPerformed).toBe(0);
      expect(usage.rulesCreated).toBe(0);
    });

    it('should return stored usage for current month', () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const storedUsage = {
        month: currentMonth,
        filesOrganized: 25,
        scansPerformed: 10,
        rulesCreated: 3,
      };
      localStorage.setItem('jdex_usage', JSON.stringify(storedUsage));

      const usage = getUsage();
      expect(usage).toEqual(storedUsage);
    });

    it('should reset usage when month changes', () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const oldUsage = {
        month: lastMonth.toISOString().slice(0, 7),
        filesOrganized: 100,
        scansPerformed: 50,
        rulesCreated: 10,
      };
      localStorage.setItem('jdex_usage', JSON.stringify(oldUsage));

      const usage = getUsage();
      const currentMonth = new Date().toISOString().slice(0, 7);

      expect(usage.month).toBe(currentMonth);
      expect(usage.filesOrganized).toBe(0);
    });
  });

  describe('incrementUsage', () => {
    it('should increment filesOrganized by 1', () => {
      const usage = incrementUsage('filesOrganized');
      expect(usage.filesOrganized).toBe(1);
    });

    it('should increment by specified amount', () => {
      const usage = incrementUsage('filesOrganized', 10);
      expect(usage.filesOrganized).toBe(10);
    });

    it('should accumulate increments', () => {
      incrementUsage('filesOrganized', 5);
      incrementUsage('filesOrganized', 3);
      const usage = getUsage();
      expect(usage.filesOrganized).toBe(8);
    });

    it('should persist to localStorage', () => {
      incrementUsage('scansPerformed', 5);

      const stored = JSON.parse(localStorage.getItem('jdex_usage'));
      expect(stored.scansPerformed).toBe(5);
    });
  });

  describe('isLimitReached', () => {
    it('should return false when under limit', () => {
      expect(isLimitReached('filesOrganized')).toBe(false);
    });

    it('should return true when at limit for free tier', () => {
      // Free tier limit is 50 files
      const currentMonth = new Date().toISOString().slice(0, 7);
      localStorage.setItem(
        'jdex_usage',
        JSON.stringify({
          month: currentMonth,
          filesOrganized: 50,
        })
      );

      expect(isLimitReached('filesOrganized')).toBe(true);
    });

    it('should return true when over limit for free tier', () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      localStorage.setItem(
        'jdex_usage',
        JSON.stringify({
          month: currentMonth,
          filesOrganized: 100,
        })
      );

      expect(isLimitReached('filesOrganized')).toBe(true);
    });

    it('should return false for premium user regardless of usage', () => {
      // Set up premium license
      localStorage.setItem(
        'jdex_license',
        JSON.stringify({
          key: 'PREMIUM',
          tier: 'premium',
          validatedAt: new Date().toISOString(),
        })
      );

      const currentMonth = new Date().toISOString().slice(0, 7);
      localStorage.setItem(
        'jdex_usage',
        JSON.stringify({
          month: currentMonth,
          filesOrganized: 1000,
        })
      );

      // Premium has Infinity limit, so never reached
      expect(isLimitReached('filesOrganized')).toBe(false);
    });
  });

  describe('getRemainingQuota', () => {
    it('should return full quota when no usage', () => {
      const remaining = getRemainingQuota('filesOrganized');
      expect(remaining).toBe(50); // Free tier limit
    });

    it('should return remaining quota based on usage', () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      localStorage.setItem(
        'jdex_usage',
        JSON.stringify({
          month: currentMonth,
          filesOrganized: 30,
        })
      );

      const remaining = getRemainingQuota('filesOrganized');
      expect(remaining).toBe(20);
    });

    it('should return 0 when quota exceeded', () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      localStorage.setItem(
        'jdex_usage',
        JSON.stringify({
          month: currentMonth,
          filesOrganized: 60,
        })
      );

      const remaining = getRemainingQuota('filesOrganized');
      expect(remaining).toBe(0);
    });

    it('should return Infinity for premium user', () => {
      localStorage.setItem(
        'jdex_license',
        JSON.stringify({
          key: 'PREMIUM',
          tier: 'premium',
          validatedAt: new Date().toISOString(),
        })
      );

      const remaining = getRemainingQuota('filesOrganized');
      expect(remaining).toBe(Infinity);
    });
  });

  // ===========================================================================
  // Feature Gating Tests
  // ===========================================================================

  describe('hasFeature', () => {
    it('should return true for fileOrganizer on free tier', () => {
      expect(hasFeature('fileOrganizer')).toBe(true);
    });

    it('should return false for cloudSync on free tier', () => {
      expect(hasFeature('cloudSync')).toBe(false);
    });

    it('should return false for watchFolders on free tier', () => {
      expect(hasFeature('watchFolders')).toBe(false);
    });

    it('should return false for rollback on free tier', () => {
      expect(hasFeature('rollback')).toBe(false);
    });

    it('should return true for all features on premium tier', () => {
      localStorage.setItem(
        'jdex_license',
        JSON.stringify({
          key: 'PREMIUM',
          tier: 'premium',
          validatedAt: new Date().toISOString(),
        })
      );

      expect(hasFeature('fileOrganizer')).toBe(true);
      expect(hasFeature('cloudSync')).toBe(true);
      expect(hasFeature('watchFolders')).toBe(true);
      expect(hasFeature('rollback')).toBe(true);
      expect(hasFeature('batchOperations')).toBe(true);
      expect(hasFeature('advancedRules')).toBe(true);
      expect(hasFeature('prioritySupport')).toBe(true);
    });
  });

  describe('canPerformAction', () => {
    describe('organizeFiles action', () => {
      it('should allow organizing files under batch limit for free tier', () => {
        const result = canPerformAction('organizeFiles', 5);
        expect(result.allowed).toBe(true);
      });

      it('should reject batch over 10 files for free tier', () => {
        const result = canPerformAction('organizeFiles', 15);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('10 files');
        expect(result.limit).toBe(10);
      });

      it('should reject when monthly limit reached', () => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        localStorage.setItem(
          'jdex_usage',
          JSON.stringify({
            month: currentMonth,
            filesOrganized: 48,
          })
        );

        const result = canPerformAction('organizeFiles', 5);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Monthly limit');
      });

      it('should allow any batch size for premium tier', () => {
        localStorage.setItem(
          'jdex_license',
          JSON.stringify({
            key: 'PREMIUM',
            tier: 'premium',
            validatedAt: new Date().toISOString(),
          })
        );

        const result = canPerformAction('organizeFiles', 100);
        expect(result.allowed).toBe(true);
      });
    });

    describe('createRule action', () => {
      it('should allow creating rules under limit', () => {
        const result = canPerformAction('createRule');
        expect(result.allowed).toBe(true);
      });

      it('should reject when rule limit reached', () => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        localStorage.setItem(
          'jdex_usage',
          JSON.stringify({
            month: currentMonth,
            rulesCreated: 5,
          })
        );

        const result = canPerformAction('createRule');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Rule limit');
      });
    });

    describe('rollback action', () => {
      it('should reject rollback for free tier', () => {
        const result = canPerformAction('rollback');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Premium');
      });

      it('should allow rollback for premium tier', () => {
        localStorage.setItem(
          'jdex_license',
          JSON.stringify({
            key: 'PREMIUM',
            tier: 'premium',
            validatedAt: new Date().toISOString(),
          })
        );

        const result = canPerformAction('rollback');
        expect(result.allowed).toBe(true);
      });
    });

    describe('addCloudDrive action', () => {
      it('should not allow for free tier', () => {
        const result = canPerformAction('addCloudDrive');
        expect(result.allowed).toBe(false);
      });

      it('should allow for premium tier', () => {
        localStorage.setItem(
          'jdex_license',
          JSON.stringify({
            key: 'PREMIUM',
            tier: 'premium',
            validatedAt: new Date().toISOString(),
          })
        );

        const result = canPerformAction('addCloudDrive');
        expect(result.allowed).toBe(true);
      });
    });

    describe('unknown action', () => {
      it('should allow unknown actions by default', () => {
        const result = canPerformAction('unknownAction');
        expect(result.allowed).toBe(true);
      });
    });
  });

  // ===========================================================================
  // getLicenseState Tests
  // ===========================================================================

  describe('getLicenseState', () => {
    it('should return complete state for free user', () => {
      const state = getLicenseState();

      expect(state.isPremium).toBe(false);
      expect(state.tier).toEqual(LICENSE_TIERS.FREE);
      expect(state.license).toBeNull();
      expect(state.usage).toBeDefined();
      expect(state.limits).toEqual(LICENSE_TIERS.FREE.limits);
      expect(state.features).toEqual(LICENSE_TIERS.FREE.features);
    });

    it('should return complete state for premium user', () => {
      const licenseData = {
        key: 'PREMIUM-KEY',
        tier: 'premium',
        email: 'premium@example.com',
        validatedAt: new Date().toISOString(),
      };
      localStorage.setItem('jdex_license', JSON.stringify(licenseData));

      const state = getLicenseState();

      expect(state.isPremium).toBe(true);
      expect(state.tier).toEqual(LICENSE_TIERS.PREMIUM);
      expect(state.license).toEqual(licenseData);
      expect(state.limits).toEqual(LICENSE_TIERS.PREMIUM.limits);
      expect(state.features).toEqual(LICENSE_TIERS.PREMIUM.features);
    });
  });

  // ===========================================================================
  // API Validation Tests (using MSW)
  // ===========================================================================

  describe('validateLicenseKey', () => {
    it('should reject empty license key', async () => {
      const result = await validateLicenseKey('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid license key format');
    });

    it('should reject null license key', async () => {
      const result = await validateLicenseKey(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid license key format');
    });

    it('should reject non-string license key', async () => {
      const result = await validateLicenseKey(12345);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid license key format');
    });

    it('should validate a valid license key', async () => {
      const result = await validateLicenseKey('valid-premium-key');

      expect(result.valid).toBe(true);
      expect(result.license).toBeDefined();
      expect(result.license.email).toBe('test@example.com');
      expect(result.license.tier).toBe('premium');
      expect(result.license.refunded).toBe(false);
    });

    it('should trim and uppercase license key', async () => {
      const result = await validateLicenseKey('  valid-premium-key  ');

      expect(result.valid).toBe(true);
      expect(result.license.key).toBe('VALID-PREMIUM-KEY');
    });

    it('should reject invalid license key', async () => {
      const result = await validateLicenseKey('invalid-key');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should handle network error with cached license', async () => {
      // Store a cached license
      const cachedLicense = {
        key: 'CACHED-KEY',
        tier: 'premium',
        validatedAt: new Date().toISOString(),
      };
      localStorage.setItem('jdex_license', JSON.stringify(cachedLicense));

      // Mock network error
      server.use(
        http.post(GUMROAD_API_URL, () => {
          return HttpResponse.error();
        })
      );

      const result = await validateLicenseKey('cached-key');

      expect(result.valid).toBe(true);
      expect(result.offline).toBe(true);
      expect(result.license).toEqual(cachedLicense);
    });

    it('should reject after offline grace period expires', async () => {
      // Use fake timers for deterministic date testing
      vi.useFakeTimers();
      const now = new Date('2026-02-15T12:00:00Z');
      vi.setSystemTime(now);

      // Store an old cached license (8 days ago)
      const oldDate = new Date('2026-02-07T12:00:00Z'); // 8 days before now

      const cachedLicense = {
        key: 'OLD-CACHED-KEY',
        tier: 'premium',
        validatedAt: oldDate.toISOString(),
      };
      localStorage.setItem('jdex_license', JSON.stringify(cachedLicense));

      // Mock network error
      server.use(
        http.post(GUMROAD_API_URL, () => {
          return HttpResponse.error();
        })
      );

      const result = await validateLicenseKey('old-cached-key');

      expect(result.valid).toBe(false);
      expect(result.offline).toBe(true);
      expect(result.error).toContain('internet connection');

      vi.useRealTimers();
    });

    it('should handle network error without cached license', async () => {
      server.use(
        http.post(GUMROAD_API_URL, () => {
          return HttpResponse.error();
        })
      );

      const result = await validateLicenseKey('new-key');

      expect(result.valid).toBe(false);
      expect(result.offline).toBe(true);
      expect(result.error).toContain('internet connection');
    });
  });

  describe('activateLicense', () => {
    it('should activate a valid license', async () => {
      const result = await activateLicense('valid-premium-key');

      expect(result.valid).toBe(true);
      expect(result.license).toBeDefined();
      expect(result.license.activatedAt).toBeDefined();
      expect(result.license.validatedAt).toBeDefined();

      // Should be stored in localStorage
      const stored = getStoredLicense();
      expect(stored).not.toBeNull();
      expect(stored.key).toBe('VALID-PREMIUM-KEY');
    });

    it('should reject invalid license', async () => {
      const result = await activateLicense('invalid-key');

      expect(result.valid).toBe(false);
      expect(getStoredLicense()).toBeNull();
    });

    it('should reject refunded license', async () => {
      const result = await activateLicense('refunded-key');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('refunded or disputed');
      expect(getStoredLicense()).toBeNull();
    });

    it('should reject disputed license', async () => {
      const result = await activateLicense('disputed-key');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('refunded or disputed');
    });

    it('should reject chargebacked license', async () => {
      const result = await activateLicense('chargebacked-key');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('refunded or disputed');
    });
  });
});
