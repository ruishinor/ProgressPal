import type { HTMLAttributes, ReactNode } from 'react';

import { classNames } from '@/components/ui/utils';

export type RpgResourceCardProps = HTMLAttributes<HTMLElement> & {
  actions?: ReactNode;
  description?: string;
  meta: ReactNode;
  title: string;
};

export function RpgResourceCard({
  actions,
  children,
  className,
  description,
  meta,
  title,
  ...rest
}: RpgResourceCardProps) {
  return (
    <article className={classNames('rpg-resource-card', className)} {...rest}>
      <div className="rpg-resource-card__body">
        <div>
          <h2 className="rpg-resource-card__title">{title}</h2>
          {description ? (
            <p className="rpg-resource-card__description">{description}</p>
          ) : null}
        </div>
        <div className="rpg-resource-card__meta">{meta}</div>
        {children}
      </div>
      {actions ? (
        <div className="rpg-resource-card__footer">
          <div className="rpg-resource-card__actions">{actions}</div>
        </div>
      ) : null}
    </article>
  );
}
