import type { ProgressStatus } from '@/lib/domain';

export type CourseStatusVariant =
  | 'notStarted'
  | 'inProgress'
  | 'completed'
  | 'blocked'
  | 'optional';

export function getItemStatusVariant(
  required: boolean,
  status: ProgressStatus | 'not_started',
): CourseStatusVariant {
  if (status === 'blocked') {
    return 'blocked';
  }

  if (status === 'started') {
    return 'inProgress';
  }

  if (
    status === 'completed' ||
    status === 'submitted' ||
    status === 'accepted'
  ) {
    return 'completed';
  }

  if (status === 'skipped_optional' || !required) {
    return 'optional';
  }

  return 'notStarted';
}

export function getItemStatusLabel(
  required: boolean,
  status: ProgressStatus | 'not_started',
) {
  switch (status) {
    case 'accepted':
      return 'Accepted';
    case 'blocked':
      return 'Blocked';
    case 'completed':
      return 'Completed';
    case 'skipped_optional':
      return 'Skipped optional';
    case 'started':
      return 'Started';
    case 'submitted':
      return 'Submitted';
    case 'not_started':
    default:
      return required ? 'Not started' : 'Optional';
  }
}
