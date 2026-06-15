import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function readDatabaseSingletons(page: Page) {
  return (await page.evaluate(`
    new Promise((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB in the browser context.'));
      };

      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(
          ['app_meta', 'learner_profile', 'course_units', 'course_items'],
          'readonly',
        );
        const appMetaRequest = transaction.objectStore('app_meta').getAll();
        const learnerProfileRequest =
          transaction.objectStore('learner_profile').getAll();
        const courseUnitsRequest =
          transaction.objectStore('course_units').getAll();
        const courseItemsRequest =
          transaction.objectStore('course_items').getAll();

        transaction.oncomplete = () => {
          resolve({
            appMeta: Array.isArray(appMetaRequest.result)
              ? appMetaRequest.result
              : [],
            learnerProfile: Array.isArray(learnerProfileRequest.result)
              ? learnerProfileRequest.result
              : [],
            courseUnits: Array.isArray(courseUnitsRequest.result)
              ? courseUnitsRequest.result
              : [],
            courseItems: Array.isArray(courseItemsRequest.result)
              ? courseItemsRequest.result
              : [],
          });
          database.close();
        };

        transaction.onerror = () => {
          reject(new Error('Failed to read IndexedDB singleton stores.'));
          database.close();
        };
      };
    });
  `)) as {
    appMeta: Array<Record<string, unknown>>;
    courseItems: Array<Record<string, unknown>>;
    courseUnits: Array<Record<string, unknown>>;
    learnerProfile: Array<Record<string, unknown>>;
  };
}

async function readMotionSnapshot(page: Page) {
  return (await page.evaluate(`
    (() => {
      const toMilliseconds = (value) => {
        const firstValue = value.split(',')[0]?.trim() ?? '0s';

        if (firstValue.endsWith('ms')) {
          return Number.parseFloat(firstValue);
        }

        if (firstValue.endsWith('s')) {
          return Number.parseFloat(firstValue) * 1000;
        }

        return Number.parseFloat(firstValue) || 0;
      };

      const button = document.querySelector('.button');
      const progressFill = document.querySelector('.progress-bar__fill');

      if (!(button instanceof HTMLElement) || !(progressFill instanceof HTMLElement)) {
        throw new Error('Expected reduced-motion targets were not rendered.');
      }

      return {
        buttonTransitionDurationMs: toMilliseconds(
          getComputedStyle(button).transitionDuration,
        ),
        progressTransitionDurationMs: toMilliseconds(
          getComputedStyle(progressFill).transitionDuration,
        ),
      };
    })();
  `)) as {
    buttonTransitionDurationMs: number;
    progressTransitionDurationMs: number;
  };
}

async function writeProgressEntry(
  page: Page,
  progressEntry: Record<string, unknown>,
) {
  await page.evaluate(`
    new Promise((resolve, reject) => {
      const entry = ${JSON.stringify(progressEntry)};
      const request = indexedDB.open('progresspal-cs50-edition');

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB while writing progress.'));
      };

      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(
          ['progress_entries'],
          'readwrite',
        );

        transaction.objectStore('progress_entries').put(entry);

        transaction.oncomplete = () => {
          database.close();
          resolve();
        };

        transaction.onerror = () => {
          database.close();
          reject(new Error('Failed to persist progress entry in IndexedDB.'));
        };
      };
    });
  `);
}

async function writeMediaProgressEvent(
  page: Page,
  mediaProgressEvent: Record<string, unknown>,
) {
  await page.evaluate(`
    new Promise((resolve, reject) => {
      const eventRecord = ${JSON.stringify(mediaProgressEvent)};
      const request = indexedDB.open('progresspal-cs50-edition');

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB while writing media progress.'));
      };

      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(
          ['media_progress_events'],
          'readwrite',
        );

        transaction.objectStore('media_progress_events').put(eventRecord);

        transaction.oncomplete = () => {
          database.close();
          resolve();
        };

        transaction.onerror = () => {
          database.close();
          reject(new Error('Failed to persist media progress event in IndexedDB.'));
        };
      };
    });
  `);
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

test('redirects a fresh run to onboarding without console issues', async ({
  page,
}) => {
  const consoleIssues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleIssues.push(message.text());
    }
  });

  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole('heading', { name: 'Create your local learner profile' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Setup' })).toBeVisible();

  const accessibilityScan = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScan.violations).toEqual([]);
  expect(consoleIssues).toEqual([]);
});

test('opens the content-detail route, logs a watched range, and reflects it after reload', async ({
  page,
}) => {
  const consoleIssues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleIssues.push(message.text());
    }
  });

  await completeOnboarding(page);
  await page.goto('/course');
  await page
    .getByTestId('course-item-week-0-lecture')
    .getByRole('link', { name: 'Open detail' })
    .click();

  await expect(page).toHaveURL(/\/course\/week-0-lecture$/);
  await expect(
    page.getByRole('heading', { name: 'Week 0: Scratch - Lecture' }),
  ).toBeVisible();
  await page.getByLabel('Logging note').fill('Saved from Playwright.');
  await page.getByRole('button', { name: 'Save watched range' }).click();

  await expect(page.getByText('Last range 0:00-20:00 (20 min)')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Last range 0:00-20:00 (20 min)')).toBeVisible();

  await page.goto('/course');
  await expect(page.getByTestId('course-item-week-0-lecture')).toContainText(
    '20 min logged',
  );
  await expect(page.getByTestId('course-item-week-0-lecture')).toContainText(
    'Resume at 20:00',
  );
  expect(consoleIssues).toEqual([]);
});

