import { useEffect, useState } from 'react';

import {
  MicrolearningPage,
  type MicroAvailability,
} from '@/features/microlearning';
import { loadRpgMicroAvailability } from '@/features/rpg';
import { useAppState } from '@/lib/appState';
import { requireProgrammeScope } from '@/lib/domain';

/**
 * The microlearning route's programme and Campaign seam. The active
 * programme's scope says whether it ships microlearning and which sessions;
 * the Campaign's own position (the read model behind Home and the Map: which
 * quests are complete or reached, and the current one) says which are open
 * now: one short primer for what comes next, and the sessions that repeat what
 * the learner has already worked on. A read, never a write, and the very same
 * function (`loadRpgMicroAvailability`) that decides whether Home offers the
 * entry, so a direct visit and the Home entry cannot disagree. The feature
 * itself reads neither app state nor storage. A programme without a bank gets
 * the feature's short notice and no read at all, so another programme's cards
 * can never appear under it, and a failed read leaves nothing open.
 */
export function MicrolearningRoute() {
  const scope = requireProgrammeScope(useAppState().programmeScope);
  const { programmeId } = scope;
  const bank = scope.content.microlearning;
  const [read, setRead] = useState<{
    availability: MicroAvailability;
    programmeId: string;
  } | null>(null);

  useEffect(() => {
    if (bank === undefined) {
      return undefined;
    }
    let active = true;

    void loadRpgMicroAvailability(scope).then((availability) => {
      if (active) {
        setRead({ availability, programmeId });
      }
    });

    return () => {
      active = false;
    };
  }, [bank, programmeId, scope]);

  return (
    <MicrolearningPage
      availability={
        read?.programmeId === programmeId
          ? read.availability
          : { status: 'loading' }
      }
      bank={bank}
    />
  );
}
