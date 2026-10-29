import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { sha256 } from './release-reuse-zip.mjs';

export const REPOSITORY = 'ruishinor/ProgressPal';
export const REPOSITORY_ID = 1269722314;
export const WORKFLOW = '.github/workflows/test.yml';
export const ARTIFACT = 'release-evidence-final-candidate';
export const CONTRACT = 1;
export const MODE = 'shadow';
export const STEPS = [
  'Run actions/checkout@v5',
  'Run actions/setup-node@v6',
  'Pin npm 11',
  'Install locked dependencies',
  'Install Chromium',
  'Run immutable release gate',
  'Upload release evidence',
];

export const COMMANDS = [
  ['commit SHA', ['rev-parse', 'HEAD']],
  ['tree SHA', ['rev-parse', 'HEAD^{tree}']],
  ['npm version', ['npm', '--version']],
  [
    'initial clean status',
    ['-c', 'core.excludesFile=<checkout>', 'status', '--porcelain=v1'],
  ],
  ['diff check', ['-c', 'core.excludesFile=<checkout>', 'diff', '--check']],
  ['clean dependency install', ['npm', 'ci']],
  ['dependency audit', ['npm', 'run', 'audit']],
  [
    'Playwright version',
    ['./node_modules/@playwright/test/cli.js', '--version'],
  ],
  [
    'Chromium version',
    [
      '--input-type=module',
      '--eval',
      "import { chromium } from '@playwright/test'; const browser = await chromium.launch(); try { process.stdout.write(browser.version()); } finally { await browser.close(); }",
    ],
  ],
  [
    'release gate unit tests',
    [
      '--test',
      '--test-reporter=tap',
      'scripts/release-gate-utils.test.mjs',
      'scripts/release-review-binding.test.mjs',
      'scripts/release-reuse.test.mjs',
    ],
  ],
  ['dependency tree', ['npm', 'ls', '--depth=0']],
  ...[
    ['lint', 'lint'],
    ['format check', 'format:check'],
    ['typecheck', 'typecheck'],
    ['production build', 'build'],
  ].map(([label, script]) => [label, ['npm', 'run', script]]),
  [
    'bundle budget unit tests',
    ['--test', '--test-reporter=tap', 'scripts/bundle-budget-utils.test.mjs'],
  ],
  ['bundle budget', ['npm', 'run', 'check:bundle']],
  [
    'unit and integration tests',
    [
      'npm',
      'run',
      'test',
      '--',
      '--reporter=default',
      '--reporter=./scripts/release-test-reporter.mjs',
    ],
  ],
  [
    'end-to-end tests',
    [
      'npm',
      'run',
      'test:e2e',
      '--',
      '--reporter=list,./scripts/release-test-reporter.mjs',
    ],
  ],
  ['circular dependency analysis', ['npm', 'run', 'check:circular']],
  [
    'final clean status',
    ['-c', 'core.excludesFile=<checkout>', 'status', '--porcelain=v1'],
  ],
];

export function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 10_000,
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

// Release authority and its immediate execution controls, not application code,
// curriculum, ordinary tests, or dependency graphs. S/C equality covers those.
export function controlFingerprint(cwd, ref) {
  const paths = git(cwd, 'ls-tree', '-r', '--name-only', ref)
    .split('\n')
    .filter(
      (path) =>
        path.startsWith('.github/workflows/') ||
        [
          '.gitignore',
          '.gitattributes',
          '.prettierignore',
          'npm-shrinkwrap.json',
          'tests/architecture/releaseWorkflow.test.ts',
        ].includes(path) ||
        /^scripts\/(?:release-|run-release-|run-e2e|check-build-budget|bundle-budget)/.test(
          path,
        ) ||
        /^(?:\.nvmrc|\.npmrc|vercel\.json|(?:vite|vitest|playwright|eslint|prettier|tsconfig)[^/]*\.(?:ts|js|json|cjs))$/.test(
          path,
        ),
    );
  const objects = paths.map((path) => [
    path,
    git(cwd, 'rev-parse', `${ref}:${path}`),
  ]);
  const pkg = JSON.parse(git(cwd, 'show', `${ref}:package.json`));
  return sha256(
    JSON.stringify({
      objects,
      scripts: pkg.scripts,
      engines: pkg.engines,
      packageManager: pkg.packageManager,
    }),
  );
}

export function normalizedCommands(commands) {
  return commands.map((c) => [
    c.label,
    c.args.map((arg) =>
      /[/\\]npm-cli\.js$/.test(arg)
        ? 'npm'
        : arg.startsWith('core.excludesFile=')
          ? 'core.excludesFile=<checkout>'
          : arg,
    ),
  ]);
}

// Additive optional metadata. The full gate never depends on its availability.
export function certificationBinding(cwd, env = process.env) {
  const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
  const sha = git(cwd, 'rev-parse', 'HEAD');
  const lock = JSON.parse(git(cwd, 'show', 'HEAD:package-lock.json'));
  return {
    certificationContractVersion: CONTRACT,
    certificationKind: 'comprehensive',
    repository: env.GITHUB_REPOSITORY,
    repositoryId: Number(env.GITHUB_REPOSITORY_ID),
    runId: Number(env.GITHUB_RUN_ID),
    runAttempt: Number(env.GITHUB_RUN_ATTEMPT),
    job: env.GITHUB_JOB,
    workflowRef: env.GITHUB_WORKFLOW_REF,
    workflowSha: env.GITHUB_WORKFLOW_SHA,
    checkout: sha,
    parents: git(cwd, 'show', '-s', '--format=%P', sha).split(' '),
    pr: event.pull_request
      ? {
          number: event.number,
          base: event.pull_request.base.sha,
          head: event.pull_request.head.sha,
          baseRepositoryId: event.pull_request.base.repo.id,
          headRepositoryId: event.pull_request.head.repo.id,
        }
      : null,
    controls: controlFingerprint(cwd, 'HEAD'),
    arch: process.arch,
    testRunners: {
      vitest: lock.packages['node_modules/vitest'].version,
      playwright: lock.packages['node_modules/@playwright/test'].version,
    },
  };
}
