import { startTransition, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField } from '@/components/ui/FormField';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { SliceProgressBar } from '@/components/ui/SliceProgressBar';
import { StatusPill } from '@/components/ui/StatusPill';
import { TextArea } from '@/components/ui/TextArea';
import { TextInput } from '@/components/ui/TextInput';
import { Toast, ToastStack } from '@/components/ui/Toast';
import {
  courseMapPath,
  getCourseItemDetailPath,
  getStudySessionsPath,
} from '@/features/course/paths';
import {
  buildCourseDetailView,
  createCourseDetailProgressFormValues,
  getCourseProgressStatusOptions,
  validateCourseDetailProgressForm,
  type CourseDetailProgressFormValues,
} from '@/features/course/detailModel';
import { formatMinutes } from '@/features/course/model';
import {
  buildLongFormDetailView,
  type LongFormDetailView,
} from '@/features/progress';
import {
  getCourseItem,
  getCourseUnit,
  getProgress,
  getResumePoint,
  listContentAssets,
  listContentSlices,
  listMediaProgressEvents,
  logMediaProgressAndAwardXp,
  upsertProgressAndAwardXp,
  type LogMediaProgressInput,
} from '@/lib/db';
import type {
  ContentAsset,
  CourseItem,
  CourseUnit,
  MediaStopReason,
  ProgressEntry,
  ResumePoint,
} from '@/lib/domain';
import { formatLoggedMinutes, formatMediaTimestamp } from '@/lib/progress';
import { formatTimestampInput, parseTimestampInput } from '@/lib/time';

type ContentDetailPageStatus = 'error' | 'loading' | 'ready';

type ContentDetailData = {
  asset: ContentAsset | null;
  item: CourseItem;
  longFormDetail: LongFormDetailView | null;
  progressEntry: ProgressEntry | null;
  resumePoint: ResumePoint | null;
  unit: CourseUnit;
};

type ContentDetailPageState = {
  detail: ContentDetailData | null;
  error: string | null;
  status: ContentDetailPageStatus;
};

type ProgressFormState = {
  errors: Partial<
    Record<'confidence' | 'evidenceText' | 'status' | 'submit', string>
  >;
  isSaving: boolean;
  values: CourseDetailProgressFormValues;
};

type LogFormState = {
  energyAfter: string;
  energyBefore: string;
  endTimestamp: string;
  error: string | null;
  isSaving: boolean;
  notes: string;
  startTimestamp: string;
  stoppedBecause: MediaStopReason;
};

type ToastState = {
  description: string;
  title: string;
  tone: 'danger' | 'success';
} | null;

const initialPageState: ContentDetailPageState = {
  detail: null,
  error: null,
  status: 'loading',
};

const mediaStopReasonOptions: readonly {
  label: string;
  value: MediaStopReason;
}[] = [
  { label: 'Completed slice', value: 'completed_slice' },
  { label: 'Reached limit', value: 'reached_limit' },
  { label: 'Interruption', value: 'interruption' },
  { label: 'Confusion', value: 'confusion' },
  { label: 'Fatigue', value: 'fatigue' },
  { label: 'Finished time box', value: 'time_box_finished' },
  { label: 'Other', value: 'other' },
] as const;

const confidenceOptions = [
  { label: '0 - Not set', value: '0' },
  { label: '1 - Low', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5 - High', value: '5' },
] as const;

const energyOptions = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
] as const;

const assetTypeLabels = {
  lab: 'Lab material',
  problem_set: 'Problem-set material',
  project_task: 'Project-task material',
  reading: 'Reading',
  shorts_group: 'Shorts group',
  video: 'Video',
} as const;

function getAssetSummaryDescription(asset: ContentDetailData['asset']) {
  if (asset === null) {
    return null;
  }

  return `${assetTypeLabels[asset.assetType]} - ${formatMinutes(asset.estimatedMinutes)} planned`;
}

