import {
  ActionGuardContext,
  useActionGuard,
} from '@/features/microlearning/components/actionGuard';
import { CardFrame } from '@/features/microlearning/components/CardFrame';
import { MicroShell } from '@/features/microlearning/components/MicroShell';
import { SessionRunner } from '@/features/microlearning/components/SessionRunner';
import { RpgButton } from '@/features/rpg/components/RpgButton';
import type {
  MicroSession,
  MicroTrack,
  MicroTrackCategory,
} from '@/lib/domain';
import { rpgRoutePath } from '@/lib/routing/rpgRoutePaths';

/**
 * Where the learner is in a track: its entry (`null`), a category's list,
 * or an activity at a card index (`cards.length` is its finished screen).
 */
export type MicroTrackStep =
  | { readonly categoryId: string }
  | { readonly sessionId: string; readonly index: number }
  | null;

function CategoryPicker({
  onPick,
  track,
}: {
  onPick: (categoryId: string) => void;
  track: MicroTrack;
}) {
  const guard = useActionGuard();
  return (
    <CardFrame
      context={track.summary}
      kindLabel="Temaer"
      prompt={
        <h2 className="micro-card__kind" id="micro-track-category">
          Velg et tema du vil øve på.
        </h2>
      }
      title={track.title}
    >
      <ul
        aria-labelledby="micro-track-category"
        className="micro-sessions micro-categories"
      >
        {track.categories?.map((category) => (
          <li key={category.id}>
            <button
              className="rpg-button rpg-button--secondary micro-tap micro-category"
              disabled={category.sessionIds.length === 0}
              onClick={() => {
                if (guard.accept()) onPick(category.id);
              }}
              type="button"
            >
              <strong>{category.title}</strong>
              <span>{category.summary}</span>
              {category.sessionIds.length === 0 ? (
                <small>Ingen aktiviteter ennå</small>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </CardFrame>
  );
}

function TrackPicker({
  category,
  onCategories,
  onPick,
  track,
}: {
  category?: MicroTrackCategory;
  onCategories: () => void;
  onPick: (sessionId: string) => void;
  track: MicroTrack;
}) {
  const guard = useActionGuard();
  const sessions =
    category === undefined
      ? track.sessions
      : track.sessions.filter((session) =>
          category.sessionIds.includes(session.id),
        );
  const row = (session: MicroSession, index: number) => (
    <li key={session.id}>
      {/* A one-line row: the label is centred in the tall target. */}
      <button
        className="rpg-button rpg-button--secondary micro-tap"
        style={{ width: '100%' }}
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
      </button>
    </li>
  );

  return (
    <CardFrame
      action={
        category === undefined ? undefined : (
          <RpgButton
            variant="secondary"
            onClick={() => {
              if (guard.accept()) onCategories();
            }}
          >
            Tilbake til temaer
          </RpgButton>
        )
      }
      context={track.summary}
      kindLabel={`${category === undefined ? '' : category.title + ' · '}${sessions.length} aktiviteter`}
      prompt={
        // The cue sits last in what the card says, directly above the list.
        <h2 className="micro-card__kind" id="micro-track-choose">
          Velg en aktivitet
        </h2>
      }
      title={track.title}
    >
      <ul aria-labelledby="micro-track-choose" className="micro-sessions">
        {sessions.map(row)}
      </ul>
    </CardFrame>
  );
}

/**
 * A track: a short list of activities the learner may open at any time and
 * in any order, each played by the same `SessionRunner` as «Forbered deg» and
 * «Repeter». Nothing here depends on or changes the
 * Campaign: there is no availability rule, no progress read and no write. The
 * page does not hold its place itself: the app layer keeps `step` in the
 * address, so the browser's Back and Forward move between screens.
 */
export function MicroTrackPage({
  onStep,
  step,
  track,
}: {
  onStep: (step: MicroTrackStep) => void;
  step: MicroTrackStep;
  track: MicroTrack | undefined;
}) {
  const outer = useActionGuard();
  const presentation =
    track?.id === 'tenk-som-en-utvikler' ? 'utviklerblikk' : undefined;
  const session =
    step !== null && 'sessionId' in step
      ? track?.sessions.find((entry) => entry.id === step.sessionId)
      : undefined;
  const category = track?.categories?.find((entry) =>
    session !== undefined
      ? entry.sessionIds.includes(session.id)
      : step !== null && 'categoryId' in step && entry.id === step.categoryId,
  );

  if (track === undefined) {
    return (
      <MicroShell closeTo={rpgRoutePath}>
        <CardFrame
          action={<RpgButton href={rpgRoutePath}>Til startsiden</RpgButton>}
          context="Denne aktiviteten finnes ikke i programmet du har valgt."
          kindLabel="Aktiviteter"
          title="Denne aktiviteten er ikke tilgjengelig her"
        />
      </MicroShell>
    );
  }

  return (
    <ActionGuardContext.Provider value={outer}>
      {session === undefined || step === null || !('sessionId' in step) ? (
        <MicroShell
          closeTo={rpgRoutePath}
          name={track.title}
          presentation={presentation}
        >
          {track.categories !== undefined && category === undefined ? (
            <CategoryPicker
              onPick={(categoryId) => onStep({ categoryId })}
              track={track}
            />
          ) : (
            <TrackPicker
              key={category?.id ?? track.id}
              category={category}
              onCategories={() => onStep(null)}
              onPick={(sessionId) => onStep({ sessionId, index: 0 })}
              track={track}
            />
          )}
        </MicroShell>
      ) : (
        <SessionRunner
          key={session.id}
          presentation={presentation}
          name={track.title}
          onExit={() =>
            onStep(category === undefined ? null : { categoryId: category.id })
          }
          pickAnotherLabel="Velg en annen aktivitet"
          position={{
            index: step.index,
            onAdvance: (index) => onStep({ sessionId: session.id, index }),
          }}
          session={session}
        />
      )}
    </ActionGuardContext.Provider>
  );
}
