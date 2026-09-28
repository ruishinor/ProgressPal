import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RpgRouteShell } from '@/app/shell/RpgRouteShell';
import { RpgFocusPage } from '@/features/rpg/routes/RpgFocusPage';
import { RpgShell } from '@/features/rpg/shell/RpgShell';
import {
  buildSessionCatalog,
  buildSessionLedgerRow,
} from '@/features/sessions/model';
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
import { StudySessionSchema, type StudySession } from '@/lib/domain';
import { getLocalCoordinationStatus } from '@/lib/storage';
import { bundledCourseSeed } from '@/seed';
import {
  installDatabaseAccessProbe,
  type DatabaseAccessSnapshot,
} from '../../db/accessProbe';
import { cs50Scope } from '../../programmes/cs50Policy';

const selectedItemId = 'week-4-lecture';
const selectedUnitId = 'week-4';

const childStores = ['course_items', 'course_units', 'study_sessions'].sort();
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

function createSessionFixtures(count: number): StudySession[] {
  const baseStartedAt = Date.UTC(2026, 8, 1, 8, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const startedAt = new Date(baseStartedAt + index * 60_000).toISOString();
    const endedAt = new Date(
      baseStartedAt + index * 60_000 + 25 * 60_000,
    ).toISOString();

    return StudySessionSchema.parse({
      id: `a5-focus-session-${String(index).padStart(5, '0')}`,
      unitId: selectedUnitId,
      itemId: selectedItemId,
      startedAt,
      endedAt,
      durationMinutes: 25,
      mode: index % 2 === 0 ? 'coding' : 'debugging',
      notes: `A5 visible ledger fixture ${index + 1}`,
      blockers: index === 0 ? ['fixture blocker'] : [],
      createdAt: endedAt,
      updatedAt: endedAt,
    });
  });
}

function createLedgerProjection(
  units: Parameters<typeof buildSessionCatalog>[0],
  items: Parameters<typeof buildSessionCatalog>[1],
) {
  const catalog = buildSessionCatalog(units, items);

  return {
    context: catalog,
    projectSession: (session: StudySession) =>
      buildSessionLedgerRow(session, catalog),
  };
}

function sumByStore(
  access: DatabaseAccessSnapshot,
  store: string,
  key: 'materializedRows' | 'rowsScanned',
) {
  return access.operations
    .filter((operation) => operation.store === store)
    .reduce((sum, operation) => sum + operation[key], 0);
}

function sameStores(left: readonly string[], right: readonly string[]) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
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
    programmeScope: cs50Scope,
    refresh: async () => undefined,
    requestPersistentStorage: async () => 'persistent',
    runLocalMutation: async <Result,>(mutation: () => Promise<Result>) =>
      mutation(),
    requiresOnboarding: false,
    saveProfile: async () => {
      throw new Error('A5 Focus harness must not save the profile.');
    },
    status: 'ready',
  };
}

function renderActualFocusRoute(appState: AppStateContextValue) {
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
                path: 'focus',
                element: <RpgFocusPage />,
              },
            ],
          },
        ],
      },
    ],
    {
      initialEntries: [`/rpg/focus?itemId=${selectedItemId}`],
    },
  );

  return render(
    <AppStateContext.Provider value={appState}>
      <RouterProvider router={router} />
    </AppStateContext.Provider>,
  );
}

async function seedSharedDatabase(sessions: readonly StudySession[]) {
  await deleteSharedDatabase();

  const writer = createProgressPalDatabase();
  const initialization = await database.initializeDatabase({
    db: writer,
    seed: bundledCourseSeed,
  });
  const profile = await database.getProfile({ db: writer });

  if (profile === null) {
    writer.close();
    throw new Error('A5 fixture initialization did not create a profile.');
  }

  if (sessions.length > 0) {
    await writer.studySessions.bulkPut([...sessions]);
  }

  writer.close();
  closeSharedDatabase();

  return { initialization, profile };
}

