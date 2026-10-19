import { useState } from 'react';

import type { MicroMatchCard } from '@/lib/domain';

import { isOpen, matchOutcome } from '../model';
import { PracticeFrame } from './PracticeFrame';
import { usePractice } from './usePractice';

/**
 * Tap an item on the left, then the one it belongs with on the right. A found
 * pair gets the same number on both sides (and a check), so the state is
 * readable without colour. A wrong pair is the card's miss: both items are
 * flagged until "Prøv igjen" (found pairs stay found), and a second miss
 * numbers every pair.
 */
export function MatchCard({
  card,
  nextLabel,
  onNext,
}: {
  card: MicroMatchCard;
  nextLabel: string;
  onNext: () => void;
}) {
  const practice = usePractice();
  const [found, setFound] = useState<readonly string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [miss, setMiss] = useState<{ left: string; right: string } | null>(
    null,
  );
  const open = isOpen(practice.state);
  const shown =
    practice.state.phase === 'revealed'
      ? card.pairs.map((pair) => pair.id)
      : found;

  function tapLeft(id: string) {
    if (open && !found.includes(id)) {
      setSelectedId((current) => (current === id ? null : id));
    }
  }

  function tapRight(id: string) {
    if (!open || found.includes(id) || selectedId === null) {
      return;
    }

    if (matchOutcome(selectedId, id) === 'match') {
      const next = [...found, selectedId];

      setFound(next);
      if (next.length === card.pairs.length) {
        practice.submit(true);
      }
    } else {
      setMiss({ left: selectedId, right: id });
      practice.submit(false);
    }
    setSelectedId(null);
  }

  function retry() {
    setMiss(null);
    practice.retry();
  }

  function pairState(id: string, side: 'left' | 'right') {
    const index = shown.indexOf(id);
    // Only the first miss is flagged: a reveal numbers every pair cleanly.
    const missed =
      practice.state.phase === 'wrong' && miss !== null && miss[side] === id;

    return {
      // The badge's room is always kept, so finding a pair never rewraps the
      // buttons or moves the rows below it.
      badge:
        index === -1 ? (
          <small aria-hidden="true" inert>
            0✓
          </small>
        ) : (
          <small aria-hidden="true">{index + 1}✓</small>
        ),
      disabled: !open || index !== -1,
      result: missed ? 'incorrect' : undefined,
      spoken:
        index !== -1 ? (
          <span className="sr-only">, par nummer {index + 1}</span>
        ) : missed ? (
          <span className="sr-only">, ikke et par</span>
        ) : null,
    };
  }

  return (
    <PracticeFrame
      card={card}
      idle={`Par ${found.length} av ${card.pairs.length}. Trykk til venstre, så til høyre.`}
      nextLabel={nextLabel}
      onNext={onNext}
      practice={{ ...practice, retry }}
    >
      <div
        className="micro-match"
        data-left-presentation={card.leftPresentation ?? 'code'}
      >
        <div
          aria-label={card.leftLabel}
          className="micro-match__column"
          role="group"
        >
          {card.pairs.map((pair) => {
            const state = pairState(pair.id, 'left');

            return (
              <button
                aria-disabled={state.disabled ? true : undefined}
                aria-pressed={selectedId === pair.id}
                className="rpg-button rpg-button--secondary micro-tap"
                data-result={state.result}
                key={pair.id}
                onClick={() => tapLeft(pair.id)}
                type="button"
              >
                {card.leftPresentation === 'text' ? (
                  <span>{pair.left}</span>
                ) : (
                  <code>{pair.left}</code>
                )}
                {state.badge}
                {state.spoken}
              </button>
            );
          })}
        </div>
        <div
          aria-label={card.rightLabel}
          className="micro-match__column"
          role="group"
        >
          {card.rightOrder.map((id) => {
            const pair = card.pairs.find((candidate) => candidate.id === id);
            const state = pairState(id, 'right');

            return pair === undefined ? null : (
              <button
                aria-disabled={state.disabled ? true : undefined}
                className="rpg-button rpg-button--secondary micro-tap"
                data-result={state.result}
                key={id}
                onClick={() => tapRight(id)}
                type="button"
              >
                <span>{pair.right}</span>
                {state.badge}
                {state.spoken}
              </button>
            );
          })}
        </div>
      </div>
    </PracticeFrame>
  );
}
