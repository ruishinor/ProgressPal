import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { RpgButton } from '@/features/rpg/components/RpgButton';
import {
  getGuildCommons,
  type GuildCommonsCommand,
  type GuildCommonsFailure,
  type GuildCommonsGroup,
  type GuildNoteKind,
} from '@/lib/cloud';

import './guildCommons.css';

const noteLabels: Record<GuildNoteKind, string> = {
  help: 'Trenger hjelp',
  offer: 'Kan hjelpe',
  notice: 'Beskjed',
  win: 'Liten seier',
};

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
  const current = useRef<AbortController | null>(null);
  const Action = rpg ? RpgButton : Button;

  useEffect(() => () => current.current?.abort(), []);

  function close() {
    current.current?.abort();
    current.current = null;
    setOpened(false);
    setGroup(null);
    setNotice('');
    setBusy(false);
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
    if (command.operation === 'profile') setNotice('Guild-profilen er lagret.');
    if (command.operation === 'post') setNotice('Oppslaget er delt.');
    if (command.operation === 'edit') setNotice('Oppslaget er oppdatert.');
    if (command.operation === 'remove') setNotice('Oppslaget er fjernet.');
    if (command.operation === 'resolve')
      setNotice('Hjelpeforespørselen er avsluttet.');
    if (command.operation === 'transfer') {
      setNotice(
        'Administratorrollen er overført. Invitasjonskoden er deaktivert.',
      );
      onMembershipChanged();
    }
  }

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run({
      operation: 'profile',
      membership,
      ethos: String(data.get('ethos') ?? ''),
      about: String(data.get('about') ?? ''),
    });
  }

  function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const kind = String(data.get('kind') ?? '') as GuildNoteKind;
    if (!(kind in noteLabels)) return;
    void run({
      operation: 'post',
      membership,
      kind,
      body: String(data.get('body') ?? '').trim(),
    });
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

  return (
    <section aria-label="Guild-fellesrom" className="guild-commons">
      <div className="guild-commons__heading">
        <h3>Guild-fellesrom</h3>
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
              <details>
                <summary>Rediger Guild-profil</summary>
                <form
                  className="profile-form"
                  key={group.ethos + group.about}
                  onSubmit={submitProfile}
                >
                  <label>
                    Guildens motto
                    <input
                      defaultValue={group.ethos}
                      maxLength={120}
                      name="ethos"
                      type="text"
                    />
                  </label>
                  <label>
                    Om Guilden
                    <textarea
                      className="guild-commons__textarea"
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
                    <strong>{noteLabels[entry.kind]}</strong> · {entry.author}
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
                    <details>
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
                            body: String(data.get('body') ?? '').trim(),
                          });
                        }}
                      >
                        <label>
                          Oppslagstekst
                          <textarea
                            className="guild-commons__textarea"
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
                    <select name="kind">
                      {Object.entries(noteLabels).map(([kind, label]) => (
                        <option key={kind} value={kind}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Beskjed
                    <textarea
                      className="guild-commons__textarea"
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
          {group.isAdmin && group.members.length > 1 && (
            <details>
              <summary>Overfør administratorrollen</summary>
              <p>
                Velg en annen deltaker. Administratorrettighetene overføres, og
                en aktiv invitasjonskode deaktiveres. Guilden beholder sitt navn
                og innhold.
              </p>
              <form
                className="profile-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const target = String(data.get('target') ?? '');
                  if (target)
                    void run({ operation: 'transfer', membership, target });
                }}
              >
                <label>
                  Ny administrator
                  <select name="target" required>
                    {group.members
                      .filter((entry) => !entry.self)
                      .map((entry) => (
                        <option key={entry.membership} value={entry.membership}>
                          {entry.nickname}
                        </option>
                      ))}
                  </select>
                </label>
                <Action disabled={busy} type="submit">
                  Bekreft overføring
                </Action>
              </form>
            </details>
          )}
        </>
      )}
    </section>
  );
}
