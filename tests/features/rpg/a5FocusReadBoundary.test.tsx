import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { RpgRouteShell } from '@/app/shell/RpgRouteShell';
import { RpgFocusPage } from '@/features/rpg/routes/RpgFocusPage';
import { RpgShell } from '@/features/rpg/shell/RpgShell';
import { getProfile, initializeDatabase } from '@/lib/db';
import {
  AppStateContext,
  type AppStateContextValue,
} from '@/lib/appState/AppStateContext';
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

const fixtureSessionCount = 7;
const selectedItemId = 'week-4-lecture';
const selectedUnitId = 'week-4';

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
  return Array.from({ length: count }, (_, index) => {
    const startedAt = new Date(
      Date.UTC(2026, 8, 21, 8, index, 0),
    ).toISOString();
    const endedAt = new Date(
      Date.UTC(2026, 8, 21, 8, index + 25, 0),
    ).toISOString();

    return StudySessionSchema.parse({
      id: `a5-focus-session-${String(index).padStart(3, '0')}`,
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

function sumByStore(
  access: DatabaseAccessSnapshot,
  store: string,
  key: 'materializedRows' | 'rowsScanned',
) {
  return access.operations
    .filter((operation) => operation.store === store)
    .reduce((sum, operation) => sum + operation[key], 0);
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
      throw new Error('A5 passive-read harness must not save the profile.');
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

function emitRedEvidence(
  access: DatabaseAccessSnapshot,
  visibleLedgerRows: number,
) {
  console.info(
    'A5_FOCUS_RED_ACCESS_EVIDENCE',
    JSON.stringify({
      primaryRole: 'access',
      fixtureSessionCount,
      visibleLedgerRows,
      studySessions: {
        operations: access.operations.filter(
          (operation) => operation.store === 'study_sessions',
        ),
        queryCount: access.operations.filter(
          (operation) => operation.store === 'study_sessions',
        ).length,
        rowsScanned: sumByStore(access, 'study_sessions', 'rowsScanned'),
        sourceRowsMaterialized: sumByStore(
          access,
          'study_sessions',
          'materializedRows',
        ),
      },
      hudTransactionCount: access.transactions.filter(
        (transaction) =>
          JSON.stringify(transaction.stores) === JSON.stringify(hudStores),
      ).length,
      courseItems: {
        queryCount: access.operations.filter(
          (operation) => operation.store === 'course_items',
        ).length,
        operations: access.operations.filter(
          (operation) => operation.store === 'course_items',
        ),
      },
      courseUnits: {
        queryCount: access.operations.filter(
          (operation) => operation.store === 'course_units',
        ).length,
        operations: access.operations.filter(
          (operation) => operation.store === 'course_units',
        ),
      },
      transactions: access.transactions,
      writesObserved: access.writesObserved,
    }),
  );
}

describe('A5 Focus actual-route read boundary RED', () => {
  it('rejects hidden complete study-session source materialization while preserving the complete visible ledger', async () => {
    await deleteSharedDatabase();

    // Fixture/mutation owner: intentionally uninstrumented and closed before
    // the measured reader exists.
    const writer = createProgressPalDatabase();
    const initialization = await initializeDatabase({
      db: writer,
      seed: bundledCourseSeed,
    });
    const profile = await getProfile({ db: writer });

    if (profile === null) {
      throw new Error(
        'A5 fixture initialization did not create a learner profile.',
      );
    }

    const sessions = createSessionFixtures(fixtureSessionCount);

    // Every synthetic fixture is validated through the production schema before
    // insertion. The direct bulk write is fixture construction, not measured
    // route behavior.
    await writer.studySessions.bulkPut(sessions);
    writer.close();

    closeSharedDatabase();

    // Measured reader: probe installation MUST precede the first open.
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
    const sessionOperations = access.operations.filter(
      (operation) => operation.store === 'study_sessions',
    );
    const hudTransactions = access.transactions.filter(
      (transaction) =>
        JSON.stringify(transaction.stores) === JSON.stringify(hudStores),
    );
    const sourceRowsMaterialized = sumByStore(
      access,
      'study_sessions',
      'materializedRows',
    );

    emitRedEvidence(access, visibleLedgerRows);

    // Baseline guards: if one of these fails, the result is not the intended A5
    // access RED and must be classified separately.
    expect(visibleLedgerRows).toBe(fixtureSessionCount);
    expect(sessionOperations).toHaveLength(1);
    expect(sumByStore(access, 'study_sessions', 'rowsScanned')).toBe(
      fixtureSessionCount,
    );
    expect(access.writesObserved).toBe(0);
    expect(hudTransactions).toHaveLength(1);
    expect(hudTransactions[0]?.stores).not.toContain('study_sessions');

    // Sole intended RED assertion. Current production listStudySessions() uses
    // studySessions.toArray(), so the DBCore query bulk-materializes H source
    // rows before buildSessionLedgerRows() creates the separately retained
    // complete visible ledger. A5 requires that hidden source materialization
    // to be zero while the visible ledger remains complete.
    console.info(
      'A5_FOCUS_EXPECTED_RED_MECHANISM',
      'A5_FOCUS_HIDDEN_SESSION_SOURCE_MATERIALIZATION',
    );
    expect(
      sourceRowsMaterialized,
      'A5_FOCUS_HIDDEN_SESSION_SOURCE_MATERIALIZATION',
    ).toBe(0);
  });
});
