/**
 * Integration Test Provider Setup
 *
 * Combines all context providers needed for integration testing.
 * Use this for tests that need License + DragDrop + other contexts.
 */

import { createContext, useContext, useState } from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import {
  MockLicenseProvider,
  createMockLicenseValue,
  LICENSE_TIERS,
  FEATURE_INFO,
} from './renderHelpers.jsx';

// =============================================================================
// DragDrop Context Mock
// =============================================================================

export const MockDragDropContext = createContext(null);

/**
 * Create a mock DragDrop context value
 * @param {Object} overrides - Properties to override
 * @returns {Object} Complete mock DragDrop context value
 */
export function createMockDragDropValue(overrides = {}) {
  return {
    // State
    isDragging: false,
    isDraggingFiles: false,
    dragData: null,
    hoverTarget: null,
    dragCounter: 0,

    // Actions
    handleDragEnter: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDragOver: vi.fn(),
    handleDrop: vi.fn(),
    handleDragStart: vi.fn(),
    handleDragEnd: vi.fn(),
    setHoverTarget: vi.fn(),
    clearHoverTarget: vi.fn(),
    setDragData: vi.fn(),
    clearDragData: vi.fn(),

    // Apply overrides
    ...overrides,
  };
}

/**
 * Mock DragDrop Provider for integration tests
 */
export function MockDragDropProvider({ children, value }) {
  const contextValue = value || createMockDragDropValue();
  return (
    <MockDragDropContext.Provider value={contextValue}>{children}</MockDragDropContext.Provider>
  );
}

/**
 * Mock useDragDrop hook
 */
export function useMockDragDrop() {
  const context = useContext(MockDragDropContext);
  if (!context) {
    throw new Error('useMockDragDrop must be used within a MockDragDropProvider');
  }
  return context;
}

// =============================================================================
// Integration Database Setup
// =============================================================================

/**
 * Set up integration test database with JD hierarchy and optional data
 * @param {Object} config - Database configuration
 * @param {Object} config.hierarchy - JD hierarchy (areas, categories, folders, items)
 * @param {Array} config.rules - Organization rules
 * @param {Array} config.cloudDrives - Cloud drive configurations
 * @param {Array} config.organizedFiles - Previously organized files
 * @param {Object} config.statistics - Statistics data
 */
export async function setupIntegrationDb(config = {}) {
  // Dynamic import to avoid hoisting issues
  const sqlJsMock = await import('../../__mocks__/sql.js.js');
  const { __setTableData, __resetMockDb } = sqlJsMock;

  // Reset database state
  __resetMockDb();

  // Set up JD hierarchy
  if (config.hierarchy) {
    if (config.hierarchy.areas) {
      __setTableData('areas', config.hierarchy.areas);
    }
    if (config.hierarchy.categories) {
      __setTableData('categories', config.hierarchy.categories);
    }
    if (config.hierarchy.folders) {
      __setTableData('folders', config.hierarchy.folders);
    }
    if (config.hierarchy.items) {
      __setTableData('items', config.hierarchy.items);
    }
  }

  // Set up organization rules
  if (config.rules) {
    __setTableData('file_organization_rules', config.rules);
  }

  // Set up cloud drives
  if (config.cloudDrives) {
    __setTableData('cloud_drives', config.cloudDrives);
  }

  // Set up organized files history
  if (config.organizedFiles) {
    __setTableData('organized_files', config.organizedFiles);
  }

  // Set up activity log
  if (config.activityLog) {
    __setTableData('activity_log', config.activityLog);
  }

  return { __setTableData, __resetMockDb };
}

/**
 * Reset integration test database to empty state
 */
export async function resetIntegrationDb() {
  const sqlJsMock = await import('../../__mocks__/sql.js.js');
  sqlJsMock.__resetMockDb();
}

// =============================================================================
// Combined Provider Wrapper
// =============================================================================

/**
 * Render with all providers needed for integration tests
 *
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @param {Object} [options.licenseValue] - License context value
 * @param {Object} [options.dragDropValue] - DragDrop context value
 * @param {boolean} [options.isPremium=false] - Shorthand for premium license
 * @param {boolean} [options.withLicenseProvider=true] - Include LicenseProvider
 * @param {boolean} [options.withDragDropProvider=true] - Include DragDropProvider
 * @returns {Object} Render result with context values
 *
 * @example
 * // Render with free tier (default)
 * const { getByText, licenseValue } = renderWithAllProviders(<FileOrganizer />);
 *
 * // Render with premium tier
 * const { getByText } = renderWithAllProviders(<FileOrganizer />, { isPremium: true });
 *
 * // Render with custom contexts
 * const mockDragDrop = createMockDragDropValue({ isDragging: true });
 * const { getByText } = renderWithAllProviders(<DropZone />, {
 *   isPremium: true,
 *   dragDropValue: mockDragDrop,
 * });
 */
