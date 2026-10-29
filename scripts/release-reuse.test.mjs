import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { crc32, deflateRawSync } from 'node:zlib';
import {
  ARTIFACT,
  COMMANDS,
  REPOSITORY,
  REPOSITORY_ID,
  STEPS,
  WORKFLOW,
} from './release-reuse-contract.mjs';
import {
  ReuseError,
  decideReuse,
  discoverSource,
  executeDecision,
  githubClient,
  selectPr,
  recheckSource,
} from './release-reuse.mjs';
import { readZip, sha256 } from './release-reuse-zip.mjs';

// The REST envelope, empty pull_requests, artifact ownership and job/head SHA
// shapes follow observed PR #49 run 40799107209 attempt 1. All test data synthetic.
const C = 'c'.repeat(40),
  S = 'd'.repeat(40),
  B = 'b'.repeat(40),
  H = 'a'.repeat(40),
  T = 'e'.repeat(40);
const tap =
  '# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';
const time = '2026-10-29T00:00:00.000Z';
function zip(files) {
  const locals = [],
    central = [];
  let offset = 0;
  for (const [name, data] of files) {
    const content = Buffer.from(data),
      n = Buffer.from(name),
      packed = deflateRawSync(content);
    const local = Buffer.alloc(30),
      header = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc32(content), 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(n.length, 26);
    header.writeUInt32LE(0x02014b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(8, 10);
    header.writeUInt32LE(crc32(content), 16);
    header.writeUInt32LE(packed.length, 20);
    header.writeUInt32LE(content.length, 24);
    header.writeUInt16LE(n.length, 28);
    header.writeUInt32LE(offset, 42);
    locals.push(local, n, packed);
    central.push(header, n);
    offset += local.length + n.length + packed.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
function fixture() {
  const current = {
    sha: C,
    tree: T,
    parents: [B, H],
    controls: 'controls',
    payload: 'payload',
    review: { path: 'docs/release-reviews/probe.json', sha256: 'review' },
    platform: 'linux',
    arch: 'x64',
    nodeVersion: 'v24.22.1',
    npmVersion: '11.10.1',
    lockfileSha256: 'lock',
    testRunners: { vitest: '4.1.12', playwright: '1.60.0' },
  };
  const pr = {
    number: 50,
    merged_at: time,
    merge_commit_sha: C,
    base: { ref: 'master', sha: B, repo: { id: REPOSITORY_ID } },
    head: { sha: H, repo: { id: REPOSITORY_ID } },
  };
  const run = {
    id: 123,
    run_attempt: 2,
    status: 'completed',
    conclusion: 'success',
    event: 'pull_request',
    path: WORKFLOW,
    workflow_id: 42,
    repository: { id: REPOSITORY_ID, full_name: REPOSITORY },
    head_repository: { id: REPOSITORY_ID },
    head_sha: H,
    pull_requests: [],
    check_suite_id: 88,
  };
  const job = {
    id: 456,
    run_id: 123,
    run_attempt: 2,
    head_sha: H,
    name: 'Final candidate',
    status: 'completed',
    conclusion: 'success',
    started_at: time,
    completed_at: time,
    check_run_url: `https://api.github.com/repos/${REPOSITORY}/check-runs/456`,
    steps: STEPS.map((name) => ({
      name,
      status: 'completed',
      conclusion: 'success',
    })),
  };
  const check = {
    id: 456,
    name: 'Final candidate',
    app: { slug: 'github-actions', id: 15368 },
    status: 'completed',
    conclusion: 'success',
    head_sha: H,
    check_suite: { id: 88 },
  };
  const reports = [];
  const commands = COMMANDS.map(([label, args]) => {
    const command = {
      label,
      args,
      executable: [
        'commit SHA',
        'tree SHA',
        'initial clean status',
        'diff check',
        'final clean status',
      ].includes(label)
        ? 'git'
        : '/toolchain/node',
      exitCode: 0,
      signal: null,
      timedOut: false,
      interrupted: false,
      validation: 'passed',
      policyViolations: [],
      warningCount: 9,
      stdout:
        label === 'commit SHA'
          ? S
          : label === 'tree SHA'
            ? T
            : label.includes('unit tests')
              ? tap
              : '',
      testCount: null,
      skipCount: 0,
      retryCount: 0,
    };
    if (label.includes('unit tests')) command.testCount = 1;
    if (label === 'Playwright version') command.stdout = 'Version 1.60.0';
    if (label === 'Chromium version') command.stdout = '148.0.7778.96';
    const runner =
      label === 'unit and integration tests'
        ? 'vitest'
        : label === 'end-to-end tests'
          ? 'playwright'
          : null;
    if (runner) {
      const report = {
        schemaVersion: 1,
        invocation: 'test-invocation',
        runner,
        status: 'passed',
        errors: 0,
        expected: 1,
        units: [
          {
            status: 'passed',
            tests: [
              {
                name: 'handles error and warning',
                status: 'passed',
                retries: 0,
              },
            ],
          },
        ],
      };
      const raw = JSON.stringify(report);
      const path = `artifacts/release-evidence/test-invocation-${runner}.json`;
      command.testReport = {
        path,
        invocation: report.invocation,
        sha256: sha256(raw),
        result: report,
      };
      command.testCount = 1;
      command.fileCount = runner === 'vitest' ? 1 : null;
      reports.push([path, raw]);
    }
    return command;
  });
  const manifest = {
    schemaVersion: 3,
    status: 'passed',
    failure: null,
    commitSha: S,
    treeSha: T,
    payloadTreeSha: 'payload',
    lockfileSha256: 'lock',
    os: { platform: 'linux' },
    nodeVersion: current.nodeVersion,
    npmVersion: current.npmVersion,
    playwrightVersion: 'Version 1.60.0',
    browserVersion: '148.0.7778.96',
    startedAt: time,
    endedAt: time,
    githubEvent: {
      sha: S,
      eventName: 'pull_request',
      ref: 'refs/pull/50/merge',
    },
    workflowUrl: `https://github.com/${REPOSITORY}/actions/runs/123`,
    reviewEvidence: { ...current.review, payloadTree: 'payload' },
    commands,
    totals: { commandCount: COMMANDS.length, skipCount: 0, retryCount: 0 },
    certification: {
      certificationContractVersion: 1,
      certificationKind: 'comprehensive',
      repository: REPOSITORY,
      repositoryId: REPOSITORY_ID,
      runId: 123,
      runAttempt: 2,
      job: 'final-candidate',
      workflowRef: `${REPOSITORY}/${WORKFLOW}@refs/pull/50/merge`,
      workflowSha: S,
      checkout: S,
      parents: [B, H],
      pr: {
        number: 50,
        base: B,
        head: H,
        baseRepositoryId: REPOSITORY_ID,
        headRepositoryId: REPOSITORY_ID,
      },
      controls: 'controls',
      arch: 'x64',
      testRunners: current.testRunners,
    },
  };
  const artifact = {
    id: 789,
    name: ARTIFACT,
    expired: false,
    created_at: time,
    workflow_run: {
      id: 123,
      repository_id: REPOSITORY_ID,
      head_repository_id: REPOSITORY_ID,
      head_sha: H,
    },
  };
  const synthetic = {
    sha: S,
    tree: { sha: T },
    parents: [{ sha: B }, { sha: H }],
  };
  const f = {
    current,
    pr,
    run,
    job,
    check,
    manifest,
    artifact,
    synthetic,
    reports,
    linked: [{ number: 50 }],
    calls: [],
  };
  f.api = () => {
    const archive = zip([
      [
        'artifacts/release-evidence/probe-pass-1.json',
        JSON.stringify(manifest),
      ],
      ...f.reports,
    ]);
    artifact.size_in_bytes = archive.length;
    artifact.digest = `sha256:${sha256(archive)}`;
    return githubClient('synthetic', async (url) => {
      const path = url.split(`/repos/${REPOSITORY}/`)[1];
      f.calls.push(path);
      let body;
      if (path.startsWith(`commits/${C}/pulls`)) body = f.linked;
      else if (path === 'pulls/50') body = pr;
      else if (path === 'actions/workflows/test.yml')
        body = { id: 42, path: WORKFLOW, state: 'active' };
      else if (path.startsWith('actions/workflows/42/runs?'))
        body = { total_count: (f.runs ?? [run]).length, workflow_runs: f.runs ?? [run] };
      else if (path === 'actions/runs/123') body = run;
      else if (path.startsWith('actions/runs/123/attempts/2/jobs?'))
        body = { total_count: 1, jobs: [job] };
      else if (path === 'check-runs/456') body = check;
      else if (path.startsWith('actions/runs/123/artifacts?'))
        body = { total_count: 1, artifacts: [artifact] };
      else if (path === 'actions/artifacts/789/zip')
        return new Response(archive);
      else if (path === 'actions/artifacts/789') body = artifact;
      else if (path === `git/commits/${S}`) body = synthetic;
      else throw Error(`Unexpected request ${path}`);
      return new Response(
        JSON.stringify(f.transform ? f.transform(path, body) : body),
      );
    });
  };
  return f;
}

test('actual adapter, ZIP and B evidence accept exact merge, attempt 2 and empty run PR list', async () => {
  const f = fixture();
  const result = await discoverSource(f.api(), f.current);
  assert.equal(result.synthetic, S);
  assert.equal(result.attempt, 2);
  assert.equal(result.pr, 50);
  assert.equal(f.calls.filter((p) => p === 'actions/runs/123').length, 2);
});
const mutations = {
  'complete tree differs': (f) => {
    f.manifest.treeSha = B;
  },
  'synthetic parents differ': (f) => {
    f.synthetic.parents.reverse();
  },
  'zero PR linkage': (f) => {
    f.linked = [];
  },
  'multiple PR linkage': (f) => {
    f.linked = [{ number: 50 }, { number: 50 }];
  },
  'job failed despite green run': (f) => {
    f.job.conclusion = 'failure';
  },
  'mandatory step skipped': (f) => {
    f.job.steps[2].conclusion = 'skipped';
  },
  'wrong run': (f) => {
    f.manifest.certification.runId = 999;
  },
  'wrong attempt': (f) => {
    f.manifest.certification.runAttempt = 1;
  },
  'wrong checkout': (f) => {
    f.manifest.certification.checkout = H;
  },
  'wrong producer': (f) => {
    f.check.app.id = 1;
  },
  'wrong artifact owner': (f) => {
    f.artifact.workflow_run.repository_id = 1;
  },
  'missing A binding': (f) => {
    delete f.manifest.certification;
  },
  'missing B report': (f) => {
    f.reports.pop();
  },
  'missing test count is not zero': (f) => {
    f.manifest.commands[17].testCount = null;
  },
  'real policy violation': (f) => {
    f.manifest.commands[4].policyViolations = ['failed'];
  },
  'null policy outcome': (f) => {
    f.manifest.commands[4].timedOut = null;
  },
  'missing mandatory command': (f) => {
    f.manifest.commands.pop();
  },
  'wrong command invocation': (f) => {
    f.manifest.commands[6].args = ['npm', 'run', 'lint'];
  },
  'TAP skipped': (f) => {
    f.manifest.commands[9].stdout = tap.replace('# skipped 0', '# skipped 1');
  },
  'wrong report digest': (f) => {
    f.manifest.commands[17].testReport.sha256 = '0'.repeat(64);
  },
  'contradictory PR association': (f) => {
    f.run.pull_requests = [{ number: 51 }];
  },
  'material environment drift': (f) => {
    f.current.npmVersion = '12.0.0';
  },
};
for (const [name, mutate] of Object.entries(mutations))
  test(`source rejects ${name}`, async () => {
    const f = fixture();
    mutate(f);
    await assert.rejects(discoverSource(f.api(), f.current));
  });
test('a newer failed source run cannot borrow an older successful run', async () => {
  const f = fixture();
  f.runs = [{ ...f.run, id: 124, conclusion: 'failure' }, f.run];
  await assert.rejects(
    discoverSource(f.api(), f.current),
    /SOURCE_RUN_INVALID/,
  );
});
test('source recheck rejects a newer run or changed artifact after discovery', async () => {
  const f = fixture();
  const api = f.api();
  const source = await discoverSource(api, f.current);
  await recheckSource(api, source);
  f.runs = [{ ...f.run, id: 124, conclusion: 'failure' }, f.run];
  await assert.rejects(recheckSource(api, source), /SOURCE_RACE/);
  f.runs = [f.run];
  f.artifact.digest = `sha256:${'0'.repeat(64)}`;
  await assert.rejects(recheckSource(api, source), /SOURCE_RACE/);
});
test('wrong current merge parents and direct/squash topology cannot reuse', () => {
  const f = fixture();
  f.current.parents.reverse();
  assert.throws(() => selectPr([f.pr], f.current));
});
for (const [name, files, transform] of [
  ['truncation', [['a', 'b']], (b) => b.subarray(0, b.length - 1)],
  [
    'duplicate',
    [
      ['a', 'b'],
      ['a', 'c'],
    ],
    (b) => b,
  ],
  ['traversal', [['../a', 'b']], (b) => b],
  ['absolute', [['/a', 'b']], (b) => b],
  ['backslash', [['a\\b', 'b']], (b) => b],
  [
    'CRC corruption',
    [['a', 'b']],
    (b) => {
      b[14] ^= 1;
      b[b.length - 22 - 47 + 16] ^= 1;
      return b;
    },
  ],
])
  test(`ZIP rejects ${name}`, () => {
    const bytes = transform(zip(files));
    assert.throws(() => readZip(bytes, `sha256:${sha256(bytes)}`));
  });
test('ZIP rejects different actual archive digest', () => {
  assert.throws(() => readZip(zip([['a', 'b']]), `sha256:${'0'.repeat(64)}`));
});

test('source run replaced during lookup cannot attest', async () => {
  const f = fixture();
  let reads = 0;
  f.transform = (path, body) =>
    path === 'actions/runs/123' && ++reads === 2
      ? { ...body, run_attempt: 3 }
      : body;
  await assert.rejects(discoverSource(f.api(), f.current), /SOURCE_RACE/);
});
test('forged API artifact digest cannot authenticate downloaded bytes', async () => {
  const f = fixture();
  f.transform = (path, body) =>
    path.startsWith('actions/runs/123/artifacts?')
      ? {
          ...body,
          artifacts: [
            { ...body.artifacts[0], digest: `sha256:${'0'.repeat(64)}` },
          ],
        }
      : body;
  await assert.rejects(
    discoverSource(f.api(), f.current),
    /SOURCE_ZIP_INVALID/,
  );
});
test('REST errors and malformed bodies fail optional discovery', async () => {
  for (const response of [
    new Response('{}', { status: 503 }),
    new Response('{'),
    new Response(JSON.stringify({ total_count: 2, jobs: [] })),
  ]) {
    const api = githubClient('test', async () => response);
    await assert.rejects(api.list('probe', 'jobs'));
  }
});
const goodAudit = () => ({
  label: 'audit',
  exitCode: 0,
  signal: null,
  timedOut: false,
  interrupted: false,
  stdout: '0 vulnerabilities',
});
for (const error of [new SyntaxError('parser'), new Error('API outage')])
  test(`${error.message}: original full gate exactly once`, async () => {
    const decision = await decideReuse({
      currentCheck: async () => ({}),
      discover: async () => {
        throw error;
      },
      audit: () => {
        throw Error('must not audit');
      },
    });
    let full = 0;
    await executeDecision('enforce', decision, {
      full: () => {
        full++;
      },
      attest: () => assert.fail(),
    });
    assert.equal(full, 1);
  });
test('current policy defect blocks, never hidden by fallback', async () => {
  const result = await decideReuse({
    currentCheck: () => {
      throw new ReuseError('CURRENT_REVIEW_INVALID', 'BLOCK');
    },
  });
  assert.equal(result.decision, 'BLOCK');
  await assert.rejects(
    executeDecision('enforce', result, { full: () => assert.fail() }),
  );
});
test('a real full-operation failure propagates unchanged, never classified as a source miss', async () => {
  const failure = new Error('full certification failed');
  await assert.rejects(
    executeDecision(
      'enforce',
      { decision: 'FULL' },
      {
        full: () => {
          throw failure;
        },
        attest: () => assert.fail(),
      },
    ),
    (error) => error === failure,
  );
});
test('fresh audit vulnerability blocks', async () => {
  const result = await decideReuse({
    currentCheck: () => ({}),
    discover: () => ({}),
    audit: () => ({ ...goodAudit(), exitCode: 1 }),
  });
  assert.equal(result.decision, 'BLOCK');
  assert.equal(result.reason, 'CURRENT_AUDIT_FAILED');
});
test('shadow would-attest still runs full; enforce attestation never invokes full/browser', async () => {
  const decision = await decideReuse({
    currentCheck: () => ({}),
    discover: () => ({}),
    audit: goodAudit,
    recheck: () => {},
  });
  let full = 0,
    attest = 0;
  const operations = {
    full: () => {
      full++;
    },
    attest: () => {
      attest++;
    },
  };
  await executeDecision('shadow', decision, operations);
  assert.deepEqual([full, attest], [1, 0]);
  await executeDecision('enforce', decision, operations);
  assert.deepEqual([full, attest], [1, 1]);
});
test('current ref race yields FULL, checkout corruption yields BLOCK', async () => {
  for (const [reason, decision] of [
    ['CURRENT_MASTER_MOVED', 'FULL'],
    ['CURRENT_CHECKOUT_CHANGED', 'BLOCK'],
  ]) {
    const result = await decideReuse({
      currentCheck: () => ({}),
      discover: () => ({}),
      audit: goodAudit,
      recheck: () => {
        throw new ReuseError(reason, decision);
      },
    });
    assert.equal(result.decision, decision);
    assert.equal(result.reason, reason);
  }
});
test('shadow shell handles entrypoint failure and retains one unconditional native gate', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/test.yml', import.meta.url),
    'utf8',
  );
  assert.equal((workflow.match(/name: Final candidate/g) || []).length, 1);
  assert.match(workflow, /^\s+fetch-depth: 2$/m);
  assert.equal((workflow.match(/npm run verify:release/g) || []).length, 1);
  assert.match(
    workflow,
    /if timeout 150s node scripts\/run-release-reuse.mjs; then/,
  );
  assert.doesNotMatch(workflow, /continue-on-error/);
  assert.match(
    workflow,
    /else\s+echo 'Reuse shadow: FULL \/ VERIFIER_UNAVAILABLE/,
  );
  for (const name of [
    'Install locked dependencies',
    'Install Chromium',
    'Run immutable release gate',
  ]) {
    const step = workflow.split(`- name: ${name}`)[1].split('\n      - ')[0];
    assert.doesNotMatch(step, /\bif:/);
  }
  const shell =
    process.platform === 'win32'
      ? `${process.env.ProgramFiles}/Git/bin/bash.exe`
      : 'bash';
  const guardedStep = workflow
    .split('        run: |\n')[1]
    .split('\n      - ')[0]
    .split('\n')
    .map((line) => line.slice(10))
    .join('\n');
  for (const exit of [0, 1, 124, 127]) {
    const probe = spawnSync(
      shell,
      [
        '--noprofile',
        '--norc',
        '-e',
        '-c',
        `timeout() { return ${exit}; }\n${guardedStep}\nprintf 'FULL_GATE_ONCE\\n'\n`,
      ],
      { encoding: 'utf8', windowsHide: true, timeout: 10_000 },
    );
    assert.equal(probe.status, 0, probe.stderr);
    assert.equal(probe.stdout.split('FULL_GATE_ONCE').length - 1, 1);
  }
});