function emitAccessEvidence(
  access: DatabaseAccessSnapshot,
  visibleLedgerRows: number,
) {
  const childTransactions = access.transactions.filter((transaction) =>
    sameStores(transaction.stores, childStores),
  );
  const childTransactionId = childTransactions[0]?.id ?? null;
  const childOperations =
    childTransactionId === null
      ? []
      : access.operations.filter(
          (operation) => operation.transactionId === childTransactionId,
        );

  console.info(
    'A5_FOCUS_GREEN_ACCESS_EVIDENCE',
    JSON.stringify({
      primaryRole: 'access',
      visibleLedgerRows,
      childTransactionCount: childTransactions.length,
      childStores,
      childQueryCount: childOperations.length,
      childOperations,
      studySessions: {
        rowsScanned: sumByStore(access, 'study_sessions', 'rowsScanned'),
        sourceRowsMaterialized: sumByStore(
          access,
          'study_sessions',
          'materializedRows',
        ),
      },
      hudTransactionCount: access.transactions.filter((transaction) =>
        sameStores(transaction.stores, hudStores),
      ).length,
      writesObserved: access.writesObserved,
    }),
  );
}

describe('A5 Focus actual-route read boundary GREEN', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    cleanup();
    closeSharedDatabase();
    await deleteSharedDatabase();
  });

  it('streams the complete visible ledger in one coherent child read without hidden source materialization', async () => {
    const fixtureSessionCount = 7;
    const { initialization, profile } = await seedSharedDatabase(
      createSessionFixtures(fixtureSessionCount),
    );

    // The measured reader is separate from fixture construction, and the probe
    // is installed before its first open.
    const measuredReader = getSharedDatabase();
    expect(measuredReader.isOpen()).toBe(false);
    const accessProbe = installDatabaseAccessProbe(measuredReader);

    const { container } = renderActualFocusRoute(
      createReadyAppState(initialization.appMeta, profile),
    );

    await screen.findByRole('heading', { name: 'Focus' });
    await screen.findByText(`Review saved sessions (${fixtureSessionCount})`);
    await waitFor(() => {
      expect(
        container.querySelectorAll('.session-ledger-list__item'),
      ).toHaveLength(fixtureSessionCount);
    });
    await waitFor(() => {
      expect(
        screen.getByRole('region', { name: 'Persistent hero HUD' }),
      ).not.toHaveTextContent('Loading your Hero');
    });

    const access = accessProbe.snapshot();
    const visibleLedgerRows = container.querySelectorAll(
      '.session-ledger-list__item',
    ).length;
    const childTransactions = access.transactions.filter((transaction) =>
      sameStores(transaction.stores, childStores),
    );
    const hudTransactions = access.transactions.filter((transaction) =>
      sameStores(transaction.stores, hudStores),
    );

    emitAccessEvidence(access, visibleLedgerRows);

    expect(visibleLedgerRows).toBe(fixtureSessionCount);
    expect(childTransactions).toHaveLength(1);
    expect(childTransactions[0]?.mode).toBe('readonly');
    expect(hudTransactions).toHaveLength(1);
    expect(hudTransactions[0]?.stores).not.toContain('study_sessions');
    expect(access.writesObserved).toBe(0);

    const childOperations = access.operations.filter(
      (operation) => operation.transactionId === childTransactions[0]!.id,
    );
    expect(childOperations).toHaveLength(3);
    expect(
      childOperations.filter((operation) => operation.store === 'course_units'),
    ).toHaveLength(1);
    expect(
      childOperations.filter((operation) => operation.store === 'course_items'),
    ).toHaveLength(1);

    const sessionOperations = childOperations.filter(
      (operation) => operation.store === 'study_sessions',
    );
    expect(sessionOperations).toHaveLength(1);
    expect(sessionOperations[0]).toMatchObject({
      index: 'startedAt',
      materializedRows: 0,
      operation: 'cursor',
      rowsScanned: fixtureSessionCount,
      writes: 0,
    });
    expect(sumByStore(access, 'study_sessions', 'materializedRows')).toBe(0);
  });

  it('preserves newest-first ledger semantics including id-desc tie breaking', async () => {
    const sameStartedAt = '2026-09-21T10:00:00.000Z';
    const sessions = [
      StudySessionSchema.parse({
        id: 'a5-tie-a',
        unitId: selectedUnitId,
        itemId: selectedItemId,
        startedAt: sameStartedAt,
        endedAt: '2026-09-21T10:25:00.000Z',
        durationMinutes: 25,
        mode: 'coding',
        notes: 'Tie A',
        blockers: [],
        createdAt: '2026-09-21T10:25:00.000Z',
        updatedAt: '2026-09-21T10:25:00.000Z',
      }),
      StudySessionSchema.parse({
        id: 'a5-tie-c',
        unitId: selectedUnitId,
        itemId: selectedItemId,
        startedAt: sameStartedAt,
        endedAt: '2026-09-21T10:25:00.000Z',
        durationMinutes: 25,
        mode: 'coding',
        notes: 'Tie C',
        blockers: [],
        createdAt: '2026-09-21T10:25:00.000Z',
        updatedAt: '2026-09-21T10:25:00.000Z',
      }),
      StudySessionSchema.parse({
        id: 'a5-tie-b',
        unitId: selectedUnitId,
        itemId: selectedItemId,
        startedAt: sameStartedAt,
        endedAt: '2026-09-21T10:25:00.000Z',
        durationMinutes: 25,
        mode: 'coding',
        notes: 'Tie B',
        blockers: [],
        createdAt: '2026-09-21T10:25:00.000Z',
        updatedAt: '2026-09-21T10:25:00.000Z',
      }),
      StudySessionSchema.parse({
        id: 'a5-older-z',
        unitId: selectedUnitId,
        itemId: selectedItemId,
        startedAt: '2026-09-21T09:00:00.000Z',
        endedAt: '2026-09-21T09:25:00.000Z',
        durationMinutes: 25,
        mode: 'debugging',
        notes: 'Older',
        blockers: [],
        createdAt: '2026-09-21T09:25:00.000Z',
        updatedAt: '2026-09-21T09:25:00.000Z',
      }),
    ];

    await seedSharedDatabase(sessions);

    const data = await database.readStudySessionsSurfaceData(
      createLedgerProjection,
    );

    console.info(
      'A5_FOCUS_GREEN_SEMANTIC_EVIDENCE',
      JSON.stringify({
        primaryRole: 'semantic',
        ledgerIds: data.ledgerRows.map((row) => row.id),
      }),
    );

    expect(data.ledgerRows.map((row) => row.id)).toEqual([
      'a5-tie-c',
      'a5-tie-b',
      'a5-tie-a',
      'a5-older-z',
    ]);
    expect(data.ledgerRows[0]).toMatchObject({
      itemTitle: 'Lecture 4: Memory',
      unitTitle: 'Week 4: Memory',
    });
  });

  it.each([1_000, 10_000])(
    'keeps Focus child query count constant while streaming %i visible sessions',
    async (fixtureSessionCount) => {
      await seedSharedDatabase(createSessionFixtures(fixtureSessionCount));

      const measuredReader = getSharedDatabase();
      expect(measuredReader.isOpen()).toBe(false);
      const accessProbe = installDatabaseAccessProbe(measuredReader);
      const readStartedAt = performance.now();
      const data = await database.readStudySessionsSurfaceData(
        createLedgerProjection,
        { db: measuredReader },
      );
      const readDurationMs = Math.round(performance.now() - readStartedAt);
      const access = accessProbe.snapshot();
      const childTransactions = access.transactions.filter((transaction) =>
        sameStores(transaction.stores, childStores),
      );
      const childOperations = access.operations.filter(
        (operation) => operation.transactionId === childTransactions[0]?.id,
      );

      console.info(
        'A5_FOCUS_GREEN_SCALE_EVIDENCE',
        JSON.stringify({
          primaryRole: 'scale',
          fixtureSessionCount,
          visibleLedgerRows: data.ledgerRows.length,
          childTransactionCount: childTransactions.length,
          childQueryCount: childOperations.length,
          sessionRowsScanned: sumByStore(
            access,
            'study_sessions',
            'rowsScanned',
          ),
          sourceRowsMaterialized: sumByStore(
            access,
            'study_sessions',
            'materializedRows',
          ),
          readDurationMs,
          writesObserved: access.writesObserved,
        }),
      );

      expect(data).not.toHaveProperty('sessions');
      expect(data.ledgerRows).toHaveLength(fixtureSessionCount);
      expect(childTransactions).toHaveLength(1);
      expect(childOperations).toHaveLength(3);
      expect(
        childOperations.filter(
          (operation) => operation.store === 'study_sessions',
        ),
      ).toHaveLength(1);
      expect(sumByStore(access, 'study_sessions', 'rowsScanned')).toBe(
        fixtureSessionCount,
      );
      expect(sumByStore(access, 'study_sessions', 'materializedRows')).toBe(0);
      expect(access.writesObserved).toBe(0);
    },
    30_000,
  );

  it('uses one study_sessions-only cursor for ledger refresh with zero hidden source materialization', async () => {
    const fixtureSessionCount = 7;
    await deleteSharedDatabase();

    const writer = createProgressPalDatabase();
    await database.initializeDatabase({ db: writer, seed: bundledCourseSeed });
    const sessions = createSessionFixtures(fixtureSessionCount);
    await writer.studySessions.bulkPut(sessions);
    const [units, items] = await Promise.all([
      database.listCourseUnits(undefined, { db: writer }),
      database.listCourseItems(undefined, { db: writer }),
    ]);
    const catalog = buildSessionCatalog(units, items);
    writer.close();
    closeSharedDatabase();

    const measuredReader = getSharedDatabase();
    expect(measuredReader.isOpen()).toBe(false);
    const accessProbe = installDatabaseAccessProbe(measuredReader);
    const ledgerRows = await database.readStudySessionLedgerRows(
      (session) => buildSessionLedgerRow(session, catalog),
      { db: measuredReader },
    );
    const access = accessProbe.snapshot();

    console.info(
      'A5_FOCUS_GREEN_LEDGER_REFRESH_ACCESS_EVIDENCE',
      JSON.stringify({
        primaryRole: 'access',
        visibleLedgerRows: ledgerRows.length,
        transactions: access.transactions,
        operations: access.operations,
        sourceRowsMaterialized: sumByStore(
          access,
          'study_sessions',
          'materializedRows',
        ),
        writesObserved: access.writesObserved,
      }),
    );

    expect(ledgerRows).toHaveLength(fixtureSessionCount);
    expect(access.transactions).toHaveLength(1);
    expect(access.transactions[0]).toEqual({
      id: 'tx-1',
      mode: 'readonly',
      stores: ['study_sessions'],
    });
    expect(access.operations).toHaveLength(1);
    expect(access.operations[0]).toMatchObject({
      index: 'startedAt',
      materializedRows: 0,
      operation: 'cursor',
      rowsScanned: fixtureSessionCount,
      store: 'study_sessions',
      writes: 0,
    });
    expect(access.writesObserved).toBe(0);
  });

  it('refreshes only the session ledger after save and does not reread the catalog', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(3_000_000);
    const { initialization, profile } = await seedSharedDatabase([]);
    const initialRead = vi.spyOn(database, 'readStudySessionsSurfaceData');
    const ledgerRefresh = vi.spyOn(database, 'readStudySessionLedgerRows');
    const view = renderActualFocusRoute(
      createReadyAppState(initialization.appMeta, profile),
    );

    await screen.findByRole('button', { name: 'Start live session' });
    await waitFor(() => expect(initialRead).toHaveBeenCalledTimes(1));

    initialRead.mockClear();
    ledgerRefresh.mockClear();

    fireEvent.change(screen.getAllByLabelText('Mode')[0], {
      target: { value: 'debugging' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start live session' }));
    nowSpy.mockReturnValue(3_000_000 + 25 * 60_000);
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save study session' }));

    await screen.findByText('Review saved sessions (1)');
    await waitFor(() => expect(ledgerRefresh).toHaveBeenCalledTimes(1));

    const snapshot = await database.getDatabaseSnapshot();

    console.info(
      'A5_FOCUS_GREEN_POST_SAVE_EVIDENCE',
      JSON.stringify({
        primaryRole: 'composition',
        catalogRereadsAfterSave: initialRead.mock.calls.length,
        ledgerRefreshesAfterSave: ledgerRefresh.mock.calls.length,
        savedSessionCount: snapshot.studySessions.length,
      }),
    );

    expect(initialRead).not.toHaveBeenCalled();
    expect(ledgerRefresh).toHaveBeenCalledTimes(1);
    expect(snapshot.studySessions).toHaveLength(1);

    view.unmount();
  }, 15_000);
});
