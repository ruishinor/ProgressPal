import type { HTMLAttributes, ReactNode } from 'react';

import { classNames } from '@/components/ui/utils';

export type PageHeaderProps = HTMLAttributes<HTMLElement> & {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  meta?: ReactNode;
  title: string;
};

export function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  meta,
  title,
  ...rest
}: PageHeaderProps) {
  return (
    <header className={classNames('page-header', className)} {...rest}>
      <div className="page-header__copy">
        {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
        <h2 className="page-header__title">{title}</h2>
        {description ? (
          <div className="page-header__description">{description}</div>
        ) : null}
      </div>
      {actions || meta ? (
        <div className="page-header__aside">
          {actions ? (
            <div className="page-header__actions">{actions}</div>
          ) : null}
          {meta ? <div className="page-header__meta">{meta}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
