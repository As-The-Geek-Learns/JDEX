/**
 * License Service
 * ===============
 * Handles premium license validation and feature gating.
 *
 * Features:
 * - Gumroad license key validation
 * - Local license caching
 * - Offline grace period
 * - Usage tracking for free tier limits
 *
 * Security:
 * - License keys are stored locally (not in plain text for production)
 * - Validation happens server-side via Gumroad API
 * - Offline mode with limited grace period
 */

// =============================================================================
// Types
// =============================================================================

/**
 * License tier limits.
 */
export interface TierLimits {
  filesPerMonth: number;
  rulesCount: number;
  cloudDrives: number;
  scanDepth: number;
  watchFolders?: number;
}

/**
 * License tier features.
 */
export interface TierFeatures {
  fileOrganizer: boolean;
  cloudSync: boolean;
  advancedRules: boolean;
  batchOperations: boolean;
  rollback: boolean;
  watchFolders: boolean;
  prioritySupport: boolean;
}

/**
 * License tier definition.
 */
export interface LicenseTier {
  id: string;
  name: string;
  limits: TierLimits;
  features: TierFeatures;
}

/**
 * Feature info for upgrade prompts.
 */
export interface FeatureInfo {
  name: string;
  description: string;
  freeLimit: string;
  premiumLimit?: string;
}

/**
 * Stored license data.
 */
export interface StoredLicense {
  key: string;
  email: string;
  productName: string;
  createdAt: string;
  refunded: boolean;
  disputed: boolean;
  chargebacked: boolean;
  tier: string;
  validatedAt: string;
  activatedAt?: string;
}

/**
 * License validation result.
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  offline?: boolean;
  license?: StoredLicense;
}

/**
 * Usage tracking data.
 */
export interface UsageData {
  month: string;
  filesOrganized: number;
  scansPerformed: number;
  rulesCreated: number;
  [key: string]: string | number;
}

/**
 * Action permission result.
 */
export interface ActionPermission {
  allowed: boolean;
  reason?: string | null;
  limit?: number;
  remaining?: number;
}

/**
 * License state for React components.
 */
export interface LicenseState {
  isPremium: boolean;
  tier: LicenseTier;
  license: StoredLicense | null;
  usage: UsageData;
  limits: TierLimits;
  features: TierFeatures;
}

/**
 * Usage metrics that can be tracked.
 */
export type UsageMetric = 'filesOrganized' | 'scansPerformed' | 'rulesCreated';

/**
 * Actions that can be permission-checked.
 */
export type ActionType = 'organizeFiles' | 'createRule' | 'addCloudDrive' | 'rollback';

/**
 * Feature IDs.
 */
export type FeatureId = keyof TierFeatures;

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'jdex_license';
const USAGE_KEY = 'jdex_usage';
const GUMROAD_PRODUCT_ID = 'jdex-premium'; // Gumroad product: https://astgl.gumroad.com/l/jdex-premium

/**
 * License tiers with their limits.
 */
