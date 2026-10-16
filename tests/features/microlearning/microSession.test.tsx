import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import {
  ActionGuardContext,
  createActionGuard,
} from '@/features/microlearning/components/actionGuard';
import { MicrolearningPage } from '@/features/microlearning';
import type { MicroCard, MicroSession } from '@/lib/domain';
import { programvareutviklingMicrolearning as bank } from '@/programmes/programvareutvikling/microlearning';

import {
  needsCheck,
  rightTaps,
  wrongTaps,
  type PlanCard,
  type Tap,
} from '../../support/microlearningPlans';

type User = ReturnType<typeof userEvent.setup>;

const [variabler, typer, feil, tenk] = bank.sessions as [
  MicroSession,
  MicroSession,
  MicroSession,
  MicroSession,
];

/** Shows where the router is, so a test can see a link was (not) followed. */
function LocationProbe() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

/**
 * The action guard reads this clock. While `auto` is on, every read moves it a
 * second on, so walkthroughs, which press actions back to back, are never held
 * up. A guard test turns `auto` off to press at an exact moment.
 */
type Clock = { auto: boolean; t: number };

function renderPage(
  options: {
    clock?: Clock;
    eligible?: readonly string[];
    primer?: string | null;
  } = {},
) {
  const user = userEvent.setup();
  const clock = options.clock ?? { auto: true, t: 0 };
  const guard = createActionGuard(() =>
    clock.auto ? (clock.t += 1000) : clock.t,
  );
  const eligible =
    options.eligible ?? bank.sessions.map((session) => session.id);

  render(
    <MemoryRouter initialEntries={['/rpg/micro']}>
      <LocationProbe />
      <ActionGuardContext.Provider value={guard}>
        <MicrolearningPage
          availability={{
            primerId: options.primer ?? null,
            repeatSessionIds: new Set(eligible),
            status: 'ready',
          }}
          bank={bank}
        />
      </ActionGuardContext.Provider>
    </MemoryRouter>,
  );
  return user;
}

const title = () => screen.getByRole('heading', { level: 1 });
const status = () => screen.getByRole('status');
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const isDisabled = (name: string | RegExp) =>
  button(name).getAttribute('aria-disabled') === 'true';

async function doTaps(user: User, taps: Tap[]) {
  for (const tap of taps) {
    const scope =
      tap.group === undefined
        ? screen
        : within(screen.getByRole('group', { name: tap.group }));

    await user.click(scope.getAllByRole('button', { name: tap.name })[0]!);
  }
}

async function check(user: User, card: PlanCard) {
  if (needsCheck(card)) {
    await user.click(button('Sjekk'));
  }
}

async function solve(user: User, card: MicroCard) {
  await doTaps(user, rightTaps(card));
  await check(user, card);
}

async function miss(user: User, card: MicroCard, n: number) {
  await doTaps(user, wrongTaps(card, n));
  await check(user, card);
}

const next = (user: User) => user.click(button(/^(Neste|Fullfør)$/));

async function start(user: User, session: MicroSession) {
  await user.click(button(new RegExp(`^${session.title}`)));
  expect(title()).toHaveTextContent(session.cards[0]!.title);
}

/** Starts the session and walks to the card with the given ID by solving. */
async function reach(user: User, session: MicroSession, cardId: string) {
  await start(user, session);
  for (const card of session.cards) {
    if (card.id === cardId) {
      return card;
    }
    await solve(user, card);
    await next(user);
  }
  throw new Error(`no card ${cardId}`);
}

describe('session picker', () => {
  it('lists the sessions, takes focus, and starts one', async () => {
    const user = renderPage();

    expect(title()).toHaveTextContent('Velg en mikroøkt');
    expect(title()).toHaveFocus();
    expect(screen.queryByRole('progressbar')).toBeNull();
    for (const session of bank.sessions) {
      expect(button(new RegExp(`^${session.title}`))).toHaveTextContent(
        `${session.cards.length} kort · ca. ${session.minutes} min.`,
      );
    }

    await user.click(button(/^Følg variablene/));
    expect(title()).toHaveTextContent('En variabel husker en verdi');
    expect(title()).toHaveFocus();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      'Kort 1 av 6',
    );
  });
});

