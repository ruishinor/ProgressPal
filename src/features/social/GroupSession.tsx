import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextInput } from '@/components/ui/TextInput';
import {
  getSocialGroup,
  type SocialCommand,
  type SocialFailure,
  type SocialResult,
} from '@/lib/cloud';
import { getOsloWeek } from '@/lib/time/osloWeek';

import { summarizeGroup } from './groupModel';
import type { useLearningWeek } from './useLearningWeek';

const failures: Record<SocialFailure, string> = {
  unauthenticated: 'Økten er utløpt. Logg inn på nytt i kontoinnstillingene.',
  'already-member':
    'Kontoen er allerede med i et lag. Hent laget for å fortsette.',
  'invalid-input': 'Sjekk lagnavn, kallenavn eller kode og prøv igjen.',
  'invalid-code': 'Koden er ugyldig eller ikke lenger aktiv. Be om en ny kode.',
  'group-full': 'Laget har åtte medlemmer og er fullt.',
  'no-group': 'Kontoen er ikke lenger med i laget. Hent laget på nytt.',
  'membership-changed':
    'Medlemskapet har endret seg. Hent laget på nytt før du deler eller gjør endringer.',
  'not-admin':
    'Den som styrer laget kan endre invitasjonskoden. Hent laget på nytt.',
  'invalid-days':
    'Delte dager må være fra inneværende uke i norsk tid. Sjekk klokken på enheten og hent laget på nytt.',
  unavailable:
    'Kunne ikke bekrefte resultatet. Hent laget på nytt når du er tilkoblet.',
  'rate-limited':
    'Tjenesten har fått mange forespørsler. Vent litt og hent laget på nytt.',
};

type Snapshot = Extract<SocialResult, { status: 'ok' }>;

type Props = {
  userId: string;
  settings: string;
  learning: ReturnType<typeof useLearningWeek>;
};

