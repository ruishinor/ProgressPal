import { useState } from 'react';

import type { MicroTapCard } from '@/lib/domain';

import { isOpen } from '../model';
import { PracticeFrame } from './PracticeFrame';
import { usePractice } from './usePractice';

/**
 * A short error and a few lines of code. The learner taps the token that is
 * wrong. Each token is its own large button, so there is no text selection, no
 * scrolling code block and no phone code editor. Retry and reveal work as on
 * the Select card: a wrong token stays marked and cannot be tapped again.
 */
export function TapCard({
  card,
  nextLabel,
  onNext,
}: {
  card: MicroTapCard;
  nextLabel: string;
  onNext: () => void;
}) {
  const practice = usePractice();
  const { phase } = practice.state;
  const [missedIds, setMissedIds] = useState<readonly string[]>([]);

  function tap(id: string) {
    if (!isOpen(practice.state) || missedIds.includes(id)) {
      return;
    }
    const correct = id === card.correctTokenId;

    if (!correct) {
      setMissedIds((current) => [...current, id]);
    }
    practice.submit(correct);
  }

  return (
    <PracticeFrame
      card={card}
      idle="Trykk på det du mener er feil."
      nextLabel={nextLabel}
      onNext={onNext}
      practice={practice}
      prompt={
        card.error === undefined ? undefined : (
          <p className="micro-error">
            <span className="sr-only">Feilmelding: </span>
            <code>{card.error}</code>
          </p>
        )
      }
    >
      <div aria-label="Programmet" className="micro-lines" role="group">
        {card.lines.map((line) => (
          <div className="micro-line" key={line.number}>
            <small aria-hidden="true">{line.number}</small>
            {line.tokens.map((token) => {
              const showRight =
                token.id === card.correctTokenId &&
                (phase === 'correct' || phase === 'revealed');
              const missed = missedIds.includes(token.id);

              return (
                <button
                  aria-disabled={
                    !isOpen(practice.state) || missed ? true : undefined
                  }
                  aria-label={`Linje ${line.number}: ${token.name ?? token.text}${
                    showRight ? ', riktig' : missed ? ', feil' : ''
                  }`}
                  className="rpg-button rpg-button--secondary micro-tap micro-token"
                  data-result={
                    showRight ? 'correct' : missed ? 'incorrect' : undefined
                  }
                  key={token.id}
                  onClick={() => tap(token.id)}
                  type="button"
                >
                  {token.text}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </PracticeFrame>
  );
}
