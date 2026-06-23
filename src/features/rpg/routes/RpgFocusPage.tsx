import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  RpgButton,
  RpgEmptyState,
  RpgPanel,
  RpgStatusPill,
  type RpgStatusTone,
} from '@/features/rpg/components';
import { saveRpgFocusSession } from '@/features/rpg/model/focusActions';
import { loadRpgFocusSessionSummary } from '@/features/rpg/model/readModels';
import type { RpgFocusSessionSummary } from '@/features/rpg/model/types';
import {
  buildSessionCatalog,
  buildStudySessionInput,
  createIdleLiveSession,
  discardLiveSession,
  finishLiveSession,
  getLiveSessionElapsedMilliseconds,
  getModeLabel,
  getStudySessionModeOptions,
  getUnitScopedItemOptions,
  pauseLiveSession,
  resumeLiveSession,
  startLiveSession,
  type LiveSessionState,
  type SessionValidationErrors,
} from '@/features/sessions';
import type { CourseItemType, StudySessionMode } from '@/lib/domain';
import {
  getRpgResourcePath,
  getRpgWeekPath,
  rpgRoutePath,
} from '@/lib/routing/rpgRoutePaths';

type RpgFocusPageStatus = 'error' | 'loading' | 'ready';

type RpgFocusPageState = {
  error: string | null;
  status: RpgFocusPageStatus;
  summary: RpgFocusSessionSummary | null;
};

type RpgFocusSaveSummary = {
  durationMinutes: number;
  itemId: string;
  itemTitle: string;
  modeLabel: string;
  sessionId: string;
  unitId: string;
  unitTitle: string;
  xpAdded: number;
};

const initialPageState: RpgFocusPageState = {
  error: null,
  status: 'loading',
  summary: null,
};

const modeByItemType: Record<CourseItemType, StudySessionMode> = {
  lab: 'coding',
  lecture: 'watching',
  notes: 'note_review',
  practice: 'coding',
  problem_set: 'coding',
  project_task: 'final_project',
  reading: 'reading',
  reflection: 'reflection',
  section: 'watching',
  shorts: 'watching',
};

function nowClockSnapshot() {
  return {
    iso: new Date().toISOString(),
    milliseconds: Date.now(),
  };
}

function createClientSessionId(nowMilliseconds = Date.now()) {
  return `study-session-rpg-focus-${nowMilliseconds.toString(36)}`;
}