describe('Learn card', () => {
  it('has no answer, check or retry, and names the practice that follows', async () => {
    const user = renderPage();
    await start(user, variabler);

    expect(status()).toHaveTextContent('Neste: prøv det på nesten samme kode.');
    expect(isDisabled('Neste')).toBe(false);
    expect(screen.queryByRole('button', { name: 'Sjekk' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Prøv igjen' })).toBeNull();
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('runs a full Learn, scaffolded and independent sequence on one idea', async () => {
    const user = renderPage();
    await start(user, variabler);

    // Learn: the idea and its example.
    expect(screen.getByText(/antall = antall \+ 2/)).toBeInTheDocument();
    await next(user);

    // Scaffold: nearly the same code, different names.
    expect(title()).toHaveTextContent('Hva skrives ut?');
    expect(screen.getByText(/kopper = kopper \+ 3/)).toBeInTheDocument();
    await doTaps(user, rightTaps(variabler.cards[1]!));
    expect(status()).toHaveTextContent('Riktig.');
    await next(user);

    // Process view, then independent retrieval on a longer trace.
    await solve(user, variabler.cards[2]!);
    await next(user);
    expect(title()).toHaveTextContent(
      'Koble hver linje med verdien x har etterpå',
    );
    await solve(user, variabler.cards[3]!);
    expect(status()).toHaveTextContent('Riktig.');
  });
});

describe('one-retry loop', () => {
  const select = variabler.cards[1]!;

  it('answers a correct first attempt with confirmation and the explanation', async () => {
    const user = renderPage();
    await reach(user, variabler, select.id);

    await solve(user, select);
    expect(status()).toHaveTextContent('Riktig.');
    expect(status()).toHaveTextContent('lagrer 7 under kopper');
    expect(button(/^7/)).toHaveTextContent('✓ Ditt svar');
    expect(isDisabled('Neste')).toBe(false);
  });

  it('shows a hint, not the answer, after a first miss, and offers only a retry', async () => {
    const user = renderPage();
    await reach(user, variabler, select.id);

    await miss(user, select, 0);
    expect(status()).toHaveTextContent('Ikke helt.');
    expect(status()).toHaveTextContent('Regn ut høyresiden først');
    expect(status()).not.toHaveTextContent('lagrer 7');
    expect(button(/^4/)).toHaveTextContent('✗ Ditt svar');
    // The right answer is not given away, and Next is not on offer yet.
    expect(button(/^7/)).not.toHaveTextContent('✓');
    expect(screen.queryByRole('button', { name: 'Neste' })).toBeNull();
    expect(isDisabled('Prøv igjen')).toBe(false);
    // The card is frozen while the hint is read.
    await user.click(button(/^7/));
    expect(status()).toHaveTextContent('Ikke helt.');
  });

  it('retries once with the miss eliminated, and credits a correct retry', async () => {
    const user = renderPage();
    await reach(user, variabler, select.id);

    await miss(user, select, 0);
    await user.click(button('Prøv igjen'));
    expect(status()).toHaveTextContent('Tips:');
    expect(status()).toHaveTextContent('Regn ut høyresiden først');
    expect(button(/^4/)).toHaveTextContent('✗ Ikke denne');
    expect(isDisabled(/^4/)).toBe(true);
    expect(isDisabled(/^7/)).toBe(false);
    expect(isDisabled('Neste')).toBe(true);

    // The eliminated option cannot be tapped again.
    await user.click(button(/^4/));
    expect(status()).toHaveTextContent('Tips:');

    await user.click(button(/^7/));
    expect(status()).toHaveTextContent('Riktig nå.');
    expect(button(/^7/)).toHaveTextContent('✓ Ditt svar');
    expect(isDisabled('Neste')).toBe(false);
  });

  it('reveals the answer after a second miss, allows Next, and forces nothing further', async () => {
    const user = renderPage();
    await reach(user, variabler, select.id);

    await miss(user, select, 0);
    await user.click(button('Prøv igjen'));
    await miss(user, select, 1);

    expect(status()).toHaveTextContent('Her er svaret.');
    expect(status()).toHaveTextContent('lagrer 7 under kopper');
    expect(button(/^7/)).toHaveTextContent('✓ Riktig svar');
    expect(button(/^3/)).toHaveTextContent('✗ Ditt svar');
    expect(button(/^4/)).toHaveTextContent('✗ Ikke denne');
    expect(screen.queryByRole('button', { name: 'Prøv igjen' })).toBeNull();
    expect(isDisabled('Neste')).toBe(false);

    await next(user);
    expect(title()).toHaveTextContent('Sett trinnene i den rekkefølgen');
  });
});

describe('Order card', () => {
  const order = variabler.cards[2]!;

  it('clears the list for the retry and numbers the right order after a second miss', async () => {
    const user = renderPage();
    await reach(user, variabler, order.id);

    await miss(user, order, 0);
    expect(status()).toHaveTextContent('Ikke helt.');
    // The wrong order stays visible while the hint is read.
    expect(button(/^Lagre 5/)).toHaveAccessibleName(/nummer 1/);
    expect(isDisabled(/^Hent verdien/)).toBe(true);

    await user.click(button('Prøv igjen'));
    expect(status()).toHaveTextContent('Tips:');
    expect(button(/^Lagre 5/)).toHaveAccessibleName(/ikke plassert/);
    expect(button(/^Hent verdien/)).toHaveAccessibleName(/ikke plassert/);
    expect(isDisabled('Sjekk')).toBe(true);

    await miss(user, order, 0);
    expect(status()).toHaveTextContent('Her er svaret.');
    expect(button(/^Hent verdien/)).toHaveAccessibleName(/nummer 1/);
    expect(button(/^Legg til 2/)).toHaveAccessibleName(/nummer 2/);
    expect(button(/^Lagre 5/)).toHaveAccessibleName(/nummer 3/);
    expect(isDisabled('Neste')).toBe(false);
  });

  it('credits a correct retry', async () => {
    const user = renderPage();
    await reach(user, variabler, order.id);

    await miss(user, order, 0);
    await user.click(button('Prøv igjen'));
    await solve(user, order);
    expect(status()).toHaveTextContent('Riktig nå.');
  });
});

describe('Match card', () => {
  const match = variabler.cards[3]!;
  const wrongPair: Tap[] = [
    { group: 'Linje', name: /^x = x \+ 1/ },
    { group: 'x etterpå', name: /^10/ },
  ];

  it('keeps found pairs through the retry and numbers every pair after a second miss', async () => {
    const user = renderPage();
    await reach(user, variabler, match.id);

    // One pair found, then a miss.
    await doTaps(user, rightTaps(match).slice(0, 2));
    await doTaps(user, wrongPair);
    expect(status()).toHaveTextContent('Ikke helt.');
    expect(document.querySelectorAll('[data-result="incorrect"]')).toHaveLength(
      2,
    );

    await user.click(button('Prøv igjen'));
    expect(status()).toHaveTextContent('Tips:');
    expect(document.querySelectorAll('[data-result="incorrect"]')).toHaveLength(
      0,
    );
    expect(screen.getAllByText('1✓')).toHaveLength(2);

    // A second miss reveals every pair, with no stale error markers.
    await doTaps(user, wrongPair);
    expect(status()).toHaveTextContent('Her er svaret.');
    expect(document.querySelectorAll('[data-result="incorrect"]')).toHaveLength(
      0,
    );
    for (const index of [1, 2, 3, 4]) {
      expect(screen.getAllByText(`${index}✓`)).toHaveLength(2);
    }
    expect(isDisabled('Neste')).toBe(false);
  });

  it('is credited when the last pair is found on the retry', async () => {
    const user = renderPage();
    await reach(user, variabler, match.id);

    await miss(user, match, 0);
    await user.click(button('Prøv igjen'));
    await doTaps(user, rightTaps(match));
    expect(status()).toHaveTextContent('Riktig nå.');
  });
});

describe('Tap card', () => {
  const tap = variabler.cards[4]!;

  it('eliminates the missed token and reveals the right one after a second miss', async () => {
    const user = renderPage();
    await reach(user, variabler, tap.id);

    await miss(user, tap, 0);
    expect(status()).toHaveTextContent('Ikke helt.');
    expect(document.querySelectorAll('[data-result="incorrect"]')).toHaveLength(
      1,
    );
    await user.click(button('Prøv igjen'));
    await miss(user, tap, 1);

    expect(status()).toHaveTextContent('Her er svaret.');
    expect(button('Linje 1: antall, riktig')).toHaveAttribute(
      'data-result',
      'correct',
    );
    expect(isDisabled('Neste')).toBe(false);
  });
});

describe('Assemble card', () => {
  const assemble = variabler.cards[5]!;

  it('grades by what the parts say, so equal parts are interchangeable', async () => {
    const user = renderPage();
    await reach(user, variabler, assemble.id);

    const pool = () => within(screen.getByRole('group', { name: 'Deler' }));
    // Both "kopper" parts are the same word: take the second one for the
    // first slot and the first for the third.
    const koppers = () => pool().getAllByRole('button', { name: 'kopper' });
    await user.click(koppers()[1]!);
    await user.click(pool().getByRole('button', { name: 'lik-tegn' }));
    await user.click(koppers()[0]!);
    await user.click(pool().getByRole('button', { name: 'pluss' }));
    await user.click(pool().getByRole('button', { name: '3' }));
    await user.click(button('Sjekk'));

    expect(status()).toHaveTextContent('Riktig.');
  });

  it('starts the line empty on a retry and builds the right line after a second miss', async () => {
    const user = renderPage();
    await reach(user, variabler, assemble.id);

    await miss(user, assemble, 0);
    expect(status()).toHaveTextContent('Ikke helt.');
    await user.click(button('Prøv igjen'));
    expect(screen.getByText('Linjen din er tom.')).toBeInTheDocument();
    expect(status()).toHaveTextContent('Tips:');

    await miss(user, assemble, 0);
    expect(status()).toHaveTextContent('Her er svaret.');
    const line = within(screen.getByRole('group', { name: 'Linjen din' }));
    expect(line.getAllByRole('button').map((part) => part.textContent)).toEqual(
      ['kopper', '=', 'kopper', '+', '3'],
    );
  });
});

describe('every session, card by card', () => {
  for (const session of bank.sessions) {
    it(`${session.id}: solved first time, it ends cleanly`, async () => {
      const user = renderPage();
      await start(user, session);

      for (const card of session.cards) {
        expect(title()).toHaveTextContent(card.title);
        expect(title()).toHaveFocus();
        await solve(user, card);
        if (card.kind !== 'learn') {
          expect(status()).toHaveTextContent('Riktig.');
        }
        await next(user);
      }

      expect(title()).toHaveTextContent('Økten er ferdig');
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        String(session.cards.length),
      );
    });

    it(`${session.id}: missed twice on every card, it still ends cleanly`, async () => {
      const user = renderPage();
      await start(user, session);

      for (const card of session.cards) {
        if (card.kind !== 'learn') {
          await miss(user, card, 0);
          expect(status()).toHaveTextContent('Ikke helt.');
          await user.click(button('Prøv igjen'));
          await miss(user, card, 1);
          expect(status()).toHaveTextContent('Her er svaret.');
          expect(status()).toHaveTextContent(card.explanation);
        }
        await next(user);
      }

      expect(title()).toHaveTextContent('Økten er ferdig');
    });
  }

  it('credits a correct retry on the first practice card of the other sessions', async () => {
    for (const session of [typer, feil, tenk]) {
      cleanup();
      const user = renderPage();
      await start(user, session);
      await next(user);
      const first = session.cards[1]!;

      await miss(user, first, 0);
      await user.click(button('Prøv igjen'));
      await solve(user, first);
      expect(status()).toHaveTextContent('Riktig nå.');
    }
  });
});

describe('the end of a session', () => {
  it('says nothing was kept, links back to the Campaign, and returns to the picker', async () => {
    const user = renderPage();
    await start(user, tenk);
    for (const card of tenk.cards) {
      await solve(user, card);
      await next(user);
    }

    expect(title()).toHaveTextContent('Økten er ferdig');
    expect(screen.getByText(/Ingenting ble lagret/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Tilbake til kampanjen' }),
    ).toHaveAttribute('href', '/rpg');

    await user.click(button('Velg en annen økt'));
    expect(title()).toHaveTextContent('Velg en mikroøkt');
    expect(title()).toHaveFocus();
  });
});

describe('accessibility contract', () => {
  it('uses native controls only, no drag, and a polite live status on every card', async () => {
    const user = renderPage();
    await start(user, variabler);

    for (const card of variabler.cards) {
      expect(document.querySelectorAll('[draggable="true"]')).toHaveLength(0);
      expect(
        document.querySelectorAll('[role="button"]:not(button)'),
      ).toHaveLength(0);
      expect(status()).toHaveAttribute('aria-live', 'polite');
      await solve(user, card);
      await next(user);
    }
  });

  it('names a wrong answer in words, not only by colour or icon', async () => {
    const user = renderPage();
    await reach(user, variabler, variabler.cards[1]!.id);

    await miss(user, variabler.cards[1]!, 0);
    expect(button(/^4/)).toHaveAccessibleName('4 ✗ Ditt svar');
    expect(status()).toHaveTextContent('Ikke helt.');
  });

  it('moves focus to the new card and works from the keyboard', async () => {
    const user = renderPage();

    // Focus starts on the title; Close is one Shift+Tab back, the first
    // session one Tab on.
    expect(title()).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('link', { name: 'Lukk mikroøkten' })).toHaveFocus();
    await user.tab();
    expect(button(/^Følg variablene/)).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(title()).toHaveTextContent('En variabel husker en verdi');
    expect(title()).toHaveFocus();

    // First Tab from the title reaches the card's action.
    await user.tab();
    expect(button('Neste')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(title()).toHaveTextContent('Hva skrives ut?');
    expect(title()).toHaveFocus();

    // Space chooses a wrong option; the retry is then one Enter away.
    await user.tab();
    expect(button(/^4/)).toHaveFocus();
    await user.keyboard(' ');
    expect(status()).toHaveTextContent('Ikke helt.');
    await user.tab();
    await user.tab();
    await user.tab();
    expect(button('Prøv igjen')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(status()).toHaveTextContent('Tips:');
    expect(button('Neste')).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('a programme without a bank', () => {
  it('shows a notice and a way back, and none of another programme’s cards', () => {
    render(
      <MemoryRouter initialEntries={['/rpg/micro']}>
        <MicrolearningPage
          availability={{
            primerId: null,
            repeatSessionIds: new Set(bank.sessions.map((s) => s.id)),
            status: 'ready',
          }}
          bank={undefined}
        />
      </MemoryRouter>,
    );

    expect(title()).toHaveTextContent('Nothing to practise here');
    expect(
      screen.getByRole('link', { name: 'Back to the Campaign' }),
    ).toHaveAttribute('href', '/rpg');
    expect(screen.queryByText(/Følg variablene/)).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

describe('one physical activation, one progression', () => {
  // The test clock is frozen at the instant of a press: the second tap of a
  // double tap arrives with no time between it and the first.
  const freezeAfterAWhile = (clock: Clock) => {
    clock.auto = false;
    clock.t += 1000;
  };

  it('shows the feedback after a double tap on Sjekk instead of skipping it', async () => {
    const clock: Clock = { auto: true, t: 0 };
    const user = renderPage({ clock });
    const order = await reach(user, variabler, 'variabler-trinn');

    await doTaps(user, rightTaps(order));
    freezeAfterAWhile(clock);
    await user.dblClick(button('Sjekk'));

    expect(title()).toHaveTextContent(order.title);
    expect(status()).toHaveTextContent('Riktig.');
    expect(button('Neste')).toBeInTheDocument();

    // A separate, deliberate press a moment later does go on.
    clock.t += 500;
    await user.click(button('Neste'));
    expect(title()).toHaveTextContent(variabler.cards[3]!.title);
  });

  it('does not skip the Learn card that follows when Neste is tapped twice after an answer', async () => {
    const clock: Clock = { auto: true, t: 0 };
    const user = renderPage({ clock });
    const match = await reach(user, typer, 'typer-koble');

    await solve(user, match);
    freezeAfterAWhile(clock);
    await user.click(button('Neste'));
    // The second tap lands on the Learn card's own Neste.
    await user.click(button('Neste'));

    expect(title()).toHaveTextContent('input() gir alltid tekst');
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      'Kort 4 av 6',
    );

    clock.t += 500;
    await user.click(button('Neste'));
    expect(title()).toHaveTextContent('Hva skrives ut?');
  });

  it('does not skip the first Learn card when a session is started with a double tap', async () => {
    const clock: Clock = { auto: true, t: 0 };
    const user = renderPage({ clock });

    freezeAfterAWhile(clock);
    await user.click(button(/^Følg variablene/));
    // The second tap lands where the new card's own Neste is.
    await user.click(button('Neste'));

    expect(title()).toHaveTextContent('En variabel husker en verdi');
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      'Kort 1 av 6',
    );

    clock.t += 500;
    await user.click(button('Neste'));
    expect(title()).toHaveTextContent('Hva skrives ut?');
  });

  it('moves exactly one card when a Learn card’s Neste is tapped twice', async () => {
    const clock: Clock = { auto: true, t: 0 };
    const user = renderPage({ clock });
    await start(user, variabler);

    freezeAfterAWhile(clock);
    await user.dblClick(button('Neste'));

    expect(title()).toHaveTextContent('Hva skrives ut?');
    expect(status()).toHaveTextContent('Trykk på svaret du tror stemmer.');
    expect(button('Neste')).toHaveAttribute('aria-disabled', 'true');
  });

  it('does not leave the finished screen when Fullfør is tapped twice', async () => {
    const clock: Clock = { auto: true, t: 0 };
    const user = renderPage({ clock });
    const last = await reach(user, tenk, 'git-commit-bygg');

    await solve(user, last);
    freezeAfterAWhile(clock);
    await user.click(button('Fullfør'));
    expect(title()).toHaveTextContent('Økten er ferdig');
    // The second tap lands where "Tilbake til kampanjen" now is.
    await user.click(
      screen.getByRole('link', { name: 'Tilbake til kampanjen' }),
    );

    expect(title()).toHaveTextContent('Økten er ferdig');
    expect(screen.getByTestId('location')).toHaveTextContent('/rpg/micro');

    clock.t += 500;
    await user.click(
      screen.getByRole('link', { name: 'Tilbake til kampanjen' }),
    );
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/rpg$/);
  });

  it('does not start a session when the finished screen’s button is tapped twice', async () => {
    const clock: Clock = { auto: true, t: 0 };
    const user = renderPage({ clock });
    const last = await reach(user, tenk, 'git-commit-bygg');

    await solve(user, last);
    await next(user);
    freezeAfterAWhile(clock);
    await user.click(button('Velg en annen økt'));
    await user.click(button(/^Følg variablene/));

    expect(title()).toHaveTextContent('Velg en mikroøkt');

    clock.t += 500;
    await user.click(button(/^Følg variablene/));
    expect(title()).toHaveTextContent('En variabel husker en verdi');
  });

  it('holds when Enter is pressed twice on the keyboard, and works again after a pause', async () => {
    const clock: Clock = { auto: true, t: 0 };
    const user = renderPage({ clock });
    const order = await reach(user, variabler, 'variabler-trinn');

    await doTaps(user, rightTaps(order));
    button('Sjekk').focus();
    freezeAfterAWhile(clock);
    await user.keyboard('{Enter}{Enter}');

    expect(title()).toHaveTextContent(order.title);
    expect(status()).toHaveTextContent('Riktig.');

    clock.t += 500;
    await user.keyboard('{Enter}');
    expect(title()).toHaveTextContent(variabler.cards[3]!.title);
  });

  it('does not use up the activation on a press that cannot act yet', async () => {
    const clock: Clock = { auto: true, t: 0 };
    const user = renderPage({ clock });
    const order = await reach(user, variabler, 'variabler-trinn');

    freezeAfterAWhile(clock);
    // Nothing is placed, so Sjekk is not ready: this press does nothing...
    await user.click(button('Sjekk'));
    expect(status()).toHaveTextContent('Trykk i rekkefølge.');
    // ...and does not count as the activation of the press that follows.
    await doTaps(user, rightTaps(order));
    await user.click(button('Sjekk'));
    expect(status()).toHaveTextContent('Riktig.');
  });

  it('never holds up taps on answers, tokens or pairs', async () => {
    const clock: Clock = { auto: true, t: 0 };
    const user = renderPage({ clock });
    const match = await reach(user, variabler, 'variabler-spor');

    freezeAfterAWhile(clock);
    // Eight taps with no time between them: every one counts.
    await doTaps(user, rightTaps(match));
    expect(status()).toHaveTextContent('Riktig.');
  });
});

describe('the picker: «Forbered deg» and «Repeter»', () => {
  it('names the two groups for what they are for, with the primer first', () => {
    renderPage({ eligible: ['variabler'], primer: 'forb-oppsett' });

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);

    expect(headings).toEqual(['Forbered deg', 'Repeter']);
    expect(button(/^Python, editor og terminal/)).toBeInTheDocument();
    expect(button(/^Følg variablene/)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(
      button(/^Python, editor og terminal/).compareDocumentPosition(
        button(/^Følg variablene/),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('is useful for a fresh learner: a primer, and a plain line that Repeter opens later', () => {
    renderPage({ eligible: [], primer: 'forb-oppsett' });

    expect(title()).toHaveTextContent('Velg en mikroøkt');
    expect(button(/^Python, editor og terminal/)).toBeInTheDocument();
    expect(
      screen.getByText('Repeter åpnes etter hvert som du jobber i kampanjen.'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText(/Ingen mikroøkter/)).toBeNull();
    // The "more open later" line is for a learner who already has some.
    expect(screen.queryByText(/Flere åpnes/)).toBeNull();
  });

  it('shows no «Forbered deg» group when there is no primer in range', () => {
    renderPage();

    expect(screen.queryByRole('heading', { name: 'Forbered deg' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Repeter' })).toBeVisible();
  });

  it('does not offer a primer the availability did not name', () => {
    renderPage({ eligible: ['variabler'], primer: null });

    expect(screen.queryByText(/Python, editor og terminal/)).toBeNull();
    expect(screen.queryByText(/Koden er bare ett steg/)).toBeNull();
  });

  it('runs a primer as a short two-card session that ends like any other', async () => {
    const user = renderPage({ eligible: [], primer: 'forb-print' });

    await user.click(button(/^Ditt første program/));
    expect(title()).toHaveTextContent('print() skriver ut tekst');
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      'Kort 1 av 2',
    );
    await user.click(button('Neste'));
    expect(title()).toHaveTextContent('Hva skrives ut?');
    await user.click(button(/^God dag$/));
    expect(status()).toHaveTextContent('Riktig.');
    await user.click(button('Fullfør'));
    expect(title()).toHaveTextContent('Økten er ferdig');
    expect(screen.getByText(/Ingenting ble lagret/)).toBeInTheDocument();
  });
});

describe('reinforcement eligibility in the picker', () => {
  it('lists only the eligible sessions and says more will open', () => {
    renderPage({ eligible: ['variabler', 'feilmeldinger'] });

    expect(button(/^Følg variablene/)).toBeInTheDocument();
    expect(button(/^Les feilmeldingen/)).toBeInTheDocument();
    expect(screen.queryByText(/Tall eller tekst/)).toBeNull();
    expect(screen.queryByText(/Tenk først/)).toBeNull();
    // A locked session's summary teaches what the learner has not reached.
    expect(screen.queryByText(/hva input\(\) gir deg/)).toBeNull();
    expect(screen.queryByText(/Forventet svar, riktig rekkefølge/)).toBeNull();
    expect(
      screen.getByText(/Flere åpnes når du kommer lenger i kampanjen\./),
    ).toBeInTheDocument();
  });

  it('shows no note when every session is open', () => {
    renderPage();

    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByText(/Flere åpnes/)).toBeNull();
  });

  it('opens an eligible session and cannot reach a locked one', async () => {
    const user = renderPage({ eligible: ['feilmeldinger'] });

    await user.click(button(/^Les feilmeldingen/));
    expect(title()).toHaveTextContent('Les feilmeldingen nedenfra');
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      'Kort 1 av 6',
    );
  });

  it('says so, with a way back, when nothing at all is open', () => {
    renderPage({ eligible: [] });

    expect(title()).toHaveTextContent('Ingen mikroøkter akkurat nå');
    expect(
      screen.getByRole('link', { name: 'Tilbake til kampanjen' }),
    ).toHaveAttribute('href', '/rpg');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.queryByText(/Følg variablene/)).toBeNull();
  });

  it('fails closed while loading and when the progress cannot be read', () => {
    for (const availability of [
      { status: 'loading' },
      { status: 'failed' },
    ] as const) {
      cleanup();
      render(
        <MemoryRouter initialEntries={['/rpg/micro']}>
          <MicrolearningPage availability={availability} bank={bank} />
        </MemoryRouter>,
      );

      expect(screen.queryByText(/Følg variablene/)).toBeNull();
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    }
    expect(title()).toHaveTextContent('Mikroøkter er ikke tilgjengelige');
  });
});
