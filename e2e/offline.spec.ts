import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { chromium, expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

// Derive the cache version from the service worker source: public/sw.js is the
// single source of truth, so a version bump there (which purges old caches) is
// picked up here automatically and this spec never carries a second
// manual-bump site.
function readCacheVersionFromServiceWorker(): string {
  const source = readFileSync(
    path.resolve(process.cwd(), 'public', 'sw.js'),
    'utf8',
  );
  const match = /const CACHE_VERSION = '([^']+)';/.exec(source);

  if (!match) {
    throw new Error(
      'offline.spec could not read CACHE_VERSION from public/sw.js; the spec ' +
        'derives the versioned cache name from the service worker source.',
    );
  }

  return match[1];
}

const CACHE_VERSION = readCacheVersionFromServiceWorker();

// e2e specs are type-checked under tsconfig.node.json (lib: ES2022, no DOM), so
// browser globals used inside page.evaluate() are accessed through this typed
// view of the page's global scope.
interface OfflineBrowserScope {
  caches: {
    delete(name: string): Promise<boolean>;
    keys(): Promise<string[]>;
    open(name: string): Promise<{
      keys(): Promise<Array<{ url: string }>>;
      match(
        url: string,
        options?: { ignoreSearch?: boolean; ignoreVary?: boolean },
      ): Promise<{ text(): Promise<string> } | undefined>;
      put(url: string, response: unknown): Promise<void>;
    }>;
  };
  localStorage: { clear(): void };
  navigator: {
    serviceWorker?: {
      addEventListener(
        type: 'controllerchange',
        listener: () => void,
        options?: { once?: boolean },
      ): void;
      controller: unknown;
      getRegistrations(): Promise<Array<{ unregister(): Promise<boolean> }>>;
      ready: Promise<unknown>;
    };
  };
}

// Wait until the service worker is not just active (`ready`) but actually
// controlling this page (`clients.claim()` has taken effect). Only then is a
// subsequent offline reload guaranteed to be served by the worker.
async function waitForServiceWorkerControl(page: Page) {
  await page.evaluate(async () => {
    const scope = globalThis as unknown as OfflineBrowserScope;
    const container = scope.navigator.serviceWorker;

    if (!container) {
      return;
    }

    await container.ready;

    if (container.controller) {
      return;
    }

    await new Promise<void>((resolve) => {
      const finish = () => {
        resolve();
      };
      container.addEventListener('controllerchange', finish, { once: true });
      setTimeout(finish, 5000);
    });
  });
}

// Belt-and-suspenders cleanup: Playwright already isolates storage per test, but
// the approved plan requires explicitly clearing service workers and caches so no
// test can pass on state left by a previous run.
async function clearOfflineState(page: Page) {
  await page.evaluate(async () => {
    const scope = globalThis as unknown as OfflineBrowserScope;

    if (scope.navigator.serviceWorker) {
      const registrations =
        await scope.navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister()),
      );
    }

    if ('caches' in globalThis) {
      const keys = await scope.caches.keys();
      await Promise.all(keys.map((key) => scope.caches.delete(key)));
    }

    scope.localStorage.clear();
  });
}

// Playwright runs each test in a fresh browser context, so service workers, Cache
// Storage, IndexedDB, and localStorage all start empty — no test can pass on state
// left by a previous run. (Loading the app in a beforeEach to "pre-clean" would
// instead churn registration: register -> unregister -> re-register, which can
// leave an offline reload uncontrolled.) An afterEach cleanup is kept as belt and
// suspenders.
test.afterEach(async ({ page }) => {
  await clearOfflineState(page).catch(() => undefined);
});

