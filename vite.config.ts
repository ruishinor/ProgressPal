import { readFileSync } from 'node:fs';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * The pinned client-side Python runtime (owner decision 2026-10-03). Exactly
 * the files the runtime spike loaded are packaged, under
 * `runtime/pyodide-<version>/`, from the exact-pinned `pyodide` package;
 * nothing is fetched from a CDN. The build also writes `runtime/offline.json`,
 * the list the service worker caches each runtime file from the first time
 * it is fetched online (the Python worker script included).
 */
const pythonRuntimeFiles = {
  'pyodide.mjs': 'text/javascript',
  'pyodide.asm.mjs': 'text/javascript',
  'pyodide.asm.wasm': 'application/wasm',
  'python_stdlib.zip': 'application/zip',
  'pyodide-lock.json': 'application/json',
} as const;

function pythonRuntime(): Plugin {
  const packageDirectory = path.resolve(__dirname, 'node_modules/pyodide');
  const { version } = JSON.parse(
    readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'),
  ) as { version: string };
  const folder = `runtime/pyodide-${version}/`;
  const read = (file: string) =>
    readFileSync(path.join(packageDirectory, file));

  return {
    name: 'progresspal-python-runtime',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const file = request.url?.split('?')[0]?.slice(`/${folder}`.length);

        if (
          !request.url?.startsWith(`/${folder}`) ||
          file === undefined ||
          !Object.hasOwn(pythonRuntimeFiles, file)
        ) {
          next();
          return;
        }

        response.setHeader(
          'Content-Type',
          pythonRuntimeFiles[file as keyof typeof pythonRuntimeFiles],
        );
        response.end(read(file));
      });
    },
    generateBundle(_options, bundle) {
      const workerScripts = Object.keys(bundle).filter((fileName) =>
        /^assets\/pythonWorker-[\w-]+\.js$/.test(fileName),
      );

      if (workerScripts.length !== 1) {
        this.error(
          `Expected one Python worker script, found ${workerScripts.length}.`,
        );
      }

      for (const file of Object.keys(pythonRuntimeFiles)) {
        this.emitFile({
          type: 'asset',
          fileName: `${folder}${file}`,
          source: read(file),
        });
      }

      this.emitFile({
        type: 'asset',
        fileName: 'runtime/offline.json',
        source: `${JSON.stringify(
          {
            format: 'progresspal-offline-runtime',
            formatVersion: 1,
            runtime: `pyodide-${version}`,
            assets: [
              ...Object.keys(pythonRuntimeFiles).map(
                (file) => `/${folder}${file}`,
              ),
              ...workerScripts.map((fileName) => `/${fileName}`),
            ],
          },
          null,
          2,
        )}\n`,
      });
    },
  };
}

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
  plugins: [react(), pythonRuntime()],
  preview: {
    // Mirror vercel.json's security headers so the entire Playwright E2E suite
    // (which runs against `vite preview`) exercises the app under the
    // production CSP — executable proof the policy does not break boot,
    // recharts inline styles, or backup downloads. Vite applies preview
    // headers to every response, so the per-path Cache-Control rule for sw.js
    // stays Vercel-only. Keep this block in sync with vercel.json.
    headers: {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
      'Permissions-Policy':
        'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  },
  // The Python worker is an ES module worker (it imports the runtime).
  worker: {
    format: 'es',
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
