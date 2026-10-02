import { useEffect } from 'react';

import { useAppState } from '@/lib/appState';

/** The shared default brand (unchanged since before Epic E). */
export const defaultShellBrand = 'ProgressPal CS50 Edition';

/**
 * The visible shell brand (Epic E, OD-6 mechanism): a programme may carry its
 * own brand in its terminology; otherwise the shared default shows. The
 * brand also names the document. Which string a programme shows is an owner
 * decision; this hook only applies a decided one.
 */
export function useShellBrand(): string {
  const { programmeScope } = useAppState();
  const brand =
    programmeScope?.content.terminology.shellBrand ?? defaultShellBrand;

  useEffect(() => {
    document.title = brand;
  }, [brand]);

  return brand;
}
