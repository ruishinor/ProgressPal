// Copy-only fast lane: decides whether the checked-out change (HEAD^1..HEAD)
// only edits learner-facing text. Fails closed: anything it cannot prove is
// FULL. Prints COPY or FULL; exits 0 only for COPY.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import ts from 'typescript';

// JSX attributes and object properties whose string values are copy.
const COPY_ATTRIBUTES = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'description',
  'label',
  'placeholder',
  'title',
]);
const NON_COPY_KEYS = new Set([
  'class',
  'className',
  'href',
  'id',
  'key',
  'kind',
  'mode',
  'name',
  'path',
  'role',
  'src',
  'to',
  'type',
  'url',
  'value',
]);
const SOURCE = /^src\/.+\.(ts|tsx)$/;
const TEST = /(^(tests|e2e)\/)|(\.test\.(ts|tsx|mjs)$)/;

const normalize = (text) => text.replace(/\s+/g, ' ').trim();

function keyName(name) {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
}

function isCopy(node) {
  if (ts.isJsxText(node)) {
    return normalize(node.text) !== '';
  }
  if (!ts.isStringLiteral(node) && !ts.isNoSubstitutionTemplateLiteral(node)) {
    return false;
  }
  const parent = node.parent;
  if (ts.isJsxAttribute(parent)) {
    return COPY_ATTRIBUTES.has(parent.name.getText());
  }
  return (
    ts.isPropertyAssignment(parent) &&
    parent.initializer === node &&
    !NON_COPY_KEYS.has(keyName(parent.name)) &&
    /\s/.test(node.text)
  );
}

