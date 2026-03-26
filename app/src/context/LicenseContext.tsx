/**
 * License Context
 * ===============
 * React context for managing license state throughout the app.
 *
 * Usage:
 *   <LicenseProvider>
 *     <App />
 *   </LicenseProvider>
 *
 *   // In components:
 *   const { isPremium, tier, activateLicense } = useLicense();
 */

import type { ReactNode, ComponentType, JSX } from 'react';
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import {
  getLicenseState,
  activateLicense as doActivate,
  deactivateLicense as doDeactivate,
  validateLicenseKey,
  canPerformAction,
  incrementUsage,
  hasFeature,
  getRemainingQuota,
  LICENSE_TIERS,
  FEATURE_INFO,
  type LicenseState,
  type StoredLicense,
  type LicenseTier,
  type ActionPermission,
  type UsageMetric,
  type ActionType,
  type FeatureId,
  type FeatureInfo,
} from '../services/licenseService.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Result of license activation.
 */
export interface ActivationResult {
  success: boolean;
  license?: StoredLicense;
  error?: string;
}

/**
 * Result of license deactivation.
 */
export interface DeactivationResult {
  success: boolean;
}

/**
 * Context value for license operations.
 */
export interface LicenseContextValue extends LicenseState {
  loading: boolean;
  error: string | null;

  // Actions
  activateLicense: (licenseKey: string) => Promise<ActivationResult>;
  deactivateLicense: () => DeactivationResult;
  checkAction: (action: ActionType, count?: number) => ActionPermission;
  trackUsage: (metric: UsageMetric, amount?: number) => void;
  refreshState: () => void;

  // Helpers
  hasFeature: (featureId: FeatureId) => boolean;
  getRemainingQuota: (metric: UsageMetric) => number;

  // Constants
  LICENSE_TIERS: { FREE: LicenseTier; PREMIUM: LicenseTier };
  FEATURE_INFO: Record<string, FeatureInfo>;
}

/**
 * Props for the LicenseProvider component.
 */
export interface LicenseProviderProps {
  children: ReactNode;
}

/**
 * Props for the UpgradePrompt component.
 */
export interface UpgradePromptProps {
  feature: string;
  onClose?: () => void;
  inline?: boolean;
}

/**
 * Props for the UsageLimitWarning component.
 */
export interface UsageLimitWarningProps {
  metric: string;
  current: number;
  limit: number;
}

// =============================================================================
// Context
// =============================================================================

const LicenseContext = createContext<LicenseContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

