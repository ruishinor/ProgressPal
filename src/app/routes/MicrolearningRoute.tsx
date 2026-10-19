import { useEffect, useState } from 'react';
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  listOpenMicroSessions,
  listsRepeatApart,
  MicrolearningPage,
  type MicroAvailability,
  type MicroStep,
} from '@/features/microlearning';
import { loadRpgMicroAvailability } from '@/features/rpg';
import { useAppState } from '@/lib/appState';
import { requireProgrammeScope, type MicroSession } from '@/lib/domain';

const sessionParam = 'okt';
const cardParam = 'kort';
const finishedCard = 'ferdig';
const listParam = 'liste';
const repeatList = 'ov-igjen';

/** Marks history entries this route pushed itself while a learner moved on. */
type MicroHistoryState = { readonly microSession?: true } | null;

function searchFor(open: readonly MicroSession[], step: MicroStep): string {
  if (step === null) {
    return '';
  }
  if ('list' in step) {
    return `?${new URLSearchParams({ [listParam]: repeatList }).toString()}`;
  }
  const session = open.find((entry) => entry.id === step.sessionId);
  const card =
    session !== undefined && step.index >= session.cards.length
      ? finishedCard
      : String(step.index + 1);

  return `?${new URLSearchParams({ [sessionParam]: step.sessionId, [cardParam]: card }).toString()}`;
}

/**
 * Reads the step from the address, against the sessions open right now.
 * `redirect` means "go to this search instead" (replace, not push): a session
 * that is not open (unknown, not reached yet, another programme's) opens the
 * picker, an unknown card opens the session at its start, and a later card
 * this route did not reach itself (a typed or shared address) also starts the
 * session over, so no card is skipped. The «Øv igjen» list has an address
 * only while it has its own screen (`repeatApart`); otherwise it opens the
 * picker. A reload keeps the history entry's state, so it stays.
 */
function readStep(
  open: readonly MicroSession[],
  repeatApart: boolean,
  params: URLSearchParams,
  reachedHere: boolean,
): { step: MicroStep } | { redirect: string } {
  const sessionId = params.get(sessionParam);
  const list = params.get(listParam);

  if (sessionId === null) {
    if (list === null) {
      return { step: null };
    }

    return list === repeatList && repeatApart
      ? { step: { list: 'repeat' } }
      : { redirect: '' };
  }
  const session = open.find((entry) => entry.id === sessionId);

  if (session === undefined) {
    return { redirect: '' };
  }
  const card = params.get(cardParam);
  const index =
    card === finishedCard ? session.cards.length : Number(card ?? '1') - 1;
  const start = searchFor(open, { sessionId, index: 0 });

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index > session.cards.length ||
    (card !== finishedCard && index === session.cards.length)
  ) {
    return { redirect: start };
  }
  if (index > 0 && !reachedHere) {
    return { redirect: start };
  }

  return { step: { sessionId, index } };
}

/**
 * The microlearning route's programme and Campaign seam. The active
 * programme's scope says whether it ships microlearning and which sessions;
 * the Campaign's own position (the read model behind Home and the Map: which
 * quests are complete or reached, and the current one) says which are open
 * now: one short primer for what comes next, and the sessions that repeat the
 * topics the learner has already worked on. A read, never a write, and the
 * very same function (`loadRpgMicroAvailability`) that decides whether Home
 * offers the entry, so a direct visit and the Home entry cannot disagree. The
 * feature itself reads neither app state nor storage. A programme without a
 * bank gets the feature's short notice and no read at all, so another
 * programme's cards can never appear under it, and a failed read leaves
 * nothing open.
 *
 * The learner's place (picker, the «Øv igjen» list when it has its own
 * screen, or session and card) lives in the address, as in a track, and every
 * move on is a new history entry: Back returns to the previous card, the list
 * or the picker, Forward goes again where the learner has
 * already been, and «Lukk» still goes Home. The address is only read once the
 * answer is in, and only against what is open: it can never open a session
 * the picker would not list. A card returned to starts unanswered; nothing is
 * kept. This route never pushes an entry of its own accord and never listens
 * to `popstate`.
 */
export function MicrolearningRoute() {
  const scope = requireProgrammeScope(useAppState().programmeScope);
  const { programmeId } = scope;
  const bank = scope.content.microlearning;
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [read, setRead] = useState<{
    availability: MicroAvailability;
    programmeId: string;
  } | null>(null);

  useEffect(() => {
    if (bank === undefined) {
      return undefined;
    }
    let active = true;

    void loadRpgMicroAvailability(scope).then((availability) => {
      if (active) {
        setRead({ availability, programmeId });
      }
    });

    return () => {
      active = false;
    };
  }, [bank, programmeId, scope]);

  const availability: MicroAvailability =
    read?.programmeId === programmeId
      ? read.availability
      : { status: 'loading' };
  const open = listOpenMicroSessions(bank, availability);
  let step: MicroStep = null;

  if (bank !== undefined && availability.status === 'ready') {
    const reachedHere =
      (location.state as MicroHistoryState)?.microSession === true;
    const found = readStep(
      open,
      listsRepeatApart(bank, availability),
      params,
      reachedHere,
    );

    if ('redirect' in found) {
      return (
        <Navigate
          replace
          to={{ pathname: location.pathname, search: found.redirect }}
        />
      );
    }
    step = found.step;
  }

  return (
    <MicrolearningPage
      availability={availability}
      bank={bank}
      onStep={(next) =>
        navigate(
          { pathname: location.pathname, search: searchFor(open, next) },
          { state: { microSession: true } satisfies MicroHistoryState },
        )
      }
      step={step}
    />
  );
}
