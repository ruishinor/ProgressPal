import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding } from './support/onboarding';
import { pathwayState } from './support/pathways';

const route = (part: number) => '/rpg/pathways/git-github/git-m01-o0' + part;
const exercise = (page: Page, number: number) =>
  page.getByRole('group', {
    name: new RegExp('^Oppgave ' + number + ' · '),
  });
// The roadmap opens the current module automatically, but other modules
// remain collapsed. Never toggle a module closed when it is already open.
async function showModuleLessons(page: Page, module: string) {
  await expect(page.locator('.pathways-track__progress-summary')).toBeVisible();
  const details = page.locator('.pathways-track__roadmap details').filter({
    has: page.locator('a[href$="/git-' + module + '-o01"]'),
  });
  const summary = details.locator('summary');
  if ((await details.getAttribute('open')) === null) {
    await summary.click();
  }
  await expect(details).toHaveAttribute('open', '');
  return details;
}

async function followSavedPosition(page: Page) {
  const article = page.getByRole('article', { name: /\S/ });
  const resume = article.locator('a[href^="#"][href*="-step-"]');
  await expect(resume).toHaveAttribute('href', /-step-[1-9]\d*$/);
  const href = (await resume.getAttribute('href'))!;
  await expect(article.locator('[id="' + href.slice(1) + '"]')).toBeVisible();
  await resume.click();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe(href);
}

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

