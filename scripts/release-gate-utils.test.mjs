import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  diagnosticLines,
  executionSummary,
  sanitizeEnvironment,
  validateReviewEvidence,
} from './release-gate-utils.mjs';

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

test('validateReviewEvidence requires resolved high-priority findings and a proceed decision', () => {
  const evidence = {
    schemaVersion: 1,
    module: 'module-3',
    reviewer: 'Adversarial reviewer',
    adversarialFindings: [
      {
        id: 'M3-01',
        severity: 'P1',
        description: 'Unsafe authority model.',
        resolution: 'Replaced with Web Locks.',
        status: 'resolved',
      },
    ],
    retrospective: {
      decision: 'proceed',
      summary: 'The high-priority defect is resolved.',
    },
  };

  assert.deepEqual(validateReviewEvidence(evidence, 'module-3'), {
    reviewer: 'Adversarial reviewer',
    adversarialFindings: evidence.adversarialFindings,
    retrospective: evidence.retrospective,
  });
  assert.throws(
    () =>
      validateReviewEvidence(
        {
          ...evidence,
          adversarialFindings: [
            { ...evidence.adversarialFindings[0], status: 'accepted-risk' },
          ],
        },
        'module-3',
      ),
    /P0 and P1 findings must be resolved/,
  );
  assert.throws(
    () =>
      validateReviewEvidence(
        {
          ...evidence,
          retrospective: { decision: 'reject', summary: 'Not ready.' },
        },
        'module-3',
      ),
    /proceed retrospective decision/,
  );
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
