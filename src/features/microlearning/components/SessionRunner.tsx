import { useState } from 'react';

import type { MicroCard, MicroSession } from '@/lib/domain';
import { rpgRoutePath } from '@/lib/routing/rpgRoutePaths';

import { AssembleCard } from './AssembleCard';
import { DoneCard } from './DoneCard';
import { LearnCard } from './LearnCard';
import { MatchCard } from './MatchCard';
import { MicroShell } from './MicroShell';
import { OrderCard } from './OrderCard';
import { SelectCard } from './SelectCard';
import { TapCard } from './TapCard';
import { UtviklerblikkContext } from './UtviklerblikkContext';
import { UtviklerblikkMatchCard } from './UtviklerblikkMatchCard';
import { UtviklerblikkOrderCard } from './UtviklerblikkOrderCard';

type CardProps = { nextLabel: string; onNext: () => void };

function CardView({
  card,
  presentation,
  ...props
}: CardProps & { card: MicroCard; presentation?: 'utviklerblikk' }) {
  switch (card.kind) {
    case 'learn':
      return <LearnCard card={card} {...props} />;
    case 'select':
      return <SelectCard card={card} {...props} />;
    case 'order':
      return presentation === 'utviklerblikk' &&
        card.id === 'tsu-a5-rekkefolge' ? (
        <UtviklerblikkOrderCard card={card} {...props} />
      ) : (
        <OrderCard card={card} {...props} />
      );
    case 'match':
      return presentation === 'utviklerblikk' &&
        card.leftPresentation === 'text' ? (
        <UtviklerblikkMatchCard card={card} {...props} />
      ) : (
        <MatchCard card={card} {...props} />
      );
    case 'tap':
      return <TapCard card={card} {...props} />;
    case 'assemble':
      return <AssembleCard card={card} {...props} />;
  }
}

/**
 * Runs one session in order, the same way for «Forbered deg», «Repeter» and a
 * track. No card reads or writes learner evidence, mastery, XP or storage.
 * Without `position` the only state is which card is showing, held in memory:
 * leaving or reloading starts over. With it, the page holds the card index
 * (in the address), so the browser's Back and Forward move between cards.
 */
export function SessionRunner({
  name,
  onExit,
  pickAnotherLabel,
  position,
  presentation,
  session,
}: {
  presentation?: 'utviklerblikk';
  onExit: () => void;
  pickAnotherLabel?: string;
  /** The surface's name for assistive technology, when not Mikroøkt. */
  name?: string;
  /** The card index (`cards.length` is the finished screen) and how to move on. */
  position?: { index: number; onAdvance: (index: number) => void };
  session: MicroSession;
}) {
  const [ownIndex, setOwnIndex] = useState(0);
  const index = position?.index ?? ownIndex;
  const card = session.cards[index];
  const lastIndex = session.cards.length - 1;

  const content = (
    <MicroShell
      closeTo={rpgRoutePath}
      name={name}
      presentation={presentation}
      progress={{
        current: Math.min(index + 1, session.cards.length),
        done: card === undefined,
        total: session.cards.length,
      }}
    >
      {card === undefined ? (
        <DoneCard
          closeTo={rpgRoutePath}
          onPickAnother={onExit}
          pickAnotherLabel={pickAnotherLabel}
          takeaway={session.takeaway}
        />
      ) : (
        <CardView
          card={card}
          presentation={presentation}
          key={card.id}
          nextLabel={index === lastIndex ? 'Fullfør' : 'Neste'}
          onNext={() =>
            position === undefined
              ? setOwnIndex((current) => current + 1)
              : position.onAdvance(index + 1)
          }
        />
      )}
    </MicroShell>
  );
  return presentation === 'utviklerblikk' ? (
    <UtviklerblikkContext.Provider
      value={card === undefined ? null : { onActivities: onExit }}
    >
      {content}
    </UtviklerblikkContext.Provider>
  ) : (
    content
  );
}
