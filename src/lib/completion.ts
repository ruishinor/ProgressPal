import type { ProgressStatus } from '@/lib/domain';

export const completeStatuses = new Set<ProgressStatus>([
  'accepted',
  'completed',
  'submitted',
]);

export function isItemComplete(
  status: ProgressStatus | 'not_started',
): boolean {
  return completeStatuses.has(status as ProgressStatus);
}
