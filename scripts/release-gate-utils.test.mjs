import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import {
  diagnosticLines,
  executionSummary,
  runContainedCommand,
  sanitizeEnvironment,
} from './release-gate-utils.mjs';

function processIsRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForStopped(pid) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (!processIsRunning(pid)) {
      return;
    }
    await delay(25);
  }
  assert.fail(`Process ${pid} remained alive after owned-tree cleanup.`);
}

function waitForSpawn(child) {
  if (child.pid !== undefined) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('spawn', resolve);
  });
}

async function stopTestProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  const closed = new Promise((resolve) => child.once('close', resolve));
  child.kill('SIGTERM');
  await closed;
}

test('diagnosticLines ignores successful tools that report progress on stderr', () => {
  assert.deepEqual(
    diagnosticLines('', '- Start analyzing dependencies...\n√ Analyze done!\n'),
    [],
  );
});

test('diagnosticLines retains actual warnings and errors', () => {
  assert.deepEqual(
    diagnosticLines(
      'Warning: stdout warning\nordinary output\n',
      '(node:123) Warning: environment conflict\nnpm error audit failed\n',
    ),
    [
      '(node:123) Warning: environment conflict',
      'npm error audit failed',
      'Warning: stdout warning',
    ],
  );
});

test('sanitizeEnvironment removes conflicting color controls case-insensitively', () => {
  assert.deepEqual(
    sanitizeEnvironment({
      FORCE_COLOR: '1',
      no_color: '1',
      CI: 'true',
      PATH: 'example',
    }),
    { CI: 'true', PATH: 'example' },
  );
});

test('executionSummary records tests and rejects hidden skips or retries', () => {
  assert.deepEqual(
    executionSummary(
      ' Test Files  46 passed (46)\n Tests  476 passed (476)\n 2 skipped\n# skipped 3\n 1 retry\n',
    ),
    { retryCount: 1, skipCount: 3, testCount: 476 },
  );
  assert.deepEqual(executionSummary('ordinary build output'), {
    retryCount: 0,
    skipCount: 0,
    testCount: null,
  });
});

test('release gate records a locked clean install before probing Playwright', async () => {
  const source = await readFile(
    new URL('./run-release-gate.mjs', import.meta.url),
    'utf8',
  );
  const cleanInstallIndex = source.indexOf("npmArgs(['ci'])");
  const playwrightProbeIndex = source.indexOf(
    "['./node_modules/@playwright/test/cli.js', '--version']",
  );

  assert.notEqual(cleanInstallIndex, -1);
  assert.notEqual(playwrightProbeIndex, -1);
  assert.ok(cleanInstallIndex < playwrightProbeIndex);
});

test('runContainedCommand captures normal and non-zero completion', async () => {
  const normal = await runContainedCommand({
    executable: process.execPath,
    args: ['--eval', "process.stdout.write('complete')"],
    timeoutMs: 5_000,
  });
  assert.deepEqual(
    {
      code: normal.code,
      interrupted: normal.interrupted,
      stdout: normal.stdout,
      timedOut: normal.timedOut,
    },
    { code: 0, interrupted: false, stdout: 'complete', timedOut: false },
  );

  const nonZero = await runContainedCommand({
    executable: process.execPath,
    args: ['--eval', 'process.exit(7)'],
    timeoutMs: 5_000,
  });
  assert.equal(nonZero.code, 7);
  assert.equal(nonZero.signal, null);
  assert.equal(nonZero.timedOut, false);
});

test('runContainedCommand waits for close and drains late output', async () => {
  const outputBytes = 512 * 1024;
  const outcome = await runContainedCommand({
    executable: process.execPath,
    args: [
      '--eval',
      `process.stdout.write('x'.repeat(${outputBytes}), () => process.exit(0))`,
    ],
    timeoutMs: 5_000,
  });

  assert.equal(outcome.code, 0);
  assert.equal(outcome.stdout.length, outputBytes);
});

test(
  'runContainedCommand times out and removes its owned descendant',
  { timeout: 15_000 },
  async () => {
    const outcome = await runContainedCommand({
      executable: process.execPath,
      args: [
        '--eval',
        "const { spawn } = require('node:child_process'); const child = spawn(process.execPath, ['--eval', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true }); process.stdout.write(String(child.pid)); setInterval(() => {}, 1000);",
      ],
      timeoutMs: 1_000,
    });
    const descendantPid = Number(outcome.stdout);

    assert.equal(outcome.timedOut, true);
    assert.ok(Number.isSafeInteger(descendantPid));
    await waitForStopped(descendantPid);
  },
);

