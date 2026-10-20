import { useState } from 'react';

import type { MicroAssembleCard, MicroToken } from '@/lib/domain';

import { isOpen, isSameSequence, toggleInSequence } from '../model';
import { PracticeFrame } from './PracticeFrame';
import { usePractice } from './usePractice';

/**
 * Build one short line by tapping parts. Tapped parts move into the line (in
 * tap order); tapping a part in the line sends it back. Nothing is typed and
 * nothing needs dragging, which keeps the card usable on a phone. The line is
 * compared by what the parts say, so two identical parts are interchangeable.
 * A retry starts from an empty line; a second miss builds the right one.
 */
export function AssembleCard({
  card,
  nextLabel,
  onNext,
}: {
  card: MicroAssembleCard;
  nextLabel: string;
  onNext: () => void;
}) {
  const practice = usePractice();
  const [placed, setPlaced] = useState<readonly string[]>([]);
  const open = isOpen(practice.state);
  const byId = new Map<string, MicroToken>(
    card.tokens.map((token) => [token.id, token]),
  );
  const textOf = (id: string) => byId.get(id)?.text.trim() ?? '';
  const shown =
    practice.state.phase === 'revealed' ? card.correctOrder : placed;

  function retry() {
    setPlaced([]);
    practice.retry();
  }

  function tokenButton(token: MicroToken, where: 'line' | 'pool') {
    return (
      <button
        aria-disabled={open ? undefined : true}
        aria-label={`${token.name ?? token.text.trim()}${
          where === 'line' ? ', i linjen, trykk for å fjerne' : ''
        }`}
        className="rpg-button rpg-button--secondary micro-tap micro-token"
        key={token.id}
        onClick={() => {
          if (open) {
            setPlaced((current) => toggleInSequence(current, token.id));
          }
        }}
        type="button"
      >
        {token.text.trim()}
      </button>
    );
  }

  return (
    <PracticeFrame
      card={card}
      check={{
        onCheck: () =>
          practice.submit(
            isSameSequence(placed.map(textOf), card.correctOrder.map(textOf)),
          ),
        ready: placed.length > 0,
      }}
      idle="Trykk på delene i riktig rekkefølge, så Sjekk."
      nextLabel={nextLabel}
      onNext={onNext}
      practice={{ ...practice, retry }}
    >
      <div aria-label="Linjen din" className="micro-built" role="group">
        {shown.length === 0 ? (
          <small>Linjen din er tom.</small>
        ) : (
          shown.map((id) => {
            const token = byId.get(id);

            return token === undefined ? null : tokenButton(token, 'line');
          })
        )}
      </div>
      <div aria-label="Deler" className="micro-pool" role="group">
        {card.tokens.map((token) =>
          shown.includes(token.id) ? (
            // A used part keeps its place, invisible and inert, so the pool
            // never reflows and the line above it never moves under a tap.
            <button
              aria-hidden="true"
              className="rpg-button rpg-button--secondary micro-tap micro-token"
              inert
              key={token.id}
              tabIndex={-1}
              type="button"
            >
              {token.text.trim()}
            </button>
          ) : (
            tokenButton(token, 'pool')
          ),
        )}
      </div>
    </PracticeFrame>
  );
}
