import { readFile } from 'node:fs/promises';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

/**
 * Epic E: the second programme in a real browser. Synthetic learner data
 * only. Covers enrolment and switching from Settings, the lesson surface in
 * Classic and RPG, keyboard answering, durable results across reload, hints
 * as recorded support, the runtime-unavailable state, the read-only second
 * tab, schema-4 backup round trip with evidence, refusal of an older backup,
 * accessibility and the mobile width.
 */

const firstLesson = '/course/s1-m01-o01';
const runtimeLesson = '/course/s1-m01-o03';

function collectConsoleIssues(page: Page, issues: string[]) {
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      issues.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    issues.push(error.message);
  });
}

async function switchProgramme(page: Page, programmeId: string, title: string) {
  await page.goto('/settings');
  await page.getByLabel('Programme to switch to').selectOption(programmeId);
  await page
    .getByRole('button', { name: /^(Enrol and switch|Switch programme)$/ })
    .click();
  await expect(page.getByText(`Active programme: ${title}`)).toBeVisible();
}

function exercise(page: Page, number: number): Locator {
  return page.getByRole('group', {
    name: new RegExp(`^Oppgave ${number} · `),
  });
}

async function readEvidenceCount(page: Page) {
  return (await page.evaluate(`
    new Promise((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');
      request.onerror = () => reject(new Error('open failed'));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(
          ['learner_evidence', 'lesson_positions'],
          'readonly',
        );
        const evidence = transaction.objectStore('learner_evidence').count();
        const positions = transaction.objectStore('lesson_positions').count();
        transaction.oncomplete = () => {
          resolve({ evidence: evidence.result, positions: positions.result });
          database.close();
        };
        transaction.onerror = () => {
          reject(new Error('count failed'));
          database.close();
        };
      };
    });
  `)) as { evidence: number; positions: number };
}

async function answerFirstChoiceExercise(page: Page) {
  await page.goto(firstLesson);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sett opp arbeidsstedet' }),
  ).toBeVisible();

  const card = exercise(page, 3);
  const option = card.getByLabel(/Du har ikke lagret filen etter endringen/);
  await expect(option).toBeEnabled();
  // Keyboard only: focus the native radio, select it with Space, and submit
  // with Enter on the focused button.
  await option.focus();
  await page.keyboard.press('Space');
  await expect(option).toBeChecked();
  await card.getByRole('button', { name: 'Sjekk svaret' }).focus();
  await page.keyboard.press('Enter');

  await expect(card.getByRole('status', { name: 'Resultat' })).toContainText(
    'Riktig',
  );
  return card;
}

test('enrols in Programvareutvikling, answers by keyboard and keeps the result across reload and both interfaces', async ({
  page,
}) => {
  const consoleIssues: string[] = [];
  collectConsoleIssues(page, consoleIssues);
  await completeOnboarding(page);
  await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');

  await page.goto('/course');
  await expect(page.getByText('Sett opp arbeidsstedet').first()).toBeVisible();

  const card = await answerFirstChoiceExercise(page);
  await expect(card.getByText('Lagrer og sjekker svaret')).toHaveCount(0);
  const afterSubmit = await readEvidenceCount(page);
  // One immutable attempt and its one terminal result, plus the position.
  expect(afterSubmit.evidence).toBe(2);

  await page.reload();
  await expect(
    exercise(page, 3).getByRole('status', { name: 'Resultat' }),
  ).toContainText('Riktig');
  await expect(
    page.getByRole('heading', { name: 'Fortsett der du slapp' }),
  ).toBeVisible();
  expect((await readEvidenceCount(page)).evidence).toBe(2);

  // The RPG resource surface shows the same lesson and the same evidence.
  await page.goto('/rpg/resource/s1-m01-o01');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sett opp arbeidsstedet' }),
  ).toBeVisible();
  await expect(
    exercise(page, 3).getByRole('status', { name: 'Resultat' }),
  ).toContainText('Riktig');

  expect(consoleIssues).toEqual([]);
});

test('records a hint as support before showing it, and keeps it after reload', async ({
  page,
}) => {
  await completeOnboarding(page);
  await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');
  await page.goto(firstLesson);

  const card = exercise(page, 1);
  await card.getByRole('button', { name: 'Vis hint 1 av 2' }).click();
  await expect(card.getByText('Hint 1', { exact: true })).toBeVisible();
  await expect(
    card.getByRole('button', { name: 'Vis hint 2 av 2' }),
  ).toBeVisible();
  expect((await readEvidenceCount(page)).evidence).toBe(1);

  await page.reload();
  await expect(
    exercise(page, 1).getByText('Hint 1', { exact: true }),
  ).toBeVisible();
});

