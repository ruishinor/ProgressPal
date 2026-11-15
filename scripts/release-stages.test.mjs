import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  E2E_SHARDS,
  IDENTITY,
  UNIT_STAGE,
  e2eStage,
} from './release-reuse-contract.mjs';
import { assembleStages, selectStage } from './release-stages.mjs';

// All data synthetic. One unit stage and every e2e shard of run 7 attempt 1.
const hash = (text) => createHash('sha256').update(text).digest('hex');
const build = [{ path: 'dist/index.html', sha256: 'a'.repeat(64), bytes: 1 }];
const binding = {
  commitSha: 'c'.repeat(40),
  treeSha: 't'.repeat(40),
  payloadTreeSha: 'p'.repeat(40),
  applicationVersion: '1.10.0',
  lockfileSha256: 'lock',
  nodeVersion: 'v24.22.1',
  npmVersion: '11.10.1',
  os: { platform: 'linux' },
  reviewEvidence: { path: 'docs/release-reviews/x.json', sha256: 'review' },
};
const context = (root) => ({
  root,
  artifactRoot: join(root, 'artifacts/release-evidence'),
  controls: 'controls',
  runId: 7,
  runAttempt: 1,
});

function stageManifest(root, key, shard) {
  const contract = [
    ...IDENTITY,
    ...(shard === null ? UNIT_STAGE : e2eStage(shard)),
  ];
  const commands = contract.map(([label, args]) => {
    const command = {
      label,
      args,
      exitCode: 0,
      signal: null,
      timedOut: false,
      interrupted: false,
      validation: 'passed',
      policyViolations: [],
      skipCount: 0,
      retryCount: 0,
    };
    const runner =
      label === 'unit and integration tests'
        ? 'vitest'
        : label === 'end-to-end tests'
          ? 'playwright'
          : null;
    if (runner) {
      const invocation = 'inv-' + key;
      const report = {
        schemaVersion: 1,
        invocation,
        runner,
        status: 'passed',
        errors: 0,
        expected: 1,
        units: [
          {
            status: 'passed',
            tests: [{ name: 'probe', status: 'passed', retries: 0 }],
          },
        ],
      };
      const raw = JSON.stringify(report);
      const path = `artifacts/release-evidence/${invocation}-${runner}.json`;
      writeFileSync(join(root, path), raw);
      Object.assign(command, {
        testReport: { path, invocation, sha256: hash(raw), result: report },
        testCount: 1,
        fileCount: runner === 'vitest' ? 1 : null,
      });
    }
    return command;
  });
  return {
    schemaVersion: 3,
    status: 'passed',
    failure: null,
    stage: shard === null ? 'unit' : 'e2e',
    shard: shard === null ? null : `${shard}/${E2E_SHARDS}`,
    ...structuredClone(binding),
    playwrightVersion: shard === null ? null : 'Version 1.60.0',
    browserVersion: shard === null ? null : '148.0.7778.96',
    artifacts: build,
    totals: { skipCount: 0, retryCount: 0 },
    certification: { runId: 7, runAttempt: 1, controls: 'controls' },
    commands,
  };
}

function setup(mutate = () => {}) {
  const root = mkdtempSync(join(tmpdir(), 'stages-'));
  mkdirSync(join(root, 'artifacts/release-evidence'), { recursive: true });
  const stages = new Map([['unit', stageManifest(root, 'unit', null)]]);
  for (let shard = 1; shard <= E2E_SHARDS; shard++) {
    const key = `e2e-${shard}of${E2E_SHARDS}`;
    stages.set(key, stageManifest(root, key, shard));
  }
  mutate(stages, root);
  for (const [key, stage] of stages) {
    writeFileSync(
      join(root, `artifacts/release-evidence/s-mod-stage-${key}.json`),
      JSON.stringify(stage),
    );
  }
  const own = (label, args) => ({ label, args });
  const commands = [
    ...IDENTITY.map(([label, args]) => own(label, args)),
    own('initial clean status', []),
    own('final clean status', []),
  ];
  return { root, commands, manifest: structuredClone(binding) };
}

