import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const workflow = readFileSync(
  resolve(root, '.github/workflows/test.yml'),
  'utf8',
);
const gateRunner = readFileSync(
  resolve(root, 'scripts/run-release-gate.mjs'),
  'utf8',
);

// Vercel Deployment Checks hold a production deployment back until the
// GitHub check it was told to require passes. That requirement is stored by
// check name in the Vercel project, so this workflow contract is the
// repository-side half of "validated before production".
//
// It reads `.github/`, which is export-ignored from `git archive` source
// packages, so it needs a repository checkout. It deliberately fails rather
// than skips if the workflow is missing: deleting it would silently ungate
// Production.
describe('release validation workflow contract', () => {
  it('keeps the check name that Vercel Deployment Checks require', () => {
    expect(workflow).toMatch(/^name: Release validation$/m);
    expect(workflow).toMatch(/^ {2}final-candidate:$/m);
    expect(workflow).toMatch(/^ {4}name: Final candidate$/m);
  });

  it('validates every master push, pull request, and manual dispatch', () => {
    expect(workflow).toMatch(/^ {2}push:\n {4}branches:\n {6}- master$/m);
    expect(workflow).toMatch(/^ {2}pull_request:$/m);
    expect(workflow).toMatch(/^ {2}workflow_dispatch:$/m);
  });

  it('validates the triggering commit through the single release gate', () => {
    expect(workflow).toContain('ref: ${{ github.sha }}');
    expect(workflow.match(/npm run verify:release/g)).toHaveLength(1);
  });

  it('does not select review evidence by workflow input', () => {
    expect(workflow).not.toContain('RELEASE_REVIEW_FILE');
    expect(workflow).not.toContain('RELEASE_MODULE');
    expect(gateRunner).toContain('no longer supported');
  });

  it('holds no deployment authority or secrets', () => {
    expect(workflow).toMatch(/^permissions:\n {2}contents: read$/m);
    expect(workflow).not.toMatch(/secrets\./);
    expect(workflow).not.toMatch(/VERCEL/i);
  });
});

const playwrightConfig = readFileSync(
  resolve(root, 'playwright.config.ts'),
  'utf8',
);
const e2eRunner = readFileSync(resolve(root, 'scripts/run-e2e.mjs'), 'utf8');

// Exercise the real command loop and run() body without launching any commands.
// This catches a configured timeout that never reaches process containment.
async function executeCommandLoop(
  warnings: string[] = [],
  summary = { skipCount: 0, retryCount: 0, testCount: null },
): Promise<Array<{ label: string; timeoutMs: number; args: string[] }>> {
  const runStart = gateRunner.indexOf('async function run(');
  const runEnd = gateRunner.indexOf('\nasync function sha256(');
  const gateStart = gateRunner.indexOf('  const gate = [');
  const gateEnd = gateRunner.indexOf('\n  manifest.artifacts =');
  expect(runStart).toBeGreaterThanOrEqual(0);
  expect(runEnd).toBeGreaterThan(runStart);
  expect(gateStart).toBeGreaterThan(runEnd);
  expect(gateEnd).toBeGreaterThan(gateStart);
  const commandTimeout = gateRunner.match(
    /const COMMAND_TIMEOUT_MS = (\d+) \* 60 \* 1000;/,
  );
  expect(commandTimeout).not.toBeNull();
  const containedTimeouts: number[] = [];
  const records = await runInNewContext(
    `(async () => {
      ${gateRunner.slice(runStart, runEnd)}
      ${gateRunner.slice(gateStart, gateEnd)}
      return commands;
    })()`,
    {
      COMMAND_TIMEOUT_MS: Number(commandTimeout![1]) * 60_000,
      ROOT: root,
      repositoryExclude: resolve(root, '.git/info/exclude'),
      commands: [],
      manifest: {},
      interruptController: new AbortController(),
      process: {
        execPath: 'node',
        env: {},
        stdout: { write() {} },
        stderr: { write() {} },
      },
      npmArgs: (args: string[]) => ['npm', ...args],
      sanitizeEnvironment: () => ({}),
      cleanOutput: (value: string) => value.trim(),
      diagnosticLines: () => warnings,
      executionSummary: () => summary,
      runContainedCommand: async ({ timeoutMs }: { timeoutMs: number }) => {
        containedTimeouts.push(timeoutMs);
        return {
          code: 0,
          signal: null,
          stdout: '',
          stderr: '',
          timedOut: false,
          interrupted: false,
        };
      },
    },
  );
  expect(
    records.map((record: { timeoutMs: number }) => record.timeoutMs),
  ).toEqual(containedTimeouts);
  return records;
}

