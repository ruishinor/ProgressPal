import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ActionGuardContext,
  createActionGuard,
} from '@/features/microlearning/components/actionGuard';
import { SessionRunner } from '@/features/microlearning/components/SessionRunner';
import { MicroTrackPage } from '@/features/microlearning/routes/MicroTrackPage';
import { tenkSomEnUtviklerTrack as track } from '@/programmes/programvareutvikling/microlearning/tenkSomEnUtvikler';
import type { MicroMatchCard, MicroOrderCard, MicroTrack } from '@/lib/domain';

afterEach(() => vi.restoreAllMocks());

const match = track.sessions[2]!.cards[2] as MicroMatchCard;
const order = track.sessions[4]!.cards[2] as MicroOrderCard;
function show(id = match.id, scoped = true) {
  const session = track.sessions.find((s) => s.cards.some((c) => c.id === id))!;
  const advance = vi.fn(),
    exit = vi.fn();
  let clock = 0;
  const view = render(
    <MemoryRouter>
      <ActionGuardContext.Provider
        value={createActionGuard(() => (clock += 1000))}
      >
        <SessionRunner
          session={session}
          position={{
            index: session.cards.findIndex((c) => c.id === id),
            onAdvance: advance,
          }}
          onExit={exit}
          presentation={scoped ? 'utviklerblikk' : undefined}
        />
      </ActionGuardContext.Provider>
    </MemoryRouter>,
  );
  return { user: userEvent.setup(), advance, exit, unmount: view.unmount };
}
const button = (name: string) => screen.getByRole('button', { name });
const item = (side: 'left' | 'right', index: number) =>
  within(
    screen.getByRole('group', {
      name: side === 'left' ? match.leftLabel : match.rightLabel,
    }),
  ).getByRole('button', {
    name: (name) => name.startsWith(match.pairs[index]![side]),
  });
const orderButton = (id: string) =>
  screen.getByRole('button', {
    name: (name) =>
      name.startsWith(order.items.find((item) => item.id === id)!.label),
  });
const rows = () =>
  within(
    screen.getByRole('list', { name: 'Trinn med valgte plasser' }),
  ).getAllByRole('listitem');
const row = (id: string) =>
  rows()[order.items.findIndex((item) => item.id === id)]!;
async function fillOrder(
  user: ReturnType<typeof userEvent.setup>,
  ids: readonly string[],
  keyboard = false,
) {
  for (const id of ids) {
    if (keyboard) {
      orderButton(id).focus();
      await user.keyboard('{Enter}');
    } else await user.click(orderButton(id));
  }
  if (keyboard) {
    button('Sjekk').focus();
    await user.keyboard('{Enter}');
  } else await user.click(button('Sjekk'));
}
function mobile() {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: () => true,
  }));
}

describe('Utviklerblikk boundaries and navigation', () => {
  it('leaves the default Match renderer and one-sided behavior intact', async () => {
    const { user } = show(match.id, false);
    expect(screen.getByRole('main')).not.toHaveClass('micro--utviklerblikk');
    expect(screen.getByRole('main')).not.toHaveAttribute('lang');
    expect(
      screen.queryByRole('button', { name: 'Tilbake til aktiviteter' }),
    ).not.toBeInTheDocument();
    await user.click(item('right', 0));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Par 0 av 3. Trykk til venstre',
    );
    await user.click(item('left', 0));
    await user.click(item('right', 0));
    expect(item('left', 0)).toHaveAttribute('aria-disabled', 'true');
  });
  it('does not opt an unrelated track into the layout by title or directory', () => {
    render(
      <MemoryRouter>
        <MicroTrackPage
          onStep={() => {}}
          step={null}
          track={{ ...track, id: 'another-track' }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('main')).not.toHaveClass('micro--utviklerblikk');
  });
  for (const id of [
    track.sessions[0]!.cards[0]!.id,
    track.sessions[0]!.cards[1]!.id,
    match.id,
    order.id,
  ])
    it(
      'puts activities before the primary action in DOM for ' + id,
      async () => {
        const { user, exit, advance } = show(id);
        const footer = document.querySelector('.micro-card__foot')!;
        const actions = within(footer as HTMLElement).getAllByRole('button');
        expect(actions[0]).toBe(button('Tilbake til aktiviteter'));
        expect(actions[1]).not.toHaveTextContent('Tilbake');
        await user.click(actions[0]!);
        expect(exit).toHaveBeenCalledOnce();
        expect(advance).not.toHaveBeenCalled();
        expect(screen.getByRole('link', { name: /Lukk/ })).toHaveAttribute(
          'href',
          '/rpg',
        );
      },
    );
  it('keeps done destinations distinct and in reading order', () => {
    render(
      <MemoryRouter>
        <SessionRunner
          session={track.sessions[0]!}
          position={{
            index: track.sessions[0]!.cards.length,
            onAdvance: () => {},
          }}
          onExit={() => {}}
          presentation="utviklerblikk"
          pickAnotherLabel="Velg en annen aktivitet"
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Husk dette',
    );
    const actions = Array.from(
      document.querySelector('.micro-card__foot')!.querySelectorAll('button,a'),
    );
    expect(actions[0]).toHaveTextContent('Velg en annen aktivitet');
    expect(actions[1]).toHaveTextContent('Til startsiden');
  });
});

