import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

describe('private feedback Node handler', () => {
  it('passes its bounded request, privacy and acknowledgement contract', () => {
    const result = spawnSync(
      process.execPath,
      ['--test', 'tests/server/feedback.test.mjs'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 10000,
        env: {
          ...process.env,
          FEEDBACK_INTAKE_ENABLED: 'false',
          FEEDBACK_NHOST_ADMIN_SECRET: '',
        },
      },
    );
    expect(result.error, result.stderr).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(0);
  });
});
