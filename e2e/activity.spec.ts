import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { completeOnboarding } from './support/onboarding';
interface ActivityBrowserScope {
  document: {
    documentElement: {
      setAttribute(name: string, value: string): void;
      scrollWidth: number;
      style: { fontSize: string };
    };
  };
  innerWidth: number;
  navigator: {
    serviceWorker: { ready: Promise<unknown>; controller: unknown };
  };
}

async function openActivity(page: Page) {
  await completeOnboarding(page);
  await page.goto('/rpg');
  await page
    .getByRole('link', { name: 'Activity Level 1', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Activity', exact: true }),
  ).toBeVisible();
}
async function log(page: Page, amount: string) {
  await page.getByLabel('Amount', { exact: true }).fill(amount);
  await page
    .getByRole('button', { name: 'Save activity', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Activity saved.' }),
  ).toBeVisible();
}
async function quickLog(page: Page, amount: string) {
  await page.getByRole('button', { name: 'Log', exact: true }).click();
  const form = page.getByRole('form', { name: 'Log Push-ups', exact: true });
  await expect(form.getByRole('spinbutton')).toBeFocused();
  await form.getByRole('spinbutton').fill(amount);
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Activity saved.');
  await expect(form).toHaveCount(0);
}
async function section(page: Page, name: 'Today' | 'History' | 'Settings') {
  await page.getByRole('tab', { name, exact: true }).click();
  await expect(page.getByRole('tabpanel', { name, exact: true })).toBeVisible();
}
test('individual entries, correction, deletion, goals, navigation and backup preserve saved Activity', async ({
  page,
}) => {
  await openActivity(page);
  await expect(
    page.getByText('No goals configured. You can still record activity.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Manage goals' }).click();
  await expect(
    page.getByRole('heading', { name: 'Daily goals', exact: true }),
  ).toBeFocused();
  await page.getByLabel('Repetitions per day', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Add goal', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Goal saved.' }),
  ).toBeVisible();
  await section(page, 'Today');
  await quickLog(page, '8');
  await quickLog(page, '7');
  await quickLog(page, '5');
  await expect(
    page.getByText('1 of 1 goals complete', { exact: true }),
  ).toBeVisible();
  await section(page, 'History');
  const seven = page
    .locator('.activity-list > li')
    .filter({ hasText: '7 repetitions' });
  await seven.getByRole('button', { name: 'Edit', exact: true }).click();
  await log(page, '6');
  await expect(
    page.getByText('0 of 1 goals complete', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('tab', { name: 'Today', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('19 repetitions / 20 repetitions')).toBeVisible();
  await expect(page.locator('.rpg-progress-bar__value')).toHaveText('95%');
  await section(page, 'History');
  const six = page
    .locator('.activity-list > li')
    .filter({ hasText: '6 repetitions' });
  await six.getByRole('button', { name: 'Delete', exact: true }).click();
  await six
    .getByRole('button', { name: 'Confirm deletion', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Entry deleted.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Entries', exact: true }),
  ).toBeFocused();
  await section(page, 'Today');
  await expect(page.getByText('13 repetitions / 20 repetitions')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/rpg$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/rpg\/movement$/);
  await page.goto('/rpg/settings');
  const downloadEvent = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export local backup', exact: true })
    .click();
  const download = await downloadEvent;
  const stream = await download.createReadStream();
  if (!stream) throw new Error('No backup download');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const backup = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(backup.schemaVersion).toBe(5);
  expect(backup.data.activityEntries).toHaveLength(2);
  expect(backup.data.activitySettings[0].goals[0].target).toBe(20);
  expect(backup.data.activityDays).toHaveLength(1);
  await page.goto('/rpg/movement');
  await log(page, '42');
  await page.goto('/rpg/settings');
  await page.getByLabel('Backup file').setInputFiles({
    name: 'synthetic-activity.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page
    .getByRole('button', {
      name: 'Replace local data with this backup',
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/rpg$/);
  await page.goto('/rpg/movement');
  await expect(page.getByText('13 repetitions / 20 repetitions')).toBeVisible();
  await section(page, 'History');
  await expect(
    page.getByRole('button', { name: 'Edit', exact: true }),
  ).toHaveCount(2);
});

test('custom distance activity retains its identity on rename and removal, without a goal', async ({
  page,
}) => {
  await openActivity(page);
  await section(page, 'Settings');
  await page
    .getByLabel('Activity name', { exact: true })
    .fill('Outdoor movement');
  await page.getByLabel('Custom measurement').selectOption('metres');
  await page.getByRole('button', { name: 'Add activity', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Custom activity saved.' }),
  ).toBeVisible();
  const activity = page.getByLabel('Activity type', { exact: true });
  const id = await activity
    .locator('option', { hasText: 'Outdoor movement' })
    .getAttribute('value');
  await section(page, 'Today');
  await activity.selectOption(id!);
  await log(page, '2.5');
  await section(page, 'History');
  await expect(
    page.getByRole('cell', { name: '2.5 km', exact: true }),
  ).toHaveCount(2);
  await section(page, 'Settings');
  await page.getByRole('button', { name: 'Rename', exact: true }).click();
  await page
    .getByLabel('Activity name', { exact: true })
    .fill('Accessible movement');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Custom activity saved.' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Remove activity', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Activity updated.' }),
  ).toBeVisible();
  await expect(activity.locator(`option[value="${id}"]`)).toHaveCount(0);
  await section(page, 'History');
  await expect(
    page.getByRole('rowheader', { name: 'Accessible movement (km)' }),
  ).toBeVisible();
});

for (const viewport of [
  { width: 320, height: 720 },
  { width: 1440, height: 1000 },
]) {
  test(`Activity is accessible and fits ${viewport.width}px in dark/light themes`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openActivity(page);
    await section(page, 'Settings');
    await page.getByLabel('Repetitions per day').fill('20');
    await page.getByRole('button', { name: 'Add goal', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Goal saved.');
    await section(page, 'Today');
    await log(page, '19');
    for (const theme of ['dark', 'light']) {
      await page.evaluate(
        (selected) =>
          (
            globalThis as unknown as ActivityBrowserScope
          ).document.documentElement.setAttribute('data-theme', selected),
        theme,
      );
      expect(
        await page.evaluate(
          () =>
            (globalThis as unknown as ActivityBrowserScope).document
              .documentElement.scrollWidth <=
            (globalThis as unknown as ActivityBrowserScope).innerWidth,
        ),
      ).toBe(true);
      for (const name of ['Today', 'History', 'Settings'] as const) {
        await section(page, name);
        expect(
          await page.evaluate(
            () =>
              (globalThis as unknown as ActivityBrowserScope).document
                .documentElement.scrollWidth <=
              (globalThis as unknown as ActivityBrowserScope).innerWidth,
          ),
        ).toBe(true);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
        await page.screenshot({
          path: `artifacts/activity-ux-${name.toLowerCase()}-${viewport.width}-${theme}.png`,
          fullPage: true,
        });
      }
    }
    await section(page, 'Today');
    const percentage = page.locator('.rpg-progress-bar__value');
    await expect(percentage).toHaveText('95%');
    expect(
      await percentage.evaluate((element) => {
        const range = element.ownerDocument.createRange();
        range.selectNodeContents(element);
        return new Set(
          Array.from(
            range.getClientRects() as ArrayLike<{ top: number }>,
            (rect) => rect.top,
          ),
        ).size;
      }),
    ).toBe(1);
    await page.getByRole('button', { name: 'Log', exact: true }).click();
    const quick = page.getByRole('form', { name: 'Log Push-ups', exact: true });
    const amount = quick.getByRole('spinbutton');
    await expect(amount).toBeFocused();
    const amountBox = await amount.boundingBox();
    const navBox = await page
      .getByRole('navigation', { name: 'RPG primary navigation' })
      .boundingBox();
    expect(amountBox!.y).toBeGreaterThanOrEqual(0);
    if (viewport.width === 320)
      expect(amountBox!.y + amountBox!.height).toBeLessThan(navBox!.y);
    await amount.focus();
    await page.keyboard.type('3');
    await page.keyboard.press('Tab');
    await expect(
      quick.getByRole('button', { name: 'Save', exact: true }),
    ).toBeFocused();
    await page.screenshot({
      path: `artifacts/activity-targeted-quick-${viewport.width}-light.png`,
      fullPage: true,
    });
    await quick.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.evaluate(() => {
      (
        globalThis as unknown as ActivityBrowserScope
      ).document.documentElement.style.fontSize = '200%';
    });
    expect(
      await page.evaluate(
        () =>
          (globalThis as unknown as ActivityBrowserScope).document
            .documentElement.scrollWidth <=
          (globalThis as unknown as ActivityBrowserScope).innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/activity-ux-today-${viewport.width}-enlarged.png`,
      fullPage: true,
    });
    await page.getByRole('tab', { name: 'Today', exact: true }).focus();
    await page.keyboard.press('End');
    await expect(
      page.getByRole('tab', { name: 'Settings', exact: true }),
    ).toBeFocused();
    await expect(
      page.getByRole('tab', { name: 'Settings', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    await page.getByText('About goals and history', { exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByText(/If you add activity to an earlier date/),
    ).toBeVisible();
  });
}

test('read-only tabs cannot save Activity; authoritative records survive reload offline', async ({
  page,
  context,
}) => {
  await openActivity(page);
  await log(page, '8');
  const other = await context.newPage();
  await other.goto('/rpg/movement');
  await expect(
    other.getByRole('heading', { name: 'Activity', exact: true }),
  ).toBeVisible();
  await expect(
    other.getByRole('button', { name: 'Save activity', exact: true }),
  ).toBeDisabled();
  await other.close();
  await page.evaluate(async () => {
    await (globalThis as unknown as ActivityBrowserScope).navigator
      .serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(
    () =>
      (globalThis as unknown as ActivityBrowserScope).navigator.serviceWorker
        .controller !== null,
  );
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Activity', exact: true }),
  ).toBeVisible();
  await section(page, 'History');
  await expect(
    page.getByRole('cell', { name: '8 repetitions', exact: true }),
  ).toHaveCount(2);
  await context.setOffline(false);
});

test('Activity remains learner-global across programme switches and uses the programme language', async ({
  page,
}) => {
  await openActivity(page);
  await log(page, '8');
  await section(page, 'Settings');
  await page.getByLabel('Reminder interval').selectOption('45');
  await expect(
    page.getByRole('status').filter({ hasText: 'Reminder preference saved.' }),
  ).toBeVisible();
  for (const programme of ['programvareutvikling', 'cs50x']) {
    await page.goto('/rpg/settings');
    await page.getByLabel('Programme to switch to').selectOption(programme);
    await page
      .getByRole('button', { name: /^(Enrol and switch|Switch programme)$/ })
      .click();
    await expect(
      page.getByText(
        programme === 'programvareutvikling'
          ? /Active programme: Programvareutvikling/
          : /Active programme: CS50x/,
      ),
    ).toBeVisible();
    await page.goto('/rpg/movement');
    const norwegian = programme === 'programvareutvikling';
    await expect(
      page.getByRole('heading', {
        name: norwegian ? 'Aktivitet' : 'Activity',
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole('tab', {
        name: norwegian ? 'Historikk' : 'History',
        exact: true,
      })
      .click();
    await expect(
      page.getByRole('cell', {
        name: norwegian ? '8 repetisjoner' : '8 repetitions',
        exact: true,
      }),
    ).toHaveCount(2);
    await page
      .getByRole('tab', {
        name: norwegian ? 'Oppsett' : 'Settings',
        exact: true,
      })
      .click();
    await expect(
      page.getByLabel(norwegian ? 'Varselintervall' : 'Reminder interval'),
    ).toHaveValue('45');
    await expect(
      page.getByRole('group', { name: 'Hero progression' }),
    ).toContainText('0 /');
    if (norwegian) {
      await page.setViewportSize({ width: 320, height: 720 });
      await page.getByRole('tab', { name: 'I dag', exact: true }).click();
      await page.screenshot({
        path: 'artifacts/activity-ux-today-320-nb.png',
        fullPage: true,
      });
    }
  }
});

test('Activity retains drafts between sections and keeps goal management in Settings', async ({
  page,
}) => {
  await openActivity(page);
  await page.getByLabel('Amount', { exact: true }).fill('9');
  await page.getByLabel('Date', { exact: true }).fill('2001-02-03');
  await section(page, 'Settings');
  await page.getByLabel('Repetitions per day').fill('20');
  await page.getByLabel('Activity name', { exact: true }).fill('Rucking');
  await section(page, 'History');
  await section(page, 'Settings');
  await expect(page.getByLabel('Repetitions per day')).toHaveValue('20');
  await expect(page.getByLabel('Activity name', { exact: true })).toHaveValue(
    'Rucking',
  );
  await page.getByRole('button', { name: 'Add goal', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Goal saved.');
  await page.getByRole('button', { name: 'Edit goal', exact: true }).click();
  await page.getByLabel('Repetitions per day').fill('25');
  await page.getByRole('button', { name: 'Save goal', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Goal saved.');
  await page.getByRole('button', { name: 'Disable', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Goal updated.');
  await section(page, 'Today');
  await expect(
    page.getByRole('button', { name: 'Log', exact: true }),
  ).toHaveCount(0);
  await section(page, 'Settings');
  await page.getByRole('button', { name: 'Enable', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Goal updated.');
  await section(page, 'Today');
  await expect(page.getByLabel('Amount', { exact: true })).toHaveValue('9');
  await page.getByRole('button', { name: 'Log', exact: true }).click();
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue(
    '2001-02-03',
  );
  const quick = page.getByRole('form', { name: 'Log Push-ups', exact: true });
  await expect(quick.getByRole('spinbutton')).toBeFocused();
  await expect(page.getByLabel('Amount', { exact: true })).toHaveValue('9');
  await quick.getByRole('spinbutton').fill('5');
  await section(page, 'History');
  await section(page, 'Today');
  await expect(quick.getByRole('spinbutton')).toHaveValue('5');
  await section(page, 'Settings');
  await page.getByRole('button', { name: 'Remove goal', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Goal removed. Earlier days are preserved.',
  );
  await section(page, 'Today');
  // Removing the goal must not strand or discard its unfinished entry.
  await expect(quick.getByRole('spinbutton')).toHaveValue('5');
  await quick.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Amount', { exact: true })).toHaveValue('9');
  await expect(
    page.getByRole('button', { name: 'Log', exact: true }),
  ).toHaveCount(0);
});

test('History totals stay readable and correctly associated on a 320px phone and desktop', async ({
  page,
}) => {
  await completeOnboarding(page, { programme: 'Programvareutvikling' });
  await page.goto('/rpg/movement');
  const saveFull = async (amount: string, date?: string) => {
    await page.getByLabel('Mengde', { exact: true }).fill(amount);
    if (date) await page.getByLabel('Dato', { exact: true }).fill(date);
    await page
      .getByRole('button', { name: 'Lagre aktivitet', exact: true })
      .click();
    await expect(page.getByRole('status')).toHaveText('Aktiviteten er lagret.');
  };
  await saveFull('4000');
  await saveFull('3500', '2001-02-03');
  await page
    .getByRole('combobox', { name: 'Aktivitet', exact: true })
    .selectOption('walking');
  await saveFull('90');
  await saveFull('30', '2001-02-03');
  await page.getByRole('tab', { name: 'Oppsett', exact: true }).click();
  await page.getByLabel('Aktivitetsnavn', { exact: true }).fill('Rucking');
  await page
    .getByRole('combobox', { name: 'Egen måleenhet', exact: true })
    .selectOption('metres');
  await page
    .getByRole('button', { name: 'Legg til aktivitet', exact: true })
    .click();
  await expect(page.getByRole('status')).toHaveText(
    'Egen aktivitet er lagret.',
  );
  await page.getByLabel('Repetisjoner per dag').fill('5000');
  await page.getByRole('button', { name: 'Legg til mål', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Målet er lagret.');
  await page.getByRole('tab', { name: 'I dag', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Aktivitet', exact: true })
    .selectOption({ label: 'Rucking' });
  await saveFull('35');
  await saveFull('185', '2001-02-03');
  await page.getByRole('tab', { name: 'Historikk', exact: true }).click();
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const table = page.getByRole('table', { name: 'Aktivitetssummer' });
    await expect(table).toHaveCount(1);
    const repetitions = table.getByRole('row').filter({
      has: page.getByRole('rowheader', {
        name: 'Armhevinger (repetisjoner)',
        exact: true,
      }),
    });
    await expect(repetitions.getByRole('cell').nth(0)).toHaveText(
      /4\s000 repetisjoner/,
    );
    await expect(repetitions.getByRole('cell').nth(1)).toHaveText(
      /7\s500 repetisjoner/,
    );
    const duration = table.getByRole('row').filter({
      has: page.getByRole('rowheader', {
        name: 'Gåtur (minutter)',
        exact: true,
      }),
    });
    await expect(duration.getByRole('cell').nth(0)).toHaveText(/90 minutter/);
    await expect(duration.getByRole('cell').nth(1)).toHaveText(/120 minutter/);
    const distance = table.getByRole('row').filter({
      has: page.getByRole('rowheader', { name: 'Rucking (km)', exact: true }),
    });
    await expect(distance.getByRole('cell').nth(0)).toHaveText(/35 km/);
    await expect(distance.getByRole('cell').nth(1)).toHaveText(/220 km/);
    const header = await repetitions.getByRole('rowheader').boundingBox();
    const tableBox = await table.boundingBox();
    if (width === 320)
      expect(header!.width).toBeGreaterThan(tableBox!.width * 0.9);
    else expect(header!.width).toBeLessThan(tableBox!.width * 0.5);
    for (const theme of ['dark', 'light']) {
      await page.evaluate(
        (selected) =>
          (
            globalThis as unknown as ActivityBrowserScope
          ).document.documentElement.setAttribute('data-theme', selected),
        theme,
      );
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(
        await page.evaluate(
          () =>
            (globalThis as unknown as ActivityBrowserScope).document
              .documentElement.scrollWidth <=
            (globalThis as unknown as ActivityBrowserScope).innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `artifacts/activity-targeted-history-${width}-${theme}.png`,
        fullPage: true,
      });
      await table.screenshot({
        path: `artifacts/activity-targeted-totals-${width}-${theme}.png`,
      });
    }
  }
  await page.setViewportSize({ width: 320, height: 720 });
  await page.getByRole('tab', { name: 'I dag', exact: true }).click();
  await page.getByRole('button', { name: 'Registrer', exact: true }).click();
  const quick = page.getByRole('form', {
    name: 'Registrer Armhevinger',
    exact: true,
  });
  await expect(quick.getByRole('spinbutton', { name: 'Antall' })).toBeFocused();
  await quick.getByRole('spinbutton').fill('5');
  await page.screenshot({
    path: 'artifacts/activity-targeted-quick-320-nb.png',
    fullPage: true,
  });
  await page.locator('.activity-list > li').filter({ has: quick }).screenshot({
    path: 'artifacts/activity-targeted-quick-goal-320-nb.png',
  });
  await quick.getByRole('button', { name: 'Lagre', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Aktiviteten er lagret.');
  await expect(
    page.getByRole('progressbar', { name: /Armhevinger —/ }),
  ).toHaveAttribute('aria-valuenow', '80');
});