/** The program exercise in the runtime lesson that asks for three lines. */
function threeLineProgram(page: Page) {
  return page
    .getByRole('group', { name: /^Oppgave \d+ · Skriv eller endre program/ })
    .filter({ hasText: 'skriver ut tre linjer' });
}

async function submitProgram(page: Page, card: Locator, source: string) {
  const field = card.getByRole('textbox', { name: 'Svaret ditt' });
  await expect(field).toBeEnabled({ timeout: 60_000 });
  await field.fill(source);
  await card.getByRole('button', { name: 'Sjekk svaret' }).click();
  return card.getByRole('status', { name: 'Resultat' });
}

test('checks program exercises with the packaged Python runtime in a worker, offline-capable and same-origin only', async ({
  page,
}) => {
  const consoleIssues: string[] = [];
  const requests: string[] = [];
  collectConsoleIssues(page, consoleIssues);
  page.on('request', (request) => requests.push(request.url()));
  await completeOnboarding(page);
  await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');
  await page.goto(runtimeLesson);

  const card = threeLineProgram(page);
  const starter = 'print("Hei!")\nprint("Jeg heter Kari.")';

  // A wrong program is answered by the real interpreter: not correct yet.
  const wrong = await submitProgram(page, card, starter);
  await expect(wrong).toContainText('Ikke riktig ennå', { timeout: 30_000 });

  // A program that never stops is stopped at its time limit; that is the
  // app's problem, not the learner's, and the runtime recovers.
  await card.getByRole('button', { name: 'Prøv igjen' }).click();
  const looping = await submitProgram(page, card, 'while True:\n    pass');
  await expect(looping).toContainText('Sjekken kunne ikke fullføres', {
    timeout: 30_000,
  });

  await card.getByRole('button', { name: 'Prøv igjen' }).click();
  const solved = await submitProgram(
    page,
    card,
    `${starter}\nprint("Jeg lærer Python.")`,
  );
  await expect(solved).toContainText('Riktig', { timeout: 60_000 });
  await expect(solved).toContainText(/\+\d+ XP/);

  const origin = new URL(page.url()).origin;
  expect(requests.filter((url) => !url.startsWith(origin))).toEqual([]);
  expect(
    requests.some((url) =>
      url.includes('/runtime/pyodide-314.0.7/pyodide.asm.wasm'),
    ),
  ).toBe(true);
  expect(consoleIssues).toEqual([]);
});

test.describe('without the Python runtime', () => {
  // The service worker would answer runtime requests the page cannot route.
  test.use({ serviceWorkers: 'block' });

  test('program and test-table items say so honestly, cannot be submitted and create no attempt', async ({
    page,
  }) => {
    await page.route('**/runtime/**', (route) => route.abort());
    await completeOnboarding(page);
    await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');
    await page.goto(runtimeLesson);

    const card = threeLineProgram(page);
    await expect(
      card.getByRole('note').filter({
        hasText: 'Automatisk kjøring av Python er ikke tilgjengelig',
      }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      card.getByRole('button', { name: 'Sjekk svaret' }),
    ).toBeDisabled();
    expect((await readEvidenceCount(page)).evidence).toBe(0);
  });
});

test('keeps lesson answering in the writer tab only; the second tab is read-only', async ({
  context,
  page,
}) => {
  await completeOnboarding(page);
  await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');
  await page.goto(firstLesson);
  await expect(exercise(page, 3)).toBeVisible();

  const peer = await context.newPage();
  await peer.goto(firstLesson);
  await expect(
    peer.getByRole('heading', { name: 'This ProgressPal tab is read-only' }),
  ).toBeVisible();
  await expect(
    peer.getByText('Denne fanen kan bare vise innhold.', { exact: false }),
  ).toBeVisible();
  await expect(
    exercise(peer, 3).getByRole('button', { name: 'Sjekk svaret' }),
  ).toBeDisabled();
  expect((await readEvidenceCount(page)).evidence).toBe(0);
});

test('switches CS50 → Programvareutvikling → CS50 → Programvareutvikling without losing evidence', async ({
  page,
}) => {
  await completeOnboarding(page);
  await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');
  await answerFirstChoiceExercise(page);

  await switchProgramme(page, 'cs50x', 'CS50x 2026');
  await page.goto('/course');
  await expect(page.getByText('Sett opp arbeidsstedet')).toHaveCount(0);

  await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');
  await page.goto(firstLesson);
  await expect(
    exercise(page, 3).getByRole('status', { name: 'Resultat' }),
  ).toContainText('Riktig');
  expect((await readEvidenceCount(page)).evidence).toBe(2);
});

test('exports a schema-4 backup with the evidence and restores it exactly', async ({
  page,
}) => {
  await completeOnboarding(page);
  await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');
  await answerFirstChoiceExercise(page);
  const before = await readEvidenceCount(page);

  await page.goto('/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export local backup' }).click(),
  ]);
  const backupPath = await download.path();
  const backup = JSON.parse(await readFile(backupPath, 'utf8')) as {
    schemaVersion: number;
    data: { learnerEvidence: unknown[]; lessonPositions: unknown[] };
  };
  expect(backup.schemaVersion).toBe(4);
  expect(backup.data.learnerEvidence).toHaveLength(before.evidence);
  expect(backup.data.lessonPositions).toHaveLength(before.positions);

  await page.getByLabel('Confirmation phrase').fill('RESET');
  await page.getByRole('button', { name: 'Reset all local data' }).click();
  await expect(
    page.getByRole('heading', { name: 'Start with ProgressPal' }),
  ).toBeVisible();
  expect(await readEvidenceCount(page)).toEqual({ evidence: 0, positions: 0 });

  await page.getByLabel('Backup file').setInputFiles(backupPath);
  await page.getByRole('button', { name: 'Restore this backup' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  expect(await readEvidenceCount(page)).toEqual(before);

  await page.goto(firstLesson);
  await expect(
    exercise(page, 3).getByRole('status', { name: 'Resultat' }),
  ).toContainText('Riktig');
});

