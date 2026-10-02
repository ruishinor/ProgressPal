import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Candidate-bound release review evidence.
//
// A review is applicable to a candidate only when it names the candidate's
// "payload tree": the candidate's root git tree with the evidence directory
// removed. The evidence directory is the one place a review file may live, so
// adding, removing, or editing review files never changes the payload tree it
// is judged against (no self-reference), while every other byte of the
// candidate does. Anything stored under the evidence directory escapes the
// binding, so the directory may hold nothing but strictly validated JSON.

export const REVIEW_EVIDENCE_DIRECTORY = 'docs/release-reviews';
export const REVIEW_SCHEMA_VERSION = 2;

const TREE_ID = /^[0-9a-f]{40}$/;
const MODULE_ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
const SEVERITIES = ['P0', 'P1', 'P2', 'P3'];
const FINDING_STATUSES = ['resolved', 'accepted-risk', 'open'];
const DECISIONS = ['proceed', 'reject'];
const EVIDENCE_KEYS = [
  'schemaVersion',
  'module',
  'reviewer',
  'binding',
  'reviewScope',
  'adversarialFindings',
  'retrospective',
];
const BINDING_KEYS = ['kind', 'payloadTree', 'excludedPath'];
const FINDING_KEYS = ['id', 'severity', 'description', 'resolution', 'status'];
const SCOPE_KEYS = ['summary', 'evidence'];
const RETROSPECTIVE_KEYS = ['decision', 'summary'];

function git(args, { cwd, env } = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new Error(`${label} has unexpected field "${key}".`);
    }
  }
}

