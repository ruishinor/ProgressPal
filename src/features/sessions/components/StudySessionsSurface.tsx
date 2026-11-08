import uiCopy from '@/ui-copy/interface.json';
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SessionAssignmentCorrection } from './SessionAssignmentCorrection';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField } from '@/components/ui/FormField';
import { LoadingState } from '@/components/ui/LoadingState';
import { NumberInput } from '@/components/ui/NumberInput';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { TextInput } from '@/components/ui/TextInput';
import { Toast, ToastStack } from '@/components/ui/Toast';
import { useAppState } from '@/lib/appState';
import {
  courseMapPath,
  getCourseItemDetailPath,
} from '@/features/course/paths';
import {
  buildSessionCatalog,
  buildSessionLedgerRow,
  buildStudySessionInput,
  createIdleLiveSession,
  createManualSessionFormValues,
  discardLiveSession,
  finishLiveSession,
  getLiveSessionElapsedMilliseconds,
  getModeLabel,
  getStudySessionModeOptions,
  getUnitScopedItemOptions,
  pauseLiveSession,
  resumeLiveSession,
  startLiveSession,
  validateManualSessionForm,
  type LiveSessionState,
  type ManualSessionFormValues,
  type SessionCatalog,
  type SessionLedgerRow,
  type SessionValidationErrors,
} from '@/features/sessions/model';
import {
  addStudySessionAndAwardXp,
  readStudySessionLedgerRows,
  readStudySessionsSurfaceData,
} from '@/lib/db';
import { requireProgrammeScope } from '@/lib/domain';
import type { StudySessionSaveResult } from '@/lib/sessions';
import { getRpgResourcePath, rpgRoutePath } from '@/lib/routing/rpgRoutePaths';

// The same study-session surface renders in two shells: the classic Study
// Sessions route and the RPG Focus route. Only the section wrapper and the
// route header differ by variant; the focus/session flow, controls, state, and
// engine writes are identical.
type StudySessionsSurfaceVariant = 'classic' | 'rpg';

type StudySessionsSurfaceProps = {
  onProgressSaved?: (result: StudySessionSaveResult) => void;
  saveFeedback?: ReactNode;
  variant?: StudySessionsSurfaceVariant;
};

type PageStatus = 'error' | 'loading' | 'ready';

type SessionsPageData = {
  catalog: SessionCatalog;
  ledgerRows: SessionLedgerRow[];
  lockedUnitId: string | null;
  prefilledItemId: string;
  prefillItemTitle: string | null;
};

type SessionsPageState = {
  data: SessionsPageData | null;
  error: string | null;
  status: PageStatus;
};

type ToastState = {
  description: string;
  title: string;
  tone: 'danger' | 'success';
} | null;

const initialPageState: SessionsPageState = {
  data: null,
  error: null,
  status: 'loading',
};

function RpgFocusDisclosureCard({
  enabled,
  label,
  ...cardProps
}: {
  enabled: boolean;
  label: string;
} & ComponentProps<typeof Card>) {
  const card = <Card {...cardProps} />;

  if (!enabled) {
    return card;
  }

  return (
    <details className="rpg-focus__disclosure">
      <summary>{label}</summary>
      <div className="rpg-focus__disclosure-content">{card}</div>
    </details>
  );
}

function nowClockSnapshot() {
  return {
    iso: new Date().toISOString(),
    milliseconds: Date.now(),
  };
}

async function loadSessionsPageData(
  prefilledItemId: string | null,
): Promise<SessionsPageData> {
  const { context: catalog, ledgerRows } = await readStudySessionsSurfaceData(
    (units, items) => {
      const catalog = buildSessionCatalog(units, items);

      return {
        context: catalog,
        projectSession: (session) => buildSessionLedgerRow(session, catalog),
      };
    },
  );

  if (prefilledItemId !== null && prefilledItemId.trim().length > 0) {
    const item = catalog.itemById.get(prefilledItemId) ?? null;

    if (item === null) {
      throw new Error(
        'The requested prefilled task could not be found in the local catalog.',
      );
    }

    return {
      catalog,
      ledgerRows,
      lockedUnitId: item.unitId,
      prefilledItemId: item.id,
      prefillItemTitle: item.title,
    };
  }

  return {
    catalog,
    ledgerRows,
    lockedUnitId: null,
    prefilledItemId: '',
    prefillItemTitle: null,
  };
}

function getNextItemId(
  unitId: string,
  currentItemId: string,
  catalog: SessionCatalog,
) {
  const unitItems = catalog.itemsByUnitId.get(unitId) ?? [];

  if (unitItems.some((item) => item.id === currentItemId)) {
    return currentItemId;
  }

  return '';
}

