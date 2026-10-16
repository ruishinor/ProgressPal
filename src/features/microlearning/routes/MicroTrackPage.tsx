import { useState } from 'react';

import {
  ActionGuardContext,
  useActionGuard,
} from '@/features/microlearning/components/actionGuard';
import { CardFrame } from '@/features/microlearning/components/CardFrame';
import { MicroShell } from '@/features/microlearning/components/MicroShell';
import { SessionRunner } from '@/features/microlearning/components/SessionRunner';
import { RpgButton } from '@/features/rpg/components/RpgButton';
import type { MicroSession, MicroTrack } from '@/lib/domain';
import { rpgRoutePath } from '@/lib/routing/rpgRoutePaths';

function TrackPicker({
  onPick,
  track,
}: {
  onPick: (sessionId: string) => void;
  track: MicroTrack;
}) {
  const guard = useActionGuard();
  const row = (session: MicroSession, index: number) => (
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
        <strong>
          {index + 1}. {session.title}
        </strong>
        <small>ca. {session.minutes} min</small>
      </button>
    </li>
  );

  return (
    <CardFrame
      context="Frivillig, i valgfri rekkefølge. Ingenting lagres."
      kindLabel="Frivillig spor"
      title={track.title}
    >
      <ul className="micro-sessions">{track.sessions.map(row)}</ul>
    </CardFrame>
  );
}

/**
 * A voluntary track: a short list of activities the learner may open at any
 * time and in any order, each played by the same `SessionRunner` as «Forbered
 * deg» and «Repeter». Nothing here depends on or changes the Campaign: there
 * is no availability rule, no progress read and no write. Leaving or
 * reloading starts over.
 */
export function MicroTrackPage({ track }: { track: MicroTrack | undefined }) {
  const outer = useActionGuard();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const session = track?.sessions.find((entry) => entry.id === sessionId);

  if (track === undefined) {
    return (
      <MicroShell closeTo={rpgRoutePath}>
        <CardFrame
          action={
            <RpgButton href={rpgRoutePath}>Tilbake til kampanjen</RpgButton>
          }
          context="Det aktive programmet har ikke dette sporet."
          kindLabel="Frivillig spor"
          title="Ingenting å øve på her"
        />
      </MicroShell>
    );
  }

  return (
    <ActionGuardContext.Provider value={outer}>
      {session === undefined ? (
        <MicroShell closeTo={rpgRoutePath}>
          <TrackPicker onPick={setSessionId} track={track} />
        </MicroShell>
      ) : (
        <SessionRunner
          key={session.id}
          onExit={() => setSessionId(null)}
          pickAnotherLabel="Velg en annen aktivitet"
          session={session}
        />
      )}
    </ActionGuardContext.Provider>
  );
}