describe('Utviklerblikk desktop matching semantics', () => {
  it('can start on the right and reaches a counterpart by keyboard', async () => {
    const { user } = show();
    item('right', 0).focus();
    await user.keyboard('{Enter}');
    expect(item('left', 0)).toHaveFocus();
    expect(item('right', 0)).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard(' ');
    expect(item('left', 0)).toBeDisabled();
    expect(item('right', 0)).toHaveTextContent('Par 1');
  });
  it('preserves found pairs through a wrong answer and retry', async () => {
    const { user } = show();
    await user.click(item('left', 1));
    await user.click(item('right', 1));
    await user.click(item('left', 0));
    await user.click(item('right', 2));
    expect(screen.getByRole('status')).toHaveTextContent('er ikke et par');
    expect(screen.getByRole('status')).not.toHaveFocus();
    await user.click(button('Prøv igjen'));
    expect(item('left', 1)).toBeDisabled();
    expect(item('left', 0)).toHaveFocus();
  });
  it('distinguishes revealed pairs from learner-solved ones', async () => {
    const { user } = show();
    await user.click(item('left', 1));
    await user.click(item('right', 1));
    for (let n = 0; n < 2; n++) {
      await user.click(item('left', 0));
      await user.click(item('right', 2));
      if (n === 0) await user.click(button('Prøv igjen'));
    }
    const result = screen.getByRole('region', { name: 'Fasit for koblingene' });
    expect(within(result).getAllByText(/Vist svar/)).toHaveLength(2);
    expect(result).toHaveTextContent('Par 2: Du koblet');
    expect(screen.getByRole('status')).toHaveAttribute(
      'data-state',
      'revealed',
    );
    expect(screen.getByRole('status')).not.toHaveTextContent('Riktig.');
  });
  it('announces first-time success, then tabs to activities and Next', async () => {
    const { user } = show();
    for (let i = 0; i < match.pairs.length; i++) {
      item('left', i).focus();
      await user.keyboard('{Enter}');
      item('right', i).focus();
      await user.keyboard('{Enter}');
    }
    expect(screen.getByRole('status')).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Riktig.');
    await user.tab();
    expect(button('Tilbake til aktiviteter')).toHaveFocus();
    await user.tab();
    expect(button('Neste')).toHaveFocus();
    await user.tab({ shift: true });
    expect(button('Tilbake til aktiviteter')).toHaveFocus();
  });
});

