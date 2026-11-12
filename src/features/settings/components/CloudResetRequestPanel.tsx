import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { TextInput } from '@/components/ui/TextInput';
import type { CloudAccountPort } from '@/lib/cloud';

import {
  describePasswordResetRequestError,
  invalidResetAddress,
  isPlausibleEmail,
  passwordResetSent,
  resetRequestText,
  type Notice,
} from '../cloudModel';
import { CloudNotice } from './CloudNotice';

type CloudResetRequestPanelProps = {
  accountFirst?: boolean;
  account: Pick<CloudAccountPort, 'requestPasswordReset'>;
  email: string;
  onBack: () => void;
  onEmailChange: (email: string) => void;
  /** The request was made, or was answered as if it had been. */
  onSent: () => void;
  /** Show the answer instead of the form. */
  sent: boolean;
};

/**
 * Asking for a password reset link, from the signed-out Settings card. Opening
 * this view sends nothing; only "Send reset link" does, once. The answer is
 * the same whether or not the address has an account, so it cannot be used to
 * find out which addresses do (see describePasswordResetRequestError).
 */
export function CloudResetRequestPanel({
  account,
  accountFirst = false,
  email,
  onBack,
  onEmailChange,
  onSent,
  sent,
}: CloudResetRequestPanelProps) {
  const emailId = useId();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const title = accountFirst
    ? 'Tilbakestill passordet'
    : resetRequestText.title;
  const back = accountFirst ? 'Tilbake til innlogging' : resetRequestText.back;

  async function request() {
    if (busy) {
      return;
    }

    const address = email.trim();

    if (!isPlausibleEmail(address)) {
      setNotice(
        accountFirst
          ? { tone: 'danger', title: 'Sjekk e-postadressen', lines: [] }
          : invalidResetAddress,
      );
      return;
    }

    setBusy(true);
    setNotice(null);

    try {
      await account.requestPasswordReset(address);
      onSent();
    } catch (error) {
      const result = describePasswordResetRequestError(error);

      if (result.kind === 'sent') {
        onSent();
      } else {
        setNotice(
          accountFirst
            ? {
                tone: 'danger',
                title: 'Kunne ikke sende lenken',
                lines: ['Sjekk nettforbindelsen eller prøv igjen om litt.'],
              }
            : result.notice,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void request();
  }

  if (sent) {
    return (
      <div>
        <p className="backup-verify__title">{title}</p>
        <CloudNotice
          notice={
            accountFirst
              ? {
                  tone: 'success',
                  title: 'Sjekk e-posten din',
                  lines: [
                    'Hvis adressen har en konto, får du en lenke for å velge nytt passord.',
                  ],
                }
              : passwordResetSent
          }
        />
        <div className="action-row">
          <Button data-cloud-focus="" onClick={onBack} variant="secondary">
            {back}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="profile-form" noValidate onSubmit={handleSubmit}>
      <p className="backup-verify__title">{title}</p>
      <p className="card__description">
        {accountFirst
          ? 'Skriv inn e-postadressen du bruker i ProgressPal.'
          : resetRequestText.lead}
      </p>
      <FormField controlId={emailId} label={accountFirst ? 'E-post' : 'Email'}>
        {({ inputId }) => (
          <TextInput
            autoComplete="email"
            data-cloud-focus=""
            disabled={busy}
            id={inputId}
            inputMode="email"
            onChange={(event) => onEmailChange(event.target.value)}
            type="email"
            value={email}
          />
        )}
      </FormField>
      {notice ? <CloudNotice notice={notice} /> : null}
      <div className="action-row">
        <Button loading={busy} type="submit" variant="primary">
          {accountFirst ? 'Send lenke' : resetRequestText.send}
        </Button>
        <Button disabled={busy} onClick={onBack} variant="quiet">
          {back}
        </Button>
      </div>
    </form>
  );
}
