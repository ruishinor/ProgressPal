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
    rolldownOptions: {
      output: {
        // Static chunk ownership. Every chunk is statically imported and
        // module-preloaded from the production HTML, which is how the offline
        // service worker discovers and caches boot assets: nothing is loaded
        // lazily. This does not pretend to reduce total JS; it names meaningful
        // ownership and keeps each raw chunk below the 500 kB release ceiling
        // (scripts/bundle-budget-utils.mjs stays the authority).
        //
        // Bundler behaviour the order relies on: a group also captures the
        // dependencies of its modules, and the higher `priority` wins a module
        // that two groups reach. So the infrastructure groups outrank the
        // groups that depend on them, and a dependent group (`lessons`) can
        // never swallow a shared boundary: `react` outranks `router`,
        // `storage-safety`/`backup` outrank `lib`, and `lib` outranks `lessons`.
        // `zod` and `vendor` only take what a higher group has not already
        // captured (today zod travels with `backup`, its first consumer).
        codeSplitting: {
          groups: [
            // The cross-tab/storage safety boundary.
            {
              name: 'storage-safety',
              test: /[\\/]src[\\/]lib[\\/]storage[\\/]/,
              priority: 100,
            },
            {
              name: 'backup',
              test: /[\\/]src[\\/]lib[\\/]backup[\\/]/,
              priority: 90,
            },
            // Programme lesson content: one static chunk per committed
            // content file, so each stays under the raw per-chunk budget.
            {
              name: (id: string) => {
                const programmeContent = id
                  .replace(/\\/g, '/')
                  .match(
                    /\/src\/programmes\/([a-z0-9-]+)\/content\/([a-z0-9-]+)\.json$/,
                  );

                return programmeContent === null
                  ? null
                  : `content-${programmeContent[1]}-${programmeContent[2]}`;
              },
              test: /[\\/]src[\\/]programmes[\\/][a-z0-9-]+[\\/]content[\\/][a-z0-9-]+\.json$/,
              priority: 80,
            },
            // Utviklerblikk's Scrum, Kanban and Smidig samarbeid activities:
            // static content in its own chunk, outside the entry chunk's raw
            // budget. Type-only imports, so it captures no other module.
            {
              name: 'content-utviklerblikk',
              test: /[\\/]src[\\/]programmes[\\/]programvareutvikling[\\/]microlearning[\\/]utviklerblikk[\\/]/,
              priority: 75,
            },
            {
              name: 'react',
              test: /[\\/]node_modules[\\/](?:react-dom|react|scheduler)[\\/]/,
              priority: 70,
            },
            {
              name: 'router',
              test: /[\\/]node_modules[\\/]react-router/,
              priority: 60,
            },
            {
              name: 'zod',
              test: /[\\/]node_modules[\\/]zod/,
              priority: 50,
            },
            {
              name: 'dexie',
              test: /[\\/]node_modules[\\/]dexie/,
              priority: 40,
            },
            {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              priority: 30,
            },
            // The shared, layer-independent libraries (database, evaluation,
            // rewards, mastery, app state, routing helpers). Applications
            // features import these; they belong to no single feature.
            {
              name: 'lib',
              test: /[\\/]src[\\/]lib[\\/]/,
              priority: 25,
            },
            // The lesson feature: one coherent application domain, rendered
            // by Classic and RPG alike.
            {
              name: 'lessons',
              test: /[\\/]src[\\/]features[\\/]lessons[\\/]/,
              priority: 20,
            },
          ],
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
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://enuikiiweoscywaixedr.auth.eu-north-1.nhost.run https://enuikiiweoscywaixedr.graphql.eu-north-1.nhost.run; worker-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
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
