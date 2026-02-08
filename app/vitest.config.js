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
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    exclude: ['node_modules', 'dist', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', '**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
      thresholds: {
        global: { statements: 60, branches: 50, functions: 60, lines: 60 },
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
