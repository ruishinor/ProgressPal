import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split stable third-party runtime deps into separate vendor chunks so
        // no single eager chunk exceeds the 600 kB warning budget. All chunks
        // stay statically imported (module-preloaded at load), so in-session
        // offline navigation is unchanged. This does not reduce total shipped
        // JS; it resolves the per-chunk warning and improves cache separation.
        // See DECISIONS.md (Module 14 Phase 2b).
        manualChunks(id) {
          if (!id.includes('/node_modules/')) {
            return undefined;
          }

          const normalizedId = id.replace(/\\/g, '/');

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
