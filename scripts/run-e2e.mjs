import { spawn } from 'node:child_process';
import { writeSync } from 'node:fs';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';

const HOST = '127.0.0.1';
const PREVIEW_PORT = 42_183;
const EXPECTED_TITLE = '<title>ProgressPal CS50 Edition</title>';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MANAGED_CONFIG = fileURLToPath(
  new URL('../playwright.managed.config.ts', import.meta.url),
);
const PLAYWRIGHT_CLI = fileURLToPath(
  new URL('../node_modules/@playwright/test/cli.js', import.meta.url),
);

let activeChild;
let cleanupPromise;
let lifecycleStarted = false;
let previewServer;
let receivedSignal;

function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }

  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

function withTimeout(promise, label, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} exceeded ${timeoutMs} ms.`)),
      timeoutMs,
    );

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

function spawnPlaywright(args) {
  return spawn(process.execPath, args, {
    cwd: ROOT,
    detached: process.platform !== 'win32',
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
}

async function terminate(child) {
  if (
    child === undefined ||
    child.exitCode !== null ||
    child.signalCode !== null
  ) {
    return;
  }

  if (child.pid === undefined) {
    return;
  }

  if (process.platform === 'win32') {
    try {
      const killer = spawn(
        'taskkill.exe',
        ['/PID', String(child.pid), '/T', '/F'],
        { stdio: 'ignore', windowsHide: true },
      );
      const outcome = await withTimeout(
        waitForExit(killer),
        'Windows process-tree shutdown',
        5_000,
      );

      if (outcome.code !== 0) {
        child.kill('SIGTERM');
      }
    } catch {
      child.kill('SIGTERM');
    }
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      if (error?.code !== 'ESRCH') {
        throw error;
      }
    }
  }

  try {
    await withTimeout(waitForExit(child), 'Managed Playwright shutdown', 5_000);
  } catch (error) {
    if (process.platform === 'win32') {
      throw error;
    }

    process.kill(-child.pid, 'SIGKILL');
    await withTimeout(waitForExit(child), 'Forced Playwright shutdown', 5_000);
  }
}

async function runPlaywright(args) {
  assertNotInterrupted();
  const child = spawnPlaywright(args);
  activeChild = child;

  try {
    const outcome = await withTimeout(
      waitForExit(child),
      'Playwright',
      21 * 60 * 1000,
    );

    if (outcome.code !== 0) {
      throw new Error(
        `Playwright exited with ${outcome.code ?? outcome.signal ?? 'unknown status'}.`,
      );
    }
  } catch (error) {
    try {
      await terminate(child);
    } catch (shutdownError) {
      throw new AggregateError(
        [error, shutdownError],
        'Playwright and its shutdown both failed.',
        { cause: shutdownError },
      );
    }

    throw error;
  } finally {
    activeChild = undefined;
  }
}

async function assertPortFree(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();

    server.once('error', () => {
      reject(
        new Error(
          `E2E port ${port} is already in use. ProgressPal will not reuse that server.`,
        ),
      );
    });
    server.listen({ exclusive: true, host: HOST, port }, () => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
}

async function waitForProgressPal() {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${HOST}:${PREVIEW_PORT}/`, {
        signal: AbortSignal.timeout(2_000),
      });
      const html = await response.text();

      if (response.ok && html.includes(EXPECTED_TITLE)) {
        return;
      }
    } catch {
      // The owned Vite preview is still starting.
    }

    await delay(250);
  }

  throw new Error(
    'Vite preview did not serve the ProgressPal document in time.',
  );
}

async function assertPortReleased() {
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    try {
      await assertPortFree(PREVIEW_PORT);
      return;
    } catch {
      await delay(250);
    }
  }

  throw new Error('The managed E2E server did not release its port.');
}

function cleanup() {
  cleanupPromise ??= (async () => {
    const errors = [];

    if (previewServer !== undefined) {
      try {
        await withTimeout(
          previewServer.close(),
          'Vite preview shutdown',
          5_000,
        );
      } catch (error) {
        errors.push(error);
      }
    }

    if (lifecycleStarted) {
      try {
        await assertPortReleased();
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, 'E2E cleanup failed.');
    }
  })();

  return cleanupPromise;
}

function formatFailure(error) {
  if (error instanceof AggregateError) {
    return [
      error.message,
      ...error.errors.map((entry) => formatFailure(entry)),
    ].join('\n');
  }

  return error instanceof Error
    ? (error.stack ?? error.message)
    : String(error);
}

function assertNotInterrupted() {
  if (receivedSignal !== undefined) {
    throw new Error(`E2E runner received ${receivedSignal}.`);
  }
}

async function exitFromSignal(signal, exitCode) {
  if (receivedSignal !== undefined) {
    return;
  }

  receivedSignal = signal;
  const errors = [new Error(`E2E runner received ${signal}.`)];

  try {
    await terminate(activeChild);
  } catch (error) {
    errors.push(error);
  }

  try {
    await cleanup();
  } catch (error) {
    errors.push(error);
  }

  writeSync(2, `${formatFailure(new AggregateError(errors))}\n`);
  process.exit(exitCode);
}

process.once('SIGINT', () => {
  void exitFromSignal('SIGINT', 130);
});
process.once('SIGTERM', () => {
  void exitFromSignal('SIGTERM', 143);
});

let failure;

try {
  await assertPortFree(PREVIEW_PORT);
  lifecycleStarted = true;
  await withTimeout(build({ root: ROOT }), 'Vite production build', 180_000);
  assertNotInterrupted();
  previewServer = await withTimeout(
    preview({
      preview: { host: HOST, port: PREVIEW_PORT, strictPort: true },
      root: ROOT,
    }),
    'Vite preview startup',
    30_000,
  );
  assertNotInterrupted();
  await waitForProgressPal();
  assertNotInterrupted();
  await runPlaywright([
    PLAYWRIGHT_CLI,
    'test',
    ...process.argv.slice(2),
    `--config=${MANAGED_CONFIG}`,
  ]);
} catch (error) {
  failure = error;
} finally {
  try {
    await cleanup();
  } catch (cleanupError) {
    failure =
      failure === undefined
        ? cleanupError
        : new AggregateError(
            [failure, cleanupError],
            'E2E run and cleanup both failed.',
          );
  }
}

if (receivedSignal !== undefined) {
  const signalFailure = new Error(`E2E runner received ${receivedSignal}.`);
  const reportedFailure =
    failure === undefined
      ? signalFailure
      : new AggregateError(
          [signalFailure, failure],
          'E2E interruption and cleanup both failed.',
        );

  writeSync(2, `${formatFailure(reportedFailure)}\n`);
  process.exit(receivedSignal === 'SIGINT' ? 130 : 143);
}

if (failure !== undefined) {
  writeSync(2, `${formatFailure(failure)}\n`);
  process.exit(1);
}

process.exit(0);
