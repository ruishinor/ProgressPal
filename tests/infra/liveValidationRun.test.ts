import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

/**
 * Runs the REAL owner-run harness (infra/nhost/validation/validate-live.mjs)
 * against a simulated stack (tests/infra/simulatedNhost.mjs). This proves the
 * harness logic: it passes a correct stack, FAILS a broken one, and ABORTS (is
 * inconclusive) on transport faults. It proves nothing about the real
 * provider; the owner-run live step does.
 */

const root = process.cwd();
const harness = path.join(root, 'infra/nhost/validation/validate-live.mjs');
const simulation = pathToFileURL(
  path.join(root, 'tests/infra/simulatedNhost.mjs'),
).href;
const scratch = mkdtempSync(path.join(tmpdir(), 'pp-live-validation-test-'));

const emailA = 'alice.synthetic@example.test';
const emailB = 'bob.synthetic@example.test';
const password = 'throwaway-pass-123';

interface SimulatedState {
  rows: Record<string, number>;
  graphqlRequests: number;
  outage: boolean;
}

function run(mode: string) {
  const out = path.join(scratch, mode);
  const stateFile = path.join(scratch, `${mode}-state.json`);
  const result = spawnSync(
    process.execPath,
    ['--import', simulation, harness, '--out', out],
    {
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH ?? '',
        FAKE_NHOST_MODE: mode,
        FAKE_NHOST_STATE_FILE: stateFile,
        NHOST_USER_A_EMAIL: emailA,
        NHOST_USER_B_EMAIL: emailB,
        NHOST_USER_PASSWORD: password,
      },
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  const evidenceFile = readdirSync(out).find((name) => name.endsWith('.json'));
  const state = JSON.parse(readFileSync(stateFile, 'utf8')) as SimulatedState;
  const rowsLeft = Object.values(state.rows).reduce((a, b) => a + b, 0);
  const evidence = evidenceFile
    ? (JSON.parse(readFileSync(path.join(out, evidenceFile), 'utf8')) as {
        result: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
        cleanup: { status: string; detail: string };
        aborted: string | null;
        failed: number;
        results: Array<{
          id: string;
          pass: boolean;
          detail: string;
          gatewayOnly?: boolean;
        }>;
      })
    : null;

  return {
    ...result,
    state,
    rowsLeft,
    evidence,
    evidenceText: evidenceFile
      ? readFileSync(path.join(out, evidenceFile), 'utf8')
      : '',
  };
}

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe('the live-validation harness against a simulated stack', () => {
  it('passes a correct stack: every check passes, exit code 0', () => {
    const result = run('healthy');

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.evidence?.aborted).toBeNull();
    expect(result.evidence?.failed).toBe(0);
    expect(result.evidence?.results.every((r) => r.pass)).toBe(true);

    const ids = result.evidence?.results.map((r) => r.id) ?? [];
    for (const id of [
      'P1',
      'P2',
      'P3',
      'P4',
      'T4-surface-3',
      'T7-lost-race',
      'T20-generation',
      'T20-generation-format',
      'T21-wrong-hash',
      'T21-missing-hash',
      'T21-short-hash',
      'T5-slot-range',
      'T5-ceiling',
      'T4-isolation-read',
      'T4-isolation-delete',
      'T4-forged-user',
      'T4-hidden-hash',
      'T4-anonymous',
      'T21-exact-text',
      'G3-stored-at',
    ]) {
      expect(ids, id).toContain(id);
    }
  });

  it('writes redacted evidence: no password, token or full email address', () => {
    const { evidenceText } = run('healthy');

    expect(evidenceText.length).toBeGreaterThan(100);
    expect(evidenceText).not.toContain(password);
    expect(evidenceText).not.toContain('sim-token');
    expect(evidenceText).not.toContain('sim-refresh');
    expect(evidenceText).not.toContain(emailA);
    expect(evidenceText).not.toContain(emailB);
  });

  it('FAILS a stack whose generation gate is missing (a stale-generation write got through)', () => {
    const result = run('no-generation-gate');

    expect(result.status).toBe(1);
    const failed =
      result.evidence?.results.filter((r) => !r.pass).map((r) => r.id) ?? [];
    expect(failed).toContain('T20-generation');
    expect(failed).toContain('T20-generation-format');
    // Later negatives may fail too: the stale-generation write changed the
    // inventory they compare against. That collateral is intended.
    expect(failed.length).toBeGreaterThanOrEqual(2);
  });

  it('FAILS a stack where a rejected insert leaves the delete committed (the rollback property)', () => {
    const result = run('delete-persists');

    expect(result.status).toBe(1);
    const failed = result.evidence?.results.filter((r) => !r.pass) ?? [];
    expect(failed.map((r) => r.id)).toEqual(
      expect.arrayContaining(['T20-generation', 'T21-wrong-hash']),
    );
    expect(failed.some((r) => r.detail.includes('inventory CHANGED'))).toBe(
      true,
    );
  });

  it('ABORTS (inconclusive, never a pass) when a gateway 502 answers a gate test', () => {
    const result = run('gateway-502-on-generation');

    expect(result.status).toBe(1);
    expect(result.evidence?.aborted).toMatch(/transport\/gateway fault/);
    const ids = result.evidence?.results.map((r) => r.id) ?? [];
    expect(ids).toContain('T7-lost-race'); // ran before the fault
    expect(ids).not.toContain('T20-generation'); // the faulted test is NOT recorded as a pass
    expect(ids).not.toContain('T21-wrong-hash'); // and nothing after it ran
  });

  it('runs no negative test at all when a positive control fails', () => {
    const result = run('p1-fails');

    expect(result.status).toBe(1);
    expect(result.evidence?.aborted).toMatch(/positive control "P1/);
    expect(result.evidence?.aborted).toMatch(/negative tests were not run/);
    const ids = result.evidence?.results.map((r) => r.id) ?? [];
    expect(
      ids.filter(
        (id) =>
          id.startsWith('T20') || id.startsWith('T21') || id.startsWith('T7'),
      ),
    ).toEqual([]);
  });

  describe('cleanup of the synthetic rows (CR-4)', () => {
    it('a normal PASS removes the rows afterwards and says so', () => {
      const result = run('healthy');

      expect(result.status).toBe(0);
      expect(result.evidence?.result).toBe('PASS');
      expect(result.evidence?.cleanup.status).toBe('complete');
      expect(result.rowsLeft).toBe(0);
      expect(result.stdout).toMatch(/CLEANUP complete/);
      expect(result.stdout).toMatch(/RESULT PASS/);
    });

    it('a FAIL still cleans up, and stays a FAIL', () => {
      const result = run('no-generation-gate');

      expect(result.status).toBe(1);
      expect(result.evidence?.result).toBe('FAIL');
      expect(result.evidence?.cleanup.status).toBe('complete');
      expect(result.rowsLeft).toBe(0);
    });

    it('an abort leaves no rows behind when the provider is still there, and stays INCONCLUSIVE', () => {
      const result = run('gateway-502-on-generation');

      expect(result.status).toBe(1);
      expect(result.evidence?.result).toBe('INCONCLUSIVE');
      expect(result.evidence?.aborted).toMatch(/transport\/gateway fault/);
      expect(result.evidence?.cleanup.status).toBe('complete');
      // The positive controls wrote rows before the abort; they are gone now.
      expect(result.rowsLeft).toBe(0);
    });

    it('an abort during an outage keeps the original result and records the cleanup as INCOMPLETE', () => {
      const result = run('outage-after-abort');

      expect(result.status).toBe(1);
      expect(result.evidence?.result).toBe('INCONCLUSIVE');
      expect(result.evidence?.aborted).toMatch(/transport\/gateway fault/);
      expect(result.evidence?.cleanup.status).toBe('incomplete');
      expect(result.evidence?.cleanup.detail).toMatch(/delete transport/);
      expect(result.evidence?.cleanup.detail).toMatch(/next run clears/);
      // The rows really are still there; the evidence does not pretend otherwise.
      expect(result.rowsLeft).toBeGreaterThan(0);
      expect(result.stdout).toMatch(/CLEANUP incomplete/);
    });

    it('a PASS whose cleanup cannot run stays a PASS, with its own exit code', () => {
      const result = run('outage-before-cleanup');

      expect(result.evidence?.result).toBe('PASS');
      expect(result.evidence?.failed).toBe(0);
      expect(result.evidence?.aborted).toBeNull();
      expect(result.evidence?.cleanup.status).toBe('incomplete');
      expect(result.status).toBe(3);
      expect(result.rowsLeft).toBeGreaterThan(0);
    });

    it('when no sign-in succeeded nothing is written and cleanup is not attempted', () => {
      const result = run('signin-fails');

      expect(result.status).toBe(1);
      expect(result.evidence?.result).toBe('INCONCLUSIVE');
      expect(result.evidence?.aborted).toMatch(/could not sign in/);
      expect(result.evidence?.cleanup.status).toBe('not-attempted');
      expect(result.state.graphqlRequests).toBe(0);
    });

    it('every run begins by clearing rows left by an earlier run', () => {
      const result = run('preseeded');

      // Rows in slots 0, 2 and 4 would have broken the positive controls.
      expect(result.evidence?.result).toBe('PASS');
      expect(result.evidence?.cleanup.status).toBe('complete');
      expect(result.rowsLeft).toBe(0);
    });

    it('cleanup evidence carries no secret, token or full address', () => {
      const { evidenceText } = run('outage-after-abort');

      expect(evidenceText).not.toContain(password);
      expect(evidenceText).not.toContain('sim-token');
      expect(evidenceText).not.toContain(emailA);
    });
  });

  it('records a gateway-only refusal of the oversize request honestly', () => {
    const result = run('ceiling-gateway');
    const ceiling = result.evidence?.results.find((r) => r.id === 'T5-ceiling');

    expect(result.status).toBe(0);
    expect(ceiling?.pass).toBe(true);
    expect(ceiling?.gatewayOnly).toBe(true);
    expect(ceiling?.detail).toMatch(/database ceiling was NOT exercised/);
  });
});
