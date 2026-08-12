import {
  startTransition,
  useEffect,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';

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
  buildSessionLedgerRows,
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
  getCourseItem,
  listCourseItems,
  listCourseUnits,
  listStudySessions,
  type AddStudySessionWithXpResult,
} from '@/lib/db';
import { getRpgWeekPath, rpgRoutePath } from '@/lib/routing/rpgRoutePaths';

// The same study-session surface renders in two shells: the classic Study
// Sessions route and the RPG Focus route. Only the section wrapper and the
// route header differ by variant; the focus/session flow, controls, state, and
// engine writes are identical.
type StudySessionsSurfaceVariant = 'classic' | 'rpg';

export type StudySessionSaveResult = AddStudySessionWithXpResult;

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

function createSelectionState(itemId: string, unitId: string) {
  return {
    itemId,
    unitId,
  };
}

async function loadSessionsPageData(
  prefilledItemId: string | null,
): Promise<SessionsPageData> {
  const [units, items, sessions] = await Promise.all([
    listCourseUnits(),
    listCourseItems(),
    listStudySessions(),
  ]);
  const catalog = buildSessionCatalog(units, items);

  if (prefilledItemId !== null && prefilledItemId.trim().length > 0) {
    const item = await getCourseItem(prefilledItemId);

    if (item === null) {
      throw new Error(
        'The requested prefilled task could not be found in the local catalog.',
      );
    }

    return {
      catalog,
      ledgerRows: buildSessionLedgerRows(sessions, catalog),
      lockedUnitId: item.unitId,
      prefilledItemId: item.id,
      prefillItemTitle: item.title,
    };
  }

  return {
    catalog,
    ledgerRows: buildSessionLedgerRows(sessions, catalog),
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
  const { coordination, runLocalMutation } = useAppState();
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
  const [timerTickMilliseconds, setTimerTickMilliseconds] = useState(() =>
    Date.now(),
  );

  const prefilledItemId = searchParams.get('itemId');

  useEffect(() => {
    let isActive = true;

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
    };
  }, [prefilledItemId, reloadToken]);

  useEffect(() => {
    if (pageState.data === null) {
      return;
    }

    const nextSelection = createSelectionState(
      pageState.data.prefilledItemId,
      pageState.data.lockedUnitId ?? '',
    );

    setManualForm(
      createManualSessionFormValues(
        new Date(),
        nextSelection.itemId,
        nextSelection.unitId,
      ),
    );
    setManualErrors({});
    setManualIsSaving(false);
    setLiveSession(
      createIdleLiveSession(nextSelection.itemId, nextSelection.unitId),
    );
    setLiveErrors({});
    setLiveIsSaving(false);
    setShowDiscardDialog(false);
  }, [pageState.data]);

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
            <div className="rpg-focus__header">
              <div>
                <p className="rpg-focus__eyebrow">RPG</p>
                <h1>Focus</h1>
              </div>
              <div className="rpg-focus__actions">
                <Link
                  className="button button--secondary button--md"
                  to={rpgRoutePath}
                >
                  Back to Hub
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
                    Back to course map
                  </Link>
                </div>
              }
              description="Log study effort against a task from the course."
              title="Study sessions"
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
                Try again
              </Button>
            }
            description={pageState.error ?? 'Unknown sessions-route error.'}
            title="Study sessions could not be opened"
          />
        </section>
      );
    }

    return (
      <section className={sectionClassName}>
        {isRpgVariant ? (
          <div className="rpg-focus__header">
            <div>
              <p className="rpg-focus__eyebrow">RPG</p>
              <h1>Focus</h1>
            </div>
          </div>
        ) : (
          <PageHeader
            description="Opening the local course catalog and your saved study sessions."
            title="Study sessions"
          />
        )}
        <LoadingState
          description="Reading saved study sessions and available tasks."
          title="Loading study sessions"
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

  function resetPageStateAfterSave() {
    setReloadToken((currentToken) => currentToken + 1);
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (manualForm === null || manualIsSaving) {
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

    try {
      const xpResult = await runLocalMutation(
        () => addStudySessionAndAwardXp(validation.input),
        { invalidateRoute: false },
      );
      const xpAdded = xpResult.awardedTransactions.reduce(
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
      onProgressSaved?.(xpResult);
      resetPageStateAfterSave();
    } catch (saveError) {
      setManualErrors({
        itemId:
          saveError instanceof Error
            ? saveError.message
            : 'The study session could not be saved.',
      });
      setManualIsSaving(false);
    }
  }

  async function handleLiveSave() {
    if (liveIsSaving) {
      return;
    }

    const validation = buildStudySessionInput(liveSession, catalog);

    setLiveErrors(validation.errors);

    if (validation.input === null) {
      return;
    }

    setLiveIsSaving(true);

    try {
      const xpResult = await runLocalMutation(
        () => addStudySessionAndAwardXp(validation.input),
        { invalidateRoute: false },
      );
      const xpAdded = xpResult.awardedTransactions.reduce(
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
      onProgressSaved?.(xpResult);
      resetPageStateAfterSave();
    } catch (saveError) {
      setLiveErrors({
        itemId:
          saveError instanceof Error
            ? saveError.message
            : 'The live study session could not be saved.',
      });
      setLiveIsSaving(false);
    }
  }

  const headerDescription =
    lockedUnitId === null
      ? 'Log study effort against a task from the course. Sessions stay append-only and never imply completion.'
      : `Prefilled from one course task. The unit stays locked to that task while you log effort for ${prefillItemTitle ?? 'the selected task'}.`;
  const selectedTaskTitle =
    catalog.itemById.get(liveSession.itemId)?.title ?? prefillItemTitle;

  return (
    <section className={sectionClassName}>
      {isRpgVariant ? (
        <div className="rpg-focus__header">
          <div>
            <p className="rpg-focus__eyebrow">RPG</p>
            <h1>Focus</h1>
            <p className="rpg-focus__lede">{headerDescription}</p>
          </div>
          <div className="rpg-focus__actions">
            <Link
              className="button button--secondary button--md"
              to={rpgRoutePath}
            >
              Back to Hub
            </Link>
            {liveSession.unitId.trim().length > 0 ? (
              <Link
                className="button button--secondary button--md"
                to={getRpgWeekPath(liveSession.unitId)}
              >
                Back to week
              </Link>
            ) : null}
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
                Back to course map
              </Link>
              {lockedItemPath ? (
                <Link
                  className="button button--secondary button--md"
                  to={lockedItemPath}
                >
                  View task
                </Link>
              ) : null}
            </div>
          }
          description={headerDescription}
          meta={
            <>
              <Badge tone="accent">Logged effort only</Badge>
              <Badge tone="neutral">Unfinished timers are not saved</Badge>
            </>
          }
          title="Study sessions"
        />
      )}
      {saveFeedback}
      <div className="sessions-layout">
        <div className="sessions-layout__forms">
          <Card
            description="Start one live study session, pause it if needed, then save exactly one immutable effort record."
            title="Live focus session"
            titleAs={isRpgVariant ? 'h2' : 'h3'}
            variant="accent"
          >
            {isRpgVariant && selectedTaskTitle !== null ? (
              <div className="rpg-focus__selected-task">
                <span>Selected task</span>
                <strong>{selectedTaskTitle}</strong>
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
                    label="Mode"
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
                        placeholder="Choose a session mode"
                        value={liveSession.mode}
                      />
                    )}
                  </FormField>
                  <FormField
                    controlId="live-session-unit"
                    error={liveErrors.unitId}
                    label="Unit"
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
                        placeholder="Choose a unit"
                        value={liveSession.unitId}
                      />
                    )}
                  </FormField>
                  <FormField
                    controlId="live-session-item"
                    error={liveErrors.itemId}
                    label="What were you working on?"
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
                            ? 'Choose a unit first'
                            : 'Choose a lecture or task'
                        }
                        value={liveSession.itemId}
                      />
                    )}
                  </FormField>
                </div>
                <div className="course-detail-note">
                  <p>
                    Unfinished live sessions are not saved. Only explicit finish
                    and save writes one study-session row.
                  </p>
                </div>
                <div className="course-detail-form__actions">
                  <Button
                    disabled={!coordination.canWrite}
                    size="lg"
                    type="submit"
                  >
                    Start live session
                  </Button>
                </div>
              </form>
            ) : null}
            {liveSession.phase === 'running' ||
            liveSession.phase === 'paused' ? (
              <div className="sessions-timer">
                <div className="sessions-timer__header">
                  <div>
                    <p className="sessions-timer__label">Active timer</p>
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
                      {liveSession.phase === 'running' ? 'Running' : 'Paused'}
                    </Badge>
                  </div>
                </div>
                <dl className="course-map-stat-list">
                  <div>
                    <dt>Unit</dt>
                    <dd>{catalog.unitById.get(liveSession.unitId)?.title}</dd>
                  </div>
                  <div>
                    <dt>Working on</dt>
                    <dd>{catalog.itemById.get(liveSession.itemId)?.title}</dd>
                  </div>
                </dl>
                <div className="course-detail-note">
                  <p>
                    Unfinished sessions stay in memory only. Reloading or
                    discarding this timer writes nothing.
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
                      Pause
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
                      Resume
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
                    Finish
                  </Button>
                  <Button
                    onClick={() => setShowDiscardDialog(true)}
                    variant="danger"
                  >
                    Discard
                  </Button>
                </div>
              </div>
            ) : null}
            {liveSession.phase === 'review' ? (
              <div className="course-detail-form">
                <div className="sessions-review">
                  <div>
                    <p className="sessions-review__label">Time logged</p>
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
                  description="Optional local note about what happened during the session."
                  error={liveErrors.notes}
                  label="Notes"
                >
                  {({ describedBy, inputId, invalid }) => (
                    <TextArea
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
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
                      placeholder="Optional local note about what changed, what stalled, or what you finished."
                      value={liveSession.notes}
                    />
                  )}
                </FormField>
                <FormField
                  controlId="live-session-blockers"
                  description="Optional. Enter one blocker per line."
                  error={liveErrors.blockers}
                  label="Blockers"
                >
                  {({ describedBy, inputId, invalid }) => (
                    <TextArea
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
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
                      placeholder="Context switch&#10;Unclear lab instruction"
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
                    Save study session
                  </Button>
                  <Button
                    onClick={() => setShowDiscardDialog(true)}
                    variant="danger"
                  >
                    Discard
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
          <RpgFocusDisclosureCard
            description="Add one completed study session manually when you already know the item, start time, and duration."
            enabled={isRpgVariant}
            label="Log a past session manually"
            title="Manual session entry"
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
                    label="Mode"
                    required
                  >
                    {({ describedBy, inputId, invalid }) => (
                      <Select
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
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
                        placeholder="Choose a session mode"
                        value={manualForm.mode}
                      />
                    )}
                  </FormField>
                  <FormField
                    controlId="manual-session-unit"
                    error={manualErrors.unitId}
                    label="Unit"
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
                        placeholder="Choose a unit"
                        value={manualForm.unitId}
                      />
                    )}
                  </FormField>
                  <FormField
                    controlId="manual-session-item"
                    error={manualErrors.itemId}
                    label="What were you working on?"
                    required
                  >
                    {({ describedBy, inputId, invalid }) => (
                      <Select
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        disabled={manualForm.unitId.trim().length === 0}
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
                            ? 'Choose a unit first'
                            : 'Choose a lecture or task'
                        }
                        value={manualForm.itemId}
                      />
                    )}
                  </FormField>
                  <FormField
                    controlId="manual-session-started-at"
                    error={manualErrors.startedAtLocal}
                    label="Start date and time"
                    required
                  >
                    {({ describedBy, inputId, invalid }) => (
                      <TextInput
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
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
                    description="Whole minutes only. Minimum 1, maximum 720."
                    error={manualErrors.durationMinutes}
                    label="Duration"
                    required
                  >
                    {({ describedBy, inputId, invalid }) => (
                      <NumberInput
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
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
                  description="Optional local note about what the effort covered."
                  error={manualErrors.notes}
                  label="Notes"
                >
                  {({ describedBy, inputId, invalid }) => (
                    <TextArea
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
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
                      placeholder="Optional local note about the effort you logged."
                      value={manualForm.notes}
                    />
                  )}
                </FormField>
                <FormField
                  controlId="manual-session-blockers"
                  description="Optional. Enter one blocker per line."
                  error={manualErrors.blockers}
                  label="Blockers"
                >
                  {({ describedBy, inputId, invalid }) => (
                    <TextArea
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
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
                      placeholder="Context switch&#10;Unclear lab instruction"
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
                    Save session
                  </Button>
                </div>
              </form>
            ) : null}
          </RpgFocusDisclosureCard>
        </div>
        <RpgFocusDisclosureCard
          description="Saved sessions are listed newest first. Each row is effort history only, not course completion."
          enabled={isRpgVariant}
          label={`Review saved sessions (${ledgerRows.length})`}
          title="Your saved sessions"
          titleAs={isRpgVariant ? 'h2' : 'h3'}
        >
          {ledgerRows.length === 0 ? (
            <EmptyState
              description="No study sessions have been logged yet."
              eyebrow="Sessions"
              title="No study sessions logged"
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
              Keep session
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
                  description:
                    'The in-progress timer was discarded. No study-session row was written.',
                  title: 'Session discarded',
                  tone: 'success',
                });
              }}
              variant="danger"
            >
              Discard session
            </Button>
          </>
        }
        description="Discarding removes the in-memory timer and writes nothing to local storage."
        isOpen={showDiscardDialog}
        onClose={() => setShowDiscardDialog(false)}
        title="Discard this live session?"
      >
        <p>
          This action clears the current live timer, notes, and blockers draft.
          Nothing is saved until you finish and save explicitly.
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
