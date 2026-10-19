import { useEffect, useRef, useState } from 'react';
import type { MicroOrderCard } from '@/lib/domain';
import { ActionButton } from './ActionButton';
import { CardFrame, type MicroFeedback } from './CardFrame';

type Phase = 'editing' | 'wrong' | 'correct' | 'revealed';

/** Fixed source rows with local position assignments; no shared practice changes. */
export function UtviklerblikkOrderCard({
  card,
  nextLabel,
  onNext,
}: {
  card: MicroOrderCard;
  nextLabel: string;
  onNext: () => void;
}) {
  const [slots, setSlots] = useState<readonly (string | null)[]>(() =>
    card.items.map(() => null),
  );
  const [locked, setLocked] = useState<readonly boolean[]>(() =>
    card.items.map(() => false),
  );
  const [phase, setPhase] = useState<Phase>('editing');
  const [checks, setChecks] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  const focusChoices = useRef(false);
  const keyboard = useRef(false);
  const actions = useRef<HTMLDivElement>(null);
  const lockedCount = locked.filter(Boolean).length;
  const free = slots.flatMap((id, i) => (id === null ? [i + 1] : []));
  const settled = phase === 'correct' || phase === 'revealed';
  useEffect(() => {
    if (focusChoices.current && phase === 'editing') {
      (
        list.current?.querySelector<HTMLButtonElement>(
          'button[data-unplaced="true"]',
        ) ?? actions.current?.querySelector<HTMLButtonElement>('button')
      )?.focus({ preventScroll: !keyboard.current });
      focusChoices.current = false;
    }
  }, [phase, slots]);
  function place(id: string) {
    if (phase !== 'editing' || slots.includes(id)) return;
    const index = slots.indexOf(null);
    if (index < 0) return;
    setSlots(slots.map((value, i) => (i === index ? id : value)));
    // Pointer users keep their row. Keyboard users reach the next available choice.
    focusChoices.current = keyboard.current;
  }
  function undo(index: number) {
    if (phase !== 'editing' || locked[index]) return;
    setSlots(slots.map((value, i) => (i === index ? null : value)));
  }
  function check() {
    if (phase !== 'editing' || slots.includes(null)) return;
    const result = slots.map((id, i) => id === card.correctOrder[i]);
    setLocked(result);
    setChecks((n) => n + 1);
    setPhase(result.every(Boolean) ? 'correct' : 'wrong');
  }
  function retry() {
    setSlots(slots.map((id, i) => (locked[i] ? id : null)));
    setPhase('editing');
    focusChoices.current = true;
  }
  function reset() {
    setSlots(card.items.map(() => null));
    setLocked(card.items.map(() => false));
    setPhase('editing');
    setChecks(0);
    focusChoices.current = true;
  }
  const feedback: MicroFeedback =
    phase === 'wrong'
      ? {
          state: 'incorrect',
          label: 'Ikke helt.',
          message:
            lockedCount +
            ' av ' +
            slots.length +
            ' står riktig og blir stående. ' +
            card.hint,
        }
      : phase === 'correct'
        ? {
            state: 'correct',
            label: checks === 1 ? 'Riktig.' : 'Riktig nå.',
            message: card.explanation,
          }
        : phase === 'revealed'
          ? {
              state: 'revealed',
              label: 'Løsningen er vist.',
              message: card.explanation,
            }
          : {
              state: checks ? 'hint' : 'idle',
              message: free.length
                ? 'Velg trinn til plass ' +
                  free[0] +
                  '. Trykk igjen for å angre.'
                : 'Alle plasser er valgt. Sjekk svaret, eller trykk på et valgt trinn for å angre.',
            };
  return (
    <CardFrame
      title={card.title}
      context={card.context}
      kindLabel="Rekkefølge"
      feedback={feedback}
      action={
        <div
          ref={actions}
          className="utviklerblikk-order-primary"
          onClickCapture={(event) => {
            keyboard.current = event.detail === 0;
          }}
        >
          <ActionButton
            label={
              phase === 'wrong' ? 'Prøv igjen' : settled ? nextLabel : 'Sjekk'
            }
            ready={phase !== 'editing' || !slots.includes(null)}
            onPress={phase === 'wrong' ? retry : settled ? onNext : check}
          />
        </div>
      }
    >
      <ul
        className="utviklerblikk-slots"
        aria-label="Trinn med valgte plasser"
        ref={list}
      >
        {card.items.map((item) => {
          const index = slots.indexOf(item.id);
          const placed = index >= 0;
          const fixed = placed && locked[index];
          const result =
            phase === 'revealed'
              ? 'revealed'
              : fixed
                ? 'correct'
                : phase === 'wrong'
                  ? 'incorrect'
                  : undefined;
          return (
            <li
              key={item.id}
              data-result={result}
              data-position={placed ? index + 1 : undefined}
            >
              <button
                type="button"
                className="rpg-button rpg-button--secondary micro-tap"
                disabled={phase !== 'editing' || fixed}
                data-unplaced={!placed ? true : undefined}
                data-result={result}
                aria-pressed={placed}
                onClick={(event) => {
                  keyboard.current = event.detail === 0;
                  if (placed) undo(index);
                  else place(item.id);
                }}
              >
                <span className="micro-slot" aria-hidden="true">
                  {placed ? index + 1 : '–'}
                </span>
                <span>
                  {item.label}
                  <span className="sr-only">
                    {placed ? ', plass ' + (index + 1) : ', ikke plassert'}
                  </span>
                  {phase === 'revealed' ? (
                    <small>Vist løsning</small>
                  ) : fixed ? (
                    <small>✓ Riktig plass – låst</small>
                  ) : phase === 'wrong' ? (
                    <small>✗ Feil plass</small>
                  ) : placed ? (
                    <span className="sr-only">, valgt – angre</span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!settled && (slots.some((id) => id !== null) || checks > 0) ? (
        <div
          className="utviklerblikk-order-tools"
          onClickCapture={(event) => {
            keyboard.current = event.detail === 0;
          }}
        >
          <ActionButton label="Start på nytt" ready onPress={reset} />
          {checks >= 2 ? (
            <ActionButton
              label="Vis løsning"
              ready
              onPress={() => {
                setSlots([...card.correctOrder]);
                setPhase('revealed');
              }}
            />
          ) : null}
        </div>
      ) : null}
    </CardFrame>
  );
}
