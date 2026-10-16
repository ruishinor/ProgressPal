import { useParams } from 'react-router-dom';

import { MicroTrackPage } from '@/features/microlearning';
import { useAppState } from '@/lib/appState';
import { requireProgrammeScope } from '@/lib/domain';

/**
 * The seam for a voluntary microlearning track. It reads only the active
 * programme's own content: a track is open regardless of the Campaign, so
 * there is no progress read and nothing is written. A programme without the
 * track gets the feature's short notice, never another programme's cards.
 */
export function MicroTrackRoute() {
  const { trackId } = useParams();
  const scope = requireProgrammeScope(useAppState().programmeScope);
  const track = scope.content.microlearning?.tracks?.find(
    (entry) => entry.id === trackId,
  );

  return <MicroTrackPage key={trackId} track={track} />;
}
