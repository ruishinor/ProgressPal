import { useState } from 'react';

import {
  initialPractice,
  retryAndSubmit,
  retryAttempt,
  submitAttempt,
  type PracticeState,
} from '../model';

/**
 * Session-local state of one assessed card: where it is in the one-retry loop.
 * It lives and dies with the card; nothing is stored or reported anywhere.
 */
export function usePractice() {
  const [state, setState] = useState<PracticeState>(initialPractice);

  return {
    retry: () => setState(retryAttempt),
    /** A new answer chosen while a first miss is shown (see the model). */
    retryWith: (correct: boolean) =>
      setState((current) => retryAndSubmit(current, correct)),
    state,
    submit: (correct: boolean) =>
      setState((current) => submitAttempt(current, correct)),
  };
}

export type Practice = ReturnType<typeof usePractice>;