test(
  'runContainedCommand interruption cleans up without killing an unrelated process',
  { timeout: 15_000 },
  async () => {
    const unrelated = spawn(
      process.execPath,
      ['--eval', 'setInterval(() => {}, 1000)'],
      { stdio: 'ignore', windowsHide: true },
    );
    await waitForSpawn(unrelated);
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 500);

    try {
      const outcome = await runContainedCommand({
        executable: process.execPath,
        args: ['--eval', 'setInterval(() => {}, 1000)'],
        signal: controller.signal,
        timeoutMs: 5_000,
      });

      assert.equal(outcome.interrupted, true);
      assert.equal(outcome.timedOut, false);
      assert.equal(processIsRunning(unrelated.pid), true);
    } finally {
      clearTimeout(abortTimer);
      await stopTestProcess(unrelated);
    }
  },
);
import {
  enforceCommandPolicy,
  validateTestReport,
  validateNodeTests,
} from './release-gate-utils.mjs';
import ReleaseReporter from './release-test-reporter.mjs';

const successfulRecord = (text = '') => ({
  label: 'probe',
  exitCode: 0,
  signal: null,
  timedOut: false,
  interrupted: false,
  stdout: text,
  stderr: text,
});
const validReport = () => ({
  schemaVersion: 1,
  invocation: 'current',
  runner: 'vitest',
  status: 'passed',
  errors: 0,
  expected: 1,
  units: [
    {
      status: 'passed',
      tests: [{ name: 'probe', status: 'passed', retries: 0 }],
    },
  ],
});
const reportPolicy = (report) => (record) =>
  Object.assign(record, validateTestReport(report, 'current', 'vitest'));

