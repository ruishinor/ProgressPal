import type { ReactNode } from 'react';

import { Card } from '@/components/ui/Card';

export type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
};

export function EmptyState({
  action,
  description,
  eyebrow,
  title,
}: EmptyStateProps) {
  return (
    <Card className="state-card" variant="subtle">
      <div className="state-card__content">
        <span aria-hidden="true" className="state-card__icon">
          0
        </span>
        {eyebrow ? <p className="state-card__eyebrow">{eyebrow}</p> : null}
        <h3 className="state-card__title">{title}</h3>
        <p className="state-card__description">{description}</p>
        {action ? <div className="state-card__action">{action}</div> : null}
      </div>
    </Card>
  );
}
