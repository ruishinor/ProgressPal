import { useEffect } from 'react';

import { useAppState } from '@/lib/appState';

/** The shared default brand (unchanged since before Epic E). */
export const defaultShellBrand = 'ProgressPal CS50 Edition';

/** The product name alone, before a fresh learner has chosen a programme. */
export const neutralShellBrand = 'ProgressPal';

/**
 * The visible shell brand (Epic E, OD-6 mechanism): a programme may carry its
 * own brand in its terminology; otherwise the shared default shows. Before a
 * fresh learner has chosen a programme no programme is presented as chosen,
 * so the product name shows alone. The brand also names the document. Which
 * string a programme shows is an owner decision; this hook only applies a
 * decided one.
 */
export function useShellBrand(): string {
  const { programmeScope, requiresOnboarding } = useAppState();
  const brand = requiresOnboarding
    ? neutralShellBrand
    : (programmeScope?.content.terminology.shellBrand ?? defaultShellBrand);

  useEffect(() => {
    document.title = brand;
  }, [brand]);

  return brand;
}
