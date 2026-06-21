import type { HTMLAttributes, ReactNode } from 'react';

import { classNames } from '@/components/ui/utils';

type RpgPanelElement = 'article' | 'aside' | 'div' | 'section';
type RpgPanelPadding = 'comfortable' | 'compact';
type RpgPanelVariant = 'default' | 'raised';
type RpgPanelTitleElement = 'h2' | 'h3' | 'p';

export type RpgPanelProps = HTMLAttributes<HTMLElement> & {
  as?: RpgPanelElement;
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  padding?: RpgPanelPadding;
  title?: string;
  titleAs?: RpgPanelTitleElement;
  variant?: RpgPanelVariant;
};

export function RpgPanel({
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
}: RpgPanelProps) {
  const Component = as;
  const TitleComponent = titleAs;

  return (
    <Component
      className={classNames(
        'rpg-panel',
        `rpg-panel--${padding}`,
        `rpg-panel--${variant}`,
        className,
      )}
      {...rest}
    >
      {title ? (
        <div className="rpg-panel__header">
          <TitleComponent className="rpg-panel__title">{title}</TitleComponent>
          {description ? (
            <p className="rpg-panel__description">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="rpg-panel__body">{children}</div>
      {footer ? <div className="rpg-panel__footer">{footer}</div> : null}
    </Component>
  );
}