export const LICENSE_TIERS: { FREE: LicenseTier; PREMIUM: LicenseTier } = {
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
      scanDepth: 20,
      watchFolders: 10,
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

/**
 * Feature descriptions for upgrade prompts.
 */
export const FEATURE_INFO: Record<string, FeatureInfo> = {
  fileOrganizer: {
    name: 'File Organizer',
    description: 'Scan and organize files into JD folders',
    freeLimit: '50 files/month',
  },
  watchFolders: {
    name: 'Watch Folders',
    description: 'Automatically organize files as they arrive in monitored folders',
    freeLimit: 'Not available',
    premiumLimit: 'Up to 10 folders',
  },
  cloudSync: {
    name: 'Cloud Drive Integration',
    description: 'Connect multiple cloud drives for file storage',
    freeLimit: '1 drive only',
  },
  advancedRules: {
    name: 'Advanced Rules',
    description: 'Create regex and path-based organization rules',
    freeLimit: '5 rules max',
  },
  batchOperations: {
    name: 'Batch Operations',
    description: 'Organize hundreds of files at once',
    freeLimit: 'Limited to 10 files',
  },
  rollback: {
    name: 'Rollback Support',
    description: 'Undo file moves and recover from mistakes',
    freeLimit: 'Not available',
  },
  prioritySupport: {
    name: 'Priority Support',
    description: 'Get help faster with priority email support',
    freeLimit: 'Community only',
  },
};

// =============================================================================
// Storage Helpers
// =============================================================================

/**
 * Gets data from localStorage.
 */
function getStoredData<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Saves data to localStorage.
 */
function setStoredData<T>(key: string, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes data from localStorage.
 */
function removeStoredData(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// License Validation
// =============================================================================

/**
 * Gumroad API response structure.
 */
interface GumroadResponse {
  success: boolean;
  message?: string;
  purchase?: {
    email: string;
    product_name: string;
    created_at: string;
    refunded: boolean;
    disputed: boolean;
    chargebacked: boolean;
  };
}

/**
 * Validates a Gumroad license key.
 *
 * @param licenseKey - The license key to validate
 * @returns Validation result
 */
export async function validateLicenseKey(licenseKey: string): Promise<ValidationResult> {
  if (!licenseKey || typeof licenseKey !== 'string') {
    return {
      valid: false,
      error: 'Invalid license key format',
    };
  }

  // Clean the license key
  const cleanKey = licenseKey.trim().toUpperCase();

  try {
    // Call Gumroad API to verify license
    const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        product_id: GUMROAD_PRODUCT_ID,
        license_key: cleanKey,
        increment_uses_count: 'false', // Don't increment on validation checks
      }),
    });

    const data = (await response.json()) as GumroadResponse;

    if (data.success && data.purchase) {
      const purchase = data.purchase;

      return {
        valid: true,
        license: {
          key: cleanKey,
          email: purchase.email,
          productName: purchase.product_name,
          createdAt: purchase.created_at,
          refunded: purchase.refunded,
          disputed: purchase.disputed,
          chargebacked: purchase.chargebacked,
          tier: 'premium',
          validatedAt: new Date().toISOString(),
        },
      };
    } else {
      return {
        valid: false,
        error: data.message || 'License key not found',
      };
    }
  } catch (_error) {
    // Network error - check if we have a cached valid license
    const cached = getStoredLicense();
    if (cached && cached.key === cleanKey) {
      // Allow offline grace period (7 days)
      const lastValidated = new Date(cached.validatedAt);
      const daysSinceValidation = (Date.now() - lastValidated.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceValidation < 7) {
        return {
          valid: true,
          offline: true,
          license: cached,
        };
      }
    }

    return {
      valid: false,
      error: 'Unable to validate license. Please check your internet connection.',
      offline: true,
    };
  }
}

/**
 * Activates a license key and stores it locally.
 *
 * @param licenseKey - The license key to activate
 * @returns Activation result
 */
export async function activateLicense(licenseKey: string): Promise<ValidationResult> {
  const validation = await validateLicenseKey(licenseKey);

  if (!validation.valid || !validation.license) {
    return validation;
  }

  // Check for refunded/disputed
  if (
    validation.license.refunded ||
    validation.license.disputed ||
    validation.license.chargebacked
  ) {
    return {
      valid: false,
      error: 'This license has been refunded or disputed',
    };
  }

  // Store the license locally
  const licenseData: StoredLicense = {
    ...validation.license,
    activatedAt: new Date().toISOString(),
  };

  setStoredData(STORAGE_KEY, licenseData);

  return {
    valid: true,
    license: licenseData,
  };
}

/**
 * Deactivates the current license.
 */
export function deactivateLicense(): { success: boolean } {
  removeStoredData(STORAGE_KEY);
  return { success: true };
}

/**
 * Gets the stored license data.
 */
export function getStoredLicense(): StoredLicense | null {
  return getStoredData<StoredLicense>(STORAGE_KEY);
}

/**
 * Checks if user has an active premium license.
 */
export function isPremium(): boolean {
  const license = getStoredLicense();
  if (!license) return false;

  // Check if license is still valid (not too old)
  const validatedAt = new Date(license.validatedAt);
  const daysSinceValidation = (Date.now() - validatedAt.getTime()) / (1000 * 60 * 60 * 24);

  // Require re-validation every 30 days
  if (daysSinceValidation > 30) {
    return false;
  }

  return license.tier === 'premium';
}

/**
 * Gets the current license tier.
 */
