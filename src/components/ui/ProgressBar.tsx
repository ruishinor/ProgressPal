import type { HTMLAttributes } from 'react';

import { clampNumber, classNames } from '@/components/ui/utils';

type ProgressTone = 'neutral' | 'accent' | 'success' | 'warning';

export type ProgressBarProps = HTMLAttributes<HTMLDivElement> & {
  helperText?: string;
  label: string;
  max?: number;
  showValue?: boolean;
  tone?: ProgressTone;
  value: number;
};

export function ProgressBar({
  className,
  helperText,
  label,
  max = 100,
  showValue = true,
  tone = 'accent',
  value,
  ...rest
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const clampedValue = clampNumber(value, 0, safeMax);
  const percentage = (clampedValue / safeMax) * 100;
  const roundedPercentage = Math.round(percentage);

  return (
    <div className={classNames('progress-bar', className)} {...rest}>
      <div className="progress-bar__header">
        <div>
          <p className="progress-bar__label">{label}</p>
          {helperText ? (
            <p className="progress-bar__helper">{helperText}</p>
          ) : null}
        </div>
        {showValue ? (
          <span className="progress-bar__value">{roundedPercentage}%</span>
        ) : null}
      </div>
      <div
        aria-label={label}
        aria-valuemax={safeMax}
        aria-valuemin={0}
        aria-valuenow={Math.round(clampedValue)}
        className={classNames(
          'progress-bar__track',
          `progress-bar__track--${tone}`,
        )}
        role="progressbar"
      >
        <span
          aria-hidden="true"
          className="progress-bar__fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
