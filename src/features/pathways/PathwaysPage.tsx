import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { LessonView } from '@/features/lessons';
import { useAppState } from '@/lib/appState';
import {
  enrolInProgramme,
  ensureCourseCatalogFromSeed,
  getCourseItem,
  getProgress,
  listProgrammeEnrolments,
  upsertProgress,
} from '@/lib/db';
import type { ProgrammeScope, ProgressEntry } from '@/lib/domain';
import {
  getGitPathwayPath,
  getPathwayLessonPath,
  pathwaysPath,
  rpgPathwaysPath,
} from '@/lib/routing/pathwaysPaths';

export function PathwaysPage({ scope }: { scope: ProgrammeScope }) {
  const { pathname } = useLocation();
  const { itemId } = useParams();
  const rpg = pathname.startsWith('/rpg/');
  const home = rpg ? '/rpg' : '/dashboard';
  const overview = rpg ? rpgPathwaysPath : pathwaysPath;
  const track = getGitPathwayPath(rpg);
  const { coordination, programmeScope, runLocalMutation } = useAppState();
  const items = useMemo(
    () => scope.catalogue.units.flatMap((unit) => unit.items),
    [scope],
  );
  const item = items.find((candidate) => candidate.id === itemId);
  const [state, setState] = useState<
    'loading' | 'ready' | 'read-only' | 'error'
  >('loading');
  const [retry, setRetry] = useState(0);
  const [progress, setProgress] = useState<ProgressEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // StrictMode/effect re-entry shares one preparation, including the refresh
  // between the two coordinated writes. Each repository remains idempotent.
  const preparation = useRef<Promise<void> | null>(null);
  const isOverview = pathname === overview;

  useEffect(() => {
    if (isOverview || (itemId !== undefined && item === undefined)) return;
    let current = true;
    async function prepare() {
      const [enrolments, storedItem] = await Promise.all([
        listProgrammeEnrolments(),
        getCourseItem(items[0]!.id),
      ]);
      const enrolled = enrolments.some(
        (row) => row.programmeId === scope.programmeId,
      );
      if (!enrolled || storedItem === null) {
        if (!coordination.canWrite) {
          if (current) setState('read-only');
          return;
        }
        preparation.current ??= (async () => {
          await runLocalMutation(
            () => ensureCourseCatalogFromSeed(scope.catalogue),
            { invalidateRoute: false },
          );
          await runLocalMutation(() => enrolInProgramme(scope.programmeId), {
            invalidateRoute: false,
          });
        })();
        await preparation.current;
      }
      const saved = itemId === undefined ? null : await getProgress(itemId);
      if (current) {
        setProgress(saved);
        setState('ready');
      }
    }
    void prepare().catch(() => {
      if (current) setState('error');
    });
    return () => {
      current = false;
    };
  }, [
    coordination.canWrite,
    isOverview,
    item,
    itemId,
    items,
    retry,
    runLocalMutation,
    scope,
  ]);

  async function saveCompletion() {
    if (item === undefined || !coordination.canWrite || saving) return;
    setSaving(true);
    setSaveFailed(false);
    try {
      const existing = await getProgress(item.id);
      const saved = await runLocalMutation(
        () =>
          upsertProgress({
            ...existing,
            itemId: item.id,
            confidence: existing?.confidence ?? 0,
            status: existing?.status === 'completed' ? 'started' : 'completed',
          }),
        { invalidateRoute: false },
      );
      setProgress(saved);
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-section" lang="nb">
      <nav aria-label="Pathways">
        <div className="action-row">
          <Link to={home}>
            Tilbake til {programmeScope?.title ?? 'studieprogrammet'}
          </Link>
          {!isOverview && <Link to={overview}>Alle Pathways</Link>}
          {itemId !== undefined && (
            <Link to={track}>Git &amp; GitHub — oversikt</Link>
          )}
        </div>
      </nav>
      {isOverview ? (
        <>
          <h1>Pathways</h1>
          <p>
            Lær ferdigheter på tvers av studieprogrammene. Studieprogrammet ditt
            endres ikke når du åpner en Pathway.
          </p>
          <h2>
            <Link to={track}>Git &amp; GitHub</Link>
          </h2>
          <p>
            Fem leksjoner fra første møte med Git til selektiv staging og
            kontroll av en commit. Fremdriften lagres separat. Ingen XP
            tildeles.
          </p>
        </>
      ) : itemId !== undefined && item === undefined ? (
        <>
          <h1>Leksjonen finnes ikke</h1>
          <p>Velg en av de fem leksjonene i Git &amp; GitHub.</p>
        </>
      ) : state !== 'ready' ? (
        <>
          <h1>Git &amp; GitHub</h1>
          {state === 'loading' ? (
            <p role="status">Åpner lokal fremdrift…</p>
          ) : (
            <>
              <p role={state === 'error' ? 'alert' : 'status'}>
                {state === 'error'
                  ? 'Pathway kunne ikke åpnes. Lagret arbeid er bevart. Prøv igjen.'
                  : 'Åpne Pathway i fanen som kan lagre, før du bruker den i denne skrivebeskyttede fanen.'}
              </p>
              <button
                type="button"
                disabled={!coordination.canWrite}
                onClick={() => {
                  preparation.current = null;
                  setState('loading');
                  setRetry((value) => value + 1);
                }}
              >
                Prøv igjen
              </button>
            </>
          )}
        </>
      ) : item === undefined ? (
        <>
          <h1>Git &amp; GitHub</h1>
          <p>
            Fem leksjoner. Fremdriften er uavhengig av studieprogrammet ditt.
            Ingen XP tildeles.
          </p>
          <ol>
            {items.map((lesson) => (
              <li key={lesson.id}>
                <Link to={getPathwayLessonPath(lesson.id, rpg)}>
                  {lesson.title}
                </Link>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <LessonView
          key={item.id}
          itemId={item.id}
          scope={scope}
          lessonPath={(id) => getPathwayLessonPath(id, rpg)}
          presentation={rpg ? 'rpg' : 'classic'}
          footer={
            <section aria-label="Lokal leksjonsstatus">
              <p role="status">
                Local status:{' '}
                {progress?.status === 'completed'
                  ? 'Completed'
                  : 'Not completed'}
              </p>
              <p>Dette er din egen markering, ikke en faglig vurdering.</p>
              <button
                type="button"
                disabled={!coordination.canWrite || saving}
                onClick={() => void saveCompletion()}
              >
                {progress?.status === 'completed'
                  ? 'Reopen lesson'
                  : 'Mark locally complete'}
              </button>
              {saveFailed && (
                <p role="alert">
                  Status kunne ikke lagres. Prøv igjen. Lagrede svar er bevart.
                </p>
              )}
            </section>
          }
        />
      )}
    </section>
  );
}