for (const title of [
  'ignores a HUD read failure after the shell unmounts',
  'handles an error correctly',
  'warning is recorded',
  'previous request failed and was recovered',
  '2 skipped and 3 retries are parsed',
  '',
]) {
  test(`decision permits passing description: ${title}`, async () => {
    const text = `\u001b[33mstderr | file > ${title}\u001b[0m\nDexie: another connection wants to delete database\nWarning: advisory deprecation\n`;
    const record = successfulRecord(text);
    const report = validReport();
    report.units[0].tests[0].name = title;
    await enforceCommandPolicy(record, reportPolicy(report));
    assert.equal(record.validation, 'passed');
    assert.deepEqual(record.policyViolations, []);
    assert.equal(record.stderr, text);
  });
}
for (const [name, outcome] of Object.entries({
  nonzero: { exitCode: 1 },
  timeout: { timedOut: true },
  interruption: { interrupted: true },
  signal: { signal: 'SIGTERM' },
  missingExit: { exitCode: null },
})) {
  test(`decision blocks ${name} despite harmless output`, async () => {
    const record = { ...successfulRecord('All good'), ...outcome };
    let validated = false;
    await assert.rejects(
      enforceCommandPolicy(record, () => {
        validated = true;
      }),
    );
    assert.equal(validated, false);
    assert.equal(record.validation, 'failed');
    assert.equal(record.policyViolations.length, 1);
  });
}
for (const [name, mutate] of Object.entries({
  stale: (r) => {
    r.invocation = 'previous';
  },
  format: (r) => {
    r.schemaVersion = 99;
  },
  failed: (r) => {
    r.status = 'failed';
  },
  errors: (r) => {
    r.errors = 1;
  },
  empty: (r) => {
    r.units = [];
  },
  contradictory: (r) => {
    r.expected = 2;
  },
  failedAssertion: (r) => {
    r.units[0].tests[0].status = 'failed';
  },
  skipped: (r) => {
    r.units[0].tests[0].status = 'skipped';
  },
  todo: (r) => {
    r.units[0].tests[0].status = 'todo';
  },
  pending: (r) => {
    r.units[0].tests[0].status = 'pending';
  },
  retry: (r) => {
    r.units[0].tests[0].retries = 1;
  },
  missingRetry: (r) => {
    delete r.units[0].tests[0].retries;
  },
})) {
  test(`decision rejects ${name} report at exit zero`, async () => {
    const report = validReport();
    mutate(report);
    const record = successfulRecord();
    await assert.rejects(enforceCommandPolicy(record, reportPolicy(report)));
    assert.equal(record.validation, 'failed');
  });
}
test('missing and malformed mandatory evidence block and retain failure reason', async () => {
  for (const policy of [
    reportPolicy(undefined),
    () => JSON.parse('{'),
    () => {
      throw new Error('audit security threshold exceeded');
    },
    () => {
      throw new Error('release-critical lint warning');
    },
  ]) {
    const record = successfulRecord();
    await assert.rejects(enforceCommandPolicy(record, policy));
    assert.equal(record.policyViolations.length, 1);
  }
});
test('Node summary requires complete authoritative totals, unaffected by titles', () => {
  const record = successfulRecord(
    'ok 1 - 3 skipped failures\n# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n',
  );
  validateNodeTests(record);
  assert.equal(record.testCount, 1);
  assert.throws(() => validateNodeTests(successfulRecord('')));
  assert.throws(() =>
    validateNodeTests(
      successfulRecord(record.stdout.replace('# skipped 0', '# skipped 1')),
    ),
  );
});
test('reporter adapters preserve failures, retries and unexecuted tests', () => {
  const reporter = new ReleaseReporter();
  let observed;
  reporter.write = (value) => {
    observed = value;
  };
  reporter.onTestRunStart([{}]);
  reporter.onTestRunEnd(
    [
      {
        state: () => 'passed',
        children: {
          allTests: () => [
            {
              fullName: 'warning is recorded',
              result: () => ({ state: 'passed' }),
              diagnostic: () => ({ retryCount: 1 }),
            },
          ],
        },
      },
    ],
    [],
    'passed',
  );
  assert.equal(observed.units[0].tests[0].retries, 1);
  reporter.onBegin(
    {},
    {
      allTests: () => [
        {
          titlePath: () => ['unexecuted'],
          results: [],
          expectedStatus: 'passed',
        },
      ],
    },
  );
  reporter.onEnd({ status: 'passed' });
  assert.equal(observed.units[0].tests[0].status, 'incomplete');
});
import { runInNewContext } from 'node:vm';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('actual run records advisory success and authoritative failure truthfully', async () => {
  const source = await readFile(
    new URL('./run-release-gate.mjs', import.meta.url),
    'utf8',
  );
  const body = source.slice(
    source.indexOf('async function run('),
    source.indexOf('\nasync function sha256('),
  );
  for (const code of [0, 1]) {
    const records = [];
    const text =
      '\u001b[33mstderr | warning is recorded\u001b[0m\nDexie connection lifecycle';
    const run = runInNewContext(`${body}; run`, {
      COMMAND_TIMEOUT_MS: 5000,
      ROOT: '.',
      sanitizeEnvironment,
      process,
      interruptController: new AbortController(),
      diagnosticLines,
      enforceCommandPolicy,
      commands: records,
      cleanOutput: (value) => value.trim(),
      runContainedCommand: async () => ({
        code,
        signal: null,
        timedOut: false,
        interrupted: false,
        stdout: text,
        stderr: text,
      }),
    });
    const result = run(
      'node',
      [],
      'unit and integration tests',
      reportPolicy(validReport()),
    );
    if (code) await assert.rejects(result);
    else await result;
    assert.equal(records[0].rawStderr, text);
    assert.equal(records[0].validation, code ? 'failed' : 'passed');
    assert.equal(records[0].retryCount, code ? null : 0);
    assert.equal(records[0].skipCount, code ? null : 0);
    assert.equal(records[0].policyViolations.length, code ? 1 : 0);
  }
});
test('report file cannot overwrite evidence from any earlier invocation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'release-report-'));
  const previous = process.env.RELEASE_TEST_REPORT;
  try {
    const path = join(directory, 'report.json');
    process.env.RELEASE_TEST_REPORT = path;
    await writeFile(path, 'previous evidence');
    assert.throws(() => new ReleaseReporter().write({}), /EEXIST/);
    assert.equal(await readFile(path, 'utf8'), 'previous evidence');
  } finally {
    if (previous === undefined) delete process.env.RELEASE_TEST_REPORT;
    else process.env.RELEASE_TEST_REPORT = previous;
    await rm(directory, { recursive: true });
  }
});
