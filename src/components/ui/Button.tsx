import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { classNames } from '@/components/ui/utils';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
type ButtonSize = 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  leadingIcon?: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  trailingIcon?: ReactNode;
  variant?: ButtonVariant;
};

export function Button({
  children,
  className,
  disabled,
  leadingIcon,
  loading = false,
  size = 'md',
  trailingIcon,
  type = 'button',
  variant = 'primary',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      aria-busy={loading || undefined}
      className={classNames(
        'button',
        `button--${variant}`,
        `button--${size}`,
        loading && 'button--loading',
        className,
      )}
      disabled={isDisabled}
      type={type}
      {...rest}
    >
      <span className="button__content">
        {loading ? (
          <span aria-hidden="true" className="button__spinner" />
        ) : null}
        {leadingIcon ? (
          <span className="button__icon">{leadingIcon}</span>
        ) : null}
        <span>{children}</span>
        {trailingIcon ? (
          <span className="button__icon">{trailingIcon}</span>
        ) : null}
      </span>
    </button>
  );
}
