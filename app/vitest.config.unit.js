import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.js';

/**
 * Unit test configuration
 * Runs only unit and component tests in src/
 * Excludes integration tests in test/integration/
 */
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: 'unit',
      include: ['src/**/*.{test,spec}.{js,jsx}'],
      exclude: ['node_modules', 'dist', 'build', 'test/integration/**'],
    },
  })
);