test('refuses an older schema-3 backup before any write', async ({ page }) => {
  await completeOnboarding(page);
  await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');
  await answerFirstChoiceExercise(page);
  const before = await readEvidenceCount(page);

  await page.goto('/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export local backup' }).click(),
  ]);
  const current = JSON.parse(
    await readFile(await download.path(), 'utf8'),
  ) as Record<string, unknown> & {
    data: Record<string, unknown> & { appMeta: Record<string, unknown> };
  };
  // A realistic pre-Epic-E export: schema 3, without the two new stores.
  const data: Record<string, unknown> = {
    ...current.data,
    appMeta: { ...current.data.appMeta, schemaVersion: 3 },
  };
  delete data.learnerEvidence;
  delete data.lessonPositions;
  const schemaThree = { ...current, schemaVersion: 3, data };

  await page.getByLabel('Backup file').setInputFiles({
    name: 'schema-3.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(schemaThree)),
  });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Replace local data with this backup' }),
  ).toHaveCount(0);
  expect(await readEvidenceCount(page)).toEqual(before);
});

test('the lesson passes axe and fits a 375 px phone without horizontal scroll', async ({
  page,
}) => {
  await completeOnboarding(page);
  await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');
  await answerFirstChoiceExercise(page);

  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);

  for (const route of [
    firstLesson,
    runtimeLesson,
    '/rpg/resource/s1-m01-o01',
  ]) {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    const overflow = (await page.evaluate(
      'document.documentElement.scrollWidth - document.documentElement.clientWidth',
    )) as number;
    expect(overflow, route).toBeLessThanOrEqual(0);
  }
});

function unitExercise(page: Page, unitTitle: string, number: number): Locator {
  return page
    .locator('section.lesson-unit')
    .filter({
      has: page.getByRole('heading', {
        level: 2,
        name: unitTitle,
        exact: true,
      }),
    })
    .getByRole('group', { name: new RegExp(`^Oppgave ${number} · `) });
}

/**
 * Fills a card with the keyboard only: every select gets a distinct option
 * by arrow keys, one radio per group and one checkbox are chosen with Space,
 * and every text field is typed into. Then the answer is submitted with
 * Enter on the focused button.
 */
