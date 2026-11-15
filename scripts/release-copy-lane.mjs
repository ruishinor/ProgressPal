// Copy-only fast lane: decides whether the checked-out change (HEAD^1..HEAD)
// only edits learner-facing text. Fails closed: anything it cannot prove is
// FULL. Prints COPY or FULL; exits 0 only for COPY.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import ts from 'typescript';

// Any string, template text or JSX text that reads as language is copy,
// unless the place it is used gives it behaviour: a comparison, a type, a
// module path, a key, a class name, a format or a selector.
const NON_COPY_ATTRIBUTES =
  /^(as|class|className|d|dir|fill|form|height|href|htmlFor|icon|id|inputMode|key|kind|lang|method|mode|name|pattern|rel|role|size|src|status|stroke|style|target|to|tone|type|value|variant|viewBox|width|xmlns|accept|action|autoComplete)$|^data-|^aria-(?!(label|description|valuetext|roledescription|placeholder)$)/;
const NON_COPY_NAMES =
  /^(class|className|style|href|src|to|url|path|route|id|key|kind|mode|type|role|name|value|variant|tone|status|icon|slug|code|format|pattern|locale|lang|timeZone|unit|field|event|action|tag|target|rel|method|selector|query)$|(Id|Key|Url|Path|Class|ClassName|Pattern|Format|Selector|Query|Type|Kind|Mode|Status)$/;
const NON_COPY_CALLS =
  /format|parse|match|query|select|closest|Item$|Listener$|^fetch$|RegExp|Media|^require$|^import$|^literal$|^enum$|^cn$|^cx$|^clsx$|^classNames$|^on$|^emit$/i;
// Operators that make a string a value rather than text.
const COMPARISONS = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.InKeyword,
]);
const SOURCE = /^src\/.+\.(ts|tsx)$/;
// Persistence and protocol layers: a string there may be a stored or sent
// value, which no static check can tell from text.
const STORED = /^src\/lib\/(db|backup|storage|cloud|cloudBackup)\//;
const TEST = /(^(tests|e2e)\/)|(\.test\.(ts|tsx|mjs)$)/;

const normalize = (text) => text.replace(/\s+/g, ' ').trim();

function keyName(name) {
  return name && (ts.isIdentifier(name) || ts.isStringLiteral(name))
    ? name.text
    : null;
}

function calleeName(call) {
  const callee = call.expression;
  return ts.isPropertyAccessExpression(callee)
    ? callee.name.text
    : ts.isIdentifier(callee)
      ? callee.text
      : call.kind === ts.SyntaxKind.ImportKeyword
        ? 'import'
        : '';
}

/** Reads as language: letters and a space, a non-ASCII letter, a capital or
 * sentence punctuation; not a URL, path or class list. */
