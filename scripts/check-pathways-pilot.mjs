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
      // Retry only while the local preview server starts.
    }
    await delay(250);
  }
  assert(ready, 'Pilot preview did not start');

  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(origin);
  await expect(page.getByRole('heading', { name: 'Velkommen til Pathways' })).toBeVisible();
  await page.getByRole('button', { name: 'Start Pathways' }).click();
  await expect(page.getByRole('heading', { name: 'Pathways', exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pathways', exact: true })).toBeVisible();

  for (const forbidden of ['/dashboard', '/rpg', '/course', '/settings', '/profile']) {
    await page.goto(origin + forbidden);
    await expect(page).toHaveURL(origin + '/pathways');
  }
  await page.goto(origin + '/pathways/git-github');
  await expect(
    page.getByRole('heading', { name: 'Git & GitHub: fra første endring til samarbeid' }),
  ).toBeVisible();
  await page.goto(origin + '/pathways');
  await page.getByRole('link', { name: 'Begynn med første leksjon' }).click();
  await expect(page).toHaveURL(/\/pathways\/git-github\/[^/]+$/);
  await expect(page.getByRole('link', { name: 'Alle Pathways' })).toBeVisible();
  console.log('Pathways-only pilot smoke passed');
} finally {
  await browser?.close();
  server.kill();
}
