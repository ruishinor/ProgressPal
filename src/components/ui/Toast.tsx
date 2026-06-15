import type { ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { classNames } from '@/components/ui/utils';

type ToastTone = 'neutral' | 'success' | 'warning' | 'danger';

export type ToastProps = {
  actionLabel?: string;
  description?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  title: string;
  tone?: ToastTone;
};

export function Toast({
  actionLabel,
  description,
  onAction,
  onDismiss,
  title,
  tone = 'neutral',
}: ToastProps) {
  return (
    <div className={classNames('toast', `toast--${tone}`)} role="status">
      <div className="toast__content">
        <p className="toast__title">{title}</p>
        {description ? (
          <p className="toast__description">{description}</p>
        ) : null}
      </div>
      <div className="toast__actions">
        {actionLabel && onAction ? (
          <Button onClick={onAction} size="md" variant="quiet">
            {actionLabel}
          </Button>
        ) : null}
        {onDismiss ? (
          <Button onClick={onDismiss} size="md" variant="quiet">
            Dismiss
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export type ToastStackProps = {
  children: ReactNode;
};

export function ToastStack({ children }: ToastStackProps) {
  return (
    <div aria-live="polite" className="toast-stack">
      {children}
    </div>
  );
}