/** Code tokens with every copy value masked, and the copy values in order. */
export function analyse(text, fileName) {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const spans = [];
  const visit = (node) => {
    if (isCopy(node)) {
      spans.push([node.getStart(source), node.getEnd(), node]);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  let masked = '';
  let cursor = 0;
  for (const [start, end, node] of spans) {
    masked += text.slice(cursor, start) + (ts.isJsxText(node) ? 'COPY' : "''");
    cursor = end;
  }
  masked += text.slice(cursor);
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.JSX,
    masked,
  );
  const tokens = [];
  for (
    let kind = scanner.scan();
    kind !== ts.SyntaxKind.EndOfFileToken;
    kind = scanner.scan()
  ) {
    tokens.push(kind + ':' + scanner.getTokenText());
  }
  return {
    tokens,
    copy: spans.map(([, , node]) => normalize(node.text)),
  };
}

// Where tests match visible text: the text argument of these calls, and
// these option keys (getByRole(role, { name }), filter({ hasText })).
const TEXT_CALLS =
  /^((get|query|find)(All)?By(Text|LabelText|Label|PlaceholderText|Placeholder|Title|AltText|DisplayValue))$|^(toHaveText|toContainText|toHaveAccessibleName|toHaveAccessibleDescription|toHaveValue|toHaveTitle)$/;
const TEXT_KEYS = new Set(['name', 'hasText', 'hasNotText', 'description']);

function matcherValues(node, strings, patterns) {
  if (ts.isStringLiteralLike(node)) {
    strings.push(node.text);
  } else if (ts.isTemplateExpression(node)) {
    // Only the fixed parts of a template are known: each must still match.
    for (const part of [
      node.head,
      ...node.templateSpans.map((s) => s.literal),
    ]) {
      if (part.text.trim().length >= 3) strings.push(part.text);
    }
  } else if (ts.isRegularExpressionLiteral(node)) {
    const end = node.text.lastIndexOf('/');
    try {
      patterns.push(
        new RegExp(
          node.text.slice(1, end),
          node.text.slice(end + 1).replace('g', ''),
        ),
      );
    } catch {
      patterns.push(null);
    }
  } else if (ts.isArrayLiteralExpression(node)) {
    node.elements.forEach((element) =>
      matcherValues(element, strings, patterns),
    );
  }
}

/** Strings and patterns that tests use to find or assert visible text. */
function testMatchers(files) {
  const strings = [];
  const patterns = [];
  for (const [fileName, text] of files) {
    if (!/\.(ts|tsx|mjs)$/.test(fileName)) {
      continue;
    }
    const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest);
    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        const name = ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : ts.isIdentifier(callee)
            ? callee.text
            : '';
        if (TEXT_CALLS.test(name) && node.arguments[0]) {
          matcherValues(node.arguments[0], strings, patterns);
        }
      } else if (
        ts.isPropertyAssignment(node) &&
        TEXT_KEYS.has(keyName(node.name))
      ) {
        matcherValues(node.initializer, strings, patterns);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { strings, patterns };
}

/** Every string value in the sources, as copy values are compared. */
function sourceValues(files) {
  const values = [];
  for (const [fileName, text] of files) {
    const source = ts.createSourceFile(
      fileName,
      text,
      ts.ScriptTarget.Latest,
      true,
      fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node) => {
      if (ts.isStringLiteralLike(node) || ts.isJsxText(node)) {
        values.push(normalize(node.text));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return values;
}

/**
 * Decide COPY or FULL for a change. `changes` lists [status, path];
 * `read(ref, path)` returns file text at 'base' or 'head'; `tests` and
 * `sources` are [path, text] pairs of the base tree.
 */
export function classify({ changes, read, tests, sources }) {
  const reasons = [];
  const edits = [];
  if (changes.length === 0) {
    reasons.push('no change');
  }
  for (const [status, path] of changes) {
    // A copy change adds its own review evidence, so docs may be added too.
    const docs =
      /\.md$/.test(path) || /^docs\/release-reviews\/[^/]+\.json$/.test(path);
    if (status !== 'M' && !(docs && status === 'A')) {
      reasons.push(`${path}: ${status} is not a modification`);
    } else if (docs) {
      continue;
    } else if (!SOURCE.test(path) || TEST.test(path)) {
      reasons.push(`${path}: not a source copy file`);
    } else {
      const before = analyse(read('base', path), path);
      const after = analyse(read('head', path), path);
      if (
        before.tokens.join('\n') !== after.tokens.join('\n') ||
        before.copy.length !== after.copy.length
      ) {
        reasons.push(`${path}: code changed, not only copy`);
        continue;
      }
      before.copy.forEach((old, index) => {
        if (old !== after.copy[index]) {
          edits.push({ path, old, next: after.copy[index] });
        }
      });
    }
  }
  const { strings, patterns } = testMatchers(tests);
  const values = sourceValues(sources);
  for (const { path, old, next } of edits) {
    if (next.length > old.length) {
      reasons.push(`${path}: longer copy can change layout: "${next}"`);
    }
    if (
      strings.some(
        (text) =>
          text.includes(old) || (old.includes(text) && !next.includes(text)),
      ) ||
      patterns.some(
        (pattern) => !pattern || (pattern.test(old) && !pattern.test(next)),
      ) ||
      tests.some(([, text]) => text.includes(old))
    ) {
      reasons.push(`${path}: a test matches the old copy "${old}"`);
    }
    const uses = values.filter((value) => value === old).length;
    if (uses !== 1) {
      reasons.push(
        `${path}: the old copy occurs ${uses} times in src: "${old}"`,
      );
    }
  }
  return { lane: reasons.length === 0 ? 'COPY' : 'FULL', edits, reasons };
}

function git(...args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

// The checkout is HEAD. Tests and other sources cannot differ from the base on
// this lane (a test change is FULL), so read them from the working tree.
function workingFiles(filter) {
  return git('ls-files')
    .split('\n')
    .filter((path) => path && filter(path))
    .map((path) => [path, readFileSync(path, 'utf8')]);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let result;
  try {
    // Only a two-parent merge shows the whole change as HEAD^1..HEAD; a
    // rebase, squash or direct push could hide earlier commits.
    if (
      git('rev-list', '--parents', '-n', '1', 'HEAD').trim().split(' ')
        .length !== 3
    ) {
      throw new Error('HEAD is not a two-parent merge commit');
    }
    const changes = git(
      'diff',
      '--name-status',
      '--no-renames',
      'HEAD^1',
      'HEAD',
    )
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('\t'));
    const read = (ref, path) =>
      git('show', `${ref === 'base' ? 'HEAD^1' : 'HEAD'}:${path}`);
    const changed = new Set(changes.map(([, path]) => path));
    result = classify({
      changes,
      read,
      tests: workingFiles((path) => TEST.test(path)),
      // Count old copy in the base: changed files are read at HEAD^1.
      sources: workingFiles(
        (path) => SOURCE.test(path) && !TEST.test(path),
      ).map(([path, text]) =>
        changed.has(path) ? [path, read('base', path)] : [path, text],
      ),
    });
  } catch (error) {
    result = { lane: 'FULL', edits: [], reasons: [String(error)] };
  }
  process.stderr.write(JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(result.lane + '\n');
  process.exitCode = result.lane === 'COPY' ? 0 : 1;
}