function formatTimerLabel(elapsedMilliseconds: number) {
  const elapsedSeconds = Math.floor(Math.max(0, elapsedMilliseconds) / 1000);
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getItemMode(itemType: CourseItemType): StudySessionMode {
  return modeByItemType[itemType];
}

function getStatusTone(
  statusVariant: NonNullable<
    RpgFocusSessionSummary['selectedResource']
  >['statusVariant'],
): RpgStatusTone {
  const tones: Record<
    NonNullable<RpgFocusSessionSummary['selectedResource']>['statusVariant'],
    RpgStatusTone
  > = {
    blocked: 'danger',
    completed: 'success',
    inProgress: 'progress',
    notStarted: 'neutral',
    optional: 'neutral',
  };

  return tones[statusVariant];
}

function createInitialLiveSession(
  summary: RpgFocusSessionSummary,
): LiveSessionState {
  const selectedResource = summary.selectedResource;

  if (selectedResource === null) {
    return createIdleLiveSession();
  }

  return {
    ...createIdleLiveSession(selectedResource.itemId, selectedResource.unitId),
    mode: getItemMode(selectedResource.itemType),
  };
}

export function RpgFocusPage() {
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('itemId');
  const normalizedItemId =
    itemId === null || itemId.trim().length === 0 ? null : itemId.trim();
  const [pageState, setPageState] =
    useState<RpgFocusPageState>(initialPageState);
  const [liveSession, setLiveSession] = useState<LiveSessionState>(
    createIdleLiveSession(),
  );
  const [liveErrors, setLiveErrors] = useState<SessionValidationErrors>({});
  const [timerTickMilliseconds, setTimerTickMilliseconds] = useState(() =>
    Date.now(),
  );
  const [saveSummary, setSaveSummary] = useState<RpgFocusSaveSummary | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const saveInFlightRef = useRef(false);
  const activeSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isActive = true;

    startTransition(() => {
      setPageState(initialPageState);
      setSaveSummary(null);
      setLiveErrors({});
      setIsSaving(false);
      saveInFlightRef.current = false;
      activeSessionIdRef.current = null;
    });

    void (async () => {
      try {
        const summary = await loadRpgFocusSessionSummary(normalizedItemId);

        if (!isActive) {
          return;
        }

        if (
          summary.requestedItemId !== null &&
          summary.selectedResource === null
        ) {
          startTransition(() => {
            setPageState({
              error: `No focus task was found for "${summary.requestedItemId}".`,
              status: 'error',
              summary: null,
            });
            setLiveSession(createIdleLiveSession());
          });
          return;
        }

        startTransition(() => {
          setPageState({
            error: null,
            status: 'ready',
            summary,
          });
          setLiveSession(createInitialLiveSession(summary));
        });
      } catch (loadError) {
        console.error('RPG focus loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setPageState({
            error: 'The RPG focus route could not read local course data.',
            status: 'error',
            summary: null,
          });
          setLiveSession(createIdleLiveSession());
        });
      }
    })();

    return () => {
      isActive = false;
    };
  }, [normalizedItemId, reloadToken]);

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

  const summary = pageState.summary;
  const catalog = useMemo(() => {
    if (summary === null) {
      return null;
    }

    return buildSessionCatalog(
      summary.units.map((unit) => ({
        courseId: unit.courseId,
        createdAt: '',
        id: unit.id,
        order: unit.order,
        required: unit.required,
        sourceYear: unit.sourceYear,
        title: unit.title,
        type: unit.type,
        updatedAt: '',
      })),
      summary.items.map((item) => ({
        createdAt: '',
        estimatedMinutes: item.estimatedMinutes,
        id: item.id,
        order: item.order,
        required: item.required,
        title: item.title,
        type: item.type,
        unitId: item.unitId,
        updatedAt: '',
      })),
    );
  }, [summary]);

  const selectedItem =
    catalog === null
      ? null
      : (catalog.itemById.get(liveSession.itemId) ?? null);
  const selectedUnit =
    catalog === null
      ? null
      : (catalog.unitById.get(liveSession.unitId) ?? null);
  const isSelectedItemLocked = summary?.selectedResource !== null;
  const unitOptions =
    catalog?.units.map((unit) => ({
      label: unit.title,
      value: unit.id,
    })) ?? [];
  const itemOptions =
    catalog === null
      ? []
      : getUnitScopedItemOptions(catalog, liveSession.unitId);
  const modeOptions = getStudySessionModeOptions();
  const elapsedMilliseconds = getLiveSessionElapsedMilliseconds(
    liveSession,
    timerTickMilliseconds,
  );
  const timerLabel = formatTimerLabel(elapsedMilliseconds);

  function resetDraft() {
    const selectedResource = summary?.selectedResource ?? null;

    setLiveErrors({});
    setIsSaving(false);
    saveInFlightRef.current = false;
    activeSessionIdRef.current = null;
    setLiveSession(
      selectedResource === null
        ? discardLiveSession()
        : {
            ...discardLiveSession(
              selectedResource.itemId,
              selectedResource.unitId,
            ),
            mode: getItemMode(selectedResource.itemType),
          },
    );
    setTimerTickMilliseconds(Date.now());
  }

  function handleStart() {
    if (catalog === null || liveSession.phase !== 'idle') {
      return;
    }

    const result = startLiveSession(liveSession, catalog, nowClockSnapshot());

    setLiveErrors(result.errors);
    setLiveSession(result.nextState);
    setTimerTickMilliseconds(Date.now());

    if (Object.keys(result.errors).length === 0) {
      activeSessionIdRef.current = createClientSessionId();
      setSaveSummary(null);
    }
  }

  async function saveFinishedSession(finishedSession: LiveSessionState) {
    if (catalog === null || saveInFlightRef.current || saveSummary !== null) {
      return;
    }

    const validation = buildStudySessionInput(finishedSession, catalog);

    setLiveErrors(validation.errors);

    if (validation.input === null) {
      return;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);

    try {
      const result = await saveRpgFocusSession({
        ...validation.input,
        id: activeSessionIdRef.current ?? createClientSessionId(),
      });
      const xpAdded = result.awardedTransactions.reduce(
        (total, transaction) => total + transaction.xp,
        0,
      );
      const savedItem = catalog.itemById.get(result.studySession.itemId);
      const savedUnit = catalog.unitById.get(result.studySession.unitId);

      startTransition(() => {
        setSaveSummary({
          durationMinutes: result.studySession.durationMinutes,
          itemId: result.studySession.itemId,
          itemTitle: savedItem?.title ?? result.studySession.itemId,
          modeLabel: getModeLabel(result.studySession.mode),
          sessionId: result.studySession.id,
          unitId: result.studySession.unitId,
          unitTitle: savedUnit?.title ?? result.studySession.unitId,
          xpAdded,
        });
        setIsSaving(false);
        setLiveSession(
          discardLiveSession(
            summary?.selectedResource?.itemId ?? '',
            summary?.selectedResource?.unitId ?? '',
          ),
        );
      });
    } catch (saveError) {
      console.error('RPG focus session save failed.', saveError);
      saveInFlightRef.current = false;
      setIsSaving(false);
      setLiveErrors({
        itemId:
          saveError instanceof Error
            ? saveError.message
            : 'The focus session could not be saved locally.',
      });
    }
  }

  function handleFinish() {
    if (
      liveSession.phase !== 'running' &&
      liveSession.phase !== 'paused' &&
      liveSession.phase !== 'review'
    ) {
      return;
    }

    const finishedSession =
      liveSession.phase === 'review'
        ? liveSession
        : finishLiveSession(liveSession, nowClockSnapshot());

    setLiveSession(finishedSession);
    setTimerTickMilliseconds(Date.now());

    if (finishedSession.phase !== 'review') {
      return;
    }

    void saveFinishedSession(finishedSession);
  }

  if (pageState.status === 'loading' || summary === null || catalog === null) {
    if (pageState.status === 'error') {
      return (
        <section className="page-section rpg-focus">
          <div className="rpg-focus__header">
            <div>
              <p className="rpg-focus__eyebrow">Focus Session</p>
              <h1>Focus</h1>
            </div>
          </div>
          <ErrorState
            action={
              <RpgButton
                onClick={() => setReloadToken((token) => token + 1)}
                variant="secondary"
              >
                Try again
              </RpgButton>
            }
            description={pageState.error ?? 'Unknown RPG focus error.'}
            title="RPG focus could not be opened"
          />
        </section>
      );
    }

    return (
      <section className="page-section rpg-focus">
        <div className="rpg-focus__header">
          <div>
            <p className="rpg-focus__eyebrow">Focus Session</p>
            <h1>Focus</h1>
          </div>
        </div>
        <LoadingState
          description="Reading the local course catalog for the focus timer."
          title="Loading focus session"
        />
      </section>
    );
  }

  return (
    <section className="page-section rpg-focus">
      <div className="rpg-focus__header">
        <div>
          <p className="rpg-focus__eyebrow">Focus Session</p>
          <h1>Focus</h1>
          <p className="rpg-focus__lede">
            Timers stay in memory until you finish. Unfinished or discarded
            timers write nothing.
          </p>
        </div>
        <div className="rpg-focus__actions">
          <RpgButton href={rpgRoutePath} variant="secondary">
            Cancel focus
          </RpgButton>
          {selectedUnit ? (
            <RpgButton
              href={getRpgWeekPath(selectedUnit.id)}
              variant="secondary"
            >
              Back to week
            </RpgButton>
          ) : null}
        </div>
      </div>

      {summary.selectedResource === null ? (
        <RpgEmptyState
          action={
            <RpgButton href="/rpg/map" variant="secondary">
              Choose from map
            </RpgButton>
          }
          description="Choose a real local course task below, then start the in-memory focus timer."
          eyebrow="Manual focus"
          title="No task selected"
        />
      ) : (
        <RpgPanel title="Selected task" titleAs="h2">
          <div className="rpg-focus__selected-task">
            <div>
              <p className="rpg-focus__subheading">
                {summary.selectedResource.unitTitle}
              </p>
              <h2>{summary.selectedResource.title}</h2>
              <p>
                {summary.selectedResource.typeLabel} -{' '}
                {summary.selectedResource.estimatedMinutesLabel}
              </p>
            </div>
            <div className="rpg-focus__status-row">
              <RpgStatusPill
                tone={getStatusTone(summary.selectedResource.statusVariant)}
              >
                {summary.selectedResource.statusLabel}
              </RpgStatusPill>
              <RpgStatusPill
                tone={
                  summary.selectedResource.required ? 'progress' : 'neutral'
                }
              >
                {summary.selectedResource.required ? 'Required' : 'Optional'}
              </RpgStatusPill>
            </div>
          </div>
        </RpgPanel>
      )}

      <RpgPanel title="Timer" titleAs="h2">
        <div className="rpg-focus__timer-layout">
          <div
            aria-label={`Elapsed focus time ${timerLabel}`}
            className="rpg-focus__timer-ring"
            role="timer"
          >
            <span>{timerLabel}</span>
          </div>
          <div className="rpg-focus__timer-copy">
            <p>
              Status:{' '}
              <strong>
                {liveSession.phase === 'idle'
                  ? 'Ready'
                  : liveSession.phase === 'running'
                    ? 'Running'
                    : liveSession.phase === 'paused'
                      ? 'Paused'
                      : 'Finishing'}
              </strong>
            </p>
            {selectedItem && selectedUnit ? (
              <p>
                Current task: {selectedUnit.title} - {selectedItem.title}
              </p>
            ) : (
              <p>Choose a unit and task before starting.</p>
            )}
            {liveSession.phase !== 'idle' ? (
              <p>
                Finish saves one local study-session record through the existing
                session engine.
              </p>
            ) : null}
          </div>
        </div>
      </RpgPanel>

      {saveSummary === null ? (
        <RpgPanel title="Session setup" titleAs="h2">
          <div className="rpg-focus__form">
            <label className="rpg-focus__field">
              <span>Mode</span>
              <select
                aria-invalid={liveErrors.mode ? true : undefined}
                disabled={liveSession.phase !== 'idle'}
                onChange={(event) => {
                  setLiveErrors((errors) => ({ ...errors, mode: undefined }));
                  setLiveSession((currentState) =>
                    currentState.phase !== 'idle'
                      ? currentState
                      : { ...currentState, mode: event.target.value },
                  );
                }}
                value={liveSession.mode}
              >
                <option value="">Choose a session mode</option>
                {modeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {liveErrors.mode ? (
              <p className="rpg-focus__error" role="alert">
                {liveErrors.mode}
              </p>
            ) : null}

            <label className="rpg-focus__field">
              <span>Unit</span>
              <select
                aria-invalid={liveErrors.unitId ? true : undefined}
                disabled={isSelectedItemLocked || liveSession.phase !== 'idle'}
                onChange={(event) => {
                  const nextUnitId = event.target.value;
                  const nextItemId =
                    getUnitScopedItemOptions(catalog, nextUnitId)[0]?.value ??
                    '';
                  const nextItem =
                    nextItemId.trim().length === 0
                      ? null
                      : (catalog.itemById.get(nextItemId) ?? null);

                  setLiveErrors((errors) => ({
                    ...errors,
                    itemId: undefined,
                    unitId: undefined,
                  }));
                  setLiveSession((currentState) =>
                    currentState.phase !== 'idle'
                      ? currentState
                      : {
                          ...currentState,
                          itemId: nextItemId,
                          mode:
                            currentState.mode.trim().length > 0 ||
                            nextItem === null
                              ? currentState.mode
                              : getItemMode(nextItem.type),
                          unitId: nextUnitId,
                        },
                  );
                }}
                value={liveSession.unitId}
              >
                <option value="">Choose a unit</option>
                {unitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {liveErrors.unitId ? (
              <p className="rpg-focus__error" role="alert">
                {liveErrors.unitId}
              </p>
            ) : null}

            <label className="rpg-focus__field">
              <span>Task</span>
              <select
                aria-invalid={liveErrors.itemId ? true : undefined}
                disabled={
                  isSelectedItemLocked ||
                  liveSession.phase !== 'idle' ||
                  liveSession.unitId.trim().length === 0
                }
                onChange={(event) => {
                  const nextItemId = event.target.value;
                  const nextItem = catalog.itemById.get(nextItemId) ?? null;

                  setLiveErrors((errors) => ({ ...errors, itemId: undefined }));
                  setLiveSession((currentState) =>
                    currentState.phase !== 'idle'
                      ? currentState
                      : {
                          ...currentState,
                          itemId: nextItemId,
                          mode:
                            currentState.mode.trim().length > 0 ||
                            nextItem === null
                              ? currentState.mode
                              : getItemMode(nextItem.type),
                        },
                  );
                }}
                value={liveSession.itemId}
              >
                <option value="">
                  {liveSession.unitId.trim().length === 0
                    ? 'Choose a unit first'
                    : 'Choose a task'}
                </option>
                {itemOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {liveErrors.itemId ? (
              <p className="rpg-focus__error" role="alert">
                {liveErrors.itemId}
              </p>
            ) : null}

            {liveSession.phase === 'running' ||
            liveSession.phase === 'paused' ? (
              <>
                <label className="rpg-focus__field">
                  <span>Local note</span>
                  <textarea
                    aria-invalid={liveErrors.notes ? true : undefined}
                    onChange={(event) => {
                      setLiveErrors((errors) => ({
                        ...errors,
                        notes: undefined,
                      }));
                      setLiveSession((currentState) =>
                        currentState.phase !== 'running' &&
                        currentState.phase !== 'paused'
                          ? currentState
                          : { ...currentState, notes: event.target.value },
                      );
                    }}
                    placeholder="Optional local note for this session."
                    value={liveSession.notes}
                  />
                </label>
                {liveErrors.notes ? (
                  <p className="rpg-focus__error" role="alert">
                    {liveErrors.notes}
                  </p>
                ) : null}

                <label className="rpg-focus__field">
                  <span>Blockers</span>
                  <textarea
                    aria-invalid={liveErrors.blockers ? true : undefined}
                    onChange={(event) => {
                      setLiveErrors((errors) => ({
                        ...errors,
                        blockers: undefined,
                      }));
                      setLiveSession((currentState) =>
                        currentState.phase !== 'running' &&
                        currentState.phase !== 'paused'
                          ? currentState
                          : {
                              ...currentState,
                              blockersText: event.target.value,
                            },
                      );
                    }}
                    placeholder="Optional. One blocker per line."
                    value={liveSession.blockersText}
                  />
                </label>
                {liveErrors.blockers ? (
                  <p className="rpg-focus__error" role="alert">
                    {liveErrors.blockers}
                  </p>
                ) : null}
              </>
            ) : null}

            <div className="rpg-focus__button-row">
              {liveSession.phase === 'idle' ? (
                <RpgButton onClick={handleStart}>Start timer</RpgButton>
              ) : null}
              {liveSession.phase === 'running' ? (
                <RpgButton
                  onClick={() => {
                    setLiveSession((currentState) =>
                      pauseLiveSession(currentState, Date.now()),
                    );
                    setTimerTickMilliseconds(Date.now());
                  }}
                  variant="secondary"
                >
                  Pause
                </RpgButton>
              ) : null}
              {liveSession.phase === 'paused' ? (
                <RpgButton
                  onClick={() => {
                    setLiveSession((currentState) =>
                      resumeLiveSession(currentState, Date.now()),
                    );
                    setTimerTickMilliseconds(Date.now());
                  }}
                  variant="secondary"
                >
                  Resume
                </RpgButton>
              ) : null}
              {liveSession.phase === 'running' ||
              liveSession.phase === 'paused' ||
              liveSession.phase === 'review' ? (
                <RpgButton disabled={isSaving} onClick={handleFinish}>
                  {isSaving ? 'Saving session' : 'Finish session'}
                </RpgButton>
              ) : null}
              {liveSession.phase !== 'idle' ? (
                <RpgButton
                  disabled={isSaving}
                  onClick={resetDraft}
                  variant="danger"
                >
                  Discard session
                </RpgButton>
              ) : null}
            </div>
          </div>
        </RpgPanel>
      ) : (
        <RpgPanel
          className="rpg-focus__summary"
          title="Session saved"
          titleAs="h2"
        >
          <dl className="rpg-focus__summary-details">
            <div>
              <dt>Task</dt>
              <dd>{saveSummary.itemTitle}</dd>
            </div>
            <div>
              <dt>Module</dt>
              <dd>{saveSummary.unitTitle}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{saveSummary.durationMinutes} min</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{saveSummary.modeLabel}</dd>
            </div>
            <div>
              <dt>XP awarded by existing engine</dt>
              <dd>{saveSummary.xpAdded}</dd>
            </div>
          </dl>
          <p className="rpg-focus__note">
            Saved session id: {saveSummary.sessionId}
          </p>
          <div className="rpg-focus__button-row">
            <RpgButton href={rpgRoutePath}>Back to RPG Hub</RpgButton>
            <RpgButton
              href={getRpgResourcePath(saveSummary.itemId)}
              variant="secondary"
            >
              Back to resource
            </RpgButton>
            <RpgButton
              href={getRpgWeekPath(saveSummary.unitId)}
              variant="secondary"
            >
              Back to week
            </RpgButton>
          </div>
        </RpgPanel>
      )}
    </section>
  );
}
