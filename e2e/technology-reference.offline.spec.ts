import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { completeOnboarding } from './support/onboarding';

test('reference: cold offline opens a never-visited entry and its relation', async ({
  page,
  context,
}) => {
  await completeOnboarding(page);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const footprint = await page.evaluate(async () => {
    const entries = [];
    for (const name of await caches.keys()) {
      if (!name.startsWith('progresspal-cache-')) continue;
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        entries.push({
          path: new URL(request.url).pathname,
          bytes: (await response!.arrayBuffer()).byteLength,
        });
      }
    }
    return entries.sort((a, b) => a.path.localeCompare(b.path));
  });
  expect(
    footprint.some((entry) => /\/assets\/index-.*\.js$/.test(entry.path)),
  ).toBe(true);
  expect(footprint.some((entry) => /pyodide.*\.wasm$/.test(entry.path))).toBe(
    false,
  );
  mkdirSync('artifacts/technology-reference', { recursive: true });
  writeFileSync(
    'artifacts/technology-reference/cache-footprint.json',
    JSON.stringify(
      {
        totalBytes: footprint.reduce((sum, entry) => sum + entry.bytes, 0),
        entries: footprint,
      },
      null,
      2,
    ) + '\n',
  );
  // Neither the index nor this entry has been opened online.
  const cold = await context.newPage();
  await page.close();
  await context.setOffline(true);
  await cold.goto('/rpg/oppslag/kubernetes?q=K8s&tema=Drift');
  await expect(cold.getByRole('heading', { level: 1 })).toHaveText(
    'Kubernetes',
  );
  await cold.getByRole('link', { name: 'API', exact: true }).click();
  await expect(cold.getByRole('heading', { level: 1 })).toHaveText('API');
  await cold.reload();
  await expect(cold.getByRole('heading', { level: 1 })).toHaveText('API');
  await cold.getByRole('link', { name: 'Tilbake til søk og tema' }).click();
  await expect(cold.getByRole('searchbox')).toHaveValue('K8s');
  await expect(
    cold.getByRole('combobox', { name: 'Tema', exact: true }),
  ).toHaveValue('Drift');
  await expect(
    cold.getByText('Alias-treff: K8s', { exact: false }),
  ).toBeVisible();
  await cold.getByRole('searchbox').fill('Kub');
  const suggestions = cold.getByRole('list', { name: 'Søkeforslag' });
  await expect(suggestions.getByRole('link')).toHaveText(['Kubernetes']);
  await suggestions.getByRole('link').click();
  await expect(cold.getByRole('heading', { level: 1 })).toHaveText(
    'Kubernetes',
  );
});