function createEmptyProgressFormState(
  progressEntry: ProgressEntry | null,
  longFormDetail: LongFormDetailView | null,
) {
  const currentStatus =
    progressEntry?.status ??
    (longFormDetail?.progress?.hasProgress ? 'started' : 'not_started');

  return {
    errors: {},
    isSaving: false,
    values: createCourseDetailProgressFormValues(progressEntry, currentStatus),
  } satisfies ProgressFormState;
}

function createLogFormState(
  asset: ContentAsset,
  longFormDetail: LongFormDetailView,
) {
  const resumeSecond = longFormDetail.progress?.resumeSecond ?? 0;
  const nextSlice =
    longFormDetail.slices.find((slice) => slice.isNext) ??
    longFormDetail.slices.find((slice) => slice.status !== 'completed') ??
    null;
  const defaultEndSecond =
    nextSlice?.endSecond ??
    Math.min(
      resumeSecond + (asset.defaultSliceMinutes ?? 20) * 60,
      asset.durationSeconds ?? resumeSecond,
    );

  return {
    energyAfter: '3',
    energyBefore: '3',
    endTimestamp: formatTimestampInput(defaultEndSecond),
    error: null,
    isSaving: false,
    notes: '',
    startTimestamp: formatTimestampInput(resumeSecond),
    stoppedBecause: 'reached_limit',
  } satisfies LogFormState;
}

function getSliceTone(status: LongFormDetailView['slices'][number]['status']) {
  switch (status) {
    case 'completed':
      return 'success' as const;
    case 'inProgress':
      return 'warning' as const;
    case 'skipped':
      return 'warning' as const;
    case 'notStarted':
    default:
      return 'neutral' as const;
  }
}

function getDefaultStartedAt(
  progressEntry: ProgressEntry | null,
  nextStatus: ProgressEntry['status'],
  timestamp: string,
) {
  if (nextStatus === 'not_started' || nextStatus === 'skipped_optional') {
    return undefined;
  }

  return progressEntry?.startedAt ?? timestamp;
}

function getDefaultCompletedAt(
  progressEntry: ProgressEntry | null,
  nextStatus: ProgressEntry['status'],
  timestamp: string,
) {
  if (
    nextStatus === 'accepted' ||
    nextStatus === 'completed' ||
    nextStatus === 'submitted'
  ) {
    return progressEntry?.completedAt ?? timestamp;
  }

  return undefined;
}

async function loadContentDetail(itemId: string): Promise<ContentDetailData> {
  const item = await getCourseItem(itemId);

  if (item === null) {
    throw new Error(
      'The requested course item was not found in the local catalog.',
    );
  }

  const [unit, progressEntry, assets] = await Promise.all([
    getCourseUnit(item.unitId),
    getProgress(item.id),
    listContentAssets(item.id),
  ]);

  if (unit === null) {
    throw new Error('The parent unit for this course item could not be found.');
  }

  const asset = assets[0] ?? null;

  if (asset === null) {
    return {
      asset: null,
      item,
      longFormDetail: null,
      progressEntry,
      resumePoint: null,
      unit,
    };
  }

  const [slices, events, resumePoint] = await Promise.all([
    listContentSlices(asset.id),
    listMediaProgressEvents(asset.id),
    getResumePoint(asset.id),
  ]);

  return {
    asset,
    item,
    longFormDetail: buildLongFormDetailView(
      asset,
      slices,
      events,
      resumePoint,
      progressEntry,
    ),
    progressEntry,
    resumePoint,
    unit,
  };
}

