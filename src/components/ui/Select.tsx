import type { SelectHTMLAttributes } from 'react';

import { classNames } from '@/components/ui/utils';

export type SelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'children'
> & {
  options: readonly SelectOption[];
  placeholder?: string;
};

export function Select({
  className,
  options,
  placeholder,
  ...rest
}: SelectProps) {
  return (
    <select
      className={classNames('field-control', 'select-input', className)}
      {...rest}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option
          disabled={option.disabled}
          key={option.value}
          value={option.value}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