describe('Utviklerblikk stable mobile matching', () => {
  it('shows immediate sources and keeps their DOM identity on selection and cancellation', async () => {
    mobile();
    const { user } = show();
    const source = item('left', 1),
      first = item('left', 0),
      last = item('left', 2);
    expect(document.querySelector('details')).not.toBeInTheDocument();
    expect(button(match.leftLabel)).toHaveAttribute('aria-pressed', 'true');
    expect(button(match.rightLabel)).toHaveAttribute('aria-pressed', 'false');
    await user.click(source);
    expect(item('left', 1)).toBe(source);
    expect(item('left', 0)).toBe(first);
    expect(item('left', 2)).toBe(last);
    expect(source).toHaveAttribute('aria-pressed', 'true');
    const relation = source.closest('li')!;
    expect(
      within(relation).getByRole('group', { name: match.rightLabel }),
    ).toContainElement(item('right', 0));
    expect(relation).not.toHaveTextContent('Par 2');
    await user.click(source);
    expect(source).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.queryByRole('group', { name: match.rightLabel }),
    ).not.toBeInTheDocument();
  });
  for (const side of ['left', 'right'] as const)
    it(
      'supports ' + side + ' start, changing source, retention and retry',
      async () => {
        mobile();
        const { user } = show();
        if (side === 'right') await user.click(button(match.rightLabel));
        const opposite = side === 'left' ? 'right' : 'left';
        await user.click(item(side, 0));
        await user.click(item(side, 1));
        expect(item(side, 1)).toHaveAttribute('aria-pressed', 'true');
        expect(item(side, 0)).toHaveAttribute('aria-pressed', 'false');
        await user.click(item(opposite, 1));
        const found = document.querySelector('.utviklerblikk-found')!;
        expect(found).toHaveTextContent(match.pairs[1]!.left);
        expect(found).toHaveTextContent(match.pairs[1]!.right);
        expect(
          screen.queryByRole('button', { name: match.pairs[1]![side] }),
        ).not.toBeInTheDocument();
        await user.click(item(side, 0));
        await user.click(item(opposite, 2));
        expect(screen.getByRole('status')).toHaveAttribute(
          'data-state',
          'incorrect',
        );
        expect(screen.getByRole('status')).not.toHaveFocus();
        await user.click(button('Prøv igjen'));
        expect(item(side, side === 'left' ? 0 : 2)).toHaveFocus();
        expect(found).toBeInTheDocument();
        await user.click(item(side, 0));
        await user.click(item(opposite, 2));
        expect(screen.getByRole('status')).toHaveAttribute(
          'data-state',
          'revealed',
        );
        expect(
          screen.getByRole('region', { name: 'Fasit for koblingene' }),
        ).toHaveTextContent('Par 2: Du koblet');
      },
    );
  it('switches starting sides without discarding solved pairs or leaving a stale active selection', async () => {
    mobile();
    const { user } = show();
    await user.click(item('left', 0));
    await user.click(item('right', 0));
    await user.click(item('left', 1));
    await user.click(button(match.rightLabel));
    expect(button(match.rightLabel)).toHaveAttribute('aria-pressed', 'true');
    expect(document.querySelector('.utviklerblikk-found')).toHaveTextContent(
      match.pairs[0]!.left,
    );
    expect(item('right', 1)).toHaveAttribute('aria-pressed', 'false');
    await user.click(item('right', 1));
    await user.click(item('left', 1));
    await user.click(item('right', 2));
    await user.click(item('left', 2));
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'correct');
  });
  it('uses keyboard focus after a pointer miss without inheriting pointer modality', async () => {
    mobile();
    const { user } = show();
    await user.click(item('left', 0));
    await user.click(item('right', 1));
    button('Prøv igjen').focus();
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    try {
      await user.keyboard('{Enter}');
      expect(item('left', 0)).toHaveFocus();
      expect(focus).toHaveBeenLastCalledWith({ preventScroll: false });
    } finally {
      focus.mockRestore();
    }
  });
});

