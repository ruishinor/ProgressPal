import type { ReactNode } from 'react';

import { Card } from '@/components/ui/Card';

export type ErrorStateProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function ErrorState({ action, description, title }: ErrorStateProps) {
  return (
    <Card className="error-state" role="alert" variant="danger">
      <div className="error-state__content">
        <p className="error-state__eyebrow">Needs attention</p>
        <h3 className="error-state__title">{title}</h3>
        <p className="error-state__description">{description}</p>
        {action ? <div className="error-state__action">{action}</div> : null}
      </div>
    </Card>
  );
}
