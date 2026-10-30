import { Fragment, useState } from 'react';

import type { MicroSelectCard } from '@/lib/domain';

import { isOpen } from '../model';
import { PracticeFrame } from './PracticeFrame';
import { usePractice } from './usePractice';
import { KanbanBoard } from './KanbanBoard';

/**
 * Large options, one answer, immediate feedback. A wrong option stays marked
 * and cannot be tapped again, so the retry is a real second look rather than a
 * repeat of the same tap; after a second miss the right option is shown.
 * Choosing another option while the first miss is shown is the one retry, as
 * if "Prøv igjen" had been pressed first; the button still works. A double
 * tap on the missed option is ignored, so one physical press can never use
 * both tries.
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
  const retryByChoice = phase === 'wrong';
  const choosable = isOpen(practice.state) || retryByChoice;

  function choose(id: string) {
    if (!choosable || missedIds.includes(id)) {
      return;
    }
    const correct = id === card.correctId;

    setLastId(id);
    if (!correct) {
      setMissedIds((current) => [...current, id]);
    }
    if (retryByChoice) {
      practice.retryWith(correct);
    } else {
      practice.submit(correct);
    }
  }

  return (
    <PracticeFrame
      card={card}
      idle="Trykk på svaret du tror stemmer."
      missFeedback={
        card.options.find((option) => option.id === lastId)?.feedback
      }
      nextLabel={nextLabel}
      onNext={onNext}
      practice={practice}
      prompt={
        card.board ? (
          <KanbanBoard board={card.board} />
        ) : card.code === undefined ? undefined : (
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
              aria-disabled={!choosable || missed ? true : undefined}
              className="rpg-button rpg-button--secondary micro-tap"
              data-result={
                showRight ? 'correct' : missed ? 'incorrect' : undefined
              }
              key={option.id}
              onClick={() => choose(option.id)}
              type="button"
            >
              {/* A line break groups several lines as one answer; the space
                  between them keeps its name readable as separate lines. */}
              {option.label.includes('\n') ? (
                <span className="micro-option-set">
                  {option.label.split('\n').map((line, index) => (
                    <Fragment key={index}>
                      {index === 0 ? null : ' '}
                      <span>{line}</span>
                    </Fragment>
                  ))}
                </span>
              ) : (
                <span>{option.label}</span>
              )}{' '}
              {marker === null ? null : <small>{marker}</small>}
            </button>
          );
        })}
      </div>
    </PracticeFrame>
  );
}
