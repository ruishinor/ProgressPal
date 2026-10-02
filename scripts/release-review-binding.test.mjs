import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  REVIEW_EVIDENCE_DIRECTORY,
  payloadTree,
  readEvidenceFiles,
  resolveReviewEvidence,
  validateReviewEvidence,
} from './release-review-binding.mjs';

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const IDENTITY = {
  GIT_AUTHOR_EMAIL: 'review-binding@example.test',
  GIT_AUTHOR_NAME: 'Review Binding Test',
  GIT_COMMITTER_EMAIL: 'review-binding@example.test',
  GIT_COMMITTER_NAME: 'Review Binding Test',
};
const NEVER_A_TREE = 'a'.repeat(40);

function git(cwd, args) {
  return execFileSync(
    'git',
    ['-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args],
    {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, ...IDENTITY },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  ).trim();
}

function createRepository() {
  const directory = mkdtempSync(join(tmpdir(), 'progresspal-binding-'));
  git(directory, ['init', '-q', '-b', 'master']);

  return {
    directory,
    cleanup: () => rmSync(directory, { force: true, recursive: true }),
    commit(changes, message = 'change') {
      for (const [path, content] of Object.entries(changes)) {
        const target = join(directory, path);
        if (content === null) {
          rmSync(target, { force: true });
        } else {
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, content);
        }
      }
      git(directory, ['add', '-A']);
      git(directory, ['commit', '-q', '--allow-empty', '-m', message]);
      return git(directory, ['rev-parse', 'HEAD']);
    },
  };
}

function review({ module = 'candidate-one', tree, decision = 'proceed' } = {}) {
  return {
    schemaVersion: 2,
    module,
    reviewer: 'Independent reviewer',
    binding: {
      kind: 'payload-tree',
      payloadTree: tree,
      excludedPath: REVIEW_EVIDENCE_DIRECTORY,
    },
    reviewScope: { summary: 'Exact candidate.', evidence: ['gate run'] },
    adversarialFindings: [
      {
        id: 'F-1',
        severity: 'P1',
        description: 'A concrete defect.',
        resolution: 'Repaired.',
        status: decision === 'proceed' ? 'resolved' : 'open',
      },
    ],
    retrospective: { decision, summary: 'Reviewed the exact candidate.' },
  };
}

function evidenceChange(evidence) {
  return {
    [`${REVIEW_EVIDENCE_DIRECTORY}/${evidence.module}.json`]: `${JSON.stringify(evidence, null, 2)}\n`,
  };
}

function resolveAt(repository, treeish = 'HEAD') {
  return resolveReviewEvidence({
    candidatePayloadTree: payloadTree({
      cwd: repository.directory,
      treeish,
    }),
    files: readEvidenceFiles({ cwd: repository.directory, treeish }),
  });
}

async function withRepository(callback) {
  const repository = createRepository();
  try {
    await callback(repository);
  } finally {
    repository.cleanup();
  }
}

test('the payload tree is the root tree until an evidence directory exists', async () => {
  await withRepository((repository) => {
    const commit = repository.commit({ 'src/a.txt': 'a' });

    assert.equal(
      payloadTree({ cwd: repository.directory }),
      git(repository.directory, ['rev-parse', `${commit}^{tree}`]),
    );
  });
});

test('adding review evidence does not change the payload it is judged against', async () => {
  await withRepository((repository) => {
    const candidate = repository.commit({ 'src/a.txt': 'a' });
    const reviewed = payloadTree({ cwd: repository.directory });
    const successor = repository.commit(
      evidenceChange(review({ tree: reviewed })),
      'evidence only',
    );

    assert.equal(
      payloadTree({ cwd: repository.directory, treeish: successor }),
      reviewed,
    );
    assert.notEqual(
      git(repository.directory, ['rev-parse', `${successor}^{tree}`]),
      git(repository.directory, ['rev-parse', `${candidate}^{tree}`]),
    );
  });
});

