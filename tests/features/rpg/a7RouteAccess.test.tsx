import { cleanup, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { RpgRouteShell } from '@/app/shell/RpgRouteShell';
import { RpgBadgesPage } from '@/features/rpg/routes/RpgBadgesPage';
import { RpgFocusPage } from '@/features/rpg/routes/RpgFocusPage';
import { RpgHeroPage } from '@/features/rpg/routes/RpgHeroPage';
import { RpgHomePage } from '@/features/rpg/routes/RpgHomePage';
import { RpgMapPage } from '@/features/rpg/routes/RpgMapPage';
import { RpgModulePage } from '@/features/rpg/routes/RpgModulePage';
import { RpgResourcePage } from '@/features/rpg/routes/RpgResourcePage';
import { RpgShell } from '@/features/rpg/shell/RpgShell';
import {
  cs50AchievementDefinitions as achievementDefinitions,
  cs50Scope,
} from '../../programmes/cs50Policy';
import {
  AppStateContext,
  type AppStateContextValue,
} from '@/lib/appState/AppStateContext';
import {
  addStudySessionAndAwardXp,
  getDatabaseSnapshot,
  getProfile,
  initializeDatabase,
} from '@/lib/db';
import {
  closeSharedDatabase,
  createProgressPalDatabase,
  deleteSharedDatabase,
  getSharedDatabase,
} from '@/lib/db/database';
import { getLocalCoordinationStatus } from '@/lib/storage';
import { calculateXpSummary } from '@/lib/xp/engine';
import { bundledCourseSeed } from '@/seed';
import {
  installDatabaseAccessProbe,
  type DatabaseAccessSnapshot,
} from '../../db/accessProbe';
import { cs50CatalogueId, cs50Policy } from '../../programmes/cs50Policy';

const courseStores = [
  'content_assets',
  'content_slices',
  'course_items',
  'course_units',
  'media_progress_events',
  'progress_entries',
  'resume_points',
  'xp_transactions',
].sort();
const hudStores = [...courseStores, 'learner_profile'].sort();
const hubStores = [...hudStores, 'study_sessions'].sort();
const heroStores = [...hubStores, 'achievement_unlocks'].sort();
const focusStores = ['course_items', 'course_units', 'study_sessions'].sort();
const badgeStores = ['achievement_unlocks', 'xp_transactions'];

const routes = [
  {
    name: 'Hub',
    path: '/rpg',
    stores: hubStores,
    budget: 11,
    hud: false,
    readyHeading: 'Progress snapshot',
  },
  {
    name: 'Map',
    path: '/rpg/map',
    stores: courseStores,
    budget: 8,
    hud: true,
    readyHeading: 'Course route',
  },
  {
    name: 'Module',
    path: '/rpg/week/week-0',
    stores: courseStores,
    budget: 8,
    hud: true,
    readyHeading: 'Tasks and resources',
  },
  {
    name: 'Resource',
    path: '/rpg/resource/week-0-lecture',
    stores: courseStores,
    budget: 9,
    hud: true,
    readyHeading: 'Save progress',
  },
  {
    name: 'Focus',
    path: '/rpg/focus?itemId=week-0-lecture',
    stores: focusStores,
    budget: 3,
    hud: true,
    readyHeading: 'Live focus session',
  },
  {
    name: 'Badges',
    path: '/rpg/badges',
    stores: badgeStores,
    budget: 2,
    hud: true,
    readyHeading: 'Achievements',
  },
  {
    name: 'Hero',
    path: '/rpg/hero',
    stores: heroStores,
    budget: 11,
    hud: false,
    readyHeading: 'Local activity totals',
  },
];

function assertLogicalRead(
  access: DatabaseAccessSnapshot,
  stores: string[],
  budget: number,
  repeatedStore?: string,
) {
  const transactions = access.transactions.filter(
    (tx) => JSON.stringify(tx.stores) === JSON.stringify(stores),
  );
  expect(transactions).toHaveLength(1);
  expect(transactions[0]?.mode).toBe('readonly');
  const operations = access.operations.filter(
    (op) => op.transactionId === transactions[0]?.id,
  );
  expect(operations.length).toBeLessThanOrEqual(budget);
  expect([...new Set(operations.map((op) => op.store))].sort()).toEqual(stores);
  for (const store of stores) {
    expect(
      operations.filter((op) => op.store === store).length,
    ).toBeLessThanOrEqual(store === repeatedStore ? 2 : 1);
  }
}

describe('A7 actual route and shell access matrix', () => {
  afterEach(async () => {
    cleanup();
    closeSharedDatabase();
    await deleteSharedDatabase();
  });

  it.each(routes)(
    '$name satisfies aggregate access and all-store nonmutation',
    async (route) => {
      await deleteSharedDatabase();
      const writer = createProgressPalDatabase();
      const initialization = await initializeDatabase({
        db: writer,
        seed: bundledCourseSeed,
      });
      const profile = await getProfile({ db: writer });
      if (profile === null) throw new Error('A7 initialized profile missing');
      const save = await addStudySessionAndAwardXp(
        {
          id: 'a7-route-session',
          unitId: 'week-0',
          itemId: 'week-0-lecture',
          startedAt: '2026-09-21T10:00:00.000Z',
          endedAt: '2026-09-21T10:25:00.000Z',
          durationMinutes: 25,
          mode: 'coding',
          notes: 'A7 visible session',
        },
        { catalogueId: cs50CatalogueId, policy: cs50Policy, db: writer },
      );
      const before = await getDatabaseSnapshot({ db: writer });
      expect(Object.keys(before)).toHaveLength(14);
      writer.close();

      const appState: AppStateContextValue = {
        appMeta: initialization.appMeta,
        coordination: getLocalCoordinationStatus(),
        dataEpoch: 0,
        error: null,
        persistenceStatus: 'persistent',
        profile,
        programmeScope: cs50Scope,
        refresh: async () => {
          throw new Error('Passive route unexpectedly refreshed app state');
        },
        requestPersistentStorage: async () => 'persistent',
        runLocalMutation: async () => {
          throw new Error('Passive route attempted a mutation');
        },
        requiresOnboarding: false,
        saveProfile: async () => {
          throw new Error('Passive route attempted profile save');
        },
        status: 'ready',
      };
      const reader = getSharedDatabase();
      expect(reader.isOpen()).toBe(false);
      const probe = installDatabaseAccessProbe(reader);
      const router = createMemoryRouter(
        [
          {
            path: '/rpg',
            element: <RpgRouteShell />,
            children: [
              {
                element: <RpgShell />,
                children: [
                  { index: true, element: <RpgHomePage /> },
                  { path: 'map', element: <RpgMapPage /> },
                  { path: 'week/:unitId', element: <RpgModulePage /> },
                  { path: 'resource/:itemId', element: <RpgResourcePage /> },
                  { path: 'focus', element: <RpgFocusPage /> },
                  { path: 'badges', element: <RpgBadgesPage /> },
                  { path: 'hero', element: <RpgHeroPage /> },
                ],
              },
            ],
          },
        ],
        { initialEntries: [route.path] },
      );
      const { container } = render(
        <AppStateContext.Provider value={appState}>
          <RouterProvider router={router} />
        </AppStateContext.Provider>,
      );
      try {
        await screen.findByRole('heading', { name: route.readyHeading });
        if (route.name !== 'Hero') {
          const hud = screen.getByRole('region', {
            name: 'Persistent hero HUD',
          });
          await within(hud).findByLabelText(
            `Level ${calculateXpSummary(save.xpSummary.totalXp).level}`,
          );
        }
        if (route.name === 'Focus') {
          await screen.findByText('Review saved sessions (1)');
          expect(
            container.querySelectorAll('.session-ledger-list__item'),
          ).toHaveLength(1);
        }
        if (route.name === 'Badges') {
          await screen.findByText(
            `${before.achievementUnlocks.length} of ${achievementDefinitions.length} unlocked`,
          );
        }
        const access = probe.snapshot();
        expect(access.transactions).toHaveLength(route.hud ? 2 : 1);
        assertLogicalRead(
          access,
          route.stores,
          route.budget,
          route.name === 'Hub'
            ? 'xp_transactions'
            : route.name === 'Resource'
              ? 'course_items'
              : undefined,
        );
        if (route.hud)
          assertLogicalRead(access, hudStores, 10, 'xp_transactions');
        expect(access.writesObserved).toBe(0);
        for (const op of access.operations) {
          expect([
            'app_meta',
            'backups',
            'achievement_definitions',
          ]).not.toContain(op.store);
          if (
            [
              'media_progress_events',
              'study_sessions',
              'xp_transactions',
            ].includes(op.store)
          ) {
            expect(op.materializedRows).toBe(0);
          }
        }
        // Completeness reads use the uninstrumented writer after route work is ready.
        const after = await getDatabaseSnapshot({ db: writer });
        expect(after).toEqual(before);
        console.info(
          'A7_ROUTE_ACCESS',
          JSON.stringify({
            route: route.name,
            access,
            visibleSessionRows: container.querySelectorAll(
              '.session-ledger-list__item',
            ).length,
            all14StoresEqual: true,
          }),
        );
      } finally {
        router.dispose();
        writer.close();
      }
    },
  );
});
