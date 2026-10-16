import type { ReactNode } from 'react';

import { RpgButton } from '@/features/rpg/components/RpgButton';

/**
 * The immersive frame for one microlearning surface: a close control, an
 * optional progress indicator, and the current card, and nothing else. It
 * deliberately does not render the RPG primary navigation or hero HUD. It
 * fills the viewport; if larger text needs more room it is this element that
 * scrolls, never a part of a card.
 */
export function MicroShell({
  children,
  closeTo,
  progress,
}: {
  children: ReactNode;
  closeTo: string;
  /** Only while a session runs; `current` is the 1-based card on screen. */
  progress?: { current: number; done: boolean; total: number };
}) {
  const reached =
    progress === undefined
      ? 0
      : progress.done
        ? progress.total
        : progress.current;

  return (
    <main aria-label="Mikroøkt" className="micro">
      <header className="micro__top">
        <RpgButton
          aria-label="Lukk mikroøkten"
          href={closeTo}
          leadingIcon="✕"
          variant="quiet"
        >
          Lukk
        </RpgButton>
        {progress === undefined ? null : (
          <>
            <div
              aria-label="Framdrift i økten"
              aria-valuemax={progress.total}
              aria-valuemin={0}
              aria-valuenow={reached}
              aria-valuetext={
                progress.done
                  ? `Ferdig, ${progress.total} av ${progress.total} kort`
                  : `Kort ${progress.current} av ${progress.total}`
              }
              className="micro__progress"
              role="progressbar"
            >
              {Array.from({ length: progress.total }, (_, index) => (
                <span
                  className="micro__segment"
                  data-state={
                    index + 1 < progress.current || progress.done
                      ? 'done'
                      : index + 1 === progress.current
                        ? 'current'
                        : 'todo'
                  }
                  key={index}
                />
              ))}
            </div>
            <small aria-hidden="true">
              {reached}/{progress.total}
            </small>
          </>
        )}
      </header>
      {children}
    </main>
  );
}
