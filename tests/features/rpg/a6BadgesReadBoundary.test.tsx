import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { RpgRouteShell } from '@/app/shell/RpgRouteShell';
import { RpgBadgesPage } from '@/features/rpg/routes/RpgBadgesPage';
import { RpgShell } from '@/features/rpg/shell/RpgShell';
import { achievementDefinitions } from '@/lib/achievements';
import {
  AppStateContext,
  type AppStateContextValue,
} from '@/lib/appState/AppStateContext';
import * as database from '@/lib/db';
import {
  closeSharedDatabase,
  createProgressPalDatabase,
  deleteSharedDatabase,
  getSharedDatabase,
} from '@/lib/db/database';
import {
  AchievementUnlockSchema,
  XpTransactionSchema,
  type XpTransaction,
} from '@/lib/domain';
import { getLocalCoordinationStatus } from '@/lib/storage';
import { calculateXpSummary } from '@/lib/xp/engine';
import { bundledCourseSeed } from '@/seed';
import {
  installDatabaseAccessProbe,
  type DatabaseAccessSnapshot,
} from '../../db/accessProbe';

const fixtureXpCount = 7;
const childStores = ['achievement_unlocks', 'xp_transactions'].sort();
const hudStores = [
  'content_assets',
  'content_slices',
  'course_items',
  'course_units',
  'learner_profile',
  'media_progress_events',
  'progress_entries',
  'resume_points',
  'xp_transactions',
].sort();

function sameStores(left: readonly string[], right: readonly string[]) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function createXpFixtures(count: number): XpTransaction[] {
  const baseAwardedAt = Date.UTC(2026, 8, 1, 8, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const awardedAt = new Date(baseAwardedAt + index * 60_000).toISOString();

    return XpTransactionSchema.parse({
      id: `a6-xp-${String(index).padStart(5, '0')}`,
      sourceType: 'a6-fixture',
      sourceId: `a6-source-${String(index).padStart(5, '0')}`,
      xp: 25 + index,
      reason: `A6 XP fixture ${index + 1}`,
      awardedAt,
      createdAt: awardedAt,
      updatedAt: awardedAt,
    });
  });
}

function createReadyAppState(
  appMeta: NonNullable<AppStateContextValue['appMeta']>,
  profile: NonNullable<AppStateContextValue['profile']>,
): AppStateContextValue {
  return {
    appMeta,
    coordination: getLocalCoordinationStatus(),
    dataEpoch: 0,
    error: null,
    persistenceStatus: 'persistent',
    profile,
    refresh: async () => undefined,
    requestPersistentStorage: async () => 'persistent',
    runLocalMutation: async <Result,>(mutation: () => Promise<Result>) =>
      mutation(),
    requiresOnboarding: false,
    saveProfile: async () => {
      throw new Error('A6 Badges harness must not save the profile.');
    },
    status: 'ready',
  };
}

function renderActualBadgesRoute(appState: AppStateContextValue) {
  const router = createMemoryRouter(
    [
      {
        path: '/rpg',
        element: <RpgRouteShell />,
        children: [
          {
            element: <RpgShell />,
            children: [
              {
                path: 'badges',
                element: <RpgBadgesPage />,
              },
            ],
          },
        ],
      },
    ],
    {
      initialEntries: ['/rpg/badges'],
    },
  );

  return render(
    <AppStateContext.Provider value={appState}>
      <RouterProvider router={router} />
    </AppStateContext.Provider>,
  );
}

async function seedSharedDatabase(xpTransactions: readonly XpTransaction[]) {
  await deleteSharedDatabase();

  const writer = createProgressPalDatabase();
  const initialization = await database.initializeDatabase({
    db: writer,
    seed: bundledCourseSeed,
  });
  const profile = await database.getProfile({ db: writer });

  if (profile === null) {
    writer.close();
    throw new Error('A6 fixture initialization did not create a profile.');
  }

  const firstStep = achievementDefinitions.find(
    (definition) => definition.id === 'first-step',
  );

  if (firstStep === undefined) {
    writer.close();
    throw new Error(
      'A6 fixture requires the code-defined first-step achievement.',
    );
  }

  if (xpTransactions.length > 0) {
    await writer.xpTransactions.bulkPut([...xpTransactions]);
  }

  const unlockedAt = '2026-09-21T10:00:00.000Z';
  await writer.achievementUnlocks.put(
    AchievementUnlockSchema.parse({
      id: 'a6-first-step-unlock',
      achievementId: firstStep.id,
      unlockedAt,
      triggerSourceId: 'a6-first-step-trigger',
      createdAt: unlockedAt,
      updatedAt: unlockedAt,
    }),
  );

  writer.close();
  closeSharedDatabase();

  return { initialization, profile };
}

function isA6ChildTransaction(stores: readonly string[]) {
  return (
    stores.length > 0 &&
    stores.every((store) => childStores.includes(store)) &&
    stores.some((store) => childStores.includes(store))
  );
}

function sumOperations(
  access: DatabaseAccessSnapshot,
  transactionIds: ReadonlySet<string>,
  store: string,
  key: 'materializedRows' | 'rowsScanned',
) {
  return access.operations
    .filter(
      (operation) =>
        transactionIds.has(operation.transactionId) &&
        operation.store === store,
    )
    .reduce((sum, operation) => sum + operation[key], 0);
}

