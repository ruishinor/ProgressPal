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

function run(mode: string) {
  const out = path.join(scratch, mode);
  const result = spawnSync(
    process.execPath,
    ['--import', simulation, harness, '--out', out],
    {
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH ?? '',
        FAKE_NHOST_MODE: mode,
        NHOST_USER_A_EMAIL: emailA,
        NHOST_USER_B_EMAIL: emailB,
        NHOST_USER_PASSWORD: password,
      },
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  const evidenceFile = readdirSync(out).find((name) => name.endsWith('.json'));
  const evidence = evidenceFile
    ? (JSON.parse(readFileSync(path.join(out, evidenceFile), 'utf8')) as {
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

  it('records a gateway-only refusal of the oversize request honestly', () => {
    const result = run('ceiling-gateway');
    const ceiling = result.evidence?.results.find((r) => r.id === 'T5-ceiling');

    expect(result.status).toBe(0);
    expect(ceiling?.pass).toBe(true);
    expect(ceiling?.gatewayOnly).toBe(true);
    expect(ceiling?.detail).toMatch(/database ceiling was NOT exercised/);
  });
});
