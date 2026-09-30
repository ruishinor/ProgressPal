import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppStateProvider, useAppState } from '@/lib/appState';
import {
  enrolAndSwitchActiveProgramme,
  ensureCourseCatalogFromSeed,
  getAppMeta,
  getDatabaseSnapshot,
  listProgrammeEnrolments,
} from '@/lib/db';
import type { ProgrammeScope } from '@/lib/domain';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';

import {
  altProgrammeId,
  altSeed,
  bothCataloguesMigrationContext,
  cs50ProgrammeId,
  fixtureScopesByProgrammeId,
} from '../programmes/c7Fixture';
import { seedTwoProgrammeDevice } from '../programmes/c7Device';

/**
 * Epic C / C7 provider composition: the active runtime programme derives from
 * the persisted `app_meta.activeProgrammeId` on every stable resolution, the
 * whole scope (identity, catalogue, policy and content) rebinds together, and
 * a failed or unauthorized resolution never leaves a guessed programme.
 */

const timeout = { timeout: 15_000 };

function resolverOf(
  scopes: Readonly<Record<string, ProgrammeScope>> = fixtureScopesByProgrammeId,
) {
  return vi.fn((programmeId: string): ProgrammeScope => {
    const scope = scopes[programmeId];

    if (scope === undefined) {
      throw new Error(`Unregistered programme "${programmeId}"`);
    }

    return scope;
  });
}

function Probe() {
  const state = useAppState();
  const [outcome, setOutcome] = useState('idle');
  const scope = state.programmeScope;
  const lectureXp = scope?.policy.xp.completionAwards.find(
    (award) => award.itemType === 'lecture',
  )?.xp;

  function run(label: string, action: () => Promise<unknown>) {
    return async () => {
      setOutcome(`${label}:pending`);
      try {
        await action();
        setOutcome(`${label}:ok`);
      } catch (error) {
        setOutcome(`${label}:error:${(error as Error).message}`);
      }
    };
  }

  return (
    <div>
      <p data-testid="probe">
        {[
          state.status,
          scope?.programmeId ?? 'none',
          lectureXp ?? 'none',
          scope?.content.terminology.unitNoun.capitalized ?? 'none',
          scope?.catalogueId ?? 'none',
        ].join('|')}
      </p>
      <p data-testid="epoch">{state.dataEpoch}</p>
      <p data-testid="choices">{JSON.stringify(state.programmeChoices)}</p>
      <p data-testid="outcome">{outcome}</p>
      <button
        onClick={run('switch-a', () => state.switchProgramme(cs50ProgrammeId))}
        type="button"
      >
        switch-a
      </button>
      <button
        onClick={run('switch-b', () => state.switchProgramme(altProgrammeId))}
        type="button"
      >
        switch-b
      </button>
      <button
        onClick={run('enrol-switch-b', () =>
          state.enrolAndSwitchProgramme(altProgrammeId),
        )}
        type="button"
      >
        enrol-switch-b
      </button>
      <button
        onClick={run('switch-ghost', () =>
          state.switchProgramme('ghost-programme'),
        )}
        type="button"
      >
        switch-ghost
      </button>
      <button onClick={run('refresh', () => state.refresh())} type="button">
        refresh
      </button>
    </div>
  );
}

function renderProvider(resolve = resolverOf()) {
  // The seeding helpers leave the shared database closed so this composition
  // performs its own bind, exactly like the app composition root.
  const rendered = render(
    <AppStateProvider
      resolveMigrationContext={() => bothCataloguesMigrationContext}
      resolveProgramme={resolve}
    >
      <Probe />
    </AppStateProvider>,
  );

  return { ...rendered, resolve };
}

async function expectProbe(value: string) {
  await waitFor(
    () => expect(screen.getByTestId('probe')).toHaveTextContent(value),
    timeout,
  );
}

async function expectOutcome(value: string | RegExp) {
  await waitFor(
    () => expect(screen.getByTestId('outcome')).toHaveTextContent(value),
    timeout,
  );
}

afterEach(() => {
  // The suite-wide teardown unmounts the provider and then deletes the shared
  // database; closing it here would run first and race an in-flight refresh.
  vi.restoreAllMocks();
});