test('opens the Git roadmap from a fresh profile and visits lessons across modules', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await completeOnboarding(page);
  const primary = await pathwayState(page);
  await page.goto('/rpg');
  const pathwaysInfo = page.getByRole('button', { name: 'Om Pathways' });
  await pathwaysInfo.focus();
  await page.keyboard.press('Enter');
  await expect(pathwaysInfo).toHaveAttribute('aria-expanded', 'true');
  const details = await pathwaysInfo.getAttribute('aria-controls');
  await expect(page.locator('[id="' + details + '"]')).toBeVisible();
  await page.getByRole('link', { name: 'Pathways', exact: true }).click();
  await page
    .getByRole('link', {
      name: 'Git & GitHub (trykk her for oversikt)',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Hvorfor lære dette?' }),
  ).toBeVisible();
  const m07Lessons = await showModuleLessons(page, 'm07');
  await expect(m07Lessons.getByRole('link')).toHaveCount(8);
  await expect(
    m07Lessons.getByRole('link', {
      name: 'Du overtar et lite utviklingsprosjekt',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page
      .locator('.pathways-track__progress-summary')
      .getByRole('link', { name: /\S/ }),
  ).toHaveAttribute('href', route(1));
  await showModuleLessons(page, 'm02');
  await expect(
    page.getByRole('link', { name: 'Når en gammel versjon er riktig' }),
  ).toBeVisible();
  await showModuleLessons(page, 'm05');
  await expect(
    page.getByRole('link', { name: 'Fra behov til et samarbeid om endring' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Fra behov til et samarbeid om endring' })
    .click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Fra behov til et samarbeid om endring',
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('link', { name: 'Git & GitHub — oversikt' }).click();
  await showModuleLessons(page, 'm02');
  await page
    .getByRole('link', { name: 'Når en gammel versjon er riktig' })
    .click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Når en gammel versjon er riktig',
    }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Git & GitHub — oversikt' }).click();
  await showModuleLessons(page, 'm01');
  await page
    .getByRole('link', { name: 'Start her: hvorfor bruke Git?', exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(route(1) + '$'));
  await page.goto(route(1));
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Start her: hvorfor bruke Git?',
    }),
  ).toBeVisible();
  await page.goto('/rpg/pathways/git-github');
  await showModuleLessons(page, 'm03');
  await expect(
    page.getByRole('link', { name: 'Hvorfor arbeide med branches?' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Hvorfor arbeide med branches?' })
    .click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Hvorfor arbeide med branches?',
    }),
  ).toBeVisible();
  expect((await pathwayState(page)).appMeta).toEqual(primary.appMeta);
  expect(errors).toEqual([]);
});

test('explains Git answers and preserves learner evidence through reload and programme switches', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await completeOnboarding(page);
  const primary = await pathwayState(page);
  await page.goto(route(1));
  const first = exercise(page, 1);
  await first
    .getByRole('radio', { name: /Git registrerer automatisk/ })
    .check();
  await first.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(first.getByRole('status', { name: 'Resultat' })).toHaveClass(
    /lesson-result--neutral/,
  );
  await first.getByRole('button', { name: 'Prøv igjen' }).click();
  const correct = first.getByRole('radio', {
    name: /Lagring i Notisblokk oppdaterer filen/,
  });
  await correct.focus();
  await page.keyboard.press('Space');
  await first.getByRole('button', { name: 'Sjekk svaret' }).focus();
  await page.keyboard.press('Enter');
  await expect(first.getByRole('status', { name: 'Resultat' })).toHaveClass(
    /lesson-result--success/,
  );
  await page.reload();
  await expect(
    exercise(page, 1).getByRole('status', { name: 'Resultat' }),
  ).toHaveClass(/lesson-result--success/);
  await followSavedPosition(page);
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
    .getByRole('button', { name: 'Lagre svaret mitt' })
    .click();
  await expect(
    exercise(page, 1).getByRole('status', { name: 'Resultat' }),
  ).toHaveClass(/lesson-result--neutral/, { timeout: 15_000 });
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
  await expect(paste.getByRole('status', { name: 'Resultat' })).toHaveClass(
    /lesson-result--neutral/,
  );
  await paste.getByRole('button', { name: 'Prøv igjen' }).click();
  await paste.getByRole('textbox').fill('plan.txt');
  await paste.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(paste.getByRole('status', { name: 'Resultat' })).toHaveClass(
    /lesson-result--success/,
  );
  const reflection = exercise(page, 3);
  await reflection
    .getByRole('textbox')
    .fill('Jeg fikk ikke laget siste commit. <img src=x onerror=alert(1)>');
  await reflection.getByRole('button', { name: 'Lagre svaret mitt' }).click();
  await expect(
    reflection.getByRole('status', { name: 'Resultat' }),
  ).toHaveClass(/lesson-result--neutral/, { timeout: 15_000 });
  await expect(reflection.locator('img')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Marker som fullført', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Leksjonsstatus' }).getByRole('status'),
  ).toContainText('Fullført');
  expect((await pathwayState(page)).appMeta).toEqual(primary.appMeta);
  const before = await counts(page);
  expect(before[0]).toBe(12); // Six submitted attempts, each with its terminal result.
  const outcomes = (await pathwayState(page)).evidence.flatMap((row) =>
    row.kind === 'evaluation_result' ? [row.outcome] : [],
  );
  expect(outcomes.sort()).toEqual([
    'correct',
    'correct',
    'incorrect',
    'incorrect',
    'recorded',
    'recorded',
  ]);
  expect(before[1]).toBeGreaterThan(0);
  expect(before[2]).toBe(0);
  await switchProgramme(page, 'programvareutvikling');
  await page.goto('/rpg');
  expect((await pathwayState(page)).activeProgrammeId).toBe(
    'programvareutvikling',
  );
  await switchProgramme(page, 'cs50x');
  await page.goto(route(5));
  await expect(
    exercise(page, 3).getByRole('status', { name: 'Resultat' }),
  ).toHaveClass(/lesson-result--neutral/);
  await followSavedPosition(page);
  expect(await counts(page)).toEqual(before);
  expect((await pathwayState(page)).activeProgrammeId).toBe('cs50x');
  expect(errors).toEqual([]);
});

