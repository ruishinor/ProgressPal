import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
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
import { achievementDefinitionsById } from '@/lib/achievements';
import { useAppState } from '@/lib/appState';
import { getCs50ItemLink, getCs50UnitLink } from '@/features/course/cs50Links';
import { getItemGuide, type ItemGuide } from '@/features/course/guideContent';
import { courseMapPath, getStudySessionsPath } from '@/features/course/paths';
import {
  buildCourseDetailView,
  createCourseDetailProgressFormValues,
  getCourseProgressStatusOptions,
  validateCourseDetailProgressForm,
  type CourseDetailProgressFormValues,
} from '@/features/course/detailModel';
import { formatMinutes } from '@/lib/time';
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
  MediaProgressEvent,
  MediaStopReason,
  ProgressEntry,
  ResumePoint,
} from '@/lib/domain';
import { formatLoggedMinutes, formatMediaTimestamp } from '@/lib/progress';
import { formatTimestampInput, parseTimestampInput } from '@/lib/time';

type ContentDetailPageStatus = 'error' | 'loading' | 'ready';

type ContentDetailData = {
  asset: ContentAsset | null;
  events: MediaProgressEvent[];
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

type SaveResult = {
  achievementNames: string[];
  minutesWatched: number;
  xpAdded: number;
};

type ProgressSaveResult = {
  achievementNames: string[];
  isUpdate: boolean;
  xpAdded: number;
};

const initialPageState: ContentDetailPageState = {
  detail: null,
  error: null,
  status: 'loading',
};

const mediaStopReasonOptions: readonly {
  label: string;
  value: MediaStopReason;
}[] = [
  { label: 'Completed segment', value: 'completed_slice' },
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

function getItemContextTitle(itemType: CourseItem['type']): string {
  if (itemType === 'problem_set') return 'About this problem set';
  if (itemType === 'lab') return 'About this lab';
  if (itemType === 'lecture') return 'About this lecture';
  return 'About this content';
}

function getLogCardTitle(itemType: CourseItem['type']): string {
  return itemType === 'lecture' || itemType === 'shorts'
    ? 'Log Lecture'
    : 'Log Session';
}

function getProgressCardTitle(itemType: CourseItem['type']): string {
  if (itemType === 'problem_set') return 'Problem Set Progress';
  if (itemType === 'lab') return 'Lab Progress';
  return 'Your progress';
}

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
      'The requested course task was not found in the local catalog.',
    );
  }

  const [unit, progressEntry, assets] = await Promise.all([
    getCourseUnit(item.unitId),
    getProgress(item.id),
    listContentAssets(item.id),
  ]);

  if (unit === null) {
    throw new Error('The week for this course task could not be found.');
  }

  const asset = assets[0] ?? null;

  if (asset === null) {
    return {
      asset: null,
      events: [],
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
    events,
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

function PreviousSessionNotes({
  events,
  itemId,
}: {
  events: MediaProgressEvent[];
  itemId: string;
}) {
  const notedEvents = [...events]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((event) => Boolean(event.notes));

  return (
    <Card title="Previous notes from this lecture">
      {notedEvents.length === 0 ? (
        <p>No notes yet. Save your first session to start a history.</p>
      ) : (
        <ol className="lecture-previous-notes">
          {notedEvents.map((event) => (
            <li className="lecture-previous-notes__item" key={event.id}>
              <p className="lecture-previous-notes__meta">
                {formatMediaTimestamp(event.startSecond)}
                {'–'}
                {formatMediaTimestamp(event.endSecond)}
                {' · '}
                {new Date(event.createdAt).toLocaleDateString()}
              </p>
              <p>{event.notes}</p>
            </li>
          ))}
        </ol>
      )}
      <Link
        className="button button--secondary button--md"
        to={getStudySessionsPath(itemId)}
      >
        View all saved sessions
      </Link>
    </Card>
  );
}

function ItemGuideCard({ guide }: { guide: ItemGuide }) {
  return (
    <Card
      data-testid="item-guide-card"
      description="A short, local guide for this task. Reading it does not change your progress."
      title="How to approach this"
    >
      <p>{guide.summary}</p>
      {guide.whatToDo && guide.whatToDo.length > 0 ? (
        <div className="course-detail-note">
          <p className="course-detail-note__label">What to do</p>
          <ul className="course-guide-list">
            {guide.whatToDo.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {guide.doneLooksLike && guide.doneLooksLike.length > 0 ? (
        <div className="course-detail-note">
          <p className="course-detail-note__label">Done looks like</p>
          <ul className="course-guide-list">
            {guide.doneLooksLike.map((mark) => (
              <li key={mark}>{mark}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {guide.checklist && guide.checklist.length > 0 ? (
        <div className="course-detail-note">
          <p className="course-detail-note__label">Checklist</p>
          <ul className="course-guide-list">
            {guide.checklist.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {guide.reflectionPrompt ? (
        <div className="course-detail-note">
          <p className="course-detail-note__label">Reflect</p>
          <p>{guide.reflectionPrompt}</p>
        </div>
      ) : null}
    </Card>
  );
}

export function ContentDetailPage() {
  const params = useParams<{ itemId: string }>();
  const { coordination, runLocalMutation } = useAppState();
  const [progressForm, setProgressForm] = useState<ProgressFormState | null>(
    null,
  );
  const [logForm, setLogForm] = useState<LogFormState | null>(null);
  const [pageState, setPageState] =
    useState<ContentDetailPageState>(initialPageState);
  const [reloadToken, setReloadToken] = useState(0);
  const [toast, setToast] = useState<ToastState>(null);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [progressSaveResult, setProgressSaveResult] =
    useState<ProgressSaveResult | null>(null);
  const [isSegmentsOpen, setIsSegmentsOpen] = useState(false);
  const formInitializedItemRef = useRef<string | null>(null);
  const itemId = params.itemId ?? '';

  useEffect(() => {
    setSaveResult(null);
    setProgressSaveResult(null);
    setToast(null);
    setIsSegmentsOpen(false);
  }, [itemId]);

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
                : 'This page could not read your local progress.',
            status: 'error',
          });
        });
      }
    })();

    return () => {
      isActive = false;
    };
  }, [itemId, reloadToken]);

  // Runs as a layout effect so the progress form is populated in the same
  // commit that first renders the (interactive) form controls. With a passive
  // effect there is a brief window where the detail is ready and the status
  // <select> is on screen but `progressForm` is still null, during which the
  // control's onChange is a no-op and a status change is silently dropped.
  useLayoutEffect(() => {
    if (pageState.detail === null) {
      return;
    }

    // Initialize the progress form only when the underlying item changes (a
    // fresh page load or navigation). A save triggers a background reload that
    // re-creates `pageState.detail`; without this guard that reload would
    // overwrite a status the learner has already changed in the meantime,
    // silently discarding their selection (and the milestone it would award).
    // Save handlers update the form state themselves, so skipping
    // re-initialization here keeps the saved record and the form in sync.
    if (formInitializedItemRef.current !== pageState.detail.item.id) {
      formInitializedItemRef.current = pageState.detail.item.id;
      setProgressForm(
        createEmptyProgressFormState(
          pageState.detail.progressEntry,
          pageState.detail.longFormDetail,
        ),
      );
    }

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
            description="This page reads your local catalog and saved progress."
            title="Course content"
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
            title="Course content could not be opened"
          />
        </section>
      );
    }

    return (
      <section className="page-section">
        <PageHeader
          description="Opening this course task and your saved progress."
          title="Course content"
        />
        <LoadingState
          description="Reading this course task and your saved progress."
          title="Loading course content"
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

  const isLecture =
    detail.item.type === 'lecture' || detail.item.type === 'shorts';

  const selectedProgressStatus =
    progressForm?.values.status ?? progressStatusOptions[0]?.value;

  const showSubmissionCard =
    !isLecture &&
    (selectedProgressStatus === 'submitted' ||
      selectedProgressStatus === 'accepted');

  const cs50Link =
    getCs50ItemLink(detail.item.id) ?? getCs50UnitLink(detail.unit.id);

  const itemGuide = getItemGuide(detail.item.id);
  const guideCardSection =
    itemGuide !== null ? <ItemGuideCard guide={itemGuide} /> : null;

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

    const parsedConfidence = validation.parsedConfidence;

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
      const xpResult = await runLocalMutation(
        () =>
          upsertProgressAndAwardXp({
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
                : parsedConfidence,
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
          }),
        { invalidateRoute: false },
      );

      const xpAdded = xpResult.awardedTransactions.reduce(
        (sum, tx) => sum + tx.xp,
        0,
      );
      const achievementNames = xpResult.unlockedAchievements
        .map(
          (unlock) =>
            achievementDefinitionsById.get(unlock.achievementId)?.title ?? '',
        )
        .filter(Boolean);
      const xpToastSuffix = xpAdded > 0 ? ` (+${xpAdded} XP!)` : '';
      const isUpdate = detail.progressEntry !== null;

      setProgressSaveResult({ achievementNames, isUpdate, xpAdded });
      setProgressForm((currentForm) =>
        currentForm === null
          ? currentForm
          : { ...currentForm, errors: {}, isSaving: false },
      );
      setToast({
        description: `${isUpdate ? 'Progress updated' : 'Progress saved'}.${xpToastSuffix}`,
        title: isUpdate ? 'Progress updated' : 'Progress saved',
        tone: 'success',
      });

      void (async () => {
        try {
          const newDetail = await loadContentDetail(itemId);

          startTransition(() => {
            setPageState({ detail: newDetail, error: null, status: 'ready' });
          });
        } catch {
          // stale data is acceptable; confirmation is already showing
        }
      })();
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
                    : 'Could not save your progress.',
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

    const asset = detail.asset;

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
      asset.durationSeconds !== undefined &&
      endSecond > asset.durationSeconds
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
      const xpResult = await runLocalMutation(
        () =>
          logMediaProgressAndAwardXp({
            assetId: asset.id,
            endSecond,
            energyAfter: Number.parseInt(logForm.energyAfter, 10),
            energyBefore: Number.parseInt(logForm.energyBefore, 10),
            notes:
              logForm.notes.trim().length === 0
                ? undefined
                : logForm.notes.trim(),
            startSecond,
            stoppedBecause: logForm.stoppedBecause,
          } satisfies LogMediaProgressInput),
        { invalidateRoute: false },
      );

      const xpAdded = xpResult.awardedTransactions.reduce(
        (sum, tx) => sum + tx.xp,
        0,
      );
      const achievementNames = xpResult.unlockedAchievements
        .map(
          (unlock) =>
            achievementDefinitionsById.get(unlock.achievementId)?.title ?? '',
        )
        .filter(Boolean);
      const watchedMin = Math.round((endSecond - startSecond) / 60);
      const xpToastSuffix = xpAdded > 0 ? ` (+${xpAdded} XP!)` : '';
      const minutesSuffix =
        watchedMin > 0 ? ` · ${watchedMin} min watched` : '';

      setSaveResult({ achievementNames, minutesWatched: watchedMin, xpAdded });
      setToast({
        description: `Session saved${minutesSuffix}.${xpToastSuffix}`,
        title: 'Session saved',
        tone: 'success',
      });
      setLogForm((currentForm) =>
        currentForm === null
          ? currentForm
          : {
              ...currentForm,
              isSaving: false,
            },
      );

      void (async () => {
        try {
          const newDetail = await loadContentDetail(itemId);

          startTransition(() => {
            setPageState({ detail: newDetail, error: null, status: 'ready' });
          });
        } catch {
          // stale data is acceptable; confirmation is already showing
        }
      })();
    } catch (saveError) {
      setLogForm((currentForm) =>
        currentForm === null
          ? currentForm
          : {
              ...currentForm,
              error:
                saveError instanceof Error
                  ? saveError.message
                  : 'Could not save your session.',
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

  const nextSegment =
    detail.longFormDetail?.slices.find((s) => s.isNext) ?? null;
  const completedSegmentCount =
    detail.longFormDetail?.slices.filter((s) => s.status === 'completed')
      .length ?? 0;
  const totalSegmentCount = detail.longFormDetail?.slices.length ?? 0;

  const logFormSection =
    detail.asset !== null &&
    detail.longFormDetail !== null &&
    logForm !== null ? (
      <Card
        description="Enter the video timestamps you watched. Duplicate exact ranges are blocked, and overlapping ranges are merged."
        title={getLogCardTitle(detail.item.type)}
        variant={isLecture ? 'accent' : 'default'}
      >
        <form
          className="course-detail-form"
          noValidate
          onSubmit={(event) => {
            void handleLogSubmit(event);
          }}
        >
          {detail.longFormDetail.progress?.summaryLine ? (
            <div className="course-detail-note">
              <p className="course-detail-note__label">Video progress</p>
              <p>{detail.longFormDetail.progress.summaryLine}</p>
            </div>
          ) : null}
          <div className="inline-actions">
            <Button
              onClick={() => {
                const nextSlice =
                  detail.longFormDetail?.slices.find((slice) => slice.isNext) ??
                  null;

                if (nextSlice === null) {
                  return;
                }

                setLogForm((currentForm) =>
                  currentForm === null
                    ? currentForm
                    : {
                        ...currentForm,
                        endTimestamp: formatTimestampInput(nextSlice.endSecond),
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
              Use next segment
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
              label="Started at"
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
              label="Stopped at"
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
          </div>
          <FormField
            controlId="content-log-notes"
            description="Optional note for this session."
            label="Session Notes"
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
                placeholder="What clicked, what confused you, or where you left off."
                value={logForm.notes}
              />
            )}
          </FormField>
          <div className="course-detail-note">
            <p className="course-detail-note__label">Watched</p>
            <p>
              {watchedRangeSeconds === null
                ? 'Enter a valid start and end timestamp to preview the range.'
                : `${formatLoggedMinutes(watchedRangeSeconds)} will be logged.`}
            </p>
          </div>
          <details className="form-details">
            <summary>More details (energy, stop reason)</summary>
            <div className="form-details__content">
              <div className="form-grid">
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
                label="Why did you stop?"
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
            </div>
          </details>
          {logForm.error ? (
            <p className="form-field__error" role="alert">
              {logForm.error}
            </p>
          ) : null}
          <div className="course-detail-form__actions">
            <Button
              disabled={!coordination.canWrite}
              loading={logForm.isSaving}
              size="lg"
              type="submit"
            >
              Save session
            </Button>
          </div>
        </form>
      </Card>
    ) : null;

  const videoSegmentsSection =
    detail.asset !== null && detail.longFormDetail !== null ? (
      <Card
        description="This shows only the video time you saved. It does not guess what you watched."
        title="Video segments"
      >
        {isLecture ? (
          <div className="course-detail-note">
            <p className="course-detail-note__label">Progress</p>
            <p>
              {nextSegment !== null
                ? `Next: ${nextSegment.label}`
                : 'All segments logged'}
              {totalSegmentCount > 0
                ? ` · ${completedSegmentCount} of ${totalSegmentCount} complete`
                : null}
            </p>
          </div>
        ) : null}
        <SliceProgressBar
          helperText={
            detail.longFormDetail.progress?.summaryLine ??
            'No video progress saved yet.'
          }
          label="Video progress"
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
              Last watched {detail.longFormDetail.lastLoggedRangeLabel}
            </Badge>
          ) : null}
          {detail.longFormDetail.lastStopReasonLabel ? (
            <Badge tone="warning">
              {detail.longFormDetail.lastStopReasonLabel}
            </Badge>
          ) : null}
        </div>
        {isLecture ? (
          <div>
            <Button
              onClick={() => {
                setIsSegmentsOpen((open) => !open);
              }}
              variant="quiet"
            >
              {isSegmentsOpen ? 'Hide all segments' : 'Show all segments'}
            </Button>
          </div>
        ) : null}
        {!isLecture || isSegmentsOpen ? (
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
        ) : null}
      </Card>
    ) : null;

  const progressFormSection = (
    <Card
      description="Saved here. Updates your progress, XP, achievements, and dashboard."
      title="Your progress"
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
                  progressForm?.values.status ?? progressStatusOptions[0]?.value
                }
              />
            )}
          </FormField>
          {!isLecture ? (
            <FormField
              controlId="course-detail-confidence"
              description="0 means unset. 5 means very sure."
              error={progressForm?.errors.confidence}
              label="How sure are you?"
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
          ) : null}
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
              placeholder="Local notes about this task."
              value={progressForm?.values.notes ?? ''}
            />
          )}
        </FormField>
        {!isLecture ? (
          <FormField
            controlId="course-detail-evidence"
            description="Required when a problem set or lab is marked accepted."
            error={progressForm?.errors.evidenceText}
            label="Submission note"
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
                placeholder="Example: submitted with submit50, or completed in the gradebook."
                value={progressForm?.values.evidenceText ?? ''}
              />
            )}
          </FormField>
        ) : null}
        {progressForm?.errors.submit ? (
          <p className="form-field__error" role="alert">
            {progressForm.errors.submit}
          </p>
        ) : null}
        <div className="course-detail-form__actions">
          <Button
            disabled={!coordination.canWrite}
            loading={progressForm?.isSaving ?? false}
            size="lg"
            type="submit"
          >
            Save progress
          </Button>
        </div>
      </form>
    </Card>
  );

  const aboutSection = (
    <Card title={getItemContextTitle(detail.item.type)}>
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
        {!isLecture ? (
          <div>
            <dt>Content type</dt>
            <dd>
              {detail.asset === null
                ? 'Not applicable'
                : getAssetSummaryDescription(detail.asset)}
            </dd>
          </div>
        ) : null}
      </dl>
      {detail.longFormDetail?.progress?.summaryLine && !isLecture ? (
        <div className="course-detail-note">
          <p className="course-detail-note__label">Saved progress summary</p>
          <p>{detail.longFormDetail.progress.summaryLine}</p>
        </div>
      ) : null}
      {isLecture && cs50Link !== null ? (
        <a
          className="button button--secondary button--md"
          href={cs50Link.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {cs50Link.label}
        </a>
      ) : null}
    </Card>
  );

  if (isLecture) {
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
          description="Save your progress here. Updates your course map, dashboard, XP, and achievements."
          eyebrow={detailView.typeLabel}
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
        {guideCardSection}
        {logFormSection}
        {saveResult !== null ? (
          <Card
            aria-live="polite"
            role="status"
            title="Session saved"
            variant="accent"
          >
            <div className="course-detail-note">
              <p className="course-detail-note__label">What was logged</p>
              <p>
                {saveResult.minutesWatched > 0
                  ? `${saveResult.minutesWatched} min added`
                  : 'Session recorded'}
              </p>
              {saveResult.xpAdded > 0 ? (
                <p>
                  <strong>{`+${saveResult.xpAdded} XP earned`}</strong>
                </p>
              ) : null}
              {saveResult.achievementNames.length > 0 ? (
                <p>{`Achievement unlocked: ${saveResult.achievementNames.join(', ')}`}</p>
              ) : null}
            </div>
            <p>
              Ready to log your next segment, or save your overall progress
              below.
            </p>
            <div className="inline-actions">
              <Link
                className="button button--secondary button--md"
                to={courseMapPath}
              >
                Course map
              </Link>
              <Button
                onClick={() => {
                  setSaveResult(null);
                }}
                variant="quiet"
              >
                Dismiss
              </Button>
            </div>
          </Card>
        ) : null}
        {videoSegmentsSection}
        <PreviousSessionNotes events={detail.events} itemId={detail.item.id} />
        {progressFormSection}
        {aboutSection}
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
            {cs50Link !== null ? (
              <a
                className="button button--secondary button--md"
                href={cs50Link.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {cs50Link.label}
              </a>
            ) : null}
          </div>
        }
        description="Save your progress here. Updates your course map, XP, and achievements."
        eyebrow={detailView.typeLabel}
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
      {guideCardSection}
      {detail.progressEntry !== null && progressSaveResult === null ? (
        <Card title="Saved progress">
          <div className="course-detail-note">
            <p className="course-detail-note__label">
              {'Saved '}
              {new Date(detail.progressEntry.updatedAt).toLocaleDateString()}
            </p>
            <p>{detailView.statusLabel}</p>
            {detail.progressEntry.notes ? (
              <p>{detail.progressEntry.notes}</p>
            ) : null}
            {detail.progressEntry.evidenceText ? (
              <p>
                <strong>Submission note:</strong>{' '}
                {detail.progressEntry.evidenceText}
              </p>
            ) : null}
          </div>
          <p>Edit the fields below to save a correction.</p>
        </Card>
      ) : null}
      <Card
        description="Saved here. Updates your progress, XP, achievements, and dashboard."
        title={getProgressCardTitle(detail.item.type)}
        variant="accent"
      >
        <form
          className="course-detail-form"
          noValidate
          onSubmit={(event) => {
            void handleProgressSubmit(event);
          }}
        >
          <FormField
            controlId="course-detail-status"
            error={progressForm?.errors.status}
            label="Progress"
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
                          errors: {},
                          values: {
                            ...currentForm.values,
                            status: event.target
                              .value as CourseDetailProgressFormValues['status'],
                          },
                        },
                  )
                }
                options={progressStatusOptions}
                value={selectedProgressStatus}
              />
            )}
          </FormField>
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
                placeholder="What you worked on, where you got stuck, or what you figured out."
                value={progressForm?.values.notes ?? ''}
              />
            )}
          </FormField>
          <details className="form-details">
            <summary>More details</summary>
            <div className="form-details__content">
              <FormField
                controlId="course-detail-confidence"
                description="0 means unset. 5 means very sure."
                error={progressForm?.errors.confidence}
                label="How sure are you?"
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
          </details>
          {progressForm?.errors.submit ? (
            <p className="form-field__error" role="alert">
              {progressForm.errors.submit}
            </p>
          ) : null}
          <div className="course-detail-form__actions">
            <Button
              disabled={!coordination.canWrite}
              loading={progressForm?.isSaving ?? false}
              size="lg"
              type="submit"
            >
              Save progress
            </Button>
          </div>
        </form>
      </Card>
      {showSubmissionCard ? (
        <Card title="Submission">
          <FormField
            controlId="course-detail-evidence"
            description="Where you submitted this work."
            error={progressForm?.errors.evidenceText}
            label="Where did you submit it?"
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
                placeholder="Example: submitted with submit50, or completed in the gradebook."
                value={progressForm?.values.evidenceText ?? ''}
              />
            )}
          </FormField>
        </Card>
      ) : null}
      {progressSaveResult !== null ? (
        <Card
          aria-live="polite"
          role="status"
          title={
            progressSaveResult.isUpdate ? 'Progress updated' : 'Progress saved'
          }
          variant="accent"
        >
          <div className="course-detail-note">
            <p className="course-detail-note__label">What was saved</p>
            <p>
              {progressSaveResult.isUpdate
                ? 'Progress updated'
                : 'Progress saved'}
            </p>
            {progressSaveResult.xpAdded > 0 ? (
              <p>
                <strong>{`+${progressSaveResult.xpAdded} XP earned`}</strong>
              </p>
            ) : null}
            {progressSaveResult.achievementNames.length > 0 ? (
              <p>{`Achievement unlocked: ${progressSaveResult.achievementNames.join(', ')}`}</p>
            ) : null}
          </div>
          <p>
            <strong>What&apos;s next?</strong> Check your course map to see what
            comes next.
          </p>
          <div className="inline-actions">
            <Link
              className="button button--secondary button--md"
              to={courseMapPath}
            >
              Back to course map
            </Link>
            <Button
              onClick={() => {
                setProgressSaveResult(null);
              }}
              variant="quiet"
            >
              Dismiss
            </Button>
          </div>
        </Card>
      ) : null}
      {videoSegmentsSection}
      {logFormSection}
      {aboutSection}
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
