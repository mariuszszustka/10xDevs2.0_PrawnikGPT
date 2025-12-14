import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Environment for DOM testing
    environment: 'jsdom',

    // Setup files run before each test file
    setupFiles: ['./src/test/setup.ts'],

    // Global test settings
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '.astro/',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/test/**',
        '**/__tests__/**',
        'src/components/ui/**', // Shadcn/ui components (external)
      ],
      // Coverage thresholds (MVP target: ≥50%)
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },

    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/__tests__/**/*.{js,ts,jsx,tsx}',
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.astro',
      'e2e',
    ],

    // Test timeout (in ms)
    testTimeout: 10000,

    // Hook timeout (in ms)
    hookTimeout: 10000,
  },

  // Path aliases (matching tsconfig.json)
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/layouts': resolve(__dirname, './src/layouts'),
    },
  },
});
