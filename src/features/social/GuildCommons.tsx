import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { TextInput } from '@/components/ui/TextInput';
import { RpgButton } from '@/features/rpg/components/RpgButton';
import {
  getGuildCommons,
  type GuildCommonsCommand,
  type GuildCommonsFailure,
  type GuildCommonsGroup,
  type GuildNoteKind,
} from '@/lib/cloud';
import { formatCalendarDay, osloDate } from '@/lib/time/osloWeek';

import './guildCommons.css';

const noteLabels: Record<GuildNoteKind, string> = {
  help: 'Trenger hjelp',
  offer: 'Kan hjelpe',
  notice: 'Beskjed',
  win: 'Liten seier',
};

const noteOptions = Object.entries(noteLabels).map(([value, label]) => ({
  value,
  label,
}));

const failureLabels: Record<GuildCommonsFailure, string> = {
  unauthenticated: 'Logg inn på nytt og åpne Guilden igjen.',
  'membership-changed': 'Medlemskapet har endret seg. Oppdater Guilden.',
  'no-group': 'Du er ikke lenger med i denne Guilden.',
  'not-admin': 'Bare administratoren kan gjøre denne endringen.',
  'not-owner': 'Du kan bare redigere dine egne oppslag.',
  'not-found': 'Oppslaget eller medlemmet finnes ikke lenger.',
  'invalid-input': 'Sjekk innholdet og prøv igjen.',
  'already-posted':
    'Du har allerede ett aktivt oppslag. Fjern det før du legger til et nytt.',
  full: 'Alle tre oppslagsplassene er brukt. Prøv igjen senere.',
  'rate-limited': 'Vent litt før du legger ut et nytt oppslag.',
  unavailable:
    'Guild-fellesrommet er ikke tilgjengelig akkurat nå. Prøv igjen senere.',
};

const successLabels: Partial<Record<GuildCommonsCommand['operation'], string>> =
  {
    profile: 'Guild-profilen er lagret.',
    post: 'Oppslaget er delt.',
    edit: 'Oppslaget er oppdatert.',
    remove: 'Oppslaget er fjernet.',
    resolve: 'Hjelpeforespørselen er avsluttet.',
    transfer:
      'Administratorrollen er overført. Invitasjonskoden er deaktivert.',
  };

/** Browsers may submit textarea line breaks as CRLF; the server accepts LF only. */
function text(data: FormData, name: string) {
  return String(data.get(name) ?? '')
    .replace(/\r\n?/g, '\n')
    .trim();
}

function isNoteKind(value: string): value is GuildNoteKind {
  return Object.hasOwn(noteLabels, value);
}

type Props = {
  membership: string;
  userId: string;
  rpg: boolean;
  onMembershipChanged: () => void;
};

