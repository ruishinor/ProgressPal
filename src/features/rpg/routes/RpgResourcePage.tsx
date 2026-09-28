import { InlineInfo } from '@/components/ui/InlineInfo';
import {
  getQuestActionLabel,
  getLevelProgressDisplay,
} from '@/features/rpg/model/presentation';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  getCourseProgressStatusOptions,
  validateCourseDetailProgressForm,
  type CourseDetailProgressFormValues,
} from '@/features/course/detailModel';
import { getItemStatusLabel } from '@/lib/progress';
import {
  RpgButton,
  RpgPanel,
  RpgProgressBar,
  RpgResourceCard,
  RpgStatusPill,
  type RpgStatusTone,
} from '@/features/rpg/components';
import { saveRpgStudyResourceProgress } from '@/features/rpg/model/progressActions';
import { loadRpgStudyResourceSummary } from '@/features/rpg/model/readModels';
import type { RpgStudyResourceSummary } from '@/features/rpg/model/types';
import type { RpgShellOutletContext } from '@/features/rpg/shell/RpgShell';
import { useAppState } from '@/lib/appState';
import { requireProgrammeScope } from '@/lib/domain';
import type { ProgressStatus } from '@/lib/domain';
import { getActiveProgrammeDefinition } from '@/programmes';
import {
  getRpgFocusPath,
  getRpgResourcePath,
  getRpgWeekPath,
  rpgMapPath,
} from '@/lib/routing/rpgRoutePaths';

type RpgResourcePageStatus = 'error' | 'loading' | 'ready';

type RpgResourcePageState = {
  error: string | null;
  status: RpgResourcePageStatus;
  summary: RpgStudyResourceSummary | null;
};

type RpgResourceFormState = {
  errors: Partial<
    Record<'confidence' | 'evidenceText' | 'status' | 'submit', string>
  >;
  isSaving: boolean;
  values: CourseDetailProgressFormValues;
};

type RpgResourceSaveResult = {
  achievementNames: string[];
  isUpdate: boolean;
  levelProgressLabel: string;
  level: number;
  levelProgressPercent: number | null;
  nextActionHref: string | null;
  nextActionLabel: string | null;
  refreshStatus: 'loading' | 'ready' | 'error';
  statusLabel: string;
  totalXp: number;
  xpToNextLevel: number;
  xpAdded: number;
};

