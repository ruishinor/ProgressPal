import assert from 'node:assert/strict';
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
