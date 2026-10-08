import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Epic G callback route and Settings UI: what the cloud UI may and may not do.
 * The behavioural proof is in tests/features/settings; these checks keep the
 * shape from drifting without a reviewer noticing.
 *
 *  - it is made of existing components and classes: no stylesheet byte, no
 *    inline style;
 *  - nothing in it can run a cloud request by itself (no timer, listener,
 *    channel, worker or lifecycle hook beyond the two reviewed effects);
 *  - the callback page never reads the browser address: the account boundary
 *    does, once;
 *  - nothing in it talks to the provider, the network or browser storage
 *    directly, and nothing logs;
 *  - G7 (account deletion), synchronisation and automatic backup are absent.
 */

const root = process.cwd();
const FEATURE = 'src/features/settings/';

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    return entry.isDirectory() ? walk(full) : [full];
  });
}

const rel = (file: string) => path.relative(root, file).replace(/\\/g, '/');
const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, '$1');
const importsOf = (text: string) =>
  [...text.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1] ?? '',
  );

const cloudUiFiles = walk(path.join(root, 'src/features/settings'))
  .map((file) => ({
    path: rel(file),
    text: readFileSync(file, 'utf8'),
  }))
  .filter((file) =>
    /(?:^|\/)(?:Cloud[A-Za-z]*\.tsx|cloudModel\.ts|cloudDependencies\.ts)$/.test(
      file.path,
    ),
  );
const code = (file: { text: string }) => stripComments(file.text);

