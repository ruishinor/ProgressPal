import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { validateTestReport } from './release-gate-utils.mjs';
import {
  E2E_SHARDS,
  IDENTITY,
  UNIT_STAGE,
  e2eStage,
  normalizedCommands,
  stagePrefix,
} from './release-reuse-contract.mjs';

/** The commands of one stage, in contract order, from the full gate list. */
export function selectStage(gate, stage, shard) {
  const labels = {
    unit: UNIT_STAGE.map(([label]) => label),
    e2e: e2eStage(1).map(([label]) => label),
    assemble: ['initial clean status', 'final clean status'],
    // Copy-only lane: proves the change is copy, then checks it builds.
    copy: [
      'initial clean status',
      'diff check',
      'clean dependency install',
      'dependency audit',
      'copy-only classification',
      'lint',
      'format check',
      'typecheck',
      'production build',
      'bundle budget',
      'circular dependency analysis',
      'final clean status',
    ],
  }[stage];
  if (labels === undefined) {
    throw new Error('Unknown RELEASE_STAGE ' + stage);
  }
  if (
    stage === 'e2e' &&
    !(
      new RegExp('^[1-9]/' + E2E_SHARDS + '$').test(shard ?? '') &&
      Number(shard.split('/')[0]) <= E2E_SHARDS
    )
  ) {
    throw new Error('RELEASE_SHARD must be i/' + E2E_SHARDS + '; got ' + shard);
  }
  return labels.map((label) => {
    const command = gate.find((candidate) => candidate.label === label);
    if (command === undefined) {
      throw new Error('Release stage command missing: ' + label);
    }
    return label === 'end-to-end tests'
      ? { ...command, args: [...command.args, '--shard=' + shard] }
      : command;
  });
}

function textSha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function requireStage(condition, key, what) {
  if (!condition) {
    throw new Error('Stage evidence ' + key + ' is invalid: ' + what);
  }
}

// Verify every stage of this run attempt against this checkout, then merge
// their command records into this manifest. A missing, extra, failed or
// foreign stage, a changed report or a different build blocks.
export async function assembleStages(
  manifest,
  commands,
  { root, artifactRoot, controls, runId, runAttempt },
) {
  const expected = [
    'unit',
    ...Array.from(
      { length: E2E_SHARDS },
      (_, index) => 'e2e-' + (index + 1) + 'of' + E2E_SHARDS,
    ),
  ];
  const found = new Map();
  for (const name of (await readdir(artifactRoot)).sort()) {
    const match = name.match(/-stage-([a-z0-9-]+)\.json$/);
    if (match === null) {
      continue;
    }
    requireStage(!found.has(match[1]), match[1], 'duplicate evidence');
    found.set(match[1], {
      name,
      raw: await readFile(join(artifactRoot, name), 'utf8'),
    });
  }
  if (!isDeepStrictEqual([...found.keys()].sort(), [...expected].sort())) {
    throw new Error(
      'Stage evidence must be exactly ' +
        expected.join(', ') +
        '; found ' +
        ([...found.keys()].join(', ') || 'none'),
    );
  }

  const merged = [];
  const stages = [];
  let build;
  let versions;
  for (const key of expected) {
    const { name, raw } = found.get(key);
    const stage = JSON.parse(raw);
    const shard = key === 'unit' ? null : Number(key.split(/-|of/)[1]);
    const kind = shard === null ? 'unit' : 'e2e';
    requireStage(
      stage.schemaVersion === 3 &&
        stage.status === 'passed' &&
        stage.failure === null,
      key,
      'did not pass',
    );
    requireStage(
      stage.stage === kind &&
        stage.shard === (shard === null ? null : shard + '/' + E2E_SHARDS),
      key,
      'stage identity',
    );
    for (const field of [
      'commitSha',
      'treeSha',
      'payloadTreeSha',
      'applicationVersion',
      'lockfileSha256',
      'nodeVersion',
      'npmVersion',
    ]) {
      requireStage(stage[field] === manifest[field], key, field);
    }
    requireStage(
      stage.os?.platform === manifest.os.platform &&
        stage.reviewEvidence?.sha256 === manifest.reviewEvidence.sha256 &&
        stage.reviewEvidence.path === manifest.reviewEvidence.path,
      key,
      'platform or review',
    );
    requireStage(
      stage.certification?.runId === runId &&
        stage.certification.runAttempt === runAttempt &&
        stage.certification.controls === controls,
      key,
      'not from this run attempt and control set',
    );
    requireStage(
      stage.totals?.skipCount === 0 && stage.totals.retryCount === 0,
      key,
      'skipped or retried tests',
    );
    requireStage(
      isDeepStrictEqual(normalizedCommands(stage.commands), [
        ...IDENTITY,
        ...(shard === null ? UNIT_STAGE : e2eStage(shard)),
      ]),
      key,
      'command profile',
    );
    for (const command of stage.commands) {
      requireStage(
        command.exitCode === 0 &&
          command.signal === null &&
          command.timedOut === false &&
          command.interrupted === false &&
          command.validation === 'passed' &&
          Array.isArray(command.policyViolations) &&
          command.policyViolations.length === 0,
        key,
        'command ' + command.label,
      );
      if (command.testReport === undefined) {
        continue;
      }
      const runner =
        command.label === 'end-to-end tests' ? 'playwright' : 'vitest';
      const report = command.testReport;
      requireStage(
        report.path ===
          'artifacts/release-evidence/' +
            report.invocation +
            '-' +
            runner +
            '.json',
        key,
        'report path',
      );
      const reportRaw = await readFile(resolve(root, report.path), 'utf8');
      const parsed = JSON.parse(reportRaw);
      requireStage(
        textSha256(reportRaw) === report.sha256 &&
          isDeepStrictEqual(parsed, report.result),
        key,
        'report content',
      );
      const counts = validateTestReport(parsed, report.invocation, runner);
      requireStage(
        Object.entries(counts).every(
          ([field, value]) => command[field] === value,
        ),
        key,
        'report counts',
      );
    }
    if (shard === null) {
      build = stage.artifacts;
      requireStage(Array.isArray(build) && build.length > 0, key, 'no build');
    } else {
      requireStage(
        isDeepStrictEqual(stage.artifacts, build),
        key,
        'tested a different build than the unit stage checked',
      );
      const observed = [stage.playwrightVersion, stage.browserVersion];
      requireStage(
        versions === undefined || isDeepStrictEqual(observed, versions),
        key,
        'browser versions differ between shards',
      );
      versions = observed;
    }
    merged.push(
      ...stage.commands.slice(IDENTITY.length).map((command) => ({
        ...command,
        label: stagePrefix(kind, shard) + command.label,
      })),
    );
    stages.push({
      key,
      path: relative(root, join(artifactRoot, name)).replaceAll('\\', '/'),
      sha256: textSha256(raw),
      startedAt: stage.startedAt,
      endedAt: stage.endedAt,
    });
  }
  // Order: identity, initial clean status, stages, final clean status.
  commands.splice(IDENTITY.length + 1, 0, ...merged);
  manifest.artifacts = build;
  manifest.playwrightVersion = versions[0];
  manifest.browserVersion = versions[1];
  manifest.stages = stages;
}
