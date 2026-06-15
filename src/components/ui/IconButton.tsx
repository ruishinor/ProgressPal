import type { ReactNode } from 'react';

import { Button, type ButtonProps } from '@/components/ui/Button';

export type IconButtonProps = Omit<ButtonProps, 'children'> & {
  icon: ReactNode;
  label: string;
};

export function IconButton({ icon, label, ...rest }: IconButtonProps) {
  return (
    <Button aria-label={label} className="icon-button" title={label} {...rest}>
      <span aria-hidden="true">{icon}</span>
      <span className="sr-only">{label}</span>
    </Button>
  );
}
