import { useEffect, useRef, useState } from 'react';
import type { MicroMatchCard } from '@/lib/domain';
import { isOpen, isSettled } from '../model';
import { PracticeFrame } from './PracticeFrame';
import { usePractice } from './usePractice';

type Side = 'left' | 'right';
type Pick = { id: string; side: Side };

/** Text matching for the opted-in track only. Either side can initiate a pair. */
export function UtviklerblikkMatchCard({
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
  const [selected, setSelected] = useState<Pick | null>(null);
  const [miss, setMiss] = useState<{ left: string; right: string } | null>(
    null,
  );
  const [announcement, setAnnouncement] = useState('');
  const [mobile, setMobile] = useState(
    () => window.matchMedia('(max-width: 40rem)').matches,
  );
  const [startSide, setStartSide] = useState<Side | null>(null);
  const keyboard = useRef(false);
  const interaction = useRef<HTMLDivElement>(null);
  const target = useRef<Pick | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const open = isOpen(practice.state);
  const settled = isSettled(practice.state);
  const { phase } = practice.state;
  useEffect(() => {
    const pick = target.current;
    if (pick && open) {
      buttons.current
        .get(pick.side + pick.id)
        ?.focus({ preventScroll: mobile && !keyboard.current });
      target.current = null;
    }
  }, [selected, found, open, mobile, startSide]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 40rem)');
    function resize() {
      if (interaction.current?.contains(document.activeElement)) {
        const side = selected
          ? selected.side === 'left'
            ? 'right'
            : 'left'
          : (startSide ?? 'left');
        const ids =
          side === 'left' ? card.pairs.map((p) => p.id) : card.rightOrder;
        const id = ids.find((value) => !found.includes(value));
        target.current = id === undefined ? null : { side, id };
        keyboard.current = false;
      }
      setMobile(media.matches);
    }
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, [selected, found, startSide, card]);
  // Retry lives in the shared frame footer. Track its actual input too,
  // rather than inheriting the modality of the earlier (possibly touch) miss.
  useEffect(() => {
    const frame = interaction.current?.closest('.micro-card');
    if (!frame) return;
    const onKey = () => {
      keyboard.current = true;
    };
    const onPointer = () => {
      keyboard.current = false;
    };
    frame.addEventListener('keydown', onKey, true);
    frame.addEventListener('pointerdown', onPointer, true);
    return () => {
      frame.removeEventListener('keydown', onKey, true);
      frame.removeEventListener('pointerdown', onPointer, true);
    };
  }, []);
  function focusFirst(side: Side, excluded: readonly string[]) {
    const ids = side === 'left' ? card.pairs.map((p) => p.id) : card.rightOrder;
    const id = ids.find((value) => !excluded.includes(value));
    target.current = id === undefined ? null : { side, id };
  }
  function choose(id: string, side: Side, fromKeyboard: boolean) {
    keyboard.current = fromKeyboard;
    if (!open || found.includes(id)) return;
    if (selected === null || selected.side === side) {
      if (selected?.id === id) {
        setSelected(null);
        setAnnouncement('Valget er fjernet.');
        return;
      }
      setStartSide(side);
      setSelected({ id, side });
      focusFirst(side === 'left' ? 'right' : 'left', found);
      const pair = card.pairs.find((p) => p.id === id)!;
      setAnnouncement(
        'Valgt: ' + pair[side] + '. Velg det som passer på den andre siden.',
      );
      return;
    }
    const left = side === 'left' ? id : selected.id;
    const right = side === 'right' ? id : selected.id;
    if (left === right) {
      const next = [...found, id];
      setFound(next);
      setAnnouncement(
        'Par ' +
          (card.pairs.findIndex((p) => p.id === id) + 1) +
          ' koblet. ' +
          next.length +
          ' av ' +
          card.pairs.length +
          '.',
      );
      if (next.length === card.pairs.length) practice.submit(true);
      else focusFirst(selected.side, next);
    } else {
      setMiss({ left, right });
      practice.submit(false);
    }
    if (left === right || !mobile) setSelected(null);
  }
  function retry() {
    setMiss(null);
    setSelected(null);
    focusFirst(mobile ? (startSide ?? 'left') : 'left', found);
    practice.retry();
  }

  function choice(id: string, side: Side) {
    const pair = card.pairs.find((p) => p.id === id)!;
    const solved = found.includes(id),
      wrong = phase === 'wrong' && miss?.[side] === id;
    const number = card.pairs.findIndex((p) => p.id === id) + 1;
    return (
      <button
        type="button"
        className="rpg-button rpg-button--secondary micro-tap"
        ref={(el) => {
          if (el) buttons.current.set(side + id, el);
          else buttons.current.delete(side + id);
        }}
        disabled={!open || solved}
        aria-pressed={selected?.side === side && selected.id === id}
        data-result={solved ? 'correct' : wrong ? 'incorrect' : undefined}
        onClick={(event) => choose(id, side, event.detail === 0)}
        key={id}
      >
        <span>
          {pair[side]}
          {wrong ? (
            mobile ? (
              <small>✗ Ikke et par</small>
            ) : (
              <span className="sr-only">, ikke et par</span>
            )
          ) : null}
        </span>
        <small aria-hidden={!solved}>
          {solved ? 'Par ' + number + ' ✓' : ' '}
        </small>
      </button>
    );
  }
  function choices(side: Side, eligibleOnly = false) {
    return (side === 'left' ? card.pairs.map((p) => p.id) : card.rightOrder)
      .filter((id) => !eligibleOnly || !found.includes(id))
      .map((id) => choice(id, side));
  }

  const missed =
    miss === null
      ? undefined
      : '«' +
        card.pairs.find((p) => p.id === miss.left)!.left +
        '» og «' +
        card.pairs.find((p) => p.id === miss.right)!.right +
        '» er ikke et par. ' +
        card.hint;
  return (
    <PracticeFrame
      card={card}
      idle={
        mobile
          ? 'Velg en tekst og koble den til et svar. ' +
            found.length +
            ' av ' +
            card.pairs.length +
            ' par er koblet.'
          : 'Par ' +
            found.length +
            ' av ' +
            card.pairs.length +
            '. Velg fra en av sidene, så fra den andre.'
      }
      missFeedback={missed}
      nextLabel={nextLabel}
      onNext={onNext}
      practice={{ ...practice, retry }}
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      {settled ? (
        <section
          aria-label={
            phase === 'revealed' ? 'Fasit for koblingene' : 'Dine koblinger'
          }
          className="utviklerblikk-pairs"
        >
          <h2>
            {phase === 'revealed'
              ? 'Fasit – ikke alle parene ble løst'
              : 'Du koblet alle parene'}
          </h2>
          <ol>
            {card.pairs.map((pair, i) => (
              <li key={pair.id}>
                <strong>
                  Par {i + 1}:{' '}
                  {found.includes(pair.id) ? 'Du koblet' : 'Vist svar'}
                </strong>
                <span>{pair.left}</span>
                <span>
                  <span aria-hidden="true">↔ </span>
                  <span className="sr-only">hører sammen med </span>
                  {pair.right}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <div ref={interaction}>
          {mobile ? (
            <div className="utviklerblikk-mobile-match">
              <div
                role="group"
                aria-label="Startside for koblingen"
                className="utviklerblikk-match-sides"
              >
                {(['left', 'right'] as const).map((side) => (
                  <button
                    type="button"
                    key={side}
                    className="rpg-button rpg-button--secondary"
                    aria-pressed={(startSide ?? 'left') === side}
                    disabled={!open}
                    onClick={(event) => {
                      keyboard.current = event.detail === 0;
                      setStartSide(side);
                      setSelected(null);
                      if (keyboard.current) focusFirst(side, found);
                      setAnnouncement(
                        'Velg fra ' +
                          (side === 'left' ? card.leftLabel : card.rightLabel) +
                          '.',
                      );
                    }}
                  >
                    {side === 'left' ? card.leftLabel : card.rightLabel}
                  </button>
                ))}
              </div>
              <div
                role="group"
                aria-label={
                  (startSide ?? 'left') === 'left'
                    ? card.leftLabel
                    : card.rightLabel
                }
              >
                <ul className="utviklerblikk-match-sources">
                  {((startSide ?? 'left') === 'left'
                    ? card.pairs.map((p) => p.id)
                    : card.rightOrder
                  ).map((id) => {
                    const side = startSide ?? 'left';
                    const pair = card.pairs.find((p) => p.id === id)!;
                    const active =
                      selected?.id === id && selected.side === side;
                    return (
                      <li key={id}>
                        {found.includes(id) ? (
                          <div className="utviklerblikk-found">
                            <span>
                              ✓ {pair[side]} ↔{' '}
                              {pair[side === 'left' ? 'right' : 'left']}
                            </span>
                            <small>
                              Du koblet · Par {card.pairs.indexOf(pair) + 1}
                            </small>
                          </div>
                        ) : (
                          choice(id, side)
                        )}
                        {active ? (
                          <div
                            className="utviklerblikk-candidates"
                            role="group"
                            aria-label={
                              side === 'left' ? card.rightLabel : card.leftLabel
                            }
                          >
                            <p>
                              Velg fra «
                              {side === 'left'
                                ? card.rightLabel
                                : card.leftLabel}
                              »
                            </p>
                            {choices(side === 'left' ? 'right' : 'left', true)}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : (
            <div
              className="micro-match utviklerblikk-match"
              data-left-presentation="text"
            >
              {(['left', 'right'] as const).map((side) => (
                <div
                  role="group"
                  aria-label={
                    side === 'left' ? card.leftLabel : card.rightLabel
                  }
                  className="micro-match__column"
                  key={side}
                >
                  <h2>{side === 'left' ? card.leftLabel : card.rightLabel}</h2>
                  {choices(side)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PracticeFrame>
  );
}