test('creates a local profile, persists it across reload, and applies stored preferences', async ({
  page,
}) => {
  const consoleIssues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleIssues.push(message.text());
    }
  });

  await completeOnboarding(page);

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');

  const motionSnapshot = await readMotionSnapshot(page);

  expect(motionSnapshot.buttonTransitionDurationMs).toBeLessThanOrEqual(1);
  expect(motionSnapshot.progressTransitionDurationMs).toBeLessThanOrEqual(1);

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByLabel('Display name')).toHaveValue('Alex');
  await expect(page.getByLabel('Theme')).toHaveValue('dark');
  await expect(page.getByLabel('Reduce motion in this app')).toBeChecked();

  await page.reload();

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Create your local learner profile' }),
  ).toHaveCount(0);

  await page.goto('/onboarding');
  await expect(page).toHaveURL(/\/dashboard$/);

  await expect
    .poll(async () => {
      const snapshot = await readDatabaseSingletons(page);
      const learnerProfile = snapshot.learnerProfile[0] ?? {};
      const appMeta = snapshot.appMeta[0] ?? {};

      return {
        appMeta: snapshot.appMeta.length,
        courseItems: snapshot.courseItems.length,
        courseUnits: snapshot.courseUnits.length,
        displayName: learnerProfile.displayName ?? null,
        learnerProfile: snapshot.learnerProfile.length,
        onboardingCompletedAt:
          typeof appMeta.onboardingCompletedAt === 'string'
            ? appMeta.onboardingCompletedAt
            : null,
        seedVersion:
          typeof appMeta.seedVersion === 'number' ? appMeta.seedVersion : null,
      };
    })
    .toEqual({
      appMeta: 1,
      courseItems: 68,
      courseUnits: 14,
      displayName: 'Alex',
      learnerProfile: 1,
      onboardingCompletedAt: expect.any(String),
      seedVersion: 20260611,
    });

  const accessibilityScan = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScan.violations).toEqual([]);
  expect(consoleIssues).toEqual([]);
});

test('survives local storage reset, supports not-found routes, and keeps offline navigation after onboarding', async ({
  page,
}) => {
  const consoleIssues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleIssues.push(message.text());
    }
  });

  await completeOnboarding(page);

  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.goto('/missing-route');
  await expect(
    page.getByRole('heading', { name: 'Page not found' }),
  ).toBeVisible();

  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Skip to content' }).focus();
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();

  await page.context().setOffline(true);

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  await page.context().setOffline(false);
  expect(consoleIssues).toEqual([]);
});

test('renders the seeded course map and reflects persisted progress after reload', async ({
  page,
}) => {
  const consoleIssues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleIssues.push(message.text());
    }
  });

  await completeOnboarding(page);
  await writeProgressEntry(page, {
    completedAt: '2026-06-12T09:00:00.000Z',
    confidence: 1,
    createdAt: '2026-06-12T09:00:00.000Z',
    evidenceText: 'Completed locally.',
    evidenceType: 'self_report',
    id: 'progress-week-0-lecture',
    itemId: 'week-0-lecture',
    notes: 'Finished the lecture.',
    startedAt: '2026-06-12T07:00:00.000Z',
    status: 'completed',
    updatedAt: '2026-06-12T09:00:00.000Z',
  });

  await page.goto('/course');

  await expect(
    page.getByRole('heading', { level: 2, name: 'Course Map' }),
  ).toBeVisible();
  await expect(page.getByTestId('course-unit-week-0')).toContainText(
    'Week 0: Scratch',
  );
  await expect(page.getByTestId('course-unit-week-0')).toContainText(
    '1 of 2 required items complete',
  );
  await expect(page.getByTestId('course-item-week-0-lecture')).toContainText(
    'Completed',
  );

  await page.reload();

  await expect(page.getByTestId('course-unit-week-0')).toContainText(
    '1 of 2 required items complete',
  );
  expect(consoleIssues).toEqual([]);
});

test('renders persisted long-form progress summaries on the course map after reload', async ({
  page,
}) => {
  const consoleIssues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleIssues.push(message.text());
    }
  });

  await completeOnboarding(page);
  await writeMediaProgressEvent(page, {
    assetId: 'week-0-lecture-asset',
    completedSlice: true,
    createdAt: '2026-06-12T10:00:00.000Z',
    endSecond: 1200,
    energyAfter: 3,
    energyBefore: 4,
    id: 'media-event-week-0-lecture-1',
    itemId: 'week-0-lecture',
    notes: 'Reached my limit cleanly.',
    sessionId: undefined,
    sliceId: 'week-0-lecture-asset-slice-1',
    startSecond: 0,
    stoppedBecause: 'reached_limit',
    updatedAt: '2026-06-12T10:00:00.000Z',
    watchedSeconds: 1200,
  });

  await page.goto('/course');

  await expect(page.getByTestId('course-item-week-0-lecture')).toContainText(
    '20 min logged · 1 of 8 slices complete · Resume at 20:00',
  );
  await expect(page.getByTestId('course-item-week-0-lecture')).toContainText(
    'Started',
  );

  await page.reload();

  await expect(page.getByTestId('course-item-week-0-lecture')).toContainText(
    '20 min logged · 1 of 8 slices complete · Resume at 20:00',
  );
  expect(consoleIssues).toEqual([]);
});