test('opens the exact staging correction from lesson five without changing progress', async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto(route(5));
  const article = page.getByRole('article');
  const reference = article.getByRole('link', { name: '«Rett bare utvalget»' });
  await expect(reference).toHaveAttribute(
    'href',
    route(4) + '#rett-bare-utvalget',
  );
  const before = await counts(page);
  await reference.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(route(4) + '#rett-bare-utvalget');
  const heading = page.getByRole('heading', { name: 'Rett bare utvalget' });
  await expect(heading).toBeFocused();
  await expect(heading).toHaveAttribute('id', 'rett-bare-utvalget');
  await expect(
    page.locator('pre').filter({ hasText: 'git restore --staged -- plan.txt' }),
  ).toBeVisible();
  expect(await counts(page)).toEqual(before);
  await page.goBack();
  await expect(reference).toBeVisible();
});

test('reading the Git roadmap does not enrol or change learner state', async ({
  page,
}) => {
  await completeOnboarding(page);
  const before = await pathwayState(page);
  await page.goto('/rpg/pathways');
  await page
    .getByRole('link', {
      name: 'Git & GitHub (trykk her for oversikt)',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('heading', { name: /Git & GitHub: fra første endring/ }),
  ).toBeVisible();
  const after = await pathwayState(page);
  expect(after).toEqual(before);
});

test('Git orientation is keyboard accessible at 320px and 200% text', async ({
  page,
}) => {
  await completeOnboarding(page, { theme: 'dark' });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/rpg/pathways/git-github');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const disclosure = page.getByText(
    'Hva med kopierte mapper, skylagring og sikkerhetskopier?',
  );
  await disclosure.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.locator('details').filter({
      hasText: 'Hva med kopierte mapper, skylagring og sikkerhetskopier?',
    }),
  ).toHaveAttribute('open', '');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await expect(
    page.getByRole('navigation', { name: /primary/i }).getByRole('link'),
  ).toHaveCount(5);
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
});

