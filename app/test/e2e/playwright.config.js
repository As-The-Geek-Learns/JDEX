// Playwright configuration for JDex Electron E2E tests
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 60000,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Electron tests must run serially
  reporter: process.env.CI ? 'github' : 'list',

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
