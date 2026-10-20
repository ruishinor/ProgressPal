import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyBuildFile,
  evaluateBundleBudget,
  releaseBundleBudget,
} from './bundle-budget-utils.mjs';

test('accepts a bundle exactly at every release limit', () => {
  const result = evaluateBundleBudget([
    {
      gzipBytes: releaseBundleBudget.maxJavaScriptGzipBytes,
      kind: 'js',
      path: 'index.js',
      rawBytes: releaseBundleBudget.maxJavaScriptRawBytes,
    },
    {
      gzipBytes: releaseBundleBudget.maxCssGzipBytes,
      kind: 'css',
      path: 'index.css',
      rawBytes: 50_000,
    },
  ]);

  assert.deepEqual(result.violations, []);
});

test('CSS: a soft warning above 25,000 B that never fails, a hard limit above 40,000 B', () => {
  const css = (gzipBytes) =>
    evaluateBundleBudget([
      { gzipBytes, kind: 'css', path: 'index.css', rawBytes: 1 },
    ]);

  assert.equal(releaseBundleBudget.cssGzipWarningBytes, 25_000);
  assert.equal(releaseBundleBudget.maxCssGzipBytes, 40_000);
  assert.deepEqual(css(25_000).violations, []);
  assert.deepEqual(css(25_000).warnings, []);

  const warned = css(25_001);

  assert.deepEqual(warned.violations, []);
  assert.equal(warned.warnings.length, 1);
  assert.match(warned.warnings[0], /25001 bytes, above the 25000-byte warning/);

  const atLimit = css(40_000);

  assert.deepEqual(atLimit.violations, []);
  assert.equal(atLimit.warnings.length, 1);

  const over = css(40_001);

  assert.equal(over.violations.length, 1);
  assert.match(
    over.violations[0],
    /Total CSS gzip is 40001 bytes; limit is 40000/,
  );
  // Over the hard limit is a failure, not also a warning.
  assert.deepEqual(over.warnings, []);
});

test('a CSS warning leaves every other budget as it was', () => {
  const result = evaluateBundleBudget([
    {
      gzipBytes: releaseBundleBudget.maxJavaScriptGzipBytes + 1,
      kind: 'js',
      path: 'a.js',
      rawBytes: 1,
    },
    { gzipBytes: 30_000, kind: 'css', path: 'a.css', rawBytes: 1 },
  ]);

  assert.equal(result.violations.length, 1);
  assert.match(result.violations[0], /Total JavaScript gzip/);
  assert.equal(result.warnings.length, 1);
  assert.equal(releaseBundleBudget.maxJavaScriptGzipBytes, 400_000);
  assert.equal(releaseBundleBudget.maxJavaScriptRawBytes, 500_000);
  assert.equal(releaseBundleBudget.maxCurriculumGzipBytes, 150_000);
  assert.equal(releaseBundleBudget.maxRuntimeAssetGzipBytes, 7_000_000);
});

test('reports raw JavaScript, total JavaScript gzip, and CSS gzip independently', () => {
  const result = evaluateBundleBudget([
    { gzipBytes: 250_000, kind: 'js', path: 'a.js', rawBytes: 500_001 },
    { gzipBytes: 150_001, kind: 'js', path: 'b.js', rawBytes: 100_000 },
    {
      gzipBytes: releaseBundleBudget.maxCssGzipBytes + 1,
      kind: 'css',
      path: 'a.css',
      rawBytes: 20_000,
    },
  ]);

  assert.equal(result.violations.length, 3);
  assert.match(result.violations[0], /Largest JavaScript chunk/);
  assert.match(result.violations[1], /Total JavaScript gzip/);
  assert.match(result.violations[2], /Total CSS gzip/);
});

test('classifies packaged curriculum and runtime assets separately and flags code hidden in them', () => {
  assert.equal(
    classifyBuildFile(
      'content/programvareutvikling/index.0123456789abcdef.json',
    ),
    'curriculum',
  );
  assert.equal(classifyBuildFile('content/offline.json'), 'curriculum');
  assert.equal(classifyBuildFile('content/sneaky.js'), 'unexpected');
  assert.equal(
    classifyBuildFile('runtime/pyodide-314.0.7/pyodide.asm.wasm'),
    'runtime',
  );
  assert.equal(
    classifyBuildFile('runtime/pyodide-314.0.7/notes.html'),
    'unexpected',
  );
  assert.equal(classifyBuildFile('assets/index-abc.js'), 'js');
  assert.equal(classifyBuildFile('assets/worker-abc.mjs'), 'js');
  assert.equal(classifyBuildFile('assets/index-abc.css'), 'css');
  assert.equal(classifyBuildFile('index.html'), null);
});

test('budgets the curriculum and the runtime independently of application JavaScript', () => {
  const result = evaluateBundleBudget([
    { gzipBytes: 1, kind: 'js', path: 'a.js', rawBytes: 1 },
    {
      gzipBytes: releaseBundleBudget.maxCurriculumGzipBytes + 1,
      kind: 'curriculum',
      path: 'content/x.json',
      rawBytes: 1,
    },
    {
      gzipBytes: releaseBundleBudget.maxRuntimeAssetGzipBytes + 1,
      kind: 'runtime',
      path: 'runtime/x.wasm',
      rawBytes: 1,
    },
    {
      gzipBytes: 1,
      kind: 'unexpected',
      path: 'content/sneaky.js',
      rawBytes: 1,
    },
  ]);

  assert.equal(result.javaScriptGzipBytes, 1);
  assert.equal(result.violations.length, 3);
  assert.match(result.violations[0], /Packaged curriculum gzip/);
  assert.match(result.violations[1], /Python runtime assets gzip/);
  assert.match(result.violations[2], /content\/sneaky\.js/);
});
