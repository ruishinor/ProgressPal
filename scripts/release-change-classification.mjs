import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lightweightUiCopyPathSet } from './ui-copy-change-policy.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const COPY_PATH = 'src/ui-copy/interface.json';

function runGit(...args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
  }).trimEnd();
}

export function classifyPaths(entries) {
  if (
    entries.length === 1 &&
    entries[0].status === 'M' &&
    entries[0].path === 'LICENSE'
  ) {
    return 'METADATA';
  }
  if (
    entries.length === 1 &&
    entries[0].status === 'M' &&
    entries[0].path === COPY_PATH
  ) {
    return 'COPY';
  }
  return 'FULL';
}

export function compareCopy(baseText, candidateText) {
  const parse = (text) => {
    const value = JSON.parse(text);
    if (value === null || Array.isArray(value) || typeof value !== 'object') {
      throw new Error('UI copy root must be an object.');
    }
    return value;
  };
  const flatten = (value, prefix = '', result = {}) => {
    for (const [key, item] of Object.entries(value)) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
        throw new Error(`Invalid copy key: ${prefix}${key}`);
      }
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof item === 'string') {
        if (
          item.trim().length === 0 ||
          item.length > 1500 ||
          /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(item)
        ) {
          throw new Error(`Invalid plain-text content: ${path}`);
        }
        result[path] = item;
      } else if (item && typeof item === 'object' && !Array.isArray(item)) {
        flatten(item, path, result);
      } else {
        throw new Error(`Invalid copy type: ${path}`);
      }
    }
    return result;
  };
  const oldValues = flatten(parse(baseText));
  const newValues = flatten(parse(candidateText));
  const keysA = Object.keys(oldValues).sort();
  const keysB = Object.keys(newValues).sort();
  if (keysA.length === 0 || JSON.stringify(keysA) !== JSON.stringify(keysB)) {
    throw new Error('Copy key structure changed.');
  }
  const tokens = (text) =>
    [...text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map((m) => m[1]).sort();
  for (const key of keysA) {
    if (
      JSON.stringify(tokens(oldValues[key])) !==
      JSON.stringify(tokens(newValues[key]))
    ) {
      throw new Error(`Copy placeholder signature changed: ${key}`);
    }
  }
  return keysA.length;
}

// Structural and placeholder checks always run first. A copy-only release
// is authorized only when EVERY changed leaf is explicitly approved. This
// protects privacy, data-loss, recovery, and progress semantics from being
// changed through the lightweight path, even though they share one JSON file.
export function compareLightweightCopy(baseText, candidateText) {
  const keyCount = compareCopy(baseText, candidateText);
  const base = JSON.parse(baseText);
  const candidate = JSON.parse(candidateText);
  const changed = [];
  const visit = (left, right, prefix = '') => {
    for (const key of Object.keys(left)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof left[key] === 'string') {
        if (left[key] !== right[key]) {
          changed.push(path);
          if (!lightweightUiCopyPathSet.has(path)) {
            throw new Error(`COPY_KEY_REQUIRES_FULL: ${path}`);
          }
        }
      } else {
        visit(left[key], right[key], path);
      }
    }
  };
  visit(base, candidate);
  return { keyCount, changed };
}

function gitEntries(parent) {
  const output = execFileSync(
    'git',
    [
      'diff-tree',
      '--no-commit-id',
      '--name-status',
      '-r',
      '-z',
      parent,
      'HEAD',
    ],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    },
  );
  const values = output.split('\0');
  if (values.at(-1) === '') values.pop();
  const entries = [];
  for (let i = 0; i < values.length; ) {
    const status = values[i++];
    const path = values[i++];
    if (!status || !path) throw new Error('Malformed git diff-tree output.');
    if (/^[RC]/.test(status)) {
      i += 1; // extra path for rename/copy; category must remain FULL
    }
    entries.push({ status, path });
  }
  return entries;
}

