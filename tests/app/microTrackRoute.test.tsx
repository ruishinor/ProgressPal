import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { getProgrammeRegistry } from '@/programmes';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

import {
  needsCheck,
  rightTaps,
  wrongTaps,
  type Tap,
} from '../support/microlearningPlans';

/**
 * «Tenk som en utvikler», the voluntary track, inside the real app. It opens
 * with no Campaign progress at all, lists all six activities, plays each one
 * to "Hva tar jeg med meg?" with right and wrong answers, and leaves every
 * learner store exactly as it was (a database snapshot, as in the
 * `/rpg/micro` tests). CS50x has neither the entry nor the track.
 */

const registry = getProgrammeRegistry();
const track = programvareutviklingDefinition.content.microlearning!.tracks![0]!;
const trackPath = `/rpg/track/${track.id}`;

function servePackagedContent() {
  vi.stubGlobal('fetch', async (input: string | URL | Request) => {
    const url = new URL(
      typeof input === 'string' || input instanceof URL ? input : input.url,
    );

    return new Response(
      readFileSync(join(process.cwd(), 'public', url.pathname), 'utf8'),
    );
  });
}

beforeEach(() => {
  servePackagedContent();
  closeSharedDatabase();
  getSharedDatabase({
    programmeId: registry.defaultProgrammeId,
    authorizedCatalogues: registry.definitions.map((definition) => ({
      courseId: definition.catalogue.courseId,
      programmeId: definition.programmeId,
    })),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function onboard() {
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
}

async function activateProgramme2() {
  await enrolAndSwitchActiveProgramme('programvareutvikling', {
    seed: programvareutviklingDefinition.catalogue,
  });
}

async function snapshotDatabase(): Promise<string> {
  const db = getSharedDatabase();
  const out: Record<string, unknown[]> = {};

  for (const table of [...db.tables].sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    out[table.name] = await table.toArray();
  }

  return JSON.stringify(out);
}

const entryName = `Åpne ${track.title}`;

describe('the way in', () => {
  it('Home offers the track to a Programme 2 learner with no Campaign progress', async () => {
    await onboard();
    await activateProgramme2();
    await renderAppAtRoute('/rpg');

    const entry = await screen.findByRole('link', { name: entryName });

    expect(entry).toHaveAttribute('href', trackPath);
  });

  it('gives CS50x no entry and no track', async () => {
    await onboard();
    await renderAppAtRoute('/rpg');
    await waitFor(() => {
      expect(
        screen.getAllByRole('link', { name: 'Campaign' }).length,
      ).toBeGreaterThan(0);
    });
    expect(screen.queryByRole('link', { name: entryName })).toBeNull();

    await renderAppAtRoute(trackPath);
    expect(
      await screen.findByRole('heading', { name: 'Ingenting å øve på her' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(track.sessions[0]!.title)).toBeNull();
  });

  it('lists all six activities with no Campaign progress, outside the RPG shell', async () => {
    await onboard();
    await activateProgramme2();
    await renderAppAtRoute(trackPath);

    expect(
      await screen.findByRole('heading', { name: track.title }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    for (const [index, session] of track.sessions.entries()) {
      expect(
        screen.getByRole('button', {
          name: new RegExp(
            `^${index + 1}\\. ${session.title.replace('?', '\\?')}`,
          ),
        }),
      ).toBeInTheDocument();
    }
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('shows a notice for a track the programme does not have', async () => {
    await onboard();
    await activateProgramme2();
    await renderAppAtRoute('/rpg/track/finnes-ikke');

    expect(
      await screen.findByRole('heading', { name: 'Ingenting å øve på her' }),
    ).toBeInTheDocument();
  });
});

describe('each activity end to end against the real database', () => {
  const pause = () => new Promise((resolve) => setTimeout(resolve, 450));

  it.each(track.sessions.map((session, index) => [session.title, index]))(
    '%s: plays to the takeaway, wrong then right, and changes no store',
    async (_title, index) => {
      const session = track.sessions[index as number]!;
      const user = userEvent.setup();

      await onboard();
      await activateProgramme2();
      const before = await snapshotDatabase();

      await renderAppAtRoute(trackPath);
      await user.click(
        await screen.findByRole('button', {
          name: new RegExp(`^${(index as number) + 1}\\. `),
        }),
      );

      const tap = async (taps: Tap[]) => {
        for (const entry of taps) {
          const scope =
            entry.group === undefined
              ? screen
              : within(screen.getByRole('group', { name: entry.group }));

          await user.click(
            scope.getAllByRole('button', { name: entry.name })[0]!,
          );
        }
      };
      const act = async (name: string | RegExp) => {
        await pause();
        await user.click(screen.getByRole('button', { name }));
      };

      for (const card of session.cards) {
        if (card.kind !== 'learn') {
          await tap(wrongTaps(card, 0));
          if (needsCheck(card)) {
            await act('Sjekk');
          }
          // A wrong option that says why it is wrong says so; else the hint.
          const missed =
            card.kind === 'select'
              ? card.options.filter((option) => option.id !== card.correctId)[0]
              : undefined;
          expect(screen.getByRole('status')).toHaveTextContent(
            missed?.feedback ?? card.hint,
          );
          await act('Prøv igjen');
          await tap(rightTaps(card));
          if (needsCheck(card)) {
            await act('Sjekk');
          }
          expect(screen.getByRole('status')).toHaveTextContent(
            card.explanation,
          );
        }
        await act(/^(Neste|Fullfør)$/);
      }

      expect(
        screen.getByRole('heading', { name: 'Hva tar jeg med meg?' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(session.takeaway!.split('\n')[0]!),
      ).toBeInTheDocument();
      expect(await snapshotDatabase()).toBe(before);

      // Start over: back to the list, and the activity opens from its start.
      await act('Velg en annen aktivitet');
      expect(
        await screen.findByRole('heading', { name: track.title }),
      ).toBeInTheDocument();
      // The start is guarded against a double tap, like the other pickers.
      await pause();
      await user.click(
        screen.getByRole('button', {
          name: new RegExp(`^${(index as number) + 1}\\. `),
        }),
      );
      expect(
        await screen.findByRole('heading', {
          name: session.cards[0]!.title,
        }),
      ).toBeInTheDocument();
    },
    90_000,
  );
});
