import type { HTMLAttributes, ReactNode } from 'react';

import { classNames } from '@/components/ui/utils';

export type RpgQuestRowProps = HTMLAttributes<HTMLLIElement> & {
  action?: ReactNode;
  meta: string;
  requiredLabel: string;
  rewardLabel?: string;
  status: ReactNode;
  summary?: string;
  title: string;
};

export function RpgQuestRow({
  action,
  className,
  meta,
  requiredLabel,
  rewardLabel,
  status,
  summary,
  title,
  ...rest
}: RpgQuestRowProps) {
  return (
    <li className={classNames('rpg-quest-row', className)} {...rest}>
      <div className="rpg-quest-row__copy">
        <div className="rpg-quest-row__title-row">
          <p className="rpg-quest-row__title">{title}</p>
          <span className="rpg-status-pill rpg-status-pill--neutral">
            {requiredLabel}
          </span>
        </div>
        <p className="rpg-quest-row__meta">{meta}</p>
        {rewardLabel ? <p className="rpg-quest-reward">{rewardLabel}</p> : null}
        {summary ? <p className="rpg-quest-row__meta">{summary}</p> : null}
      </div>
      <div className="rpg-quest-row__aside">
        {status}
        {action}
      </div>
    </li>
  );
}
