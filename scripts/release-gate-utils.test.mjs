import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { diagnosticLines, sanitizeEnvironment } from './release-gate-utils.mjs';

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