describe('Utviklerblikk one-list exact ordering', () => {
  it('keeps only four operative rows in fixed visual order while assigning and undoing positions', async () => {
    const { user } = show(order.id);
    const original = rows();
    expect(original).toHaveLength(4);
    expect(document.querySelector('.micro-order')).not.toBeInTheDocument();
    await user.click(orderButton('bekrefte'));
    await user.click(orderButton('motta'));
    expect(row('bekrefte')).toHaveAttribute('data-position', '1');
    expect(row('motta')).toHaveAttribute('data-position', '2');
    rows().forEach((value, i) => expect(value).toBe(original[i]));
    await user.click(orderButton('bekrefte'));
    expect(row('bekrefte')).not.toHaveAttribute('data-position');
    expect(row('motta')).toHaveAttribute('data-position', '2');
    await user.click(orderButton('lagre'));
    expect(row('lagre')).toHaveAttribute('data-position', '1');
  });
  it('shows first-time success on the same four rows with the authored explanation and Next', async () => {
    const { user, advance } = show(order.id);
    await fillOrder(user, order.correctOrder);
    expect(rows()).toHaveLength(4);
    rows().forEach((value) =>
      expect(value).toHaveAttribute('data-result', 'correct'),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Riktig.');
    expect(screen.getByRole('status')).toHaveTextContent(order.explanation);
    await user.click(button('Neste'));
    expect(advance).toHaveBeenCalledOnce();
  });
  it('retains slot 4 and repairs only the wrong positions', async () => {
    const { user } = show(order.id);
    await fillOrder(user, ['sjekke', 'lagre', 'motta', 'bekrefte']);
    expect(row('bekrefte')).toHaveAttribute('data-result', 'correct');
    await user.click(button('Prøv igjen'));
    expect(row('bekrefte')).toHaveAttribute('data-position', '4');
    expect(orderButton('bekrefte')).toBeDisabled();
    expect(orderButton('motta')).not.toHaveAttribute('data-result', 'correct');
    await fillOrder(user, ['motta', 'sjekke', 'lagre']);
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'correct');
  });
  it('preserves a middle lock and pending positions when another pending choice is undone', async () => {
    const { user } = show(order.id);
    await fillOrder(user, ['lagre', 'sjekke', 'bekrefte', 'motta']);
    await user.click(button('Prøv igjen'));
    await user.click(orderButton('motta'));
    await user.click(orderButton('lagre'));
    await user.click(orderButton('motta'));
    expect(row('sjekke')).toHaveAttribute('data-position', '2');
    expect(orderButton('sjekke')).toBeDisabled();
    expect(row('lagre')).toHaveAttribute('data-position', '3');
    await fillOrder(user, ['motta', 'bekrefte']);
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'correct');
  });
  it('allows repeated wrong checks, optional reveal, and no false success', async () => {
    const { user } = show(order.id);
    for (let n = 0; n < 3; n++) {
      await fillOrder(user, [...order.correctOrder].reverse());
      expect(screen.getByRole('status')).toHaveAttribute(
        'data-state',
        'incorrect',
      );
      expect(screen.queryByText('Løsningen er vist.')).not.toBeInTheDocument();
      if (n < 2) await user.click(button('Prøv igjen'));
    }
    await user.click(button('Vis løsning'));
    expect(screen.getByRole('status')).toHaveAttribute(
      'data-state',
      'revealed',
    );
    expect(screen.getByRole('status')).not.toHaveTextContent('Riktig.');
    expect(screen.getAllByText('Vist løsning')).toHaveLength(4);
    expect(rows()).toHaveLength(4);
  });
  it('resets all local locks without advancing or leaving stale solution controls', async () => {
    const { user, advance } = show(order.id);
    await fillOrder(user, ['sjekke', 'motta', 'lagre', 'bekrefte']);
    await user.click(button('Start på nytt'));
    rows().forEach((value) => {
      expect(value).not.toHaveAttribute('data-position');
      expect(value).not.toHaveAttribute('data-result');
    });
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'idle');
    expect(
      screen.queryByRole('button', { name: 'Vis løsning' }),
    ).not.toBeInTheDocument();
    expect(advance).not.toHaveBeenCalled();
  });
  it('supports Space, Shift+Tab, stable undo and keyboard retry focus', async () => {
    const { user } = show(order.id);
    orderButton('lagre').focus();
    await user.keyboard(' ');
    expect(orderButton('motta')).toHaveFocus();
    await user.tab({ shift: true });
    expect(orderButton('lagre')).toHaveFocus();
    await user.keyboard(' ');
    expect(orderButton('lagre')).toHaveFocus();
    expect(row('lagre')).not.toHaveAttribute('data-position');
    await fillOrder(user, [...order.correctOrder].reverse(), true);
    expect(screen.getByRole('status')).toHaveFocus();
    await user.tab();
    expect(button('Tilbake til aktiviteter')).toHaveFocus();
    await user.tab();
    expect(button('Prøv igjen')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(orderButton('lagre')).toHaveFocus();
    await fillOrder(user, order.correctOrder, true);
    expect(screen.getByRole('status')).toHaveFocus();
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'correct');
  });
  it('accurately locks and recovers every one of the 24 permutations without moving the four source rows', async () => {
    function permutations(ids: readonly string[]): string[][] {
      return ids.length
        ? ids.flatMap((id, i) =>
            permutations(ids.filter((_, j) => j !== i)).map((rest) => [
              id,
              ...rest,
            ]),
          )
        : [[]];
    }
    for (const ids of permutations(order.correctOrder)) {
      const { user, unmount } = show(order.id);
      const sourceRows = rows();
      await fillOrder(user, ids);
      ids.forEach((id, i) => {
        expect(row(id)).toHaveAttribute('data-position', String(i + 1));
        expect(row(id)).toHaveAttribute(
          'data-result',
          id === order.correctOrder[i] ? 'correct' : 'incorrect',
        );
      });
      if (ids.some((id, i) => id !== order.correctOrder[i])) {
        await user.click(button('Prøv igjen'));
        ids.forEach((id, i) => {
          if (id === order.correctOrder[i]) {
            expect(row(id)).toHaveAttribute('data-position', String(i + 1));
            expect(orderButton(id)).toBeDisabled();
          } else expect(row(id)).not.toHaveAttribute('data-position');
        });
        await fillOrder(
          user,
          order.correctOrder.filter((id, i) => ids[i] !== id),
        );
        expect(screen.getByRole('status')).toHaveAttribute(
          'data-state',
          'correct',
        );
      }
      rows().forEach((value, i) => expect(value).toBe(sourceRows[i]));
      unmount();
    }
  }, 30000);
});

