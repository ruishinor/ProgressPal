import type { PropsWithChildren } from 'react';

import { AppStateProvider } from '@/lib/appState';
import type { ProgrammeScope } from '@/lib/domain';
import { getActiveProgrammeDefinition } from '@/programmes';

/**
 * The composition root resolves the active programme once at bootstrap
 * (Epic C / C5) and hands its neutral runtime scope to app state. An
 * unresolvable programme becomes the existing bootstrap error state.
 */
function resolveActiveProgramme(): ProgrammeScope {
  const { catalogue, catalogueId, policy } = getActiveProgrammeDefinition();

  return { catalogue, catalogueId, policy };
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AppStateProvider resolveProgramme={resolveActiveProgramme}>
      {children}
    </AppStateProvider>
  );
}
