import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { platform, release } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  diagnosticLines,
  enforceCommandPolicy,
  validateTestReport,
  validateNodeTests,
  runContainedCommand,
  sanitizeEnvironment,
} from './release-gate-utils.mjs';
import {
  REVIEW_EVIDENCE_DIRECTORY,
  payloadTree,
  readEvidenceFiles,
  resolveReviewEvidence,
} from './release-review-binding.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ARTIFACT_ROOT = resolve(ROOT, 'artifacts', 'release-evidence');
const npmCli = process.env.npm_execpath;
const repositoryExclude = resolve(ROOT, '.git', 'info', 'exclude');
const args = process.argv.slice(2);
const COMMAND_TIMEOUT_MS = 32 * 60 * 1000;
const interruptController = new AbortController();
let receivedSignal;

function recordSignal(signal) {
  if (receivedSignal !== undefined) {
    return;
  }

  receivedSignal = signal;
  interruptController.abort(new Error(`Release gate received ${signal}.`));
}

process.once('SIGINT', () => recordSignal('SIGINT'));
process.once('SIGTERM', () => recordSignal('SIGTERM'));

function readArgument(name, fallback) {
  const index = args.indexOf(name);
  if (index !== -1) {
    return args[index + 1] ?? fallback;
  }

  const assigned = args.find((argument) => argument.startsWith(name + '='));
  return assigned === undefined
    ? fallback
    : assigned.slice(name.length + 1) || fallback;
}

function npmArgs(commandArgs) {
  if (npmCli === undefined || npmCli.length === 0) {
    throw new Error(
      'The release gate must be launched through npm run verify:release.',
    );
  }

  return [npmCli, ...commandArgs];
}

// The module is named by the review evidence that binds to the candidate.
// Naming one up front is optional and may only confirm what the evidence says.
const requestedModule =
  process.env.RELEASE_MODULE ?? readArgument('--module', '');
let moduleName = requestedModule.length > 0 ? requestedModule : 'unresolved';
const passNumber = Number(
  process.env.RELEASE_PASS ?? readArgument('--pass', '0'),
);
const legacyReviewSelection =
  process.env.RELEASE_REVIEW_FILE ??
  (args.includes('--review-file') ||
  args.some((argument) => argument.startsWith('--review-file='))
    ? 'set'
    : undefined);
const startedAt = new Date();
const commands = [];

function cleanOutput(value) {
  return value.replaceAll('\u001b', '').trim();
}

async function run(
  executable,
  commandArgs,
  label,
  validate,
  timeoutMs = COMMAND_TIMEOUT_MS,
  reportEnvironment = {},
) {
  const commandStartedAt = new Date();
  const inheritedEnvironment = sanitizeEnvironment(process.env);
  const outcome = await runContainedCommand({
    args: commandArgs,
    cwd: ROOT,
    executable,
    env: {
      ...inheritedEnvironment,
      ...reportEnvironment,
      CI: 'true',
      NPM_CONFIG_UPDATE_NOTIFIER: 'false',
    },
    onStderr: (text) => process.stderr.write(text),
    onStdout: (text) => process.stdout.write(text),
    signal: interruptController.signal,
    timeoutMs,
  });
  const { stderr, stdout } = outcome;

  const warnings = diagnosticLines(stdout, stderr);

  const record = {
    label,
    executable,
    args: commandArgs,
    startedAt: commandStartedAt.toISOString(),
    endedAt: new Date().toISOString(),
    exitCode: outcome.code,
    signal: outcome.signal,
    timeoutMs,
    timedOut: outcome.timedOut,
    interrupted: outcome.interrupted,
    warningCount: warnings.length,
    warnings,
    retryCount: label.includes('tests') ? null : 0,
    skipCount: label.includes('tests') ? null : 0,
    testCount: null,
    diagnostics: [
      {
        source: 'stderr',
        classification: 'advisory',
        basis: 'process status and command validator determine release outcome',
        text: stderr,
      },
    ],
    rawStdout: stdout,
    rawStderr: stderr,
    stdout: cleanOutput(stdout),
    stderr: cleanOutput(stderr),
  };
  commands.push(record);

  await enforceCommandPolicy(record, validate);

  return record.stdout;
}

