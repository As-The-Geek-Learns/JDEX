import { render } from '@testing-library/react';
import React from 'react';

// Note: Import your actual context providers here when ready
// import { LicenseProvider } from '@/context/LicenseContext';
// import { DragDropProvider } from '@/context/DragDropContext';

/**
 * Default test license state (free tier)
 */
const defaultLicenseState = {
  isValid: false,
  tier: 'free',
  email: null,
  licenseKey: null,
  expiresAt: null,
};

/**
 * Premium license state for testing premium features
 */
export const premiumLicenseState = {
  isValid: true,
  tier: 'premium',
  email: 'test@example.com',
  licenseKey: 'TEST-LICENSE-KEY',
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
};

/**
 * Render a component with all required providers
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @param {Object} [options.licenseState] - Initial license context state
 * @param {Object} [options.initialRoute] - Initial route for routing tests
 * @returns {Object} Testing library render result plus custom utilities
 * @example
 * // Render with free tier (default)
 * const { getByText } = renderWithProviders(<MyComponent />);
 *
 * // Render with premium tier
 * const { getByText } = renderWithProviders(<MyComponent />, {
 *   licenseState: premiumLicenseState
 * });
 */
export function renderWithProviders(
  ui,
  { licenseState = defaultLicenseState, ...options } = {}
) {
  // Placeholder wrapper - will be expanded when contexts are properly exported
  function Wrapper({ children }) {
    // TODO: Wrap with actual providers when LicenseContext supports initialState
    // return (
    //   <LicenseProvider initialState={licenseState}>
    //     <DragDropProvider>
    //       {children}
    //     </DragDropProvider>
    //   </LicenseProvider>
    // );
    return <>{children}</>;
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    // Custom utilities
    licenseState,
  };
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
export async function waitForCondition(
  condition,
  { timeout = 5000, interval = 50 } = {}
) {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