describe('preserved default and rerender contracts', () => {
  it('keeps the default Order automatic two-miss reveal unchanged', async () => {
    const { user } = show(order.id, false);
    expect(
      document.querySelector('.utviklerblikk-slots'),
    ).not.toBeInTheDocument();
    await fillOrder(user, [...order.correctOrder].reverse());
    await user.click(button('Prøv igjen'));
    await fillOrder(user, [...order.correctOrder].reverse());
    expect(screen.getByRole('status')).toHaveAttribute(
      'data-state',
      'revealed',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Her er svaret.');
  });
  it('ignores repeated wrong-state matching clicks and can still succeed after retry', async () => {
    const { user } = show();
    await user.click(item('left', 0));
    await user.click(item('right', 1));
    await user.click(item('right', 1));
    await user.click(item('left', 0));
    expect(screen.getByRole('status')).toHaveAttribute(
      'data-state',
      'incorrect',
    );
    await user.click(button('Prøv igjen'));
    for (let i = 0; i < match.pairs.length; i++) {
      await user.click(item('right', i));
      await user.click(item('left', i));
    }
    expect(screen.getByRole('status')).toHaveTextContent('Riktig nå.');
  });
  it('does not steal focused retry when a parent recreates the opt-in context object', async () => {
    const session = track.sessions[2]!;
    const view = () => (
      <MemoryRouter>
        <SessionRunner
          session={session}
          position={{ index: 2, onAdvance: () => {} }}
          onExit={() => {}}
          presentation="utviklerblikk"
        />
      </MemoryRouter>
    );
    const { rerender } = render(view());
    const user = userEvent.setup();
    item('left', 0).focus();
    await user.keyboard('{Enter}');
    item('right', 1).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('status')).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(button('Prøv igjen')).toHaveFocus();
    rerender(view());
    expect(button('Prøv igjen')).toHaveFocus();
  });
});

describe('the existing picker with categories', () => {
  it('filters the flat registry in authored order for each selected category', async () => {
    const sessions = track.sessions;
    const categorized: MicroTrack = {
      ...track,
      categories: [
        {
          id: 'one',
          title: 'One',
          summary: 'First',
          sessionIds: [sessions[2]!.id, sessions[0]!.id],
        },
        {
          id: 'two',
          title: 'Two',
          summary: 'Second',
          sessionIds: [sessions[1]!.id],
        },
      ],
    };
    const onStep = vi.fn();
    const view = render(
      <MemoryRouter>
        <MicroTrackPage
          track={categorized}
          step={{ categoryId: 'one' }}
          onStep={onStep}
        />
      </MemoryRouter>,
    );
    const choices = within(
      screen.getByRole('list', { name: 'Velg en aktivitet' }),
    ).getAllByRole('button');
    expect(choices.map((button) => button.textContent)).toEqual([
      '1. ' + sessions[0]!.title,
      '2. ' + sessions[2]!.title,
    ]);
    await userEvent.setup().click(choices[1]!);
    expect(onStep).toHaveBeenCalledWith({
      sessionId: sessions[2]!.id,
      index: 0,
    });
    view.rerender(
      <MemoryRouter>
        <MicroTrackPage
          track={categorized}
          step={{ categoryId: 'two' }}
          onStep={onStep}
        />
      </MemoryRouter>,
    );
    expect(
      within(
        screen.getByRole('list', { name: 'Velg en aktivitet' }),
      ).getAllByRole('button'),
    ).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: '1. ' + sessions[1]!.title }),
    ).toBeInTheDocument();
  });

  it('keeps an uncategorized track on its existing flat chooser', () => {
    render(
      <MemoryRouter>
        <MicroTrackPage
          track={{ ...track, categories: undefined }}
          step={null}
          onStep={() => {}}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('list', { name: 'Velg en aktivitet' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(
      screen.queryByRole('button', { name: 'Tilbake til temaer' }),
    ).toBeNull();
  });
});
