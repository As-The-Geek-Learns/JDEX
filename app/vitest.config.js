import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Handle lodash ESM compatibility for @testing-library/jest-dom
  optimizeDeps: {
    include: ['lodash'],
  },
  ssr: {
    noExternal: ['@testing-library/jest-dom'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    // Reset mock implementations between tests (Vitest 4 compatibility)
    mockReset: true,
    include: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'test/integration/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    exclude: ['node_modules', 'dist', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/main.jsx',
        'src/main.tsx',
        '**/*.test.{js,jsx,ts,tsx}',
        '**/*.spec.{js,jsx,ts,tsx}',
      ],
      thresholds: {
        global: { statements: 70, branches: 60, functions: 65, lines: 70 },
        // Phase 2: Utility files
        'src/utils/validation.js': { statements: 90, lines: 90 },
        'src/utils/errors.js': { statements: 85, lines: 85 },
        // Phase 4: React components
        'src/components/Stats/StatCard.jsx': { statements: 80, lines: 80 },
        'src/context/LicenseContext.jsx': { statements: 80, lines: 80 },
        'src/components/Settings/LicenseSettings.jsx': { statements: 80, lines: 80 },
        'src/components/Settings/FeedbackSettings.jsx': { statements: 80, lines: 80 },
        'src/components/Settings/CloudDriveSettings.jsx': { statements: 80, lines: 80 },
      },
    },
  },
});
