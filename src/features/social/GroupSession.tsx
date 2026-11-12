import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SettingsIcon } from '@/components/ui/SettingsIcon';
import { TextInput } from '@/components/ui/TextInput';
import { RpgButton } from '@/features/rpg/components/RpgButton';
import { RpgPanel } from '@/features/rpg/components/RpgPanel';
import { RpgProgressBar } from '@/features/rpg/components/RpgProgressBar';
import {
  getSocialGroup,
  type SocialCommand,
  type SocialFailure,
  type SocialResult,
} from '@/lib/cloud';
import { getOsloWeek } from '@/lib/time/osloWeek';

import { summarizeGroup } from './groupModel';
import { defaultGuildName } from './useGroupAccess';
import type { useLearningWeek } from './useLearningWeek';

const failures: Record<SocialFailure, string> = {
  unauthenticated: 'Økten er utløpt. Logg inn på nytt i kontoinnstillingene.',
  'already-member':
    'Kontoen er allerede med i en Guild. Oppdater for å fortsette.',
  'invalid-input': 'Sjekk Guild-navn, kallenavn eller kode og prøv igjen.',
  'invalid-code': 'Koden er ugyldig eller ikke lenger aktiv. Be om en ny kode.',
  'group-full': 'Guilden har åtte medlemmer og er full.',
  'no-group': 'Kontoen er ikke lenger med i Guilden. Oppdater medlemskapet.',
  'membership-changed':
    'Medlemskapet har endret seg. Oppdater Guilden før du deler eller gjør endringer.',
  'not-admin':
    'Bare Guild-administratoren kan endre navn og invitasjonskode. Oppdater Guilden.',
  'invalid-days':
    'Delte dager må være fra inneværende uke i norsk tid. Sjekk klokken på enheten og oppdater Guilden.',
  unavailable:
    'Kunne ikke bekrefte resultatet. Oppdater Guilden når du er tilkoblet.',
  'rate-limited':
    'Tjenesten har fått mange forespørsler. Vent litt og oppdater Guilden.',
};

type Snapshot = Extract<SocialResult, { status: 'ok' }>;

type Props = {
  userId: string;
  settings: string;
  learning: ReturnType<typeof useLearningWeek>;
  onGuildName?: (userId: string, name: string | null) => void;
  renderPanels?: (guild: ReactNode, administration: ReactNode) => ReactNode;
};