test('evidence bound to the exact payload tree is selected', async () => {
  await withRepository((repository) => {
    repository.commit({ 'src/a.txt': 'a' });
    const reviewed = payloadTree({ cwd: repository.directory });
    repository.commit(evidenceChange(review({ tree: reviewed })));

    const resolution = resolveAt(repository);
    assert.equal(resolution.selected.module, 'candidate-one');
    assert.equal(resolution.selected.payloadTree, reviewed);
    assert.match(resolution.selected.sha256, /^[0-9a-f]{64}$/);
  });
});

test('stale evidence is rejected once the candidate payload moves on', async () => {
  await withRepository((repository) => {
    repository.commit({ 'src/a.txt': 'a' });
    const reviewed = payloadTree({ cwd: repository.directory });
    repository.commit(evidenceChange(review({ tree: reviewed })));
    resolveAt(repository);

    repository.commit({ 'src/a.txt': 'changed after review' });
    assert.throws(
      () => resolveAt(repository),
      /No release review evidence is bound to candidate payload tree/,
    );
  });
});

test('a tree the candidate never had is rejected', async () => {
  await withRepository((repository) => {
    repository.commit({
      'src/a.txt': 'a',
      ...evidenceChange(review({ tree: NEVER_A_TREE })),
    });

    assert.throws(() => resolveAt(repository), /No release review evidence/);
  });
});

test('every post-review change outside the evidence directory invalidates the review', async () => {
  const mutations = {
    'modified product file': { 'src/a.txt': 'tampered' },
    'added product file': { 'src/new.txt': 'new' },
    'deleted product file': { 'src/a.txt': null },
    'modified gate script': { 'scripts/gate.mjs': 'weakened' },
    'modified workflow': { '.github/workflows/test.yml': 'changed' },
    'added documentation': { 'docs/note.md': 'note' },
    'evidence-like file outside the directory': {
      'docs/release-review.json': '{}',
    },
  };

  for (const [name, change] of Object.entries(mutations)) {
    await withRepository((repository) => {
      repository.commit({
        'src/a.txt': 'a',
        'scripts/gate.mjs': 'gate',
        '.github/workflows/test.yml': 'workflow',
      });
      const reviewed = payloadTree({ cwd: repository.directory });
      repository.commit(evidenceChange(review({ tree: reviewed })));
      resolveAt(repository);

      repository.commit(change, name);
      assert.throws(
        () => resolveAt(repository),
        /No release review evidence/,
        name,
      );
    });
  }
});

test('malformed or missing binding fields are rejected', () => {
  const valid = review({ tree: 'b'.repeat(40) });
  const mutations = {
    'missing binding': { binding: undefined },
    'binding is not an object': { binding: 'tree' },
    'wrong binding kind': { binding: { ...valid.binding, kind: 'commit' } },
    'missing tree': {
      binding: {
        kind: 'payload-tree',
        excludedPath: REVIEW_EVIDENCE_DIRECTORY,
      },
    },
    'short tree': { binding: { ...valid.binding, payloadTree: 'abc123' } },
    'uppercase tree': {
      binding: { ...valid.binding, payloadTree: 'B'.repeat(40) },
    },
    'non-string tree': { binding: { ...valid.binding, payloadTree: 7 } },
    'different excluded path': {
      binding: { ...valid.binding, excludedPath: 'docs' },
    },
    'extra binding field': { binding: { ...valid.binding, commit: 'abc' } },
    'extra top-level field': { smuggled: true },
    'missing module': { module: undefined },
    'unsafe module': { module: '../escape' },
    'blank reviewer': { reviewer: '   ' },
    'no findings': { adversarialFindings: [] },
    'unknown decision': {
      retrospective: { decision: 'maybe', summary: 'unsure' },
    },
    'missing summary': { retrospective: { decision: 'proceed' } },
  };

  assert.equal(validateReviewEvidence(valid).payloadTree, 'b'.repeat(40));
  for (const [name, change] of Object.entries(mutations)) {
    assert.throws(
      () => validateReviewEvidence({ ...valid, ...change }),
      Error,
      name,
    );
  }
});

