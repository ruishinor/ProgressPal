import { expect, test } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

/**
 * Epic G, Stage 1: the cloud feature is OFF by default and must be invisible on
 * the network. This spec runs the normal production preview (under the real
 * CSP) and fails if the application ever contacts a Nhost host, or any other
 * origin, while cloud is disabled. A source search alone would not prove this;
 * the browser's own request log does.
 */

const NHOST_HOST = /(^|\.)nhost\.run$/i;
const PROJECT_HOSTS = [
  'enuikiiweoscywaixedr.auth.eu-north-1.nhost.run',
  'enuikiiweoscywaixedr.graphql.eu-north-1.nhost.run',
];

const representativeRoutes = [
  '/rpg',
  '/rpg/map',
  '/rpg/hero',
  '/rpg/badges',
  '/rpg/log',
  '/rpg/settings',
  '/dashboard',
  '/course',
  '/sessions',
  '/achievements',
  '/insights',
  '/settings',
  // The email-link landing route, bare and with a code in the address: with
  // cloud off it must clean the address and send nothing (Epic G).
  '/cloud/callback',
  '/cloud/callback?code=abcdefgh12345678&keep=1',
];

test('cloud disabled (default): normal local use makes no request to any Nhost host or any foreign origin', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);

  const own = new URL(baseURL ?? 'http://127.0.0.1:42183').origin;
  const seen: string[] = [];

  page.context().on('request', (request) => seen.push(request.url()));

  await completeOnboarding(page);

  for (const route of representativeRoutes) {
    await page.goto(route);
    await expect(
      page.locator('main, [role="main"], #root').first(),
    ).toBeVisible();
  }

  await page.reload();
  await expect(page.locator('#root')).not.toBeEmpty();

  const foreign = seen.filter((url) => {
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return false;
    }

    return new URL(url).origin !== own;
  });
  const nhost = seen.filter((url) => NHOST_HOST.test(new URL(url).hostname));

  expect(seen.length).toBeGreaterThan(10); // the capture really saw the session
  expect(nhost).toEqual([]);
  expect(foreign).toEqual([]);

  // Nothing cloud-related was created in browser storage either.
  const keys = (await page.evaluate(`
    JSON.stringify({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    })
  `)) as string;

  expect(keys).not.toMatch(/nhost|progresspal:cloud/i);
});

test('instrument check: the same capture does see a request to an allowed Nhost origin (answered locally, never sent)', async ({
  page,
}) => {
  const seen: string[] = [];

  page.context().on('request', (request) => seen.push(request.url()));
  // Fulfilled inside the browser: no real connection to the provider is made.
  await page.context().route(`https://${PROJECT_HOSTS[0]}/**`, (route) =>
    route.fulfill({
      status: 204,
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
  await page.goto('/');

  await page.evaluate(
    `fetch('https://${PROJECT_HOSTS[0]}/v1/healthz', { mode: 'no-cors' })`,
  );

  expect(seen.filter((url) => NHOST_HOST.test(new URL(url).hostname))).toEqual([
    `https://${PROJECT_HOSTS[0]}/v1/healthz`,
  ]);
});

test('the served CSP allows exactly self plus the two Stockholm Nhost origins, and nothing else', async ({
  page,
}) => {
  const response = await page.request.get('/');
  const csp = response.headers()['content-security-policy'] ?? '';
  const directives = new Map(
    csp.split(';').map((directive) => {
      const [name = '', ...sources] = directive.trim().split(/\s+/);

      return [name, sources] as const;
    }),
  );

  expect(directives.get('connect-src')).toEqual([
    "'self'",
    ...PROJECT_HOSTS.map((host) => `https://${host}`),
  ]);
  expect(csp).not.toMatch(/\bwss?:|\*|'unsafe-eval'/);
  expect(directives.get('script-src')).toEqual([
    "'self'",
    "'wasm-unsafe-eval'",
  ]);
  expect(directives.get('worker-src')).toEqual(["'self'"]);
});

test('the browser itself refuses a Storage/Functions host, a WebSocket and foreign origins', async ({
  page,
}) => {
  await page.goto('/');

  // Each probe targets a host the CSP does not allow, so the browser blocks it
  // before any connection is attempted; none of these reaches the network.
  const outcome = (await page.evaluate(`
    (async () => {
      const violations = [];
      document.addEventListener('securitypolicyviolation', (event) => {
        violations.push(event.violatedDirective);
      });
      const blocked = {};
      const probes = {
        storageHost: 'https://enuikiiweoscywaixedr.storage.eu-north-1.nhost.run/v1/files',
        functionsHost: 'https://enuikiiweoscywaixedr.functions.eu-north-1.nhost.run/v1/x',
        otherRegion: 'https://enuikiiweoscywaixedr.auth.eu-central-1.nhost.run/v1/healthz',
        foreign: 'https://example.invalid/',
      };
      for (const [label, url] of Object.entries(probes)) {
        try {
          await fetch(url, { mode: 'no-cors' });
          blocked[label] = false;
        } catch {
          blocked[label] = true;
        }
      }
      try {
        const socket = new WebSocket('wss://enuikiiweoscywaixedr.graphql.eu-north-1.nhost.run/v1');
        await new Promise((resolve) => {
          socket.onerror = () => resolve('error');
          socket.onopen = () => resolve('open');
        });
        blocked.websocket = true;
      } catch {
        blocked.websocket = true;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
      return JSON.stringify({ blocked, violations });
    })()
  `)) as string;
  const parsed = JSON.parse(outcome) as {
    blocked: Record<string, boolean>;
    violations: string[];
  };

  expect(parsed.blocked).toEqual({
    storageHost: true,
    functionsHost: true,
    otherRegion: true,
    foreign: true,
    websocket: true,
  });
  expect(parsed.violations.length).toBeGreaterThanOrEqual(5);
  expect(new Set(parsed.violations)).toEqual(new Set(['connect-src']));
});