export function GroupSession({
  userId,
  settings,
  learning,
  onGuildName,
  renderPanels,
}: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const active = useRef<AbortController | null>(null);
  const focus = useRef<HTMLHeadingElement>(null);
  const nameEditor = useRef<HTMLDetailsElement>(null);
  const nameEditorToggle = useRef<HTMLElement>(null);
  const administrationHeading = useRef<HTMLHeadingElement>(null);
  const commandHeading = useRef(focus);
  const stage =
    snapshot === null ? 'unread' : snapshot.group === null ? 'join' : 'member';
  const shownStage = useRef(stage);

  useEffect(
    () => () => {
      active.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (shownStage.current !== stage) {
      shownStage.current = stage;
      const heading = commandHeading.current.current;
      const panel = heading?.closest('[role="tabpanel"]');
      const activeElement = document.activeElement;
      if (
        !panel ||
        (!panel.hasAttribute('hidden') &&
          (activeElement === document.body || panel.contains(activeElement)))
      ) {
        heading?.focus();
      }
    }
  }, [stage]);

  async function run(command: SocialCommand, fromAdministration = false) {
    if (active.current !== null) return;
    commandHeading.current =
      renderPanels && fromAdministration ? administrationHeading : focus;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setNotice('');
    setSnapshot((previous) =>
      previous === null ? null : { ...previous, invite: null },
    );

    let result: SocialResult;
    try {
      result = await getSocialGroup().execute(
        command,
        userId,
        AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
      );
    } catch {
      result = { status: 'unavailable' };
    }
    if (controller.signal.aborted) return;

    active.current = null;
    setBusy(false);
    if (result.status !== 'ok') {
      setNotice(failures[result.status]);
      if (result.status === 'unauthenticated') setSignedOut(true);
      if (
        !['invalid-code', 'group-full', 'invalid-input'].includes(result.status)
      ) {
        setSnapshot(null);
        setConfirmLeave(false);
        onGuildName?.(userId, null);
      }
      return;
    }

    if (
      result.group !== null &&
      result.weekStart !== getOsloWeek(new Date()).start
    ) {
      setSnapshot(null);
      setNotice(
        'Uken i Guilden avviker fra klokken på enheten. Sjekk klokken og oppdater Guilden.',
      );
      return;
    }
    setSnapshot(result);
    onGuildName?.(userId, result.group?.name ?? null);
    setConfirmLeave(false);
    if (command.operation === 'share') setNotice('Læringsdagene er delt.');
    if (command.operation === 'leave') setNotice('Du har forlatt Guilden.');
    if (command.operation === 'revoke')
      setNotice('Invitasjonskoden er deaktivert.');
    if (command.operation === 'rename') {
      closeNameEditor();
      setNotice('Guild-navnet er lagret.');
    }
  }

  function closeNameEditor() {
    if (nameEditor.current) nameEditor.current.open = false;
    nameEditorToggle.current?.focus();
  }

  function enrol(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const nickname = String(values.get('nickname') ?? '').trim();
    if (mode === 'create') {
      void run(
        {
          operation: 'create',
          nickname,
          name: String(values.get('name') ?? '').trim(),
        },
        true,
      );
    } else {
      void run(
        {
          operation: 'join',
          nickname,
          code: String(values.get('code') ?? '')
            .trim()
            .toLowerCase(),
        },
        true,
      );
    }
  }

  async function copyInvite(invite: string) {
    try {
      await navigator.clipboard.writeText(invite);
      setNotice('Invitasjonskoden er kopiert.');
    } catch {
      setNotice('Merk og kopier koden fra feltet.');
    }
  }

  const group = snapshot?.group ?? null;
  const invite = snapshot?.invite ?? null;
  const summary = group === null ? null : summarizeGroup(group);
  const canShare = Array.isArray(learning.days) && learning.days.length > 0;
  const Action = renderPanels ? RpgButton : Button;
  const status = <p role="status">{busy ? 'Henter Guild-data …' : notice}</p>;
  const accountLink = (
    <p>
      <Link to={settings + '#cloud-account'}>Åpne kontoinnstillinger</Link>
    </p>
  );
  const readAction = (fromAdministration = false) => (
    <Action
      disabled={busy}
      onClick={() => void run({ operation: 'read' }, fromAdministration)}
      variant="secondary"
    >
      {snapshot === null ? 'Hent Guild' : 'Oppdater Guild'}
    </Action>
  );
  const shareAction = group !== null && (
    <Action
      disabled={busy || !canShare}
      onClick={() => {
        if (
          learning.days &&
          learning.week.today === getOsloWeek(new Date()).today
        ) {
          void run(
            {
              operation: 'share',
              days: learning.days,
              membership: group.membership,
            },
            true,
          );
        }
      }}
    >
      Del ukens læringsdager
    </Action>
  );
  const enrolment = snapshot !== null && group === null && (
    <>
      <p>
        Ved å bli med deler du kallenavnet ditt med Guilden. Nhost lagrer
        medlemskapet og datoene du velger å dele. Medlemmer ser kallenavn og
        antall dager denne uken.
      </p>
      <div className="action-row">
        <Action
          aria-pressed={mode === 'create'}
          disabled={busy}
          onClick={() => setMode('create')}
          variant="secondary"
        >
          Opprett en Guild
        </Action>
        <Action
          aria-pressed={mode === 'join'}
          disabled={busy}
          onClick={() => setMode('join')}
          variant="secondary"
        >
          Bli med i en Guild
        </Action>
      </div>
      <form className="profile-form" onSubmit={enrol}>
        <label>
          Kallenavn{' '}
          <TextInput
            autoComplete="off"
            disabled={busy}
            maxLength={24}
            name="nickname"
            required
          />
        </label>
        {mode === 'create' ? (
          <label>
            Guild-navn{' '}
            <TextInput
              key="name"
              autoComplete="off"
              defaultValue={defaultGuildName}
              disabled={busy}
              maxLength={40}
              name="name"
              required
            />
          </label>
        ) : (
          <label>
            Invitasjonskode{' '}
            <TextInput
              key="code"
              autoComplete="off"
              disabled={busy}
              maxLength={64}
              name="code"
              required
              spellCheck={false}
            />
          </label>
        )}
        <div className="action-row">
          <Action disabled={busy} type="submit">
            {mode === 'create' ? 'Opprett Guild' : 'Bli med'}
          </Action>
        </div>
      </form>
    </>
  );
  const Progress = renderPanels ? RpgProgressBar : ProgressBar;
  const board = group !== null && summary !== null && (
    <>
      <h3>Medlemmer</h3>
      <p>{group.members.length} av 8 plasser i bruk</p>
      <ul aria-label="Medlemmer" className="learning-group__rows" role="list">
        {group.members.map(({ nickname, self }, index) => (
          <li key={index}>
            {nickname}
            {self ? ' (deg)' : ''}
          </li>
        ))}
      </ul>
      <Progress
        label="Felles mål"
        helperText={`${summary.total} av ${summary.target} læringsdager delt. Målet er to dager per medlem.`}
        max={summary.target}
        value={summary.total}
        showValue={false}
        tone={summary.total >= summary.target ? 'success' : undefined}
      />
      {summary.total >= summary.target && (
        <p>
          <strong>Guilden nådde ukemålet!</strong>
        </p>
      )}
      {group.members.length > 1 ? (
        <>
          <h3>Ukas rangering</h3>
          <ul
            aria-label="Ukas rangering"
            className="learning-group__rows learning-group__ranking"
            role="list"
          >
            {summary.ranking.map(({ nickname, rank, days, self }, index) => (
              <li key={index}>
                <span>{rank}.</span>{' '}
                <span>
                  {nickname}
                  {self ? ' (deg)' : ''}
                </span>{' '}
                <span>
                  {days} {days === 1 ? 'dag' : 'dager'}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Inviter noen du vil øve sammen med.</p>
      )}
      <p>
        Hver delt dag teller én gang, også fra flere enheter. Delte dager blir
        stående selv om du endrer registreringene dine. Del innen søndag i norsk
        tid.
      </p>
    </>
  );
  const membership = group !== null && (
    <>
      {group.canInvite && (
        <>
          <h3>Invitasjon</h3>
          <p>
            Gi koden til dem du vil invitere. En ny kode erstatter den gamle.
          </p>
          <div className="action-row">
            <Action
              disabled={busy || group.members.length >= 8}
              onClick={() =>
                void run(
                  {
                    operation: 'invite',
                    membership: group.membership,
                  },
                  true,
                )
              }
              variant="secondary"
            >
              {group.hasInvite ? 'Lag ny kode' : 'Lag invitasjonskode'}
            </Action>
            {group.hasInvite && (
              <Action
                disabled={busy}
                onClick={() =>
                  void run(
                    {
                      operation: 'revoke',
                      membership: group.membership,
                    },
                    true,
                  )
                }
                variant="quiet"
              >
                Deaktiver koden
              </Action>
            )}
          </div>
          {invite !== null && (
            <>
              <label>
                Invitasjonskode <TextInput readOnly value={invite} />
              </label>
              <div className="action-row">
                <Action
                  disabled={busy}
                  onClick={() => void copyInvite(invite)}
                  variant="secondary"
                >
                  Kopier invitasjonskode
                </Action>
              </div>
            </>
          )}
        </>
      )}
      <details>
        <summary>Medlemskap og konto</summary>
        <p>
          Du kan forlate Guilden når du vil. Da fjernes medlemskapet og dagene
          du har delt.
        </p>
        <p>
          Øving lagres på enheten. Medlemskapet og de delte dagene ligger hos
          Nhost, også om du nullstiller appen eller gjenoppretter en
          sikkerhetskopi.
        </p>
        {accountLink}
        {confirmLeave && (
          <p>Vil du fjerne medlemskapet og de delte dagene fra Guilden?</p>
        )}
        <div className="action-row">
          <Action
            disabled={busy}
            onClick={() => {
              if (confirmLeave)
                void run(
                  {
                    operation: 'leave',
                    membership: group.membership,
                  },
                  true,
                );
              else setConfirmLeave(true);
            }}
            variant={confirmLeave ? 'danger' : 'secondary'}
          >
            {confirmLeave ? 'Ja, forlat Guilden' : 'Forlat Guilden'}
          </Action>
          {confirmLeave && (
            <Action
              disabled={busy}
              onClick={() => setConfirmLeave(false)}
              variant="quiet"
            >
              Avbryt
            </Action>
          )}
        </div>
      </details>
    </>
  );

  const heading = (
    <div className="learning-group__heading">
      <h2 ref={focus} tabIndex={-1}>
        {group?.name ?? 'Guild'}
      </h2>
      {group?.canInvite && (
        <details className="learning-group__name-editor" ref={nameEditor}>
          <summary
            aria-label="Endre Guild-navn"
            className="learning-group__gear"
            ref={nameEditorToggle}
          >
            <SettingsIcon />
          </summary>
          <form
            className="profile-form"
            key={group.name}
            onSubmit={(event) => {
              event.preventDefault();
              const name = new FormData(event.currentTarget).get('name');
              if (typeof name === 'string') {
                void run({
                  operation: 'rename',
                  membership: group.membership,
                  name: name.trim(),
                });
              }
            }}
          >
            <label>
              Guild-navn
              <TextInput
                defaultValue={group.name}
                disabled={busy}
                maxLength={40}
                name="name"
                required
              />
            </label>
            <div className="action-row">
              <Action disabled={busy} type="submit">
                Lagre navn
              </Action>
              <Action
                disabled={busy}
                onClick={(event) => {
                  event.currentTarget.form?.reset();
                  closeNameEditor();
                }}
                variant="secondary"
              >
                Avbryt
              </Action>
            </div>
          </form>
        </details>
      )}
    </div>
  );

  if (renderPanels) {
    return renderPanels(
      <RpgPanel aria-busy={busy} className="learning-group">
        {heading}
        {status}
        {signedOut ? (
          accountLink
        ) : (
          <div className="action-row">{readAction()}</div>
        )}
        {snapshot !== null && group === null && (
          <p>
            Du er ikke med i en Guild ennå. Du kan opprette eller bli med under
            Administrasjon.
          </p>
        )}
        {board}
      </RpgPanel>,
      <RpgPanel aria-busy={busy} className="learning-group">
        <h2 ref={administrationHeading} tabIndex={-1}>
          Administrasjon
        </h2>
        {status}
        {signedOut ? (
          accountLink
        ) : snapshot === null ? (
          <div className="action-row">{readAction(true)}</div>
        ) : (
          group !== null && <div className="action-row">{shareAction}</div>
        )}
        {enrolment}
        {membership}
      </RpgPanel>,
    );
  }

  return (
    <Card aria-busy={busy} className="learning-group">
      {heading}
      {status}
      {signedOut ? (
        accountLink
      ) : (
        <div className="action-row">
          {readAction()}
          {shareAction}
        </div>
      )}
      {enrolment}
      {board}
      {membership}
    </Card>
  );
}
