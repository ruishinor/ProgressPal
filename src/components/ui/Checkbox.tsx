import type { InputHTMLAttributes } from 'react';

import { classNames } from '@/components/ui/utils';

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'children' | 'type'
> & {
  description?: string;
  label: string;
};

export function Checkbox({
  checked,
  className,
  description,
  disabled,
  label,
  ...rest
}: CheckboxProps) {
  return (
    <label
      className={classNames(
        'checkbox',
        checked && 'checkbox--checked',
        disabled && 'checkbox--disabled',
        className,
      )}
    >
      <span className="checkbox__control">
        <input
          checked={checked}
          className="checkbox__input"
          disabled={disabled}
          type="checkbox"
          {...rest}
        />
        <span aria-hidden="true" className="checkbox__indicator" />
      </span>
      <span className="checkbox__copy">
        <span className="checkbox__label">{label}</span>
        {description ? (
          <span className="checkbox__description">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
