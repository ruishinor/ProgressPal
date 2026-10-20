import { createContext, useContext, useState } from 'react';

/**
 * One physical activation may cause one progression. The card's action
 * ("Sjekk", then "Neste", then the next card's "Neste", then the finished
 * screen's buttons and the picker's sessions) is drawn in the same place, so
 * the second tap of a double tap would land on its own successor and skip the
 * feedback, a Learn card or the whole finished screen.
 *
 * The guard is local to one surface: it opens a short window after an
 * accepted press of a control that moves the learner on, and refuses another
 * such press until it closes. It is not a debounce: taps on answers, tokens and
 * pairs never pass through it, and a deliberate second press after the window
 * (a learner reads the feedback for longer) always works, by touch, mouse or
 * keyboard. It holds a timestamp and nothing else.
 */
export const ACTION_GUARD_MS = 400;

export type ActionGuard = {
  /** Whether a press happening now is a new activation rather than a repeat. */
  accept: () => boolean;
};

export function createActionGuard(
  now: () => number = () => performance.now(),
): ActionGuard {
  let lastAccepted = Number.NEGATIVE_INFINITY;

  return {
    accept() {
      const at = now();

      if (at - lastAccepted < ACTION_GUARD_MS) {
        return false;
      }
      lastAccepted = at;

      return true;
    },
  };
}

/** Lets a page (or a test) share one guard across the cards of a session. */
export const ActionGuardContext = createContext<ActionGuard | null>(null);

/** The surface's shared guard, or a private one for a control used alone. */
export function useActionGuard(): ActionGuard {
  const shared = useContext(ActionGuardContext);
  const [own] = useState(() => createActionGuard());

  return shared ?? own;
}
