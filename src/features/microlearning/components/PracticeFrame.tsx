import type { ReactNode } from 'react';

import type { MicroPracticeCard } from '../model';
import { isSettled } from '../model';
import { ActionButton } from './ActionButton';
import { CardFrame, type MicroFeedback } from './CardFrame';
import type { Practice } from './usePractice';

const kindLabels: Record<MicroPracticeCard['kind'], string> = {
  assemble: 'Bygg',
  match: 'Koble',
  order: 'Rekkefølge',
  select: 'Velg',
  tap: 'Finn feilen',
};

/**
 * What every assessed card says and does in each phase of the one-retry loop,
 * so the six families cannot drift apart. A card brings its interaction, what
 * it says while the learner is still working (`idle`), and, when the answer
 * needs a deliberate "Sjekk", whether it is complete enough to check.
 *
 * - answering / retry: idle line (retry shows the hint), then check or wait
 * - wrong: the miss and the hint; the only action is "Prøv igjen"
 * - correct / revealed: the explanation; the only action is Next
 */
export function PracticeFrame({
  card,
  check,
  children,
  idle,
  missFeedback,
  nextLabel,
  onNext,
  practice,
  prompt,
}: {
  card: MicroPracticeCard;
  /** Present for cards the learner confirms with "Sjekk". */
  check?: { onCheck: () => void; ready: boolean };
  children: ReactNode;
  idle: string;
  /** Why the learner's own miss is wrong, when the card says; else the hint. */
  missFeedback?: string;
  nextLabel: string;
  onNext: () => void;
  practice: Practice;
  prompt?: ReactNode;
}) {
  const { phase, tries } = practice.state;
  const feedback: MicroFeedback =
    phase === 'wrong'
      ? {
          state: 'incorrect',
          label: 'Ikke helt.',
          message: missFeedback ?? card.hint,
        }
      : phase === 'correct'
        ? {
            state: 'correct',
            label: tries === 1 ? 'Riktig.' : 'Riktig nå.',
            message: card.explanation,
          }
        : phase === 'revealed'
          ? {
              state: 'revealed',
              label: 'Her er svaret.',
              message: card.explanation,
            }
          : phase === 'retry'
            ? { state: 'hint', label: 'Tips:', message: card.hint }
            : { state: 'idle', message: idle };
  const action =
    phase === 'wrong' ? (
      <ActionButton label="Prøv igjen" onPress={practice.retry} ready />
    ) : isSettled(practice.state) ? (
      <ActionButton label={nextLabel} onPress={onNext} ready />
    ) : check === undefined ? (
      <ActionButton label={nextLabel} onPress={onNext} ready={false} />
    ) : (
      <ActionButton label="Sjekk" onPress={check.onCheck} ready={check.ready} />
    );

  return (
    <CardFrame
      action={action}
      context={card.context}
      feedback={feedback}
      kindLabel={kindLabels[card.kind]}
      prompt={
        card.question === undefined ? (
          prompt
        ) : (
          <>
            {prompt}
            {/* The question itself, directly above what the learner acts on. */}
            <p className="micro-card__text">
              <strong>{card.question}</strong>
            </p>
          </>
        )
      }
      title={card.title}
    >
      {children}
    </CardFrame>
  );
}