const confidenceOptions = [
  { label: '0 - Not set', value: '0' },
  { label: '1 - Low', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5 - High', value: '5' },
] as const;

const resourceErrorIds = {
  confidence: 'rpg-resource-confidence-error',
  evidenceText: 'rpg-resource-evidence-error',
  status: 'rpg-resource-status-error',
} as const;

const initialState: RpgResourcePageState = {
  error: null,
  status: 'loading',
  summary: null,
};

function createFormValues(
  summary: RpgStudyResourceSummary,
): CourseDetailProgressFormValues {
  return {
    confidence: String(Math.round(summary.savedProgress?.confidence ?? 0)),
    evidenceText: summary.savedProgress?.evidenceText ?? '',
    notes: summary.savedProgress?.notes ?? '',
    status:
      summary.savedProgress?.status ??
      (summary.progressStatus === 'not_started'
        ? 'started'
        : summary.progressStatus),
  };
}

function createFormState(summary: RpgStudyResourceSummary) {
  return {
    errors: {},
    isSaving: false,
    values: createFormValues(summary),
  } satisfies RpgResourceFormState;
}

function matchesSavedValues(
  values: CourseDetailProgressFormValues,
  saved: CourseDetailProgressFormValues | null,
) {
  return (
    saved !== null &&
    Object.entries(values).every(
      ([key, value]) =>
        saved[key as keyof CourseDetailProgressFormValues] === value,
    )
  );
}

function getStatusTone(
  statusVariant: RpgStudyResourceSummary['statusVariant'],
) {
  const tones: Record<RpgStudyResourceSummary['statusVariant'], RpgStatusTone> =
    {
      blocked: 'warning',
      completed: 'success',
      inProgress: 'progress',
      notStarted: 'neutral',
      optional: 'neutral',
    };

  return tones[statusVariant];
}

function getDefaultStartedAt(
  summary: RpgStudyResourceSummary,
  nextStatus: ProgressStatus,
  timestamp: string,
) {
  if (nextStatus === 'skipped_optional') {
    return undefined;
  }

  return summary.savedProgress?.startedAt ?? timestamp;
}

function getDefaultCompletedAt(
  summary: RpgStudyResourceSummary,
  nextStatus: ProgressStatus,
  timestamp: string,
) {
  if (
    nextStatus === 'accepted' ||
    nextStatus === 'completed' ||
    nextStatus === 'submitted'
  ) {
    return summary.savedProgress?.completedAt ?? timestamp;
  }

  return undefined;
}

function RpgResourceLoadingState() {
  return (
    <section className="page-section rpg-study-resource">
      <div className="rpg-study-resource__header rpg-page-header">
        <p className="rpg-study-resource__eyebrow rpg-page-eyebrow">
          Study Resource
        </p>
        <h1>RPG Resource</h1>
      </div>
      <LoadingState
        description="Building the RPG resource from local progress."
        title="Loading RPG resource"
      />
    </section>
  );
}

export function RpgResourcePage() {
  const { copy, unitNoun } = getActiveProgrammeDefinition().content.terminology;
  const { coordination, programmeScope, runLocalMutation } = useAppState();
  const { itemId } = useParams();
  const { refreshHud } = useOutletContext<RpgShellOutletContext>();
  const [state, setState] = useState<RpgResourcePageState>(initialState);
  const [formState, setFormState] = useState<RpgResourceFormState | null>(null);
  const [saveResult, setSaveResult] = useState<RpgResourceSaveResult | null>(
    null,
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [savedFormValues, setSavedFormValues] =
    useState<CourseDetailProgressFormValues | null>(null);
  const saveInFlight = useRef(false);
  const [correctingStatus, setCorrectingStatus] = useState(false);
  const refreshInFlight = useRef(false);
  const savedValues = useRef<CourseDetailProgressFormValues | null>(null);
  const pageVersion = useRef(0);

  useEffect(() => {
    let isActive = true;
    pageVersion.current += 1;
    saveInFlight.current = false;
    refreshInFlight.current = false;
    savedValues.current = null;

    async function loadSummary() {
      startTransition(() => {
        setState((currentState) => ({
          ...currentState,
          error: null,
          status: 'loading',
        }));
        setSaveResult(null);
        setCorrectingStatus(false);
        setSavedFormValues(null);
      });

      if (itemId === undefined || itemId.trim().length === 0) {
        startTransition(() => {
          setState({
            error: 'RPG resource route is missing an item id.',
            status: 'error',
            summary: null,
          });
          setFormState(null);
        });
        return;
      }

      try {
        const summary = await loadRpgStudyResourceSummary(
          requireProgrammeScope(programmeScope),
          itemId,
        );

        if (!isActive) {
          return;
        }

        if (summary === null) {
          startTransition(() => {
            setState({
              error: `No RPG resource was found for "${itemId}".`,
              status: 'error',
              summary: null,
            });
            setFormState(null);
          });
          return;
        }

        startTransition(() => {
          setState({
            error: null,
            status: 'ready',
            summary,
          });
          setFormState(createFormState(summary));
        });
      } catch (loadError) {
        console.error('RPG resource loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            error: 'The RPG resource could not be loaded from local data.',
            status: 'error',
            summary: null,
          });
          setFormState(null);
        });
      }
    }

    void loadSummary();

    return () => {
      isActive = false;
      pageVersion.current += 1;
    };
  }, [itemId, programmeScope, reloadToken]);

  const summary = state.summary;
  const progressStatusOptions = useMemo(() => {
    if (summary === null) {
      return [];
    }

    return getCourseProgressStatusOptions({
      correction: correctingStatus,
      currentStatus: summary.progressStatus,
      itemType: summary.itemType,
      longFormProgress: summary.longFormProgress,
      required: summary.required,
    });
  }, [summary, correctingStatus]);

  async function refreshSavedProgress(resourceId: string) {
    if (refreshInFlight.current) {
      return;
    }

    refreshInFlight.current = true;
    const version = pageVersion.current;
    setSaveResult((current) =>
      current === null ? current : { ...current, refreshStatus: 'loading' },
    );
    try {
      const [nextSummary, nextHudSummary] = await Promise.all([
        loadRpgStudyResourceSummary(
          requireProgrammeScope(programmeScope),
          resourceId,
        ),
        refreshHud(),
      ]);

      if (version !== pageVersion.current) {
        return;
      }

      if (nextSummary === null) {
        throw new Error('RPG resource disappeared after saving progress.');
      }

      const recommendation = nextHudSummary.recommendation;
      const nextQuest = recommendation.quest;
      setState({ error: null, status: 'ready', summary: nextSummary });
      setSaveResult((current) =>
        current === null
          ? current
          : {
              ...current,
              levelProgressLabel: nextHudSummary.xpSummary.levelProgressLabel,
              level: nextHudSummary.xpSummary.level,
              levelProgressPercent:
                nextHudSummary.xpSummary.levelProgressPercent,
              nextActionHref:
                nextQuest === null
                  ? rpgMapPath
                  : getRpgResourcePath(nextQuest.id),
              nextActionLabel:
                nextQuest === null
                  ? 'Open Campaign Map'
                  : `${getQuestActionLabel(nextQuest.status)}: ${nextQuest.title}`,
              refreshStatus: 'ready',
              totalXp: nextHudSummary.xpSummary.totalXp,
              xpToNextLevel: nextHudSummary.xpSummary.xpToNextLevel,
            },
      );
    } catch (loadError) {
      if (version !== pageVersion.current) {
        return;
      }
      console.error(
        'Saved RPG resource summaries could not be refreshed.',
        loadError,
      );
      setSaveResult((current) =>
        current === null ? current : { ...current, refreshStatus: 'error' },
      );
    } finally {
      if (version === pageVersion.current) {
        refreshInFlight.current = false;
      }
    }
  }

  async function saveProgress(nextValues: CourseDetailProgressFormValues) {
    if (
      summary === null ||
      summary.itemId !== itemId ||
      !coordination.canWrite ||
      saveInFlight.current ||
      (saveResult !== null && saveResult.refreshStatus !== 'ready') ||
      matchesSavedValues(nextValues, savedValues.current)
    ) {
      return;
    }

    const validation = validateCourseDetailProgressForm(nextValues, {
      correction: correctingStatus,
      currentStatus: summary.progressStatus,
      itemType: summary.itemType,
      longFormProgress: summary.longFormProgress,
      required: summary.required,
      selectedStatus: nextValues.status,
    });

    if (
      validation.parsedConfidence === null ||
      Object.keys(validation.errors).length > 0
    ) {
      setFormState((currentForm) =>
        currentForm === null
          ? currentForm
          : {
              ...currentForm,
              errors: validation.errors,
              values: nextValues,
            },
      );
      return;
    }

    const parsedConfidence = validation.parsedConfidence;
    const version = pageVersion.current;
    saveInFlight.current = true;

    setFormState((currentForm) =>
      currentForm === null
        ? currentForm
        : {
            ...currentForm,
            errors: {},
            isSaving: true,
            values: nextValues,
          },
    );

    const timestamp = new Date().toISOString();

    let result: Awaited<ReturnType<typeof saveRpgStudyResourceProgress>>;
    try {
      result = await runLocalMutation(
        () =>
          saveRpgStudyResourceProgress(requireProgrammeScope(programmeScope), {
            completedAt: getDefaultCompletedAt(
              summary,
              nextValues.status,
              timestamp,
            ),
            confidence:
              nextValues.status === 'skipped_optional' ? 0 : parsedConfidence,
            evidenceText:
              nextValues.evidenceText.trim().length === 0
                ? undefined
                : nextValues.evidenceText.trim(),
            evidenceType:
              nextValues.evidenceText.trim().length === 0
                ? undefined
                : 'self_report',
            itemId: summary.itemId,
            notes:
              nextValues.notes.trim().length === 0
                ? undefined
                : nextValues.notes.trim(),
            startedAt: getDefaultStartedAt(
              summary,
              nextValues.status,
              timestamp,
            ),
            status: nextValues.status,
          }),
        { invalidateRoute: false },
      );
    } catch (saveError) {
      if (version !== pageVersion.current) {
        return;
      }
      console.error('RPG resource progress save failed.', saveError);
      setFormState((currentForm) =>
        currentForm === null
          ? currentForm
          : {
              ...currentForm,
              errors: {
                submit: 'Progress could not be saved locally. Try again.',
              },
              isSaving: false,
            },
      );
      saveInFlight.current = false;
      return;
    }

    if (version !== pageVersion.current) {
      void refreshHud().catch(() => undefined);
      return;
    }

    // The adapter has committed. Reads below can only change refresh feedback,
    // never turn this confirmed result into a request to repeat the write.
    savedValues.current = nextValues;
    setCorrectingStatus(false);
    setSavedFormValues(nextValues);
    setFormState((current) =>
      current === null ? current : { ...current, isSaving: false },
    );
    setSaveResult({
      achievementNames: result.unlockedAchievements
        .map(
          (unlock) =>
            getActiveProgrammeDefinition().policy.achievements.find(
              (definition) => definition.id === unlock.achievementId,
            )?.title ?? '',
        )
        .filter(Boolean),
      isUpdate: summary.savedProgress !== null,
      levelProgressLabel: getLevelProgressDisplay(result.xpSummary)
        .levelProgressLabel,
      level: result.xpSummary.level,
      levelProgressPercent: null,
      nextActionHref: null,
      nextActionLabel: null,
      refreshStatus: 'loading',
      statusLabel: getItemStatusLabel(
        summary.required,
        result.progressEntry.status,
      ),
      totalXp: result.xpSummary.totalXp,
      xpToNextLevel: result.xpSummary.xpToNextLevel,
      xpAdded: result.awardedTransactions.reduce(
        (total, transaction) => total + transaction.xp,
        0,
      ),
    });
    await refreshSavedProgress(summary.itemId);
    if (version === pageVersion.current) {
      saveInFlight.current = false;
    }
  }

  function handleProgressSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (formState === null) {
      return;
    }

    void saveProgress(formState.values);
  }

  function handleMarkComplete() {
    if (formState === null) {
      return;
    }

    void saveProgress({
      ...formState.values,
      status: 'completed',
    });
  }

  if (state.status === 'loading' || summary === null) {
    if (state.status === 'error') {
      return (
        <section className="page-section rpg-study-resource">
          <div className="rpg-study-resource__header rpg-page-header">
            <p className="rpg-study-resource__eyebrow rpg-page-eyebrow">
              Study Resource
            </p>
            <h1>RPG Resource</h1>
          </div>
          <ErrorState
            action={
              itemId !== undefined && itemId.trim().length > 0 ? (
                <RpgButton
                  onClick={() => {
                    startTransition(() => {
                      setState(initialState);
                      setFormState(null);
                    });
                    setReloadToken((currentToken) => currentToken + 1);
                  }}
                  variant="secondary"
                >
                  Try again
                </RpgButton>
              ) : null
            }
            description={state.error ?? 'Unknown RPG resource error.'}
            title="RPG resource not found"
          />
        </section>
      );
    }

    return <RpgResourceLoadingState />;
  }

  const formValues = formState?.values ?? createFormValues(summary);
  const selectedProgressStatus = formValues.status;
  const showEvidenceField =
    selectedProgressStatus === 'submitted' ||
    selectedProgressStatus === 'accepted';

  return (
    <section className="page-section rpg-study-resource">
      <div className="rpg-study-resource__header rpg-page-header">
        <div>
          <p className="rpg-study-resource__eyebrow rpg-page-eyebrow">
            Study Resource
          </p>
          <h1>{summary.title}</h1>
          <p className="rpg-quest-reward">{summary.rewardLabel}</p>
          <p className="rpg-study-resource__lede rpg-page-lede">
            {summary.unitTitle}
          </p>
          <div className="rpg-study-resource__header-status">
            <RpgStatusPill tone={getStatusTone(summary.statusVariant)}>
              {summary.statusLabel}
            </RpgStatusPill>
            {summary.progressStatus === 'blocked' ? (
              <InlineInfo label="What does Blocked mean?">
                Blocked means you started this task but cannot continue right
                now. It stays available until you change its status.
              </InlineInfo>
            ) : null}
            <RpgStatusPill tone={summary.required ? 'progress' : 'neutral'}>
              {summary.required ? 'Required' : 'Optional'}
            </RpgStatusPill>
            <span>{`${summary.typeLabel} - ${summary.estimatedMinutesLabel}`}</span>
          </div>
        </div>
        <div className="rpg-study-resource__actions">
          {summary.officialLink !== null ? (
            <RpgButton
              href={summary.officialLink.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {summary.statusVariant === 'completed'
                ? copy.officialResourceReviewLabel
                : copy.officialResourceOpenLabel}
            </RpgButton>
          ) : null}
          <RpgButton href={getRpgFocusPath(summary.itemId)} variant="secondary">
            Start focus session
          </RpgButton>
          <RpgButton href={getRpgWeekPath(summary.unitId)} variant="quiet">
            {`Back to ${unitNoun.lowercase}`}
          </RpgButton>
        </div>
      </div>

      {summary.savedProgress?.notes || summary.longFormProgress?.hasProgress ? (
        <RpgResourceCard
          className="rpg-study-resource__card"
          meta={null}
          title="Saved work"
        >
          {summary.savedProgress?.notes ? (
            <div className="rpg-study-resource__saved-note">
              <p>Saved note</p>
              <p>{summary.savedProgress.notes}</p>
            </div>
          ) : null}
          {summary.longFormProgress !== null &&
          summary.longFormProgress.hasProgress ? (
            <p className="rpg-study-resource__note">
              {summary.longFormProgress.summaryLine}
            </p>
          ) : null}
        </RpgResourceCard>
      ) : null}

      <RpgPanel title="Save progress" titleAs="h2">
        {summary.savedProgress ? (
          <div>
            <RpgButton
              variant="quiet"
              disabled={formState?.isSaving || !coordination.canWrite}
              onClick={() => {
                setCorrectingStatus(!correctingStatus);
                setFormState(createFormState(summary));
              }}
            >
              {correctingStatus
                ? 'Cancel status correction'
                : 'Correct saved status'}
            </RpgButton>
            {correctingStatus ? (
              <p role="note">
                Correcting the saved status changes your current ProgressPal
                status. XP and achievements already earned are not removed.
              </p>
            ) : null}
          </div>
        ) : null}
        <form
          className="rpg-study-resource__form"
          noValidate
          onSubmit={handleProgressSubmit}
        >
          <label className="rpg-study-resource__field">
            <span>Progress</span>
            <select
              aria-describedby={
                formState?.errors.status ? resourceErrorIds.status : undefined
              }
              aria-invalid={formState?.errors.status ? true : undefined}
              onChange={(event) => {
                setFormState((currentForm) =>
                  currentForm === null
                    ? currentForm
                    : {
                        ...currentForm,
                        errors: {},
                        values: {
                          ...currentForm.values,
                          status: event.target.value as ProgressStatus,
                        },
                      },
                );
                setSaveResult((current) =>
                  current?.refreshStatus === 'ready' ? null : current,
                );
              }}
              value={formValues.status}
            >
              {progressStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {selectedProgressStatus === 'blocked' &&
          summary.progressStatus !== 'blocked' ? (
            <span>
              Blocked{' '}
              <InlineInfo label="What does Blocked mean?">
                Blocked means you started this task but cannot continue right
                now. It stays available until you change its status.
              </InlineInfo>
            </span>
          ) : null}
          {formState?.errors.status ? (
            <p
              className="rpg-study-resource__error"
              id={resourceErrorIds.status}
              role="alert"
            >
              {formState.errors.status}
            </p>
          ) : null}

          <label className="rpg-study-resource__field">
            <span>Add study note</span>
            <textarea
              onChange={(event) => {
                setFormState((currentForm) =>
                  currentForm === null
                    ? currentForm
                    : {
                        ...currentForm,
                        values: {
                          ...currentForm.values,
                          notes: event.target.value,
                        },
                      },
                );
                setSaveResult((current) =>
                  current?.refreshStatus === 'ready' ? null : current,
                );
              }}
              placeholder="What changed, where you got stuck, or what to do next."
              value={formValues.notes}
            />
          </label>

          {showEvidenceField ? (
            <label className="rpg-study-resource__field">
              <span>Submission note</span>
              <textarea
                aria-describedby={
                  formState?.errors.evidenceText
                    ? resourceErrorIds.evidenceText
                    : undefined
                }
                aria-invalid={formState?.errors.evidenceText ? true : undefined}
                onChange={(event) => {
                  setFormState((currentForm) =>
                    currentForm === null
                      ? currentForm
                      : {
                          ...currentForm,
                          errors: {},
                          values: {
                            ...currentForm.values,
                            evidenceText: event.target.value,
                          },
                        },
                  );
                  setSaveResult((current) =>
                    current?.refreshStatus === 'ready' ? null : current,
                  );
                }}
                placeholder="Where did you submit this work?"
                value={formValues.evidenceText}
              />
            </label>
          ) : null}
          {formState?.errors.evidenceText ? (
            <p
              className="rpg-study-resource__error"
              id={resourceErrorIds.evidenceText}
              role="alert"
            >
              {formState.errors.evidenceText}
            </p>
          ) : null}

          <details
            className="form-details"
            open={Boolean(formState?.errors.confidence)}
          >
            <summary>More details</summary>
            <div className="form-details__content">
              <label className="rpg-study-resource__field rpg-study-resource__field--short">
                <span>How sure are you?</span>
                <select
                  aria-describedby={
                    formState?.errors.confidence
                      ? resourceErrorIds.confidence
                      : undefined
                  }
                  aria-invalid={formState?.errors.confidence ? true : undefined}
                  onChange={(event) => {
                    setFormState((currentForm) =>
                      currentForm === null
                        ? currentForm
                        : {
                            ...currentForm,
                            errors: {},
                            values: {
                              ...currentForm.values,
                              confidence: event.target.value,
                            },
                          },
                    );
                    setSaveResult((current) =>
                      current?.refreshStatus === 'ready' ? null : current,
                    );
                  }}
                  value={formValues.confidence}
                >
                  {confidenceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {formState?.errors.confidence ? (
                <p
                  className="rpg-study-resource__error"
                  id={resourceErrorIds.confidence}
                  role="alert"
                >
                  {formState.errors.confidence}
                </p>
              ) : null}
            </div>
          </details>
          {formState?.errors.submit ? (
            <p className="rpg-study-resource__error" role="alert">
              {formState.errors.submit}
            </p>
          ) : null}

          <div className="rpg-study-resource__form-actions">
            <RpgButton
              disabled={
                !coordination.canWrite ||
                (formState?.isSaving ?? false) ||
                (saveResult !== null && saveResult.refreshStatus !== 'ready') ||
                matchesSavedValues(formValues, savedFormValues)
              }
              type="submit"
            >
              {correctingStatus ? 'Save status correction' : 'Save progress'}
            </RpgButton>
            <RpgButton
              disabled={
                !coordination.canWrite ||
                (formState?.isSaving ?? false) ||
                (saveResult !== null && saveResult.refreshStatus !== 'ready') ||
                matchesSavedValues(
                  { ...formValues, status: 'completed' },
                  savedFormValues,
                )
              }
              onClick={handleMarkComplete}
              type="button"
              variant="secondary"
            >
              Mark locally complete
            </RpgButton>
          </div>
          {saveResult !== null ? (
            <div className="rpg-study-resource__save-result" role="status">
              <h2>
                {saveResult.isUpdate ? 'Progress updated' : 'Progress saved'}
              </h2>
              <p>{`Local status: ${saveResult.statusLabel}`}</p>
              {saveResult.xpAdded > 0 ? (
                <p>{`XP awarded: ${saveResult.xpAdded}`}</p>
              ) : null}
              {saveResult.achievementNames.length > 0 ? (
                <p>{`Achievement unlocked: ${saveResult.achievementNames.join(', ')}`}</p>
              ) : null}
              {saveResult.levelProgressPercent === null ? (
                <p>{`At save: Level ${saveResult.level}, ${saveResult.levelProgressLabel}.`}</p>
              ) : (
                <RpgProgressBar
                  helperText={saveResult.levelProgressLabel}
                  label={`Level ${saveResult.level} progress`}
                  value={saveResult.levelProgressPercent}
                />
              )}
              {saveResult.refreshStatus === 'error' ? (
                <>
                  <p>
                    Progress is saved locally. Resource details and the next
                    quest could not be refreshed; the other details on this page
                    may be out of date. Refresh the summary to continue.
                  </p>
                  <RpgButton
                    onClick={() => {
                      void refreshSavedProgress(summary.itemId);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    Refresh progress summary
                  </RpgButton>
                </>
              ) : saveResult.refreshStatus === 'loading' ? (
                <p>Progress is saved locally. Refreshing the summary…</p>
              ) : saveResult.nextActionHref !== null ? (
                <RpgButton href={saveResult.nextActionHref} variant="secondary">
                  {saveResult.nextActionLabel}
                </RpgButton>
              ) : null}
            </div>
          ) : null}
        </form>
      </RpgPanel>
    </section>
  );
}