test('cold-starts offline after one online production load', async ({
  page,
}) => {
  const consoleIssues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleIssues.push(message.text());
    }
  });

  // 1a. Exactly one online production load. Onboarding creates persisted
  // IndexedDB state and lands on the dashboard.
  await completeOnboarding(page);

  // 1b. The service worker installs, activates, and takes control of the page.
  await waitForServiceWorkerControl(page);

  // 1c. Prove the mechanism, not just the outcome: while still online, read the
  // served index.html and extract every /assets/*.{js,css} reference with the same
  // broad pattern the service worker uses, then assert install-time discovery
  // cached the shell AND every one of those boot assets after this single load.
  const discovery = await page.evaluate(async (cacheVersion) => {
    const scope = globalThis as unknown as OfflineBrowserScope;

    const response = await fetch('/index.html', { cache: 'no-cache' });
    const html = await response.text();
    const expected = Array.from(
      new Set(
        Array.from(html.matchAll(/\/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g)).map(
          (match) => match[0],
        ),
      ),
    );

    const cache = await scope.caches.open(cacheVersion);
    const requests = await cache.keys();
    const cachedPaths = requests.map(
      (request) => new URL(request.url).pathname,
    );

    return { expected, cachedPaths };
  }, CACHE_VERSION);

  // index.html really references hashed boot assets (sanity on the parse), with at
  // least one JS and one CSS entry.
  expect(discovery.expected.length).toBeGreaterThan(0);
  expect(discovery.expected.some((path) => path.endsWith('.js'))).toBe(true);
  expect(discovery.expected.some((path) => path.endsWith('.css'))).toBe(true);

  // The shell and every referenced boot asset are in the versioned SW cache.
  expect(discovery.cachedPaths).toContain('/index.html');
  expect(discovery.cachedPaths).toContain('/assets/character-profile.png');
  expect(discovery.cachedPaths).toContain(
    '/assets/avatars/avatar-auburn-braid.png',
  );
  expect(discovery.cachedPaths).toContain(
    '/assets/avatars/avatar-short-curls.png',
  );
  expect(discovery.cachedPaths).toContain(
    '/assets/avatars/avatar-wavy-bob.png',
  );
  for (const badge of [
    'p2-change-calculator',
    'p2-code-reader',
    'p2-coffee-change',
    'p2-error-reader',
    'p2-foundation-checkpoint',
    'p2-recall-foundations',
    'p2-values-checkpoint',
  ]) {
    expect(discovery.cachedPaths).toContain(`/assets/badges/${badge}.webp`);
  }
  for (const asset of discovery.expected) {
    expect(discovery.cachedPaths).toContain(asset);
  }

  // 2. Go offline. There is no second online load anywhere after this point.
  await page.context().setOffline(true);

  // 3. Cold start: reload while offline must still boot the app (shell + boot JS
  // served from the SW cache). This fails loudly if boot JS were missing. An
  // offline cold-boot under load is legitimately slower than an in-session
  // assertion, so allow more time than the default expect timeout.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
    timeout: 15000,
  });
  // 4. Core persisted state is visible offline.
  await page.goto('/profile');
  await expect(
    page.getByRole('heading', { name: 'Local profile for Alex' }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole('img', { name: 'Character profile avatar' }).locator('img'),
  ).toHaveAttribute('src', '/assets/character-profile.png');

  // 5. Offline navigation to a not-yet-visited route resolves.
  await page.getByRole('link', { name: 'Insights' }).click();
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();

  // 6. Direct offline boots cover each routed RPG shell shape. Success-only
  // content avoids false passes on the route loading headings.
  await page.goto('/rpg');
  await expect(
    page.getByRole('link', { name: 'Open Campaign Map' }).first(),
  ).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/\/rpg$/);
  await expect(page.locator('.rpg-identity__guild img')).toHaveJSProperty(
    'naturalWidth',
    128,
  );

  await page.goto('/rpg/resource/week-0-lecture');
  await expect(
    page.getByRole('heading', { name: 'Lecture 0: Scratch' }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/\/rpg\/resource\/week-0-lecture$/);

  await page.goto('/rpg/focus?itemId=week-0-lecture');
  await expect(
    page.getByRole('heading', { name: 'Live focus session' }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/\/rpg\/focus\?itemId=week-0-lecture$/);

  // Achievement art was never visited online: it must arrive with boot assets.
  await page.goto('/rpg/badges');
  const badgeImages = page.locator('.rpg-achievement-art[src]');
  await expect(badgeImages).toHaveCount(16);
  for (const badgeImage of await badgeImages.all()) {
    await expect
      .poll(() =>
        badgeImage.evaluate(
          (image) =>
            (image as unknown as { naturalWidth: number }).naturalWidth,
        ),
      )
      .toBeGreaterThan(0);
  }

  await page.context().setOffline(false);
  expect(consoleIssues).toEqual([]);
});

