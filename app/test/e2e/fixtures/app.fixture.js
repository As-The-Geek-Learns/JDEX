/* eslint-disable react-hooks/rules-of-hooks */
// Electron app fixture for Playwright E2E tests
// Note: The eslint-disable above is needed because Playwright's `use` fixture function
// is incorrectly identified as a React hook by the react-hooks ESLint plugin.
import { test as base, _electron as electron } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the app root
const APP_ROOT = path.resolve(__dirname, '../../..');

// Verbose logging for CI debugging
const log = (message) => {
  if (process.env.CI || process.env.DEBUG) {
    console.log(`[E2E ${new Date().toISOString()}] ${message}`);
  }
};

/**
 * Custom test fixture that launches the Electron app
 * and provides the main window to tests.
 */
export const test = base.extend({
  /**
   * Electron app instance
   */
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    log('Starting Electron app launch...');

    // Build Electron args - add sandbox disabling for CI environments
    const electronArgs = [path.join(APP_ROOT, 'electron/main.js')];
    if (process.env.CI) {
      // GitHub Actions runners don't have proper permissions for chrome-sandbox
      electronArgs.unshift('--no-sandbox', '--disable-setuid-sandbox');
      log('CI detected - added sandbox disabling flags');
    }

    log(`Electron args: ${electronArgs.join(' ')}`);
    log(`Working directory: ${APP_ROOT}`);

    // Launch Electron app with timeout
    let app;
    try {
      log('Calling electron.launch()...');
      app = await electron.launch({
        args: electronArgs,
        cwd: APP_ROOT,
        timeout: 60000, // 60 second launch timeout
        env: {
          ...process.env,
          NODE_ENV: 'test',
          // Enable Electron debug logging in CI
          ...(process.env.CI && { ELECTRON_ENABLE_LOGGING: '1' }),
        },
      });
      log('Electron app launched successfully');
    } catch (error) {
      log(`Electron launch failed: ${error.message}`);
      throw error;
    }

    // Use the app in tests
    await use(app);

    // Cleanup
    log('Closing Electron app...');
    await app.close();
    log('Electron app closed');
  },

  /**
   * Main window of the Electron app
   */
  window: async ({ electronApp }, use) => {
    log('Waiting for first window...');
    const window = await electronApp.firstWindow();
    log('First window obtained');

    // Log the window URL for debugging
    const url = window.url();
    log(`Window URL: ${url}`);

    // Wait for the app to fully load (loading screen to disappear)
    log('Waiting for app content to load...');
    await window
      .waitForSelector('[data-testid="app-ready"], .sidebar, nav', {
        timeout: 30000,
        state: 'visible',
      })
      .catch(async () => {
        log('Primary selector not found, trying fallback...');
        // Fallback: wait for any main content
        return window.waitForSelector('main, .content-area, [class*="bg-"]', {
          timeout: 30000,
        });
      });
    log('App content loaded');

    // Additional wait for database initialization
    await window.waitForTimeout(500);
    log('Window fixture ready');

    await use(window);
  },

  /**
   * Reset database state before each test
   */
  cleanState: async ({ window }, use) => {
    // Clear localStorage to reset database
    await window.evaluate(() => {
      localStorage.clear();
    });

    // Reload to reinitialize with fresh state
    await window.reload();

    // Wait for app to be ready again
    await window.waitForTimeout(1000);

    await use(undefined);
  },
});

export { expect } from '@playwright/test';

/**
 * Helper to wait for app loading to complete
 */
export async function waitForAppReady(window) {
  // Wait for loading screen to disappear
  await window.waitForFunction(
    () => {
      const loading = document.querySelector('[class*="animate-pulse"]');
      const content = document.querySelector('.sidebar, nav, main');
      return !loading && content;
    },
    { timeout: 30000 }
  );
}

/**
 * Helper to get the current view title
 */
export async function getCurrentViewTitle(window) {
  const title = await window.locator('h1, h2').first().textContent();
  return title?.trim() || '';
}

/**
 * Helper to click a sidebar navigation item
 */
export async function navigateToArea(window, areaName) {
  await window.locator('.sidebar, nav').getByText(areaName, { exact: false }).click();
  await window.waitForTimeout(300);
}

/**
 * Helper to open a modal by clicking a button
 */
export async function openModal(window, buttonText) {
  await window.getByRole('button', { name: buttonText }).click();
  await window.waitForTimeout(300);
}

/**
 * Helper to fill a form field
 */
export async function fillField(window, labelText, value) {
  const field = window.getByLabel(labelText, { exact: false });
  await field.clear();
  await field.fill(value);
}

/**
 * Helper to submit a form
 */
export async function submitForm(window, buttonText = 'Save') {
  await window.getByRole('button', { name: buttonText }).click();
  await window.waitForTimeout(500);
}
