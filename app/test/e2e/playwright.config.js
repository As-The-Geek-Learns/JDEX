// Playwright configuration for JDex Electron E2E tests
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  // Per-test timeout (60 seconds)
  timeout: 60000,
  // Global timeout for the entire test run (10 minutes in CI)
  globalTimeout: process.env.CI ? 10 * 60 * 1000 : undefined,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Electron tests must run serially
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,

  // Test output
  outputDir: './test-results',

  // Expect configuration
  expect: {
    timeout: 10000,
  },
});
