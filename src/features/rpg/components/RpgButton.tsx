import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react';
import { Link } from 'react-router-dom';

import { classNames } from '@/components/ui/utils';

type RpgButtonSize = 'sm' | 'md';
type RpgButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';

type RpgButtonBaseProps = {
  children: ReactNode;
  className?: string;
  leadingIcon?: ReactNode;
  size?: RpgButtonSize;
  trailingIcon?: ReactNode;
  variant?: RpgButtonVariant;
};

export type RpgButtonProps = RpgButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof RpgButtonBaseProps> & {
    href?: undefined;
  };

export type RpgButtonLinkProps = RpgButtonBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof RpgButtonBaseProps> & {
    href: string;
  };

function getRpgButtonClassName({
  className,
  size = 'md',
  variant = 'primary',
}: Pick<RpgButtonBaseProps, 'className' | 'size' | 'variant'>) {
  return classNames(
    'rpg-button',
    `rpg-button--${variant}`,
    `rpg-button--${size}`,
    className,
  );
}

function renderRpgButtonContent({
  children,
  leadingIcon,
  trailingIcon,
}: Pick<RpgButtonBaseProps, 'children' | 'leadingIcon' | 'trailingIcon'>) {
  return (
    <>
      {leadingIcon ? (
        <span aria-hidden="true" className="rpg-button__icon">
          {leadingIcon}
        </span>
      ) : null}
      <span>{children}</span>
      {trailingIcon ? (
        <span aria-hidden="true" className="rpg-button__icon">
          {trailingIcon}
        </span>
      ) : null}
    </>
  );
}

function RpgAnchorButton({
  children,
  className,
  leadingIcon,
  size,
  trailingIcon,
  variant,
  ...anchorProps
}: RpgButtonLinkProps) {
  const buttonClassName = getRpgButtonClassName({ className, size, variant });
  const content = renderRpgButtonContent({
    children,
    leadingIcon,
    trailingIcon,
  });

  if (anchorProps.href.startsWith('/') && !anchorProps.href.startsWith('//')) {
    const { href, ...linkProps } = anchorProps;

    return (
      <Link className={buttonClassName} to={href} {...linkProps}>
        {content}
      </Link>
    );
  }

  return (
    <a className={buttonClassName} {...anchorProps}>
      {content}
    </a>
  );
}

function RpgNativeButton({
  children,
  className,
  leadingIcon,
  size,
  trailingIcon,
  type = 'button',
  variant,
  ...buttonProps
}: RpgButtonProps) {
  return (
    <button
      className={getRpgButtonClassName({ className, size, variant })}
      type={type}
      {...buttonProps}
    >
      {renderRpgButtonContent({ children, leadingIcon, trailingIcon })}
    </button>
  );
}

export function RpgButton(props: RpgButtonProps | RpgButtonLinkProps) {
  if (props.href !== undefined) {
    return <RpgAnchorButton {...props} />;
  }

  return <RpgNativeButton {...props} />;
}
