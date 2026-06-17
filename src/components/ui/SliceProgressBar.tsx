import type { HTMLAttributes } from 'react';

import { clampNumber, classNames } from '@/components/ui/utils';

export type SliceSegmentStatus =
  | 'notStarted'
  | 'inProgress'
  | 'completed'
  | 'skipped';

export type SliceSegment = {
  completion?: number;
  id: string;
  label: string;
  status: SliceSegmentStatus;
};

export type SliceProgressBarProps = HTMLAttributes<HTMLDivElement> & {
  helperText?: string;
  label: string;
  segments: readonly SliceSegment[];
};

function getSegmentCompletion(segment: SliceSegment) {
  if (segment.status === 'completed') {
    return 1;
  }

  if (segment.status === 'inProgress') {
    return clampNumber(segment.completion ?? 0, 0, 1);
  }

  return 0;
}

export function SliceProgressBar({
  className,
  helperText,
  label,
  segments,
  ...rest
}: SliceProgressBarProps) {
  const completedCount = segments.filter(
    (segment) => segment.status === 'completed',
  ).length;
  const activeCount = segments.filter(
    (segment) => segment.status === 'inProgress',
  ).length;
  const remainingCount = segments.filter(
    (segment) => segment.status === 'notStarted',
  ).length;
  const progressTotal = segments.reduce(
    (total, segment) => total + getSegmentCompletion(segment),
    0,
  );
  const percentage =
    segments.length === 0
      ? 0
      : Math.round((progressTotal / segments.length) * 100);
  const summary =
    segments.length === 0
      ? 'No segments defined yet.'
      : `${completedCount} complete, ${activeCount} in progress, ${remainingCount} remaining.`;

  return (
    <div className={classNames('slice-progress', className)} {...rest}>
      <div className="slice-progress__header">
        <div>
          <p className="slice-progress__label">{label}</p>
          <p className="slice-progress__helper">
            {helperText ??
              `${percentage}% of the planned segments are complete.`}
          </p>
        </div>
        <span className="slice-progress__summary">{summary}</span>
      </div>
      <ol
        aria-label={`${label}. ${summary}`}
        className="slice-progress__segments"
      >
        {segments.map((segment) => {
          const segmentCompletion = getSegmentCompletion(segment);

          return (
            <li
              className={classNames(
                'slice-progress__segment',
                `slice-progress__segment--${segment.status}`,
              )}
              key={segment.id}
              title={segment.label}
            >
              <span
                aria-hidden="true"
                className="slice-progress__segment-fill"
                style={{ width: `${segmentCompletion * 100}%` }}
              />
              <span className="sr-only">
                {segment.label}: {Math.round(segmentCompletion * 100)}%
                complete.
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
