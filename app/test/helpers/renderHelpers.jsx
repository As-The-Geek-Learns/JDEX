import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { createContext, useContext } from 'react';

// =============================================================================
// License Constants (mirrors licenseService.js)
// =============================================================================

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
    description: 'Process multiple files at once',
    freeLimit: '5 files at a time',
  },
};

// =============================================================================
// Mock License Context
// =============================================================================

export const MockLicenseContext = createContext(null);

/**
 * Default free tier license state for testing
 */
export const freeLicenseState = {
  isPremium: false,
  tier: LICENSE_TIERS.FREE,
  license: null,
  usage: { filesOrganized: 0, rulesCreated: 0 },
  loading: false,
  error: null,
};

/**
 * Premium license state for testing premium features
 */
export const premiumLicenseState = {
  isPremium: true,
  tier: LICENSE_TIERS.PREMIUM,
  license: {
    key: 'TEST-LICENSE-KEY-1234',
    email: 'test@example.com',
    validatedAt: new Date().toISOString(),
    purchaseDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  usage: { filesOrganized: 0, rulesCreated: 0 },
  loading: false,
  error: null,
};

/**
 * Create a mock license context value with defaults
 * @param {Object} overrides - Properties to override
 * @returns {Object} Complete mock license context value
 */
export function createMockLicenseValue(overrides = {}) {
  const baseState = overrides.isPremium ? premiumLicenseState : freeLicenseState;
  return {
    ...baseState,
    // Actions (all mocked as vi.fn or jest.fn)
    activateLicense: vi.fn().mockResolvedValue({ success: true }),
    deactivateLicense: vi.fn().mockReturnValue({ success: true }),
    checkAction: vi.fn().mockReturnValue(true),
    trackUsage: vi.fn(),
    refreshState: vi.fn(),
    // Helpers
    hasFeature: vi.fn((featureId) => {
      const tier = overrides.tier || baseState.tier;
      return tier?.features?.[featureId] ?? false;
    }),
    getRemainingQuota: vi.fn().mockReturnValue(50),
    // Constants
    LICENSE_TIERS,
    FEATURE_INFO,
    // Apply any overrides
    ...overrides,
  };
}

/**
 * Mock License Provider for testing components that use useLicense()
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.value - License context value (use createMockLicenseValue)
 */
export function MockLicenseProvider({ children, value }) {
  const contextValue = value || createMockLicenseValue();
  return <MockLicenseContext.Provider value={contextValue}>{children}</MockLicenseContext.Provider>;
}

/**
 * Mock useLicense hook for testing - matches the real useLicense API
 */
export function useMockLicense() {
  const context = useContext(MockLicenseContext);
  if (!context) {
    throw new Error('useMockLicense must be used within a MockLicenseProvider');
  }
  return context;
}

// =============================================================================
// Render Helpers
// =============================================================================

/**
 * Render a component with all required providers
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @param {Object} [options.licenseValue] - License context value (use createMockLicenseValue)
 * @param {boolean} [options.withLicenseProvider=true] - Whether to wrap with MockLicenseProvider
 * @returns {Object} Testing library render result plus custom utilities
 * @example
 * // Render with free tier (default)
 * const { getByText } = renderWithProviders(<MyComponent />);
 *
 * // Render with premium tier
 * const { getByText } = renderWithProviders(<MyComponent />, {
 *   licenseValue: createMockLicenseValue({ isPremium: true })
 * });
 *
 * // Render with custom license state
 * const mockActivate = vi.fn().mockResolvedValue({ success: true });
 * const { getByText } = renderWithProviders(<MyComponent />, {
 *   licenseValue: createMockLicenseValue({
 *     isPremium: false,
 *     activateLicense: mockActivate,
 *   })
 * });
 */
export function renderWithProviders(
  ui,
  { licenseValue, withLicenseProvider = true, ...options } = {}
) {
  const contextValue = licenseValue || createMockLicenseValue();

  function Wrapper({ children }) {
    if (withLicenseProvider) {
      return <MockLicenseProvider value={contextValue}>{children}</MockLicenseProvider>;
    }
    return <>{children}</>;
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    // Custom utilities
    licenseValue: contextValue,
    // Re-render helper with same providers
    rerender: (newUi) =>
      render(newUi, {
        wrapper: Wrapper,
        container: options.container,
      }),
  };
}

/**
 * Render without any providers (for pure components like StatCard)
 */
export function renderPlain(ui, options = {}) {
  return render(ui, options);
}

/**
 * Create a mock event for testing event handlers
 * @param {Object} overrides - Properties to override on the event
 * @returns {Object} Mock event object
 * @example
 * const mockEvent = createMockEvent({ target: { value: 'test' } });
 * fireEvent.change(input, mockEvent);
 */
export function createMockEvent(overrides = {}) {
  return {
    preventDefault: () => {},
    stopPropagation: () => {},
    target: {},
    currentTarget: {},
    ...overrides,
  };
}

/**
 * Wait for a condition to be true (useful for async operations)
 * @param {Function} condition - Function that returns true when condition is met
 * @param {Object} options - Options
 * @param {number} [options.timeout=5000] - Maximum time to wait in ms
 * @param {number} [options.interval=50] - Check interval in ms
 * @returns {Promise<void>}
 * @example
 * await waitForCondition(() => screen.queryByText('Loaded') !== null);
 */
export async function waitForCondition(condition, { timeout = 5000, interval = 50 } = {}) {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