test('a proceed review needs resolved P0/P1 findings and no open findings', () => {
  const valid = review({ tree: 'b'.repeat(40) });
  const finding = valid.adversarialFindings[0];

  assert.throws(
    () =>
      validateReviewEvidence({
        ...valid,
        adversarialFindings: [{ ...finding, status: 'accepted-risk' }],
      }),
    /P0 and P1 findings must be resolved/,
  );
  assert.throws(
    () =>
      validateReviewEvidence({
        ...valid,
        adversarialFindings: [{ ...finding, severity: 'P3', status: 'open' }],
      }),
    /may not leave findings open/,
  );
  assert.doesNotThrow(() =>
    validateReviewEvidence({
      ...valid,
      adversarialFindings: [
        { ...finding, severity: 'P3', status: 'accepted-risk' },
      ],
    }),
  );
});

test('the legacy unbound review format cannot certify a candidate', () => {
  const legacy = {
    schemaVersion: 1,
    module: 'rpg-primary-final-candidate',
    reviewer: 'AI-assisted engineering review',
    reviewScope: {
      certifiedRuntimeBaseCommit: '770c1c08f9d8c282bc60a4de8b3ac95666047dbe',
      binding: 'Prose describing a base commit.',
    },
    adversarialFindings: review({ tree: NEVER_A_TREE }).adversarialFindings,
    retrospective: { decision: 'proceed', summary: 'Proceed.' },
  };

  assert.throws(
    () => validateReviewEvidence(legacy),
    /unbound schema 1 evidence cannot certify/,
  );
});

test('a merge that keeps the reviewed tree carries the review forward, one that changes it does not', async () => {
  await withRepository((repository) => {
    repository.commit({ 'src/a.txt': 'a', 'src/b.txt': 'b' }, 'base');
    git(repository.directory, ['switch', '-q', '-c', 'feature']);
    repository.commit({ 'src/a.txt': 'feature work' }, 'feature');
    const reviewed = payloadTree({ cwd: repository.directory });
    repository.commit(evidenceChange(review({ tree: reviewed })), 'evidence');

    // Master has not moved: the merge commit has a new SHA but the same tree.
    git(repository.directory, ['switch', '-q', 'master']);
    git(repository.directory, ['switch', '-q', '-c', 'untouched-master']);
    git(repository.directory, [
      'merge',
      '--no-ff',
      '-q',
      '-m',
      'merge feature',
      'feature',
    ]);
    assert.equal(
      git(repository.directory, ['rev-parse', 'HEAD^{tree}']),
      git(repository.directory, ['rev-parse', 'feature^{tree}']),
    );
    assert.equal(resolveAt(repository).selected.payloadTree, reviewed);

    // Master advanced elsewhere first: the merge result is a different tree.
    git(repository.directory, ['switch', '-q', 'master']);
    repository.commit({ 'src/b.txt': 'unreviewed advance' }, 'master advances');
    git(repository.directory, [
      'merge',
      '--no-ff',
      '-q',
      '-m',
      'merge feature after advance',
      'feature',
    ]);
    assert.throws(() => resolveAt(repository), /No release review evidence/);
  });
});

test('a recorded rejection of the exact payload blocks certification', async () => {
  await withRepository((repository) => {
    repository.commit({ 'src/a.txt': 'a' });
    const reviewed = payloadTree({ cwd: repository.directory });
    repository.commit({
      ...evidenceChange(review({ tree: reviewed })),
      ...evidenceChange(
        review({
          module: 'candidate-rejected',
          tree: reviewed,
          decision: 'reject',
        }),
      ),
    });

    assert.throws(
      () => resolveAt(repository),
      /candidate-rejected\.json records a rejection/,
    );
  });
});

test('a rejection of a different payload does not block an unrelated candidate', async () => {
  await withRepository((repository) => {
    repository.commit({ 'src/a.txt': 'a' });
    const reviewed = payloadTree({ cwd: repository.directory });
    repository.commit({
      ...evidenceChange(review({ tree: reviewed })),
      ...evidenceChange(
        review({
          module: 'older-rejected',
          tree: 'c'.repeat(40),
          decision: 'reject',
        }),
      ),
    });

    assert.equal(resolveAt(repository).applicable.length, 1);
  });
});

