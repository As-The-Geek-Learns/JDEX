/**
 * License Settings Component
 * ==========================
 * UI for managing premium license activation.
 */

import type { JSX } from 'react';
import { useState, type ChangeEvent } from 'react';
import { useLicense, UsageLimitWarning } from '../../context/LicenseContext.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Icon component type
 */
type IconComponent = () => JSX.Element;

// ============================================
// ICONS
// ============================================

const Icons: Record<string, IconComponent> = {
  Check: (): JSX.Element => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Star: (): JSX.Element => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Key: (): JSX.Element => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
      />
    </svg>
  ),
  X: (): JSX.Element => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function LicenseSettings(): JSX.Element {
  const {
    isPremium,
    tier,
    license,
    usage,
    loading: _loading,
    error: _error,
    activateLicense,
    deactivateLicense,
    FEATURE_INFO,
  } = useLicense();

  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const handleActivate = async (): Promise<void> => {
    if (!licenseKey.trim()) {
      setActivationError('Please enter a license key');
      return;
    }

    setActivating(true);
    setActivationError('');

    const result = await activateLicense(licenseKey);

    setActivating(false);

    if (result.success) {
      setLicenseKey('');
    } else {
      setActivationError(result.error || 'Activation failed');
    }
  };

  const handleDeactivate = (): void => {
    deactivateLicense();
    setShowDeactivateConfirm(false);
  };

  const handleLicenseKeyChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setLicenseKey(e.target.value.toUpperCase());
  };

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Icons.Key />
          License
        </h2>
        <p className="text-gray-400">Manage your JDex license and view usage</p>
      </div>

      {/* Current Status */}
      <div
        className={`
        rounded-lg p-4 mb-6
        ${
          isPremium
            ? 'bg-gradient-to-r from-purple-900/50 to-teal-900/50 border border-purple-700'
            : 'bg-slate-800'
        }
      `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPremium ? (
              <div
                className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-teal-500
                flex items-center justify-center text-white"
              >
                <Icons.Star />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-full bg-slate-700
                flex items-center justify-center text-gray-400"
              >
                <Icons.Key />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-white">
                {isPremium ? 'Premium License' : 'Free Tier'}
              </h3>
              {isPremium && license?.email && (
                <p className="text-sm text-gray-400">{license.email}</p>
              )}
            </div>
          </div>

          {isPremium && (
            <button
              onClick={() => setShowDeactivateConfirm(true)}
              className="text-sm text-gray-400 hover:text-red-400 transition-colors"
            >
              Deactivate
            </button>
          )}
        </div>

        {isPremium && license?.activatedAt && (
          <p className="text-xs text-gray-500 mt-3">
            Activated: {new Date(license.activatedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Deactivation Confirmation */}
      {showDeactivateConfirm && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-400 mb-3">
            Are you sure you want to deactivate your license? You can reactivate it anytime.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDeactivate}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
            >
              Yes, Deactivate
            </button>
            <button
              onClick={() => setShowDeactivateConfirm(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Activate License (if not premium) */}
      {!isPremium && (
        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-white mb-3">Activate License</h4>

          <div className="flex gap-2">
            <input
              type="text"
              value={licenseKey}
              onChange={handleLicenseKeyChange}
              placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-md
                text-white font-mono text-sm placeholder-gray-500
                focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              disabled={activating}
            />
            <button
              onClick={handleActivate}
              disabled={activating || !licenseKey.trim()}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700
                disabled:text-gray-500 text-white rounded-md font-medium transition-colors"
            >
              {activating ? 'Activating...' : 'Activate'}
            </button>
          </div>

          {activationError && <p className="text-red-400 text-sm mt-2">{activationError}</p>}

          <p className="text-xs text-gray-500 mt-3">
            Enter your license key from your Gumroad purchase email.
          </p>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <a
              href="https://jamescruce.gumroad.com/l/jdex-premium"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 text-sm"
            >
              <Icons.Star />
              Get Premium License - $19
            </a>
          </div>
        </div>
      )}

      {/* Usage Stats */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-white mb-4">This Month's Usage</h4>

        <UsageLimitWarning
          metric="filesOrganized"
          current={usage?.filesOrganized || 0}
          limit={tier.limits.filesPerMonth}
        />
      </div>

      {/* Feature Comparison */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h4 className="font-medium text-white mb-4">Features</h4>

        <div className="space-y-3">
          {Object.entries(FEATURE_INFO).map(([key, info]) => {
            const hasIt = tier.features[key as keyof typeof tier.features];
            return (
              <div
                key={key}
                className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className={hasIt ? 'text-green-400' : 'text-gray-600'}>
                    {hasIt ? <Icons.Check /> : <Icons.X />}
                  </span>
                  <div>
                    <span className={hasIt ? 'text-white' : 'text-gray-500'}>{info.name}</span>
                    <p className="text-xs text-gray-500">{info.description}</p>
                  </div>
                </div>
                {!hasIt && !isPremium && (
                  <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-1 rounded">
                    Premium
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
