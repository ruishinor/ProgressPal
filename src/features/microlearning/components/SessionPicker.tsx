import type { MicroSession } from '@/lib/domain';

import { useActionGuard } from './actionGuard';
import { CardFrame } from './CardFrame';

/** Said once, when some «Øv igjen» topics are still ahead. */
const moreLater = 'Flere åpnes når du kommer lenger.';

/**
 * One tap starts a session; the start is guarded, because the finished
 * screen's button sits where a row appears here.
 */
function useStartRow(onPick: (sessionId: string) => void) {
  const guard = useActionGuard();

  return (session: MicroSession) => (
    <li key={session.id}>
      <button
        className="rpg-button rpg-button--secondary micro-tap micro-session"
        onClick={() => {
          if (guard.accept()) {
            onPick(session.id);
          }
        }}
        type="button"
      >
        <strong>{session.title}</strong>
        <small>
          {session.cards.length} kort · ca. {session.minutes} min.{' '}
          {session.summary}
        </small>
      </button>
    </li>
  );
}

/**
 * The sessions the learner may open now, in two groups named for what they
 * are for: «Forbered deg» (one short primer for what comes next in the
 * Campaign) and «Øv igjen» (retrieval of the topics the learner has worked
 * on). One tap starts any of them. A session that is not open is not listed
 * and its summary is not shown: that would teach what the learner has not
 * reached. A plain line says that more open up as the Campaign goes on. When
 * the two groups would need more rows than one phone screen holds
 * (`onShowRepeat`), «Øv igjen» is one row that names its sessions and opens
 * them on a screen of their own (`RepeatList`).
 */
export function SessionPicker({
  onPick,
  onShowRepeat,
  primer,
  repeat,
  someRepeatLocked,
}: {
  onPick: (sessionId: string) => void;
  /** Set when «Øv igjen» has its own screen. */
  onShowRepeat?: () => void;
  primer: MicroSession | undefined;
  repeat: readonly MicroSession[];
  someRepeatLocked: boolean;
}) {
  const guard = useActionGuard();
  const row = useStartRow(onPick);

  return (
    <CardFrame
      context={someRepeatLocked && repeat.length > 0 ? moreLater : undefined}
      kindLabel="Mikroøkter"
      title="Velg en mikroøkt"
    >
      <div className="micro-sessions">
        {primer === undefined ? null : (
          <>
            <h2 className="micro-card__kind">Forbered deg</h2>
            <ul className="micro-sessions">{row(primer)}</ul>
          </>
        )}
        <h2 className="micro-card__kind">Øv igjen</h2>
        {repeat.length === 0 ? (
          <p className="micro-card__text">
            Flere øvelser kommer når du går videre i programmet.
          </p>
        ) : onShowRepeat === undefined ? (
          <ul className="micro-sessions">{repeat.map(row)}</ul>
        ) : (
          <ul className="micro-sessions">
            <li>
              <button
                className="rpg-button rpg-button--secondary micro-tap micro-session"
                onClick={() => {
                  if (guard.accept()) {
                    onShowRepeat();
                  }
                }}
                type="button"
              >
                <strong>Velg blant {repeat.length} økter</strong>
                <small>
                  {repeat.map((session) => session.title).join(' · ')}
                </small>
              </button>
            </li>
          </ul>
        )}
      </div>
    </CardFrame>
  );
}

/** «Øv igjen» on its own screen: every open session, as in the picker. */
export function RepeatList({
  onPick,
  repeat,
  someRepeatLocked,
}: {
  onPick: (sessionId: string) => void;
  repeat: readonly MicroSession[];
  someRepeatLocked: boolean;
}) {
  const row = useStartRow(onPick);

  return (
    <CardFrame
      context={someRepeatLocked ? moreLater : undefined}
      kindLabel="Mikroøkter"
      title="Øv igjen"
    >
      <ul className="micro-sessions">{repeat.map(row)}</ul>
    </CardFrame>
  );
}