describe('A6 Badges actual-route read boundary', () => {
  afterEach(async () => {
    cleanup();
    closeSharedDatabase();
    await deleteSharedDatabase();
  });

  it('renders the real RPG achievements surface while requiring zero hidden XP source materialization', async () => {
    const xpTransactions = createXpFixtures(fixtureXpCount);
    const expectedXpSummary = calculateXpSummary(
      xpTransactions.reduce((sum, transaction) => sum + transaction.xp, 0),
    );
    const { initialization, profile } =
      await seedSharedDatabase(xpTransactions);

    // Fixture writes are complete before the measured reader exists. The probe
    // is installed before the shared reader first opens.
    const measuredReader = getSharedDatabase();
    expect(measuredReader.isOpen()).toBe(false);
    const accessProbe = installDatabaseAccessProbe(measuredReader);

    const { container } = renderActualBadgesRoute(
      createReadyAppState(initialization.appMeta, profile),
    );

    await screen.findByRole('heading', { name: 'Achievements' });
    const levelLabels = await screen.findAllByText(
      `Level ${expectedXpSummary.level}`,
    );
    expect(levelLabels.length).toBeGreaterThan(0);
    await screen.findByText(`1 of ${achievementDefinitions.length} unlocked`);

    const firstStepCard = await screen.findByTestId('achievement-first-step');
    expect(firstStepCard).toHaveAttribute('data-unlocked', 'true');
    expect(within(firstStepCard).getByText('Earned')).toBeInTheDocument();

    await waitFor(() => {
      expect(container.querySelectorAll('.achievement-card')).toHaveLength(
        achievementDefinitions.length,
      );
    });
    await waitFor(() => {
      expect(
        screen.getByRole('region', { name: 'Persistent hero HUD' }),
      ).not.toHaveTextContent('Loading your Hero');
    });

    const access = accessProbe.snapshot();
    const hudTransactions = access.transactions.filter((transaction) =>
      sameStores(transaction.stores, hudStores),
    );
    const childTransactions = access.transactions.filter((transaction) =>
      isA6ChildTransaction(transaction.stores),
    );
    const childTransactionIds = new Set(
      childTransactions.map((transaction) => transaction.id),
    );
    const childOperations = access.operations.filter((operation) =>
      childTransactionIds.has(operation.transactionId),
    );
    const childXpOperations = childOperations.filter(
      (operation) => operation.store === 'xp_transactions',
    );
    const childUnlockOperations = childOperations.filter(
      (operation) => operation.store === 'achievement_unlocks',
    );
    const persistedDefinitionReads = access.operations.filter(
      (operation) => operation.store === 'achievement_definitions',
    ).length;
    const childXpRowsScanned = sumOperations(
      access,
      childTransactionIds,
      'xp_transactions',
      'rowsScanned',
    );
    const childXpSourceRowsMaterialized = sumOperations(
      access,
      childTransactionIds,
      'xp_transactions',
      'materializedRows',
    );

    console.info(
      'A6_BADGES_RED_ACCESS_EVIDENCE',
      JSON.stringify({
        primaryRole: 'access',
        fixtureXpCount,
        achievementDefinitionCount: achievementDefinitions.length,
        visibleAchievementRows:
          container.querySelectorAll('.achievement-card').length,
        childStores,
        childTransactionCount: childTransactions.length,
        childTransactions,
        childQueryCount: childOperations.length,
        childUnlockQueryCount: childUnlockOperations.length,
        childXpQueryCount: childXpOperations.length,
        childXpRowsScanned,
        childXpSourceRowsMaterialized,
        persistedDefinitionReads,
        hudTransactionCount: hudTransactions.length,
        writesObserved: access.writesObserved,
      }),
    );

    expect(hudTransactions).toHaveLength(1);
    expect(hudTransactions[0]?.mode).toBe('readonly');
    expect(hudTransactions[0]?.stores).not.toContain('achievement_unlocks');
    expect(hudTransactions[0]?.stores).not.toContain('achievement_definitions');

    expect(childTransactions.length).toBeGreaterThanOrEqual(1);
    expect(childTransactions.length).toBeLessThanOrEqual(2);
    expect(
      childTransactions.every((transaction) => transaction.mode === 'readonly'),
    ).toBe(true);
    expect(childOperations).toHaveLength(2);
    expect(childUnlockOperations).toHaveLength(1);
    expect(childXpOperations).toHaveLength(1);
    expect(childXpRowsScanned).toBe(fixtureXpCount);
    expect(persistedDefinitionReads).toBe(0);
    expect(access.writesObserved).toBe(0);

    console.info(
      'A6_BADGES_EXPECTED_RED_MECHANISM',
      JSON.stringify({
        observedSourceRowsMaterialized: childXpSourceRowsMaterialized,
        requiredSourceRowsMaterialized: 0,
      }),
    );

    expect(
      childXpSourceRowsMaterialized,
      'A6_BADGES_HIDDEN_XP_SOURCE_MATERIALIZATION',
    ).toBe(0);
  });
});