test('the evidence directory may hold nothing that escapes review', async () => {
  const strays = {
    'a prose file': { [`${REVIEW_EVIDENCE_DIRECTORY}/README.md`]: 'notes' },
    'a script': { [`${REVIEW_EVIDENCE_DIRECTORY}/hook.js`]: 'run()' },
    'a nested directory': {
      [`${REVIEW_EVIDENCE_DIRECTORY}/nested/inner.json`]: '{}',
    },
    'an uppercase name': { [`${REVIEW_EVIDENCE_DIRECTORY}/Upper.json`]: '{}' },
  };

  for (const [name, change] of Object.entries(strays)) {
    await withRepository((repository) => {
      repository.commit({ 'src/a.txt': 'a', ...change });
      assert.throws(
        () => readEvidenceFiles({ cwd: repository.directory }),
        /may contain only regular <module>\.json review files/,
        name,
      );
    });
  }

  await withRepository((repository) => {
    repository.commit({ 'src/a.txt': 'a' });
    const blob = git(repository.directory, ['rev-parse', 'HEAD:src/a.txt']);
    git(repository.directory, [
      'update-index',
      '--add',
      '--cacheinfo',
      `120000,${blob},${REVIEW_EVIDENCE_DIRECTORY}/link.json`,
    ]);
    git(repository.directory, ['commit', '-q', '-m', 'symlink entry']);
    assert.throws(
      () => readEvidenceFiles({ cwd: repository.directory }),
      /may contain only regular/,
      'a symlink entry',
    );
  });
});

test('a malformed or misnamed evidence file fails the whole resolution', async () => {
  await withRepository((repository) => {
    repository.commit({ 'src/a.txt': 'a' });
    const reviewed = payloadTree({ cwd: repository.directory });
    repository.commit({
      ...evidenceChange(review({ tree: reviewed })),
      [`${REVIEW_EVIDENCE_DIRECTORY}/broken.json`]: '{ not json',
    });
    assert.throws(() => resolveAt(repository), /broken\.json/);
  });

  await withRepository((repository) => {
    repository.commit({ 'src/a.txt': 'a' });
    const reviewed = payloadTree({ cwd: repository.directory });
    repository.commit({
      [`${REVIEW_EVIDENCE_DIRECTORY}/other-name.json`]: `${JSON.stringify(review({ tree: reviewed }))}\n`,
    });
    assert.throws(() => resolveAt(repository), /file name must be/);
  });
});

test('resolution works on a candidate without any evidence directory', async () => {
  await withRepository((repository) => {
    repository.commit({ 'src/a.txt': 'a' });
    assert.throws(
      () => resolveAt(repository),
      /The evidence directory contains no review files/,
    );
  });
});

// The real runner, copied into a throwaway repository, must stop before it
// executes any gate step when no review applies to the candidate.
function runRunner(repository, extraEnvironment = {}) {
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) {
    if (/^(RELEASE_|GITHUB_|npm_execpath$)/i.test(key)) {
      delete environment[key];
    }
  }
  const outcome = spawnSync(
    process.execPath,
    ['scripts/run-release-gate.mjs'],
    {
      cwd: repository.directory,
      encoding: 'utf8',
      env: { ...environment, ...extraEnvironment },
      timeout: 60_000,
    },
  );
  const manifestDirectory = join(
    repository.directory,
    'artifacts',
    'release-evidence',
  );
  const [manifestName] = readdirSync(manifestDirectory);
  return {
    exitCode: outcome.status,
    manifest: JSON.parse(
      readFileSync(join(manifestDirectory, manifestName), 'utf8'),
    ),
  };
}

