import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
