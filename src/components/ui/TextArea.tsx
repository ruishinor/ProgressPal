import type { TextareaHTMLAttributes } from 'react';

import { classNames } from '@/components/ui/utils';

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ className, rows = 4, ...rest }: TextAreaProps) {
  return (
    <textarea
      className={classNames('field-control', 'text-area', className)}
      rows={rows}
      {...rest}
    />
  );
}
