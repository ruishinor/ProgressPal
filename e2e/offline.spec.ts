import { expect, test, type Page } from '@playwright/test';

const CACHE_VERSION = 'progresspal-cache-v1';

// e2e specs are type-checked under tsconfig.node.json (lib: ES2022, no DOM), so
// browser globals used inside page.evaluate() are accessed through this typed
// view of the page's global scope.
interface OfflineBrowserScope {
  caches: {
    delete(name: string): Promise<boolean>;
    keys(): Promise<string[]>;
    open(name: string): Promise<{ keys(): Promise<Array<{ url: string }>> }>;
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

async function completeOnboarding(page: Page) {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Create your local learner profile' }),
  ).toBeVisible();

  await page.getByLabel('Display name').fill('Alex');
  await page.getByLabel('Target minutes per week').fill('360');
  await page.getByLabel('Face shape').selectOption('square');
  await page.getByLabel('Hair').selectOption('parted');
  await page.getByLabel('Top color').selectOption('ocean');
  await page.getByLabel('Theme').selectOption('dark');
  await page.getByLabel('Reduce motion in this app').check();
  await page.getByRole('button', { name: 'Save and open dashboard' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
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
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Local profile for Alex' }),
  ).toBeVisible({ timeout: 15000 });

  // 5. Offline navigation to a not-yet-visited route resolves.
  await page.getByRole('link', { name: 'Insights' }).click();
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();

  await page.context().setOffline(false);
  expect(consoleIssues).toEqual([]);
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
    page.getByRole('heading', { name: 'Create your local learner profile' }),
  ).toBeVisible();

  // Restore from the reachable onboarding recovery control.
  await page.getByLabel('Backup file').setInputFiles(backupPath);
  await page.getByRole('button', { name: 'Restore this backup' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
