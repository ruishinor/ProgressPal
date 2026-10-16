import { useState } from 'react';

import {
  ActionGuardContext,
  useActionGuard,
} from '@/features/microlearning/components/actionGuard';
import { CardFrame } from '@/features/microlearning/components/CardFrame';
import { MicroShell } from '@/features/microlearning/components/MicroShell';
import { SessionPicker } from '@/features/microlearning/components/SessionPicker';
import { SessionRunner } from '@/features/microlearning/components/SessionRunner';
import { RpgButton } from '@/features/rpg/components/RpgButton';
import type { MicrolearningBank } from '@/lib/domain';
import { rpgRoutePath } from '@/lib/routing/rpgRoutePaths';

/**
 * What the learner may open, worked out by the app layer from the Campaign's
 * own position (`selectPrimer`, `listReinforcementSessions`): at most one
 * primer, and the reinforcement sessions whose material they have reached.
 * This page only receives the answer: it never reads app state or storage.
 */
export type MicroAvailability =
  | { readonly status: 'loading' }
  | { readonly status: 'failed' }
  | {
      readonly status: 'ready';
      readonly primerId: string | null;
      readonly repeatSessionIds: ReadonlySet<string>;
    };

function Notice({
  context,
  kindLabel,
  title,
  withBack,
  backLabel,
}: {
  backLabel: string;
  context: string;
  kindLabel: string;
  title: string;
  withBack: boolean;
}) {
  return (
    <MicroShell closeTo={rpgRoutePath}>
      <CardFrame
        action={
          withBack ? (
            <RpgButton href={rpgRoutePath}>{backLabel}</RpgButton>
          ) : undefined
        }
        context={context}
        kindLabel={kindLabel}
        title={title}
      />
    </MicroShell>
  );
}

/**
 * Microlearning: an additive surface for spare minutes (no scrolling at normal
 * text size); the Campaign is untouched. Two intents: «Forbered deg», one
 * short primer for what comes next in the Campaign, and «Repeter», retrieval
 * of what the learner has already worked on. The programme owns its sessions
 * and the app layer decides which are open from the Campaign's own position;
 * this page only receives the answer. A programme that ships no bank gets a
 * short notice and a way back, never another programme's cards, and a failed
 * read of the learner's progress fails closed.
 */
export function MicrolearningPage({
  availability,
  bank,
}: {
  availability: MicroAvailability;
  bank: MicrolearningBank | undefined;
}) {
  const outer = useActionGuard();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const ready = bank !== undefined && availability.status === 'ready';
  const primer = ready
    ? bank.primers?.find((entry) => entry.id === availability.primerId)
    : undefined;
  const repeat = ready
    ? bank.sessions.filter((entry) =>
        availability.repeatSessionIds.has(entry.id),
      )
    : [];
  const session = [...(primer === undefined ? [] : [primer]), ...repeat].find(
    (entry) => entry.id === sessionId,
  );

  if (bank === undefined) {
    return (
      <Notice
        backLabel="Back to the Campaign"
        context="The active programme has no microlearning sessions."
        kindLabel="Microlearning"
        title="Nothing to practise here"
        withBack
      />
    );
  }

  if (availability.status === 'loading') {
    return (
      <Notice
        backLabel="Tilbake til kampanjen"
        context="Et øyeblikk."
        kindLabel="Mikroøkter"
        title="Henter mikroøkter"
        withBack={false}
      />
    );
  }

  if (availability.status === 'failed') {
    return (
      <Notice
        backLabel="Tilbake til kampanjen"
        context="Vi kunne ikke lese framdriften din akkurat nå. Prøv igjen senere."
        kindLabel="Mikroøkter"
        title="Mikroøkter er ikke tilgjengelige"
        withBack
      />
    );
  }

  if (primer === undefined && repeat.length === 0) {
    return (
      <Notice
        backLabel="Tilbake til kampanjen"
        context="Her forbereder du deg på det som kommer, og repeterer det du har jobbet med. Fortsett i kampanjen, så dukker det snart opp en økt her."
        kindLabel="Mikroøkter"
        title="Ingen mikroøkter akkurat nå"
        withBack
      />
    );
  }

  return (
    <ActionGuardContext.Provider value={outer}>
      {session === undefined ? (
        <MicroShell closeTo={rpgRoutePath}>
          <SessionPicker
            onPick={setSessionId}
            primer={primer}
            repeat={repeat}
            someRepeatLocked={repeat.length < bank.sessions.length}
          />
        </MicroShell>
      ) : (
        <SessionRunner
          key={session.id}
          onExit={() => setSessionId(null)}
          session={session}
        />
      )}
    </ActionGuardContext.Provider>
  );
}
