import type { LongFormProgressView } from '@/lib/progress';
import { courseItemTypeLabels } from '@/features/course/model';
import type {
  CourseItem,
  CourseUnit,
  ProgressEntry,
  ProgressStatus,
  SubmissionWorkflow,
} from '@/lib/domain';
import {
  getItemStatusLabel,
  getItemStatusVariant,
  type CourseStatusVariant,
} from '@/lib/progress';
import { formatMinutes } from '@/lib/time';
import { getDefaultProgrammeDefinition } from '@/programmes';

export type CourseDetailView = {
  estimatedMinutesLabel: string;
  itemId: string;
  longFormProgress: LongFormProgressView | null;
  progressStatus: ProgressStatus | 'not_started';
  required: boolean;
  statusLabel: string;
  statusVariant: CourseStatusVariant;
  title: string;
  typeLabel: string;
  unitTitle: string;
};

export type CourseProgressStatusOption = {
  label: string;
  value: ProgressStatus;
};

export type CourseDetailProgressFormValues = {
  confidence: string;
  evidenceText: string;
  notes: string;
  status: ProgressStatus;
};

export type CourseDetailProgressValidationResult = {
  errors: Partial<Record<'confidence' | 'evidenceText' | 'status', string>>;
  parsedConfidence: number | null;
};

type ProgressStatusOptionContext = {
  correction?: boolean;
  currentStatus: ProgressStatus | 'not_started';
  itemType: CourseItem['type'];
  longFormProgress: LongFormProgressView | null;
  required: boolean;
};

type ProgressValidationContext = ProgressStatusOptionContext & {
  selectedStatus: ProgressStatus;
};

/**
 * The submission workflow (which item types may be `submitted`/`accepted`) is
 * the active programme's policy (Epic C / C3, C7); the sequence and correction
 * mechanisms below are shared and receive the workflow as a parameter.
 */
function canUseSubmittedStatuses(
  workflow: SubmissionWorkflow,
  itemType: CourseItem['type'],
) {
  return workflow.sequenceItemTypes.includes(itemType);
}

function offersSubmittedStatusesOnCorrection(
  workflow: SubmissionWorkflow,
  itemType: CourseItem['type'],
) {
  return workflow.correctionItemTypes.includes(itemType);
}

function getStatusSequence(
  workflow: SubmissionWorkflow,
  currentStatus: ProgressStatus | 'not_started',
  itemType: CourseItem['type'],
  required: boolean,
) {
  switch (currentStatus) {
    case 'accepted':
      return ['accepted'] as const;
    case 'submitted':
      return ['submitted', 'accepted'] as const;
    case 'completed':
      return canUseSubmittedStatuses(workflow, itemType)
        ? (['completed', 'submitted', 'accepted'] as const)
        : (['completed'] as const);
    case 'blocked':
      return required
        ? (['blocked', 'started', 'completed'] as const)
        : (['blocked', 'started', 'completed', 'skipped_optional'] as const);
    case 'skipped_optional':
      return ['skipped_optional', 'started', 'completed'] as const;
    case 'started':
      return required
        ? (['started', 'blocked', 'completed'] as const)
        : (['started', 'blocked', 'completed', 'skipped_optional'] as const);
    case 'not_started':
    default:
      return required
        ? (['started', 'blocked', 'completed'] as const)
        : (['started', 'blocked', 'completed', 'skipped_optional'] as const);
  }
}

function dedupeStatuses(statuses: readonly ProgressStatus[]) {
  return [...new Set(statuses)];
}

export function buildCourseDetailView(
  unit: CourseUnit,
  item: CourseItem,
  progressEntry: ProgressEntry | null,
  longFormProgress: LongFormProgressView | null,
): CourseDetailView {
  const progressStatus =
    progressEntry?.status ??
    (longFormProgress?.hasProgress ? 'started' : 'not_started');

  return {
    estimatedMinutesLabel: formatMinutes(item.estimatedMinutes),
    itemId: item.id,
    longFormProgress,
    progressStatus,
    required: item.required,
    statusLabel: getItemStatusLabel(item.required, progressStatus),
    statusVariant: getItemStatusVariant(item.required, progressStatus),
    title: item.title,
    typeLabel: courseItemTypeLabels[item.type],
    unitTitle: unit.title,
  };
}

