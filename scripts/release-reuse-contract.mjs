import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { sha256 } from './release-reuse-zip.mjs';

export const REPOSITORY = 'ruishinor/ProgressPal';
export const REPOSITORY_ID = 1269722314;
export const WORKFLOW = '.github/workflows/test.yml';
export const ARTIFACT = 'release-evidence-final-candidate';
export const CONTRACT = 2;
// The gate runs as parallel stage jobs; the Final candidate job verifies their
// evidence and writes the one comprehensive manifest that ATTEST authenticates.
export const E2E_SHARDS = 3;
export const STAGE_JOBS = [
  'Plan certification',
  'Unit stage',
  ...Array.from(
    { length: E2E_SHARDS },
    (_, index) => `E2E shard ${index + 1}/${E2E_SHARDS}`,
  ),
];
export const STEPS = [
  'Run actions/checkout@v5',
  'Run actions/setup-node@v6',
  'Pin npm 11',
  'Require successful stages',
  'Download stage evidence',
  'Run immutable release gate',
  'Upload release evidence',
];

const status = [
  '-c',
  'core.excludesFile=<checkout>',
  'status',
  '--porcelain=v1',
];
const npmRun = (script) => ['npm', 'run', script];
const nodeTests = (...files) => ['--test', '--test-reporter=tap', ...files];

// Every stage, including the final assembly, first records its checkout.
export const IDENTITY = [
  ['commit SHA', ['rev-parse', 'HEAD']],
  ['tree SHA', ['rev-parse', 'HEAD^{tree}']],
  ['npm version', ['npm', '--version']],
];

export const UNIT_STAGE = [
  ['initial clean status', status],
  ['diff check', ['-c', 'core.excludesFile=<checkout>', 'diff', '--check']],
  ['clean dependency install', ['npm', 'ci']],
  ['dependency audit', npmRun('audit')],
  [
    'release gate unit tests',
    nodeTests(
      'scripts/release-gate-utils.test.mjs',
      'scripts/release-review-binding.test.mjs',
      'scripts/release-reuse.test.mjs',
      'scripts/release-stages.test.mjs',
    ),
  ],
  ['dependency tree', ['npm', 'ls', '--depth=0']],
  ['lint', npmRun('lint')],
  ['format check', npmRun('format:check')],
  ['typecheck', npmRun('typecheck')],
  ['production build', npmRun('build')],
  [
    'bundle budget unit tests',
    nodeTests('scripts/bundle-budget-utils.test.mjs'),
  ],
  ['bundle budget', npmRun('check:bundle')],
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
  ['circular dependency analysis', npmRun('check:circular')],
  ['final clean status', status],
];

export function e2eStage(shard) {
  return [
    ['initial clean status', status],
    ['clean dependency install', ['npm', 'ci']],
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
      'end-to-end tests',
      [
        'npm',
        'run',
        'test:e2e',
        '--',
        '--reporter=list,./scripts/release-test-reporter.mjs',
        `--shard=${shard}/${E2E_SHARDS}`,
      ],
    ],
    ['final clean status', status],
  ];
}

export const stagePrefix = (stage, shard) =>
  stage === 'unit' ? 'unit: ' : `e2e ${shard}/${E2E_SHARDS}: `;
export const baseLabel = (label) =>
  label.replace(/^(?:unit|e2e \d+\/\d+): /, '');

export const COMMANDS = [
  ...IDENTITY,
  ['initial clean status', status],
  ...UNIT_STAGE.map(([label, args]) => [stagePrefix('unit') + label, args]),
  ...Array.from({ length: E2E_SHARDS }, (_, index) =>
    e2eStage(index + 1).map(([label, args]) => [
      stagePrefix('e2e', index + 1) + label,
      args,
    ]),
  ).flat(),
  ['final clean status', status],
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

// Rev-list/show hide parents at shallow boundaries; the commit object does not.
export function commitParents(cwd, sha) {
  const header = git(cwd, 'cat-file', '-p', sha).split('\n\n')[0];
  return [...header.matchAll(/^parent ([0-9a-f]{40})$/gm)].map(
    (match) => match[1],
  );
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
    parents: commitParents(cwd, sha),
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
