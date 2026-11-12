import { useId, useState, type ReactNode } from 'react';
import { Link, useOutletContext } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { RpgPanel } from '@/features/rpg/components/RpgPanel';
import { rpgRoutePath, rpgSettingsPath } from '@/lib/routing/rpgRoutePaths';

import { GroupSession } from './GroupSession';
import { PersonalWeekDetails } from './PersonalWeek';
import { useLearningWeek } from './useLearningWeek';

import { useGroupAccess } from './useGroupAccess';

function GroupAccess({
  learning,
  renderPanels,
  onGuildName,
}: {
  learning: ReturnType<typeof useLearningWeek>;
  onGuildName?: (userId: string, name: string | null) => void;
  renderPanels?: (
    guild: ReactNode,
    administration: ReactNode,
    share?: ReactNode,
  ) => ReactNode;
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
        onGuildName={onGuildName}
      />
    );
  }

  const access = !online ? (
    <p role="status">
      Koble til nettet for å se Guild. Du kan øve videre på denne enheten.
    </p>
  ) : (
    <>
      <p>
        {state.status === 'unavailable'
          ? 'Kunne ikke lese kontoen på denne enheten.'
          : 'Slå på skytjenester og logg inn for å opprette eller bli med i en Guild. Du velger selv når du deler læringsdager.'}
      </p>
      <p>
        <Link to={settings + '#cloud-account'}>Åpne kontoinnstillinger</Link>
      </p>
    </>
  );
  return renderPanels ? (
    renderPanels(
      <RpgPanel title="Guild" titleAs="h2">
        {access}
      </RpgPanel>,
      <RpgPanel title="Administrasjon" titleAs="h2">
        {access}
      </RpgPanel>,
    )
  ) : (
    <Card title="Guild" titleAs="h2">
      {access}
    </Card>
  );
}

const guildTabs = ['Min uke', 'Guild', 'Administrasjon'] as const;

function RpgGuildPage({
  learning,
}: {
  learning: ReturnType<typeof useLearningWeek>;
}) {
  const { onGuildName } =
    useOutletContext<{
      onGuildName: (userId: string, name: string | null) => void;
    } | null>() ?? {};
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
    <section className="page-section rpg-guild" lang="nb">
      <header className="rpg-page-header">
        <div>
          <h1>Guild</h1>
          <p className="rpg-page-lede">
            Øv sammen i en privat Guild med opptil åtte medlemmer.
          </p>
        </div>
        <p>
          <Link to={rpgRoutePath}>Tilbake til oversikten</Link>
        </p>
      </header>
      <div aria-label="Guild-visning" className="activity-tabs" role="tablist">
        {guildTabs.map((label, index) => (
          <button
            aria-controls={`${id}-panel-${index}`}
            aria-selected={selected === index}
            id={`${id}-tab-${index}`}
            key={label}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => {
              const last = guildTabs.length - 1;
              const destinations: Record<string, number> = {
                ArrowLeft: (index + last) % guildTabs.length,
                ArrowRight: (index + 1) % guildTabs.length,
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
      <GroupAccess
        learning={learning}
        onGuildName={onGuildName}
        renderPanels={(guild, administration, share) => (
          <>
            {panel(
              0,
              <PersonalWeekDetails learning={learning} onGroupPage rpg>
                {share}
              </PersonalWeekDetails>,
            )}
            {panel(1, guild)}
            {panel(2, administration)}
          </>
        )}
      />
    </section>
  );
}

export function GroupPage({ rpg }: { rpg: boolean }) {
  const learning = useLearningWeek();
  if (rpg) return <RpgGuildPage learning={learning} />;

  return (
    <section className="page-section" lang="nb">
      <header>
        <p>
          <Link to="/dashboard">Tilbake til oversikten</Link>
        </p>
        <h1>Guild</h1>
        <p>Øv sammen i en privat Guild med opptil åtte medlemmer.</p>
      </header>
      <PersonalWeekDetails learning={learning} onGroupPage rpg={false} />
      <GroupAccess learning={learning} />
    </section>
  );
}
