import type { MicroLearnCard } from '@/lib/domain';

import { ActionButton } from './ActionButton';
import { CardFrame } from './CardFrame';

/**
 * One bounded idea and a tiny example. A Learn card is never assessed: it has
 * no answer, no check and no retry. It ends in a bridge that names the
 * practice that follows, shown where the other cards show their feedback.
 */
export function LearnCard({
  card,
  nextLabel,
  onNext,
}: {
  card: MicroLearnCard;
  nextLabel: string;
  onNext: () => void;
}) {
  return (
    <CardFrame
      action={<ActionButton label={nextLabel} onPress={onNext} ready />}
      feedback={{ state: 'bridge', message: card.bridge }}
      kindLabel="Lær"
      prompt={
        <>
          <p className="micro-card__text">{card.idea}</p>
          <figure className="micro-code">
            <pre>
              <code>{card.example.code}</code>
            </pre>
            <figcaption>{card.example.note}</figcaption>
          </figure>
        </>
      }
      title={card.title}
    />
  );
}
