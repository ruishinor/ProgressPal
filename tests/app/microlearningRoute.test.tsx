import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { router } from '@/app/router/router';
import { loadRpgCampaignPosition, loadRpgHubSummary } from '@/features/rpg';
import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import type { ProgrammeScope } from '@/lib/domain';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { getProgrammeRegistry } from '@/programmes';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

import { p2Index } from '../programmes/p2Content';
import {
  firstRequired,
  progressRows,
  type Reach,
} from '../support/campaignPosition';
import {
  needsCheck,
  rightTaps,
  wrongTaps,
  type Tap,
} from '../support/microlearningPlans';

/**
 * The real route inside the real app. The active programme decides whether
 * microlearning exists; the Campaign's own progress (the same records behind
 * Home's "N of 24 required tasks complete") decides what is open, so a
 * direct visit to `/rpg/micro` never previews what the Campaign has not
 * reached; another programme's cards never show up under CS50x; and reading
 * the position and running whole sessions, right or wrong, leave every
 * learner store exactly as it was. The invariants are tested against
 * snapshots of the database, not assumed from the absence of a save call.
 */

const registry = getProgrammeRegistry();
const bank = programvareutviklingDefinition.content.microlearning!;
const [variabler] = bank.sessions;
const programmeId = 'programvareutvikling';
const order = firstRequired(p2Index, 99);

// The one Campaign read the route makes can be made to fail, and the answer
// can be made empty (no primer, no Repeter: no real Programme 2 position is
// that, since reached topics always repeat); everything else is the real
// module.
const injected = vi.hoisted(() => ({ failRead: false, nothingOpen: false }));

vi.mock('@/lib/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/domain')>();

  return {
    ...actual,
    listReinforcementSessions: (
      ...args: Parameters<typeof actual.listReinforcementSessions>
    ) =>
      injected.nothingOpen ? [] : actual.listReinforcementSessions(...args),
    selectPrimer: (...args: Parameters<typeof actual.selectPrimer>) =>
      injected.nothingOpen ? undefined : actual.selectPrimer(...args),
  };
});

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();

  return {
    ...actual,
    getCourseMapReadData: (
      ...args: Parameters<typeof actual.getCourseMapReadData>
    ) =>
      injected.failRead
        ? Promise.reject(new Error('the Campaign could not be read'))
        : actual.getCourseMapReadData(...args),
  };
});

// Only the network is replaced: packaged content is read from `public/` by
// the same provider, with the same hash checks, as in the browser.
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
  injected.failRead = false;
  injected.nothingOpen = false;
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
  await enrolAndSwitchActiveProgramme(programmeId, {
    seed: programvareutviklingDefinition.catalogue,
  });
}

/** Records the Campaign progress of a learner who has completed `count` required tasks. */
async function completeRequired(count: number, reach: Reach = {}) {
  await getSharedDatabase().progressEntries.bulkPut([
    ...progressRows(order.slice(0, count), 'completed'),
    ...progressRows([...(reach.started ?? [])], 'started'),
  ]);
}

