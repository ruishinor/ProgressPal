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