async function answerByKeyboard(page: Page, card: Locator) {
  // Controls stay disabled until this tab holds the local write lease.
  await expect(
    card.getByRole('button', { name: 'Sjekk svaret' }),
  ).toBeEnabled();
  const selects = card.locator('select');
  const selectCount = await selects.count();

  for (let index = 0; index < selectCount; index += 1) {
    await selects.nth(index).focus();
    await page.keyboard.press('ArrowDown');
    for (let extra = 0; extra < index; extra += 1) {
      await page.keyboard.press('ArrowDown');
    }
  }

  const radios = card.locator('input[type="radio"]');
  const radioNames = new Set<string>();
  for (let index = 0; index < (await radios.count()); index += 1) {
    const radio = radios.nth(index);
    const name = (await radio.getAttribute('name')) ?? '';
    if (!radioNames.has(name)) {
      radioNames.add(name);
      await radio.focus();
      await page.keyboard.press('Space');
      await expect(radio).toBeChecked();
    }
  }

  const checkboxes = card.locator('input[type="checkbox"]');
  if ((await checkboxes.count()) > 0) {
    await checkboxes.first().focus();
    await page.keyboard.press('Space');
    await expect(checkboxes.first()).toBeChecked();
  }

  const fields = card.locator(
    'textarea, input:not([type="radio"]):not([type="checkbox"])',
  );
  for (let index = 0; index < (await fields.count()); index += 1) {
    await fields.nth(index).focus();
    await page.keyboard.type('1');
  }

  await card.getByRole('button', { name: 'Sjekk svaret' }).focus();
  await page.keyboard.press('Enter');
  await expect(card.getByRole('status', { name: 'Resultat' })).toBeVisible();
}

const setupUnit = 'Sjekk oppsettet ditt';
const terminalUnit = 'Terminaløvelser';
const retellUnit = 'Gjenfortell oppgaven';
const predictUnit = 'Forutsi, så kjør: tolv små programmer';
const aiUnit = 'Gode og dårlige KI-spørsmål';

const keyboardModes = [
  { mode: 'pasted output', item: 's1-m01-o01', unit: setupUnit, number: 1 },
  { mode: 'single choice', item: 's1-m01-o01', unit: setupUnit, number: 3 },
  { mode: 'classify', item: 's1-m01-o01', unit: setupUnit, number: 4 },
  { mode: 'checklist', item: 's1-m01-o01', unit: setupUnit, number: 6 },
  { mode: 'typed command', item: 's1-m01-o02', unit: terminalUnit, number: 1 },
  { mode: 'order', item: 's1-m01-o02', unit: terminalUnit, number: 9 },
  { mode: 'slot assembly', item: 's1-m01-o04', unit: retellUnit, number: 2 },
  { mode: 'match', item: 's1-m01-o04', unit: retellUnit, number: 7 },
  { mode: 'prediction', item: 's1-m01-o05', unit: predictUnit, number: 1 },
  {
    mode: 'reflection choice',
    item: 's1-m01-o05',
    unit: predictUnit,
    number: 13,
  },
  {
    mode: 'error diagnosis',
    item: 's1-m01-o06',
    unit: 'Feilmeldingspakken: ti feil',
    number: 1,
  },
  { mode: 'multiple choice', item: 's1-m01-o08', unit: aiUnit, number: 6 },
  { mode: 'private reflection', item: 's1-m01-o08', unit: aiUnit, number: 9 },
  {
    mode: 'variable trace',
    item: 's1-m02-o01',
    unit: 'Følg variablene: verditabeller',
    number: 1,
  },
  {
    mode: 'blank fill',
    item: 's1-m02-o04',
    unit: 'Innlesing og konvertering: fem små programmer',
    number: 3,
  },
] as const;

test('answers every runtime-free response mode with the keyboard only', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const consoleIssues: string[] = [];
  collectConsoleIssues(page, consoleIssues);
  await completeOnboarding(page);
  await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');

  for (const entry of keyboardModes) {
    await test.step(entry.mode, async () => {
      if (!page.url().endsWith(`/course/${entry.item}`)) {
        await page.goto(`/course/${entry.item}`);
      }
      await answerByKeyboard(
        page,
        unitExercise(page, entry.unit, entry.number),
      );
    });
  }

  expect(consoleIssues).toEqual([]);
});

test('runtime-dependent program and test-table items are unavailable before submit and create no attempt', async ({
  page,
}) => {
  await completeOnboarding(page);
  await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');

  for (const [item, unit, number] of [
    [
      's1-m01-lab',
      'Lab: Hei-programmet – kjør, ødelegg, les, rett og commit',
      2,
    ],
    ['s1-m02-lab', 'Lab: Kaffekassa – fra verdi til testet commit', 1],
  ] as const) {
    await page.goto(`/course/${item}`);
    const card = unitExercise(page, unit, number);
    await expect(
      card.getByRole('note').filter({
        hasText: 'Automatisk kjøring av Python er ikke tilgjengelig her ennå.',
      }),
    ).toBeVisible();
    await expect(
      card.getByRole('button', { name: 'Sjekk svaret' }),
    ).toBeDisabled();
  }
  expect((await readEvidenceCount(page)).evidence).toBe(0);
});

