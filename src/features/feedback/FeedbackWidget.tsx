import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/Button';
import { version as appVersion } from '../../../package.json';

import {
  submitFeedback,
  type FeedbackCategory,
  type FeedbackResult,
  type TechnicalContext,
} from './transport';
import './feedback.css';

const categories: { value: FeedbackCategory; label: string }[] = [
  { value: 'technical', label: 'Teknisk feil' },
  { value: 'content', label: 'Feil i faginnhold' },
  { value: 'idea', label: 'Forbedringsforslag' },
  { value: 'other', label: 'Annet' },
];
type State = FeedbackResult['status'] | 'editing' | 'invalid_input' | 'submitting' | 'offline';

function makeId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 15) | 64;
  bytes[8] = ((bytes[8] ?? 0) & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

/** No full URL, path parameters, query strings or user/account data. */
function technicalContext(): TechnicalContext {
  const agent = navigator.userAgent;
  const path = window.location.pathname;
  const browser = /Edg\//.test(agent)
    ? 'Edge'
    : /Firefox\//.test(agent)
      ? 'Firefox'
      : /Chrome\//.test(agent)
        ? 'Chrome'
        : /Safari\//.test(agent)
          ? 'Safari'
          : 'Other';
  const os = /Android/.test(agent)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(agent)
      ? 'iOS'
      : /Windows/.test(agent)
        ? 'Windows'
        : /Macintosh|Mac OS/.test(agent)
          ? 'macOS'
          : /Linux/.test(agent)
            ? 'Linux'
            : 'Other';
  const page = /\/(resource|course)\//.test(path)
    ? 'lesson'
    : path.includes('pathways')
      ? 'pathways'
      : path.includes('guild') || path.includes('laeringslaget')
        ? 'guild'
        : path.includes('settings')
          ? 'settings'
          : path.includes('/micro') || path.includes('/track')
            ? 'microlearning'
            : path.includes('/map') || path.includes('/week')
              ? 'campaign'
              : path === '/' || path === '/rpg'
                ? 'home'
                : 'other';
  return { version: appVersion, browser, os, page };
}

function stateMessage(state: State) {
  switch (state) {
    case 'invalid_input':
    case 'invalid':
      return 'Sjekk beskrivelsen og e-postadressen før du sender.';
    case 'submitting':
      return 'Sender meldingen …';
    case 'uncertain':
      return 'Vi fikk ikke bekreftet at meldingen kom fram. Du kan prøve igjen uten å lage en ny melding.';
    case 'offline':
      return 'Du er frakoblet. Kopier gjerne meldingen, eller send når du har nett.';
    case 'rate_limited':
      return 'Det er for mange meldinger akkurat nå. Prøv igjen senere.';
    case 'unavailable':
      return 'Innsending er ikke tilgjengelig nå. Du kan kopiere meldingen.';
    case 'conflict':
      return 'Meldingen ble endret under et tidligere sendeforsøk. Endre teksten og prøv igjen.';
    default:
      return '';
  }
}

export function FeedbackWidget({
  compact = false,
  iconOnly = false,
}: {
  compact?: boolean;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>('technical');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [attach, setAttach] = useState(false);
  const [state, setState] = useState<State>('editing');
  const [receipt, setReceipt] = useState('');
  const [copyNotice, setCopyNotice] = useState('');
  const requestId = useRef<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const invalidMessage = state === 'invalid_input' &&
    (message.trim().length < 10 || message.trim().length > 4000);
  const invalidEmail = state === 'invalid_input' &&
    email.trim() !== '' &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      element.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
    } else if (!open && element.open) {
      element.close();
      trigger.current?.focus();
    }
  }, [open]);

  function changed() {
    requestId.current = null;
    setState('editing');
    setReceipt('');
    setCopyNotice('');
  }

  function close() {
    if (state !== 'submitting') setOpen(false);
  }

  function launch() {
    if (state === 'received') {
      setMessage('');
      setCategory('technical');
      setEmail('');
      setAttach(false);
      changed();
    }
    setOpen(true);
  }

  async function send() {
    if (state === 'submitting') return;
    if (message.trim().length < 10 || message.trim().length > 4000 ||
        email.trim().length > 254 ||
        (email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) {
      setState('invalid_input');
      return;
    }
    if (!navigator.onLine) {
      setState('offline');
      return;
    }
    if (!requestId.current) requestId.current = makeId();
    setState('submitting');
    const response = await submitFeedback({
      requestId: requestId.current,
      category,
      message: message.trim(),
      ...(email.trim() ? { replyEmail: email.trim() } : {}),
      ...(attach ? { technicalContext: technicalContext() } : {}),
    });
    setState(response.status);
    if (response.status === 'received') setReceipt(response.receipt);
  }

  async function copy() {
    const contents = [
      'Kategori: ' + (categories.find((entry) => entry.value === category)?.label ?? category),
      'Melding: ' + message.trim(),
      ...(email.trim() ? ['E-post for svar: ' + email.trim()] : []),
    ].join('\n\n');
    try {
      await navigator.clipboard.writeText(contents);
      setCopyNotice('Meldingen er kopiert.');
    } catch {
      setCopyNotice('Kunne ikke kopiere automatisk. Marker teksten i feltet og kopier.');
    }
  }

  const statusText = stateMessage(state);
  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label={iconOnly ? 'Meld feil eller gi innspill' : undefined}
        className="feedback-launcher"
        onClick={launch}
        ref={trigger}
        title="Meld feil eller gi innspill"
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
          <path d="M5 5.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-5 3v-3.5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7"/>
          <path d="M8 11.5h8M12 7.5v8" stroke="currentColor" strokeWidth="1.6"/>
        </svg>
        <span className={iconOnly ? 'sr-only' : undefined}>
          {compact ? 'Meld fra' : 'Meld feil / Gi innspill'}
        </span>
      </button>
      {createPortal(
        <dialog
          aria-labelledby={id + '-title'}
          aria-describedby={id + '-lead'}
          className="feedback-dialog"
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          ref={dialog}
        >
          <header className="feedback-dialog__header">
            <div>
              <h2 id={id + '-title'}>Hjelp oss å forbedre ProgressPal</h2>
              <p id={id + '-lead'}>Fant du noe som ikke virker, eller har du et forslag?</p>
            </div>
            <button aria-label="Lukk" className="feedback-dialog__close" onClick={close} type="button" disabled={state === 'submitting'}>×</button>
          </header>
          {state === 'received' ? (
            <div className="feedback-form">
              <p role="status">Meldingen er mottatt. Takk for at du sa fra.</p>
              <p className="feedback-dialog__receipt">Referanse: {receipt}</p>
              <Button onClick={close}>Lukk</Button>
            </div>
          ) : (
            <form className="feedback-form" noValidate onSubmit={(event) => { event.preventDefault(); void send(); }}>
              <fieldset className="feedback-categories" disabled={state === 'submitting'}>
                <legend>Hva gjelder det?</legend>
                <div className="feedback-categories__grid">
                  {categories.map((item) => (
                    <label className="feedback-category" key={item.value}>
                      <input
                        checked={category === item.value}
                        name={id + '-category'}
                        onChange={() => { setCategory(item.value); changed(); }}
                        type="radio"
                        value={item.value}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="feedback-field" htmlFor={id + '-message'}>
                <span>Hva vil du fortelle oss?</span>
              </label>
              <p className="feedback-help" id={id + '-hint'}>
                {category === 'content'
                  ? 'Hvilken leksjon eller oppgave gjelder det, og hva er feil?'
                  : category === 'technical'
                    ? 'Hva gjorde du, hva skjedde, og hva forventet du?'
                    : 'Fortell kort hva du ønsker å forbedre.'}
              </p>
              <textarea
                aria-describedby={id + '-hint' + (invalidMessage ? ' ' + id + '-message-error' : '')}
                aria-invalid={invalidMessage || undefined}
                className="feedback-textarea"
                disabled={state === 'submitting'}
                id={id + '-message'}
                maxLength={4000}
                onChange={(event) => { setMessage(event.target.value); changed(); }}
                rows={5}
                value={message}
              />
              {invalidMessage && <p className="feedback-error" id={id + '-message-error'}>Skriv minst 10 tegn.</p>}
              <label className="feedback-field" htmlFor={id + '-email'}>
                <span>E-postadresse for svar (valgfritt)</span>
              </label>
              <input
                aria-invalid={invalidEmail || undefined}
                aria-describedby={id + '-email-help'}
                className="feedback-input"
                disabled={state === 'submitting'}
                id={id + '-email'}
                maxLength={254}
                onChange={(event) => { setEmail(event.target.value); changed(); }}
                type="email"
                value={email}
              />
              <p className="feedback-help" id={id + '-email-help'}>Uten e-postadresse kan vi ikke svare deg direkte.</p>
              <label className="feedback-diagnostics">
                <input
                  checked={attach}
                  disabled={state === 'submitting'}
                  onChange={(event) => { setAttach(event.target.checked); changed(); }}
                  type="checkbox"
                />
                <span>Legg ved teknisk informasjon</span>
              </label>
              <p className="feedback-help">
                {attach
                  ? 'Legger ved appversjon, nettleser- og operativsystemtype og hvilken del av appen du bruker.'
                  : 'Teknisk informasjon sendes ikke uten ditt valg.'}
              </p>
              <p className="feedback-privacy">
                Beskrivelsen og eventuell e-postadresse sendes privat til den som vedlikeholder ProgressPal. Ikke skriv passord eller sensitiv informasjon. Studieprogresjon, svar og notater blir ikke lagt ved automatisk.
              </p>
              <p className="feedback-help">
                Gjelder det en sikkerhetssårbarhet? Ikke beskriv den her. Se <a href="https://github.com/ruishinor/ProgressPal/security/policy" rel="noreferrer noopener" target="_blank">prosjektets sikkerhetsrutine</a>.
              </p>
              {statusText ? <p aria-live="polite" className="feedback-status" role="status">{statusText}</p> : null}
              {copyNotice ? <p aria-live="polite" className="feedback-status" role="status">{copyNotice}</p> : null}
              <div className="feedback-actions">
                <Button onClick={() => { void copy(); }} type="button" variant="quiet" disabled={!message.trim() || state === 'submitting'}>Kopier melding</Button>
                <Button onClick={close} type="button" variant="secondary" disabled={state === 'submitting'}>Avbryt</Button>
                <Button disabled={state === 'submitting'} loading={state === 'submitting'} type="submit">Send inn</Button>
              </div>
            </form>
          )}
        </dialog>,
        document.body,
      )}
    </>
  );
}