export function renderWithAllProviders(
  ui,
  {
    licenseValue,
    dragDropValue,
    isPremium = false,
    withLicenseProvider = true,
    withDragDropProvider = true,
    ...options
  } = {}
) {
  const licenseCtx = licenseValue || createMockLicenseValue({ isPremium });
  const dragDropCtx = dragDropValue || createMockDragDropValue();

  function AllProviders({ children }) {
    let wrapped = children;

    if (withDragDropProvider) {
      wrapped = <MockDragDropProvider value={dragDropCtx}>{wrapped}</MockDragDropProvider>;
    }

    if (withLicenseProvider) {
      wrapped = <MockLicenseProvider value={licenseCtx}>{wrapped}</MockLicenseProvider>;
    }

    return wrapped;
  }

  const renderResult = render(ui, { wrapper: AllProviders, ...options });

  return {
    ...renderResult,
    // Expose context values for assertions
    licenseValue: licenseCtx,
    dragDropValue: dragDropCtx,
    // Re-render helper with same providers
    rerender: (newUi) =>
      render(newUi, {
        wrapper: AllProviders,
        container: renderResult.container,
      }),
  };
}

// =============================================================================
// Test State Helpers
// =============================================================================

/**
 * Create a stateful mock license provider for testing state changes
 * Useful when testing license activation/deactivation flows
 */
export function StatefulLicenseProvider({ children, initialState = {} }) {
  const [state, setState] = useState({
    isPremium: false,
    tier: LICENSE_TIERS.FREE,
    license: null,
    usage: { filesOrganized: 0, rulesCreated: 0 },
    loading: false,
    error: null,
    ...initialState,
  });

  const contextValue = {
    ...state,
    activateLicense: vi.fn(async (key) => {
      setState((prev) => ({ ...prev, loading: true }));
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (key === 'VALID-PREMIUM-KEY') {
        setState({
          isPremium: true,
          tier: LICENSE_TIERS.PREMIUM,
          license: { key, email: 'test@example.com', validatedAt: new Date().toISOString() },
          usage: { filesOrganized: 0, rulesCreated: 0 },
          loading: false,
          error: null,
        });
        return { success: true };
      }
      setState((prev) => ({ ...prev, loading: false, error: 'Invalid license key' }));
      return { success: false, error: 'Invalid license key' };
    }),
    deactivateLicense: vi.fn(() => {
      setState({
        isPremium: false,
        tier: LICENSE_TIERS.FREE,
        license: null,
        usage: { filesOrganized: 0, rulesCreated: 0 },
        loading: false,
        error: null,
      });
      return { success: true };
    }),
    checkAction: vi.fn((action, count = 1) => {
      const tier = state.tier;
      const limits = tier.limits;
      const usage = state.usage;

      switch (action) {
        case 'organizeFile':
          return usage.filesOrganized + count <= limits.filesPerMonth;
        case 'createRule':
          return usage.rulesCreated + count <= limits.rulesCount;
        default:
          return true;
      }
    }),
    trackUsage: vi.fn((action, count = 1) => {
      setState((prev) => ({
        ...prev,
        usage: {
          ...prev.usage,
          [action === 'organizeFile' ? 'filesOrganized' : 'rulesCreated']:
            prev.usage[action === 'organizeFile' ? 'filesOrganized' : 'rulesCreated'] + count,
        },
      }));
    }),
    hasFeature: vi.fn((featureId) => state.tier?.features?.[featureId] ?? false),
    getRemainingQuota: vi.fn((action) => {
      const limits = state.tier.limits;
      const usage = state.usage;
      if (action === 'organizeFile') {
        return Math.max(0, limits.filesPerMonth - usage.filesOrganized);
      }
      return Infinity;
    }),
    refreshState: vi.fn(),
    LICENSE_TIERS,
    FEATURE_INFO,
  };

  return <MockLicenseProvider value={contextValue}>{children}</MockLicenseProvider>;
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export {
  MockLicenseProvider,
  createMockLicenseValue,
  LICENSE_TIERS,
  FEATURE_INFO,
} from './renderHelpers.jsx';
