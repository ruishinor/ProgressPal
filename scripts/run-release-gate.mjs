import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { platform, release } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { diagnosticLines, sanitizeEnvironment } from './release-gate-utils.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ARTIFACT_ROOT = resolve(ROOT, 'artifacts', 'release-evidence');
const npmCli = process.env.npm_execpath;
const repositoryExclude = resolve(ROOT, '.git', 'info', 'exclude');
const args = process.argv.slice(2);

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

const moduleName =
  process.env.RELEASE_MODULE ?? readArgument('--module', 'manual');
const passNumber = Number(
  process.env.RELEASE_PASS ?? readArgument('--pass', '0'),
);
const startedAt = new Date();
const commands = [];

function cleanOutput(value) {
  return value.replaceAll('\u001b', '').trim();
}

async function run(executable, commandArgs, label, validate) {
  const commandStartedAt = new Date();
  const inheritedEnvironment = sanitizeEnvironment(process.env);
  const child = spawn(executable, commandArgs, {
    cwd: ROOT,
    env: {
      ...inheritedEnvironment,
      CI: 'true',
      NPM_CONFIG_UPDATE_NOTIFIER: 'false',
    },
    shell: false,
    windowsHide: true,
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    stdout += text;
    process.stdout.write(text);
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderr += text;
    process.stderr.write(text);
  });

  const outcome = await new Promise((resolveOutcome, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      resolveOutcome({ code, signal });
    });
  });

  const warnings = diagnosticLines(stdout, stderr);
  const record = {
    label,
    executable,
    args: commandArgs,
    startedAt: commandStartedAt.toISOString(),
    endedAt: new Date().toISOString(),
    exitCode: outcome.code,
    signal: outcome.signal,
    warningCount: warnings.length,
    warnings,
    stdout: cleanOutput(stdout),
    stderr: cleanOutput(stderr),
  };
  commands.push(record);

  if (outcome.code !== 0 || outcome.signal !== null) {
    throw new Error(
      label + ' failed with exit ' + String(outcome.code ?? outcome.signal),
    );
  }
  if (warnings.length > 0) {
    throw new Error(label + ' emitted warning or stderr output');
  }
  if (validate !== undefined) {
    validate(record);
  }

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
  schemaVersion: 1,
  module: moduleName,
  pass: passNumber,
  invocationArgs: args,
  status: 'running',
  startedAt: startedAt.toISOString(),
  endedAt: null,
  commitSha: null,
  treeSha: null,
  applicationVersion: packageJson.version,
  lockfileSha256: await sha256(resolve(ROOT, 'package-lock.json')),
  os: {
    platform: platform(),
    release: release(),
  },
  nodeVersion: process.version,
  npmVersion: null,
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
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
  commands,
  artifacts: [],
  totals: {
    commandCount: 0,
    warningCount: 0,
    retryCount: 0,
    skipCount: 0,
  },
  reviewer: process.env.RELEASE_REVIEWER ?? null,
  adversarialFindings: [],
  retrospective: null,
  failure: null,
};

let failure;

try {
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
  );
  manifest.browserVersion = await run(
    process.execPath,
    ['./node_modules/@playwright/test/cli.js', '--version'],
    'Playwright version',
  );
  manifest.commitSha = await run('git', ['rev-parse', 'HEAD'], 'commit SHA');
  manifest.treeSha = await run('git', ['rev-parse', 'HEAD^{tree}'], 'tree SHA');

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
      args: ['--test', 'scripts/release-gate-utils.test.mjs'],
      label: 'release gate unit tests',
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
      args: ['--test', 'scripts/bundle-budget-utils.test.mjs'],
      label: 'bundle budget unit tests',
    },
    {
      executable: process.execPath,
      args: npmArgs(['run', 'check:bundle']),
      label: 'bundle budget',
    },
    {
      executable: process.execPath,
      args: npmArgs(['run', 'test']),
      label: 'unit and integration tests',
    },
    {
      executable: process.execPath,
      args: npmArgs(['run', 'test:e2e']),
      label: 'end-to-end tests',
    },
    {
      executable: process.execPath,
      args: npmArgs(['run', 'check:circular']),
      label: 'circular dependency analysis',
    },
    {
      executable: process.execPath,
      args: npmArgs(['run', 'audit']),
      label: 'dependency audit',
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
  manifest.endedAt = new Date().toISOString();
  manifest.totals.commandCount = commands.length;
  manifest.totals.warningCount = commands.reduce(
    (total, command) => total + command.warningCount,
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
  process.exit(1);
}
