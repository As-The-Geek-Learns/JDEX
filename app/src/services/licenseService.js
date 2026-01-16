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
// Constants
// =============================================================================

const STORAGE_KEY = 'jdex_license';
const USAGE_KEY = 'jdex_usage';
const GUMROAD_PRODUCT_ID = 'jdex-premium'; // Your Gumroad product permalink

/**
 * License tiers with their limits.
 */
export const LICENSE_TIERS = {
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
export const FEATURE_INFO = {
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
function getStoredData(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Saves data to localStorage.
 */
function setStoredData(key, data) {
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
function removeStoredData(key) {
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
 * Validates a Gumroad license key.
 * 
 * @param {string} licenseKey - The license key to validate
 * @returns {Promise<Object>} Validation result
 */
export async function validateLicenseKey(licenseKey) {
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

    const data = await response.json();

    if (data.success) {
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
        },
      };
    } else {
      return {
        valid: false,
        error: data.message || 'License key not found',
      };
    }
  } catch (error) {
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
 * @param {string} licenseKey - The license key to activate
 * @returns {Promise<Object>} Activation result
 */
export async function activateLicense(licenseKey) {
  const validation = await validateLicenseKey(licenseKey);

  if (!validation.valid) {
    return validation;
  }

  // Check for refunded/disputed
  if (validation.license.refunded || validation.license.disputed || validation.license.chargebacked) {
    return {
      valid: false,
      error: 'This license has been refunded or disputed',
    };
  }

  // Store the license locally
  const licenseData = {
    ...validation.license,
    validatedAt: new Date().toISOString(),
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
export function deactivateLicense() {
  removeStoredData(STORAGE_KEY);
  return { success: true };
}

/**
 * Gets the stored license data.
 */
export function getStoredLicense() {
  return getStoredData(STORAGE_KEY);
}

/**
 * Checks if user has an active premium license.
 */
export function isPremium() {
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
export function getCurrentTier() {
  return isPremium() ? LICENSE_TIERS.PREMIUM : LICENSE_TIERS.FREE;
}

// =============================================================================
// Usage Tracking
// =============================================================================

/**
 * Gets the current month's usage data.
 */
export function getUsage() {
  const usage = getStoredData(USAGE_KEY) || {};
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
export function incrementUsage(metric, amount = 1) {
  const usage = getUsage();
  usage[metric] = (usage[metric] || 0) + amount;
  setStoredData(USAGE_KEY, usage);
  return usage;
}

/**
 * Checks if a usage limit has been reached.
 */
export function isLimitReached(metric) {
  const tier = getCurrentTier();
  const usage = getUsage();
  
  const limitMap = {
    filesOrganized: tier.limits.filesPerMonth,
    rulesCreated: tier.limits.rulesCount,
  };
  
  const limit = limitMap[metric];
  const current = usage[metric] || 0;
  
  return limit !== Infinity && current >= limit;
}

/**
 * Gets remaining quota for a metric.
 */
export function getRemainingQuota(metric) {
  const tier = getCurrentTier();
  const usage = getUsage();
  
  const limitMap = {
    filesOrganized: tier.limits.filesPerMonth,
    rulesCreated: tier.limits.rulesCount,
  };
  
  const limit = limitMap[metric];
  const current = usage[metric] || 0;
  
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - current);
}

// =============================================================================
// Feature Gating
// =============================================================================

/**
 * Checks if a feature is available in the current tier.
 */
export function hasFeature(featureId) {
  const tier = getCurrentTier();
  return tier.features[featureId] === true;
}

/**
 * Checks if user can perform an action (considering both feature and limits).
 */
export function canPerformAction(action, count = 1) {
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
      const remaining = getRemainingQuota('filesOrganized');
      if (remaining < count) {
        return {
          allowed: false,
          reason: `Monthly limit reached (${tier.limits.filesPerMonth} files)`,
          remaining,
        };
      }
      
      return { allowed: true };
    
    case 'createRule':
      const rulesRemaining = getRemainingQuota('rulesCreated');
      if (rulesRemaining < 1) {
        return {
          allowed: false,
          reason: `Rule limit reached (${tier.limits.rulesCount} rules)`,
          remaining: 0,
        };
      }
      return { allowed: true };
    
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
export function getLicenseState() {
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
// Exports
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
