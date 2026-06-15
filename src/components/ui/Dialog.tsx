import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { IconButton } from '@/components/ui/IconButton';

export type DialogProps = {
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
};

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function Dialog({
  actions,
  children,
  description,
  isOpen,
  onClose,
  title,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const activeElement = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    document.body.classList.add('dialog-open');

    if (panel) {
      const focusableElements = getFocusableElements(panel);
      const targetElement = focusableElements[0] ?? panel;
      targetElement.focus();
    }

    return () => {
      document.body.classList.remove('dialog-open');
      activeElement?.focus();
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab' || !panelRef.current) {
      return;
    }

    const focusableElements = getFocusableElements(panelRef.current);

    if (focusableElements.length === 0) {
      event.preventDefault();
      panelRef.current.focus();
      return;
    }

    const currentIndex = focusableElements.indexOf(
      document.activeElement as HTMLElement,
    );
    const isShiftPressed = event.shiftKey;
    const lastIndex = focusableElements.length - 1;

    if (!isShiftPressed && currentIndex === lastIndex) {
      event.preventDefault();
      focusableElements[0]?.focus();
    }

    if (isShiftPressed && currentIndex <= 0) {
      event.preventDefault();
      focusableElements[lastIndex]?.focus();
    }
  };

  return createPortal(
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="dialog-panel"
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="dialog__header">
          <div>
            <h2 className="dialog__title" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="dialog__description" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <IconButton
            icon="x"
            label="Close dialog"
            onClick={onClose}
            variant="quiet"
          />
        </div>
        <div className="dialog__body">{children}</div>
        {actions ? <div className="dialog__actions">{actions}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