function readsAsLanguage(text) {
  const value = normalize(text);
  if (
    !/\p{L}{2}/u.test(value) ||
    /:\/\/|^(\/|#|\.|mailto:)|--|__/.test(value)
  ) {
    return false;
  }
  const words = value.split(' ');
  if (words.every((word) => /^[a-z0-9_-]+$/.test(word)) && /[-_]/.test(value)) {
    return false;
  }
  return (
    words.length > 1 ||
    /[^\p{ASCII}]/u.test(value) ||
    /^\p{Lu}\p{Ll}/u.test(value) ||
    /[.!?…:]$/.test(value)
  );
}

/** Whether the place a string is used leaves it plain text. */
function textPosition(node) {
  let child = node;
  let parent = node.parent;
  // Climb through expressions that only pass the text on.
  while (
    ts.isParenthesizedExpression(parent) ||
    ts.isConditionalExpression(parent) ||
    ts.isArrayLiteralExpression(parent) ||
    ts.isAsExpression(parent) ||
    ts.isSatisfiesExpression(parent) ||
    ts.isTemplateSpan(parent) ||
    ts.isTemplateExpression(parent) ||
    (ts.isBinaryExpression(parent) &&
      !COMPARISONS.has(parent.operatorToken.kind))
  ) {
    if (ts.isConditionalExpression(parent) && parent.condition === child) {
      return false;
    }
    child = parent;
    parent = parent.parent;
  }
  if (ts.isBinaryExpression(parent) || ts.isCaseClause(parent)) {
    return false;
  }
  if (ts.isJsxAttribute(parent)) {
    return !NON_COPY_ATTRIBUTES.test(parent.name.getText());
  }
  if (ts.isJsxExpression(parent)) {
    const attribute = parent.parent;
    return !(
      ts.isJsxAttribute(attribute) &&
      NON_COPY_ATTRIBUTES.test(attribute.name.getText())
    );
  }
  if (ts.isPropertyAssignment(parent)) {
    return (
      parent.initializer === child &&
      // Header-like keys (Authorization, Content-Type) carry protocol values.
      !/^[A-Z]|-/.test(keyName(parent.name) ?? '-') &&
      !NON_COPY_NAMES.test(keyName(parent.name) ?? '')
    );
  }
  if (
    ts.isVariableDeclaration(parent) ||
    ts.isParameter(parent) ||
    ts.isBindingElement(parent)
  ) {
    return !NON_COPY_NAMES.test(keyName(parent.name) ?? '');
  }
  if (ts.isCallExpression(parent) || ts.isNewExpression(parent)) {
    return (
      parent.expression !== child &&
      !NON_COPY_CALLS.test(
        ts.isCallExpression(parent) ? calleeName(parent) : '',
      )
    );
  }
  return (
    ts.isReturnStatement(parent) ||
    ts.isArrowFunction(parent) ||
    ts.isThrowStatement(parent) ||
    ts.isExpressionStatement(parent) ||
    ts.isShorthandPropertyAssignment(parent) ||
    ts.isSpreadElement(parent)
  );
}

function isCopy(node) {
  if (ts.isJsxText(node)) {
    return normalize(node.text) !== '';
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return readsAsLanguage(node.text) && textPosition(node);
  }
  return false;
}

/** The fixed text of a template, as [start, end, text] spans, when copy. */
function templateParts(node, source) {
  const parts = [node.head, ...node.templateSpans.map((span) => span.literal)];
  if (
    !parts.some((part) => readsAsLanguage(part.text)) ||
    !textPosition(node)
  ) {
    return null;
  }
  return parts.map((part) => {
    const start = part.getStart(source) + 1;
    const end = part.getEnd() - (ts.isTemplateTail(part) ? 1 : 2);
    return [start, end, part.text];
  });
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
  // [start, end, replacement, copy text]
  const spans = [];
  const visit = (node) => {
    if (isCopy(node)) {
      spans.push([
        node.getStart(source),
        node.getEnd(),
        ts.isJsxText(node) ? 'COPY' : "''",
        node.text,
      ]);
      return;
    }
    const parts = ts.isTemplateExpression(node) && templateParts(node, source);
    if (parts) {
      parts.forEach(([start, end, part]) => spans.push([start, end, '', part]));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  spans.sort((a, b) => a[0] - b[0]);
  let masked = '';
  let cursor = 0;
  for (const [start, end, replacement] of spans) {
    masked += text.slice(cursor, start) + replacement;
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
    copy: spans.map(([, , , copy]) => normalize(copy)),
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
      if (
        ts.isStringLiteralLike(node) ||
        ts.isJsxText(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      ) {
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
    } else if (STORED.test(path)) {
      reasons.push(`${path}: persistence or protocol code`);
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
    // Text used anywhere else may be a value: every use must change alike.
    const uses = values.filter((value) => value === old).length;
    const alike = edits.filter((edit) => edit.old === old);
    if (uses !== alike.length || alike.some((edit) => edit.next !== next)) {
      reasons.push(
        `${path}: the old copy occurs ${uses} times in src, ${alike.length} edited alike: "${old}"`,
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
