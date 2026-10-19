import type { ReactNode } from 'react';

import { RpgButton } from '@/features/rpg/components/RpgButton';

/**
 * The immersive frame for one microlearning surface: a close control, an
 * optional progress indicator, and the current card, and nothing else. It
 * deliberately does not render the RPG primary navigation or hero HUD. It
 * fills the viewport; if larger text needs more room it is this element that
 * scrolls, never a part of a card. Content reads top-down in one column of
 * comfortable width, so a question stays next to its choices.
 */
export function MicroShell({
  children,
  closeTo,
  name,
  progress,
  presentation,
}: {
  presentation?: 'utviklerblikk';
  children: ReactNode;
  closeTo: string;
  /** What the surface is called for assistive technology (default Mikroøkt). */
  name?: string;
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
    <main
      aria-label={name ?? 'Mikroøkt'}
      lang={presentation === 'utviklerblikk' ? 'nb' : undefined}
      className={
        presentation === 'utviklerblikk'
          ? 'micro micro--utviklerblikk'
          : 'micro'
      }
    >
      <header className="micro__top">
        <RpgButton
          aria-label={name === undefined ? 'Lukk mikroøkten' : `Lukk ${name}`}
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
