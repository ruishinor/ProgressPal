import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'design-artifacts/**',
      'artifacts/publish-readiness/**',
      'artifacts/rpg-primary/**',
      '.kilo/worktrees/**',
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*'],
              message:
                'App-layer files must import features through each feature public entrypoint.',
            },
            {
              group: ['@/programmes/*'],
              message:
                'App-layer files must import programmes through the @/programmes entrypoint.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*'],
              message: 'Shared components must not depend on the app layer.',
            },
            {
              group: ['@/features/*'],
              message: 'Shared components must stay feature-agnostic.',
            },
            {
              group: ['@/programmes', '@/programmes/*'],
              message: 'Shared components must stay programme-agnostic.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*'],
              message: 'Feature code must not depend on the app layer.',
            },
            {
              group: ['@/programmes/*'],
              message:
                'Feature code must import programmes through the @/programmes entrypoint.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*', '@/components/*', '@/features/*'],
              message:
                'Library code must stay independent from app, component, and feature layers.',
            },
            {
              group: ['@/programmes', '@/programmes/*'],
              message:
                'Library code receives programme policy as parameters; it must not import the programme layer.',
            },
          ],
        },
      ],
    },
  },
  {
    // Epic C / C2 programme layer (C0 programme definition contract §6).
    files: ['src/programmes/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/app',
                '@/app/*',
                '@/components',
                '@/components/*',
                '@/features',
                '@/features/*',
                '@/styles',
                '@/styles/*',
              ],
              message:
                'The programme layer must not depend on app, component, feature, or style layers.',
            },
            {
              group: [
                '@/lib/*',
                '!@/lib/domain',
                '!@/lib/validation',
                '!@/lib/achievements',
                '!@/lib/assets',
              ],
              message:
                'The programme layer may import only @/lib/domain, @/lib/validation, the @/lib/achievements entrypoint and the @/lib/assets packaged-asset reader from lib.',
            },
            {
              group: [
                '@/lib/*/*',
                '@/seed/*',
                '@/programmes',
                '@/programmes/*',
              ],
              message:
                'The programme layer uses lower-layer entrypoints only and imports its own modules relatively.',
            },
            {
              group: [
                '*.css',
                '*.png',
                '*.jpg',
                '*.svg',
                '*.webp',
                '*?inline',
                '*?url',
              ],
              message: 'The programme layer must not import asset files.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/lib/testing/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['public/sw.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  prettierConfig,
);
