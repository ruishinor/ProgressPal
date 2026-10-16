import type { MicroSession } from '@/lib/domain';

import { useActionGuard } from './actionGuard';
import { CardFrame } from './CardFrame';

/**
 * The sessions the learner may open now, in two groups named for what they
 * are for: «Forbered deg» (one short primer for what comes next in the
 * Campaign) and «Repeter» (retrieval of what the learner has worked on). One
 * tap starts any of them. A session that is not open is not listed and its
 * summary is not shown: that would teach what the learner has not reached.
 * Plain lines say that more open up as the Campaign goes on. A start is
 * guarded, because the finished screen's button sits where a row appears here.
 */
export function SessionPicker({
  onPick,
  primer,
  repeat,
  someRepeatLocked,
}: {
  onPick: (sessionId: string) => void;
  primer: MicroSession | undefined;
  repeat: readonly MicroSession[];
  someRepeatLocked: boolean;
}) {
  const guard = useActionGuard();
  const row = (session: MicroSession) => (
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

  return (
    <CardFrame
      context={
        someRepeatLocked && repeat.length > 0
          ? 'Korte økter. Ingenting lagres. Flere åpnes når du kommer lenger i kampanjen.'
          : 'Korte økter. Ingenting lagres.'
      }
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
        <h2 className="micro-card__kind">Repeter</h2>
        {repeat.length === 0 ? (
          <p className="micro-card__text">
            Repeter åpnes etter hvert som du jobber i kampanjen.
          </p>
        ) : (
          <ul className="micro-sessions">{repeat.map(row)}</ul>
        )}
      </div>
    </CardFrame>
  );
}
