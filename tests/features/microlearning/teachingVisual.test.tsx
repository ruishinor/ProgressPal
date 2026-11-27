import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LearnCard } from '@/features/microlearning/components/LearnCard';
import type { MicroLearnCard } from '@/lib/domain';
import { tenkSomEnUtviklerTrack } from '@/programmes/programvareutvikling/microlearning/tenkSomEnUtvikler';

const cards = tenkSomEnUtviklerTrack.sessions.flatMap(
  (session) => session.cards,
);
const illustrated = cards.filter(
  (card): card is MicroLearnCard =>
    card.kind === 'learn' && card.visual !== undefined,
);

describe('Utviklerblikk teaching examples', () => {
  it('gives every activity a visual example or an existing board', () => {
    for (const session of tenkSomEnUtviklerTrack.sessions) {
      const hasVisual = session.cards.some(
        (card) => card.kind === 'learn' && (card.visual || card.board),
      );
      expect(hasVisual, session.id).toBe(true);
    }
  });

  it.each(illustrated)('renders the example on $id', (card) => {
    render(<LearnCard card={card} nextLabel="Neste" onNext={vi.fn()} />);
    const figure = screen.getByRole('figure', { name: card.visual!.title });
    expect(figure).toBeVisible();
    expect(screen.getByRole('button', { name: 'Neste' })).toBeEnabled();
  });

  it('switches SQL results without advancing', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    const id = 'tsu-sql-04-uten-treff';
    const card = illustrated.find((entry) => entry.id === id)!;
    render(<LearnCard card={card} nextLabel="Neste" onNext={onNext} />);
    const figure = screen.getByRole('figure', { name: card.visual!.title });
    expect(within(figure).queryByText('NULL')).not.toBeInTheDocument();
    const choice = within(figure).getByRole('button', { name: 'LEFT JOIN' });
    choice.focus();
    await user.keyboard('{Enter}');
    expect(choice).toHaveAttribute('aria-pressed', 'true');
    expect(within(figure).getByText('NULL')).toBeVisible();
    expect(onNext).not.toHaveBeenCalled();
  });
});
