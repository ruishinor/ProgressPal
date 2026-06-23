import type { HTMLAttributes } from 'react';

import { clampNumber, classNames } from '@/components/ui/utils';

type RpgProgressTone = 'progress' | 'success' | 'warning';

export type RpgProgressBarProps = HTMLAttributes<HTMLDivElement> & {
  helperText?: string;
  label: string;
  max?: number;
  showValue?: boolean;
  tone?: RpgProgressTone;
  value: number;
};

export function RpgProgressBar({
  className,
  helperText,
  label,
  max = 100,
  showValue = true,
  tone = 'progress',
  value,
  ...rest
}: RpgProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const clampedValue = clampNumber(value, 0, safeMax);
  const percentage = (clampedValue / safeMax) * 100;
  const roundedPercentage = Math.round(percentage);

  return (
    <div
      className={classNames(
        'rpg-progress-bar',
        `rpg-progress-bar--${tone}`,
        className,
      )}
      {...rest}
    >
      <div className="rpg-progress-bar__header">
        <div>
          <p className="rpg-progress-bar__label">{label}</p>
          {helperText ? (
            <p className="rpg-progress-bar__helper">{helperText}</p>
          ) : null}
        </div>
        {showValue ? (
          <span className="rpg-progress-bar__value">{roundedPercentage}%</span>
        ) : null}
      </div>
      <div
        aria-label={label}
        aria-valuemax={safeMax}
        aria-valuemin={0}
        aria-valuenow={Math.round(clampedValue)}
        className="rpg-progress-bar__track"
        role="progressbar"
      >
        <span
          aria-hidden="true"
          className="rpg-progress-bar__fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