function requireText(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

/**
 * The tree object id of `treeish`'s root tree with the evidence directory
 * removed. Computed in a throwaway index so neither the worktree nor the real
 * index is touched; the resulting tree objects are unreferenced and harmless.
 */
export function payloadTree({ cwd, treeish = 'HEAD' }) {
  const scratch = mkdtempSync(join(tmpdir(), 'progresspal-payload-'));
  const env = { GIT_INDEX_FILE: join(scratch, 'index') };

  try {
    git(['read-tree', `${treeish}^{tree}`], { cwd, env });
    git(
      [
        'rm',
        '--cached',
        '-r',
        '-q',
        '-f',
        '--ignore-unmatch',
        '--',
        REVIEW_EVIDENCE_DIRECTORY,
      ],
      { cwd, env },
    );
    return git(['write-tree'], { cwd, env }).trim();
  } finally {
    rmSync(scratch, { force: true, recursive: true });
  }
}

/**
 * Every entry stored under the evidence directory at `treeish`, read from git
 * objects so that the result is the committed candidate, not the worktree.
 * Anything other than a regular `<module>.json` file directly inside the
 * directory is rejected because it would escape review.
 */
export function readEvidenceFiles({ cwd, treeish = 'HEAD' }) {
  const listing = git(
    [
      'ls-tree',
      '-r',
      '-z',
      '--full-tree',
      treeish,
      '--',
      REVIEW_EVIDENCE_DIRECTORY,
    ],
    { cwd },
  );
  const files = [];

  for (const record of listing.split('\0').filter((line) => line.length > 0)) {
    const match = /^(\d{6}) (\w+) ([0-9a-f]{40})\t(.+)$/s.exec(record);
    if (match === null) {
      throw new Error(`Unreadable evidence directory entry: ${record}`);
    }
    const [, mode, type, objectId, path] = match;
    const name = path.slice(REVIEW_EVIDENCE_DIRECTORY.length + 1);

    if (
      mode !== '100644' ||
      type !== 'blob' ||
      !path.startsWith(`${REVIEW_EVIDENCE_DIRECTORY}/`) ||
      !/^[a-z0-9][a-z0-9-]*\.json$/.test(name)
    ) {
      throw new Error(
        `${REVIEW_EVIDENCE_DIRECTORY} may contain only regular <module>.json review files; found ${type} ${mode} "${path}".`,
      );
    }

    const content = execFileSync('git', ['cat-file', 'blob', objectId], {
      cwd,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    files.push({ content, path });
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function validateFindings(findings, decision) {
  if (!Array.isArray(findings) || findings.length === 0) {
    throw new Error('Release review evidence requires adversarial findings.');
  }

  for (const finding of findings) {
    if (!isPlainObject(finding)) {
      throw new Error('Every adversarial finding must be an object.');
    }
    requireKeys(finding, FINDING_KEYS, 'Adversarial finding');
    requireText(finding.id, 'Finding id');
    requireText(finding.description, 'Finding description');
    requireText(finding.resolution, 'Finding resolution');
    if (
      !SEVERITIES.includes(finding.severity) ||
      !FINDING_STATUSES.includes(finding.status)
    ) {
      throw new Error(
        'Every adversarial finding requires a P0-P3 severity and a resolved, accepted-risk, or open status.',
      );
    }
    if (decision === 'proceed') {
      if (finding.status === 'open') {
        throw new Error('A proceed review may not leave findings open.');
      }
      if (
        ['P0', 'P1'].includes(finding.severity) &&
        finding.status !== 'resolved'
      ) {
        throw new Error('P0 and P1 findings must be resolved before release.');
      }
    }
  }
}

export function validateReviewEvidence(value) {
  if (!isPlainObject(value)) {
    throw new Error('Release review evidence must be a JSON object.');
  }
  if (value.schemaVersion !== REVIEW_SCHEMA_VERSION) {
    throw new Error(
      `Release review evidence schemaVersion must be ${REVIEW_SCHEMA_VERSION}; unbound schema ${String(value.schemaVersion)} evidence cannot certify a candidate.`,
    );
  }
  requireKeys(value, EVIDENCE_KEYS, 'Release review evidence');

  if (typeof value.module !== 'string' || !MODULE_ID.test(value.module)) {
    throw new Error(
      'Release review evidence module must be a lowercase kebab-case identifier.',
    );
  }
  const reviewer = requireText(value.reviewer, 'Release review reviewer');

  if (!isPlainObject(value.binding)) {
    throw new Error('Release review evidence requires a binding object.');
  }
  requireKeys(value.binding, BINDING_KEYS, 'Release review binding');
  if (value.binding.kind !== 'payload-tree') {
    throw new Error('Release review binding kind must be "payload-tree".');
  }
  if (
    typeof value.binding.payloadTree !== 'string' ||
    !TREE_ID.test(value.binding.payloadTree)
  ) {
    throw new Error(
      'Release review binding payloadTree must be a 40-character lowercase hexadecimal tree id.',
    );
  }
  if (value.binding.excludedPath !== REVIEW_EVIDENCE_DIRECTORY) {
    throw new Error(
      `Release review binding excludedPath must be "${REVIEW_EVIDENCE_DIRECTORY}".`,
    );
  }

  if (value.reviewScope !== undefined) {
    if (!isPlainObject(value.reviewScope)) {
      throw new Error('Release review scope must be an object.');
    }
    requireKeys(value.reviewScope, SCOPE_KEYS, 'Release review scope');
    if (value.reviewScope.summary !== undefined) {
      requireText(value.reviewScope.summary, 'Release review scope summary');
    }
    if (
      value.reviewScope.evidence !== undefined &&
      (!Array.isArray(value.reviewScope.evidence) ||
        value.reviewScope.evidence.some(
          (entry) => typeof entry !== 'string' || entry.trim().length === 0,
        ))
    ) {
      throw new Error(
        'Release review scope evidence must be a list of non-empty strings.',
      );
    }
  }

  if (!isPlainObject(value.retrospective)) {
    throw new Error('Release review evidence requires a retrospective.');
  }
  requireKeys(
    value.retrospective,
    RETROSPECTIVE_KEYS,
    'Release review retrospective',
  );
  if (!DECISIONS.includes(value.retrospective.decision)) {
    throw new Error(
      'Release review retrospective decision must be proceed or reject.',
    );
  }
  requireText(value.retrospective.summary, 'Release review summary');
  validateFindings(value.adversarialFindings, value.retrospective.decision);

  return {
    adversarialFindings: value.adversarialFindings,
    decision: value.retrospective.decision,
    module: value.module,
    payloadTree: value.binding.payloadTree,
    retrospective: value.retrospective,
    reviewer,
  };
}

/**
 * Select the review evidence applicable to a candidate, or throw.
 *
 * Fails closed: a malformed or misnamed file anywhere in the directory fails
 * the resolution (stale-but-valid files for other payload trees are expected
 * history and are simply not applicable), no applicable file fails it, and a
 * recorded rejection of this exact payload tree fails it even if another file
 * for the same tree says proceed.
 */
export function resolveReviewEvidence({ candidatePayloadTree, files }) {
  if (!TREE_ID.test(candidatePayloadTree ?? '')) {
    throw new Error('A candidate payload tree id is required.');
  }

  const considered = files.map(({ content, path }) => {
    let evidence;
    try {
      evidence = validateReviewEvidence(JSON.parse(content.toString('utf8')));
    } catch (error) {
      throw new Error(`${path}: ${error.message}`, { cause: error });
    }
    if (path !== `${REVIEW_EVIDENCE_DIRECTORY}/${evidence.module}.json`) {
      throw new Error(
        `${path}: file name must be ${evidence.module}.json to match its module.`,
      );
    }
    return {
      ...evidence,
      path,
      sha256: createHash('sha256').update(content).digest('hex'),
    };
  });
  const bound = considered.filter(
    (entry) => entry.payloadTree === candidatePayloadTree,
  );

  if (bound.length === 0) {
    const listing =
      considered.length === 0
        ? 'The evidence directory contains no review files.'
        : `Considered: ${considered.map((entry) => `${entry.path} -> ${entry.payloadTree}`).join('; ')}.`;
    throw new Error(
      `No release review evidence is bound to candidate payload tree ${candidatePayloadTree}. ${listing} A review applies only to the exact payload tree it names.`,
    );
  }
  const rejected = bound.find((entry) => entry.decision === 'reject');
  if (rejected !== undefined) {
    throw new Error(
      `${rejected.path} records a rejection of candidate payload tree ${candidatePayloadTree}.`,
    );
  }

  return {
    applicable: bound.map(({ module, path, sha256 }) => ({
      module,
      path,
      sha256,
    })),
    considered: considered.map(({ decision, path, payloadTree: tree }) => ({
      decision,
      path,
      payloadTree: tree,
    })),
    selected: bound[0],
  };
}