// Installable PWA (v1.6.0). Chromium's own installability check is the
// evidence, not a score. It needs the full Chromium build (the default
// headless shell answers every query with no errors at all, even for a
// manifest without icons) and a persistent profile (an off-the-record
// context always reports "in-incognito"). The profile lives in a short OS
// temp path: under test-results/ on Windows, the worker's cache files exceed
// the path limit and the service worker silently never activates.
test('is installable and launches its start URL offline', async ({
  baseURL,
}) => {
  const profile = mkdtempSync(path.join(tmpdir(), 'progresspal-pwa-'));
  const context = await chromium.launchPersistentContext(profile, {
    baseURL,
    channel: 'chromium',
  });
  const consoleIssues: string[] = [];

  try {
    const page = context.pages()[0] ?? (await context.newPage());

    page.on('console', (message) => {
      // Full Chromium (unlike the headless shell) requests /favicon.ico. The
      // app ships no favicon: the preview server answers 404, production's
      // SPA rewrite answers 200. Only that exact request is ignored.
      if (
        (message.type() === 'error' || message.type() === 'warning') &&
        message.location().url !== new URL('/favicon.ico', baseURL).href
      ) {
        consoleIssues.push(message.text());
      }
    });

    await completeOnboarding(page);
    await waitForServiceWorkerControl(page);

    const cdp = await context.newCDPSession(page);
    const manifest = await cdp.send('Page.getAppManifest');
    expect(manifest.url).toBe(new URL('/manifest.webmanifest', baseURL).href);
    expect(manifest.errors).toEqual([]);
    expect(
      (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors,
    ).toEqual([]);

    // An installed launch opens start_url. Offline, it must cold-start from
    // the cached shell into the RPG home with the learner's data, and the
    // manifest and its icons must still resolve.
    await context.setOffline(true);
    await page.goto('/');
    await expect(page).toHaveURL(/\/rpg$/);
    await expect(
      page.getByRole('heading', { name: 'Home', exact: true }),
    ).toBeVisible({ timeout: 15000 });

    const installFiles = await page.evaluate(async () =>
      Promise.all(
        [
          '/manifest.webmanifest',
          '/icons/icon-192.png',
          '/icons/icon-512.png',
          '/icons/apple-touch-icon.png',
        ].map(async (file) => {
          const response = await fetch(file);
          return `${file} ${response.status} ${response.headers.get('Content-Type')}`;
        }),
      ),
    );
    expect(installFiles).toEqual([
      '/manifest.webmanifest 200 application/manifest+json',
      '/icons/icon-192.png 200 image/png',
      '/icons/icon-512.png 200 image/png',
      '/icons/apple-touch-icon.png 200 image/png',
    ]);
    expect(consoleIssues).toEqual([]);
  } finally {
    await context.close();
    rmSync(profile, { force: true, recursive: true });
  }
});

test('does not cache a 200 HTML rewrite under an unknown asset URL', async ({
  page,
}) => {
  await page.goto('/');
  await completeOnboarding(page);
  await waitForServiceWorkerControl(page);

  const onlineResult = await page.evaluate(async (cacheVersion) => {
    const scope = globalThis as unknown as OfflineBrowserScope;
    const missingAsset = '/assets/missing-runtime-chunk.js';
    const response = await fetch(missingAsset);
    const body = await response.text();
    const cache = await scope.caches.open(cacheVersion);

    return {
      body,
      cached: (await cache.match(missingAsset)) !== undefined,
      status: response.status,
    };
  }, CACHE_VERSION);

  expect(onlineResult.status).toBe(200);
  expect(onlineResult.body).toContain('<!doctype html>');
  expect(onlineResult.cached).toBe(false);

  await page.context().setOffline(true);
  const offlineResult = await page.evaluate(async (cacheVersion) => {
    const scope = globalThis as unknown as OfflineBrowserScope;
    const missingAsset = '/assets/missing-runtime-chunk.js';
    const cache = await scope.caches.open(cacheVersion);
    let fetchRejected = false;

    try {
      await fetch(missingAsset);
    } catch {
      fetchRejected = true;
    }

    return {
      cached: (await cache.match(missingAsset)) !== undefined,
      fetchRejected,
    };
  }, CACHE_VERSION);

  expect(offlineResult).toEqual({ cached: false, fetchRejected: true });
  await page.context().setOffline(false);
});

test('keeps Module 16 reset and onboarding-import recovery working with the service worker active', async ({
  page,
}) => {
  await completeOnboarding(page);
  await waitForServiceWorkerControl(page);

  // Export a backup from settings (the SW must not interfere with the download).
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export local backup' }).click(),
  ]);
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();

  // Reset everything; the app gates back to onboarding.
  await page.getByLabel('Confirmation phrase').fill('RESET');
  await page.getByRole('button', { name: 'Reset all local data' }).click();
  await expect(
    page.getByRole('heading', { name: 'Start with ProgressPal' }),
  ).toBeVisible();

  // Restore from the reachable onboarding recovery control. The protected
  // route intent survives the reset/onboarding round trip.
  await page.getByLabel('Backup file').setInputFiles(backupPath);
  await page.getByRole('button', { name: 'Restore this backup' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page).toHaveURL(/\/settings$/);
});

