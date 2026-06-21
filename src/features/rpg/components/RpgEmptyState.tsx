import type { ReactNode } from 'react';

export type RpgEmptyStateProps = {
  action?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
};

export function RpgEmptyState({
  action,
  description,
  eyebrow,
  title,
}: RpgEmptyStateProps) {
  return (
    <section className="rpg-empty-state">
      {eyebrow ? <p className="rpg-empty-state__eyebrow">{eyebrow}</p> : null}
      <h3 className="rpg-empty-state__title">{title}</h3>
      <p className="rpg-empty-state__description">{description}</p>
      {action ? <div>{action}</div> : null}
    </section>
  );
}
