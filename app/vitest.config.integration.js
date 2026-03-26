import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Integration test configuration
 * Runs ONLY integration tests in test/integration/
 * Uses sequential execution to avoid state conflicts
 *
 * NOTE: This config does NOT inherit from vitest.config.js to ensure
 * the include pattern is not merged with unit test patterns.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['lodash'],
  },
  ssr: {
    noExternal: ['@testing-library/jest-dom'],
  },
  test: {
    name: 'integration',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.js', './test/setup-integration.js'],
    // Reset mock implementations between tests (Vitest 4 compatibility)
    mockReset: true,
    // ONLY include integration tests
    include: ['test/integration/**/*.{test,spec}.{js,jsx}'],
    exclude: ['node_modules', 'dist', 'build', 'src/**'],
    // Longer timeout for integration tests
    testTimeout: 10000,
    // Run sequentially to avoid state conflicts between tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
