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
      const settings = page.getByRole('button', { name: 'Visningsinnstillinger' });
      await expect(settings).toBeVisible();
      await expect(settings).toHaveAttribute('aria-expanded', 'false');
      await settings.click();
      await expect(settings).toHaveAttribute('aria-expanded', 'true');
      const theme = page.getByLabel('Fargetema');
      await theme.selectOption('dark');
      await expect.poll(() =>
        page.evaluate(() => document.documentElement.dataset.theme),
      ).toBe('dark');
      await page.reload();
      await settings.click();
      await expect(page.getByLabel('Fargetema')).toHaveValue('dark');
      await page.getByRole('link', { name: 'RPG', exact: true }).click();
      await expect(settings).toHaveAttribute('aria-expanded', 'false');
      await settings.click();
      await expect(page).toHaveURL(origin + '/rpg/pathways');
      await expect(page.getByLabel('RPG-stil')).toBeVisible();
      await page.getByLabel('RPG-stil').selectOption('glass');
      await expect.poll(() =>
        page.evaluate(() => document.body.dataset.rpgStyle),
      ).toBe('glass');
      await noOverflow();
      await page.keyboard.press('Escape');
      await expect(settings).toHaveAttribute('aria-expanded', 'false');
      await settings.click();
      await page.getByRole('button', { name: 'Lukk visningsinnstillinger' }).click();
      await expect(settings).toHaveAttribute('aria-expanded', 'false');
      await settings.click();
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
      const classicLayout = await page.locator('.pilot-content .lesson:not(.lesson--rpg)').evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width, viewport: document.documentElement.clientWidth };
      });
      if (viewport.width >= 960) {
        assert(
          Math.abs(classicLayout.left - (classicLayout.viewport - classicLayout.right)) < 3,
          'Classic lesson must be centered on desktop',
        );
        assert(
          classicLayout.width < classicLayout.viewport * 0.85,
          'Classic reading measure must not fill the desktop canvas',
        );
      }
      await settings.click();
      const choices = await page.locator('.pilot-segment a').evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          const parent = element.closest('.pilot-header')?.getBoundingClientRect();
          return { left: box.left, right: box.right, parentLeft: parent?.left ?? 0, parentRight: parent?.right ?? 0 };
        }),
      );
      assert(
        choices.every(({ left, right, parentLeft, parentRight }) => left >= parentLeft - 1 && right <= parentRight + 1),
        'Both mode choices must be fully visible in the pilot header',
      );
      await page.getByRole('link', { name: 'RPG', exact: true }).click();
      await expect(page).toHaveURL(/\/rpg\/pathways\/git-github\/[^/]+$/);
      await expect(settings).toHaveAttribute('aria-expanded', 'false');
      await noOverflow();
      const header = page.locator('.pilot-header');
      const gearBounds = await settings.boundingBox();
      const headerBounds = await header.boundingBox();
      assert(gearBounds && headerBounds, 'Gear and header must have a visible layout');
      assert(gearBounds.x >= headerBounds.x - 1 && gearBounds.x + gearBounds.width <= headerBounds.x + headerBounds.width + 1, 'Gear stays inside header');
      const headerLayout = await page.locator(
        '.pilot-content .lesson--rpg > .lesson-header.rpg-page-header',
      ).evaluate((header) => {
        const title = header.querySelector('h1');
        const goal = header.querySelector('.rpg-page-lede');
        const box = header.getBoundingClientRect();
        return {
          display: getComputedStyle(header).display,
          width: box.width,
          titleLeft: title?.getBoundingClientRect().left,
          goalLeft: goal?.getBoundingClientRect().left,
          goalTop: goal?.getBoundingClientRect().top,
          titleTop: title?.getBoundingClientRect().top,
        };
      });
      assert.equal(headerLayout.display, 'grid', 'RPG lesson header must use grid');
      if (viewport.width >= 960) {
        assert(
          headerLayout.goalLeft > headerLayout.titleLeft,
          'Desktop lesson goal must form a coherent second column',
        );
        assert(
          Math.abs(headerLayout.goalTop - headerLayout.titleTop) < 15,
          'Desktop lesson title and goal must align on the same row',
        );
        assert(
          headerLayout.width <= 1025,
          'Desktop lesson surface must use a bounded reading measure',
        );
      }
      for (const forbidden of ['/dashboard', '/rpg', '/course', '/settings', '/profile']) {
        await page.goto(origin + forbidden);
        await expect(page).toHaveURL(origin + '/pathways');
      }
      await expect(page.getByRole('heading', { name: 'Pathways', exact: true })).toBeVisible();
      const otherContent = await page.evaluate(async () => {
        const response = await fetch('/content/programvareutvikling/index.6510252460651033.json');
        return {
          status: response.status,
          contentType: response.headers.get('content-type') ?? '',
        };
      });
      assert(
        otherContent.status === 404 || !otherContent.contentType.includes('json'),
        'Non-Pathways course catalogue must not be served by pilot deployment',
      );
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