async function readEvidenceRows(page: Page) {
  return (await page.evaluate(`
    new Promise((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');
      request.onerror = () => reject(new Error('open failed'));
      request.onsuccess = () => {
        const database = request.result;
        const read = database
          .transaction('learner_evidence')
          .objectStore('learner_evidence')
          .getAll();
        read.onsuccess = () => {
          database.close();
          resolve(read.result.map((row) => [row.kind, row.id, row.attemptId ?? null]));
        };
        read.onerror = () => {
          database.close();
          reject(new Error('read failed'));
        };
      };
    });
  `)) as [string, string, string | null][];
}

test('finishes an interrupted evaluation after reload without a new attempt', async ({
  page,
}) => {
  await completeOnboarding(page);
  await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');
  await answerFirstChoiceExercise(page);

  const before = await readEvidenceRows(page);
  const attempt = before.find(([kind]) => kind === 'exercise_attempt');
  const result = before.find(([kind]) => kind === 'evaluation_result');
  expect(attempt).toBeDefined();
  expect(result?.[2]).toBe(attempt?.[1]);

  // The state a tab closed between the two commits leaves behind: the
  // attempt is durable, its result never committed.
  await page.evaluate(`
    new Promise((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');
      request.onerror = () => reject(new Error('open failed'));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('learner_evidence', 'readwrite');
        transaction.objectStore('learner_evidence').delete(${JSON.stringify(result?.[1])});
        transaction.oncomplete = () => {
          database.close();
          resolve(undefined);
        };
        transaction.onerror = () => {
          database.close();
          reject(new Error('delete failed'));
        };
      };
    });
  `);
  expect((await readEvidenceCount(page)).evidence).toBe(1);

  await page.reload();
  await expect(
    exercise(page, 3).getByRole('status', { name: 'Resultat' }),
  ).toContainText('Riktig');

  const after = await readEvidenceRows(page);
  expect(after.filter(([kind]) => kind === 'exercise_attempt')).toEqual([
    attempt,
  ]);
  const results = after.filter(([kind]) => kind === 'evaluation_result');
  expect(results).toHaveLength(1);
  expect(results[0]?.[2]).toBe(attempt?.[1]);
});

test('resumes after reload at a phase boundary', async ({ page }) => {
  await completeOnboarding(page);
  await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');
  await page.goto(runtimeLesson);
  await expect(
    page.getByText('Etappe 1 av 2: Skriv ut tekst med print()'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Neste etappe' }).click();
  await expect(
    page.getByText('Etappe 2 av 2: Oppsettsklinikken'),
  ).toBeVisible();
  await expect
    .poll(async () => (await readEvidenceCount(page)).positions)
    .toBe(1);

  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Fortsett der du slapp' }),
  ).toBeVisible();
  await expect(
    page.getByText('Etappe 2 av 2: Oppsettsklinikken'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Forrige etappe' }),
  ).toBeVisible();
});

test('answers a runtime-free item while the browser is offline', async ({
  context,
  page,
}) => {
  await completeOnboarding(page);
  await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');
  await page.goto(firstLesson);
  await expect(exercise(page, 3)).toBeVisible();

  await context.setOffline(true);
  try {
    await answerByKeyboard(page, exercise(page, 3));
    expect((await readEvidenceCount(page)).evidence).toBe(2);
  } finally {
    await context.setOffline(false);
  }
});

test('presents the checkpoint honestly: lesson closed, no pass claim, no gate retry', async ({
  page,
}) => {
  await completeOnboarding(page);
  await switchProgramme(page, 'programvareutvikling', 'Programvareutvikling');
  await page.goto('/course/s1-m01-chk');

  await expect(
    page.getByText('Appen viser ikke om du har bestått eller ikke.', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText('Svar uten å slå opp i leksjonene.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('Fullført betyr at du har gått gjennom økta.', {
      exact: false,
    }),
  ).toBeVisible();

  const gate = exercise(page, 4);
  await answerByKeyboard(page, gate);
  await expect(gate.getByRole('button', { name: 'Prøv igjen' })).toHaveCount(0);
  await expect(
    gate.getByText('kan ikke prøves på nytt ennå', { exact: false }),
  ).toBeVisible();

  await page.goto('/course/s1-m01-ret');
  await expect(
    page.getByText('Svar uten å slå opp i leksjonene.', { exact: false }),
  ).toBeVisible();
});
