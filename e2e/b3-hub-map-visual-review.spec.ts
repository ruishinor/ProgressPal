import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

const visualReviewDirectory = path.resolve(
  'artifacts/b3-phase-3-visual-review',
);

type ProgressFixture = {
  completedAt?: string;
  confidence: number;
  createdAt: string;
  evidenceText?: string;
  evidenceType?: 'self_report';
  id: string;
  itemId: string;
  notes?: string;
  startedAt?: string;
  status: 'completed' | 'started';
  updatedAt: string;
};

interface IndexedDbBrowserScope {
  indexedDB: {
    open(name: string): {
      onerror: (() => void) | null;
      onsuccess: (() => void) | null;
      result: {
        close(): void;
        transaction(
          storeNames: string[],
          mode: 'readwrite',
        ): {
          objectStore(name: string): {
            put(value: unknown): unknown;
          };
          oncomplete: (() => void) | null;
          onerror: (() => void) | null;
        };
      };
    };
  };
}

async function capturePage(page: Page, fileName: string) {
  await page.screenshot({
    fullPage: true,
    path: path.join(visualReviewDirectory, fileName),
  });
}

async function writeProgressFixtures(
  page: Page,
  entries: readonly ProgressFixture[],
) {
  await page.evaluate(async (fixtures) => {
    await new Promise<void>((resolve, reject) => {
      const scope = globalThis as unknown as IndexedDbBrowserScope;
      const request = scope.indexedDB.open('progresspal-cs50-edition');

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB for B3 visual fixtures.'));
      };

      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(
          ['progress_entries'],
          'readwrite',
        );
        const store = transaction.objectStore('progress_entries');

        for (const entry of fixtures) {
          store.put(entry);
        }

        transaction.oncomplete = () => {
          database.close();
          resolve();
        };

        transaction.onerror = () => {
          database.close();
          reject(new Error('Failed to persist B3 visual fixtures.'));
        };
      };
    });
  }, entries);
}

const progressedFixtures: readonly ProgressFixture[] = [
  {
    completedAt: '2026-09-14T09:00:00.000Z',
    confidence: 4,
    createdAt: '2026-09-14T08:00:00.000Z',
    evidenceText: 'Visual review fixture.',
    evidenceType: 'self_report',
    id: 'b3-progress-week-0-lecture',
    itemId: 'week-0-lecture',
    notes: 'Completed for B3 visual review.',
    startedAt: '2026-09-14T08:00:00.000Z',
    status: 'completed',
    updatedAt: '2026-09-14T09:00:00.000Z',
  },
  {
    completedAt: '2026-09-14T11:00:00.000Z',
    confidence: 4,
    createdAt: '2026-09-14T10:00:00.000Z',
    evidenceText: 'Visual review fixture.',
    evidenceType: 'self_report',
    id: 'b3-progress-week-0-problem-set',
    itemId: 'week-0-problem-set',
    notes: 'Completed for B3 visual review.',
    startedAt: '2026-09-14T10:00:00.000Z',
    status: 'completed',
    updatedAt: '2026-09-14T11:00:00.000Z',
  },
  {
    confidence: 3,
    createdAt: '2026-09-18T18:00:00.000Z',
    id: 'b3-progress-week-4-lecture',
    itemId: 'week-4-lecture',
    notes: 'In progress for B3 visual review.',
    startedAt: '2026-09-18T18:00:00.000Z',
    status: 'started',
    updatedAt: '2026-09-18T18:30:00.000Z',
  },
];

test('captures fresh and progressed B3 Hub and Campaign Map states for owner visual review', async ({
  page,
}) => {
  await mkdir(visualReviewDirectory, { recursive: true });
  await completeOnboarding(page);

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto('/rpg');
  await expect(
    page.getByRole('heading', { exact: true, name: 'Home' }),
  ).toBeVisible();
  await capturePage(page, '390-rpg-hub-fresh.png');

  await page.goto('/rpg/map');
  await expect(
    page.getByRole('heading', { exact: true, name: 'Campaign' }),
  ).toBeVisible();
  await expect(
    page
      .getByTestId('rpg-module-week-0')
      .getByRole('link', { name: 'Continue learning' }),
  ).toHaveAttribute('aria-current', 'step');
  await capturePage(page, '390-rpg-campaign-map-fresh.png');

  await writeProgressFixtures(page, progressedFixtures);

  await page.goto('/rpg');
  const moduleContext = page.locator('.rpg-hub__module-context');
  await expect(
    moduleContext.getByText('Week 4: Memory', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Lecture 4: Memory', exact: true }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await capturePage(page, '390-rpg-hub-progressed.png');

  await page.goto('/rpg/map');
  const weekZeroModule = page.getByTestId('rpg-module-week-0');
  const weekFourModule = page.getByTestId('rpg-module-week-4');
  await expect(
    weekZeroModule.getByText('Completed', { exact: true }),
  ).toBeVisible();
  await expect(
    weekFourModule.getByText('Current module', { exact: true }),
  ).toBeVisible();
  await expect(
    weekFourModule.getByRole('link', { name: 'Continue learning' }),
  ).toHaveAttribute('aria-current', 'step');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await capturePage(page, '390-rpg-campaign-map-progressed.png');

  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto('/rpg');
  await expect(
    page.getByRole('heading', { exact: true, name: 'Home' }),
  ).toBeVisible();
  await expect(
    page.locator('.rpg-hub__module-context').getByText('Week 4: Memory', {
      exact: true,
    }),
  ).toBeVisible();
  await capturePage(page, '1280-rpg-hub-progressed.png');

  await page.goto('/rpg/map');
  await expect(
    page
      .getByTestId('rpg-module-week-4')
      .getByRole('link', { name: 'Continue learning' }),
  ).toHaveAttribute('aria-current', 'step');
  await capturePage(page, '1280-rpg-campaign-map-progressed.png');
});