export function StudySessionsSurface({
  onProgressSaved,
  saveFeedback,
  variant = 'classic',
}: StudySessionsSurfaceProps) {
  const { coordination, programmeScope, runLocalMutation } = useAppState();
  const isRpgVariant = variant === 'rpg';
  const sectionClassName = isRpgVariant
    ? 'page-section rpg-focus'
    : 'page-section';
  const [searchParams] = useSearchParams();
  const [pageState, setPageState] =
    useState<SessionsPageState>(initialPageState);
  const [manualForm, setManualForm] = useState<ManualSessionFormValues | null>(
    null,
  );
  const [manualErrors, setManualErrors] = useState<SessionValidationErrors>({});
  const [manualIsSaving, setManualIsSaving] = useState(false);
  const [liveSession, setLiveSession] = useState<LiveSessionState>(
    createIdleLiveSession(),
  );
  const [liveErrors, setLiveErrors] = useState<SessionValidationErrors>({});
  const [liveIsSaving, setLiveIsSaving] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [historyRefreshStatus, setHistoryRefreshStatus] = useState<
    'ready' | 'loading' | 'error'
  >('ready');
  const saveInFlight = useRef(false);
  const savedManualDraft = useRef<ManualSessionFormValues | null>(null);
  const savedLiveDraft = useRef<LiveSessionState | null>(null);
  const historyRefreshVersion = useRef(0);
  const pageVersion = useRef(0);
  const [timerTickMilliseconds, setTimerTickMilliseconds] = useState(() =>
    Date.now(),
  );

  const prefilledItemId = searchParams.get('itemId');

  useEffect(() => {
    let isActive = true;
    pageVersion.current += 1;
    saveInFlight.current = false;
    savedManualDraft.current = null;
    savedLiveDraft.current = null;

    startTransition(() => {
      setPageState(initialPageState);
    });

    void (async () => {
      try {
        const data = await loadSessionsPageData(prefilledItemId);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setPageState({
            data,
            error: null,
            status: 'ready',
          });
          setManualForm(
            createManualSessionFormValues(
              new Date(),
              data.prefilledItemId,
              data.lockedUnitId ?? '',
            ),
          );
          setManualErrors({});
          setManualIsSaving(false);
          setLiveSession(
            createIdleLiveSession(
              data.prefilledItemId,
              data.lockedUnitId ?? '',
            ),
          );
          setLiveErrors({});
          setLiveIsSaving(false);
          setShowDiscardDialog(false);
          setHistoryRefreshStatus('ready');
          setToast(null);
        });
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        console.error('Sessions page loading failed.', loadError);

        startTransition(() => {
          setPageState({
            data: null,
            error:
              loadError instanceof Error
                ? loadError.message
                : 'The study sessions route could not read local data.',
            status: 'error',
          });
        });
      }
    })();

    return () => {
      isActive = false;
      pageVersion.current += 1;
      historyRefreshVersion.current += 1;
    };
  }, [prefilledItemId, reloadToken]);

  useEffect(() => {
    if (liveSession.phase !== 'running') {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimerTickMilliseconds(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [liveSession.phase]);

  if (pageState.status === 'loading' || pageState.data === null) {
    if (pageState.status === 'error') {
      return (
        <section className={sectionClassName}>
          {isRpgVariant ? (
            <div className="rpg-focus__header rpg-page-header">
              <div>
                <p className="rpg-focus__eyebrow rpg-page-eyebrow">
                  {uiCopy.surfaces.studySessions.rPG}
                </p>
                <h1>{uiCopy.surfaces.studySessions.focus}</h1>
              </div>
              <div className="rpg-focus__actions">
                <Link
                  className="button button--secondary button--md"
                  to={rpgRoutePath}
                >
                  {uiCopy.surfaces.studySessions.backToHome}
                </Link>
              </div>
            </div>
          ) : (
            <PageHeader
              actions={
                <div className="action-row">
                  <Link
                    className="button button--secondary button--md"
                    to={courseMapPath}
                  >
                    {uiCopy.surfaces.studySessions.backToCourseMap}
                  </Link>
                </div>
              }
              description={
                uiCopy.surfaces.studySessions.logStudyEffortAgainstATaskFromThe
              }
              title={uiCopy.surfaces.studySessions.studySessions}
            />
          )}
          <ErrorState
            action={
              <Button
                onClick={() => {
                  setReloadToken((currentToken) => currentToken + 1);
                }}
                variant="secondary"
              >
                {uiCopy.surfaces.studySessions.tryAgain}
              </Button>
            }
            description={
              pageState.error ??
              uiCopy.surfaces.studySessions.unknownSessionsRouteError
            }
            title={uiCopy.surfaces.studySessions.studySessionsCouldNotBeOpened}
          />
        </section>
      );
    }

    return (
      <section className={sectionClassName}>
        {isRpgVariant ? (
          <div className="rpg-focus__header rpg-page-header">
            <div>
              <p className="rpg-focus__eyebrow rpg-page-eyebrow">
                {uiCopy.surfaces.studySessions.rPG}
              </p>
              <h1>{uiCopy.surfaces.studySessions.focus}</h1>
            </div>
          </div>
        ) : (
          <PageHeader
            description={
              uiCopy.surfaces.studySessions
                .openingTheLocalCourseCatalogAndYourSaved
            }
            title={uiCopy.surfaces.studySessions.studySessions}
          />
        )}
        <LoadingState
          description={
            uiCopy.surfaces.studySessions
              .readingSavedStudySessionsAndAvailableTasks
          }
          title={uiCopy.surfaces.studySessions.loadingStudySessions}
        />
      </section>
    );
  }

  const { catalog, ledgerRows, lockedUnitId, prefillItemTitle } =
    pageState.data;
  const unitOptions = catalog.units.map((unit) => ({
    label: unit.title,
    value: unit.id,
  }));
  const manualItemOptions =
    manualForm === null
      ? []
      : getUnitScopedItemOptions(catalog, manualForm.unitId);
  const liveItemOptions = getUnitScopedItemOptions(catalog, liveSession.unitId);
  const liveElapsedMilliseconds = getLiveSessionElapsedMilliseconds(
    liveSession,
    timerTickMilliseconds,
  );
  const liveElapsedSeconds = Math.floor(liveElapsedMilliseconds / 1000);
  const liveHours = Math.floor(liveElapsedSeconds / 3600);
  const liveMinutes = Math.floor((liveElapsedSeconds % 3600) / 60);
  const liveSeconds = liveElapsedSeconds % 60;
  const liveTimerLabel =
    liveHours > 0
      ? `${String(liveHours).padStart(2, '0')}:${String(liveMinutes).padStart(2, '0')}:${String(liveSeconds).padStart(2, '0')}`
      : `${String(liveMinutes).padStart(2, '0')}:${String(liveSeconds).padStart(2, '0')}`;
  const lockedItemPath =
    liveSession.itemId.trim().length === 0
      ? null
      : getCourseItemDetailPath(liveSession.itemId);

  async function refreshSessionHistory() {
    const version = ++historyRefreshVersion.current;
    const currentCatalog = pageState.data?.catalog ?? null;

    if (currentCatalog === null) {
      return;
    }

    setHistoryRefreshStatus('loading');
    try {
      const ledgerRows = await readStudySessionLedgerRows((session) =>
        buildSessionLedgerRow(session, currentCatalog),
      );
      if (version !== historyRefreshVersion.current) {
        return;
      }
      setPageState((current) =>
        current.data === null
          ? current
          : {
              ...current,
              data: {
                ...current.data,
                ledgerRows,
              },
            },
      );
      setHistoryRefreshStatus('ready');
    } catch (loadError) {
      console.error('Saved session history could not be refreshed.', loadError);
      if (version === historyRefreshVersion.current) {
        setHistoryRefreshStatus('error');
      }
    }
  }

  function showSavedSession(result: StudySessionSaveResult) {
    const xpAdded = result.awardedTransactions.reduce(
      (sum, tx) => sum + tx.xp,
      0,
    );
    const xpToastSuffix = xpAdded > 0 ? ` (+${xpAdded} XP!)` : '';
    if (!isRpgVariant) {
      setToast({
        description: `Session saved.${xpToastSuffix}`,
        title: 'Session saved',
        tone: 'success',
      });
    } else {
      setToast(null);
    }
    onProgressSaved?.(result);
    void refreshSessionHistory();
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      manualForm === null ||
      !coordination.canWrite ||
      saveInFlight.current ||
      savedManualDraft.current === manualForm
    ) {
      return;
    }

    const validation = validateManualSessionForm(
      manualForm,
      catalog,
      new Date().toISOString(),
    );

    setManualErrors(validation.errors);

    if (validation.input === null) {
      return;
    }

    setManualIsSaving(true);
    const version = pageVersion.current;
    saveInFlight.current = true;
    const { catalogueId, policy } = requireProgrammeScope(programmeScope);

    let xpResult: StudySessionSaveResult;
    try {
      xpResult = await runLocalMutation(
        () =>
          addStudySessionAndAwardXp(validation.input, {
            catalogueId,
            policy,
          }),
        { invalidateRoute: false },
      );
    } catch (saveError) {
      if (version !== pageVersion.current) {
        return;
      }
      setManualErrors({
        itemId:
          saveError instanceof Error
            ? saveError.message
            : 'The study session could not be saved.',
      });
      setManualIsSaving(false);
      saveInFlight.current = false;
      return;
    }

    if (version !== pageVersion.current) {
      onProgressSaved?.(xpResult);
      void refreshSessionHistory();
      return;
    }

    savedManualDraft.current = manualForm;
    setManualForm(
      createManualSessionFormValues(
        new Date(),
        pageState.data!.prefilledItemId,
        lockedUnitId ?? '',
      ),
    );
    setManualIsSaving(false);
    showSavedSession(xpResult);
    saveInFlight.current = false;
  }

  async function handleLiveSave() {
    if (
      !coordination.canWrite ||
      saveInFlight.current ||
      savedLiveDraft.current === liveSession
    ) {
      return;
    }

    const validation = buildStudySessionInput(liveSession, catalog);

    setLiveErrors(validation.errors);

    if (validation.input === null) {
      return;
    }

    setLiveIsSaving(true);
    const version = pageVersion.current;
    saveInFlight.current = true;
    const { catalogueId, policy } = requireProgrammeScope(programmeScope);

    let xpResult: StudySessionSaveResult;
    try {
      xpResult = await runLocalMutation(
        () =>
          addStudySessionAndAwardXp(validation.input, {
            catalogueId,
            policy,
          }),
        { invalidateRoute: false },
      );
    } catch (saveError) {
      if (version !== pageVersion.current) {
        return;
      }
      setLiveErrors({
        itemId:
          saveError instanceof Error
            ? saveError.message
            : 'The live study session could not be saved.',
      });
      setLiveIsSaving(false);
      saveInFlight.current = false;
      return;
    }

    if (version !== pageVersion.current) {
      onProgressSaved?.(xpResult);
      void refreshSessionHistory();
      return;
    }

    savedLiveDraft.current = liveSession;
    setLiveSession(
      createIdleLiveSession(
        pageState.data!.prefilledItemId,
        lockedUnitId ?? '',
      ),
    );
    setLiveIsSaving(false);
    showSavedSession(xpResult);
    saveInFlight.current = false;
  }

  const headerDescription = isRpgVariant
    ? 'Study one task at a time. Save your effort when you finish; task completion is a separate step.'
    : lockedUnitId === null
      ? 'Log study effort against a task from the course. Sessions stay append-only and never imply completion.'
      : `Prefilled from one course task. The unit stays locked to that task while you log effort for ${prefillItemTitle ?? 'the selected task'}.`;
  const selectedTaskTitle =
    catalog.itemById.get(liveSession.itemId)?.title ?? prefillItemTitle;

  return (
    <section className={sectionClassName}>
      {isRpgVariant ? (
        <div className="rpg-focus__header rpg-page-header">
          <div>
            <h1>{uiCopy.surfaces.studySessions.focus}</h1>
            <p className="rpg-focus__lede rpg-page-lede">{headerDescription}</p>
          </div>
        </div>
      ) : (
        <PageHeader
          actions={
            <div className="action-row">
              <Link
                className="button button--secondary button--md"
                to={courseMapPath}
              >
                {uiCopy.surfaces.studySessions.backToCourseMap}
              </Link>
              {lockedItemPath ? (
                <Link
                  className="button button--secondary button--md"
                  to={lockedItemPath}
                >
                  {uiCopy.surfaces.studySessions.viewTask}
                </Link>
              ) : null}
            </div>
          }
          description={headerDescription}
          meta={
            <>
              <Badge tone="accent">
                {uiCopy.surfaces.studySessions.loggedEffortOnly}
              </Badge>
              <Badge tone="neutral">
                {uiCopy.surfaces.studySessions.unfinishedTimersAreNotSaved}
              </Badge>
            </>
          }
          title={uiCopy.surfaces.studySessions.studySessions}
        />
      )}
      {saveFeedback}
      {historyRefreshStatus === 'error' ? (
        <div className="course-detail-note" role="status">
          <p>
            {
              uiCopy.surfaces.studySessions
                .yourSessionIsSavedLocallySessionHistoryCould
            }
          </p>
          <Button
            onClick={() => {
              void refreshSessionHistory();
            }}
            variant="secondary"
          >
            {uiCopy.surfaces.studySessions.refreshSessionHistory}
          </Button>
        </div>
      ) : historyRefreshStatus === 'loading' ? (
        <p role="status">
          {uiCopy.surfaces.studySessions.refreshingSavedSessionHistory}
        </p>
      ) : null}
      <div className="sessions-layout">
        <div className="sessions-layout__forms">
          <Card
            description={
              isRpgVariant
                ? uiCopy.surfaces.studySessions
                    .startYourTimerPauseWhenNeededThenFinish
                : uiCopy.surfaces.studySessions
                    .startOneLiveStudySessionPauseItIf
            }
            title={uiCopy.surfaces.studySessions.liveFocusSession}
            titleAs={isRpgVariant ? 'h2' : 'h3'}
            variant="accent"
          >
            {isRpgVariant && selectedTaskTitle !== null ? (
              <div className="rpg-focus__selected-task">
                <span>{uiCopy.surfaces.studySessions.selectedTask}</span>
                <Link to={getRpgResourcePath(liveSession.itemId)}>
                  {selectedTaskTitle}
                </Link>
              </div>
            ) : null}
            {liveSession.phase === 'idle' ? (
              <form
                className="course-detail-form"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  const result = startLiveSession(
                    liveSession,
                    catalog,
                    nowClockSnapshot(),
                  );

                  setLiveErrors(result.errors);
                  setLiveSession(result.nextState);
                  setTimerTickMilliseconds(Date.now());
                }}
              >
                <div className="form-grid">
                  <FormField
                    controlId="live-session-mode"
                    error={liveErrors.mode}
                    label={uiCopy.surfaces.studySessions.mode}
                    required
                  >
                    {({ describedBy, inputId, invalid }) => (
                      <Select
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        id={inputId}
                        onChange={(event) => {
                          setLiveErrors((currentErrors) => ({
                            ...currentErrors,
                            mode: undefined,
                          }));
                          setLiveSession((currentState) =>
                            currentState.phase !== 'idle'
                              ? currentState
                              : {
                                  ...currentState,
                                  error: null,
                                  mode: event.target.value,
                                },
                          );
                        }}
                        options={getStudySessionModeOptions()}
                        placeholder={
                          uiCopy.surfaces.studySessions.chooseASessionMode
                        }
                        value={liveSession.mode}
                      />
                    )}
                  </FormField>
                  <FormField
                    controlId="live-session-unit"
                    error={liveErrors.unitId}
                    label={uiCopy.surfaces.studySessions.unit}
                    required
                  >
                    {({ describedBy, inputId, invalid }) => (
                      <Select
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        disabled={lockedUnitId !== null}
                        id={inputId}
                        onChange={(event) => {
                          const nextUnitId = event.target.value;

                          setLiveErrors((currentErrors) => ({
                            ...currentErrors,
                            itemId: undefined,
                            unitId: undefined,
                          }));
                          setLiveSession((currentState) =>
                            currentState.phase !== 'idle'
                              ? currentState
                              : {
                                  ...currentState,
                                  error: null,
                                  itemId: getNextItemId(
                                    nextUnitId,
                                    currentState.itemId,
                                    catalog,
                                  ),
                                  unitId: nextUnitId,
                                },
                          );
                        }}
                        options={unitOptions}
                        placeholder={uiCopy.surfaces.studySessions.chooseAUnit}
                        value={liveSession.unitId}
                      />
                    )}
                  </FormField>
                  <FormField
                    controlId="live-session-item"
                    error={liveErrors.itemId}
                    label={uiCopy.surfaces.studySessions.whatWereYouWorkingOn}
                    required
                  >
                    {({ describedBy, inputId, invalid }) => (
                      <Select
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        disabled={liveSession.unitId.trim().length === 0}
                        id={inputId}
                        onChange={(event) => {
                          setLiveErrors((currentErrors) => ({
                            ...currentErrors,
                            itemId: undefined,
                          }));
                          setLiveSession((currentState) =>
                            currentState.phase !== 'idle'
                              ? currentState
                              : {
                                  ...currentState,
                                  error: null,
                                  itemId: event.target.value,
                                },
                          );
                        }}
                        options={liveItemOptions}
                        placeholder={
                          liveSession.unitId.trim().length === 0
                            ? uiCopy.surfaces.studySessions.chooseAUnitFirst
                            : uiCopy.surfaces.studySessions.chooseALectureOrTask
                        }
                        value={liveSession.itemId}
                      />
                    )}
                  </FormField>
                </div>
                <div className="course-detail-note">
                  <p>
                    {isRpgVariant
                      ? uiCopy.surfaces.studySessions
                          .finishAndSaveBeforeLeavingUnfinishedTimersAre
                      : uiCopy.surfaces.studySessions
                          .unfinishedLiveSessionsAreNotSavedOnlyExplicit}
                  </p>
                </div>
                <div className="course-detail-form__actions">
                  <Button
                    disabled={!coordination.canWrite}
                    size="lg"
                    type="submit"
                  >
                    {uiCopy.surfaces.studySessions.startLiveSession}
                  </Button>
                </div>
              </form>
            ) : null}
            {liveSession.phase === 'running' ||
            liveSession.phase === 'paused' ? (
              <div className="sessions-timer">
                <div className="sessions-timer__header">
                  <div>
                    <p className="sessions-timer__label">
                      {uiCopy.surfaces.studySessions.activeTimer}
                    </p>
                    <p
                      aria-live="polite"
                      className="sessions-timer__value"
                      role="status"
                    >
                      {liveTimerLabel}
                    </p>
                  </div>
                  <div className="meta-cluster">
                    <Badge tone="accent">
                      {getModeLabel(liveSession.mode)}
                    </Badge>
                    <Badge tone="neutral">
                      {liveSession.phase === 'running'
                        ? uiCopy.surfaces.studySessions.running
                        : uiCopy.surfaces.studySessions.paused}
                    </Badge>
                  </div>
                </div>
                <dl className="course-map-stat-list">
                  <div>
                    <dt>{uiCopy.surfaces.studySessions.unit}</dt>
                    <dd>{catalog.unitById.get(liveSession.unitId)?.title}</dd>
                  </div>
                  <div>
                    <dt>{uiCopy.surfaces.studySessions.workingOn}</dt>
                    <dd>{catalog.itemById.get(liveSession.itemId)?.title}</dd>
                  </div>
                </dl>
                <div className="course-detail-note">
                  <p>
                    {
                      uiCopy.surfaces.studySessions
                        .unfinishedSessionsStayInMemoryOnlyReloadingOr
                    }
                  </p>
                </div>
                {liveSession.error ? (
                  <p className="form-field__error" role="alert">
                    {liveSession.error}
                  </p>
                ) : null}
                <div className="course-detail-form__actions">
                  {liveSession.phase === 'running' ? (
                    <Button
                      onClick={() => {
                        setLiveSession((currentState) =>
                          pauseLiveSession(currentState, Date.now()),
                        );
                      }}
                      variant="secondary"
                    >
                      {uiCopy.surfaces.studySessions.pause}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setLiveSession((currentState) =>
                          resumeLiveSession(currentState, Date.now()),
                        );
                        setTimerTickMilliseconds(Date.now());
                      }}
                      variant="secondary"
                    >
                      {uiCopy.surfaces.studySessions.resume}
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setLiveSession((currentState) =>
                        finishLiveSession(currentState, nowClockSnapshot()),
                      );
                      setTimerTickMilliseconds(Date.now());
                    }}
                  >
                    {uiCopy.surfaces.studySessions.finish}
                  </Button>
                  <Button
                    onClick={() => setShowDiscardDialog(true)}
                    variant="danger"
                  >
                    {uiCopy.surfaces.studySessions.discard}
                  </Button>
                </div>
              </div>
            ) : null}
            {liveSession.phase === 'review' ? (
              <div className="course-detail-form">
                <div className="sessions-review">
                  <div>
                    <p className="sessions-review__label">
                      {uiCopy.surfaces.studySessions.timeLogged}
                    </p>
                    <p className="sessions-review__value">
                      {liveSession.durationMinutes} min logged effort
                    </p>
                  </div>
                  <div className="meta-cluster">
                    <Badge tone="accent">
                      {getModeLabel(liveSession.mode)}
                    </Badge>
                    <Badge tone="neutral">
                      {catalog.itemById.get(liveSession.itemId)?.title}
                    </Badge>
                  </div>
                </div>
                <FormField
                  controlId="live-session-notes"
                  description={
                    uiCopy.surfaces.studySessions
                      .optionalLocalNoteAboutWhatHappenedDuringThe
                  }
                  error={liveErrors.notes}
                  label={uiCopy.surfaces.studySessions.notes}
                >
                  {({ describedBy, inputId, invalid }) => (
                    <TextArea
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
                      disabled={liveIsSaving}
                      id={inputId}
                      onChange={(event) => {
                        setLiveErrors((currentErrors) => ({
                          ...currentErrors,
                          notes: undefined,
                        }));
                        setLiveSession((currentState) =>
                          currentState.phase !== 'review'
                            ? currentState
                            : {
                                ...currentState,
                                notes: event.target.value,
                              },
                        );
                      }}
                      placeholder={
                        uiCopy.surfaces.studySessions
                          .optionalLocalNoteAboutWhatChangedWhatStalled
                      }
                      value={liveSession.notes}
                    />
                  )}
                </FormField>
                <FormField
                  controlId="live-session-blockers"
                  description={
                    uiCopy.surfaces.studySessions.optionalEnterOneBlockerPerLine
                  }
                  error={liveErrors.blockers}
                  label={uiCopy.surfaces.studySessions.blockers}
                >
                  {({ describedBy, inputId, invalid }) => (
                    <TextArea
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
                      disabled={liveIsSaving}
                      id={inputId}
                      onChange={(event) => {
                        setLiveErrors((currentErrors) => ({
                          ...currentErrors,
                          blockers: undefined,
                        }));
                        setLiveSession((currentState) =>
                          currentState.phase !== 'review'
                            ? currentState
                            : {
                                ...currentState,
                                blockersText: event.target.value,
                              },
                        );
                      }}
                      placeholder={
                        uiCopy.surfaces.studySessions
                          .contextSwitchUnclearLabInstruction
                      }
                      value={liveSession.blockersText}
                    />
                  )}
                </FormField>
                {liveErrors.itemId ? (
                  <p className="form-field__error" role="alert">
                    {liveErrors.itemId}
                  </p>
                ) : null}
                <div className="course-detail-form__actions">
                  <Button
                    disabled={!coordination.canWrite}
                    loading={liveIsSaving}
                    onClick={() => {
                      void handleLiveSave();
                    }}
                    size="lg"
                  >
                    {uiCopy.surfaces.studySessions.saveStudySession}
                  </Button>
                  <Button
                    disabled={liveIsSaving}
                    onClick={() => setShowDiscardDialog(true)}
                    variant="danger"
                  >
                    {uiCopy.surfaces.studySessions.discard}
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
          <RpgFocusDisclosureCard
            description={
              uiCopy.surfaces.studySessions
                .addOneCompletedStudySessionManuallyWhenYou
            }
            enabled={isRpgVariant}
            label={uiCopy.surfaces.studySessions.logAPastSessionManually}
            title={uiCopy.surfaces.studySessions.manualSessionEntry}
            titleAs={isRpgVariant ? 'h2' : 'h3'}
          >
            {manualForm ? (
              <form
                className="course-detail-form"
                noValidate
                onSubmit={(event) => {
                  void handleManualSubmit(event);
                }}
              >
                <div className="form-grid">
                  <FormField
                    controlId="manual-session-mode"
                    error={manualErrors.mode}
                    label={uiCopy.surfaces.studySessions.mode}
                    required
                  >
                    {({ describedBy, inputId, invalid }) => (
                      <Select
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        disabled={manualIsSaving}
                        id={inputId}
                        onChange={(event) => {
                          setManualErrors((currentErrors) => ({
                            ...currentErrors,
                            mode: undefined,
                          }));
                          setManualForm((currentForm) =>
                            currentForm === null
                              ? currentForm
                              : {
                                  ...currentForm,
                                  mode: event.target.value,
                                },
                          );
                        }}
                        options={getStudySessionModeOptions()}
                        placeholder={
                          uiCopy.surfaces.studySessions.chooseASessionMode
                        }
                        value={manualForm.mode}
                      />
                    )}
                  </FormField>
                  <FormField
                    controlId="manual-session-unit"
                    error={manualErrors.unitId}
                    label={uiCopy.surfaces.studySessions.unit}
                    required
                  >
                    {({ describedBy, inputId, invalid }) => (
                      <Select
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        disabled={manualIsSaving || lockedUnitId !== null}
                        id={inputId}
                        onChange={(event) => {
                          const nextUnitId = event.target.value;

                          setManualErrors((currentErrors) => ({
                            ...currentErrors,
                            itemId: undefined,
                            unitId: undefined,
                          }));
                          setManualForm((currentForm) =>
                            currentForm === null
                              ? currentForm
                              : {
                                  ...currentForm,
                                  itemId: getNextItemId(
                                    nextUnitId,
                                    currentForm.itemId,
                                    catalog,
                                  ),
                                  unitId: nextUnitId,
                                },
                          );
                        }}
                        options={unitOptions}
                        placeholder={uiCopy.surfaces.studySessions.chooseAUnit}
                        value={manualForm.unitId}
                      />
                    )}
                  </FormField>
                  <FormField
                    controlId="manual-session-item"
                    error={manualErrors.itemId}
                    label={uiCopy.surfaces.studySessions.whatWereYouWorkingOn}
                    required
                  >
                    {({ describedBy, inputId, invalid }) => (
                      <Select
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        disabled={
                          manualIsSaving ||
                          manualForm.unitId.trim().length === 0
                        }
                        id={inputId}
                        onChange={(event) => {
                          setManualErrors((currentErrors) => ({
                            ...currentErrors,
                            itemId: undefined,
                          }));
                          setManualForm((currentForm) =>
                            currentForm === null
                              ? currentForm
                              : {
                                  ...currentForm,
                                  itemId: event.target.value,
                                },
                          );
                        }}
                        options={manualItemOptions}
                        placeholder={
                          manualForm.unitId.trim().length === 0
                            ? uiCopy.surfaces.studySessions.chooseAUnitFirst
                            : uiCopy.surfaces.studySessions.chooseALectureOrTask
                        }
                        value={manualForm.itemId}
                      />
                    )}
                  </FormField>
                  <FormField
                    controlId="manual-session-started-at"
                    error={manualErrors.startedAtLocal}
                    label={uiCopy.surfaces.studySessions.startDateAndTime}
                    required
                  >
                    {({ describedBy, inputId, invalid }) => (
                      <TextInput
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        disabled={manualIsSaving}
                        id={inputId}
                        onChange={(event) => {
                          setManualErrors((currentErrors) => ({
                            ...currentErrors,
                            startedAtLocal: undefined,
                          }));
                          setManualForm((currentForm) =>
                            currentForm === null
                              ? currentForm
                              : {
                                  ...currentForm,
                                  startedAtLocal: event.target.value,
                                },
                          );
                        }}
                        type="datetime-local"
                        value={manualForm.startedAtLocal}
                      />
                    )}
                  </FormField>
                  <FormField
                    controlId="manual-session-duration"
                    description={
                      uiCopy.surfaces.studySessions
                        .wholeMinutesOnlyMinimum1Maximum720
                    }
                    error={manualErrors.durationMinutes}
                    label={uiCopy.surfaces.studySessions.duration}
                    required
                  >
                    {({ describedBy, inputId, invalid }) => (
                      <NumberInput
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        disabled={manualIsSaving}
                        id={inputId}
                        min={1}
                        max={720}
                        onChange={(event) => {
                          setManualErrors((currentErrors) => ({
                            ...currentErrors,
                            durationMinutes: undefined,
                          }));
                          setManualForm((currentForm) =>
                            currentForm === null
                              ? currentForm
                              : {
                                  ...currentForm,
                                  durationMinutes: event.target.value,
                                },
                          );
                        }}
                        placeholder="25"
                        step={1}
                        value={manualForm.durationMinutes}
                      />
                    )}
                  </FormField>
                </div>
                <FormField
                  controlId="manual-session-notes"
                  description={
                    uiCopy.surfaces.studySessions
                      .optionalLocalNoteAboutWhatTheEffortCovered
                  }
                  error={manualErrors.notes}
                  label={uiCopy.surfaces.studySessions.notes}
                >
                  {({ describedBy, inputId, invalid }) => (
                    <TextArea
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
                      disabled={manualIsSaving}
                      id={inputId}
                      onChange={(event) => {
                        setManualErrors((currentErrors) => ({
                          ...currentErrors,
                          notes: undefined,
                        }));
                        setManualForm((currentForm) =>
                          currentForm === null
                            ? currentForm
                            : {
                                ...currentForm,
                                notes: event.target.value,
                              },
                        );
                      }}
                      placeholder={
                        uiCopy.surfaces.studySessions
                          .optionalLocalNoteAboutTheEffortYouLogged
                      }
                      value={manualForm.notes}
                    />
                  )}
                </FormField>
                <FormField
                  controlId="manual-session-blockers"
                  description={
                    uiCopy.surfaces.studySessions.optionalEnterOneBlockerPerLine
                  }
                  error={manualErrors.blockers}
                  label={uiCopy.surfaces.studySessions.blockers}
                >
                  {({ describedBy, inputId, invalid }) => (
                    <TextArea
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
                      disabled={manualIsSaving}
                      id={inputId}
                      onChange={(event) => {
                        setManualErrors((currentErrors) => ({
                          ...currentErrors,
                          blockers: undefined,
                        }));
                        setManualForm((currentForm) =>
                          currentForm === null
                            ? currentForm
                            : {
                                ...currentForm,
                                blockersText: event.target.value,
                              },
                        );
                      }}
                      placeholder={
                        uiCopy.surfaces.studySessions
                          .contextSwitchUnclearLabInstruction
                      }
                      value={manualForm.blockersText}
                    />
                  )}
                </FormField>
                <div className="course-detail-form__actions">
                  <Button
                    disabled={!coordination.canWrite}
                    loading={manualIsSaving}
                    size="lg"
                    type="submit"
                  >
                    {uiCopy.surfaces.studySessions.saveSession}
                  </Button>
                </div>
              </form>
            ) : null}
          </RpgFocusDisclosureCard>
        </div>
        <RpgFocusDisclosureCard
          description={
            isRpgVariant
              ? uiCopy.surfaces.studySessions
                  .yourStudyTimeNewestFirstSavingASession
              : uiCopy.surfaces.studySessions
                  .savedSessionsAreListedNewestFirstEachRow
          }
          enabled={isRpgVariant}
          label={`Review saved sessions (${ledgerRows.length})`}
          title={uiCopy.surfaces.studySessions.yourSavedSessions}
          titleAs={isRpgVariant ? 'h2' : 'h3'}
        >
          {ledgerRows.length === 0 ? (
            <EmptyState
              description={
                uiCopy.surfaces.studySessions.noStudySessionsHaveBeenLoggedYet
              }
              eyebrow="Sessions"
              title={uiCopy.surfaces.studySessions.noStudySessionsLogged}
            />
          ) : (
            <ol className="session-ledger-list">
              {ledgerRows.map((row) => (
                <li className="session-ledger-list__item" key={row.id}>
                  <div className="session-ledger-list__copy">
                    <div className="session-ledger-list__title-row">
                      <p className="session-ledger-list__title">
                        {row.unitTitle} - {row.itemTitle}
                      </p>
                      <Badge tone="accent">{row.modeLabel}</Badge>
                    </div>
                    <p className="course-item-row__eyebrow">
                      {row.startedAtLabel}
                    </p>
                    {row.notesPreview ? (
                      <p className="course-item-row__detail">
                        {row.notesPreview}
                      </p>
                    ) : null}
                  </div>
                  <div className="session-ledger-list__meta">
                    <SessionAssignmentCorrection
                      sessionId={row.id}
                      itemId={row.itemId}
                      catalog={catalog}
                      onCorrected={refreshSessionHistory}
                    />
                    <Badge tone="neutral">{row.durationLabel}</Badge>
                    {row.blockerSummary ? (
                      <Badge tone="warning">{row.blockerSummary}</Badge>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </RpgFocusDisclosureCard>
      </div>
      <Dialog
        actions={
          <>
            <Button
              onClick={() => setShowDiscardDialog(false)}
              variant="secondary"
            >
              {uiCopy.surfaces.studySessions.keepSession}
            </Button>
            <Button
              onClick={() => {
                setShowDiscardDialog(false);
                setLiveErrors({});
                setLiveSession(
                  discardLiveSession(
                    pageState.data?.prefilledItemId ?? '',
                    pageState.data?.lockedUnitId ?? '',
                  ),
                );
                setToast({
                  description: isRpgVariant
                    ? 'The timer was discarded without saving a session.'
                    : 'The in-progress timer was discarded. No study-session row was written.',
                  title: 'Session discarded',
                  tone: 'success',
                });
              }}
              variant="danger"
            >
              {uiCopy.surfaces.studySessions.discardSession}
            </Button>
          </>
        }
        description={
          uiCopy.surfaces.studySessions
            .discardingRemovesTheInMemoryTimerAndWrites
        }
        isOpen={showDiscardDialog}
        onClose={() => setShowDiscardDialog(false)}
        title={uiCopy.surfaces.studySessions.discardThisLiveSession}
      >
        <p>
          {
            uiCopy.surfaces.studySessions
              .thisActionClearsTheCurrentLiveTimerNotes
          }
        </p>
      </Dialog>
      {toast ? (
        <ToastStack>
          <Toast
            description={toast.description}
            onDismiss={() => setToast(null)}
            title={toast.title}
            tone={toast.tone}
          />
        </ToastStack>
      ) : null}
    </section>
  );
}
