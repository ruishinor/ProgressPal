import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Split stable third-party runtime deps and the cross-tab/storage safety
        // boundary into separate chunks. All remain statically imported and
        // module-preloaded, so offline route behavior is unchanged. This does
        // not pretend to reduce total JS; it enforces meaningful ownership and
        // keeps each raw chunk below the v1.3 500 kB ceiling.
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('/src/lib/storage/')) {
            return 'storage-safety';
          }

          if (normalizedId.includes('/src/lib/backup/')) {
            return 'backup';
          }

          if (!normalizedId.includes('/node_modules/')) {
            return undefined;
          }

          if (normalizedId.includes('/node_modules/react-router')) {
            return 'router';
          }

          if (
            normalizedId.includes('/node_modules/react-dom') ||
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/scheduler')
          ) {
            return 'react';
          }

          if (normalizedId.includes('/node_modules/zod')) {
            return 'zod';
          }

          if (normalizedId.includes('/node_modules/dexie')) {
            return 'dexie';
          }

          return 'vendor';
        },
      },
    },
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
