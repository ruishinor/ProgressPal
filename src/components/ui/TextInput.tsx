import type { InputHTMLAttributes } from 'react';

import { classNames } from '@/components/ui/utils';

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

export function TextInput({
  className,
  type = 'text',
  ...rest
}: TextInputProps) {
  return (
    <input
      className={classNames('field-control', 'text-input', className)}
      type={type}
      {...rest}
    />
  );
}
