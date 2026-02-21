import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@hotcrm/core': path.resolve(__dirname, 'packages/core/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/__tests__/**/*.ts', 'packages/**/?(*.)+(spec|test).ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      include: ['packages/**/src/**/*.ts'],
      exclude: [
        'packages/**/src/**/*.d.ts',
        'packages/**/src/**/*.test.ts',
        'packages/**/src/**/*.spec.ts',
        'packages/**/src/index.ts',
        'packages/**/src/db.ts',
      ],
      thresholds: {
        branches: 70,
        functions: 75,
        lines: 80,
        statements: 80,
      },
    },
    testTimeout: 10000,
  },
});
