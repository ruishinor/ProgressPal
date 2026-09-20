import type { ReactNode } from 'react';
import { classNames } from '@/components/ui/utils';

export type RpgEmptyStateProps = {
  action?: ReactNode;
  className?: string;
  description: string;
  eyebrow?: string;
  title: string;
};

export function RpgEmptyState({
  action,
  className,
  description,
  eyebrow,
  title,
}: RpgEmptyStateProps) {
  return (
    <section className={classNames('rpg-empty-state', className)}>
      {eyebrow ? <p className="rpg-empty-state__eyebrow">{eyebrow}</p> : null}
      <h2 className="rpg-empty-state__title">{title}</h2>
      <p className="rpg-empty-state__description">{description}</p>
      {action ? <div>{action}</div> : null}
    </section>
  );
}
