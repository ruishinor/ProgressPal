import {
  ActionGuardContext,
  useActionGuard,
} from '@/features/microlearning/components/actionGuard';
import { CardFrame } from '@/features/microlearning/components/CardFrame';
import { MicroShell } from '@/features/microlearning/components/MicroShell';
import {
  RepeatList,
  SessionPicker,
} from '@/features/microlearning/components/SessionPicker';
import { SessionRunner } from '@/features/microlearning/components/SessionRunner';
import { RpgButton } from '@/features/rpg/components/RpgButton';
import type { MicrolearningBank } from '@/lib/domain';
import { rpgRoutePath } from '@/lib/routing/rpgRoutePaths';

import {
  listOpenMicroSessions,
  listsRepeatApart,
  type MicroAvailability,
  type MicroStep,
} from '../availability';

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
 * of the topics the learner has already worked on. The programme owns its
 * sessions and the app layer decides which are open from the Campaign's own
 * position; this page only receives the answer. A programme that ships no
 * bank gets a short notice and a way back, never another programme's cards,
 * and a failed read of the learner's progress fails closed. The page does not
 * hold its place itself: the app layer keeps `step` in the address, so the
 * browser's Back and Forward move between screens; a step for a session that
 * is not open shows the picker.
 */
export function MicrolearningPage({
  availability,
  bank,
  onStep,
  step,
}: {
  availability: MicroAvailability;
  bank: MicrolearningBank | undefined;
  onStep: (step: MicroStep) => void;
  step: MicroStep;
}) {
  const outer = useActionGuard();

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
        backLabel="Til startsiden"
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
        backLabel="Til startsiden"
        context="Vi kunne ikke lese framdriften din akkurat nå. Prøv igjen senere."
        kindLabel="Mikroøkter"
        title="Mikroøkter er ikke tilgjengelige"
        withBack
      />
    );
  }

  const primer = bank.primers?.find(
    (entry) => entry.id === availability.primerId,
  );
  const repeat = availability.repeatSessions;
  const apart = listsRepeatApart(bank, availability);
  const session =
    step === null || !('sessionId' in step)
      ? undefined
      : listOpenMicroSessions(bank, availability).find(
          (entry) => entry.id === step.sessionId,
        );
  const pick = (sessionId: string) => onStep({ sessionId, index: 0 });

  if (primer === undefined && repeat.length === 0) {
    return (
      <Notice
        backLabel="Til startsiden"
        context="Her kan du øve på det du har lært og se hva som kommer. Flere øvelser blir tilgjengelige etter hvert som du går videre i programmet."
        kindLabel="Mikroøkter"
        title="Ingen mikroøkter akkurat nå"
        withBack
      />
    );
  }

  // Something is still to come: a session not open yet, or one open with
  // only some of its topics.
  const someRepeatLocked =
    repeat.length < bank.sessions.length ||
    repeat.some(
      (entry) =>
        entry.cards.length <
        (bank.sessions.find((authored) => authored.id === entry.id)?.cards
          .length ?? 0),
    );

  return (
    <ActionGuardContext.Provider value={outer}>
      {session !== undefined && step !== null && 'sessionId' in step ? (
        <SessionRunner
          key={session.id}
          onExit={() => onStep(null)}
          position={{
            index: step.index,
            onAdvance: (index) => onStep({ sessionId: session.id, index }),
          }}
          session={session}
        />
      ) : apart && step !== null && 'list' in step ? (
        <MicroShell closeTo={rpgRoutePath}>
          <RepeatList
            onPick={pick}
            repeat={repeat}
            someRepeatLocked={someRepeatLocked}
          />
        </MicroShell>
      ) : (
        <MicroShell closeTo={rpgRoutePath}>
          <SessionPicker
            onPick={pick}
            onShowRepeat={apart ? () => onStep({ list: 'repeat' }) : undefined}
            primer={primer}
            repeat={repeat}
            someRepeatLocked={someRepeatLocked}
          />
        </MicroShell>
      )}
    </ActionGuardContext.Provider>
  );
}
