import { Link } from 'react-router-dom';

import { readActivityParticipation } from '@/lib/db/activity';
import { rpgActivityPath } from '@/lib/routing/rpgRoutePaths';

import { useActivityLanguage, useActivityRead } from './useActivity';

export function ActivityIndicator() {
  const norwegian = useActivityLanguage();
  const { data, error } = useActivityRead(readActivityParticipation);
  const label = norwegian ? 'Aktivitetsnivå' : 'Activity Level';
  return (
    <Link className="activity-indicator" to={rpgActivityPath}>
      {label}{' '}
      {error
        ? norwegian
          ? 'utilgjengelig'
          : 'unavailable'
        : (data?.level ?? '…')}
    </Link>
  );
}
