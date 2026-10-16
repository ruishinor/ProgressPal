import { useState } from 'react';

import type { MicroSelectCard } from '@/lib/domain';

import { isOpen } from '../model';
import { PracticeFrame } from './PracticeFrame';
import { usePractice } from './usePractice';

/**
 * Large options, one answer, immediate feedback. A wrong option stays marked
 * and cannot be tapped again, so the retry is a real second look rather than a
 * repeat of the same tap; after a second miss the right option is shown.
 */
export function SelectCard({
  card,
  nextLabel,
  onNext,
}: {
  card: MicroSelectCard;
  nextLabel: string;
  onNext: () => void;
}) {
  const practice = usePractice();
  const { phase } = practice.state;
  const [lastId, setLastId] = useState<string | null>(null);
  const [missedIds, setMissedIds] = useState<readonly string[]>([]);

  function choose(id: string) {
    if (!isOpen(practice.state) || missedIds.includes(id)) {
      return;
    }
    const correct = id === card.correctId;

    setLastId(id);
    if (!correct) {
      setMissedIds((current) => [...current, id]);
    }
    practice.submit(correct);
  }

  return (
    <PracticeFrame
      card={card}
      idle="Trykk på svaret du tror stemmer."
      nextLabel={nextLabel}
      onNext={onNext}
      practice={practice}
      prompt={
        card.code === undefined ? undefined : (
          <figure className="micro-code">
            <pre>
              <code>{card.code}</code>
            </pre>
          </figure>
        )
      }
    >
      <div aria-label="Svaralternativer" className="micro-options" role="group">
        {card.options.map((option) => {
          const isRight = option.id === card.correctId;
          const missed = missedIds.includes(option.id);
          const showRight =
            isRight && (phase === 'correct' || phase === 'revealed');
          const marker = showRight
            ? option.id === lastId && phase === 'correct'
              ? '✓ Ditt svar'
              : '✓ Riktig svar'
            : missed
              ? option.id === lastId && phase !== 'retry'
                ? '✗ Ditt svar'
                : '✗ Ikke denne'
              : null;

          return (
            <button
              aria-disabled={
                !isOpen(practice.state) || missed ? true : undefined
              }
              className="rpg-button rpg-button--secondary micro-tap"
              data-result={
                showRight ? 'correct' : missed ? 'incorrect' : undefined
              }
              key={option.id}
              onClick={() => choose(option.id)}
              type="button"
            >
              <span>{option.label}</span>{' '}
              {marker === null ? null : <small>{marker}</small>}
            </button>
          );
        })}
      </div>
    </PracticeFrame>
  );
}
