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

import { GuildCommons } from './GuildCommons';
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
    'Bare Guild-administratoren kan endre navnet eller deaktivere invitasjonskoden. Oppdater Guilden.',
  'invalid-days':
    'Delte dager må være fra inneværende uke i norsk tid. Sjekk klokken på enheten og oppdater Guilden.',
  unavailable:
    'Kunne ikke hente et gyldig svar fra Guild-tjenesten. Prøv igjen.',
  'rate-limited':
    'Tjenesten har fått mange forespørsler. Vent litt og oppdater Guilden.',
};

type Snapshot = Extract<SocialResult, { status: 'ok' }>;

type Props = {
  userId: string;
  settings: string;
  learning: ReturnType<typeof useLearningWeek>;
  onGuildName?: (userId: string, name: string | null) => void;
  onOpenAdministration?: () => void;
  renderPanels?: (
    guild: ReactNode,
    administration: ReactNode,
    share?: ReactNode,
  ) => ReactNode;
};

export function GroupSession({
  userId,
  settings,
  learning,
  onGuildName,
  onOpenAdministration,
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
      const retryableRead =
        command.operation === 'read' &&
        (result.status === 'unavailable' || result.status === 'rate-limited');
      if (
        !retryableRead &&
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
      onGuildName?.(userId, null);
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
  const status = (
    <p className="learning-group__status" role="status">
      {busy ? 'Jobber med Guild …' : notice}
    </p>
  );
  const accountLink = (
    <p>
      <Link to={settings + '#cloud-account'}>Åpne kontoinnstillinger</Link>
    </p>
  );
  const sharePrivacy = (
    <p>
      Guilden ser kallenavnet ditt og antall dager. Nhost lagrer datoene du
      deler. En delt dag teller én gang og blir stående selv om du endrer den
      lokale registreringen.
    </p>
  );
  const shareAction = group !== null && (canShare || !renderPanels) && (
    <Action
      disabled={busy || !canShare}
      onClick={() => {
        if (!learning.days) return;
        if (learning.week.today !== getOsloWeek(new Date()).today) {
          setNotice(
            'Datoen har endret seg. Last inn siden på nytt før du deler.',
          );
          return;
        }
        void run({
          operation: 'share',
          days: learning.days,
          membership: group.membership,
        });
      }}
    >
      Del ukens læringsdager
    </Action>
  );
  const enrolmentEntry = (
    <div className="action-row">
      <Action
        disabled={busy}
        onClick={() => {
          onOpenAdministration?.();
          if (snapshot === null) void run({ operation: 'read' }, true);
        }}
        variant="secondary"
      >
        Opprett eller bli med i Guild
      </Action>
    </div>
  );
  const enrolment = snapshot !== null && group === null && (
    <>
      <p>
        Når du melder deg inn i en Guild, deles kallenavnet ditt med andre i
        samme guild. Disse kan også se det du velger å dele av aktivitet. Nhost
        er leverandøren som brukes for å lagre opplysningene som trengs for å
        registrere, koble opp og synkronisere.
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
      <Progress
        className="learning-group__goal"
        label="Felles ukemål"
        helperText={`${summary.total} / ${summary.target} læringsdager`}
        max={summary.target}
        value={summary.total}
        tone={summary.total >= summary.target ? 'success' : undefined}
      />
      <h3 className="learning-group__members-title">Medlemmer</h3>
      <ul
        aria-label="Medlemmer"
        className="learning-group__members"
        role="list"
      >
        {summary.members.map(({ nickname, days, self }, index) => (
          <li key={index}>
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
      {import.meta.env.VITE_PROGRESSPAL_GUILD_COMMONS === 'true' && (
        <GuildCommons
          key={group.membership}
          membership={group.membership}
          userId={userId}
          rpg={Boolean(renderPanels)}
          onMembershipChanged={() => void run({ operation: 'read' })}
        />
      )}
    </>
  );
  const membership = group !== null && (
    <>
      {(group.canInvite || group.isAdmin) && (
        <>
          <h3>Invitasjon</h3>
          <p>
            Gi koden til dem du vil invitere. En ny kode erstatter den gamle.
          </p>
          <div className="action-row">
            {group.canInvite && (
              <Action
                disabled={busy}
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
            )}
            {group.isAdmin && group.hasInvite && (
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
          Du kan forlate Guilden når du vil. Da fjernes medlemsregistreringen
          din og dagene du har delt.
        </p>
        <p>
          Når du melder deg ut av guilden fjernes også de dataene du har valgt å
          dele.
        </p>
        <p>
          Mens aktiv deling slettes, kan det likevel forekomme at tidligere
          registrerte opplysninger beholdes i databasen hos Nhost, også om du
          nullstiller appen eller gjenoppretter fra en tidligere sikkerhetskopi.
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
      <div className="learning-group__identity">
        {group && <p className="learning-group__eyebrow">Guild</p>}
        <h2 ref={focus} tabIndex={-1}>
          {group?.name ?? 'Guild'}
        </h2>
        {group && <p>{group.members.length} av 8 medlemmer</p>}
      </div>
      {!signedOut && (
        <button
          aria-disabled={busy}
          aria-label="Oppdater Guild"
          className="learning-group__refresh"
          onClick={() => void run({ operation: 'read' })}
          type="button"
        >
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path
              d="M20 11a8 8 0 1 0-2 6m2-11v5h-5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      {group?.isAdmin && (
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
      <RpgPanel className="learning-group">
        {heading}
        {status}
        {signedOut
          ? accountLink
          : group === null && (
              <>
                {snapshot !== null && <p>Du er ikke med i en Guild ennå.</p>}
                {enrolmentEntry}
              </>
            )}
        {board}
      </RpgPanel>,
      <RpgPanel className="learning-group">
        <h2 ref={administrationHeading} tabIndex={-1}>
          Administrasjon
        </h2>
        {status}
        {signedOut ? (
          accountLink
        ) : snapshot === null ? (
          <div className="action-row">
            <Action
              disabled={busy}
              onClick={() => void run({ operation: 'read' }, true)}
              variant="secondary"
            >
              Hent medlemskap
            </Action>
          </div>
        ) : null}
        {enrolment}
        {membership}
      </RpgPanel>,
      <>
        {shareAction && (
          <div className="learning-group__share">
            {sharePrivacy}
            {shareAction}
          </div>
        )}
        {canShare && snapshot === null && !signedOut && (
          <p>Hent medlemskapet i Guild-fanen for å dele læringsdagene dine.</p>
        )}
        {status}
      </>,
    );
  }

  return (
    <Card className="learning-group">
      {heading}
      {status}
      {!signedOut && snapshot === null && enrolmentEntry}
      {signedOut
        ? accountLink
        : shareAction && (
            <div className="learning-group__share">
              {sharePrivacy}
              {shareAction}
            </div>
          )}
      {enrolment}
      {board}
      {membership}
    </Card>
  );
}