export function GroupSession({ userId, settings, learning }: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const active = useRef<AbortController | null>(null);
  const focus = useRef<HTMLHeadingElement>(null);
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
      focus.current?.focus();
    }
  }, [stage]);

  async function run(command: SocialCommand) {
    if (active.current !== null) return;
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
      }
      return;
    }

    if (
      result.group !== null &&
      result.weekStart !== getOsloWeek(new Date()).start
    ) {
      setSnapshot(null);
      setNotice(
        'Uken i laget avviker fra klokken på enheten. Sjekk klokken og hent laget på nytt.',
      );
      return;
    }
    setSnapshot(result);
    setConfirmLeave(false);
    if (command.operation === 'share') setNotice('Læringsdagene er delt.');
    if (command.operation === 'leave') setNotice('Du har forlatt laget.');
    if (command.operation === 'revoke')
      setNotice('Invitasjonskoden er deaktivert.');
  }

  function enrol(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const nickname = String(values.get('nickname') ?? '').trim();
    if (mode === 'create') {
      void run({
        operation: 'create',
        nickname,
        name: String(values.get('name') ?? '').trim(),
      });
    } else {
      void run({
        operation: 'join',
        nickname,
        code: String(values.get('code') ?? '')
          .trim()
          .toLowerCase(),
      });
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
  return (
    <Card aria-busy={busy} className="learning-group">
      <h2 ref={focus} tabIndex={-1}>
        {group?.name ?? 'Laget'}
      </h2>
      <p role="status">{busy ? 'Kontakter laget …' : notice}</p>
      {signedOut ? (
        <p>
          <Link to={settings + '#cloud-account'}>Åpne kontoinnstillinger</Link>
        </p>
      ) : (
        <div className="action-row">
          <Button
            disabled={busy}
            onClick={() => void run({ operation: 'read' })}
            variant="secondary"
          >
            {snapshot === null ? 'Hent laget' : 'Oppdater laget'}
          </Button>
          {group !== null && (
            <Button
              disabled={busy || !canShare}
              onClick={() => {
                if (
                  learning.days &&
                  learning.week.today === getOsloWeek(new Date()).today
                ) {
                  void run({
                    operation: 'share',
                    days: learning.days,
                    membership: group.membership,
                  });
                }
              }}
            >
              Del ukens læringsdager
            </Button>
          )}
        </div>
      )}
      {snapshot !== null && group === null && (
        <>
          <p>
            Ved å bli med deler du kallenavnet ditt med laget. Nhost lagrer
            medlemskapet og datoene du velger å dele. Lagkamerater ser kallenavn
            og antall dager denne uken.
          </p>
          <div className="action-row">
            <Button
              aria-pressed={mode === 'create'}
              disabled={busy}
              onClick={() => setMode('create')}
              variant="secondary"
            >
              Opprett et lag
            </Button>
            <Button
              aria-pressed={mode === 'join'}
              disabled={busy}
              onClick={() => setMode('join')}
              variant="secondary"
            >
              Bli med i et lag
            </Button>
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
                Lagnavn{' '}
                <TextInput
                  key="name"
                  autoComplete="off"
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
              <Button disabled={busy} type="submit">
                {mode === 'create' ? 'Opprett laget' : 'Bli med'}
              </Button>
            </div>
          </form>
        </>
      )}
      {group !== null && summary !== null && (
        <>
          <p>{group.members.length} av 8 plasser i bruk</p>
          <h3>Felles mål</h3>
          <p>
            {summary.total} av {summary.target} læringsdager delt. Målet følger
            størrelsen på laget, med to dager per medlem.
          </p>
          {summary.total >= summary.target && (
            <p>
              <strong>Laget nådde ukemålet!</strong>
            </p>
          )}
          {group.members.length > 1 ? (
            <>
              <h3>Ukas rangering</h3>
              <ul className="detail-list">
                {summary.ranking.map(
                  ({ nickname, rank, days, self }, index) => (
                    <li key={index}>
                      {rank}. {nickname}
                      {self ? ' (deg)' : ''} · {days}{' '}
                      {days === 1 ? 'dag' : 'dager'}
                    </li>
                  ),
                )}
              </ul>
            </>
          ) : (
            <p>Inviter noen du vil øve sammen med.</p>
          )}
          <p>
            Hver delt dag teller én gang, også fra flere enheter. Delte dager
            blir stående selv om du endrer registreringene dine. Del innen
            søndag i norsk tid.
          </p>
          {group.canInvite && (
            <>
              <h3>Invitasjon</h3>
              <p>
                Gi koden til dem du vil invitere. En ny kode erstatter den
                gamle.
              </p>
              <div className="action-row">
                <Button
                  disabled={busy || group.members.length >= 8}
                  onClick={() =>
                    void run({
                      operation: 'invite',
                      membership: group.membership,
                    })
                  }
                  variant="secondary"
                >
                  {group.hasInvite ? 'Lag ny kode' : 'Lag invitasjonskode'}
                </Button>
                {group.hasInvite && (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void run({
                        operation: 'revoke',
                        membership: group.membership,
                      })
                    }
                    variant="quiet"
                  >
                    Deaktiver koden
                  </Button>
                )}
              </div>
              {invite !== null && (
                <>
                  <label>
                    Invitasjonskode <TextInput readOnly value={invite} />
                  </label>
                  <div className="action-row">
                    <Button
                      disabled={busy}
                      onClick={() => void copyInvite(invite)}
                      variant="secondary"
                    >
                      Kopier invitasjonskode
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
          <details>
            <summary>Medlemskap og konto</summary>
            <p>
              Du kan forlate laget når du vil. Da fjernes medlemskapet og dagene
              du har delt.
            </p>
            <p>
              Øving lagres på enheten. Medlemskapet og de delte dagene ligger
              hos Nhost, også om du nullstiller appen eller gjenoppretter en
              sikkerhetskopi.
            </p>
            <p>
              <Link to={settings + '#cloud-account'}>
                Åpne kontoinnstillinger
              </Link>
            </p>
            {confirmLeave && (
              <p>Vil du fjerne medlemskapet og de delte dagene fra laget?</p>
            )}
            <div className="action-row">
              <Button
                disabled={busy}
                onClick={() => {
                  if (confirmLeave)
                    void run({
                      operation: 'leave',
                      membership: group.membership,
                    });
                  else setConfirmLeave(true);
                }}
                variant={confirmLeave ? 'danger' : 'secondary'}
              >
                {confirmLeave ? 'Ja, forlat laget' : 'Forlat laget'}
              </Button>
              {confirmLeave && (
                <Button
                  disabled={busy}
                  onClick={() => setConfirmLeave(false)}
                  variant="quiet"
                >
                  Avbryt
                </Button>
              )}
            </div>
          </details>
        </>
      )}
    </Card>
  );
}
