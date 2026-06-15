import type { InputHTMLAttributes } from 'react';

import { classNames } from '@/components/ui/utils';

export type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
>;

export function NumberInput({
  className,
  inputMode = 'numeric',
  ...rest
}: NumberInputProps) {
  return (
    <input
      className={classNames('field-control', 'number-input', className)}
      inputMode={inputMode}
      type="number"
      {...rest}
    />
  );
}
