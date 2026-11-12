import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { RpgPanel } from '@/features/rpg/components/RpgPanel';
import { rpgFocusPath } from '@/lib/routing/rpgRoutePaths';
import { socialPath } from '@/lib/routing/socialPaths';
import { formatCalendarDay, formatWeekRange } from '@/lib/time/osloWeek';

import { useLearningWeek } from './useLearningWeek';

export function PersonalWeek() {
  const learning = useLearningWeek();
  return <PersonalWeekDetails learning={learning} rpg={false} />;
}

export function PersonalWeekDetails({
  rpg,
  learning,
  onGroupPage = false,
  children,
}: {
  rpg: boolean;
  learning: ReturnType<typeof useLearningWeek>;
  onGroupPage?: boolean;
  children?: ReactNode;
}) {
  const { week, days, target } = learning;
  const Panel = rpg ? RpgPanel : Card;
  return (
    <Panel lang="nb" padding="compact" title="Denne uken" titleAs="h2">
      <p>{formatWeekRange(week)} · norsk tid</p>
      {days === undefined ? (
        <p role="status">Henter læringsdager …</p>
      ) : days === null ? (
        <p role="status">Kunne ikke lese læringsdagene på denne enheten.</p>
      ) : (
        <>
          <p>
            {days.length === 0
              ? 'Klar for ukens første læringsdag?'
              : `Du har øvd ${days.length} ${days.length === 1 ? 'dag' : 'dager'}.`}
            {target === undefined
              ? null
              : ` Målet ditt er ${target} ${target === 1 ? 'dag' : 'dager'}.`}
          </p>
          {days.length === 0 ? (
            <p>
              <Link to={rpg ? rpgFocusPath : '/sessions'}>
                Start eller loggfør en økt
              </Link>
            </p>
          ) : (
            <p>{days.map(formatCalendarDay).join(', ')}</p>
          )}
        </>
      )}
      {onGroupPage ? (
        <p>
          En lagret økt, en innsendt oppgave eller en registrert fullføring kan
          telle. Endringer i lokale registreringer kan endre oversikten.
        </p>
      ) : (
        <p>
          <Link to={socialPath}>Guild</Link>
        </p>
      )}
      {children}
    </Panel>
  );
}
