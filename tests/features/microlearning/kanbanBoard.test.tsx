import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LearnCard } from '@/features/microlearning/components/LearnCard';
import { SelectCard } from '@/features/microlearning/components/SelectCard';
import { kanbanSessions } from '@/programmes/programvareutvikling/microlearning/utviklerblikk/kanban';
import {
  findMicrolearningBankIssues,
  type MicroKanbanBoard,
} from '@/lib/domain';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';

const session = kanbanSessions[1]!;
const [concept, situation, decision, transfer] = session.cards;
if (
  situation?.kind !== 'learn' ||
  decision?.kind !== 'select' ||
  transfer?.kind !== 'select'
) {
  throw new Error('K02 must keep its existing learn/select sequence');
}
const before = decision.board!,
  after = transfer.board!;
const active = (board: MicroKanbanBoard) =>
  board.items.filter((item) => item.status === 'active');

describe('KAN-01: the assembled festival board and its decisions', () => {
  it('keeps activity/card identities and couples both answers to visible states', () => {
    expect(session.id).toBe('tsu-kanban-k02');
    expect(session.cards.map((card) => card.id)).toEqual([
      'tsu-kanban-k02-forklart',
      'tsu-kanban-k02-situasjon',
      'tsu-kanban-k02-sporsmal',
      'tsu-kanban-k02-ny',
    ]);
    expect(concept?.kind).toBe('learn');
    expect(situation.board).toBe(before);
    expect(active(before)).toHaveLength(before.wipLimit);
    expect(
      before.items.filter((item) => item.blocked).map((item) => item.id),
    ).toEqual(['innlogging']);
    expect(
      active(before).find((item) => item.id === 'innlogging')?.blocked,
    ).toBeTruthy();
    expect(decision.correctId).toBe('hjelpe');
    expect(transfer.correctId).toBe('plass');
    expect(after.wipLimit - active(after).length).toBe(2);
    expect(
      after.items
        .filter((item) => item.status === 'ready')
        .map((item) => item.id),
    ).toEqual(['kart', 'forside']);
    expect(after.items.map((item) => item.id)).toEqual(
      before.items.map((item) => item.id),
    );
    const changed = after.items.filter(
      (item, index) => item.status !== before.items[index]!.status,
    );
    expect(changed.map((item) => [item.id, item.status])).toEqual([
      ['billett', 'done'],
      ['varsler', 'done'],
    ]);
    expect(after.items.find((item) => item.id === 'innlogging')).toEqual(
      before.items.find((item) => item.id === 'innlogging'),
    );
  });

  it('renders the introductory state as named lists, with blocking explained in text', () => {
    render(<LearnCard card={situation} nextLabel="Neste" onNext={vi.fn()} />);
    const board = screen.getByRole('figure', { name: before.title });
    expect(
      within(board).getByRole('list', { name: 'Å gjøre' }).children,
    ).toHaveLength(2);
    expect(
      within(board).getByRole('list', { name: 'Pågår' }).children,
    ).toHaveLength(4);
    expect(within(board).getByText('Blokkert:')).toBeVisible();
    expect(within(board).getByText(/WIP betyr/)).toHaveTextContent(
      'Blokkerte oppgaver teller med',
    );
    expect(within(board).getByText(/Avtalen:/)).toHaveTextContent(
      'koden er testet og lagt ut',
    );
    expect(within(board).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it.each([decision, transfer])(
    '$id keeps its board visible through a keyboard miss, retry and correct answer',
    async (card) => {
      const user = userEvent.setup();
      render(<SelectCard card={card} nextLabel="Neste" onNext={vi.fn()} />);
      const board = screen.getByRole('figure', { name: card.board!.title });
      const wrong = card.options.find(
        (option) => option.id !== card.correctId,
      )!;
      screen.getByRole('button', { name: wrong.label }).focus();
      await user.keyboard('{Enter}');
      expect(screen.getByRole('status')).toHaveTextContent(wrong.feedback!);
      expect(board).toBeVisible();
      screen
        .getByRole('button', {
          name: card.options.find((option) => option.id === card.correctId)!
            .label,
        })
        .focus();
      await user.keyboard('{Enter}');
      expect(screen.getByRole('status')).toHaveTextContent(card.explanation);
      expect(board).toBeVisible();
      expect(screen.getByRole('button', { name: 'Neste' })).not.toHaveAttribute(
        'aria-disabled',
        'true',
      );
    },
  );

  it.each([
    { ...before, wipLimit: 0 },
    { ...before, items: [...before.items, before.items[0]!] },
    {
      ...before,
      items: before.items.map((item) =>
        item.blocked ? { ...item, status: 'ready' as const } : item,
      ),
    },
  ])(
    'rejects an invalid illustrated board in the real assembled bank',
    (board) => {
      const bank = programvareutviklingDefinition.content.microlearning!;
      const tracks = bank.tracks!.map((track) => ({
        ...track,
        sessions: track.sessions.map((entry) =>
          entry.id !== session.id
            ? entry
            : {
                ...entry,
                cards: entry.cards.map((card) =>
                  card.id === decision.id ? { ...decision, board } : card,
                ),
              },
        ),
      }));
      expect(
        findMicrolearningBankIssues(
          { ...bank, tracks },
          new Set(['s1-m01', 's1-m02']),
        ),
      ).toContain(`card "${decision.id}" has an invalid track board`);
    },
  );
});