async function sha256(path) {
  const payload = await readFile(path);
  return createHash('sha256').update(payload).digest('hex');
}

async function collectFiles(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await collectFiles(path)));
    } else if (entry.isFile()) {
      found.push(path);
    }
  }
  return found.sort();
}

async function artifactChecksums() {
  const dist = resolve(ROOT, 'dist');
  try {
    if (!(await stat(dist)).isDirectory()) {
      return [];
    }
  } catch {
    return [];
  }

  const files = await collectFiles(dist);
  return Promise.all(
    files.map(async (path) => ({
      path: relative(ROOT, path).replaceAll('\\', '/'),
      sha256: await sha256(path),
      bytes: (await stat(path)).size,
    })),
  );
}

const packageJson = JSON.parse(
  await readFile(resolve(ROOT, 'package.json'), 'utf8'),
);
const lockJson = JSON.parse(
  await readFile(resolve(ROOT, 'package-lock.json'), 'utf8'),
);
const manifest = {
  schemaVersion: 3,
  module: moduleName,
  pass: passNumber,
  invocationArgs: args,
  status: 'running',
  startedAt: startedAt.toISOString(),
  endedAt: null,
  commitSha: null,
  treeSha: null,
  payloadTreeSha: null,
  applicationVersion: packageJson.version,
  lockfileSha256: await sha256(resolve(ROOT, 'package-lock.json')),
  os: {
    platform: platform(),
    release: release(),
  },
  nodeVersion: process.version,
  npmVersion: null,
  playwrightVersion: null,
  browserVersion: null,
  workflowUrl:
    process.env.GITHUB_SERVER_URL &&
    process.env.GITHUB_REPOSITORY &&
    process.env.GITHUB_RUN_ID
      ? [
          process.env.GITHUB_SERVER_URL,
          process.env.GITHUB_REPOSITORY,
          'actions/runs',
          process.env.GITHUB_RUN_ID,
        ].join('/')
      : null,
  githubEvent: process.env.GITHUB_SHA
    ? {
        sha: process.env.GITHUB_SHA,
        eventName: process.env.GITHUB_EVENT_NAME ?? null,
        ref: process.env.GITHUB_REF ?? null,
      }
    : null,
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
  commands,
  artifacts: [],
  totals: {
    commandCount: 0,
    warningCount: 0,
    retryCount: 0,
    skipCount: 0,
  },
  reviewer: null,
  adversarialFindings: [],
  retrospective: null,
  reviewEvidence: null,
  failure: null,
};

let failure;

