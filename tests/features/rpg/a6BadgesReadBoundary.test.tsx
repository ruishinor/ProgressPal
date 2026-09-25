import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RpgRouteShell } from '@/app/shell/RpgRouteShell';
import { AchievementsPage } from '@/features/achievements/routes/AchievementsPage';
import { buildCategoryOptions } from '@/features/achievements/model';
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
import { SchemaValidationError } from '@/lib/validation';
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

function createUnlock(achievementId: string) {
  const unlockedAt = '2026-09-21T10:00:00.000Z';
  return AchievementUnlockSchema.parse({
    id: `a6-unlock-${achievementId}`,
    achievementId,
    unlockedAt,
    triggerSourceId: 'a6-trigger',
    createdAt: unlockedAt,
    updatedAt: unlockedAt,
  });
}

async function seedSharedDatabase(
  xpTransactions: readonly XpTransaction[],
  unlockedIds: readonly string[] = ['first-step'],
) {
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

  if (xpTransactions.length > 0) {
    await writer.xpTransactions.bulkPut([...xpTransactions]);
  }

  await writer.achievementUnlocks.bulkPut(unlockedIds.map(createUnlock));

  writer.close();
  closeSharedDatabase();

  return { initialization, profile };
}

function renderVariant(
  variant: 'classic' | 'rpg',
  appState: AppStateContextValue,
) {
  if (variant === 'rpg') return renderActualBadgesRoute(appState);

  const router = createMemoryRouter(
    [{ path: '/achievements', element: <AchievementsPage /> }],
    { initialEntries: ['/achievements'] },
  );
  return render(<RouterProvider router={router} />);
}

