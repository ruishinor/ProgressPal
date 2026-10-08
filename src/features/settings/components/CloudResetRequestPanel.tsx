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
  email,
  onBack,
  onEmailChange,
  onSent,
  sent,
}: CloudResetRequestPanelProps) {
  const emailId = useId();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function request() {
    if (busy) {
      return;
    }

    const address = email.trim();

    if (!isPlausibleEmail(address)) {
      setNotice(invalidResetAddress);
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
        setNotice(result.notice);
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
        <p className="backup-verify__title">{resetRequestText.title}</p>
        <CloudNotice notice={passwordResetSent} />
        <div className="action-row">
          <Button data-cloud-focus="" onClick={onBack} variant="secondary">
            {resetRequestText.back}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="profile-form" noValidate onSubmit={handleSubmit}>
      <p className="backup-verify__title">{resetRequestText.title}</p>
      <p className="card__description">{resetRequestText.lead}</p>
      <FormField controlId={emailId} label="Email">
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
          {resetRequestText.send}
        </Button>
        <Button disabled={busy} onClick={onBack} variant="quiet">
          {resetRequestText.back}
        </Button>
      </div>
    </form>
  );
}
