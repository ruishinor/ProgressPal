import type { HTMLAttributes, ReactNode } from 'react';

import { classNames } from '@/components/ui/utils';

type CardVariant = 'default' | 'accent' | 'subtle' | 'danger';
type CardPadding = 'comfortable' | 'compact';
type CardElement = 'article' | 'aside' | 'div' | 'section';
type CardTitleElement = 'h2' | 'h3' | 'p';

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: CardElement;
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  padding?: CardPadding;
  title?: string;
  titleAs?: CardTitleElement;
  variant?: CardVariant;
};

export function Card({
  as = 'section',
  children,
  className,
  description,
  footer,
  padding = 'comfortable',
  title,
  titleAs = 'h3',
  variant = 'default',
  ...rest
}: CardProps) {
  const Component = as;
  const TitleComponent = titleAs;

  return (
    <Component
      className={classNames(
        'card',
        `card--${variant}`,
        `card--${padding}`,
        className,
      )}
      {...rest}
    >
      {title ? (
        <div className="card__header">
          <TitleComponent className="card__title">{title}</TitleComponent>
          {description ? (
            <p className="card__description">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="card__body">{children}</div>
      {footer ? <div className="card__footer">{footer}</div> : null}
    </Component>
  );
}
