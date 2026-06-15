import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 600,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    css: true,
    environment: 'jsdom',
    fileParallelism: false,
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
    ],
    setupFiles: './vitest.setup.ts',
  },
});
