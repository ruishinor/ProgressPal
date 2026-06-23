import { startTransition, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  getCourseProgressStatusOptions,
  validateCourseDetailProgressForm,
  type CourseDetailProgressFormValues,
} from '@/features/course/detailModel';
import {
  RpgButton,
  RpgPanel,
  RpgResourceCard,
  RpgStatusPill,
  type RpgStatusTone,
} from '@/features/rpg/components';
import { saveRpgStudyResourceProgress } from '@/features/rpg/model/progressActions';
import { loadRpgStudyResourceSummary } from '@/features/rpg/model/readModels';
import type { RpgStudyResourceSummary } from '@/features/rpg/model/types';
import type { ProgressStatus } from '@/lib/domain';
import { getRpgFocusPath, getRpgWeekPath } from '@/lib/routing/rpgRoutePaths';

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
  isUpdate: boolean;
  statusLabel: string;
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

function getStatusTone(
  statusVariant: RpgStudyResourceSummary['statusVariant'],
) {
  const tones: Record<RpgStudyResourceSummary['statusVariant'], RpgStatusTone> =
    {
      blocked: 'danger',
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
      <div className="rpg-study-resource__header">
        <p className="rpg-study-resource__eyebrow">Study Resource</p>
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
  const { itemId } = useParams();
  const [state, setState] = useState<RpgResourcePageState>(initialState);
  const [formState, setFormState] = useState<RpgResourceFormState | null>(null);
  const [saveResult, setSaveResult] = useState<RpgResourceSaveResult | null>(
    null,
  );
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadSummary() {
      startTransition(() => {
        setState((currentState) => ({
          ...currentState,
          error: null,
          status: 'loading',
        }));
        setSaveResult(null);
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
        const summary = await loadRpgStudyResourceSummary(itemId);

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
    };
  }, [itemId, reloadToken]);

  const summary = state.summary;
  const progressStatusOptions = useMemo(() => {
    if (summary === null) {
      return [];
    }

    return getCourseProgressStatusOptions({
      currentStatus: summary.progressStatus,
      itemType: summary.itemType,
      longFormProgress: summary.longFormProgress,
      required: summary.required,
    });
  }, [summary]);

  async function saveProgress(nextValues: CourseDetailProgressFormValues) {
    if (summary === null) {
      return;
    }

    const validation = validateCourseDetailProgressForm(nextValues, {
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

    try {
      const result = await saveRpgStudyResourceProgress({
        completedAt: getDefaultCompletedAt(
          summary,
          nextValues.status,
          timestamp,
        ),
        confidence:
          nextValues.status === 'skipped_optional'
            ? 0
            : validation.parsedConfidence,
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
        startedAt: getDefaultStartedAt(summary, nextValues.status, timestamp),
        status: nextValues.status,
      });
      const nextSummary = await loadRpgStudyResourceSummary(summary.itemId);

      if (nextSummary === null) {
        throw new Error('RPG resource disappeared after saving progress.');
      }

      const xpAdded = result.awardedTransactions.reduce(
        (total, transaction) => total + transaction.xp,
        0,
      );

      startTransition(() => {
        setState({
          error: null,
          status: 'ready',
          summary: nextSummary,
        });
        setFormState(createFormState(nextSummary));
        setSaveResult({
          isUpdate: summary.savedProgress !== null,
          statusLabel: nextSummary.statusLabel,
          xpAdded,
        });
      });
    } catch (saveError) {
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
          <div className="rpg-study-resource__header">
            <p className="rpg-study-resource__eyebrow">Study Resource</p>
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
      <div className="rpg-study-resource__header">
        <div>
          <p className="rpg-study-resource__eyebrow">Study Resource</p>
          <h1>{summary.title}</h1>
          <p className="rpg-study-resource__lede">{summary.unitTitle}</p>
        </div>
        <div className="rpg-study-resource__actions">
          <RpgButton href={getRpgWeekPath(summary.unitId)} variant="secondary">
            Back to week
          </RpgButton>
          <RpgButton href={getRpgFocusPath(summary.itemId)} variant="secondary">
            Start focus session
          </RpgButton>
        </div>
      </div>

      <RpgResourceCard
        actions={
          <>
            {summary.officialLink !== null ? (
              <RpgButton
                href={summary.officialLink.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                Open official CS50x resource
              </RpgButton>
            ) : null}
            <RpgButton
              href={getRpgFocusPath(summary.itemId)}
              variant="secondary"
            >
              Start focus session
            </RpgButton>
          </>
        }
        className="rpg-study-resource__card"
        description={`${summary.typeLabel} - ${summary.estimatedMinutesLabel}`}
        meta={
          <>
            <RpgStatusPill tone={getStatusTone(summary.statusVariant)}>
              {summary.statusLabel}
            </RpgStatusPill>
            <RpgStatusPill tone={summary.required ? 'progress' : 'neutral'}>
              {summary.required ? 'Required' : 'Optional'}
            </RpgStatusPill>
          </>
        }
        title="Resource details"
      >
        <div className="rpg-study-resource__placeholder" aria-hidden="true" />
        <dl className="rpg-study-resource__details">
          <div>
            <dt>Module</dt>
            <dd>{summary.unitTitle}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{summary.typeLabel}</dd>
          </div>
          <div>
            <dt>Local status</dt>
            <dd>{summary.statusLabel}</dd>
          </div>
          <div>
            <dt>Estimated time</dt>
            <dd>{summary.estimatedMinutesLabel}</dd>
          </div>
        </dl>
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

      <RpgPanel title="Save local progress" titleAs="h2">
        <form
          className="rpg-study-resource__form"
          noValidate
          onSubmit={handleProgressSubmit}
        >
          <label className="rpg-study-resource__field">
            <span>Progress</span>
            <select
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
                setSaveResult(null);
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
          {formState?.errors.status ? (
            <p className="rpg-study-resource__error" role="alert">
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
                setSaveResult(null);
              }}
              placeholder="What changed, where you got stuck, or what to do next."
              value={formValues.notes}
            />
          </label>

          {showEvidenceField ? (
            <label className="rpg-study-resource__field">
              <span>Submission note</span>
              <textarea
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
                  setSaveResult(null);
                }}
                placeholder="Where did you submit this work?"
                value={formValues.evidenceText}
              />
            </label>
          ) : null}
          {formState?.errors.evidenceText ? (
            <p className="rpg-study-resource__error" role="alert">
              {formState.errors.evidenceText}
            </p>
          ) : null}

          <label className="rpg-study-resource__field rpg-study-resource__field--short">
            <span>Confidence</span>
            <select
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
                setSaveResult(null);
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
            <p className="rpg-study-resource__error" role="alert">
              {formState.errors.confidence}
            </p>
          ) : null}
          {formState?.errors.submit ? (
            <p className="rpg-study-resource__error" role="alert">
              {formState.errors.submit}
            </p>
          ) : null}

          <div className="rpg-study-resource__form-actions">
            <RpgButton disabled={formState?.isSaving ?? false} type="submit">
              Save local progress
            </RpgButton>
            <RpgButton
              disabled={formState?.isSaving ?? false}
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
                <p>{`XP awarded by existing engine: ${saveResult.xpAdded}`}</p>
              ) : null}
            </div>
          ) : null}
        </form>
      </RpgPanel>
    </section>
  );
}