function programme2Scope(): ProgrammeScope {
  const definition = programvareutviklingDefinition;

  return {
    catalogue: definition.catalogue,
    catalogueId: definition.catalogue.courseId,
    content: definition.content,
    policy: definition.policy,
    programmeId: definition.programmeId,
    title: definition.title,
  };
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

const picker = () => screen.findByRole('heading', { name: 'Velg en mikroøkt' });
const rows = () => screen.getAllByRole('listitem');
const repeatNote = 'Flere øvelser kommer når du går videre i programmet.';

describe('/rpg/micro and the active programme', () => {
  it('shows a notice, and none of Programme 2’s cards, while CS50x is active', async () => {
    await onboard();
    await renderAppAtRoute('/rpg/micro');

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Nothing to practise here' }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText('Følg variablene')).toBeNull();
    expect(screen.queryByText(/Velg en mikroøkt/)).toBeNull();
    expect(screen.queryByText('Forbered deg')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Back to the Campaign' }),
    ).toHaveAttribute('href', '/rpg');
  });

  it('gives CS50x no sessions even for a learner whose Programme 2 work would open them', async () => {
    await onboard();
    await activateProgramme2();
    await completeRequired(24);
    // Back to CS50x: the progress is Programme 2's and must not matter.
    await enrolAndSwitchActiveProgramme('cs50x', {
      seed: registry.getByProgrammeId('cs50x').catalogue,
    });
    await renderAppAtRoute('/rpg/micro');

    expect(
      await screen.findByRole('heading', { name: 'Nothing to practise here' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Følg variablene')).toBeNull();
    expect(screen.queryByText('Repeter')).toBeNull();
  });
});

describe('the Campaign’s own position', () => {
  it('is what Home reports: the same current quest and the same count', async () => {
    await onboard();
    await activateProgramme2();
    const scope = programme2Scope();

    for (const count of [0, 2, 3, 13, 24]) {
      await getSharedDatabase().progressEntries.clear();
      await completeRequired(count);
      const position = await loadRpgCampaignPosition(scope);
      const hub = await loadRpgHubSummary(scope);
      const required = position.quests.filter((quest) => quest.required);

      expect(position.state, `${count} complete`).toBe('ready');
      expect(
        required.filter((quest) => quest.complete),
        `${count} complete`,
      ).toHaveLength(hub.courseProgress.completedRequiredItemCount);
      expect(required, `${count} complete`).toHaveLength(
        hub.courseProgress.requiredItemCount,
      );
      expect(position.currentQuestId, `${count} complete`).toBe(
        hub.recommendation.quest?.id ?? null,
      );
    }
  });

  it('prefers a started mission as the current quest, as Home does', async () => {
    await onboard();
    await activateProgramme2();
    await completeRequired(2, { started: ['s1-m01-o05'] });
    const scope = programme2Scope();
    const position = await loadRpgCampaignPosition(scope);
    const hub = await loadRpgHubSummary(scope);

    expect(position.currentQuestId).toBe('s1-m01-o05');
    expect(hub.recommendation.quest?.id).toBe('s1-m01-o05');
    expect(
      position.quests.find((quest) => quest.id === 's1-m01-o05'),
    ).toMatchObject({ complete: false, reached: true });
  });

  it('says nothing is available when the Campaign cannot be summarized', async () => {
    await onboard();
    await activateProgramme2();
    await getSharedDatabase().courseItems.clear();

    const position = await loadRpgCampaignPosition(programme2Scope());

    expect(position.state).toBe('unavailable');
    expect(position.currentQuestId).toBeNull();
  });
});

describe('what the picker offers, through the real route', () => {
  it('gives a fresh Programme 2 learner a primer to begin with and no Repeter yet, on a direct visit', async () => {
    await onboard();
    await activateProgramme2();
    await renderAppAtRoute('/rpg/micro');

    await picker();
    expect(
      screen.getByRole('heading', { name: 'Forbered deg' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Python, editor og terminal/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Øv igjen' }),
    ).toBeInTheDocument();
    expect(screen.getByText(repeatNote)).toBeInTheDocument();
    expect(rows()).toHaveLength(1);
    expect(screen.queryByText('Følg variablene')).toBeNull();
    expect(screen.queryByText(/Ingen mikroøkter/)).toBeNull();
  });

  it('does not let a direct link reach a later session', async () => {
    await onboard();
    await activateProgramme2();
    await renderAppAtRoute(
      '/rpg/micro?session=tenk-forst&primer=forb-test#forb-test',
    );

    await picker();
    expect(rows()).toHaveLength(1);
    expect(screen.queryByText(/Forventet svar først/)).toBeNull();
    expect(screen.queryByText(/Tenk først, så kode/)).toBeNull();
  });

  it('reproduces the physical test: 3 of 24 required tasks complete still gives a primer, and keeps Repeter shut', async () => {
    await onboard();
    await activateProgramme2();
    await completeRequired(3);
    await renderAppAtRoute('/rpg/micro');

    await picker();
    expect(
      screen.getByRole('button', { name: /^Koden er bare ett steg/ }),
    ).toBeInTheDocument();
    expect(rows()).toHaveLength(1);
    expect(screen.getByText(repeatNote)).toBeInTheDocument();
    // Nothing from further ahead.
    expect(screen.queryByText(/Slik leser du en feilmelding/)).toBeNull();
    expect(screen.queryByText(/Lagre en versjon med Git/)).toBeNull();
    expect(screen.queryByText(/Følg variablene/)).toBeNull();
  });

  it('moves the primer along with the Campaign, one step at a time', async () => {
    await onboard();
    await activateProgramme2();
    await completeRequired(6);
    await renderAppAtRoute('/rpg/micro');

    await picker();
    expect(
      screen.getByRole('button', { name: /^Lagre en versjon med Git/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Python, editor og terminal/)).toBeNull();
    expect(screen.queryByText(/En variabel husker en verdi/)).toBeNull();
  });

  it('opens Repeter for each reached topic, beside the next primer', async () => {
    await onboard();
    await activateProgramme2();
    await completeRequired(13);
    await renderAppAtRoute('/rpg/micro');

    await picker();
    expect(
      screen.getByRole('button', { name: /^Tall og tekst er ulike typer/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Følg variablene/ }),
    ).toBeInTheDocument();
    // Module 1's reached topics repeat too, with only those topics.
    expect(
      screen.getByRole('button', {
        name: /^Les feilmeldingen\s?4 kort · ca\. 4 min\. Les feilen nedenfra og finn linjen\.$/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Tenk først, så kode\s?3 kort/ }),
    ).toBeInTheDocument();
    expect(rows()).toHaveLength(4);
    // Unreached: neither the types-and-input session nor any later summary.
    expect(screen.queryByText(/Tall eller tekst\?/)).toBeNull();
    expect(screen.queryByText(/Forventet svar/)).toBeNull();
    expect(screen.queryByText(/tekst og tall blandes/)).toBeNull();
    expect(
      screen.getByText(/Flere åpnes når du kommer lenger\./),
    ).toBeInTheDocument();
  });

  it('opens a reached Module 1 topic in the Build phase, which the old rule held shut', async () => {
    const user = userEvent.setup();

    await onboard();
    await activateProgramme2();
    await completeRequired(8);
    await renderAppAtRoute('/rpg/micro');

    await picker();
    expect(screen.queryByRole('heading', { name: 'Forbered deg' })).toBeNull();
    expect(rows()).toHaveLength(2);
    await user.click(
      screen.getByRole('button', { name: /^Les feilmeldingen/ }),
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      'Kort 1 av 4',
    );
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Les feilmeldingen nedenfra',
      }),
    ).toBeInTheDocument();
  });

  it('opens all four Repeter sessions, and no primer, once everything is reached', async () => {
    await onboard();
    await activateProgramme2();
    await completeRequired(24);
    await renderAppAtRoute('/rpg/micro');

    await picker();
    expect(rows()).toHaveLength(4);
    expect(screen.queryByRole('heading', { name: 'Forbered deg' })).toBeNull();
    expect(screen.queryByText(/Flere åpnes/)).toBeNull();
  });

  it('is discriminating: more Campaign progress changes what is offered', async () => {
    await onboard();
    await activateProgramme2();
    await completeRequired(3);
    const first = await renderAppAtRoute('/rpg/micro');

    await picker();
    expect(rows()).toHaveLength(1);
    first.unmount();

    await completeRequired(13);
    await renderAppAtRoute('/rpg/micro');
    await picker();
    expect(rows()).toHaveLength(4);
  });

  it('reads without writing: no store changes by opening the picker', async () => {
    await onboard();
    await activateProgramme2();
    await completeRequired(13);
    const before = await snapshotDatabase();

    await renderAppAtRoute('/rpg/micro');
    await picker();

    expect(await snapshotDatabase()).toBe(before);
  });
});

describe('the way in from Home', () => {
  it('gives a Programme 2 learner a secondary entry to the same route, after the Campaign’s own call to action', async () => {
    const user = userEvent.setup();

    await onboard();
    await activateProgramme2();
    await renderAppAtRoute('/rpg');

    const entry = await screen.findByRole('link', { name: 'Mikroøkt' });
    const links = screen.getAllByRole('link');

    expect(entry).toHaveAttribute('href', '/rpg/micro');
    expect(
      links.findIndex((link) =>
        link.getAttribute('href')?.includes('/rpg/resource/'),
      ),
    ).toBeGreaterThanOrEqual(0);
    expect(
      links.findIndex((link) =>
        link.getAttribute('href')?.includes('/rpg/resource/'),
      ),
    ).toBeLessThan(links.indexOf(entry));
    await user.click(entry);
    await picker();
    expect(
      screen.getByRole('button', { name: /^Python, editor og terminal/ }),
    ).toBeInTheDocument();
  });

  it('gives CS50x no entry', async () => {
    await onboard();
    await renderAppAtRoute('/rpg');

    await waitFor(() => {
      expect(
        screen.getAllByRole('link', { name: 'Campaign' }).length,
      ).toBeGreaterThan(0);
    });
    expect(screen.queryByRole('link', { name: 'Mikroøkt' })).toBeNull();
    expect(screen.queryByText(/Mikroøkt/)).toBeNull();
    expect(screen.queryByText(/Ingen mikroøkt/)).toBeNull();
  });

  it('gives CS50x no entry and no Microlearning line even when Programme 2 work is recorded', async () => {
    await onboard();
    await activateProgramme2();
    await completeRequired(8);
    await enrolAndSwitchActiveProgramme('cs50x', {
      seed: registry.getByProgrammeId('cs50x').catalogue,
    });
    await renderAppAtRoute('/rpg');

    await waitFor(() => {
      expect(
        screen.getAllByRole('link', { name: 'Campaign' }).length,
      ).toBeGreaterThan(0);
    });
    expect(screen.queryByRole('link', { name: 'Mikroøkt' })).toBeNull();
    expect(screen.queryByText(/Mikroøkt|Ingen mikroøkt/)).toBeNull();
  });
});

describe('Home only advertises a session that exists', () => {
  const homeEntry = () => screen.queryByRole('link', { name: 'Mikroøkt' });
  const campaignAction = () =>
    screen
      .getAllByRole('link')
      .find((link) => link.getAttribute('href')?.includes('/rpg/resource/'));

  async function homeAt(complete: number) {
    await onboard();
    await activateProgramme2();
    await completeRequired(complete);

    return renderAppAtRoute('/rpg');
  }

  it.each([
    [0, 'Nå kan du forberede deg på neste oppgave.'],
    [3, 'Nå kan du forberede deg på neste oppgave.'],
    [13, 'Nå kan du både forberede deg og øve igjen.'],
  ])(
    'offers an active entry, with copy that matches, when %i required tasks are complete',
    async (complete, copy) => {
      await homeAt(complete);

      const entry = await screen.findByRole('link', { name: 'Mikroøkt' });

      expect(entry).toHaveAttribute('href', '/rpg/micro');
      // What it offers now sits behind its own (i), next to the link.
      await userEvent.click(
        screen.getByRole('button', { name: 'Om Mikroøkt' }),
      );
      expect(screen.getByText(new RegExp(copy))).toBeInTheDocument();
      expect(screen.queryByText(/Ingen mikroøkt/)).toBeNull();
      // The Campaign's own action stays first and stays the primary one.
      expect(campaignAction()).toBeDefined();
      expect(
        screen.getAllByRole('link').indexOf(campaignAction() as HTMLElement),
      ).toBeLessThan(screen.getAllByRole('link').indexOf(entry));
    },
  );

  it('offers repetition alone, with copy that says so, once the whole Campaign is reached', async () => {
    await homeAt(24);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Om Mikroøkt' }),
    );
    expect(
      screen.getByText(/Nå kan du øve igjen på det du har jobbet med\./),
    ).toBeInTheDocument();
    expect(homeEntry()).toHaveAttribute('href', '/rpg/micro');
    expect(screen.queryByText(/Ingen mikroøkt/)).toBeNull();
  });

  it.each([
    [7, 's1-m01-o08'],
    [10, 's1-m01-ret'],
  ])(
    'offers repetition of reached topics, and no primer, in the Build phase after %i complete (%s)',
    async (complete, current) => {
      await homeAt(complete);

      const entry = await screen.findByRole('link', { name: 'Mikroøkt' });

      expect(entry).toHaveAttribute('href', '/rpg/micro');
      await userEvent.click(
        screen.getByRole('button', { name: 'Om Mikroøkt' }),
      );
      expect(
        screen.getByText(/Nå kan du øve igjen på det du har jobbet med\./),
      ).toBeInTheDocument();
      // The Campaign is still the one thing to do, and comes first.
      expect(campaignAction()).toHaveAttribute(
        'href',
        expect.stringContaining(current),
      );
      expect(
        screen.getAllByRole('link').indexOf(campaignAction() as HTMLElement),
      ).toBeLessThan(screen.getAllByRole('link').indexOf(entry));
    },
  );

  it('promises no session, and links nowhere, when nothing is open', async () => {
    injected.nothingOpen = true;
    await homeAt(7);

    expect(
      await screen.findByText(
        'Ingen mikroøkt akkurat nå. Fortsett kampanjen, så åpnes flere.',
      ),
    ).toBeInTheDocument();
    expect(homeEntry()).toBeNull();
    expect(
      screen
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href')?.includes('/rpg/micro')),
    ).toHaveLength(0);
    expect(campaignAction()).toHaveAttribute(
      'href',
      expect.stringContaining('s1-m01-o08'),
    );
  });

  it('agrees with the picker at every one of these positions', async () => {
    const seen: Record<string, [boolean, number]> = {};

    for (const [complete, nothingOpen] of [
      [0, false],
      [3, false],
      [4, false],
      [7, false],
      [10, false],
      [13, false],
      [24, false],
      [7, true],
    ] as const) {
      injected.nothingOpen = nothingOpen;
      await getSharedDatabase().progressEntries.clear();
      if (complete === 0) {
        await onboard();
        await activateProgramme2();
      }
      await completeRequired(complete);

      const home = await renderAppAtRoute('/rpg');

      await screen.findByText(/Mikroøkt|Ingen mikroøkt/);
      const advertised = homeEntry() !== null;

      home.unmount();

      const route = await renderAppAtRoute('/rpg/micro');

      await waitFor(() => {
        expect(
          screen.queryByText('Velg en mikroøkt') ??
            screen.queryByText('Ingen mikroøkter akkurat nå'),
        ).not.toBeNull();
      });
      const listed = screen.queryAllByRole('listitem').length;

      route.unmount();
      seen[`${complete}${nothingOpen ? ' (nothing open)' : ''}`] = [
        advertised,
        listed,
      ];
      expect(advertised, `${complete} complete`).toBe(listed > 0);
    }

    // Not vacuous: both outcomes occurred.
    expect(Object.values(seen).some(([advertised]) => advertised)).toBe(true);
    expect(Object.values(seen).some(([advertised]) => !advertised)).toBe(true);
  }, 30_000);

  it('says nothing, rather than promise a session, when the availability cannot be read', async () => {
    await onboard();
    await activateProgramme2();
    injected.failRead = true;
    await renderAppAtRoute('/rpg');

    // Home itself still works: the Campaign's action is there.
    await waitFor(() => {
      expect(campaignAction()).toBeDefined();
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(homeEntry()).toBeNull();
    expect(screen.queryByText(/Mikroøkt|Ingen mikroøkt/)).toBeNull();
  });

  it('reads and writes nothing of its own: opening Home changes no store', async () => {
    await onboard();
    await activateProgramme2();
    await completeRequired(8);
    const before = await snapshotDatabase();

    await renderAppAtRoute('/rpg');
    await screen.findByRole('link', { name: 'Mikroøkt' });

    expect(await snapshotDatabase()).toBe(before);
  });
});

describe('a whole session against the real database', () => {
  // The guard needs real time between presses of an action that moves on.
  const pause = () => new Promise((resolve) => setTimeout(resolve, 450));

  async function run(title: RegExp, wrongFirst: boolean, complete: number) {
    const user = userEvent.setup();

    await onboard();
    await activateProgramme2();
    await completeRequired(complete);
    const before = await snapshotDatabase();

    expect(before).toContain('learner_profile');
    expect(before).toContain('progress_entries');

    await renderAppAtRoute('/rpg/micro');
    await user.click(await screen.findByRole('button', { name: title }));
    // The immersive session: no primary navigation, no RPG shell.
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByTestId('rpg-shell')).toBeNull();

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

    // Whichever session is running: read its cards off the bank.
    const session = [...bank.sessions, ...(bank.primers ?? [])].find((entry) =>
      title.test(entry.title),
    )!;

    for (const card of session.cards) {
      if (card.kind !== 'learn') {
        if (wrongFirst) {
          await tap(wrongTaps(card, 0));
          if (needsCheck(card)) {
            await act('Sjekk');
          }
          await act('Prøv igjen');
        }
        await tap(rightTaps(card));
        if (needsCheck(card)) {
          await act('Sjekk');
        }
      }
      await act(/^(Neste|Fullfør)$/);
    }

    expect(
      screen.getByRole('heading', { name: 'Økten er ferdig' }),
    ).toBeInTheDocument();

    return { after: await snapshotDatabase(), before };
  }

  it('changes no Campaign or learner store when a primer is completed correctly', async () => {
    const { after, before } = await run(
      /^Python, editor og terminal/,
      false,
      0,
    );

    expect(after).toBe(before);
  }, 60_000);

  it('changes no store when a primer is missed first', async () => {
    const { after, before } = await run(/^Koden er bare ett steg/, true, 3);

    expect(after).toBe(before);
  }, 60_000);

  it('changes no store when every Repeter card is answered correctly', async () => {
    const { after, before } = await run(
      new RegExp(`^${variabler!.title}`),
      false,
      13,
    );

    expect(after).toBe(before);
  }, 60_000);

  it('changes no store when every Repeter card is missed once first', async () => {
    const { after, before } = await run(
      new RegExp(`^${variabler!.title}`),
      true,
      13,
    );

    expect(after).toBe(before);
  }, 60_000);

  it('would notice a write: the snapshot differs after one real save', async () => {
    await onboard();
    await activateProgramme2();
    const before = await snapshotDatabase();

    await saveLearnerProfile(
      {
        ...defaultLearnerProfileValues,
        displayName: 'Noen andre',
        targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
      },
      { completeOnboarding: true },
    );

    expect(await snapshotDatabase()).not.toBe(before);
  });

  it('would notice a Campaign write: completing a task moves the snapshot', async () => {
    await onboard();
    await activateProgramme2();
    await completeRequired(3);
    const before = await snapshotDatabase();

    await completeRequired(4);

    expect(await snapshotDatabase()).not.toBe(before);
  });
});

describe('the browser’s Back and Forward in Mikroøkt', () => {
  const back = () => act(async () => void (await router.navigate(-1)));
  const forward = () => act(async () => void (await router.navigate(1)));
  const heading = () => screen.getByRole('heading', { level: 1 });
  const pause = () => new Promise((resolve) => setTimeout(resolve, 450));
  const [learnCard, firstCheck, thirdCard] = variabler!.cards;

  it('move between cards and the picker, and Lukk goes Home', async () => {
    const user = userEvent.setup();

    await onboard();
    await activateProgramme2();
    await completeRequired(13);
    await renderAppAtRoute('/rpg/micro');
    await picker();
    await user.click(screen.getByRole('button', { name: /^Følg variablene/ }));
    expect(heading()).toHaveTextContent(learnCard!.title);
    expect(router.state.location.search).toBe('?okt=variabler&kort=1');
    await pause();
    await user.click(screen.getByRole('button', { name: 'Neste' }));
    expect(heading()).toHaveTextContent(firstCheck!.title);

    await back();
    expect(heading()).toHaveTextContent(learnCard!.title);
    await back();
    expect(heading()).toHaveTextContent('Velg en mikroøkt');
    await forward();
    expect(heading()).toHaveTextContent(learnCard!.title);
    await forward();
    expect(heading()).toHaveTextContent(firstCheck!.title);
    // A card reached again starts unanswered: nothing was kept.
    expect(screen.getByRole('status')).toHaveTextContent(
      'Trykk på svaret du tror stemmer.',
    );

    await user.click(screen.getByRole('link', { name: 'Lukk mikroøkten' }));
    expect(router.state.location.pathname).toBe('/rpg');
  });

  it('starts a typed later card at the first card, and keeps a card reached here on reload', async () => {
    await onboard();
    await activateProgramme2();
    await completeRequired(13);
    await renderAppAtRoute('/rpg/micro?okt=variabler&kort=3');
    expect(
      await screen.findByRole('heading', { level: 1, name: learnCard!.title }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('?okt=variabler&kort=1');

    await renderAppAtRoute('/rpg/micro?okt=variabler&kort=3', {
      microSession: true,
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: thirdCard!.title }),
    ).toBeInTheDocument();
  });

  it('never opens what the picker would not list: an unreached session, an unknown one, or unreached topics', async () => {
    await onboard();
    await activateProgramme2();
    await completeRequired(13);

    for (const search of ['?okt=typer-og-input&kort=1', '?okt=finnes-ikke']) {
      await renderAppAtRoute(`/rpg/micro${search}`);
      await picker();
      expect(router.state.location.search).toBe('');
      expect(screen.queryByText(/Tall eller tekst\?/)).toBeNull();
    }

    // A session with only some topics reached opens with those topics only.
    await renderAppAtRoute('/rpg/micro?okt=tenk-forst&kort=1');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Sett stegene fra problem til løsning i rekkefølge',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      'Kort 1 av 3',
    );
    expect(screen.queryByText(/forventet svar/i)).toBeNull();
  });

  it('gives a full «Øv igjen» its own screen in the history, and only while it needs one', async () => {
    const user = userEvent.setup();

    await onboard();
    await activateProgramme2();
    await completeRequired(17);
    const first = await renderAppAtRoute('/rpg/micro');
    await picker();
    // The next primer and one row for the four «Øv igjen» sessions.
    expect(rows()).toHaveLength(2);
    await user.click(
      screen.getByRole('button', { name: /^Velg blant 4 økter/ }),
    );
    expect(heading()).toHaveTextContent('Øv igjen');
    expect(router.state.location.search).toBe('?liste=ov-igjen');
    expect(rows()).toHaveLength(4);
    await pause();
    await user.click(screen.getByRole('button', { name: /^Følg variablene/ }));
    expect(heading()).toHaveTextContent(learnCard!.title);

    await back();
    expect(heading()).toHaveTextContent('Øv igjen');
    await back();
    expect(heading()).toHaveTextContent('Velg en mikroøkt');

    // With four rows enough, the list has no screen of its own.
    first.unmount();
    await getSharedDatabase().progressEntries.clear();
    await completeRequired(13);
    await renderAppAtRoute('/rpg/micro?liste=ov-igjen');
    await picker();
    expect(router.state.location.search).toBe('');
    expect(rows()).toHaveLength(4);
  });

  it('fails closed on an address when the progress cannot be read, or under another programme', async () => {
    await onboard();
    await activateProgramme2();
    await completeRequired(24);
    injected.failRead = true;
    await renderAppAtRoute('/rpg/micro?okt=variabler&kort=1');
    expect(
      await screen.findByRole('heading', {
        name: 'Mikroøkter er ikke tilgjengelige',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(learnCard!.title)).toBeNull();

    injected.failRead = false;
    await enrolAndSwitchActiveProgramme('cs50x', {
      seed: registry.getByProgrammeId('cs50x').catalogue,
    });
    await renderAppAtRoute('/rpg/micro?okt=variabler&kort=1');
    expect(
      await screen.findByRole('heading', { name: 'Nothing to practise here' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(learnCard!.title)).toBeNull();
  });
});

describe('when the Campaign cannot be read', () => {
  it('fails closed: nothing is offered, however much work is recorded', async () => {
    await onboard();
    await activateProgramme2();
    await completeRequired(24);
    injected.failRead = true;
    await renderAppAtRoute('/rpg/micro');

    expect(
      await screen.findByRole('heading', {
        name: 'Mikroøkter er ikke tilgjengelige',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Følg variablene')).toBeNull();
    expect(screen.queryByText('Forbered deg')).toBeNull();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
