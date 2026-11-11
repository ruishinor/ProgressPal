import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { getCloudAccount, type CloudAccountState } from '@/lib/cloud';
import { rpgSettingsPath } from '@/lib/routing/rpgRoutePaths';

import { GroupSession } from './GroupSession';
import { PersonalWeekDetails } from './PersonalWeek';
import { useLearningWeek } from './useLearningWeek';

type AccountState = CloudAccountState | { status: 'unavailable' };

function readAccountState(): AccountState {
  try {
    return getCloudAccount().getState();
  } catch {
    return { status: 'unavailable' };
  }
}

function useGroupAccess() {
  const account = getCloudAccount();
  const [state, setState] = useState(readAccountState);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine);
    const updateAccount = () => setState(readAccountState());
    const unsubscribe = account.subscribe(setState);
    window.addEventListener('storage', updateAccount);
    window.addEventListener('focus', updateAccount);
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', updateAccount);
      window.removeEventListener('focus', updateAccount);
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, [account]);

  return { state, online };
}

export function GroupPage({ rpg }: { rpg: boolean }) {
  const learning = useLearningWeek();
  const { state, online } = useGroupAccess();
  const settings = rpg ? rpgSettingsPath : '/settings';

  return (
    <section className="page-section" lang="nb">
      <header>
        <p>
          <Link to={rpg ? '/rpg' : '/dashboard'}>Tilbake til oversikten</Link>
        </p>
        <h1>Læringslaget</h1>
        <p>Øv sammen i et privat lag med opptil åtte medlemmer.</p>
      </header>
      <PersonalWeekDetails learning={learning} onGroupPage rpg={rpg} />
      {!online ? (
        <Card title="Laget" titleAs="h2">
          <p role="status">
            Koble til nettet for å se laget. Du kan øve videre på denne enheten.
          </p>
        </Card>
      ) : state.status === 'signed-in' && state.userId !== '' ? (
        <GroupSession
          key={state.userId + ':' + learning.week.start}
          userId={state.userId}
          settings={settings}
          learning={learning}
        />
      ) : (
        <Card title="Laget" titleAs="h2">
          <p>
            {state.status === 'unavailable'
              ? 'Kunne ikke lese kontoen på denne enheten.'
              : 'Slå på skytjenester og logg inn for å opprette eller bli med i et lag. Du velger selv når du deler læringsdager.'}
          </p>
          <p>
            <Link to={settings + '#cloud-account'}>
              Åpne kontoinnstillinger
            </Link>
          </p>
        </Card>
      )}
    </section>
  );
}
