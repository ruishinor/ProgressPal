import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

import {
  classifyBuildFile,
  evaluateBundleBudget,
  releaseBundleBudget,
} from './bundle-budget-utils.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DIST = resolve(ROOT, 'dist');

async function collectFiles(directory) {
  const found = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      found.push(...(await collectFiles(path)));
    } else {
      found.push(path);
    }
  }

  return found;
}

const files = await collectFiles(DIST);
const sourceMaps = files.filter((path) => extname(path) === '.map');

if (sourceMaps.length > 0) {
  throw new Error(
    `Production source maps are not allowed: ${sourceMaps
      .map((path) => relative(ROOT, path))
      .join(', ')}`,
  );
}

const entries = [];

for (const path of files) {
  const kind = classifyBuildFile(relative(DIST, path));

  if (kind === null) {
    continue;
  }

  const contents = await readFile(path);
  entries.push({
    gzipBytes: gzipSync(contents).byteLength,
    kind,
    path: relative(ROOT, path).replaceAll('\\', '/'),
    rawBytes: contents.byteLength,
  });
}

const result = evaluateBundleBudget(entries);
const report = { budget: releaseBundleBudget, entries, ...result };

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

for (const warning of result.warnings) {
  process.stderr.write(`WARNING (does not fail the check): ${warning}\n`);
}

if (result.violations.length > 0) {
  throw new Error(result.violations.join('\n'));
}
