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

type CardProps = { nextLabel: string; onNext: () => void };

function CardView({ card, ...props }: CardProps & { card: MicroCard }) {
  switch (card.kind) {
    case 'learn':
      return <LearnCard card={card} {...props} />;
    case 'select':
      return <SelectCard card={card} {...props} />;
    case 'order':
      return <OrderCard card={card} {...props} />;
    case 'match':
      return <MatchCard card={card} {...props} />;
    case 'tap':
      return <TapCard card={card} {...props} />;
    case 'assemble':
      return <AssembleCard card={card} {...props} />;
  }
}

/**
 * Runs one session in order. The only state is which card is showing, held in
 * memory: leaving or reloading starts over, and no card reads or writes
 * learner evidence, mastery, XP or storage.
 */
export function SessionRunner({
  onExit,
  pickAnotherLabel,
  session,
}: {
  onExit: () => void;
  pickAnotherLabel?: string;
  session: MicroSession;
}) {
  const [index, setIndex] = useState(0);
  const card = session.cards[index];
  const lastIndex = session.cards.length - 1;

  return (
    <MicroShell
      closeTo={rpgRoutePath}
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
          key={card.id}
          nextLabel={index === lastIndex ? 'Fullfør' : 'Neste'}
          onNext={() => setIndex((current) => current + 1)}
        />
      )}
    </MicroShell>
  );
}
