import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { RpgPanel } from '@/features/rpg/components/RpgPanel';
import { getCloudAccount, type CloudAccountState } from '@/lib/cloud';
import { rpgRoutePath, rpgSettingsPath } from '@/lib/routing/rpgRoutePaths';

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

function GroupAccess({
  learning,
  renderPanels,
}: {
  learning: ReturnType<typeof useLearningWeek>;
  renderPanels?: (team: ReactNode, administration: ReactNode) => ReactNode;
}) {
  const { state, online } = useGroupAccess();
  const settings = renderPanels ? rpgSettingsPath : '/settings';

  if (online && state.status === 'signed-in' && state.userId !== '') {
    return (
      <GroupSession
        key={state.userId + ':' + learning.week.start}
        userId={state.userId}
        settings={settings}
        learning={learning}
        renderPanels={renderPanels}
      />
    );
  }

  const access = !online ? (
    <p role="status">
      Koble til nettet for å se laget. Du kan øve videre på denne enheten.
    </p>
  ) : (
    <>
      <p>
        {state.status === 'unavailable'
          ? 'Kunne ikke lese kontoen på denne enheten.'
          : 'Slå på skytjenester og logg inn for å opprette eller bli med i et lag. Du velger selv når du deler læringsdager.'}
      </p>
      <p>
        <Link to={settings + '#cloud-account'}>Åpne kontoinnstillinger</Link>
      </p>
    </>
  );
  return renderPanels ? (
    renderPanels(
      <RpgPanel title="Team" titleAs="h2">
        {access}
      </RpgPanel>,
      <RpgPanel title="Administrasjon" titleAs="h2">
        {access}
      </RpgPanel>,
    )
  ) : (
    <Card title="Laget" titleAs="h2">
      {access}
    </Card>
  );
}

const teamTabs = ['Min uke', 'Team', 'Administrasjon'] as const;

function RpgTeamPage({
  learning,
}: {
  learning: ReturnType<typeof useLearningWeek>;
}) {
  const id = useId();
  const [selected, setSelected] = useState(0);

  function panel(index: number, content: ReactNode) {
    return (
      <div
        aria-labelledby={`${id}-tab-${index}`}
        hidden={selected !== index}
        id={`${id}-panel-${index}`}
        role="tabpanel"
        tabIndex={0}
      >
        {content}
      </div>
    );
  }

  return (
    <section className="page-section rpg-team" lang="nb">
      <header className="rpg-page-header">
        <div>
          <h1>Mitt team</h1>
          <p className="rpg-page-lede">
            Øv sammen i et privat lag med opptil åtte medlemmer.
          </p>
        </div>
        <p>
          <Link to={rpgRoutePath}>Tilbake til oversikten</Link>
        </p>
      </header>
      <div aria-label="Teamvisning" className="activity-tabs" role="tablist">
        {teamTabs.map((label, index) => (
          <button
            aria-controls={`${id}-panel-${index}`}
            aria-selected={selected === index}
            id={`${id}-tab-${index}`}
            key={label}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => {
              const last = teamTabs.length - 1;
              const destinations: Record<string, number> = {
                ArrowLeft: (index + last) % teamTabs.length,
                ArrowRight: (index + 1) % teamTabs.length,
                Home: 0,
                End: last,
              };
              if (!Object.hasOwn(destinations, event.key)) return;
              const next = destinations[event.key];
              event.preventDefault();
              setSelected(next);
              document.getElementById(`${id}-tab-${next}`)?.focus();
            }}
            role="tab"
            tabIndex={selected === index ? 0 : -1}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      {panel(0, <PersonalWeekDetails learning={learning} onGroupPage rpg />)}
      <GroupAccess
        learning={learning}
        renderPanels={(team, administration) => (
          <>
            {panel(1, team)}
            {panel(2, administration)}
          </>
        )}
      />
    </section>
  );
}

export function GroupPage({ rpg }: { rpg: boolean }) {
  const learning = useLearningWeek();
  if (rpg) return <RpgTeamPage learning={learning} />;

  return (
    <section className="page-section" lang="nb">
      <header>
        <p>
          <Link to="/dashboard">Tilbake til oversikten</Link>
        </p>
        <h1>Læringslaget</h1>
        <p>Øv sammen i et privat lag med opptil åtte medlemmer.</p>
      </header>
      <PersonalWeekDetails learning={learning} onGroupPage rpg={false} />
      <GroupAccess learning={learning} />
    </section>
  );
}
