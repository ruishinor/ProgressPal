import { useState } from 'react';

import type { MicroOrderCard } from '@/lib/domain';

import { isOpen, isSameSequence, toggleInSequence } from '../model';
import { PracticeFrame } from './PracticeFrame';
import { usePractice } from './usePractice';

/**
 * Tap-to-place ordering. Each tap numbers an item in the order it was tapped;
 * tapping a numbered item takes it back out. There is no drag and no precision
 * target, and the number itself (not a colour) carries the state. A retry
 * starts from an empty list, because items can only be added at the end; a
 * second miss numbers the items in the right order.
 */
export function OrderCard({
  card,
  nextLabel,
  onNext,
}: {
  card: MicroOrderCard;
  nextLabel: string;
  onNext: () => void;
}) {
  const practice = usePractice();
  const [placed, setPlaced] = useState<readonly string[]>([]);
  const open = isOpen(practice.state);
  const shown =
    practice.state.phase === 'revealed' ? card.correctOrder : placed;

  function retry() {
    setPlaced([]);
    practice.retry();
  }

  return (
    <PracticeFrame
      card={card}
      check={{
        onCheck: () =>
          practice.submit(isSameSequence(placed, card.correctOrder)),
        ready: placed.length === card.items.length,
      }}
      idle={`Trykk i rekkefølge. ${placed.length} av ${card.items.length} plassert.`}
      nextLabel={nextLabel}
      onNext={onNext}
      practice={{ ...practice, retry }}
    >
      <div aria-label="Trinn å ordne" className="micro-order" role="group">
        {card.items.map((item) => {
          const position = shown.indexOf(item.id) + 1;

          return (
            <button
              aria-disabled={open ? undefined : true}
              aria-pressed={position > 0}
              className="rpg-button rpg-button--secondary micro-tap"
              key={item.id}
              onClick={() => {
                if (open) {
                  setPlaced((current) => toggleInSequence(current, item.id));
                }
              }}
              type="button"
            >
              <span aria-hidden="true" className="micro-slot">
                {position > 0 ? position : ''}
              </span>
              <span>{item.label}</span>
              <span className="sr-only">
                {position > 0
                  ? `, plassert som nummer ${position}`
                  : ', ikke plassert'}
              </span>
            </button>
          );
        })}
      </div>
    </PracticeFrame>
  );
}
