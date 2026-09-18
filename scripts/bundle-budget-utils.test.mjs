import assert from 'node:assert/strict';
import test from 'node:test';

import {
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
