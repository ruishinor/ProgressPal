import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { router } from '@/app/router/router';
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
 * «Utviklerblikk», the track, inside the real app. It opens with no Campaign
 * progress at all, groups all six activities under Generelt, plays each one
 * to "Husk dette"
 * with right and wrong answers, and leaves every learner store exactly as it
 * was (a database snapshot, as in the `/rpg/micro` tests). CS50x has neither
 * the entry nor the track. A new choice after a miss is the one retry; the
 * browser's Back and Forward move between cards through the real router.
 */

const registry = getProgrammeRegistry();
const track = programvareutviklingDefinition.content.microlearning!.tracks![0]!;
const trackPath = `/rpg/track/${track.id}`;
// Every activity with the category that lists it and its row number there.
const placed = track.sessions.map((session) => {
  const category = track.categories!.find((entry) =>
    entry.sessionIds.includes(session.id),
  )!;

  return {
    category,
    row: category.sessionIds.indexOf(session.id) + 1,
    session,
  };
});
const generelt = placed
  .filter((entry) => entry.category.id === 'generelt')
  .map((entry) => entry.session);

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

const entryName = track.title;

describe('the way in', () => {
  it('Home offers the track to a Programme 2 learner with no Campaign progress', async () => {
    const user = userEvent.setup();

    await onboard();
    await activateProgramme2();
    await renderAppAtRoute('/rpg');

    const entry = await screen.findByRole('link', { name: entryName });

    expect(entry).toHaveAttribute('href', trackPath);
    // Its own (i), beside the link and not inside it, opens on request.
    const info = screen.getByRole('button', { name: `Om ${track.title}` });

    expect(entry.contains(info)).toBe(false);
    expect(info).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(track.about!, { exact: false })).toBeNull();
    await user.click(info);
    expect(info).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText(new RegExp(track.about!.replace('.', '\\.'))),
    ).toHaveTextContent(/XP, nivåer og Achievements/);
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
      await screen.findByRole('heading', {
        name: 'Denne aktiviteten er ikke tilgjengelig her',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(track.sessions[0]!.title)).toBeNull();
  });

  it('lists all six activities with no Campaign progress, outside the RPG shell', async () => {
    await onboard();
    await activateProgramme2();
    await renderAppAtRoute(`${trackPath}?kategori=generelt`);

    expect(
      await screen.findByRole('heading', { name: track.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(track.summary)).toBeInTheDocument();
    expect(screen.queryByText('Frivillig spor')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    for (const [index, session] of generelt.entries()) {
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
      await screen.findByRole('heading', {
        name: 'Denne aktiviteten er ikke tilgjengelig her',
      }),
    ).toBeInTheDocument();
  });
});

describe('each activity end to end against the real database', () => {
  const pause = () => new Promise((resolve) => setTimeout(resolve, 450));

  it.each(placed)(
    '$category.title $row: $session.title plays to the takeaway, wrong then right, and changes no store',
    async ({ category, row, session }) => {
      const user = userEvent.setup();

      await onboard();
      await activateProgramme2();
      const before = await snapshotDatabase();

      await renderAppAtRoute(`${trackPath}?kategori=${category.id}`);
      await user.click(
        await screen.findByRole('button', {
          name: new RegExp(`^${row}\\. `),
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
        screen.getByRole('heading', { name: 'Husk dette' }),
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
          name: new RegExp(`^${row}\\. `),
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

const guardPause = () => new Promise((resolve) => setTimeout(resolve, 450));
const heading = () => screen.getByRole('heading', { level: 1 });
const option = (label: string) =>
  screen.getByRole('button', {
    name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
  });

describe('the activity list and the first card', () => {
  it('cues the choice next to the six activities and bolds the four key words', async () => {
    const user = userEvent.setup();

    await onboard();
    await activateProgramme2();
    await renderAppAtRoute(`${trackPath}?kategori=generelt`);

    const cue = await screen.findByRole('heading', {
      name: 'Velg en aktivitet',
    });
    const list = screen.getByRole('list', { name: 'Velg en aktivitet' });

    // Nothing stands between the cue and the choices: the cue ends what the
    // card says, and the list starts what the learner acts on.
    expect(cue.parentElement!.lastElementChild).toBe(cue);
    expect(cue.parentElement!.nextElementSibling!.firstElementChild).toBe(list);
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
    expect(screen.queryByText(/frivillig/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: /^1\. / }));
    for (const term of ['Problem', 'Behov', 'Løsningsforslag', 'Antakelse']) {
      expect(screen.getByText(`${term}:`).tagName).toBe('STRONG');
    }
    expect(screen.queryByText(/\*\*/)).toBeNull();
  });
});

describe('a new choice after a miss is the one retry', () => {
  // Activity 1, card 2: the first choice card.
  const card = track.sessions[0]!.cards[1]!;

  async function toFirstChoice() {
    const user = userEvent.setup();

    await onboard();
    await activateProgramme2();
    await renderAppAtRoute(`${trackPath}?kategori=generelt`);
    await user.click(await screen.findByRole('button', { name: /^1\. / }));
    await guardPause();
    await user.click(screen.getByRole('button', { name: 'Neste' }));
    expect(heading()).toHaveTextContent(card.title);
    if (card.kind !== 'select') {
      throw new Error('expected a choice card');
    }

    return { card, user };
  }

  it('takes a different answer directly, and a second miss reveals the answer', async () => {
    const { card, user } = await toFirstChoice();
    const [first, second] = card.options.filter(
      (entry) => entry.id !== card.correctId,
    );
    const right = card.options.find((entry) => entry.id === card.correctId)!;

    await user.click(option(first!.label));
    expect(screen.getByRole('status')).toHaveTextContent(first!.feedback!);
    // The other answers stay available while the miss is shown.
    expect(option(second!.label)).not.toHaveAttribute('aria-disabled');
    expect(option(first!.label)).toHaveAttribute('aria-disabled', 'true');

    await user.click(option(second!.label));
    expect(screen.getByRole('status')).toHaveTextContent('Her er svaret.');
    // Two tries at most: a third choice changes nothing.
    await user.click(option(right.label));
    expect(screen.getByRole('status')).toHaveTextContent('Her er svaret.');
    expect(screen.getByRole('button', { name: 'Neste' })).toBeInTheDocument();
  });

  it('takes the right answer directly as the retry', async () => {
    const { card, user } = await toFirstChoice();
    const wrong = card.options.find((entry) => entry.id !== card.correctId)!;
    const right = card.options.find((entry) => entry.id === card.correctId)!;

    await user.click(option(wrong.label));
    await user.click(option(right.label));
    expect(screen.getByRole('status')).toHaveTextContent('Riktig nå.');
  });

  it('spends one try on a double tap of the same answer', async () => {
    const { card, user } = await toFirstChoice();
    const wrong = card.options.find((entry) => entry.id !== card.correctId)!;

    await user.dblClick(option(wrong.label));
    expect(screen.getByRole('status')).toHaveTextContent('Ikke helt.');
    expect(
      screen.getByRole('button', { name: 'Prøv igjen' }),
    ).toBeInTheDocument();
  });

  it('still offers Prøv igjen, with its hint', async () => {
    const { card, user } = await toFirstChoice();
    const wrong = card.options.find((entry) => entry.id !== card.correctId)!;
    const right = card.options.find((entry) => entry.id === card.correctId)!;

    await user.click(option(wrong.label));
    await guardPause();
    await user.click(screen.getByRole('button', { name: 'Prøv igjen' }));
    expect(screen.getByRole('status')).toHaveTextContent(card.hint);
    await user.click(option(right.label));
    expect(screen.getByRole('status')).toHaveTextContent('Riktig nå.');
  });
});

describe('the browser’s Back and Forward', () => {
  const [first] = track.sessions;
  const back = () => act(async () => void (await router.navigate(-1)));
  const forward = () => act(async () => void (await router.navigate(1)));

  it('move between cards and the list, and Lukk goes Home', async () => {
    const user = userEvent.setup();

    await onboard();
    await activateProgramme2();
    await renderAppAtRoute(`${trackPath}?kategori=generelt`);
    await user.click(await screen.findByRole('button', { name: /^1\. / }));
    expect(heading()).toHaveTextContent(first!.cards[0]!.title);
    await guardPause();
    await user.click(screen.getByRole('button', { name: 'Neste' }));
    expect(heading()).toHaveTextContent(first!.cards[1]!.title);

    await back();
    expect(heading()).toHaveTextContent(first!.cards[0]!.title);
    await back();
    expect(heading()).toHaveTextContent(track.title);
    await forward();
    expect(heading()).toHaveTextContent(first!.cards[0]!.title);
    await forward();
    expect(heading()).toHaveTextContent(first!.cards[1]!.title);
    // A card reached again starts unanswered: Back is "the previous screen".
    expect(screen.getByRole('status')).toHaveTextContent(
      'Trykk på svaret du tror stemmer.',
    );

    await user.click(screen.getByRole('link', { name: `Lukk ${track.title}` }));
    expect(router.state.location.pathname).toBe('/rpg');
  });

  it('starts a typed later card at the first card, and an unknown activity at the overview', async () => {
    const kravtyper = track.sessions[1]!;

    await onboard();
    await activateProgramme2();
    await renderAppAtRoute(`${trackPath}?aktivitet=${kravtyper.id}&kort=3`);
    expect(
      await screen.findByRole('heading', { name: kravtyper.cards[0]!.title }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toContain('kort=1');

    await renderAppAtRoute(`${trackPath}?aktivitet=finnes-ikke&kort=2`);
    expect(
      await screen.findByRole('heading', {
        name: 'Velg et tema du vil øve på.',
      }),
    ).toBeInTheDocument();
  });

  it('keeps a card the learner reached here on reload', async () => {
    const kravtyper = track.sessions[1]!;

    await onboard();
    await activateProgramme2();
    await renderAppAtRoute(`${trackPath}?aktivitet=${kravtyper.id}&kort=3`, {
      microTrack: true,
    });
    expect(
      await screen.findByRole('heading', { name: kravtyper.cards[2]!.title }),
    ).toBeInTheDocument();
  });
});

describe('category navigation through the existing track route', () => {
  it('selects Generelt by keyboard, reloads the list, and follows browser history', async () => {
    const user = userEvent.setup();
    await onboard();
    await activateProgramme2();
    const view = await renderAppAtRoute(trackPath);
    const general = await screen.findByRole('button', { name: /Generelt/ });
    expect(screen.getByText(track.summary)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Velg en aktivitet' }),
    ).toBeNull();
    for (const title of ['Scrum', 'Smidig samarbeid', 'Kanban']) {
      expect(
        screen.getByRole('button', { name: new RegExp(title) }),
      ).toBeEnabled();
    }
    expect(screen.queryByText('Ingen aktiviteter ennå')).toBeNull();
    await user.tab();
    expect(general).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(router.state.location.search).toBe('?kategori=generelt');
    expect(
      screen.getByRole('list', { name: 'Velg en aktivitet' }),
    ).toBeInTheDocument();
    view.unmount();
    await renderAppAtRoute(
      router.state.location.pathname + router.state.location.search,
    );
    expect(
      await screen.findByText('Generelt · 6 aktiviteter'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^1\. / }));
    expect(router.state.location.search).toBe(
      '?aktivitet=' + track.sessions[0]!.id + '&kort=1',
    );
    await guardPause();
    await user.click(
      screen.getByRole('button', { name: 'Tilbake til aktiviteter' }),
    );
    expect(router.state.location.search).toBe('?kategori=generelt');
    await guardPause();
    await user.click(
      screen.getByRole('button', { name: 'Tilbake til temaer' }),
    );
    expect(router.state.location.search).toBe('');
    await act(async () => void (await router.navigate(-1)));
    expect(
      screen.getByRole('heading', { name: 'Velg en aktivitet' }),
    ).toBeInTheDocument();
    await act(async () => void (await router.navigate(1)));
    expect(
      screen.getByRole('heading', { name: 'Velg et tema du vil øve på.' }),
    ).toBeInTheDocument();
  });

  it('redirects an unknown category to the overview', async () => {
    await onboard();
    await activateProgramme2();
    await renderAppAtRoute(trackPath + '?kategori=finnes-ikke');
    expect(
      await screen.findByRole('button', { name: /Generelt/ }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    expect(
      screen.queryByRole('heading', { name: 'Velg en aktivitet' }),
    ).toBeNull();
  });

  it.each(track.categories!.slice(1).map((entry) => [entry.title, entry]))(
    '%s lists exactly its own six activities in authored order',
    async (_title, category) => {
      await onboard();
      await activateProgramme2();
      await renderAppAtRoute(`${trackPath}?kategori=${category.id}`);
      const list = await screen.findByRole('list', {
        name: 'Velg en aktivitet',
      });

      expect(
        screen.getByText(`${category.title} · 6 aktiviteter`),
      ).toBeInTheDocument();
      expect(
        within(list)
          .getAllByRole('button')
          .map((button) => button.textContent),
      ).toEqual(
        category.sessionIds.map(
          (id, index) =>
            `${index + 1}. ${track.sessions.find((s) => s.id === id)!.title}`,
        ),
      );
    },
  );

  it('opens a typed activity link in its own category and returns there', async () => {
    const user = userEvent.setup();
    const k04 = track.sessions.find((s) => s.id === 'tsu-kanban-k04')!;

    await onboard();
    await activateProgramme2();
    await renderAppAtRoute(`${trackPath}?aktivitet=${k04.id}&kort=3`);
    // A typed later card starts the activity over, as for Generelt.
    expect(
      await screen.findByRole('heading', { name: k04.cards[0]!.title }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe(`?aktivitet=${k04.id}&kort=1`);
    await guardPause();
    await user.click(
      screen.getByRole('button', { name: 'Tilbake til aktiviteter' }),
    );
    expect(router.state.location.search).toBe('?kategori=kanban');
    expect(screen.getByText('Kanban · 6 aktiviteter')).toBeInTheDocument();
  });
});
