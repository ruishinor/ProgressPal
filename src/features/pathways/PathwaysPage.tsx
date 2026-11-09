import uiCopy from '@/ui-copy/interface.json';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { LessonView } from '@/features/lessons';
import { useAppState } from '@/lib/appState';
import {
  enrolInProgramme,
  ensureCourseCatalogFromSeed,
  getCourseItem,
  getProgress,
  listLessonPositions,
  listProgressEntries,
  listProgrammeEnrolments,
  upsertProgress,
} from '@/lib/db';
import type {
  LessonPosition,
  ProgrammeScope,
  ProgressEntry,
} from '@/lib/domain';
import {
  getGitPathwayPath,
  getPathwayLessonPath,
  pathwaysPath,
  rpgPathwaysPath,
} from '@/lib/routing/pathwaysPaths';
import './pathways.css';

type ProgressOverview = {
  status: 'loading' | 'ready' | 'error';
  entries: readonly ProgressEntry[];
  positions: readonly LessonPosition[];
};

function lessonStatus(
  row: ProgressEntry | undefined,
  position: LessonPosition | undefined,
) {
  if (row?.status === 'completed') return uiCopy.pathways.statusCompleted;
  return row !== undefined || position !== undefined
    ? uiCopy.pathways.statusStarted
    : uiCopy.pathways.statusNotStarted;
}

