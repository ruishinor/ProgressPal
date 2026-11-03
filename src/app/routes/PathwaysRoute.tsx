import { useLocation } from 'react-router-dom';
import { PathwaysPage } from '@/features/pathways';
import { gitPathwayProgrammeId } from '@/lib/routing/pathwaysPaths';
import { resolveProgrammeScope } from '../providers/programmeComposition';

/** Explicit learning scope: never replace the app's active programme scope. */
export function PathwaysRoute() {
  const { pathname } = useLocation();
  return (
    <PathwaysPage
      key={pathname}
      scope={resolveProgrammeScope(gitPathwayProgrammeId)}
    />
  );
}