export function LicenseProvider({ children }: LicenseProviderProps): JSX.Element {
  const [state, setState] = useState<LicenseState>(() => getLicenseState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh state from storage
  const refreshState = useCallback((): void => {
    setState(getLicenseState());
  }, []);

  // Activate a license
  const activateLicense = useCallback(
    async (licenseKey: string): Promise<ActivationResult> => {
      setLoading(true);
      setError(null);

      try {
        const result = await doActivate(licenseKey);

        if (result.valid) {
          refreshState();
          return { success: true, license: result.license };
        } else {
          setError(result.error || 'Activation failed');
          return { success: false, error: result.error };
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to activate license';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [refreshState]
  );

  // Deactivate license
  const deactivateLicense = useCallback((): DeactivationResult => {
    doDeactivate();
    refreshState();
    return { success: true };
  }, [refreshState]);

  // Check if action is allowed
  const checkAction = useCallback((action: ActionType, count: number = 1): ActionPermission => {
    return canPerformAction(action, count);
  }, []);

  // Track usage
  const trackUsage = useCallback(
    (metric: UsageMetric, amount: number = 1): void => {
      incrementUsage(metric, amount);
      refreshState();
    },
    [refreshState]
  );

  // Memoize helper functions to prevent new references on each render
  const checkFeature = useCallback((featureId: FeatureId): boolean => hasFeature(featureId), []);
  const getQuota = useCallback((metric: UsageMetric): number => getRemainingQuota(metric), []);

  // Re-validate license periodically (every hour while app is open)
  useEffect(() => {
    const licenseKey = state.license?.key;
    if (licenseKey) {
      const interval = setInterval(
        () => {
          validateLicenseKey(licenseKey).then((result) => {
            if (!result.valid && !result.offline) {
              // License became invalid
              doDeactivate();
              refreshState();
            }
          });
        },
        60 * 60 * 1000
      ); // 1 hour

      return () => clearInterval(interval);
    }
  }, [state.license, refreshState]);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo<LicenseContextValue>(
    () => ({
      // State
      ...state,
      loading,
      error,

      // Actions
      activateLicense,
      deactivateLicense,
      checkAction,
      trackUsage,
      refreshState,

      // Helpers (memoized)
      hasFeature: checkFeature,
      getRemainingQuota: getQuota,

      // Constants
      LICENSE_TIERS,
      FEATURE_INFO,
    }),
    [
      state,
      loading,
      error,
      activateLicense,
      deactivateLicense,
      checkAction,
      trackUsage,
      refreshState,
      checkFeature,
      getQuota,
    ]
  );

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

// eslint-disable-next-line react-refresh/only-export-components
export function useLicense(): LicenseContextValue {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
}

// =============================================================================
// HOC for feature gating
// =============================================================================

// eslint-disable-next-line react-refresh/only-export-components
export function withPremiumFeature<P extends object>(
  WrappedComponent: ComponentType<P>,
  featureId: string
): ComponentType<P> {
  return function PremiumGatedComponent(props: P): JSX.Element {
    const { hasFeature: checkHasFeature } = useLicense();

    if (!checkHasFeature(featureId as FeatureId)) {
      return <UpgradePrompt feature={featureId} />;
    }

    return <WrappedComponent {...props} />;
  };
}

// =============================================================================
// Upgrade Prompt Component
// =============================================================================

export function UpgradePrompt({
  feature,
  onClose,
  inline = false,
}: UpgradePromptProps): JSX.Element {
  const featureInfo: FeatureInfo = FEATURE_INFO[feature] || {
    name: 'Premium Feature',
    description: 'This feature requires a premium license',
    freeLimit: 'Not available',
  };

  const content = (
    <div
      className={`
      ${inline ? '' : 'fixed inset-0 bg-black/50 flex items-center justify-center z-50'}
    `}
    >
      <div
        className={`
        bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden
        ${inline ? 'w-full' : 'w-full max-w-md mx-4 shadow-2xl'}
      `}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-teal-600 p-6 text-center">
          <div className="text-4xl mb-2">⭐</div>
          <h3 className="text-xl font-bold text-white">Upgrade to Premium</h3>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-white mb-1">{featureInfo.name}</h4>
            <p className="text-gray-400">{featureInfo.description}</p>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Free tier:</span>
              <span className="text-yellow-400">{featureInfo.freeLimit}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-gray-400">Premium:</span>
              <span className="text-green-400">Unlimited</span>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <p className="text-sm text-gray-400 font-medium">Premium includes:</p>
            <ul className="text-sm space-y-1">
              {Object.entries(FEATURE_INFO)
                .slice(0, 4)
                .map(([key, info]) => (
                  <li key={key} className="flex items-center gap-2 text-gray-300">
                    <span className="text-green-400">✓</span>
                    {info.name}
                  </li>
                ))}
            </ul>
          </div>

          {/* CTA */}
          <a
            href="https://jamescruce.gumroad.com/l/jdex-premium"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 bg-gradient-to-r from-purple-600 to-teal-600
              hover:from-purple-500 hover:to-teal-500 text-white font-semibold
              rounded-lg text-center transition-all transform hover:scale-[1.02]"
          >
            Get Premium - $19
          </a>

          <p className="text-xs text-center text-gray-500">
            One-time purchase • Lifetime updates • 30-day refund
          </p>
        </div>

        {/* Close button */}
        {onClose && (
          <div className="px-6 pb-6">
            <button
              onClick={onClose}
              className="w-full py-2 text-gray-400 hover:text-white transition-colors"
            >
              Maybe later
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return content;
}

// =============================================================================
// Usage Limit Warning Component
// =============================================================================

export function UsageLimitWarning({
  metric,
  current,
  limit,
}: UsageLimitWarningProps): JSX.Element | null {
  const percentage = limit === Infinity ? 0 : (current / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  if (limit === Infinity) return null;

  return (
    <div
      className={`
      rounded-lg p-3 text-sm
      ${
        isAtLimit
          ? 'bg-red-900/30 border border-red-700'
          : isNearLimit
            ? 'bg-yellow-900/30 border border-yellow-700'
            : 'bg-slate-800'
      }
    `}
    >
      <div className="flex justify-between items-center mb-2">
        <span
          className={isAtLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-gray-400'}
        >
          {metric === 'filesOrganized' ? 'Files this month' : metric}
        </span>
        <span className="text-white font-medium">
          {current} / {limit}
        </span>
      </div>

      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-teal-500'
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>

      {isAtLimit && (
        <p className="text-red-400 text-xs mt-2">
          Limit reached. Upgrade to Premium for unlimited usage.
        </p>
      )}
    </div>
  );
}

export default LicenseContext;
