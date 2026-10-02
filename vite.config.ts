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

          // Programme lesson content: one static chunk per committed content
          // file, so each stays under the raw per-chunk budget. Statically
          // imported, so it remains a boot asset the service worker caches.
          const programmeContent = normalizedId.match(
            /\/src\/programmes\/([a-z0-9-]+)\/content\/([a-z0-9-]+)\.json$/,
          );

          if (programmeContent !== null) {
            return `content-${programmeContent[1]}-${programmeContent[2]}`;
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
  preview: {
    // Mirror vercel.json's security headers so the entire Playwright E2E suite
    // (which runs against `vite preview`) exercises the app under the
    // production CSP — executable proof the policy does not break boot,
    // recharts inline styles, or backup downloads. Vite applies preview
    // headers to every response, so the per-path Cache-Control rule for sw.js
    // stays Vercel-only. Keep this block in sync with vercel.json.
    headers: {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
      'Permissions-Policy':
        'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  },
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
