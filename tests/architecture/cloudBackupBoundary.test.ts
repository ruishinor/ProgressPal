import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Epic G, G5/G6: the manual cloud backup and restore domain logic.
 *
 *  - It sits beside the cloud library and uses it only through its public
 *    entry; it never reaches the provider, the SDK or the learner database.
 *  - The only write path to the learner database is the restore function the
 *    caller injects (the existing atomic restore), so this folder imports no
 *    database code at all.
 *  - It does no background work and makes no recency judgement.
 *  - Nothing in the application imports it yet (no UI, no route wiring).
 * A change that widens any of this must edit this file in the same commit.
 */

const root = process.cwd();
const DOMAIN_DIR = 'src/lib/cloudBackup/';

function walk(dir: string): string[] {
  const out: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }

  return out;
}

const rel = (file: string) => path.relative(root, file).replace(/\\/g, '/');
const sourceFiles = walk(path.join(root, 'src')).map((file) => ({
  path: rel(file),
  text: readFileSync(file, 'utf8'),
}));
const domainFiles = sourceFiles.filter((file) =>
  file.path.startsWith(DOMAIN_DIR),
);

const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, '$1');
const importsOf = (text: string) =>
  [...text.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1] ?? '',
  );

describe('cloud backup domain: what it may import', () => {
  it('exists and is not empty', () => {
    expect(domainFiles.length).toBeGreaterThan(0);
  });

  it('imports only siblings and the public entries of the cloud, backup and storage libraries', () => {
    const allowed = new Set(['@/lib/cloud', '@/lib/backup', '@/lib/storage']);
    const offenders = domainFiles.flatMap((file) =>
      importsOf(file.text)
        .filter((spec) => !spec.startsWith('./') && !allowed.has(spec))
        .map((spec) => `${file.path} -> ${spec}`),
    );

    expect(offenders).toEqual([]);
  });

  it('never imports the learner database, Dexie, the provider SDK or any UI layer', () => {
    const forbidden = [
      /^@\/lib\/db/,
      /^@\/lib\/domain/,
      /^dexie/,
      /^@nhost\//,
      /^@\/app/,
      /^@\/features/,
      /^@\/components/,
    ];
    const offenders = domainFiles.flatMap((file) =>
      importsOf(file.text)
        .filter((spec) => forbidden.some((rx) => rx.test(spec)))
        .map((spec) => `${file.path} -> ${spec}`),
    );

    expect(offenders).toEqual([]);
  });

  it('is provider-neutral: it names no provider, query language, column or credential', () => {
    const offenders = domainFiles
      .filter((file) =>
        /nhost|hasura|graphql|backup_slots|expected_sha256|payload_sha256|x-hasura|authorization|accessToken|refreshToken/i.test(
          stripComments(file.text),
        ),
      )
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });
});

describe('cloud backup domain: no background work, no side channels', () => {
  const forbidden: ReadonlyArray<[string, RegExp]> = [
    [
      'timers',
      /\b(setTimeout|setInterval|requestIdleCallback|requestAnimationFrame|queueMicrotask)\b/,
    ],
    [
      'event or message channels',
      /\b(addEventListener|BroadcastChannel|MessageChannel|postMessage|EventSource|WebSocket)\b/,
    ],
    [
      'workers and locks',
      /\b(Worker|SharedWorker|navigator\.locks|serviceWorker)\b/,
    ],
    [
      'browser storage',
      /\b(localStorage|sessionStorage|indexedDB|IDBDatabase|caches)\b/,
    ],
    ['direct network access', /\b(fetch|XMLHttpRequest|sendBeacon)\s*\(/],
    ['logging', /\bconsole\./],
    ['dynamic code', /\b(eval|new\s+Function)\b/],
  ];

  it.each(forbidden)('contains no %s', (_label, pattern) => {
    const offenders = domainFiles
      .filter((file) => pattern.test(stripComments(file.text)))
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('contains no persistent outbox, queue or dirty-tracking vocabulary', () => {
    const offenders = domainFiles
      .filter((file) =>
        /\b(outbox|dirty|pendingQueue|syncQueue|autoBackup|schedule)\b/i.test(
          stripComments(file.text),
        ),
      )
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });
});

describe('cloud backup domain: restore makes no recency judgement', () => {
  const restore = domainFiles.find((file) => file.path.endsWith('/restore.ts'));

  it('has a restore module', () => {
    expect(restore).toBeDefined();
  });

  it('does no date arithmetic and never orders anything by time', () => {
    const code = stripComments(restore?.text ?? '');

    expect(code).not.toMatch(
      /compareStoredAt|parseStoredAt|Date\.parse|Date\.now|new Date|getTime|toISOString|\.sort\(/,
    );
  });

  it("never compares the uploader's export time, the server time or any local timestamp", () => {
    const code = stripComments(restore?.text ?? '');

    // Metadata is only ever copied through to the preview, never compared.
    expect(code).not.toMatch(
      /\b(storedAt|exportedAt|updatedAt|createdAt)\b\s*(<|>|<=|>=|===|!==)/,
    );
    expect(code).not.toMatch(
      /(<|>|<=|>=|===|!==)\s*[\w.]*\b(storedAt|exportedAt|updatedAt|createdAt)\b/,
    );
  });
});

describe('cloud backup domain: not wired into the application', () => {
  it('nothing outside the domain folder imports it', () => {
    const offenders = sourceFiles
      .filter((file) => !file.path.startsWith(DOMAIN_DIR))
      .filter((file) =>
        importsOf(file.text).some(
          (spec) =>
            spec === '@/lib/cloudBackup' ||
            spec.startsWith('@/lib/cloudBackup/'),
        ),
      )
      .map((file) => file.path);

    // A later story that wires the UI must change this list on purpose.
    expect(offenders).toEqual([]);
  });

  it('adds no route and no service-worker change', () => {
    const touchesRoute = sourceFiles
      .filter((file) => file.path.startsWith('src/app/router/'))
      .some((file) => /cloudBackup|lib\/cloud/.test(file.text));
    const sw = readFileSync(path.join(root, 'public/sw.js'), 'utf8');

    expect(touchesRoute).toBe(false);
    expect(sw).not.toMatch(/cloud|nhost/i);
  });
});
