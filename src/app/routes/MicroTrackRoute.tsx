import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import { MicroTrackPage, type MicroTrackStep } from '@/features/microlearning';
import { useAppState } from '@/lib/appState';
import { requireProgrammeScope, type MicroTrack } from '@/lib/domain';

const categoryParam = 'kategori';
const activityParam = 'aktivitet';
const cardParam = 'kort';
const finishedCard = 'ferdig';

/** Marks history entries this route pushed itself while a learner moved on. */
type TrackHistoryState = { readonly microTrack?: true } | null;

function searchFor(track: MicroTrack, step: MicroTrackStep): string {
  if (step === null) {
    return '';
  }
  if ('categoryId' in step) {
    return `?${new URLSearchParams({ [categoryParam]: step.categoryId }).toString()}`;
  }
  const session = track.sessions.find((entry) => entry.id === step.sessionId);
  const card =
    session !== undefined && step.index >= session.cards.length
      ? finishedCard
      : String(step.index + 1);

  return `?${new URLSearchParams({ [activityParam]: step.sessionId, [cardParam]: card }).toString()}`;
}

/**
 * Reads the step from the address. `null` means "go to this search instead"
 * (replace, not push): an unknown activity opens the list, an unknown card
 * opens the activity at its start, and a later card that this route did not
 * reach itself (a typed or shared address) also starts the activity over, so
 * no card is skipped. A reload keeps the history entry's state, so it stays.
 */
function readStep(
  track: MicroTrack,
  params: URLSearchParams,
  reachedHere: boolean,
): { step: MicroTrackStep } | { redirect: string } {
  const sessionId = params.get(activityParam);

  if (sessionId === null) {
    const categoryId = params.get(categoryParam);
    if (categoryId === null) return { step: null };
    const category = track.categories?.find((entry) => entry.id === categoryId);
    return category !== undefined && category.sessionIds.length > 0
      ? { step: { categoryId } }
      : { redirect: '' };
  }
  const session = track.sessions.find((entry) => entry.id === sessionId);

  if (session === undefined) {
    return { redirect: '' };
  }
  const card = params.get(cardParam);
  const index =
    card === finishedCard ? session.cards.length : Number(card ?? '1') - 1;
  const start = searchFor(track, { sessionId, index: 0 });

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
 * The seam for a microlearning track. It reads only the active programme's
 * own content: a track is open regardless of the Campaign, so there is no
 * progress read and nothing is written. A programme without the track gets
 * the feature's short notice, never another programme's cards.
 *
 * The learner's place (list, or activity and card) lives in the address, and
 * every move on is a new history entry. So the browser's Back returns to the
 * previous card or to the list, Forward goes again where the learner has
 * already been, Back from the list leaves the track as normal, and «Lukk»
 * still goes Home. Nothing is trapped: this route never pushes an entry of
 * its own accord and never listens to `popstate`.
 */
export function MicroTrackRoute() {
  const { trackId } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const scope = requireProgrammeScope(useAppState().programmeScope);
  const track = scope.content.microlearning?.tracks?.find(
    (entry) => entry.id === trackId,
  );

  if (track === undefined) {
    return (
      <MicroTrackPage
        key={trackId}
        onStep={() => {}}
        step={null}
        track={undefined}
      />
    );
  }

  const reachedHere =
    (location.state as TrackHistoryState)?.microTrack === true;
  const read = readStep(track, params, reachedHere);

  if ('redirect' in read) {
    return (
      <Navigate
        replace
        to={{ pathname: location.pathname, search: read.redirect }}
      />
    );
  }

  return (
    <MicroTrackPage
      key={trackId}
      onStep={(step) =>
        navigate(
          { pathname: location.pathname, search: searchFor(track, step) },
          { state: { microTrack: true } satisfies TrackHistoryState },
        )
      }
      step={read.step}
      track={track}
    />
  );
}