test('cleans only ProgressPal caches and refreshes the cached shell online', async ({
  page,
}) => {
  // First load: the worker registers, installs, activates, and takes control.
  await page.goto('/');
  await completeOnboarding(page);
  await waitForServiceWorkerControl(page);

  // Unregister the worker so the next load runs a genuine install+activate.
  // Playwright's page.route cannot intercept the service worker's own script
  // fetch, so gating the first activation is impossible; a re-registration
  // cycle is the deterministic way to observe the activate-time purge.
  await page.evaluate(async () => {
    const scope = globalThis as unknown as OfflineBrowserScope;
    const registrations =
      (await scope.navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );
  });

  // Seed a foreign same-origin cache and a legacy ProgressPal cache while no
  // worker is active. Cache Storage persists independently of registration,
  // so both caches are present when the re-registered worker activates.
  await page.evaluate(async () => {
    const scope = globalThis as unknown as OfflineBrowserScope;

    const foreign = await scope.caches.open('unrelated-origin-cache');
    await foreign.put('/foreign', new Response('foreign'));

    const legacy = await scope.caches.open('progresspal-cache-v1');
    await legacy.put('/legacy', new Response('legacy'));
  });

  // Reload: boot re-registers the worker; install+activate run the
  // prefix-guarded purge with the legacy cache present, then take control.
  await page.reload();
  await waitForServiceWorkerControl(page);

  const cacheKeys = await page.evaluate(async () => {
    const scope = globalThis as unknown as OfflineBrowserScope;
    return scope.caches.keys();
  });

  expect(cacheKeys).toContain('unrelated-origin-cache');
  expect(cacheKeys).toContain(CACHE_VERSION);
  expect(cacheKeys).not.toContain('progresspal-cache-v1');

  // An online navigation is network-first and refreshes the cached shell, so
  // the cached /index.html must match a fresh network fetch of the shell.
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  const shells = await page.evaluate(async (cacheVersion) => {
    const scope = globalThis as unknown as OfflineBrowserScope;
    const cache = await scope.caches.open(cacheVersion);
    const cached = await cache.match('/index.html', {
      ignoreSearch: true,
      ignoreVary: true,
    });
    const fresh = await fetch('/index.html', { cache: 'no-cache' });

    return {
      cachedShell: cached ? await cached.text() : null,
      freshShell: await fresh.text(),
    };
  }, CACHE_VERSION);

  expect(shells.cachedShell).not.toBeNull();
  expect(shells.cachedShell).toBe(shells.freshShell);
});

// Owner decision 2026-10-03: the packaged Python runtime is cached the first
// time it is used online (only the files runtime/offline.json lists, each
// with its exact type) and then evaluates programs with no network at all.
test('evaluates a program offline after the Python runtime was used once online', async ({
  page,
}) => {
  const consoleIssues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleIssues.push(message.text());
    }
  });

  await completeOnboarding(page);
  await waitForServiceWorkerControl(page);
  await page.goto('/settings');
  await page
    .getByLabel('Programme to switch to')
    .selectOption('programvareutvikling');
  await page.getByRole('button', { name: 'Enrol and switch' }).click();
  await expect(
    page.getByText('Active programme: Programvareutvikling'),
  ).toBeVisible();

  const program = page
    .getByRole('group', { name: /^Oppgave \d+ · Skriv eller endre program/ })
    .filter({ hasText: 'skriver ut tre linjer' });
  const field = program.getByRole('textbox', { name: 'Svaret ditt' });

  await page.goto('/course/s1-m01-o03');
  await expect(field).toBeEnabled({ timeout: 60_000 });

  const runtimeList = JSON.parse(
    readFileSync(
      path.resolve(process.cwd(), 'dist/runtime/offline.json'),
      'utf8',
    ),
  ) as { assets: string[] };
  const cachedPaths = await page.evaluate(async (cacheVersion) => {
    const scope = globalThis as unknown as OfflineBrowserScope;
    const cache = await scope.caches.open(cacheVersion);
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  }, CACHE_VERSION);

  expect(cachedPaths).toContain('/runtime/offline.json');
  for (const asset of runtimeList.assets) {
    expect(cachedPaths).toContain(asset);
  }

  await page.context().setOffline(true);
  await page.reload();
  await expect(field).toBeEnabled({ timeout: 60_000 });
  await field.fill(
    'print("Hei!")\nprint("Jeg heter Kari.")\nprint("Jeg lærer Python.")',
  );
  await program.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(program.getByRole('status', { name: 'Resultat' })).toContainText(
    'Riktig',
    { timeout: 60_000 },
  );

  await page.context().setOffline(false);
  expect(consoleIssues).toEqual([]);
});