describe('release execution budgets', () => {
  it('forwards the E2E override to containment and preserves every other command budget', async () => {
    const commands = await executeCommandLoop();
    const e2e = commands.filter(
      (command) => command.label === 'end-to-end tests',
    );
    expect(e2e).toHaveLength(1);
    expect(e2e[0]!.args).toEqual(['npm', 'run', 'test:e2e']);
    expect(e2e[0]!.timeoutMs).toBe(4_980_000);
    const others = commands.filter(
      (command) => command.label !== 'end-to-end tests',
    );
    expect(others.length).toBeGreaterThan(0);
    expect(others.every((command) => command.timeoutMs === 1_920_000)).toBe(
      true,
    );
    expect(gateRunner).toContain('timeoutMs = COMMAND_TIMEOUT_MS');
  });

  it('keeps nested suite, child, command and hosted-job deadlines with startup and cleanup headroom', async () => {
    const suite =
      Number(
        playwrightConfig.match(/globalTimeout: (\d+) \* 60 \* 1000/)?.[1],
      ) * 60_000;
    const child =
      Number(e2eRunner.match(/'Playwright',\s+(\d+) \* 60 \* 1000/)?.[1]) *
      60_000;
    const job = Number(workflow.match(/timeout-minutes: (\d+)/)?.[1]) * 60_000;
    const e2e = (await executeCommandLoop()).find(
      (command) => command.label === 'end-to-end tests',
    )!.timeoutMs;
    expect([suite, child, e2e, job]).toEqual([
      4_500_000, 4_560_000, 4_980_000, 7_800_000,
    ]);
    expect(child - suite).toBeGreaterThanOrEqual(60_000);
    // Existing build, preview startup, document readiness, and shutdown allowances.
    expect(e2e - child).toBeGreaterThanOrEqual(
      180_000 + 30_000 + 120_000 + 30_000,
    );
    expect(job - e2e).toBeGreaterThanOrEqual(40 * 60_000);
    expect(playwrightConfig).toMatch(/workers: 1,/);
    expect(playwrightConfig).toMatch(/retries: 0,/);
  });

  it('still rejects diagnostics, skipped tests and retries in the actual command loop', async () => {
    await expect(
      executeCommandLoop(['Warning: diagnostic probe']),
    ).rejects.toThrow('emitted warning or stderr output');
    await expect(
      executeCommandLoop([], { skipCount: 1, retryCount: 0, testCount: null }),
    ).rejects.toThrow('reported skipped, pending, or todo tests');
    await expect(
      executeCommandLoop([], { skipCount: 0, retryCount: 1, testCount: null }),
    ).rejects.toThrow('reported retried tests');
  });

  it('still resolves committed payload-bound review evidence before entering the command loop', () => {
    const binding = gateRunner.indexOf(
      'const resolution = resolveReviewEvidence({',
    );
    expect(binding).toBeGreaterThanOrEqual(0);
    expect(binding).toBeLessThan(gateRunner.indexOf('  const gate = ['));
    expect(gateRunner).toContain(
      "files: readEvidenceFiles({ cwd: ROOT, treeish: 'HEAD' })",
    );
    expect(gateRunner).toContain(
      'candidatePayloadTree: manifest.payloadTreeSha',
    );
  });
});