try {
  if (legacyReviewSelection !== undefined) {
    throw new Error(
      'RELEASE_REVIEW_FILE and --review-file are no longer supported. Review evidence is selected only by its binding to the candidate payload tree under ' +
        REVIEW_EVIDENCE_DIRECTORY +
        '.',
    );
  }

  manifest.commitSha = await run('git', ['rev-parse', 'HEAD'], 'commit SHA');
  manifest.treeSha = await run('git', ['rev-parse', 'HEAD^{tree}'], 'tree SHA');
  if (
    process.env.GITHUB_SHA !== undefined &&
    process.env.GITHUB_SHA !== manifest.commitSha
  ) {
    throw new Error(
      'Checked-out HEAD ' +
        manifest.commitSha +
        ' is not the GitHub event commit ' +
        process.env.GITHUB_SHA,
    );
  }

  manifest.payloadTreeSha = payloadTree({ cwd: ROOT, treeish: 'HEAD' });
  const resolution = resolveReviewEvidence({
    candidatePayloadTree: manifest.payloadTreeSha,
    files: readEvidenceFiles({ cwd: ROOT, treeish: 'HEAD' }),
  });
  const review = resolution.selected;
  if (requestedModule.length > 0 && requestedModule !== review.module) {
    throw new Error(
      'Requested module ' +
        requestedModule +
        ' does not match the bound review module ' +
        review.module,
    );
  }
  moduleName = review.module;
  manifest.module = review.module;
  manifest.reviewer = review.reviewer;
  manifest.adversarialFindings = review.adversarialFindings;
  manifest.retrospective = review.retrospective;
  manifest.reviewEvidence = {
    path: review.path,
    sha256: review.sha256,
    module: review.module,
    payloadTree: review.payloadTree,
    applicable: resolution.applicable,
    considered: resolution.considered,
  };

  if (!/^v24\./.test(process.version)) {
    throw new Error(
      'Release certification requires Node 24; observed ' + process.version,
    );
  }
  if (packageJson.version !== lockJson.version) {
    throw new Error('package.json and package-lock.json versions differ');
  }
  if (lockJson.packages?.['']?.version !== packageJson.version) {
    throw new Error('lockfile root package version differs from package.json');
  }

  manifest.npmVersion = await run(
    process.execPath,
    npmArgs(['--version']),
    'npm version',
    (record) => {
      if (!/^11\./.test(record.stdout)) {
        throw new Error(
          'Release certification requires npm 11; observed ' + record.stdout,
        );
      }
    },
    30_000,
  );

  const invocation = randomUUID();
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  const reportValidator = (runner) => async (record) => {
    const path = resolve(ARTIFACT_ROOT, invocation + '-' + runner + '.json');
    record.testCount = null;
    record.skipCount = null;
    record.retryCount = null;
    record.testReport = { path: relative(ROOT, path), invocation };
    const raw = await readFile(path, 'utf8');
    record.testReport.sha256 = createHash('sha256').update(raw).digest('hex');
    const report = JSON.parse(raw);
    record.testReport.result = report;
    Object.assign(record, validateTestReport(report, invocation, runner));
  };
  const gate = [
    {
      executable: 'git',
      args: [
        '-c',
        'core.excludesFile=' + repositoryExclude,
        'status',
        '--porcelain=v1',
      ],
      label: 'initial clean status',
      validate: (record) => {
        if (record.stdout.length !== 0) {
          throw new Error('Release gate requires a clean initial worktree');
        }
      },
    },
    {
      executable: 'git',
      args: ['-c', 'core.excludesFile=' + repositoryExclude, 'diff', '--check'],
      label: 'diff check',
    },
    {
      executable: process.execPath,
      args: npmArgs(['ci']),
      label: 'clean dependency install',
    },
    {
      executable: process.execPath,
      args: npmArgs(['run', 'audit']),
      label: 'dependency audit',
    },
    {
      executable: process.execPath,
      args: ['./node_modules/@playwright/test/cli.js', '--version'],
      label: 'Playwright version',
      validate: (record) => {
        manifest.playwrightVersion = record.stdout;
      },
    },
    {
      executable: process.execPath,
      args: [
        '--input-type=module',
        '--eval',
        "import { chromium } from '@playwright/test'; const browser = await chromium.launch(); try { process.stdout.write(browser.version()); } finally { await browser.close(); }",
      ],
      label: 'Chromium version',
      validate: (record) => {
        manifest.browserVersion = record.stdout;
      },
    },
    {
      executable: process.execPath,
      args: [
        '--test',
        '--test-reporter=tap',
        'scripts/release-gate-utils.test.mjs',
        'scripts/release-review-binding.test.mjs',
        'scripts/release-reuse.test.mjs',
      ],
      label: 'release gate unit tests',
      validate: validateNodeTests,
    },
    {
      executable: process.execPath,
      args: npmArgs(['ls', '--depth=0']),
      label: 'dependency tree',
    },
    {
      executable: process.execPath,
      args: npmArgs(['run', 'lint']),
      label: 'lint',
    },
    {
      executable: process.execPath,
      args: npmArgs(['run', 'format:check']),
      label: 'format check',
    },
    {
      executable: process.execPath,
      args: npmArgs(['run', 'typecheck']),
      label: 'typecheck',
    },
    {
      executable: process.execPath,
      args: npmArgs(['run', 'build']),
      label: 'production build',
    },
    {
      executable: process.execPath,
      args: [
        '--test',
        '--test-reporter=tap',
        'scripts/bundle-budget-utils.test.mjs',
      ],
      label: 'bundle budget unit tests',
      validate: validateNodeTests,
    },
    {
      executable: process.execPath,
      args: npmArgs(['run', 'check:bundle']),
      label: 'bundle budget',
    },
    {
      executable: process.execPath,
      args: npmArgs([
        'run',
        'test',
        '--',
        '--reporter=default',
        '--reporter=./scripts/release-test-reporter.mjs',
      ]),
      label: 'unit and integration tests',
      runner: 'vitest',
      validate: reportValidator('vitest'),
    },
    {
      executable: process.execPath,
      args: npmArgs([
        'run',
        'test:e2e',
        '--',
        '--reporter=list,./scripts/release-test-reporter.mjs',
      ]),
      label: 'end-to-end tests',
      runner: 'playwright',
      validate: reportValidator('playwright'),
      timeoutMs: 83 * 60 * 1000,
    },
    {
      executable: process.execPath,
      args: npmArgs(['run', 'check:circular']),
      label: 'circular dependency analysis',
    },
    {
      executable: 'git',
      args: [
        '-c',
        'core.excludesFile=' + repositoryExclude,
        'status',
        '--porcelain=v1',
      ],
      label: 'final clean status',
      validate: (record) => {
        if (record.stdout.length !== 0) {
          throw new Error('Release gate changed the worktree');
        }
      },
    },
  ];

  for (const command of gate) {
    await run(
      command.executable,
      command.args,
      command.label,
      command.validate,
      command.timeoutMs,
      command.runner
        ? {
            RELEASE_TEST_INVOCATION: invocation,
            RELEASE_TEST_REPORT: resolve(
              ARTIFACT_ROOT,
              invocation + '-' + command.runner + '.json',
            ),
          }
        : {},
    );
  }

  manifest.artifacts = await artifactChecksums();
  manifest.status = 'passed';
} catch (error) {
  failure = error;
  manifest.status = 'failed';
  manifest.failure =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
} finally {
  // Reuse metadata is optional; it cannot turn a valid comprehensive gate red.
  try {
    const { certificationBinding } =
      await import('./release-reuse-contract.mjs');
    manifest.certification = certificationBinding(ROOT);
  } catch {
    manifest.certification = null;
  }
  manifest.endedAt = new Date().toISOString();
  manifest.totals.commandCount = commands.length;
  manifest.totals.warningCount = commands.reduce(
    (total, command) => total + command.warningCount,
    0,
  );
  manifest.totals.retryCount = commands.reduce(
    (total, command) =>
      total === null || command.retryCount === null
        ? null
        : total + command.retryCount,
    0,
  );
  manifest.totals.skipCount = commands.reduce(
    (total, command) =>
      total === null || command.skipCount === null
        ? null
        : total + command.skipCount,
    0,
  );
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  const stamp = startedAt
    .toISOString()
    .replaceAll(':', '-')
    .replaceAll('.', '-');
  const name =
    stamp +
    '-' +
    basename(moduleName.replaceAll(/[^a-z0-9-]/gi, '-')) +
    '-pass-' +
    String(passNumber) +
    '.json';
  const outputPath = join(ARTIFACT_ROOT, name);
  await writeFile(outputPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  process.stdout.write(
    '\nRelease evidence: ' + relative(ROOT, outputPath) + '\n',
  );
}

if (failure !== undefined) {
  process.stderr.write(
    (failure instanceof Error
      ? (failure.stack ?? failure.message)
      : String(failure)) + '\n',
  );
  process.exitCode =
    receivedSignal === 'SIGINT' ? 130 : receivedSignal === 'SIGTERM' ? 143 : 1;
}