export function ContentDetailPage() {
  const params = useParams<{ itemId: string }>();
  const [progressForm, setProgressForm] = useState<ProgressFormState | null>(
    null,
  );
  const [logForm, setLogForm] = useState<LogFormState | null>(null);
  const [pageState, setPageState] =
    useState<ContentDetailPageState>(initialPageState);
  const [reloadToken, setReloadToken] = useState(0);
  const [toast, setToast] = useState<ToastState>(null);
  const itemId = params.itemId ?? '';

  useEffect(() => {
    let isActive = true;

    startTransition(() => {
      setPageState({
        detail: null,
        error: null,
        status: 'loading',
      });
    });

    void (async () => {
      try {
        const detail = await loadContentDetail(itemId);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setPageState({
            detail,
            error: null,
            status: 'ready',
          });
        });
      } catch (loadError) {
        console.error('Content detail loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setPageState({
            detail: null,
            error:
              loadError instanceof Error
                ? loadError.message
                : 'The content detail route could not read local data.',
            status: 'error',
          });
        });
      }
    })();

    return () => {
      isActive = false;
    };
  }, [itemId, reloadToken]);

  useEffect(() => {
    if (pageState.detail === null) {
      return;
    }

    setProgressForm(
      createEmptyProgressFormState(
        pageState.detail.progressEntry,
        pageState.detail.longFormDetail,
      ),
    );

    if (
      pageState.detail.asset !== null &&
      pageState.detail.longFormDetail !== null &&
      !pageState.detail.longFormDetail.progress?.isComplete
    ) {
      setLogForm(
        createLogFormState(
          pageState.detail.asset,
          pageState.detail.longFormDetail,
        ),
      );
      return;
    }

    setLogForm(null);
  }, [pageState.detail]);

  if (pageState.status === 'loading' || pageState.detail === null) {
    if (pageState.status === 'error') {
      return (
        <section className="page-section">
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
            description="The detail route depends only on local seeded catalog data and saved progress records."
            eyebrow={`Route: /course/${itemId || ':itemId'}`}
            title="Content detail"
          />
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
            description={
              pageState.error ?? 'Unknown local content-detail error.'
            }
            title="Content detail could not be opened"
          />
        </section>
      );
    }

    return (
      <section className="page-section">
        <PageHeader
          description="Opening the seeded item, its local progress record, and any saved long-form asset history."
          eyebrow={`Route: /course/${itemId || ':itemId'}`}
          title="Content detail"
        />
        <LoadingState
          description="Reading the selected item and assembling its saved local detail view."
          title="Loading content detail"
        />
      </section>
    );
  }

  const detail = pageState.detail;
  const detailView = buildCourseDetailView(
    detail.unit,
    detail.item,
    detail.progressEntry,
    detail.longFormDetail?.progress ?? null,
  );
  const progressStatusOptions = getCourseProgressStatusOptions({
    currentStatus: detailView.progressStatus,
    itemType: detail.item.type,
    longFormProgress: detail.longFormDetail?.progress ?? null,
    required: detail.item.required,
  });
  const detailPath = getCourseItemDetailPath(detail.item.id);

  async function handleProgressSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (progressForm === null) {
      return;
    }

    const validation = validateCourseDetailProgressForm(progressForm.values, {
      currentStatus: detailView.progressStatus,
      itemType: detail.item.type,
      longFormProgress: detail.longFormDetail?.progress ?? null,
      required: detail.item.required,
      selectedStatus: progressForm.values.status,
    });

    if (
      validation.parsedConfidence === null ||
      Object.keys(validation.errors).length > 0
    ) {
      setProgressForm((currentForm) =>
        currentForm === null
          ? currentForm
          : {
              ...currentForm,
              errors: validation.errors,
            },
      );

      return;
    }

    setProgressForm((currentForm) =>
      currentForm === null
        ? currentForm
        : {
            ...currentForm,
            errors: {},
            isSaving: true,
          },
    );

    const timestamp = new Date().toISOString();

    try {
      const xpResult = await upsertProgressAndAwardXp({
        itemId: detail.item.id,
        status: progressForm.values.status,
        startedAt: getDefaultStartedAt(
          detail.progressEntry,
          progressForm.values.status,
          timestamp,
        ),
        completedAt: getDefaultCompletedAt(
          detail.progressEntry,
          progressForm.values.status,
          timestamp,
        ),
        confidence:
          progressForm.values.status === 'skipped_optional'
            ? 0
            : validation.parsedConfidence,
        notes:
          progressForm.values.notes.trim().length === 0
            ? undefined
            : progressForm.values.notes.trim(),
        evidenceType:
          progressForm.values.evidenceText.trim().length === 0
            ? undefined
            : 'self_report',
        evidenceText:
          progressForm.values.evidenceText.trim().length === 0
            ? undefined
            : progressForm.values.evidenceText.trim(),
      });

      const xpAdded = xpResult.awardedTransactions.reduce(
        (sum, tx) => sum + tx.xp,
        0,
      );
      const xpToastSuffix = xpAdded > 0 ? ` (+${xpAdded} XP!)` : '';

      setToast({
        description: `The item status, notes, and evidence were saved to local persistence.${xpToastSuffix}`,
        title: 'Progress saved',
        tone: 'success',
      });
      setReloadToken((currentToken) => currentToken + 1);
    } catch (saveError) {
      setProgressForm((currentForm) =>
        currentForm === null
          ? currentForm
          : {
              ...currentForm,
              errors: {
                ...currentForm.errors,
                submit:
                  saveError instanceof Error
                    ? saveError.message
                    : 'The progress record could not be saved.',
              },
              isSaving: false,
            },
      );
    }
  }

  async function handleLogSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (logForm === null || detail.asset === null) {
      return;
    }

    const startSecond = parseTimestampInput(logForm.startTimestamp);
    const endSecond = parseTimestampInput(logForm.endTimestamp);

    if (startSecond === null || endSecond === null) {
      setLogForm((currentForm) =>
        currentForm === null
          ? currentForm
          : {
              ...currentForm,
              error:
                'Enter timestamps in m:ss or h:mm:ss format before saving.',
            },
      );

      return;
    }

    if (endSecond <= startSecond) {
      setLogForm((currentForm) =>
        currentForm === null
          ? currentForm
          : {
              ...currentForm,
              error: 'End timestamp must be later than the start timestamp.',
            },
      );

      return;
    }

    if (
      detail.asset.durationSeconds !== undefined &&
      endSecond > detail.asset.durationSeconds
    ) {
      setLogForm((currentForm) =>
        currentForm === null
          ? currentForm
          : {
              ...currentForm,
              error: 'End timestamp cannot exceed the saved asset duration.',
            },
      );

      return;
    }

    setLogForm((currentForm) =>
      currentForm === null
        ? currentForm
        : {
            ...currentForm,
            error: null,
            isSaving: true,
          },
    );

    try {
      const xpResult = await logMediaProgressAndAwardXp({
        assetId: detail.asset.id,
        endSecond,
        energyAfter: Number.parseInt(logForm.energyAfter, 10),
        energyBefore: Number.parseInt(logForm.energyBefore, 10),
        notes:
          logForm.notes.trim().length === 0 ? undefined : logForm.notes.trim(),
        startSecond,
        stoppedBecause: logForm.stoppedBecause,
      } satisfies LogMediaProgressInput);

      const xpAdded = xpResult.awardedTransactions.reduce(
        (sum, tx) => sum + tx.xp,
        0,
      );
      const xpToastSuffix = xpAdded > 0 ? ` (+${xpAdded} XP!)` : '';

      setToast({
        description: `The watched range, stop reason, and resume point were saved locally.${xpToastSuffix}`,
        title: 'Watched range saved',
        tone: 'success',
      });
      setReloadToken((currentToken) => currentToken + 1);
    } catch (saveError) {
      setLogForm((currentForm) =>
        currentForm === null
          ? currentForm
          : {
              ...currentForm,
              error:
                saveError instanceof Error
                  ? saveError.message
                  : 'The watched range could not be saved.',
              isSaving: false,
            },
      );
    }
  }

  function setQuickRange(nextEndSecond: number) {
    if (logForm === null || detail.asset === null) {
      return;
    }

    const startSecond =
      parseTimestampInput(logForm.startTimestamp) ??
      detail.longFormDetail?.progress?.resumeSecond ??
      0;
    const clampedEndSecond = Math.min(
      Math.max(nextEndSecond, startSecond + 1),
      detail.asset.durationSeconds ?? nextEndSecond,
    );

    setLogForm((currentForm) =>
      currentForm === null
        ? currentForm
        : {
            ...currentForm,
            endTimestamp: formatTimestampInput(clampedEndSecond),
            error: null,
            startTimestamp: formatTimestampInput(startSecond),
          },
    );
  }

  const watchedRangeSeconds =
    logForm === null
      ? null
      : (() => {
          const startSecond = parseTimestampInput(logForm.startTimestamp);
          const endSecond = parseTimestampInput(logForm.endTimestamp);

          if (
            startSecond === null ||
            endSecond === null ||
            endSecond <= startSecond
          ) {
            return null;
          }

          return endSecond - startSecond;
        })();

  return (
    <section className="page-section">
      <PageHeader
        actions={
          <div className="action-row">
            <Link
              className="button button--secondary button--md"
              to={courseMapPath}
            >
              Back to course map
            </Link>
            <Link
              className="button button--secondary button--md"
              to={getStudySessionsPath(detail.item.id)}
            >
              Log a study session
            </Link>
          </div>
        }
        description="This screen is the write surface for one local course item. Long-form items can log exact watched ranges; other items can still persist status, confidence, notes, and evidence without waiting for later modules."
        eyebrow={`Route: ${detailPath}`}
        meta={
          <>
            <StatusPill variant={detailView.statusVariant}>
              {detailView.statusLabel}
            </StatusPill>
            <Badge tone="accent">{detailView.typeLabel}</Badge>
            <Badge tone={detailView.required ? 'accent' : 'neutral'}>
              {detailView.required ? 'Required' : 'Optional'}
            </Badge>
            <Badge tone="neutral">{detailView.estimatedMinutesLabel}</Badge>
          </>
        }
        title={`${detailView.unitTitle} - ${detailView.title}`}
      />
      <div className="course-detail-grid">
        <Card
          description="This stays local. It drives the course-map rollups without introducing later-module dashboard or XP behavior."
          title="Progress record"
          variant="accent"
        >
          <form
            className="course-detail-form"
            noValidate
            onSubmit={(event) => {
              void handleProgressSubmit(event);
            }}
          >
            <div className="form-grid">
              <FormField
                controlId="course-detail-status"
                error={progressForm?.errors.status}
                label="Status"
                required
              >
                {({ describedBy, inputId, invalid }) => (
                  <Select
                    aria-describedby={describedBy}
                    aria-invalid={invalid || undefined}
                    id={inputId}
                    onChange={(event) =>
                      setProgressForm((currentForm) =>
                        currentForm === null
                          ? currentForm
                          : {
                              ...currentForm,
                              values: {
                                ...currentForm.values,
                                status: event.target
                                  .value as CourseDetailProgressFormValues['status'],
                              },
                            },
                      )
                    }
                    options={progressStatusOptions}
                    value={
                      progressForm?.values.status ??
                      progressStatusOptions[0]?.value
                    }
                  />
                )}
              </FormField>
              <FormField
                controlId="course-detail-confidence"
                description="0 means unset. 5 means high confidence."
                error={progressForm?.errors.confidence}
                label="Confidence"
                required
              >
                {({ describedBy, inputId, invalid }) => (
                  <Select
                    aria-describedby={describedBy}
                    aria-invalid={invalid || undefined}
                    id={inputId}
                    onChange={(event) =>
                      setProgressForm((currentForm) =>
                        currentForm === null
                          ? currentForm
                          : {
                              ...currentForm,
                              values: {
                                ...currentForm.values,
                                confidence: event.target.value,
                              },
                            },
                      )
                    }
                    options={confidenceOptions}
                    value={progressForm?.values.confidence ?? '0'}
                  />
                )}
              </FormField>
            </div>
            <FormField
              controlId="course-detail-notes"
              description="Use notes for friction, blockers, or what changed."
              label="Notes"
            >
              {({ describedBy, inputId, invalid }) => (
                <TextArea
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  id={inputId}
                  onChange={(event) =>
                    setProgressForm((currentForm) =>
                      currentForm === null
                        ? currentForm
                        : {
                            ...currentForm,
                            values: {
                              ...currentForm.values,
                              notes: event.target.value,
                            },
                          },
                    )
                  }
                  placeholder="Local notes about this item."
                  value={progressForm?.values.notes ?? ''}
                />
              )}
            </FormField>
            <FormField
              controlId="course-detail-evidence"
              description="Required when a problem set or lab is marked accepted."
              error={progressForm?.errors.evidenceText}
              label="Evidence"
            >
              {({ describedBy, inputId, invalid }) => (
                <TextArea
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  id={inputId}
                  onChange={(event) =>
                    setProgressForm((currentForm) =>
                      currentForm === null
                        ? currentForm
                        : {
                            ...currentForm,
                            values: {
                              ...currentForm.values,
                              evidenceText: event.target.value,
                            },
                          },
                    )
                  }
                  placeholder="What proves this is done?"
                  value={progressForm?.values.evidenceText ?? ''}
                />
              )}
            </FormField>
            {progressForm?.errors.submit ? (
              <p className="form-field__error" role="alert">
                {progressForm.errors.submit}
              </p>
            ) : null}
            <div className="course-detail-form__actions">
              <Button
                loading={progressForm?.isSaving ?? false}
                size="lg"
                type="submit"
              >
                Save local progress
              </Button>
            </div>
          </form>
        </Card>
        <Card
          description="The route stays bounded to the current item and whatever local progress has already been saved for it."
          title="Item context"
        >
          <dl className="course-map-stat-list">
            <div>
              <dt>Unit</dt>
              <dd>{detail.unit.title}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{detailView.typeLabel}</dd>
            </div>
            <div>
              <dt>Planned time</dt>
              <dd>{detailView.estimatedMinutesLabel}</dd>
            </div>
            <div>
              <dt>Asset tracking</dt>
              <dd>
                {detail.asset === null
                  ? 'Not applicable'
                  : getAssetSummaryDescription(detail.asset)}
              </dd>
            </div>
          </dl>
          {detail.longFormDetail?.progress?.summaryLine ? (
            <div className="course-detail-note">
              <p className="course-detail-note__label">
                Saved progress summary
              </p>
              <p>{detail.longFormDetail.progress.summaryLine}</p>
            </div>
          ) : (
            <div className="course-detail-note">
              <p className="course-detail-note__label">Current boundary</p>
              <p>
                This item has no granular asset timeline yet, so the local
                progress record above is the only mutable surface in this
                module.
              </p>
            </div>
          )}
        </Card>
      </div>
      {detail.asset !== null && detail.longFormDetail !== null ? (
        <Card
          description="This timeline reflects only saved local ranges. It does not guess unwatched minutes."
          title="Slice timeline"
        >
          <SliceProgressBar
            helperText={
              detail.longFormDetail.progress?.summaryLine ??
              'No watched ranges saved yet.'
            }
            label="Saved slice progress"
            segments={detail.longFormDetail.slices.map((slice) => ({
              completion: slice.completionPercent / 100,
              id: slice.id,
              label: slice.label,
              status: slice.status,
            }))}
          />
          <div className="course-detail-meta-cluster">
            <Badge tone="neutral">
              {formatMediaTimestamp(detail.asset.durationSeconds ?? 0)} total
            </Badge>
            <Badge tone="accent">
              {detail.longFormDetail.eventCount} saved event
              {detail.longFormDetail.eventCount === 1 ? '' : 's'}
            </Badge>
            {detail.longFormDetail.lastLoggedRangeLabel ? (
              <Badge tone="neutral">
                Last range {detail.longFormDetail.lastLoggedRangeLabel}
              </Badge>
            ) : null}
            {detail.longFormDetail.lastStopReasonLabel ? (
              <Badge tone="warning">
                {detail.longFormDetail.lastStopReasonLabel}
              </Badge>
            ) : null}
          </div>
          <ol className="slice-detail-list">
            {detail.longFormDetail.slices.map((slice) => (
              <li className="slice-detail-list__item" key={slice.id}>
                <div className="slice-detail-list__copy">
                  <div className="slice-detail-list__title-row">
                    <p className="slice-detail-list__title">{slice.label}</p>
                    {slice.isNext ? <Badge tone="accent">Next</Badge> : null}
                  </div>
                  <p className="course-item-row__eyebrow">
                    {formatMediaTimestamp(slice.startSecond)}-
                    {formatMediaTimestamp(slice.endSecond)}
                  </p>
                </div>
                <div className="slice-detail-list__meta">
                  <Badge tone={getSliceTone(slice.status)}>
                    {slice.statusLabel}
                  </Badge>
                  <Badge tone="neutral">
                    {slice.completionPercent}% logged
                  </Badge>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
      {detail.asset !== null &&
      detail.longFormDetail !== null &&
      logForm !== null ? (
        <Card
          description="Enter exact watched ranges. Duplicate exact ranges are blocked, and overlapping ranges are merged honestly later."
          title="Log watched range"
        >
          <form
            className="course-detail-form"
            noValidate
            onSubmit={(event) => {
              void handleLogSubmit(event);
            }}
          >
            <div className="inline-actions">
              <Button
                onClick={() => {
                  const nextSlice =
                    detail.longFormDetail?.slices.find(
                      (slice) => slice.isNext,
                    ) ?? null;

                  if (nextSlice === null) {
                    return;
                  }

                  setLogForm((currentForm) =>
                    currentForm === null
                      ? currentForm
                      : {
                          ...currentForm,
                          endTimestamp: formatTimestampInput(
                            nextSlice.endSecond,
                          ),
                          error: null,
                          startTimestamp: formatTimestampInput(
                            detail.longFormDetail?.progress?.resumeSecond ??
                              nextSlice.startSecond,
                          ),
                        },
                  );
                }}
                variant="secondary"
              >
                Use next slice
              </Button>
              <Button
                onClick={() => {
                  const startSecond =
                    parseTimestampInput(logForm.startTimestamp) ??
                    detail.longFormDetail?.progress?.resumeSecond ??
                    0;

                  setLogForm((currentForm) =>
                    currentForm === null
                      ? currentForm
                      : {
                          ...currentForm,
                          error: null,
                          startTimestamp: formatTimestampInput(startSecond),
                        },
                  );
                  setQuickRange(startSecond + 600);
                }}
                variant="quiet"
              >
                +10 min
              </Button>
              <Button
                onClick={() => {
                  const startSecond =
                    parseTimestampInput(logForm.startTimestamp) ??
                    detail.longFormDetail?.progress?.resumeSecond ??
                    0;

                  setLogForm((currentForm) =>
                    currentForm === null
                      ? currentForm
                      : {
                          ...currentForm,
                          error: null,
                          startTimestamp: formatTimestampInput(startSecond),
                        },
                  );
                  setQuickRange(startSecond + 1200);
                }}
                variant="quiet"
              >
                +20 min
              </Button>
            </div>
            <div className="form-grid">
              <FormField
                controlId="content-log-start"
                description="Use m:ss or h:mm:ss."
                label="Start timestamp"
                required
              >
                {({ describedBy, inputId, invalid }) => (
                  <TextInput
                    aria-describedby={describedBy}
                    aria-invalid={invalid || undefined}
                    id={inputId}
                    onChange={(event) =>
                      setLogForm((currentForm) =>
                        currentForm === null
                          ? currentForm
                          : {
                              ...currentForm,
                              error: null,
                              startTimestamp: event.target.value,
                            },
                      )
                    }
                    placeholder="0:00"
                    value={logForm.startTimestamp}
                  />
                )}
              </FormField>
              <FormField
                controlId="content-log-end"
                description="The saved range cannot exceed the asset duration."
                label="End timestamp"
                required
              >
                {({ describedBy, inputId, invalid }) => (
                  <TextInput
                    aria-describedby={describedBy}
                    aria-invalid={invalid || undefined}
                    id={inputId}
                    onChange={(event) =>
                      setLogForm((currentForm) =>
                        currentForm === null
                          ? currentForm
                          : {
                              ...currentForm,
                              endTimestamp: event.target.value,
                              error: null,
                            },
                      )
                    }
                    placeholder="20:00"
                    value={logForm.endTimestamp}
                  />
                )}
              </FormField>
              <FormField
                controlId="content-log-energy-before"
                label="Energy before"
                required
              >
                {({ describedBy, inputId, invalid }) => (
                  <Select
                    aria-describedby={describedBy}
                    aria-invalid={invalid || undefined}
                    id={inputId}
                    onChange={(event) =>
                      setLogForm((currentForm) =>
                        currentForm === null
                          ? currentForm
                          : {
                              ...currentForm,
                              energyBefore: event.target.value,
                            },
                      )
                    }
                    options={energyOptions}
                    value={logForm.energyBefore}
                  />
                )}
              </FormField>
              <FormField
                controlId="content-log-energy-after"
                label="Energy after"
                required
              >
                {({ describedBy, inputId, invalid }) => (
                  <Select
                    aria-describedby={describedBy}
                    aria-invalid={invalid || undefined}
                    id={inputId}
                    onChange={(event) =>
                      setLogForm((currentForm) =>
                        currentForm === null
                          ? currentForm
                          : {
                              ...currentForm,
                              energyAfter: event.target.value,
                            },
                      )
                    }
                    options={energyOptions}
                    value={logForm.energyAfter}
                  />
                )}
              </FormField>
            </div>
            <FormField
              controlId="content-log-stop-reason"
              label="Stop reason"
              required
            >
              {({ describedBy, inputId, invalid }) => (
                <Select
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  id={inputId}
                  onChange={(event) =>
                    setLogForm((currentForm) =>
                      currentForm === null
                        ? currentForm
                        : {
                            ...currentForm,
                            stoppedBecause: event.target
                              .value as LogFormState['stoppedBecause'],
                          },
                    )
                  }
                  options={mediaStopReasonOptions}
                  value={logForm.stoppedBecause}
                />
              )}
            </FormField>
            <FormField
              controlId="content-log-notes"
              description="Optional local note for why this stop point mattered."
              label="Logging note"
            >
              {({ describedBy, inputId, invalid }) => (
                <TextArea
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  id={inputId}
                  onChange={(event) =>
                    setLogForm((currentForm) =>
                      currentForm === null
                        ? currentForm
                        : {
                            ...currentForm,
                            notes: event.target.value,
                          },
                    )
                  }
                  placeholder="Reached a clean limit, got interrupted, or hit confusion."
                  value={logForm.notes}
                />
              )}
            </FormField>
            <div className="course-detail-note">
              <p className="course-detail-note__label">Watched range preview</p>
              <p>
                {watchedRangeSeconds === null
                  ? 'Enter a valid start and end timestamp to preview the range.'
                  : `${formatLoggedMinutes(watchedRangeSeconds)} will be logged.`}
              </p>
            </div>
            {logForm.error ? (
              <p className="form-field__error" role="alert">
                {logForm.error}
              </p>
            ) : null}
            <div className="course-detail-form__actions">
              <Button loading={logForm.isSaving} size="lg" type="submit">
                Save watched range
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
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