export function getCurrentTier(): LicenseTier {
  return isPremium() ? LICENSE_TIERS.PREMIUM : LICENSE_TIERS.FREE;
}

// =============================================================================
// Usage Tracking
// =============================================================================

/**
 * Gets the current month's usage data.
 */
export function getUsage(): UsageData {
  const usage = getStoredData<UsageData>(USAGE_KEY) || ({} as UsageData);
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  if (usage.month !== currentMonth) {
    // Reset for new month
    return {
      month: currentMonth,
      filesOrganized: 0,
      scansPerformed: 0,
      rulesCreated: 0,
    };
  }

  return usage;
}

/**
 * Increments a usage counter.
 */
export function incrementUsage(metric: UsageMetric, amount: number = 1): UsageData {
  const usage = getUsage();
  usage[metric] = ((usage[metric] as number) || 0) + amount;
  setStoredData(USAGE_KEY, usage);
  return usage;
}

/**
 * Checks if a usage limit has been reached.
 */
export function isLimitReached(metric: UsageMetric): boolean {
  const tier = getCurrentTier();
  const usage = getUsage();

  const limitMap: Record<UsageMetric, number> = {
    filesOrganized: tier.limits.filesPerMonth,
    rulesCreated: tier.limits.rulesCount,
    scansPerformed: Infinity, // No limit on scans
  };

  const limit = limitMap[metric];
  const current = (usage[metric] as number) || 0;

  return limit !== Infinity && current >= limit;
}

/**
 * Gets remaining quota for a metric.
 */
export function getRemainingQuota(metric: UsageMetric): number {
  const tier = getCurrentTier();
  const usage = getUsage();

  const limitMap: Record<UsageMetric, number> = {
    filesOrganized: tier.limits.filesPerMonth,
    rulesCreated: tier.limits.rulesCount,
    scansPerformed: Infinity,
  };

  const limit = limitMap[metric];
  const current = (usage[metric] as number) || 0;

  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - current);
}

// =============================================================================
// Feature Gating
// =============================================================================

/**
 * Checks if a feature is available in the current tier.
 */
export function hasFeature(featureId: FeatureId): boolean {
  const tier = getCurrentTier();
  return tier.features[featureId] === true;
}

/**
 * Checks if user can perform an action (considering both feature and limits).
 */
export function canPerformAction(action: ActionType, count: number = 1): ActionPermission {
  const tier = getCurrentTier();

  switch (action) {
    case 'organizeFiles':
      if (!tier.features.fileOrganizer) return { allowed: false, reason: 'Feature not available' };

      // Check batch limit for free tier
      if (!tier.features.batchOperations && count > 10) {
        return {
          allowed: false,
          reason: 'Free tier limited to 10 files at a time',
          limit: 10,
        };
      }

      // Check monthly limit
      {
        const remaining = getRemainingQuota('filesOrganized');
        if (remaining < count) {
          return {
            allowed: false,
            reason: `Monthly limit reached (${tier.limits.filesPerMonth} files)`,
            remaining,
          };
        }

        return { allowed: true };
      }

    case 'createRule': {
      const rulesRemaining = getRemainingQuota('rulesCreated');
      if (rulesRemaining < 1) {
        return {
          allowed: false,
          reason: `Rule limit reached (${tier.limits.rulesCount} rules)`,
          remaining: 0,
        };
      }
      return { allowed: true };
    }

    case 'addCloudDrive':
      // Would need to check current count from DB
      return { allowed: tier.features.cloudSync };

    case 'rollback':
      return {
        allowed: tier.features.rollback,
        reason: tier.features.rollback ? null : 'Rollback requires Premium',
      };

    default:
      return { allowed: true };
  }
}

// =============================================================================
// React Hook Helper
// =============================================================================

/**
 * Gets the current license state for React components.
 */
export function getLicenseState(): LicenseState {
  const license = getStoredLicense();
  const tier = getCurrentTier();
  const usage = getUsage();

  return {
    isPremium: isPremium(),
    tier,
    license,
    usage,
    limits: tier.limits,
    features: tier.features,
  };
}

// =============================================================================
// Default Export
// =============================================================================

export default {
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
  LICENSE_TIERS,
  FEATURE_INFO,
};