for (const theme of ['light', 'dark'] as const) {
  for (const part of [1, 2, 3, 4, 5]) {
    test(`keeps lesson ${part} within 320px at 200% root text with accessible controls in ${theme} theme`, async ({
      page,
    }) => {
      await completeOnboarding(page, { theme });
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
  await completeOnboarding(page, { theme: 'light' });
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

for (const programme of ['CS50x', 'Programvareutvikling'] as const) {
  for (const shell of ['classic', 'rpg'] as const) {
    test(`${programme} enters Pathways from ${shell}, saves an assessment and returns with the same active programme`, async ({
      page,
    }) => {
      await completeOnboarding(page, { programme });
      const before = await pathwayState(page);
      const home = shell === 'rpg' ? '/rpg' : '/dashboard';
      await page.goto(home);
      const entry = page.getByRole('link', { name: 'Pathways', exact: true });
      await entry.focus();
      await page.keyboard.press('Enter');
      await expect(
        page.getByRole('heading', { name: 'Pathways', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('main')).toBeFocused();
      const track = page.getByRole('link', {
        name: 'Git & GitHub (trykk her for oversikt)',
        exact: true,
      });
      await track.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/pathways\/git-github$/);
      await showModuleLessons(page, 'm01');
      await page
        .getByRole('link', {
          name: 'Start her: hvorfor bruke Git?',
          exact: true,
        })
        .click();
      const first = exercise(page, 1);
      await first
        .getByRole('radio', { name: /Lagring i Notisblokk oppdaterer filen/ })
        .check();
      await first.getByRole('button', { name: 'Sjekk svaret' }).click();
      await expect(first.getByRole('status', { name: 'Resultat' })).toHaveClass(
        /lesson-result--success/,
      );
      const assessed = await pathwayState(page);
      const localStatus = page.getByRole('region', { name: 'Leksjonsstatus' });
      await expect(
        localStatus.locator('xpath=ancestor::*[@lang][1]'),
      ).toHaveAttribute('lang', 'nb');
      await expect(localStatus.getByRole('status')).toContainText(
        'Ikke fullført',
      );
      await localStatus
        .getByRole('button', { name: 'Marker som fullført' })
        .focus();
      await page.keyboard.press('Enter');
      await expect(localStatus.getByRole('status')).toContainText('Fullført');
      expect((await pathwayState(page)).progress).toContainEqual(
        expect.objectContaining({
          itemId: 'git-m01-o01',
          status: 'completed',
          startedAt: expect.any(String),
          completedAt: expect.any(String),
        }),
      );
      await page.reload();
      await localStatus
        .getByRole('button', { name: 'Åpne leksjonen igjen' })
        .click();
      await expect(localStatus.getByRole('status')).toContainText(
        'Ikke fullført',
      );
      expect((await pathwayState(page)).progress).toContainEqual(
        expect.objectContaining({
          itemId: 'git-m01-o01',
          status: 'started',
          completedAt: undefined,
        }),
      );
      await localStatus
        .getByRole('button', { name: 'Marker som fullført' })
        .click();
      await expect(localStatus.getByRole('status')).toContainText('Fullført');
      await expect(first.getByRole('status', { name: 'Resultat' })).toHaveClass(
        /lesson-result--success/,
      );
      const after = await pathwayState(page);
      expect(after.evidence).toEqual(assessed.evidence);
      expect(after.appMeta).toEqual(before.appMeta);
      expect(after.xp).toEqual(before.xp);
      expect(after.achievements).toEqual(before.achievements);
      expect(
        after.evidence.every((row) => row.programmeId === 'git-github'),
      ).toBe(true);
      await page.getByRole('link', { name: /^Tilbake til/ }).click();
      await expect(page).toHaveURL(new RegExp(home + '$'));
      expect((await pathwayState(page)).appMeta).toEqual(before.appMeta);
      if (shell === 'rpg')
        await expect(
          page.getByRole('navigation', { name: /primary/i }).getByRole('link'),
        ).toHaveCount(5);
    });
  }
}

test('a read-only peer cannot prepare or save Pathways and reads existing Git work without mutation', async ({
  page,
  context,
}) => {
  await completeOnboarding(page);
  const before = await pathwayState(page);
  const peer = await context.newPage();
  await peer.goto(route(1));
  await expect(
    peer
      .getByRole('main')
      .locator('.rpg-lesson, .page-section')
      .getByRole('status')
      .last(),
  ).toBeVisible();
  expect(await pathwayState(peer)).toEqual(before);
  await peer.close();
  await page.goto(route(1));
  await expect(exercise(page, 1)).toBeVisible();
  await page
    .getByRole('button', { name: 'Marker som fullført', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Åpne leksjonen igjen' }),
  ).toBeVisible();
  const saved = await pathwayState(page);
  const reader = await context.newPage();
  await reader.goto(route(1));
  await expect(
    reader.getByRole('button', { name: 'Åpne leksjonen igjen' }),
  ).toBeDisabled();
  await expect(
    exercise(reader, 1).getByRole('button', { name: 'Sjekk svaret' }),
  ).toBeDisabled();
  expect(await pathwayState(reader)).toEqual(saved);
  await reader.close();
});

test('RPG Home groups available learning actions with keyboard-operated individual help', async ({
  page,
}) => {
  await completeOnboarding(page, { theme: 'dark' });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/rpg');
  const section = page.locator('.rpg-hub__learning');
  await expect(
    section.getByRole('heading', { name: 'Lær og utforsk' }),
  ).toBeVisible();
  await expect(section.getByRole('link', { name: 'Pathways' })).toHaveAttribute(
    'href',
    '/rpg/pathways',
  );
  await expect(
    section.getByRole('link', { name: 'Teknologioppslag' }),
  ).toBeVisible();
  const info = section.getByRole('button', { name: 'Om Pathways' });
  await expect(info).toHaveAttribute('aria-expanded', 'false');
  await info.focus();
  await page.keyboard.press('Enter');
  await expect(info).toHaveAttribute('aria-expanded', 'true');
  const controls = await info.getAttribute('aria-controls');
  const disclosure = section.locator('[id="' + controls + '"]');
  await expect(disclosure).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(info).toHaveAttribute('aria-expanded', 'false');
  await expect(disclosure).toHaveCount(0);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
