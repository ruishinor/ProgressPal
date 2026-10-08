import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { defaultCloudPreferences } from '@/lib/cloud';
import {
  nhostAuthUrl,
  nhostConnectOrigins,
  nhostGraphqlUrl,
} from '@/lib/cloud/nhost/endpoints';

/**
 * Epic G cloud boundary (Stage 1, owner-authorized):
 *  - one adapter folder owns the provider SDK and every provider URL;
 *  - the cloud library cannot reach the learner database;
 *  - nothing in the application boots, imports or calls cloud code yet;
 *  - the SDK dependency is pinned exactly and no other provider package exists.
 * A change that widens any of this must edit this file in the same commit.
 */

const root = process.cwd();
const ADAPTER_DIR = 'src/lib/cloud/nhost/';
const CLOUD_DIR = 'src/lib/cloud/';

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

const importsOf = (text: string) =>
  [...text.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1] ?? '',
  );

describe('cloud boundary: provider SDK and URLs', () => {
  it('only the adapter folder imports any @nhost package', () => {
    const offenders = sourceFiles
      .filter((file) => !file.path.startsWith(ADAPTER_DIR))
      .filter((file) =>
        importsOf(file.text).some((spec) => spec.startsWith('@nhost/')),
      )
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('the adapter folder is the only place a provider host is named in source', () => {
    const offenders = sourceFiles
      .filter((file) => /nhost\.run/.test(file.text))
      .map((file) => file.path);

    expect(offenders).toEqual([`${ADAPTER_DIR}endpoints.ts`]);
  });

  it('no other package may import the adapter internals; the cloud entry point is the public surface', () => {
    const offenders = sourceFiles
      .filter((file) => !file.path.startsWith(CLOUD_DIR))
      .filter((file) =>
        importsOf(file.text).some((spec) => spec.startsWith('@/lib/cloud/')),
      )
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('no WebSocket, subscription transport or realtime client is introduced', () => {
    const offenders = sourceFiles
      .filter((file) => file.path.startsWith(CLOUD_DIR))
      .filter((file) =>
        /\bwss?:|WebSocket|graphql-ws|subscriptions-transport|EventSource/.test(
          file.text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''),
        ),
      )
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('uses only the Auth and GraphQL services: no Storage or Functions client is touched', () => {
    const adapter = sourceFiles.filter((file) =>
      file.path.startsWith(ADAPTER_DIR),
    );

    for (const file of adapter) {
      const code = file.text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(code, file.path).not.toMatch(
        /\.storage\.|\.functions\.|storageUrl|functionsUrl/,
      );
    }
  });

  it('pins the exact Stockholm hosts used by the CSP', () => {
    expect(nhostAuthUrl).toBe(
      'https://enuikiiweoscywaixedr.auth.eu-north-1.nhost.run/v1',
    );
    expect(nhostGraphqlUrl).toBe(
      'https://enuikiiweoscywaixedr.graphql.eu-north-1.nhost.run/v1',
    );
    expect(nhostConnectOrigins).toEqual([
      'https://enuikiiweoscywaixedr.auth.eu-north-1.nhost.run',
      'https://enuikiiweoscywaixedr.graphql.eu-north-1.nhost.run',
    ]);
  });
});

describe('cloud boundary: learner data stays out of reach', () => {
  it('the cloud library cannot import the database, domain, backup or any UI layer', () => {
    const forbidden = [
      /^@\/lib\/db/,
      /^@\/lib\/domain/,
      /^@\/lib\/backup/,
      /^@\/lib\/progress/,
      /^@\/lib\/xp/,
      /^@\/app/,
      /^@\/features/,
      /^@\/components/,
      /^dexie/,
    ];
    const offenders = sourceFiles
      .filter((file) => file.path.startsWith(CLOUD_DIR))
      .flatMap((file) =>
        importsOf(file.text)
          .filter((spec) => forbidden.some((rx) => rx.test(spec)))
          .map((spec) => `${file.path} -> ${spec}`),
      );

    expect(offenders).toEqual([]);
  });

  it('cloud preferences are device-local configuration, off by default', () => {
    expect(defaultCloudPreferences).toEqual({
      enabled: false,
      trustedDevice: false,
    });
  });
});

describe('cloud boundary: the callback location has exactly one authority (carried P3)', () => {
  const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

  it('no module outside callbackUrl.ts can parse, strip or separately scrub an address', () => {
    const offenders = sourceFiles
      .filter((file) => file.path !== `${CLOUD_DIR}callbackUrl.ts`)
      .filter((file) =>
        /\b(parseCloudCallback|stripCloudCallbackParams|scrubCloudCallbackUrl)\b/.test(
          code(file.text),
        ),
      )
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('the port takes no address, and the adapter consumes the browser location only through takeCloudCallback', () => {
    const port =
      sourceFiles.find((file) => file.path === `${CLOUD_DIR}port.ts`)?.text ??
      '';
    const account = code(
      sourceFiles.find((file) => file.path === `${ADAPTER_DIR}account.ts`)
        ?.text ?? '',
    );

    expect(port).toMatch(
      /completeEmailLink\(\): Promise<CloudEmailLinkOutcome>;/,
    );
    expect(account).toMatch(/async completeEmailLink\(\): Promise</);
    expect(account).toMatch(/takeCloudCallback\(getWindow\(\)\)/);
    // No other read of the address bar inside the completion path.
    expect(account).not.toMatch(/location\.(href|search|hash)/);
  });
});

describe('cloud boundary: nothing in the application boots or calls cloud code yet', () => {
  it('only the G5/G6 domain folder imports the cloud library (UI and routes do not, yet)', () => {
    const importers = sourceFiles
      .filter((file) => !file.path.startsWith(CLOUD_DIR))
      .filter((file) =>
        importsOf(file.text).some(
          (spec) => spec === '@/lib/cloud' || spec.startsWith('@/lib/cloud/'),
        ),
      )
      .map((file) => file.path);

    // A later story that wires the UI must change this list on purpose.
    expect(
      importers.filter((file) => !file.startsWith('src/lib/cloudBackup/')),
    ).toEqual([]);
  });

  it('nothing in the adapter performs work at import time (no top-level calls)', () => {
    const account =
      sourceFiles.find((file) => file.path === `${ADAPTER_DIR}account.ts`)
        ?.text ?? '';
    const topLevel = account
      .split('\n')
      .filter((line) =>
        /^(?:createNhostCloudAccount|getCloudAccount|createClient|fetch)\(/.test(
          line,
        ),
      );

    expect(topLevel).toEqual([]);
    expect(account).toMatch(/let sharedCloud: NhostCloud \| null = null;/);
  });
});

describe('cloud boundary: dependency pin', () => {
  const packageJson = JSON.parse(
    readFileSync(path.join(root, 'package.json'), 'utf8'),
  ) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };

  it('depends on exactly @nhost/nhost-js 4.9.0 (no range) and no other @nhost package', () => {
    const all = { ...packageJson.dependencies, ...packageJson.devDependencies };

    expect(packageJson.dependencies['@nhost/nhost-js']).toBe('4.9.0');
    expect(
      Object.keys(all).filter((name) => name.startsWith('@nhost/')),
    ).toEqual(['@nhost/nhost-js']);
  });

  it('the lockfile resolves that exact version with its published integrity', () => {
    const lock = JSON.parse(
      readFileSync(path.join(root, 'package-lock.json'), 'utf8'),
    ) as {
      packages: Record<
        string,
        {
          version?: string;
          integrity?: string;
          dependencies?: Record<string, string>;
        }
      >;
    };
    const entry = lock.packages['node_modules/@nhost/nhost-js'];

    expect(entry?.version).toBe('4.9.0');
    expect(entry?.integrity).toBe(
      'sha512-ycH63wxIUu5pRzCwnBOYfgT7cKjm4a+K7NOEL22j+pibLNFiV/k0/LkSg7BNZ7AfBnJPd89SnzsSvbv8kx0jZQ==',
    );
    expect(Object.keys(entry?.dependencies ?? {})).toEqual(['tslib']);
  });
});

describe('cloud boundary: the browser never holds a privileged credential', () => {
  const scanned = [
    ...sourceFiles.map((file) => ({ path: file.path, text: file.text })),
    ...['index.html', 'vite.config.ts', 'vercel.json'].map((name) => ({
      path: name,
      text: readFileSync(path.join(root, name), 'utf8'),
    })),
  ];

  it('no admin secret, service key or database password is referenced by shipped code or config', () => {
    const offenders = scanned
      .filter((file) =>
        /x-hasura-admin-secret|NHOST_ADMIN_SECRET|HASURA_GRAPHQL_ADMIN_SECRET|adminSecret|postgres:\/\//i.test(
          file.text,
        ),
      )
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('no VITE_ variable carries provider configuration (the two URLs are fixed constants)', () => {
    const offenders = scanned
      .filter((file) =>
        /VITE_NHOST|import\.meta\.env\.[A-Z_]*NHOST/i.test(file.text),
      )
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });
});

describe('cloud boundary: the service worker leaves provider traffic alone', () => {
  const sw = readFileSync(path.join(root, 'public/sw.js'), 'utf8');

  it('ignores non-GET and cross-origin requests before any caching logic', () => {
    const listener = sw.slice(sw.indexOf("addEventListener('fetch'"));
    const nonGet = listener.indexOf("request.method !== 'GET'");
    const crossOrigin = listener.indexOf('url.origin !== self.location.origin');
    const firstRespond = listener.indexOf('respondWith');

    expect(nonGet).toBeGreaterThan(-1);
    expect(crossOrigin).toBeGreaterThan(nonGet);
    expect(firstRespond).toBeGreaterThan(crossOrigin);
  });

  it('never names a provider host', () => {
    expect(sw).not.toMatch(/nhost/i);
  });
});