export function createCourseDetailProgressFormValues(
  progressEntry: ProgressEntry | null,
  currentStatus: ProgressStatus | 'not_started',
): CourseDetailProgressFormValues {
  return {
    confidence: String(Math.round(progressEntry?.confidence ?? 0)),
    evidenceText: progressEntry?.evidenceText ?? '',
    notes: progressEntry?.notes ?? '',
    status:
      progressEntry?.status ??
      (currentStatus === 'not_started' ? 'started' : currentStatus),
  };
}

/**
 * The statuses offered for an item under a programme's submission workflow
 * (Epic C / C7). Runtime callers pass the active scope's
 * `policy.workflow`.
 */
export function getProgrammeProgressStatusOptions(
  workflow: SubmissionWorkflow,
  context: ProgressStatusOptionContext,
): CourseProgressStatusOption[] {
  const baseStatuses: readonly ProgressStatus[] = context.correction
    ? [
        'started',
        'blocked',
        'completed',
        ...(offersSubmittedStatusesOnCorrection(workflow, context.itemType)
          ? (['submitted', 'accepted'] as const)
          : []),
        ...(!context.required ? (['skipped_optional'] as const) : []),
      ]
    : getStatusSequence(
        workflow,
        context.currentStatus,
        context.itemType,
        context.required,
      );
  const statuses = dedupeStatuses(
    baseStatuses.filter((status) => {
      if (
        context.longFormProgress !== null &&
        context.longFormProgress.eventCount > 0 &&
        !context.longFormProgress.isComplete &&
        (status === 'completed' || status === 'skipped_optional')
      ) {
        return false;
      }

      if (!canUseSubmittedStatuses(workflow, context.itemType)) {
        return status !== 'submitted' && status !== 'accepted';
      }

      return true;
    }),
  );
  const fallbackStatuses =
    statuses.length > 0
      ? statuses
      : [
          context.currentStatus === 'not_started'
            ? 'started'
            : context.currentStatus,
        ];

  return fallbackStatuses.map((status) => ({
    label: getItemStatusLabel(context.required, status),
    value: status,
  }));
}

export function validateProgrammeProgressForm(
  workflow: SubmissionWorkflow,
  values: CourseDetailProgressFormValues,
  context: ProgressValidationContext,
): CourseDetailProgressValidationResult {
  const errors: CourseDetailProgressValidationResult['errors'] = {};
  const allowedStatuses = new Set(
    getProgrammeProgressStatusOptions(workflow, context).map(
      (option) => option.value,
    ),
  );
  const parsedConfidence = Number.parseInt(values.confidence, 10);

  if (!allowedStatuses.has(values.status)) {
    errors.status = 'That status is not allowed from the current saved state.';
  }

  if (
    !Number.isInteger(parsedConfidence) ||
    parsedConfidence < 0 ||
    parsedConfidence > 5
  ) {
    errors.confidence = 'Choose a confidence value between 0 and 5.';
  }

  if (values.status === 'accepted' && values.evidenceText.trim().length === 0) {
    errors.evidenceText =
      'Add a note about where you submitted this work before saving as Accepted.';
  }

  if (
    context.longFormProgress !== null &&
    context.longFormProgress.eventCount > 0 &&
    !context.longFormProgress.isComplete &&
    (values.status === 'completed' || values.status === 'skipped_optional')
  ) {
    errors.status =
      'This task has partial video history saved. Finish its segments through logging instead of forcing a full completion state.';
  }

  return {
    errors,
    parsedConfidence: Number.isInteger(parsedConfidence)
      ? parsedConfidence
      : null,
  };
}

/**
 * CS50-default compatibility entrypoints (Epic C / C3). They keep their
 * signatures for the C1 preservation oracles and existing tests, which call
 * them without a scope. Runtime code never calls them; it passes the active
 * scope's workflow to the programme-explicit functions above.
 */
export function getCourseProgressStatusOptions(
  context: ProgressStatusOptionContext,
): CourseProgressStatusOption[] {
  return getProgrammeProgressStatusOptions(
    getDefaultProgrammeDefinition().policy.workflow,
    context,
  );
}

export function validateCourseDetailProgressForm(
  values: CourseDetailProgressFormValues,
  context: ProgressValidationContext,
): CourseDetailProgressValidationResult {
  return validateProgrammeProgressForm(
    getDefaultProgrammeDefinition().policy.workflow,
    values,
    context,
  );
}
