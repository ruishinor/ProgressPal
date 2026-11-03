import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding } from './support/onboarding';

const route = (part: number) => '/rpg/resource/git-m01-o0' + part;
const exercise = (page: Page, number: number) =>
  page.getByRole('group', {
    name: new RegExp('^Oppgave ' + number + ' · '),
  });
async function switchProgramme(page: Page, id: string) {
  await page.goto('/settings');
  await page.getByLabel('Programme to switch to').selectOption(id);
  await page
    .getByRole('button', { name: /^(Enrol and switch|Switch programme)$/ })
    .click();
  await expect(page.getByLabel('Programme to switch to')).not.toHaveValue(id);
}
async function counts(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const names = ['learner_evidence', 'lesson_positions', 'xp_transactions'];
      return await Promise.all(
        names.map(
          (name) =>
            new Promise<number>((resolve, reject) => {
              const request = db.transaction(name).objectStore(name).count();
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            }),
        ),
      );
    } finally {
      db.close();
    }
  });
}

test('starts from zero, explains wrong answers, records external reports honestly, resumes and switches programmes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await completeOnboarding(page, { programme: 'Git & GitHub' });
  await page.goto('/rpg/map');
  await page
    .getByRole('link', { name: 'Start her: hvorfor bruke Git?', exact: true })
    .click();
  await expect(
    page.getByText('Start her: hvorfor bruke Git?', { exact: true }).first(),
  ).toBeVisible();
  await page.goto(route(1));
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Start her: hvorfor bruke Git?',
    }),
  ).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Planlagt');
  await expect(page.getByRole('table')).toContainText('GitHub og samarbeid');
  const first = exercise(page, 1);
  await first
    .getByRole('radio', { name: /Git registrerer automatisk/ })
    .check();
  await first.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(first.getByRole('status', { name: 'Resultat' })).toContainText(
    'Git lager ingen commit av seg selv',
  );
  await first.getByRole('button', { name: 'Prøv igjen' }).click();
  const correct = first.getByRole('radio', {
    name: /Lagring i Notisblokk oppdaterer filen/,
  });
  await correct.focus();
  await page.keyboard.press('Space');
  await first.getByRole('button', { name: 'Sjekk svaret' }).focus();
  await page.keyboard.press('Enter');
  await expect(first.getByRole('status', { name: 'Resultat' })).toContainText(
    'Svaret passer',
  );
  await page.reload();
  await expect(
    exercise(page, 1).getByRole('status', { name: 'Resultat' }),
  ).toContainText('Svaret passer');
  await expect(
    page.getByRole('heading', { name: 'Fortsett der du slapp' }),
  ).toBeVisible();
  await page
    .getByRole('link', {
      name: 'Gjør klar Windows og øvingsmappen',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Gjør klar Windows og øvingsmappen',
    }),
  ).toBeVisible();
  await exercise(page, 1).getByRole('checkbox').first().check();
  await exercise(page, 1)
    .getByRole('button', { name: 'Lagre egenrapport' })
    .click();
  await expect(
    exercise(page, 1).getByRole('status', { name: 'Resultat' }),
  ).toContainText('uten vurdering');
  for (const part of [3, 4, 5]) {
    await page
      .getByRole('link', {
        name: [
          '',
          '',
          '',
          'Lag og undersøk den første versjonen',
          'Velg innholdet i neste commit',
          'Prøv selv: et endret mål',
        ][part],
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(new RegExp('git-m01-o0' + part + '$'));
  }
  const paste = exercise(page, 2);
  await paste.getByRole('textbox').fill('README.txt\nplan.txt');
  await paste.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(paste.getByRole('status', { name: 'Resultat' })).toContainText(
    'README.txt står fortsatt',
  );
  await paste.getByRole('button', { name: 'Prøv igjen' }).click();
  await paste.getByRole('textbox').fill('plan.txt');
  await paste.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(paste.getByRole('status', { name: 'Resultat' })).toContainText(
    'kjøring og filinnhold er ikke bekreftet',
  );
  const reflection = exercise(page, 3);
  await reflection
    .getByRole('textbox')
    .fill('Jeg fikk ikke laget siste commit. <img src=x onerror=alert(1)>');
  await reflection.getByRole('button', { name: 'Lagre egenrapport' }).click();
  await expect(
    reflection.getByRole('status', { name: 'Resultat' }),
  ).toContainText('uten vurdering');
  await expect(reflection.locator('img')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Mark locally complete', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Local status:' }),
  ).toContainText('Completed');
  const before = await counts(page);
  expect(before[0]).toBe(12); // Six submitted attempts, each with its terminal result.
  expect(before[1]).toBeGreaterThan(0);
  expect(before[2]).toBe(0);
  await switchProgramme(page, 'cs50x');
  await page.goto('/rpg');
  await expect(
    page.getByText('CS Foundations', { exact: true }).first(),
  ).toBeVisible();
  await switchProgramme(page, 'git-github');
  await page.goto(route(5));
  await expect(
    exercise(page, 3).getByRole('status', { name: 'Resultat' }),
  ).toContainText('uten vurdering');
  await expect(
    page.getByRole('heading', { name: 'Fortsett der du slapp' }),
  ).toBeVisible();
  expect(await counts(page)).toEqual(before);
  expect(errors).toEqual([]);
});

for (const theme of ['light', 'dark'] as const) {
  for (const part of [1, 2, 3, 4, 5]) {
    test(`keeps lesson ${part} within 320px at 200% root text with accessible controls in ${theme} theme`, async ({
      page,
    }) => {
      await completeOnboarding(page, { programme: 'Git & GitHub', theme });
      await page.setViewportSize({ width: 320, height: 900 });
      await page.goto(route(part));
      await expect(page.getByRole('article')).toBeVisible();
      await expect(exercise(page, 1)).toBeVisible();
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.fontSize = '200%';
      }, theme);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      if (part === 1 || part === 5 || (part === 2 && theme === 'light')) {
        const scan = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        expect(scan.violations).toEqual([]);
      }
    });
  }
}

test('copies only the intended commands and keeps command blocks usable by keyboard', async ({
  page,
  context,
}, testInfo) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (
      /^https?:/.test(request.url()) &&
      new URL(request.url()).hostname !== '127.0.0.1'
    ) {
      externalRequests.push(request.url());
    }
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await completeOnboarding(page, { programme: 'Git & GitHub', theme: 'light' });
  await page.goto(route(3));
  const command = page
    .getByRole('group', { name: 'Kommando – PowerShell 5.1', exact: true })
    .filter({ hasText: 'git init -b main' });
  await command.getByRole('button', { name: 'Kopier', exact: true }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("throw 'STOPP: Gaa tilbake til ovingsmappen.'");
  expect(copied).toContain('git init -b main');
  expect(copied).not.toMatch(/Initialized empty|PS C:/);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await command.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('git-desktop-commands.png'),
  });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const pre = command.locator('pre');
  const geometry = await pre.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    available: element.closest('figure')!.parentElement!.clientWidth,
  }));
  expect(geometry.width).toBeGreaterThanOrEqual(geometry.available * 0.9);
  await pre.focus();
  await expect(pre).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => pre.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await page.screenshot({
    path: testInfo.outputPath('git-mobile-commands-keyboard.png'),
  });
  expect(externalRequests).toEqual([]);
});