describe('cloud UI: made of what already exists', () => {
  it('finds the reviewed cloud UI modules', () => {
    expect(cloudUiFiles.map((file) => file.path).sort()).toEqual([
      `${FEATURE}cloudDependencies.ts`,
      `${FEATURE}cloudModel.ts`,
      `${FEATURE}components/CloudBackupCard.tsx`,
      `${FEATURE}components/CloudBackupPanel.tsx`,
      `${FEATURE}components/CloudNotice.tsx`,
      `${FEATURE}components/CloudRestorePanel.tsx`,
      `${FEATURE}components/CloudSignInPanel.tsx`,
      `${FEATURE}routes/CloudCallbackPage.tsx`,
    ]);
  });

  // The CSS budget (npm run check:bundle) is the authority on stylesheet
  // bytes; this keeps the UI from smuggling styling in another way.
  it('imports no stylesheet and sets no inline style', () => {
    for (const file of cloudUiFiles) {
      expect(code(file), file.path).not.toMatch(/\bstyle\s*=|\.style\b|<style/);
      expect(code(file), file.path).not.toMatch(/\.css['"]/);
    }
  });

  it('imports only the public entries it is allowed to', () => {
    const allowed =
      /^(?:\.{1,2}\/|react$|react-router-dom$|@\/components\/ui\/|@\/lib\/(?:cloud|cloudBackup|backup|appState|routing\/rpgRoutePaths|db|db\/database)$)/;
    const offenders = cloudUiFiles.flatMap((file) =>
      importsOf(file.text)
        .filter((spec) => !allowed.test(spec))
        .map((spec) => `${file.path} -> ${spec}`),
    );

    expect(offenders).toEqual([]);
  });
});

describe('cloud UI: nothing runs a cloud request by itself', () => {
  const forbidden: ReadonlyArray<[string, RegExp]> = [
    [
      'timers',
      /\b(setTimeout|setInterval|requestIdleCallback|queueMicrotask)\b/,
    ],
    [
      'listeners, channels and workers',
      /\b(addEventListener|BroadcastChannel|MessageChannel|postMessage|EventSource|WebSocket|Worker|serviceWorker|visibilitychange|navigator\.onLine)\b/,
    ],
    ['direct network access', /\b(fetch|XMLHttpRequest|sendBeacon)\s*\(/],
    [
      'browser storage',
      /\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/,
    ],
    ['logging', /\bconsole\./],
    ['dynamic code', /\b(eval|new\s+Function)\b/],
    ['the provider', /nhost|hasura|graphql|@nhost/i],
  ];

  it.each(forbidden)('contains no %s', (_label, pattern) => {
    const offenders = cloudUiFiles
      .filter((file) => pattern.test(code(file)))
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('has exactly the reviewed effects: subscribe, focus, restore preview focus, and the single callback completion', () => {
    const effects = Object.fromEntries(
      cloudUiFiles
        .map((file) => [
          file.path.replace(FEATURE, ''),
          (code(file).match(/\buseEffect\(/g) ?? []).length,
        ])
        .filter(([, count]) => count !== 0),
    );

    expect(effects).toEqual({
      'components/CloudBackupCard.tsx': 2, // subscribe to account state; focus
      'components/CloudRestorePanel.tsx': 1, // focus the checked-backup preview
      'routes/CloudCallbackPage.tsx': 1, // complete the email link, once
    });
  });

  /** The text of every `useEffect( ... )` call, found by balancing parentheses. */
  function effectBodies(text: string): string[] {
    const bodies: string[] = [];
    let from = text.indexOf('useEffect(');

    while (from !== -1) {
      let depth = 0;
      let end = from + 'useEffect'.length;

      for (; end < text.length; end += 1) {
        if (text[end] === '(') depth += 1;
        if (text[end] === ')') {
          depth -= 1;
          if (depth === 0) break;
        }
      }

      bodies.push(text.slice(from, end + 1));
      from = text.indexOf('useEffect(', end);
    }

    return bodies;
  }

  it('no effect other than the callback completion mentions a cloud operation', () => {
    const operations =
      /\b(listBackups|backUpNow|checkAttempt|prepareRestore|confirmRestore|signIn|signUp|signOut|completeEmailLink|requestPasswordReset|changePassword)\b/;
    const inspected = cloudUiFiles.flatMap((file) =>
      effectBodies(code(file)).map((body) => ({ file: file.path, body })),
    );
    const offenders = inspected
      .filter((effect) => !effect.file.endsWith('CloudCallbackPage.tsx'))
      .filter((effect) => operations.test(effect.body))
      .map((effect) => effect.file);

    // Positive controls: every effect was really inspected, and the scan can
    // see an operation where one is (the callback page's single completion).
    expect(inspected).toHaveLength(4);
    expect(
      inspected.filter((effect) => operations.test(effect.body)),
    ).toHaveLength(1);
    expect(offenders).toEqual([]);
  });
});

describe('cloud UI: the callback page never reads the address itself', () => {
  const page = cloudUiFiles.find((file) =>
    file.path.endsWith('CloudCallbackPage.tsx'),
  );

  it('uses no location, history, search-parameter or router-location API', () => {
    expect(page).toBeDefined();
    expect(code(page ?? { text: '' })).not.toMatch(
      /\b(window|location|history|URLSearchParams|useLocation|useSearchParams|useNavigate|navigate)\b/,
    );
  });

  it('completes the link exactly once, through the public account boundary, with no argument', () => {
    const text = code(page ?? { text: '' });

    expect(text.match(/completeEmailLink\(/g)).toHaveLength(1);
    expect(text).toMatch(/\.completeEmailLink\(\)/);
  });

  it('every result ends at Settings, replacing the callback entry', () => {
    const text = code(page ?? { text: '' });

    expect(text).toMatch(/replace/);
    expect(text).toMatch(/to=\{rpgSettingsPath\}/);
  });
});

describe('cloud UI: how Settings mounts the card', () => {
  const surface = readFileSync(
    path.join(root, 'src/features/settings/components/SettingsSurface.tsx'),
    'utf8',
  );

  it('hands the card the local-busy state, the export state and the existing local export', () => {
    expect(surface).toMatch(
      /<CloudBackupCard[\s\S]*?exporting=\{exporting\}[\s\S]*?localBusy=\{importing \|\| resetting\}[\s\S]*?onExportLocal=\{handleExport\}[\s\S]*?\/>/,
    );
  });

  it('places it between the file import and the reset, once, in both shells', () => {
    expect(surface.match(/<CloudBackupCard/g)).toHaveLength(1);
    expect(surface.indexOf('<ImportBackupControl')).toBeGreaterThan(-1);
    expect(surface.indexOf('<ImportBackupControl')).toBeLessThan(
      surface.indexOf('<CloudBackupCard'),
    );
    expect(surface.indexOf('<CloudBackupCard')).toBeLessThan(
      surface.indexOf('title="Reset local data"'),
    );
    // One component for both shells: no variant-specific cloud branch.
    expect(surface).not.toMatch(/isRpgVariant\s*\?\s*<CloudBackupCard/);
  });
});

describe('cloud UI: what is deliberately not here', () => {
  it('has no account deletion (G7), synchronisation, automatic backup or dirty tracking', () => {
    const offenders = cloudUiFiles
      .filter((file) =>
        /delete\s*account|deleteAccount|deleteUser|self-delete|close\s+account|\b(outbox|dirty|syncQueue|autoBackup|schedule|backgroundSync)\b/i.test(
          code(file),
        ),
      )
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('does not touch navigation, the HUD, the dashboard or onboarding', () => {
    const others = walk(path.join(root, 'src'))
      .map(rel)
      .filter((file) => /\.tsx?$/.test(file))
      .filter((file) => !file.startsWith(FEATURE))
      .filter((file) => !file.startsWith('src/lib/cloud'))
      .filter((file) =>
        /CloudBackupCard|CloudCallbackPage|CloudSignInPanel|cloudModel/.test(
          readFileSync(path.join(root, file), 'utf8'),
        ),
      );

    // Only the router mounts the callback page; nothing else mentions the UI.
    expect(others).toEqual(['src/app/router/router.tsx']);
  });
});