function moduleStatus(
  lessons: readonly { id: string }[],
  byId: ReadonlyMap<string, ProgressEntry>,
  positions: ReadonlyMap<string, LessonPosition>,
) {
  if (
    lessons.length > 0 &&
    lessons.every((lesson) => byId.get(lesson.id)?.status === 'completed')
  ) {
    return uiCopy.pathways.statusCompleted;
  }
  return lessons.some(
    (lesson) => byId.has(lesson.id) || positions.has(lesson.id),
  )
    ? uiCopy.pathways.statusStarted
    : uiCopy.pathways.statusNotStarted;
}

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
  const m01Items =
    scope.catalogue.units.find((unit) => unit.id === 'git-m01')?.items ?? [];
  const m02Items =
    scope.catalogue.units.find((unit) => unit.id === 'git-m02')?.items ?? [];
  const m03Items =
    scope.catalogue.units.find((unit) => unit.id === 'git-m03')?.items ?? [];
  const m04Items =
    scope.catalogue.units.find((unit) => unit.id === 'git-m04')?.items ?? [];
  const m05Items =
    scope.catalogue.units.find((unit) => unit.id === 'git-m05')?.items ?? [];
  const m06Items =
    scope.catalogue.units.find((unit) => unit.id === 'git-m06')?.items ?? [];
  const m07Items =
    scope.catalogue.units.find((unit) => unit.id === 'git-m07')?.items ?? [];
  const item = items.find((candidate) => candidate.id === itemId);
  const [state, setState] = useState<
    'loading' | 'ready' | 'read-only' | 'error'
  >('loading');
  const [retry, setRetry] = useState(0);
  const [progress, setProgress] = useState<ProgressEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [overviewProgress, setOverviewProgress] = useState<ProgressOverview>({
    status: 'loading',
    entries: [],
    positions: [],
  });
  // StrictMode/effect re-entry shares one preparation, including the refresh
  // between the two coordinated writes. Each repository remains idempotent.
  const preparation = useRef<Promise<void> | null>(null);
  const isOverview = pathname === overview;

  // Both overview routes read existing records only. No enrolment or catalogue
  // synchronization can occur here, including when the tab cannot write.
  useEffect(() => {
    if (itemId !== undefined) return;
    let active = true;
    void Promise.all([listProgressEntries(), listLessonPositions()])
      .then(([entries, positions]) => {
        if (active)
          setOverviewProgress({ status: 'ready', entries, positions });
      })
      .catch(() => {
        if (active) {
          setOverviewProgress({ status: 'error', entries: [], positions: [] });
        }
      });
    return () => {
      active = false;
    };
  }, [itemId, pathname]);

  const progressById = useMemo(() => {
    const ids = new Set(items.map((lesson) => lesson.id));
    return new Map(
      overviewProgress.entries
        .filter((entry) => ids.has(entry.itemId))
        .map((entry) => [entry.itemId, entry] as const),
    );
  }, [items, overviewProgress.entries]);
  const positionById = useMemo(() => {
    const ids = new Set(items.map((lesson) => lesson.id));
    return new Map(
      overviewProgress.positions
        .filter(
          (position) =>
            position.programmeId === scope.programmeId &&
            ids.has(position.itemId),
        )
        .map((position) => [position.itemId, position] as const),
    );
  }, [items, overviewProgress.positions, scope.programmeId]);
  const completedCount = items.filter(
    (lesson) => progressById.get(lesson.id)?.status === 'completed',
  ).length;
  const latestActivity = (id: string) => {
    const rowTime = progressById.get(id)?.updatedAt ?? '';
    const positionTime = positionById.get(id)?.updatedAt ?? '';
    return rowTime > positionTime ? rowTime : positionTime;
  };
  const startedLessons = items
    .filter((lesson) => {
      const row = progressById.get(lesson.id);
      return (
        row?.status !== 'completed' &&
        (row !== undefined || positionById.has(lesson.id))
      );
    })
    .sort((a, b) => latestActivity(b.id).localeCompare(latestActivity(a.id)));
  const allCompleted = items.length > 0 && completedCount === items.length;
  // Resume the latest unfinished lesson; otherwise suggest the first not
  // completed. The lesson surface independently restores saved step position.
  const continuation = allCompleted
    ? undefined
    : (startedLessons[0] ??
      items.find(
        (lesson) => progressById.get(lesson.id)?.status !== 'completed',
      ));
  const hasProgress = progressById.size > 0 || positionById.size > 0;
  const activeModuleId = scope.catalogue.units.find((unit) =>
    unit.items.some((lesson) => lesson.id === continuation?.id),
  )?.id;
  const overviewSummary =
    overviewProgress.status === 'loading' ? (
      <p role="status">{uiCopy.surfaces.pathwaysScreen.leserLokalFramdrift}</p>
    ) : overviewProgress.status === 'error' ? (
      <p role="status">
        {uiCopy.surfaces.pathwaysScreen.lokalFramdriftErIkkeTilgjengeligNaDuKan}
      </p>
    ) : (
      <div className="pathways-track__progress-summary">
        <p>
          {completedCount} av {items.length} leksjoner markert fullført.
        </p>
        <details className="pathways-track__progress-info">
          <summary aria-label={uiCopy.pathways.progressInfoLabel}>(i)</summary>
          <p>{uiCopy.pathways.progressInfoBody}</p>
        </details>
        {allCompleted ? (
          <p>
            {
              uiCopy.surfaces.pathwaysScreen
                .alleLeksjoneneErMarkertFullfortDuKanApne
            }
          </p>
        ) : continuation ? (
          <Link
            className="pathways-track__start"
            to={getPathwayLessonPath(continuation.id, rpg)}
          >
            {startedLessons.length > 0
              ? `Fortsett: ${continuation.title}`
              : hasProgress
                ? `Neste leksjon: ${continuation.title}`
                : uiCopy.surfaces.pathwaysScreen.begynnMedForsteLeksjon}
          </Link>
        ) : null}
      </div>
    );

  useEffect(() => {
    // Exploring the orientation and roadmap is read-only. Never enrol a
    // learner, create catalogue rows or mutate their active programme here.
    const selectedItemId = item?.id;
    if (itemId === undefined || selectedItemId === undefined) return;
    const stableItemId: string = selectedItemId;
    let current = true;
    async function prepare() {
      const [enrolments, storedItem] = await Promise.all([
        listProgrammeEnrolments(),
        getCourseItem(stableItemId),
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
      const timestamp = new Date().toISOString();
      const status = existing?.status === 'completed' ? 'started' : 'completed';
      const saved = await runLocalMutation(
        () =>
          upsertProgress({
            ...existing,
            itemId: item.id,
            confidence: existing?.confidence ?? 0,
            status,
            startedAt: existing?.startedAt ?? timestamp,
            completedAt: status === 'completed' ? timestamp : undefined,
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
    <section className="page-section pathways-page" lang="nb">
      <nav aria-label={uiCopy.surfaces.pathwaysScreen.pathways}>
        <div className="action-row">
          <Link to={home}>
            Tilbake til{' '}
            {programmeScope?.title ??
              uiCopy.surfaces.pathwaysScreen.studieprogrammet}
          </Link>
          {!isOverview && (
            <Link to={overview}>
              {uiCopy.surfaces.pathwaysScreen.allePathways}
            </Link>
          )}
          {itemId !== undefined && (
            <Link to={track}>
              {uiCopy.surfaces.pathwaysScreen.gitGitHubOversikt}
            </Link>
          )}
        </div>
      </nav>
      {isOverview ? (
        <>
          <h1>{uiCopy.surfaces.pathwaysScreen.pathways}</h1>
          <p>
            {
              uiCopy.surfaces.pathwaysScreen
                .laerPraktiskeFerdigheterVedSidenAvStudieprogrammetDitt
            }
          </p>
          <div className="pathways-page__offer">
            <h2>
              <Link to={track}>{uiCopy.surfaces.pathwaysScreen.gitGitHub}</Link>
            </h2>
            <p>
              {uiCopy.surfaces.pathwaysScreen.laerATaVarePaEndringerFinneIgjen}
            </p>
            <p>
              {
                uiCopy.surfaces.pathwaysScreen
                  .duKanLeseOversiktenForDuInstallererGit
              }
            </p>
            {overviewSummary}
          </div>
        </>
      ) : itemId !== undefined && item === undefined ? (
        <>
          <h1>{uiCopy.surfaces.pathwaysScreen.leksjonenFinnesIkke}</h1>
          <p>
            {
              uiCopy.surfaces.pathwaysScreen
                .velgEnAvDeTilgjengeligeLeksjoneneIGit
            }
          </p>
        </>
      ) : itemId === undefined ? (
        <div className="pathways-track">
          <h1>Git &amp; GitHub: fra første endring til samarbeid</h1>
          <p className="pathways-track__lead">
            Du trenger ikke kunne programmere eller bruke en terminal fra før.
            Først skal du forstå hvorfor utviklere trenger versjonskontroll.
            Deretter prøver du det selv, med små, ufarlige tekstfiler.
          </p>
          <section aria-labelledby="pathways-why">
            <h2 id="pathways-why">{uiCopy.pathways.whyLearnHeading}</h2>
            <p>
              Du bygger et lite program. Det virker. Du endrer koden for å legge
              til en funksjon, men nå slutter noe annet å fungere. Hva endret
              du, og hvordan finner du tilbake til den fungerende utgaven? Hvis
              du bare lagrer over den samme filen, må du huske forskjellene selv
              eller lete blant kopier som «prosjekt-ny», «prosjekt-ny2» og
              «prosjekt-endelig».
            </p>
            <p>
              I et gruppeprosjekt blir det vanskeligere: én student retter en
              feil, en annen endrer grensesnittet, og en tredje lager en ny
              funksjon. Dere trenger å vite hvilke endringer som hører sammen,
              hvem som gjorde dem, og hvordan arbeidet kan samles uten å miste
              hverandres bidrag.
            </p>
          </section>
          <section aria-labelledby="pathways-concepts">
            <h2 id="pathways-concepts">Hva gjør Git og GitHub?</h2>
            <p>
              <strong>Git</strong> er et versjonskontrollsystem. Det holder
              orden på prosjektets versjonshistorikk og lar deg undersøke
              endringer. Du arbeider i en prosjektmappe, kalt et
              <strong> repository</strong> eller <strong>repo</strong>, og kan
              velge å registrere en bestemt versjon med en
              <strong> commit</strong>. Git kan brukes på din egen datamaskin
              uten nettilgang. En commit blir ikke automatisk delt.
            </p>
            <p>
              <strong>GitHub</strong> er en nettplattform der Git-prosjekter kan
              oppbevares og deles. Den gir også verktøy for samarbeid, som å
              foreslå endringer, diskutere kode og følge opp oppgaver. Git lager
              og organiserer historikken; GitHub er ett mulig sted å samarbeide
              rundt den. GitLab og Bitbucket er andre slike plattformer.
            </p>
            <details>
              <summary>
                Hva med kopierte mapper, skylagring og sikkerhetskopier?
              </summary>
              <p>
                En kopi av prosjektmappen kan være nyttig for å bevare en
                utgave, og skylagring kan gjøre filer tilgjengelige på flere
                enheter. Men ingen av delene erstatter uten videre Gits
                organiserte historikk, utvalg av endringer og arbeid med
                parallelle grener. Git er heller ikke automatisk en trygg
                sikkerhetskopi: hvis hele den lokale prosjektmappen, inkludert
                den skjulte .git-mappen, forsvinner, kan historikken forsvinne
                med den. Bevar verdifullt arbeid separat og kontroller at det
                faktisk kan gjenopprettes.
              </p>
              <p>
                Git krever at du lærer en arbeidsmåte. Samtidige endringer kan
                gi konflikter som må løses; Git avgjør ikke om koden er riktig
                eller trygg. Ikke legg passord eller andre hemmeligheter i
                prosjektets historikk.
              </p>
            </details>
          </section>
          {overviewSummary}
          <section aria-labelledby="pathways-roadmap">
            <h2 id="pathways-roadmap">Dette lærer du i M01–M07</h2>
            <p>
              Hver modul bygger videre på forrige. Alle M01–M07 er
              tilgjengelige. M07 samler ferdighetene i ett lite
              utviklingsprosjekt og avslutter Foundations. Du kan åpne
              leksjonene igjen når du vil.
            </p>
            <ol className="pathways-track__roadmap">
              <li className="pathways-track__current">
                <div className="pathways-track__module-head">
                  <h3>M01 · Din første lokale versjon</h3>
                  <span className="pathways-track__availability">
                    {overviewProgress.status === 'ready'
                      ? moduleStatus(m01Items, progressById, positionById)
                      : overviewProgress.status === 'error'
                        ? 'Status utilgjengelig'
                        : 'Leser status…'}
                  </span>
                </div>
                <p>
                  Lær å opprette et lokalt repo, kontrollere endringer, velge
                  hva neste commit skal inneholde, og undersøke resultatet. Slik
                  får du kontroll før du begynner å dele med andre.
                </p>
                <p>
                  Du begynner med hvorfor Git er nyttig. Deretter bruker du
                  Windows PowerShell og en separat øvingsmappe til å lage og
                  rette dine første commits.
                </p>
                <details
                  className="pathways-track__lesson-list"
                  open={
                    activeModuleId === 'git-m01' || activeModuleId === undefined
                  }
                >
                  <summary>Leksjoner i M01 ({m01Items.length})</summary>
                  <ol>
                    {m01Items.map((lesson) => (
                      <li key={lesson.id}>
                        <Link to={getPathwayLessonPath(lesson.id, rpg)}>
                          {lesson.title}
                        </Link>
                        {overviewProgress.status === 'ready' && (
                          <span className="pathways-track__lesson-status">
                            {lessonStatus(
                              progressById.get(lesson.id),
                              positionById.get(lesson.id),
                            )}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
              </li>
              <li className="pathways-track__current">
                <div className="pathways-track__module-head">
                  <h3>M02 · Finn og forstå tidligere versjoner</h3>
                  <span className="pathways-track__availability">
                    {overviewProgress.status === 'ready'
                      ? moduleStatus(m02Items, progressById, positionById)
                      : overviewProgress.status === 'error'
                        ? 'Status utilgjengelig'
                        : 'Leser status…'}
                  </span>
                </div>
                <p>
                  Les historikk, finn endringen som innførte en feil, sammenlign
                  versjoner og rett bare det som er feil. Senere nyttig arbeid
                  skal beholdes. Du får en separat øvingsmappe og en oppgave der
                  det riktige valget kan være å la koden stå.
                </p>
                <p className="pathways-track__builds-on">
                  Bygger på: M01s repository, status, staging og commits.
                </p>
                <details
                  className="pathways-track__lesson-list"
                  open={activeModuleId === 'git-m02'}
                >
                  <summary>Leksjoner i M02 ({m02Items.length})</summary>
                  <ol>
                    {m02Items.map((lesson) => (
                      <li key={lesson.id}>
                        <Link to={getPathwayLessonPath(lesson.id, rpg)}>
                          {lesson.title}
                        </Link>
                        {overviewProgress.status === 'ready' && (
                          <span className="pathways-track__lesson-status">
                            {lessonStatus(
                              progressById.get(lesson.id),
                              positionById.get(lesson.id),
                            )}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
              </li>
              <li className="pathways-track__current">
                <div className="pathways-track__module-head">
                  <h3>M03 · Brancher og merge</h3>
                  <span className="pathways-track__availability">
                    {overviewProgress.status === 'ready'
                      ? moduleStatus(m03Items, progressById, positionById)
                      : overviewProgress.status === 'error'
                        ? 'Status utilgjengelig'
                        : 'Leser status…'}
                  </span>
                </div>
                <p>
                  Arbeid på en egen branch, samle endringer med merge og løs en
                  reell konflikt. Se også hvorfor en konfliktfri merge kan gi
                  feil resultat og krever kontroll av funksjonaliteten.
                </p>
                <p className="pathways-track__builds-on">
                  Bygger på: Commits fra M01 og historikk/diff fra M02.
                </p>
                <details
                  className="pathways-track__lesson-list"
                  open={activeModuleId === 'git-m03'}
                >
                  <summary>Leksjoner i M03 ({m03Items.length})</summary>
                  <ol>
                    {m03Items.map((lesson) => (
                      <li key={lesson.id}>
                        <Link to={getPathwayLessonPath(lesson.id, rpg)}>
                          {lesson.title}
                        </Link>
                        {overviewProgress.status === 'ready' && (
                          <span className="pathways-track__lesson-status">
                            {lessonStatus(
                              progressById.get(lesson.id),
                              positionById.get(lesson.id),
                            )}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
              </li>
              <li className="pathways-track__current">
                <div className="pathways-track__module-head">
                  <h3>M04 · Fra lokal Git til GitHub</h3>
                  <span className="pathways-track__availability">
                    {overviewProgress.status === 'ready'
                      ? moduleStatus(m04Items, progressById, positionById)
                      : overviewProgress.status === 'error'
                        ? 'Status utilgjengelig'
                        : 'Leser status…'}
                  </span>
                </div>
                <p>
                  Del og hent Git-historikk med remotes, push, clone, fetch og
                  pull. Lær å skille lokal main fra origin/main og forstå
                  autentisering, tilgang og hva som ikke bør publiseres.
                </p>
                <p className="pathways-track__builds-on">
                  Bygger på: Branches og merge fra M03.
                </p>
                <details
                  className="pathways-track__lesson-list"
                  open={activeModuleId === 'git-m04'}
                >
                  <summary>Leksjoner i M04 ({m04Items.length})</summary>
                  <ol>
                    {m04Items.map((lesson) => (
                      <li key={lesson.id}>
                        <Link to={getPathwayLessonPath(lesson.id, rpg)}>
                          {lesson.title}
                        </Link>
                        {overviewProgress.status === 'ready' && (
                          <span className="pathways-track__lesson-status">
                            {lessonStatus(
                              progressById.get(lesson.id),
                              positionById.get(lesson.id),
                            )}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
              </li>
              <li className="pathways-track__current">
                <div className="pathways-track__module-head">
                  <h3>M05 · Samarbeid med pull requests</h3>
                  <span className="pathways-track__availability">
                    {overviewProgress.status === 'ready'
                      ? moduleStatus(m05Items, progressById, positionById)
                      : overviewProgress.status === 'error'
                        ? 'Status utilgjengelig'
                        : 'Leser status…'}
                  </span>
                </div>
                <p>
                  Foreslå en avgrenset endring, undersøk diff og review,
                  forbedre samme branch og vurder kontroller og merge. Øv med
                  ekte lokal Git, og forstå hva GitHub legger til.
                </p>
                <p className="pathways-track__builds-on">
                  Bygger på: Deling av Git-historikk fra M04.
                </p>
                <details
                  className="pathways-track__lesson-list"
                  open={activeModuleId === 'git-m05'}
                >
                  <summary>Leksjoner i M05 ({m05Items.length})</summary>
                  <ol>
                    {m05Items.map((lesson) => (
                      <li key={lesson.id}>
                        <Link to={getPathwayLessonPath(lesson.id, rpg)}>
                          {lesson.title}
                        </Link>
                        {overviewProgress.status === 'ready' && (
                          <span className="pathways-track__lesson-status">
                            {lessonStatus(
                              progressById.get(lesson.id),
                              positionById.get(lesson.id),
                            )}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
              </li>
              <li className="pathways-track__current">
                <div className="pathways-track__module-head">
                  <h3>M06 · Feil og trygg gjenoppretting</h3>
                  <span className="pathways-track__availability">
                    {overviewProgress.status === 'ready'
                      ? moduleStatus(m06Items, progressById, positionById)
                      : overviewProgress.status === 'error'
                        ? 'Status utilgjengelig'
                        : 'Leser status…'}
                  </span>
                </div>
                <p>
                  Undersøk hva som gikk galt før du endrer filer eller
                  historikk. Lær forskjellen på restore, reset, stash, reflog og
                  revert, og øv i et eget ufarlig repository.
                </p>
                <p className="pathways-track__builds-on">
                  Bygger på: Lokalt arbeid, historikk og samarbeid fra M01–M05.
                </p>
                <details
                  className="pathways-track__lesson-list"
                  open={activeModuleId === 'git-m06'}
                >
                  <summary>Leksjoner i M06 ({m06Items.length})</summary>
                  <ol>
                    {m06Items.map((lesson) => (
                      <li key={lesson.id}>
                        <Link to={getPathwayLessonPath(lesson.id, rpg)}>
                          {lesson.title}
                        </Link>
                        {overviewProgress.status === 'ready' && (
                          <span className="pathways-track__lesson-status">
                            {lessonStatus(
                              progressById.get(lesson.id),
                              positionById.get(lesson.id),
                            )}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
              </li>
              <li className="pathways-track__current">
                <div className="pathways-track__module-head">
                  <h3>M07 · Git og GitHub i et utviklingsprosjekt</h3>
                  <span className="pathways-track__availability">
                    {overviewProgress.status === 'ready'
                      ? moduleStatus(m07Items, progressById, positionById)
                      : overviewProgress.status === 'error'
                        ? 'Status utilgjengelig'
                        : 'Leser status…'}
                  </span>
                </div>
                <p>
                  Gjennomfør et lite påmeldingsprosjekt fra oppgave og branch
                  til funksjonskontroll, review, integrering og overlevering.
                  Lokal Git-praksis krever ikke GitHub-konto.
                </p>
                <p className="pathways-track__builds-on">
                  Bygger på: M01–M06, inkludert samarbeid og trygg feilretting.
                </p>
                <details
                  className="pathways-track__lesson-list"
                  open={activeModuleId === 'git-m07'}
                >
                  <summary>Leksjoner i M07 ({m07Items.length})</summary>
                  <ol>
                    {m07Items.map((lesson) => (
                      <li key={lesson.id}>
                        <Link to={getPathwayLessonPath(lesson.id, rpg)}>
                          {lesson.title}
                        </Link>
                        {overviewProgress.status === 'ready' && (
                          <span className="pathways-track__lesson-status">
                            {lessonStatus(
                              progressById.get(lesson.id),
                              positionById.get(lesson.id),
                            )}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
              </li>
            </ol>
          </section>
          <p>
            Første steg er lokal Git, fordi du trenger å forstå og kontrollere
            dine egne endringer før det er nyttig å dele dem på GitHub. Du
            trenger ingen GitHub-konto for M01.
          </p>
        </div>
      ) : state !== 'ready' ? (
        <>
          <h1>{uiCopy.surfaces.pathwaysScreen.gitGitHub}</h1>
          {state === 'loading' ? (
            <p role="status">
              {uiCopy.surfaces.pathwaysScreen.apnerLokalFramdrift}
            </p>
          ) : (
            <>
              <p role={state === 'error' ? 'alert' : 'status'}>
                {state === 'error'
                  ? uiCopy.surfaces.pathwaysScreen
                      .leksjonenKunneIkkeApnesLagretArbeidErBevart
                  : uiCopy.surfaces.pathwaysScreen
                      .apneLeksjonenIFanenSomKanLagreFor}
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
                {uiCopy.surfaces.pathwaysScreen.provIgjen}
              </button>
            </>
          )}
        </>
      ) : item === undefined ? (
        <p role="alert">
          {uiCopy.surfaces.pathwaysScreen.leksjonenFinnesIkkeIDenneUtgaven}
        </p>
      ) : (
        <LessonView
          key={item.id}
          itemId={item.id}
          scope={scope}
          lessonPath={(id) => getPathwayLessonPath(id, rpg)}
          presentation={rpg ? 'rpg' : 'classic'}
          footer={
            <section
              aria-label={uiCopy.surfaces.pathwaysScreen.lokalLeksjonsstatus}
            >
              <p role="status">
                Lokal status:{' '}
                {progress?.status === 'completed'
                  ? uiCopy.surfaces.pathwaysScreen.fullfort
                  : uiCopy.surfaces.pathwaysScreen.ikkeFullfort}
              </p>
              <p>
                {
                  uiCopy.surfaces.pathwaysScreen
                    .duStyrerSelvNarDuVilMarkereLeksjonen
                }
              </p>
              <button
                type="button"
                disabled={!coordination.canWrite || saving}
                onClick={() => void saveCompletion()}
              >
                {progress?.status === 'completed'
                  ? uiCopy.surfaces.pathwaysScreen.apneLeksjonenIgjen
                  : uiCopy.surfaces.pathwaysScreen.markerSomFullfortLokalt}
              </button>
              {saveFailed && (
                <p role="alert">
                  {
                    uiCopy.surfaces.pathwaysScreen
                      .statusKunneIkkeLagresProvIgjenLagredeSvar
                  }
                </p>
              )}
            </section>
          }
        />
      )}
    </section>
  );
}
