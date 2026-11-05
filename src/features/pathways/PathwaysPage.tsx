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
import './pathways.css';

type PlannedModule = {
  id: string;
  name: string;
  learns: string;
  value: string;
  buildsOn: string;
};

// Only M01 has registered lessons. These are orientation text, not course nodes.
const plannedModules: readonly PlannedModule[] = [
  {
    id: 'M02',
    name: 'Forstå og organisere historikken',
    learns:
      'Sammenligne versjoner, undersøke hvem som endret hva, og velge hvilke filer Git skal følge.',
    value:
      'Finne årsaken til en feil og forstå hvordan programmet har utviklet seg.',
    buildsOn: 'Du kan allerede lage og undersøke lokale commits fra M01.',
  },
  {
    id: 'M03',
    name: 'Arbeide på egne grener',
    learns:
      'Lage, bytte mellom og forstå branches uten å forstyrre hovedarbeidet.',
    value:
      'Prøve en ny funksjon mens en fungerende versjon fortsatt er tilgjengelig.',
    buildsOn: 'Du forstår commits og historikken fra M01–M02.',
  },
  {
    id: 'M04',
    name: 'Samle endringer',
    learns: 'Flette grener og forstå og løse en enkel merge-konflikt.',
    value: 'Samle funksjoner og feilrettinger fra flere utviklingsspor.',
    buildsOn: 'Du har jobbet med flere grener i M03.',
  },
  {
    id: 'M05',
    name: 'Dele prosjekter med GitHub',
    learns:
      'Forstå remote, clone, push, fetch og pull, og hva som faktisk blir delt.',
    value:
      'Ha en felles kopi av prosjektet og hente eller publisere endringer bevisst.',
    buildsOn: 'Du kan arbeide trygt med lokal historikk og grener.',
  },
  {
    id: 'M06',
    name: 'Samarbeide om kode',
    learns:
      'Bruke pull requests, gjennomgang og issues til å foreslå og diskutere endringer.',
    value:
      'La flere utviklere bidra uten at alle endringer går rett inn i hovedversjonen.',
    buildsOn: 'Du kan dele en branch på GitHub fra M05.',
  },
  {
    id: 'M07',
    name: 'Bruke Git i et eget prosjekt',
    learns:
      'Planlegge tydelige commits, undersøke feil, velge trygg gjenoppretting og fullføre en sammenhengende arbeidsflyt.',
    value:
      'Bruke versjonskontroll som et naturlig verktøy i videre programmeringsarbeid.',
    buildsOn: 'Du kombinerer ferdighetene fra M01–M06.',
  },
];

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
    // Exploring the orientation and roadmap is read-only. Never enrol a
    // learner, create catalogue rows or mutate their active programme here.
    if (itemId === undefined || item === undefined) return;
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
            Lær praktiske ferdigheter ved siden av studieprogrammet ditt, uten å
            bytte studieprogram eller miste framdriften der.
          </p>
          <div className="pathways-page__offer">
            <h2>
              <Link to={track}>Git &amp; GitHub</Link>
            </h2>
            <p>
              Lær å ta vare på endringer, finne igjen fungerende kode og etter
              hvert samarbeide om et prosjekt. M01 har fem tilgjengelige
              leksjoner; M02–M07 er planlagt.
            </p>
            <p>
              Du kan lese oversikten før du begynner. Ingen installasjon kreves.
            </p>
          </div>
        </>
      ) : itemId !== undefined && item === undefined ? (
        <>
          <h1>Leksjonen finnes ikke</h1>
          <p>Velg en av de fem tilgjengelige leksjonene i Git &amp; GitHub.</p>
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
            <h2 id="pathways-why">Hvorfor lære dette?</h2>
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
          <section aria-labelledby="pathways-roadmap">
            <h2 id="pathways-roadmap">Dette lærer du i M01–M07</h2>
            <p>
              Hver modul bygger videre på forrige. Bare M01 er tilgjengelig nå.
              De øvrige viser retningen videre, men har ingen leksjoner eller
              registrert framdrift ennå.
            </p>
            <ol className="pathways-track__roadmap">
              <li className="pathways-track__current">
                <div className="pathways-track__module-head">
                  <h3>M01 · Din første lokale versjon</h3>
                  <span className="pathways-track__availability">
                    Tilgjengelig
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
                <h4>Fem leksjoner i M01</h4>
                <ol>
                  {items.map((lesson) => (
                    <li key={lesson.id}>
                      <Link to={getPathwayLessonPath(lesson.id, rpg)}>
                        {lesson.title}
                      </Link>
                    </li>
                  ))}
                </ol>
                <Link
                  className="pathways-track__start"
                  to={getPathwayLessonPath(items[0]!.id, rpg)}
                >
                  Begynn med første leksjon
                </Link>
              </li>
              {plannedModules.map((module) => (
                <li key={module.id}>
                  <div className="pathways-track__module-head">
                    <h3>
                      {module.id} · {module.name}
                    </h3>
                    <span className="pathways-track__availability">
                      Planlagt
                    </span>
                  </div>
                  <p>
                    {module.learns} {module.value}
                  </p>
                  <p className="pathways-track__builds-on">
                    Bygger på: {module.buildsOn}
                  </p>
                </li>
              ))}
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
          <h1>Git &amp; GitHub</h1>
          {state === 'loading' ? (
            <p role="status">Åpner lokal framdrift…</p>
          ) : (
            <>
              <p role={state === 'error' ? 'alert' : 'status'}>
                {state === 'error'
                  ? 'Leksjonen kunne ikke åpnes. Lagret arbeid er bevart. Prøv igjen.'
                  : 'Åpne leksjonen i fanen som kan lagre, før du bruker den i denne skrivebeskyttede fanen.'}
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
        <p role="alert">Leksjonen finnes ikke i denne utgaven.</p>
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
                Lokal status:{' '}
                {progress?.status === 'completed'
                  ? 'Fullført'
                  : 'Ikke fullført'}
              </p>
              <p>
                Du styrer selv når du vil markere leksjonen som gjennomgått.
              </p>
              <button
                type="button"
                disabled={!coordination.canWrite || saving}
                onClick={() => void saveCompletion()}
              >
                {progress?.status === 'completed'
                  ? 'Åpne leksjonen igjen'
                  : 'Marker som fullført lokalt'}
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
