import type { HTMLAttributes } from 'react';

import { classNames } from '@/components/ui/utils';

export type StatusPillVariant =
  | 'notStarted'
  | 'planned'
  | 'inProgress'
  | 'completed'
  | 'blocked'
  | 'optional';

const statusLabels: Record<StatusPillVariant, string> = {
  blocked: 'Blocked',
  completed: 'Completed',
  inProgress: 'In progress',
  notStarted: 'Not started',
  optional: 'Optional',
  planned: 'Planned',
};

export type StatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  children?: string;
  variant: StatusPillVariant;
};

export function StatusPill({
  children,
  className,
  variant,
  ...rest
}: StatusPillProps) {
  return (
    <span
      className={classNames(
        'status-pill',
        `status-pill--${variant}`,
        className,
      )}
      data-variant={variant}
      {...rest}
    >
      <span aria-hidden="true" className="status-pill__dot" />
      <span>{children ?? statusLabels[variant]}</span>
    </span>
  );
}