function modeFor(tree, path) {
  const entry = runGit('ls-tree', tree, '--', path);
  return entry.match(/^(\d{6}) blob [a-f0-9]{40}\t/)?.[1] ?? null;
}

export function classifyGitCandidate(env = process.env) {
  const head = runGit('rev-parse', 'HEAD');
  if (
    env.GITHUB_SHA !== head ||
    env.GITHUB_REPOSITORY !== 'ruishinor/ProgressPal'
  ) {
    return { category: 'FULL', reason: 'IDENTITY_UNVERIFIED', head };
  }
  const isPr =
    env.GITHUB_EVENT_NAME === 'pull_request' &&
    env.GITHUB_BASE_REF === 'master';
  const isMasterPush =
    env.GITHUB_EVENT_NAME === 'push' && env.GITHUB_REF === 'refs/heads/master';
  if (!isPr && !isMasterPush) {
    return { category: 'FULL', reason: 'EVENT_UNSUPPORTED', head };
  }
  const parents = runGit('show', '-s', '--format=%P', 'HEAD')
    .split(/\s+/)
    .filter(Boolean);
  if (parents.length !== 2) {
    return { category: 'FULL', reason: 'TOPOLOGY_UNSUPPORTED', head };
  }
  const [base] = parents;
  const entries = gitEntries(base);
  let category = classifyPaths(entries);
  let reason = 'ONLY_ALLOWLISTED_FILE_MODIFIED';
  const target = category === 'METADATA' ? 'LICENSE' : COPY_PATH;
  if (
    category !== 'FULL' &&
    (modeFor('HEAD', target) !== '100644' || modeFor(base, target) !== '100644')
  ) {
    category = 'FULL';
    reason = 'FILE_MODE_UNSUPPORTED';
  }
  if (category === 'COPY') {
    try {
      compareLightweightCopy(
        runGit('show', `${base}:${COPY_PATH}`),
        runGit('show', `HEAD:${COPY_PATH}`),
      );
    } catch (error) {
      category = 'FULL';
      reason = error.message.startsWith('COPY_KEY_REQUIRES_FULL:')
        ? error.message
        : `COPY_STRUCTURE_INVALID: ${error.message}`;
    }
  }
  if (
    category === 'METADATA' &&
    runGit('show', 'HEAD:LICENSE').trim().length === 0
  ) {
    category = 'FULL';
    reason = 'EMPTY_LICENSE';
  }
  if (category === 'FULL' && reason === 'ONLY_ALLOWLISTED_FILE_MODIFIED')
    reason = 'DIFF_NOT_ALLOWLISTED';
  return { category, reason, head, base, entries };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  let selected;
  try {
    selected = classifyGitCandidate();
  } catch (error) {
    selected = {
      category: 'FULL',
      reason: `CLASSIFICATION_UNAVAILABLE: ${error.message}`,
    };
  }
  console.log(JSON.stringify(selected));
  const expectedIndex = process.argv.indexOf('--assert');
  if (expectedIndex !== -1) {
    const expected = process.argv[expectedIndex + 1];
    if (
      !['METADATA', 'COPY'].includes(expected) ||
      selected.category !== expected
    ) {
      console.error(
        `Candidate recheck failed: expected ${expected}, got ${selected.category}`,
      );
      process.exitCode = 1;
    } else {
      const evidencePath = resolve(
        ROOT,
        'artifacts/release-evidence',
        `lightweight-${process.env.GITHUB_RUN_ID || 'local'}-${process.env.GITHUB_RUN_ATTEMPT || 'local'}.json`,
      );
      mkdirSync(dirname(evidencePath), { recursive: true });
      writeFileSync(
        evidencePath,
        JSON.stringify(
          {
            ...selected,
            kind: 'lightweight-change-validation',
            verification: expected,
            noComprehensiveTestClaim: true,
          },
          null,
          2,
        ) + '\n',
        { flag: 'wx' },
      );
    }
  } else if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `category=${selected.category}\n`,
    );
  }
}