function createRunnerRepository() {
  const repository = createRepository();
  for (const name of [
    'run-release-gate.mjs',
    'release-gate-utils.mjs',
    'release-review-binding.mjs',
  ]) {
    mkdirSync(join(repository.directory, 'scripts'), { recursive: true });
    copyFileSync(
      join(SCRIPTS, name),
      join(repository.directory, 'scripts', name),
    );
  }
  repository.commit({
    'package.json': '{ "name": "fixture", "version": "1.0.0" }\n',
    'package-lock.json':
      '{ "version": "1.0.0", "packages": { "": { "version": "1.0.0" } } }\n',
    'src/a.txt': 'a',
  });
  // Artifacts are written inside the repository; keep the tree clean.
  repository.commit({ '.gitignore': 'artifacts/\n' });
  return repository;
}

test('the runner fails closed before any gate step when no review applies', async () => {
  const repository = createRunnerRepository();
  try {
    const { exitCode, manifest } = runRunner(repository);

    assert.equal(exitCode, 1);
    assert.equal(manifest.status, 'failed');
    assert.match(manifest.failure, /No release review evidence is bound/);
    assert.deepEqual(
      manifest.commands.map((command) => command.label),
      ['commit SHA', 'tree SHA'],
    );
    assert.match(manifest.payloadTreeSha, /^[0-9a-f]{40}$/);
    assert.equal(manifest.reviewEvidence, null);
  } finally {
    repository.cleanup();
  }
});

test('the runner rejects the legacy review-file selection instead of ignoring it', async () => {
  const repository = createRunnerRepository();
  try {
    const { exitCode, manifest } = runRunner(repository, {
      RELEASE_REVIEW_FILE: 'docs/remediation/old-review.json',
    });

    assert.equal(exitCode, 1);
    assert.match(manifest.failure, /no longer supported/);
    assert.deepEqual(manifest.commands, []);
  } finally {
    repository.cleanup();
  }
});

test('the runner refuses a checkout that is not the GitHub event commit', async () => {
  const repository = createRunnerRepository();
  try {
    const { exitCode, manifest } = runRunner(repository, {
      GITHUB_SHA: NEVER_A_TREE,
    });

    assert.equal(exitCode, 1);
    assert.match(manifest.failure, /is not the GitHub event commit/);
    assert.equal(manifest.reviewEvidence, null);
  } finally {
    repository.cleanup();
  }
});

test('positive control: bound evidence is accepted and the runner proceeds past review', async () => {
  const repository = createRunnerRepository();
  try {
    const reviewed = payloadTree({ cwd: repository.directory });
    repository.commit(evidenceChange(review({ tree: reviewed })), 'evidence');
    const { manifest } = runRunner(repository);

    assert.equal(manifest.reviewEvidence.module, 'candidate-one');
    assert.equal(manifest.module, 'candidate-one');
    assert.equal(manifest.payloadTreeSha, reviewed);
    // With no npm launcher the run stops at the first npm step, which is
    // after review resolution, proving review no longer blocks the gate.
    assert.match(manifest.failure, /launched through npm run verify:release/);
  } finally {
    repository.cleanup();
  }
});

test('the runner refuses a requested module that the bound review does not name', async () => {
  const repository = createRunnerRepository();
  try {
    const reviewed = payloadTree({ cwd: repository.directory });
    repository.commit(evidenceChange(review({ tree: reviewed })), 'evidence');
    const { manifest } = runRunner(repository, {
      RELEASE_MODULE: 'some-other-module',
    });

    assert.match(manifest.failure, /does not match the bound review module/);
  } finally {
    repository.cleanup();
  }
});

test('the runner resolves review evidence before it executes the install or any suite', async () => {
  const source = readFileSync(join(SCRIPTS, 'run-release-gate.mjs'), 'utf8');
  const resolution = source.indexOf('resolveReviewEvidence({');
  const cleanInstall = source.indexOf("label: 'clean dependency install'");

  assert.notEqual(resolution, -1);
  assert.notEqual(cleanInstall, -1);
  assert.ok(resolution < cleanInstall);
  assert.equal(source.includes('RELEASE_REVIEWER'), false);
});