describe('C7 dynamic programme scope', () => {
  it('resolves the scope of the persisted active programme, not a default', async () => {
    await seedTwoProgrammeDevice({ alternateActive: true });

    const { resolve } = renderProvider();

    await expectProbe('ready|c5-alt-programme|25|Module|c5-alt-catalogue');
    expect(resolve).toHaveBeenCalledWith(altProgrammeId);
    expect(getSharedDatabase().migrationContext).toBe(
      bothCataloguesMigrationContext,
    );
  }, 30_000);

  it('lists every registered programme with its enrolment and active state', async () => {
    await seedTwoProgrammeDevice();

    renderProvider();
    await expectProbe('ready|cs50x|40|Week|cs50x-2026');

    const choices = JSON.parse(
      screen.getByTestId('choices').textContent ?? '[]',
    );
    expect(choices).toEqual([
      {
        active: true,
        enrolled: true,
        programmeId: cs50ProgrammeId,
        title: fixtureScopesByProgrammeId[cs50ProgrammeId]!.title,
      },
      {
        active: false,
        enrolled: false,
        programmeId: altProgrammeId,
        title: fixtureScopesByProgrammeId[altProgrammeId]!.title,
      },
    ]);
  }, 30_000);

  it('rebinds identity, catalogue, policy and content together across A → B → A', async () => {
    await seedTwoProgrammeDevice();
    const user = userEvent.setup();

    renderProvider();
    await expectProbe('ready|cs50x|40|Week|cs50x-2026');
    const epochBefore = Number(screen.getByTestId('epoch').textContent);

    await user.click(screen.getByRole('button', { name: 'enrol-switch-b' }));
    await expectOutcome('enrol-switch-b:ok');
    await expectProbe('ready|c5-alt-programme|25|Module|c5-alt-catalogue');
    const epochAfterB = Number(screen.getByTestId('epoch').textContent);
    expect(epochAfterB).toBeGreaterThan(epochBefore);
    expect((await getAppMeta())?.activeProgrammeId).toBe(altProgrammeId);

    await user.click(screen.getByRole('button', { name: 'switch-a' }));
    await expectOutcome('switch-a:ok');
    await expectProbe('ready|cs50x|40|Week|cs50x-2026');
    expect(Number(screen.getByTestId('epoch').textContent)).toBeGreaterThan(
      epochAfterB,
    );
    expect((await getAppMeta())?.activeProgrammeId).toBe(cs50ProgrammeId);

    // Switching back to a previously enrolled programme is a normal switch.
    await user.click(screen.getByRole('button', { name: 'switch-b' }));
    await expectOutcome('switch-b:ok');
    await expectProbe('ready|c5-alt-programme|25|Module|c5-alt-catalogue');
  }, 60_000);

  it('reports enrolment and active state after a switch', async () => {
    await seedTwoProgrammeDevice();
    const user = userEvent.setup();

    renderProvider();
    await expectProbe('ready|cs50x|40|Week|cs50x-2026');
    await user.click(screen.getByRole('button', { name: 'enrol-switch-b' }));
    await expectProbe('ready|c5-alt-programme|25|Module|c5-alt-catalogue');

    const choices = JSON.parse(
      screen.getByTestId('choices').textContent ?? '[]',
    );
    expect(choices).toMatchObject([
      { active: false, enrolled: true, programmeId: cs50ProgrammeId },
      { active: true, enrolled: true, programmeId: altProgrammeId },
    ]);
  }, 30_000);

  it('keeps the previous programme when the target catalogue cannot be prepared', async () => {
    await seedTwoProgrammeDevice();
    getSharedDatabase(bothCataloguesMigrationContext);
    await ensureCourseCatalogFromSeed({ ...altSeed, dataVersion: 2 });
    closeSharedDatabase();
    const user = userEvent.setup();

    renderProvider();
    await expectProbe('ready|cs50x|40|Week|cs50x-2026');

    await user.click(screen.getByRole('button', { name: 'enrol-switch-b' }));
    await expectOutcome(
      /enrol-switch-b:error:.*lower than the synced version/i,
    );

    await expectProbe('ready|cs50x|40|Week|cs50x-2026');
    expect((await getAppMeta())?.activeProgrammeId).toBe(cs50ProgrammeId);
    expect(
      (await listProgrammeEnrolments()).map((row) => row.programmeId),
    ).toEqual([cs50ProgrammeId]);
  }, 30_000);

  it('rejects an unregistered target before any write', async () => {
    await seedTwoProgrammeDevice();
    const user = userEvent.setup();

    renderProvider();
    await expectProbe('ready|cs50x|40|Week|cs50x-2026');
    getSharedDatabase();
    const before = await getDatabaseSnapshot();

    await user.click(screen.getByRole('button', { name: 'switch-ghost' }));
    await expectOutcome(
      /switch-ghost:error:.*Unregistered programme "ghost-programme"/,
    );

    expect(await getDatabaseSnapshot()).toEqual(before);
    await expectProbe('ready|cs50x|40|Week|cs50x-2026');
  }, 30_000);

  it('observes a switch made elsewhere on the next verified refresh', async () => {
    await seedTwoProgrammeDevice();
    const user = userEvent.setup();

    renderProvider();
    await expectProbe('ready|cs50x|40|Week|cs50x-2026');

    // Another tab performs the switch against the same database.
    await enrolAndSwitchActiveProgramme(altProgrammeId, { seed: altSeed });

    await user.click(screen.getByRole('button', { name: 'refresh' }));
    await expectOutcome('refresh:ok');
    await expectProbe('ready|c5-alt-programme|25|Module|c5-alt-catalogue');
  }, 30_000);

  it('fails closed on a persisted active programme the composition does not authorize', async () => {
    await seedTwoProgrammeDevice();
    const db = getSharedDatabase(bothCataloguesMigrationContext);
    const appMeta = await db.appMeta.get('app-meta');
    await db.programmeEnrolments.put({
      programmeId: 'ghost-programme',
      enrolledAt: '2026-09-30T08:00:00.000Z',
    });
    await db.appMeta.put({ ...appMeta!, activeProgrammeId: 'ghost-programme' });
    closeSharedDatabase();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderProvider();

    await waitFor(
      () => expect(screen.getByTestId('probe').textContent).toMatch(/^error\|/),
      timeout,
    );
  }, 30_000);

  it('fails closed when the resolver returns a scope for a different programme', async () => {
    await seedTwoProgrammeDevice();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderProvider(vi.fn(() => fixtureScopesByProgrammeId[altProgrammeId]!));

    await waitFor(
      () => expect(screen.getByTestId('probe').textContent).toMatch(/^error\|/),
      timeout,
    );
  }, 30_000);
});
