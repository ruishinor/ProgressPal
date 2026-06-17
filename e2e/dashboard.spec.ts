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
  // The dashboard loads its local data asynchronously. Wait for a stable
  // ready-state card heading so callers act on fully-loaded dashboard content.
  await expect(
    page.getByRole('heading', { name: 'Course progress' }),
  ).toBeVisible();
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
    .getByRole('link', { name: 'Open' })
    .click();

  await expect(page).toHaveURL(/\/course\/week-0-lecture$/);
  await expect(
    page.getByRole('heading', { name: 'Week 0: Scratch - Lecture' }),
  ).toBeVisible();
  await page.getByLabel('Session Notes').fill('Saved from Playwright.');
  await page.getByRole('button', { name: 'Save session' }).click();

  await expect(
    page.getByText('Last watched 0:00-20:00 (20 min)'),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('Last watched 0:00-20:00 (20 min)'),
  ).toBeVisible();

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
      seedVersion: 20260617,
    });

  // The /onboarding -> /dashboard redirect re-loads the dashboard's local data;
  // wait for the ready-state dashboard before scanning for accessibility issues.
  await expect(
    page.getByRole('heading', { name: 'Course progress' }),
  ).toBeVisible();

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
    '1 of 2 required tasks complete',
  );
  await expect(page.getByTestId('course-item-week-0-lecture')).toContainText(
    'Completed',
  );

  await page.reload();

  await expect(page.getByTestId('course-unit-week-0')).toContainText(
    '1 of 2 required tasks complete',
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
    '20 min logged · 1 of 8 segments complete · Resume at 20:00',
  );
  await expect(page.getByTestId('course-item-week-0-lecture')).toContainText(
    'Started',
  );

  await page.reload();

  await expect(page.getByTestId('course-item-week-0-lecture')).toContainText(
    '20 min logged · 1 of 8 segments complete · Resume at 20:00',
  );
  expect(consoleIssues).toEqual([]);
});

test('renders an accessible dashboard derived from a real saved activity flow', async ({
  page,
}) => {
  const consoleIssues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleIssues.push(message.text());
    }
  });

  await completeOnboarding(page);

  // One explicit save through the real app: log a watched long-form range. This
  // persists a media event, resume point, and started progress locally. (No
  // blocked item is created, to avoid the deferred dark-theme .card--danger
  // contrast issue recorded in PROJECT_STATE.)
  await page.goto('/course');
  await page
    .getByTestId('course-item-week-0-lecture')
    .getByRole('link', { name: 'Open' })
    .click();
  await expect(page).toHaveURL(/\/course\/week-0-lecture$/);
  await page.getByLabel('Session Notes').fill('Saved from Playwright.');
  await page.getByRole('button', { name: 'Save session' }).click();
  await expect(
    page.getByText('Last watched 0:00-20:00 (20 min)'),
  ).toBeVisible();

  // Open the dashboard so it reads the freshly persisted activity.
  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', { name: 'Course progress' }),
  ).toBeVisible();

  // Every dashboard section renders from local data.
  for (const sectionHeading of [
    'Course progress',
    "What's next?",
    'XP',
    'Achievements',
    'Resume lecture',
    'Needs attention',
    'Study sessions',
    'Recent activity',
  ]) {
    await expect(
      page.getByRole('heading', { name: sectionHeading, exact: true }),
    ).toBeVisible();
  }

  // A few stable, non-brittle derived values (exhaustive number checks live in
  // the model/app unit tests, not here).
  await expect(page.getByText(/required tasks complete/)).toBeVisible();
  await expect(page.getByText('Resume at 20:00')).toBeVisible();
  await expect(page.getByText('No local activity recorded yet.')).toHaveCount(
    0,
  );

  // Actionable card links point at the right local routes.
  await expect(page.getByRole('link', { name: 'Start' })).toHaveAttribute(
    'href',
    '/course/week-0-lecture',
  );
  await expect(page.getByRole('link', { name: 'Resume' })).toHaveAttribute(
    'href',
    '/course/week-0-lecture',
  );
  await expect(
    page.getByRole('link', { name: 'View achievements' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open sessions' })).toBeVisible();

  // Regression guard: the dashboard must not use design-system card variants
  // whose hardcoded light backgrounds are not dark-theme safe. axe cannot
  // evaluate their gradient backgrounds, so this guards what axe cannot.
  await expect(
    page.locator('.card--accent, .card--danger, .state-card'),
  ).toHaveCount(0);

  // The fully loaded dashboard is accessible.
  const accessibilityScan = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScan.violations).toEqual([]);
  expect(consoleIssues).toEqual([]);
});

test('keeps the dashboard accessible when a blocked item is present', async ({
  page,
}) => {
  const consoleIssues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleIssues.push(message.text());
    }
  });

  await completeOnboarding(page);

  // A blocked required item drives the dashboard's "Needs attention" state.
  await writeProgressEntry(page, {
    confidence: 0,
    createdAt: '2026-06-12T09:00:00.000Z',
    id: 'progress-week-0-problem-set',
    itemId: 'week-0-problem-set',
    notes: 'Stuck on the distribution.',
    startedAt: '2026-06-12T08:00:00.000Z',
    status: 'blocked',
    updatedAt: '2026-06-12T09:00:00.000Z',
  });

  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', { name: 'Course progress' }),
  ).toBeVisible();

  // Needs attention surfaces the blocked item with a text label, not color
  // alone.
  await expect(
    page.getByRole('heading', { name: 'Needs attention', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('a[href="/course/week-0-problem-set"]'),
  ).toBeVisible();

  // Even in the blocked state the dashboard avoids the non-dark-theme-safe
  // card variants (the Needs attention card uses a normal surface + StatusPill).
  await expect(
    page.locator('.card--accent, .card--danger, .state-card'),
  ).toHaveCount(0);

  // The dashboard must stay accessible in this expected blocked-item state.
  const accessibilityScan = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScan.violations).toEqual([]);
  expect(consoleIssues).toEqual([]);
});