function assertChildAccess(access: DatabaseAccessSnapshot, xpCount: number) {
  expect(access.transactions).toHaveLength(1);
  expect(access.transactions[0]).toMatchObject({
    stores: childStores,
    mode: 'readonly',
  });
  expect(access.operations).toHaveLength(2);
  const xp = access.operations.filter((op) => op.store === 'xp_transactions');
  const unlocks = access.operations.filter(
    (op) => op.store === 'achievement_unlocks',
  );
  expect(xp).toHaveLength(1);
  expect(xp[0]).toMatchObject({
    operation: 'cursor',
    materializedRows: 0,
    rowsScanned: xpCount,
  });
  expect(unlocks).toHaveLength(1);
  expect(unlocks[0]?.index).toBe('achievementId');
  expect(unlocks[0]?.rowsReturned).toBeLessThanOrEqual(
    achievementDefinitions.length,
  );
  expect(access.writesObserved).toBe(0);
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
    vi.restoreAllMocks();
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

    expect(childTransactions).toHaveLength(1);
    expect(childTransactions[0]?.stores).toEqual(childStores);
    expect(access.transactions).toHaveLength(2);
    expect(
      childTransactions.every((transaction) => transaction.mode === 'readonly'),
    ).toBe(true);
    expect(childOperations).toHaveLength(2);
    expect(childUnlockOperations).toHaveLength(1);
    expect(childXpOperations).toHaveLength(1);
    expect(childXpRowsScanned).toBe(fixtureXpCount);
    expect(persistedDefinitionReads).toBe(0);
    expect(access.writesObserved).toBe(0);

    const hudOperations = access.operations.filter(
      (operation) => operation.transactionId === hudTransactions[0]?.id,
    );
    expect(hudOperations.length).toBeLessThanOrEqual(10);
    expect(
      hudOperations
        .filter((op) => op.store === 'xp_transactions')
        .reduce((total, op) => total + op.rowsScanned, 0),
    ).toBe(fixtureXpCount);
    expect(
      hudOperations
        .filter((op) =>
          ['xp_transactions', 'media_progress_events'].includes(op.store),
        )
        .reduce((total, op) => total + op.materializedRows, 0),
    ).toBe(0);

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

  // Semantic equivalence: independent legacy projection / existing XP engine.
  it.each([
    { name: 'empty', xp: [], ids: [] },
    {
      name: 'mixed',
      xp: createXpFixtures(7).reverse(),
      ids: ['first-step', 'bug-hunter'],
    },
    {
      name: 'all unlocked at a level boundary',
      xp: [XpTransactionSchema.parse({ ...createXpFixtures(1)[0], xp: 400 })],
      ids: achievementDefinitions.map((definition) => definition.id),
    },
  ])('preserves $name semantics', async ({ xp, ids }) => {
    await seedSharedDatabase(xp, ids);
    const legacyView = await database.getAchievementsView();
    closeSharedDatabase();
    const reader = getSharedDatabase();
    const probe = installDatabaseAccessProbe(reader);
    const result = await database.readAchievementsSurfaceData();
    expect(result).toEqual({
      view: legacyView,
      xpSummary: calculateXpSummary(xp.reduce((sum, row) => sum + row.xp, 0)),
    });
    expect(result.view.unlockedCount).toBe(ids.length);
    assertChildAccess(probe.snapshot(), xp.length);
  });

  // Shared-surface semantics: code definitions, ordering, dates and filters.
  it.each(['classic', 'rpg'] as const)(
    'preserves %s cards and filters despite unrelated unlocks and persisted definitions',
    async (variant) => {
      const { initialization, profile } = await seedSharedDatabase(
        createXpFixtures(7),
        ['first-step', 'bug-hunter', 'zz-unknown'],
      );
      const writer = createProgressPalDatabase();
      const firstDefinition = achievementDefinitions[0]!;
      await writer.achievementDefinitions.put({
        ...firstDefinition,
        title: 'Stored override must not appear',
        description: 'Persisted copy must not replace product definitions.',
      });
      writer.close();
      const reader = getSharedDatabase();
      const probe = installDatabaseAccessProbe(reader);
      const { container } = renderVariant(
        variant,
        createReadyAppState(initialization.appMeta, profile),
      );
      await screen.findByText(`2 of ${achievementDefinitions.length} unlocked`);
      const ordered = [...achievementDefinitions].sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          a.title.localeCompare(b.title),
      );
      expect(
        [...container.querySelectorAll('.achievement-card')].map((card) =>
          card.getAttribute('data-testid'),
        ),
      ).toEqual(ordered.map((definition) => `achievement-${definition.id}`));
      for (const definition of achievementDefinitions) {
        const card = within(screen.getByTestId(`achievement-${definition.id}`));
        expect(
          card.getByRole('heading', { name: definition.title }),
        ).toBeInTheDocument();
        expect(card.getByText(definition.description)).toBeInTheDocument();
        expect(card.queryByText(/\bXP\b/)).not.toBeInTheDocument();
      }
      expect(
        screen.queryByText('Stored override must not appear'),
      ).not.toBeInTheDocument();
      const firstCard = within(screen.getByTestId('achievement-first-step'));
      expect(
        firstCard.getByText(variant === 'rpg' ? 'Earned' : 'Unlocked'),
      ).toBeInTheDocument();
      expect(
        firstCard.getByText(
          `${variant === 'rpg' ? 'Earned' : 'Unlocked'} 2026-09-21`,
        ),
      ).toBeInTheDocument();
      const view = {
        achievements: achievementDefinitions.map((definition) => ({
          ...definition,
          unlocked: false,
          unlockedAt: null,
          triggerSourceId: null,
        })),
        totalCount: achievementDefinitions.length,
        unlockedCount: 0,
      };
      expect(
        within(screen.getByLabelText('Category'))
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(buildCategoryOptions(view).map((option) => option.label));
      fireEvent.change(screen.getByLabelText('Status'), {
        target: { value: 'unlocked' },
      });
      expect(container.querySelectorAll('.achievement-card')).toHaveLength(2);
      fireEvent.change(screen.getByLabelText('Category'), {
        target: { value: 'debugging' },
      });
      expect(container.querySelectorAll('.achievement-card')).toHaveLength(1);
      expect(screen.getByTestId('achievement-bug-hunter')).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Status'), {
        target: { value: 'locked' },
      });
      await screen.findByText('Nothing to show here yet');
      const access = probe.snapshot();
      expect(
        access.operations.some((op) => op.store === 'achievement_definitions'),
      ).toBe(false);
      expect(access.writesObserved).toBe(0);
    },
  );

  // Scale: fixture setup is outside the measured read. The query skips unknown IDs.
  it.each([1_000, 10_000])(
    'streams %i XP rows with fixed child access',
    async (count) => {
      const xp = createXpFixtures(count);
      const ids = [
        'first-step',
        'bug-hunter',
        ...Array.from({ length: count }, (_, index) => `zz-unknown-${index}`),
      ];
      const fixtureStarted = performance.now();
      await seedSharedDatabase(xp, ids);
      const fixtureDurationMs = Math.round(performance.now() - fixtureStarted);
      const reader = getSharedDatabase();
      const probe = installDatabaseAccessProbe(reader);
      const started = performance.now();
      const result = await database.readAchievementsSurfaceData();
      const readDurationMs = Math.round(performance.now() - started);
      const access = probe.snapshot();
      assertChildAccess(access, count);
      expect(result.view.achievements).toHaveLength(
        achievementDefinitions.length,
      );
      expect(result.view.unlockedCount).toBe(2);
      expect(result.xpSummary).toEqual(
        calculateXpSummary(xp.reduce((sum, row) => sum + row.xp, 0)),
      );
      expect(Object.keys(result).sort()).toEqual(['view', 'xpSummary']);
      console.info(
        'A6_SCALE_EVIDENCE',
        JSON.stringify({
          count,
          fixtureDurationMs,
          readDurationMs,
          visibleAchievements: result.view.achievements.length,
          access,
        }),
      );
    },
    30_000,
  );

  // Coherence: a two-store writer cannot split unlock and XP versions.
  it('holds unlock and XP state in one snapshot across a competing atomic write', async () => {
    const xp = createXpFixtures(1);
    await seedSharedDatabase(xp);
    const writer = createProgressPalDatabase();
    await writer.open();
    let announceRead!: () => void;
    let releaseRead!: () => void;
    const reached = new Promise<void>((resolve) => {
      announceRead = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    let paused = false;
    const reader = getSharedDatabase();
    const probe = installDatabaseAccessProbe(reader, {
      beforeCursor(op) {
        if (!paused && op.store === 'xp_transactions') {
          paused = true;
          announceRead();
          return release;
        }
      },
    });
    let writerState: 'pending' | 'fulfilled' | 'rejected' = 'pending';
    let writerError: unknown;
    const read = database.readAchievementsSurfaceData();
    let write: Promise<void> | undefined;
    try {
      await reached;
      write = writer
        .transaction(
          'rw',
          [writer.achievementUnlocks, writer.xpTransactions],
          async () => {
            await writer.achievementUnlocks.put(createUnlock('bug-hunter'));
            await writer.xpTransactions.update(xp[0]!.id, { xp: 400 });
          },
        )
        .then(
          () => {
            writerState = 'fulfilled';
          },
          (error: unknown) => {
            writerState = 'rejected';
            writerError = error;
          },
        );
      await Promise.race([
        write,
        new Promise<void>((resolve) => {
          setTimeout(resolve, 25);
        }),
      ]);
      expect(writerState).toBe('pending');
      releaseRead();
      const before = await read;
      await write;
      expect(writerState).toBe('fulfilled');
      expect(writerError).toBeUndefined();
      expect(before.view.unlockedCount).toBe(1);
      expect(before.xpSummary).toEqual(calculateXpSummary(25));
      assertChildAccess(probe.snapshot(), 1);
      const after = await database.readAchievementsSurfaceData();
      expect(after.view.unlockedCount).toBe(2);
      expect(after.xpSummary).toEqual(calculateXpSummary(400));
    } finally {
      releaseRead();
      await Promise.allSettled([read, ...(write ? [write] : [])]);
      writer.close();
    }
  });

  // Stored-schema validation: no partial ready result, including malformed tail XP.
  it.each(['xp', 'unlock'] as const)(
    'rejects malformed stored %s rows',
    async (kind) => {
      const xp = createXpFixtures(7);
      await seedSharedDatabase(xp);
      const writer = createProgressPalDatabase();
      if (kind === 'xp')
        await writer.xpTransactions.update(xp[6]!.id, { xp: -1 });
      else
        await writer.achievementUnlocks.update(createUnlock('first-step').id, {
          unlockedAt: 'invalid',
        });
      writer.close();
      const probe = installDatabaseAccessProbe(getSharedDatabase());
      await expect(
        database.readAchievementsSurfaceData(),
      ).rejects.toBeInstanceOf(SchemaValidationError);
      expect(probe.snapshot().writesObserved).toBe(0);
    },
  );

  // Retry composition: failure occurs inside the real child DB read, not a mock loader.
  it.each(['classic', 'rpg'] as const)(
    'retries one failed %s child read without a HUD or app refresh',
    async (variant) => {
      const { initialization, profile } = await seedSharedDatabase(
        createXpFixtures(7),
      );
      const appState = createReadyAppState(initialization.appMeta, profile);
      const appRefresh = vi.spyOn(appState, 'refresh');
      const errorLog = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      let failed = false;
      const probe = installDatabaseAccessProbe(getSharedDatabase(), {
        beforeCursor(op) {
          if (!failed && op.store === 'achievement_unlocks') {
            failed = true;
            throw new Error('Synthetic child read interruption');
          }
        },
      });
      renderVariant(variant, appState);
      await screen.findByText('Achievements could not be read');
      expect(
        screen.queryByTestId('achievement-first-step'),
      ).not.toBeInTheDocument();
      if (variant === 'rpg') {
        const hud = within(
          screen.getByRole('region', { name: 'Persistent hero HUD' }),
        );
        const expectedXp = calculateXpSummary(
          createXpFixtures(7).reduce((sum, row) => sum + row.xp, 0),
        );
        await hud.findByLabelText(`Level ${expectedXp.level}`);
      }
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      await screen.findByText(`1 of ${achievementDefinitions.length} unlocked`);
      const access = probe.snapshot();
      expect(
        access.transactions.filter((tx) => sameStores(tx.stores, childStores)),
      ).toHaveLength(2);
      expect(
        access.transactions.filter((tx) => sameStores(tx.stores, hudStores)),
      ).toHaveLength(variant === 'rpg' ? 1 : 0);
      expect(access.writesObserved).toBe(0);
      expect(appRefresh).not.toHaveBeenCalled();
      expect(errorLog).toHaveBeenCalledTimes(1);
    },
  );

  it('retries a failed A4 HUD independently from a ready Badges child', async () => {
    const { initialization, profile } = await seedSharedDatabase(
      createXpFixtures(7),
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let failed = false;
    const probe = installDatabaseAccessProbe(getSharedDatabase(), {
      beforeCursor(op) {
        if (!failed && op.store === 'media_progress_events') {
          failed = true;
          throw new Error('Synthetic HUD read interruption');
        }
      },
    });
    renderActualBadgesRoute(
      createReadyAppState(initialization.appMeta, profile),
    );
    await screen.findByText('Hero state unavailable');
    await screen.findByText(`1 of ${achievementDefinitions.length} unlocked`);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    const hud = within(
      screen.getByRole('region', { name: 'Persistent hero HUD' }),
    );
    const expectedXp = calculateXpSummary(
      createXpFixtures(7).reduce((sum, row) => sum + row.xp, 0),
    );
    await hud.findByLabelText(`Level ${expectedXp.level}`);
    const access = probe.snapshot();
    expect(
      access.transactions.filter((tx) => sameStores(tx.stores, childStores)),
    ).toHaveLength(1);
    expect(
      access.transactions.filter((tx) => sameStores(tx.stores, hudStores)),
    ).toHaveLength(2);
    expect(access.writesObserved).toBe(0);
  });
});