export function GuildCommons({
  membership,
  userId,
  rpg,
  onMembershipChanged,
}: Props) {
  const [opened, setOpened] = useState(false);
  const [group, setGroup] = useState<GuildCommonsGroup | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const current = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const Action = rpg ? RpgButton : Button;

  useEffect(() => () => current.current?.abort(), []);

  function close() {
    current.current?.abort();
    current.current = null;
    setOpened(false);
    setGroup(null);
    setNotice('');
    setBusy(false);
    setConfirmTransfer(false);
  }

  async function run(command: GuildCommonsCommand) {
    if (current.current !== null) return;
    const controller = new AbortController();
    current.current = controller;
    setBusy(true);
    setNotice('');
    let result: Awaited<
      ReturnType<ReturnType<typeof getGuildCommons>['execute']>
    >;
    try {
      result = await getGuildCommons().execute(
        command,
        userId,
        AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
      );
    } catch {
      result = { status: 'unavailable' };
    }
    if (controller.signal.aborted) return;
    current.current = null;
    setBusy(false);
    setConfirmTransfer(false);
    if (result.status !== 'ok') {
      setNotice(failureLabels[result.status]);
      if (
        result.status === 'unauthenticated' ||
        result.status === 'membership-changed' ||
        result.status === 'no-group'
      )
        setGroup(null);
      return;
    }
    setGroup(result.group);
    const success = successLabels[command.operation];
    if (success === undefined) return;
    setNotice(success);
    // The control that started the change is disabled or removed meanwhile.
    heading.current?.focus();
    if (command.operation === 'transfer') onMembershipChanged();
  }

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run({
      operation: 'profile',
      membership,
      ethos: text(data, 'ethos'),
      about: text(data, 'about'),
    });
  }

  function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const kind = String(data.get('kind') ?? '');
    if (!isNoteKind(kind)) return;
    void run({ operation: 'post', membership, kind, body: text(data, 'body') });
  }

  if (!opened) {
    return (
      <div className="guild-commons__entry">
        <Action
          disabled={busy}
          onClick={() => {
            setOpened(true);
            void run({ operation: 'read', membership });
          }}
          variant="secondary"
        >
          Åpne Guild-fellesrom
        </Action>
      </div>
    );
  }

  const hasOwnNote = group?.notes.some((entry) => entry.own) ?? false;
  const canPost = group !== null && group.notes.length < 3 && !hasOwnNote;
  const others = group?.members.filter((entry) => !entry.self) ?? [];

  return (
    <section aria-label="Guild-fellesrom" className="guild-commons">
      <div className="guild-commons__heading">
        <h3 ref={heading} tabIndex={-1}>
          Guild-fellesrom
        </h3>
        <div className="action-row">
          <Action
            disabled={busy}
            onClick={() => void run({ operation: 'read', membership })}
            variant="secondary"
          >
            Oppdater fellesrom
          </Action>
          <Action onClick={close} variant="quiet">
            Lukk
          </Action>
        </div>
      </div>
      <p role="status">{busy ? 'Henter Guild-fellesrom …' : notice}</p>
      {group !== null && (
        <>
          <section aria-label="Om Guilden">
            <h4>Om Guilden</h4>
            {group.ethos && (
              <p className="guild-commons__ethos">{group.ethos}</p>
            )}
            <p className="guild-commons__copy">
              {group.about || 'Guilden har ikke skrevet noe om seg selv ennå.'}
            </p>
            {group.isAdmin && (
              <details key={group.ethos + '\u0000' + group.about}>
                <summary>Rediger Guild-profil</summary>
                <form className="profile-form" onSubmit={submitProfile}>
                  <label>
                    Guildens motto
                    <TextInput
                      defaultValue={group.ethos}
                      maxLength={120}
                      name="ethos"
                    />
                  </label>
                  <label>
                    Om Guilden
                    <TextArea
                      defaultValue={group.about}
                      maxLength={600}
                      name="about"
                      rows={3}
                    />
                  </label>
                  <Action disabled={busy} type="submit">
                    Lagre Guild-profil
                  </Action>
                </form>
              </details>
            )}
          </section>
          <section aria-label="Guild-oppslag">
            <h4>Guild-oppslag ({group.notes.length} av 3)</h4>
            <p className="guild-commons__hint">
              Korte beskjeder og spørsmål for medlemmer. Oppslag vises i inntil
              sju dager. Ikke del passord, personopplysninger eller privat kode.
            </p>
            {group.notes.length === 0 && <p>Ingen oppslag ennå.</p>}
            <ul className="guild-commons__notes">
              {group.notes.map((entry) => (
                <li className="guild-commons__note" key={entry.id}>
                  <p>
                    <strong>{noteLabels[entry.kind]}</strong> · {entry.author} ·{' '}
                    <time dateTime={entry.createdAt}>
                      {formatCalendarDay(osloDate(new Date(entry.createdAt)))}
                    </time>
                  </p>
                  <p className="guild-commons__copy">{entry.body}</p>
                  {entry.canRemove && (
                    <div className="action-row">
                      {entry.own && entry.kind === 'help' && (
                        <Action
                          disabled={busy}
                          onClick={() =>
                            void run({
                              operation: 'resolve',
                              membership,
                              note: entry.id,
                            })
                          }
                          variant="secondary"
                        >
                          Marker som løst
                        </Action>
                      )}
                      <Action
                        disabled={busy}
                        onClick={() =>
                          void run({
                            operation: 'remove',
                            membership,
                            note: entry.id,
                          })
                        }
                        variant="quiet"
                      >
                        Fjern
                      </Action>
                    </div>
                  )}
                  {entry.own && (
                    <details key={entry.body}>
                      <summary>Rediger oppslaget</summary>
                      <form
                        className="profile-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const data = new FormData(event.currentTarget);
                          void run({
                            operation: 'edit',
                            membership,
                            note: entry.id,
                            body: text(data, 'body'),
                          });
                        }}
                      >
                        <label>
                          Oppslagstekst
                          <TextArea
                            defaultValue={entry.body}
                            maxLength={280}
                            minLength={1}
                            name="body"
                            required
                            rows={3}
                          />
                        </label>
                        <Action disabled={busy} type="submit">
                          Lagre oppslag
                        </Action>
                      </form>
                    </details>
                  )}
                </li>
              ))}
            </ul>
            {canPost && (
              <details>
                <summary>Skriv et oppslag</summary>
                <form className="profile-form" onSubmit={submitPost}>
                  <label>
                    Type oppslag
                    <Select name="kind" options={noteOptions} />
                  </label>
                  <label>
                    Beskjed
                    <TextArea
                      maxLength={280}
                      minLength={1}
                      name="body"
                      required
                      rows={3}
                    />
                  </label>
                  <Action disabled={busy} type="submit">
                    Del oppslag
                  </Action>
                </form>
              </details>
            )}
            {!canPost && (
              <p className="guild-commons__hint">
                {hasOwnNote
                  ? 'Du kan ha ett aktivt oppslag av gangen.'
                  : 'Alle tre oppslagsplassene er i bruk.'}
              </p>
            )}
          </section>
          {group.isAdmin && others.length > 0 && (
            <details>
              <summary>Overfør administratorrollen</summary>
              <p>
                Velg en annen deltaker. Administratorrettighetene overføres, og
                en aktiv invitasjonskode deaktiveres. Guilden beholder navnet og
                innholdet sitt.
              </p>
              <form
                className="profile-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!confirmTransfer) {
                    setConfirmTransfer(true);
                    return;
                  }
                  const target = String(
                    new FormData(event.currentTarget).get('target') ?? '',
                  );
                  if (target)
                    void run({ operation: 'transfer', membership, target });
                }}
              >
                <label>
                  Ny administrator
                  <Select
                    name="target"
                    onChange={() => setConfirmTransfer(false)}
                    options={others.map((entry) => ({
                      value: entry.membership,
                      label: entry.nickname,
                    }))}
                    required
                  />
                </label>
                {confirmTransfer && (
                  <p>Du kan ikke angre dette selv. Vil du overføre rollen?</p>
                )}
                <div className="action-row">
                  <Action
                    disabled={busy}
                    type="submit"
                    variant={confirmTransfer ? 'danger' : 'secondary'}
                  >
                    {confirmTransfer
                      ? 'Ja, overfør administratorrollen'
                      : 'Gå videre'}
                  </Action>
                  {confirmTransfer && (
                    <Action
                      disabled={busy}
                      onClick={() => setConfirmTransfer(false)}
                      variant="quiet"
                    >
                      Avbryt
                    </Action>
                  )}
                </div>
              </form>
            </details>
          )}
        </>
      )}
    </section>
  );
}
