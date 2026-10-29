import { spawn } from 'node:child_process';

const PROCESS_SHUTDOWN_TIMEOUT_MS = 5_000;

function childClosed(child) {
  const processEnded = child.exitCode !== null || child.signalCode !== null;
  const stdoutEnded = child.stdout === null || child.stdout.readableEnded;
  const stderrEnded = child.stderr === null || child.stderr.readableEnded;
  return processEnded && stdoutEnded && stderrEnded;
}

function waitForClose(child) {
  if (childClosed(child)) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }

  return new Promise((resolve, reject) => {
    const onError = (error) => {
      child.off('close', onClose);
      reject(error);
    };
    const onClose = (code, signal) => {
      child.off('error', onError);
      resolve({ code, signal });
    };

    child.once('error', onError);
    child.once('close', onClose);
  });
}

function withDeadline(promise, label, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} exceeded ${timeoutMs} ms.`));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function terminateProcessTree(child) {
  if (child === undefined || childClosed(child) || child.pid === undefined) {
    return;
  }

  if (process.platform === 'win32') {
    const killer = spawn(
      'taskkill.exe',
      ['/PID', String(child.pid), '/T', '/F'],
      { stdio: 'ignore', windowsHide: true },
    );
    const killerOutcome = await withDeadline(
      waitForClose(killer),
      'Windows process-tree shutdown',
      PROCESS_SHUTDOWN_TIMEOUT_MS,
    );

    if (killerOutcome.code !== 0 && !childClosed(child)) {
      child.kill('SIGTERM');
    }

    await withDeadline(
      waitForClose(child),
      'Owned command shutdown',
      PROCESS_SHUTDOWN_TIMEOUT_MS,
    );
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch (error) {
    if (error?.code !== 'ESRCH') {
      throw error;
    }
  }

  try {
    await withDeadline(
      waitForClose(child),
      'Owned command shutdown',
      PROCESS_SHUTDOWN_TIMEOUT_MS,
    );
  } catch (error) {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch (killError) {
      if (killError?.code !== 'ESRCH') {
        throw new AggregateError(
          [error, killError],
          'Graceful and forced process-tree shutdown failed.',
          { cause: killError },
        );
      }
    }

    await withDeadline(
      waitForClose(child),
      'Forced owned command shutdown',
      PROCESS_SHUTDOWN_TIMEOUT_MS,
    );
  }
}

export async function runContainedCommand({
  executable,
  args = [],
  cwd,
  env,
  timeoutMs,
  signal,
  onStdout,
  onStderr,
}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Contained commands require a positive finite timeout.');
  }
  if (signal?.aborted) {
    throw signal.reason ?? new Error('Contained command was aborted.');
  }

  const child = spawn(executable, args, {
    cwd,
    detached: process.platform !== 'win32',
    env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let interrupted = false;
  let shutdownPromise;

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    stdout += text;
    onStdout?.(text);
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderr += text;
    onStderr?.(text);
  });

  const closePromise = waitForClose(child);
  const stop = () => {
    shutdownPromise ??= terminateProcessTree(child);
    return shutdownPromise;
  };
  let timeoutHandle;
  let abortHandler;

  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      void stop().then(() => closePromise.then(resolve, reject), reject);
    }, timeoutMs);
  });
  const competingPromises = [closePromise, timeoutPromise];

  if (signal !== undefined) {
    competingPromises.push(
      new Promise((resolve, reject) => {
        abortHandler = () => {
          interrupted = true;
          void stop().then(() => closePromise.then(resolve, reject), reject);
        };
        signal.addEventListener('abort', abortHandler, { once: true });
      }),
    );
  }

  try {
    const outcome = await Promise.race(competingPromises);
    return { ...outcome, interrupted, stderr, stdout, timedOut };
  } finally {
    clearTimeout(timeoutHandle);
    if (abortHandler !== undefined) {
      signal.removeEventListener('abort', abortHandler);
    }
    if (shutdownPromise !== undefined) {
      await shutdownPromise;
    }
  }
}

export function diagnosticLines(stdout, stderr) {
  const diagnosticPattern = /\b(warning|warn|error|failed|failure)\b/i;
  return [
    ...stderr.split(/\r?\n/).filter((line) => diagnosticPattern.test(line)),
    ...stdout
      .split(/\r?\n/)
      .filter((line) => /^\s*(warning|warn)\b/i.test(line)),
  ];
}

function maximumMatchedCount(value, patterns) {
  let maximum = 0;

  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) {
      maximum = Math.max(maximum, Number(match[1] ?? 0));
    }
  }

  return maximum;
}

export function executionSummary(stdout, stderr = '') {
  const output = `${stdout}\n${stderr}`;
  const skipCount = maximumMatchedCount(output, [
    /\b(\d+)\s+(?:skipped|pending|todo)\b/gi,
    /\b(?:skipped|pending|todo)\s+(\d+)\b/gi,
    /\b(?:skipped|pending|todo)\s*[:=]\s*(\d+)\b/gi,
  ]);
  const retryCount = maximumMatchedCount(output, [
    /\b(\d+)\s+(?:retried|retries|retry)\b/gi,
    /\b(?:retried|retries|retry)\s+(\d+)\b/gi,
    /\bretr(?:y|ies)\s*[:=]\s*(\d+)\b/gi,
  ]);
  const testCount = maximumMatchedCount(output, [
    /^\s*Tests\s+\d+\s+passed\s+\((\d+)\)/gim,
    /^\s*Test Files\s+\d+\s+passed\s+\((\d+)\)/gim,
    /^\s*(\d+)\s+passed(?:\s+\([^\n]+\))?\s*$/gim,
    /^#\s+tests\s+(\d+)\s*$/gim,
  ]);

  return {
    retryCount,
    skipCount,
    testCount: testCount === 0 ? null : testCount,
  };
}

export function sanitizeEnvironment(environment) {
  return Object.fromEntries(
    Object.entries(environment).filter(
      ([key]) => !['FORCE_COLOR', 'NO_COLOR'].includes(key.toUpperCase()),
    ),
  );
}

// This is the command decision consumer used by run(), not a log severity guess.
export async function enforceCommandPolicy(record, validate) {
  record.policyViolations = [];
  record.validation = 'not-run';
  try {
    if (record.timedOut) throw new Error('command deadline exceeded');
    if (record.interrupted) throw new Error('command interrupted');
    if (record.exitCode !== 0 || record.signal !== null)
      throw new Error(
        `command failed with exit ${record.exitCode}, signal ${record.signal}`,
      );
    if (validate) await validate(record);
    record.validation = 'passed';
  } catch (error) {
    record.validation = 'failed';
    record.policyViolations.push(error.message);
    throw new Error(`${record.label}: ${error.message}`, { cause: error });
  }
}

export function validateTestReport(report, invocation, runner) {
  const fail = () => {
    throw new Error(
      'Missing, invalid, incomplete, failed, skipped or retried test evidence',
    );
  };
  if (
    !report ||
    report.schemaVersion !== 1 ||
    report.invocation !== invocation ||
    report.runner !== runner ||
    report.status !== 'passed' ||
    report.errors !== 0 ||
    !Number.isSafeInteger(report.expected) ||
    report.expected <= 0 ||
    !Array.isArray(report.units) ||
    report.units.length !== report.expected
  )
    fail();
  let testCount = 0;
  for (const unit of report.units) {
    if (
      unit.status !== 'passed' ||
      !Array.isArray(unit.tests) ||
      !unit.tests.length
    )
      fail();
    for (const test of unit.tests) {
      if (
        typeof test.name !== 'string' ||
        test.status !== 'passed' ||
        test.retries !== 0
      )
        fail();
      testCount++;
    }
  }
  return {
    testCount,
    skipCount: 0,
    retryCount: 0,
    fileCount: runner === 'vitest' ? report.units.length : null,
  };
}

export function validateNodeTests(record) {
  // Node's TAP summary is anchored; test titles and diagnostic comments cannot match.
  const output = record.stdout;
  const count = (key) => {
    const matches = [...output.matchAll(new RegExp(`^# ${key} (\\d+)$`, 'gm'))];
    if (matches.length !== 1)
      throw new Error('Missing or ambiguous Node test summary');
    return Number(matches[0][1]);
  };
  const total = count('tests');
  if (
    !total ||
    count('pass') !== total ||
    ['fail', 'cancelled', 'skipped', 'todo'].some((key) => count(key) !== 0)
  )
    throw new Error('Node tests failed or were incomplete/skipped');
  Object.assign(record, { testCount: total, skipCount: 0, retryCount: 0 });
}
