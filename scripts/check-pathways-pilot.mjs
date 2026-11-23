import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';

const origin = 'http://127.0.0.1:4179';
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4179', '--strictPort'],
  { stdio: 'ignore' },
);
const viewports = [
  { width: 320, height: 780 },
  { width: 360, height: 780 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
];
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) throw new Error('Pilot preview server exited');
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // Preview is still starting.
    }
    await delay(250);
  }
  assert(ready, 'Pilot preview did not start');

  browser = await chromium.launch();
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    try {
      await page.goto(origin);
      await expect(page.getByRole('heading', { name: 'Velkommen til Pathways' })).toBeVisible();
      await page.getByRole('button', { name: 'Start Pathways' }).click();
      await expect(page.getByRole('heading', { name: 'Pathways', exact: true })).toBeVisible({
        timeout: 20_000,
      });
      const noOverflow = async () => {
        const widths = await page.evaluate(() => ({
          doc: document.documentElement.scrollWidth,
          viewport: document.documentElement.clientWidth,
        }));
        assert(
          widths.doc <= widths.viewport + 1,
          'Horizontal overflow at ' + viewport.width + 'px: ' + JSON.stringify(widths),
        );
      };
      await noOverflow();
      const theme = page.getByLabel('Fargetema');
      await theme.selectOption('dark');
      await expect.poll(() =>
        page.evaluate(() => document.documentElement.dataset.theme),
      ).toBe('dark');
      await page.reload();
      await expect(page.getByLabel('Fargetema')).toHaveValue('dark');
      await page.getByRole('link', { name: 'RPG', exact: true }).click();
      await expect(page).toHaveURL(origin + '/rpg/pathways');
      await expect(page.getByLabel('RPG-stil')).toBeVisible();
      await page.getByLabel('RPG-stil').selectOption('glass');
      await expect.poll(() =>
        page.evaluate(() => document.body.dataset.rpgStyle),
      ).toBe('glass');
      await noOverflow();

      await page.getByRole('link', { name: 'Klassisk' }).click();
      await expect(page).toHaveURL(origin + '/pathways');
      await page.getByRole('link', { name: 'Git & GitHub', exact: true }).click();
      await expect(page).toHaveURL(origin + '/pathways/git-github');
      await noOverflow();
      await page.locator('.pathways-track__lesson-list a').first().click();
      await expect(page.getByRole('button', { name: 'Marker som fullført lokalt' })).toBeVisible();
      await noOverflow();
      await page.getByRole('button', { name: 'Marker som fullført lokalt' }).click();
      await expect(page.getByRole('button', { name: 'Åpne leksjonen igjen' })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('button', { name: 'Åpne leksjonen igjen' })).toBeVisible();
      await page.getByRole('link', { name: 'RPG', exact: true }).click();
      await expect(page).toHaveURL(/\/rpg\/pathways\/git-github\/[^/]+$/);
      await noOverflow();
      for (const forbidden of ['/dashboard', '/rpg', '/course', '/settings', '/profile']) {
        await page.goto(origin + forbidden);
        await expect(page).toHaveURL(origin + '/pathways');
      }
      await expect(page.getByRole('heading', { name: 'Pathways', exact: true })).toBeVisible();
      assert.deepEqual(pageErrors, [], 'Unexpected browser errors at ' + viewport.width + 'px');
      console.log('Pilot passed at ' + viewport.width + 'px');
    } finally {
      await context.close();
    }
  }
  console.log('Pathways-only pilot responsive smoke passed');
} finally {
  await browser?.close();
  server.kill();
}