async function assemble(mutate) {
  const { root, commands, manifest } = setup(mutate);
  try {
    await assembleStages(manifest, commands, context(root));
    return { commands, manifest };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('assembles every stage in contract order with the checked build', async () => {
  const { commands, manifest } = await assemble();
  assert.equal(commands[IDENTITY.length].label, 'initial clean status');
  assert.equal(commands.at(-1).label, 'final clean status');
  assert.ok(commands.some((c) => c.label === 'unit: lint'));
  assert.ok(
    commands.some(
      (c) => c.label === `e2e ${E2E_SHARDS}/${E2E_SHARDS}: end-to-end tests`,
    ),
  );
  assert.deepEqual(manifest.artifacts, build);
  assert.equal(manifest.browserVersion, '148.0.7778.96');
  assert.equal(manifest.stages.length, 1 + E2E_SHARDS);
});

const rejections = {
  'a missing shard': (stages) => stages.delete('e2e-2of3'),
  'a failed stage': (stages) => {
    stages.get('unit').status = 'failed';
  },
  'a stage from another run': (stages) => {
    stages.get('e2e-1of3').certification.runId = 8;
  },
  'a stage from another attempt': (stages) => {
    stages.get('e2e-3of3').certification.runAttempt = 2;
  },
  'a different commit': (stages) => {
    stages.get('unit').commitSha = 'd'.repeat(40);
  },
  'a different review': (stages) => {
    stages.get('e2e-1of3').reviewEvidence.sha256 = 'other';
  },
  'a shard that tested a different build': (stages) => {
    stages.get('e2e-2of3').artifacts = [
      { ...build[0], sha256: 'b'.repeat(64) },
    ];
  },
  'a skipped command': (stages) => {
    stages.get('unit').commands.splice(5, 1);
  },
  'a shard run with another shard spec': (stages) => {
    const e2e = stages
      .get('e2e-1of3')
      .commands.find((c) => c.label === 'end-to-end tests');
    e2e.args = e2e.args.map((arg) =>
      arg.startsWith('--shard=') ? '--shard=2/3' : arg,
    );
  },
  'a nonzero exit': (stages) => {
    stages.get('unit').commands[4].exitCode = 1;
  },
  'a retried test': (stages) => {
    stages.get('e2e-1of3').totals.retryCount = 1;
  },
  'a changed report': (stages, root) => {
    const report = stages
      .get('unit')
      .commands.find((c) => c.testReport).testReport;
    writeFileSync(join(root, report.path), '{"tampered":true}');
  },
};
for (const [name, mutate] of Object.entries(rejections)) {
  test(`rejects ${name}`, async () => {
    await assert.rejects(assemble(mutate), /Stage evidence/);
  });
}

test('selects exactly the stage commands and pins the shard', () => {
  const gate = [...UNIT_STAGE, ...e2eStage(1), ['Playwright version', []]].map(
    ([label, args]) => ({ label, args: [...args] }),
  );
  const e2e = selectStage(gate, 'e2e', `2/${E2E_SHARDS}`);
  assert.deepEqual(
    e2e.map((c) => c.label),
    e2eStage(2).map(([label]) => label),
  );
  assert.ok(
    e2e
      .find((c) => c.label === 'end-to-end tests')
      .args.includes(`--shard=2/${E2E_SHARDS}`),
  );
  assert.throws(() => selectStage(gate, 'e2e', '4/3'), /RELEASE_SHARD/);
  assert.throws(() => selectStage(gate, 'other', null), /Unknown/);
});

test('the copy stage classifies, audits, builds and unit-tests, without browsers', () => {
  const gate = [...UNIT_STAGE, ['copy-only classification', []]].map(
    ([label, args]) => ({ label, args: [...args] }),
  );
  const labels = selectStage(gate, 'copy', null).map((c) => c.label);
  assert.ok(labels.includes('copy-only classification'));
  assert.ok(labels.includes('dependency audit'));
  assert.ok(labels.includes('production build'));
  assert.ok(labels.includes('unit and integration tests'));
  assert.ok(!labels.includes('end-to-end tests'));
});
