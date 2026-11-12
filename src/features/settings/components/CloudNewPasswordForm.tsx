import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { TextInput } from '@/components/ui/TextInput';
import {
  cloudPasswordMaxLength,
  cloudPasswordMinLength,
  type CloudAccountPort,
} from '@/lib/cloud';
import { accountSyncEnabled } from '@/lib/cloudSync/rollout';

import {
  checkNewPassword,
  describePasswordChangeFailure,
  newPasswordText,
  passwordChangedView,
  type CallbackView,
  type Notice,
} from '../cloudModel';
import { CloudNotice } from './CloudNotice';

type CloudNewPasswordFormProps = {
  account: Pick<CloudAccountPort, 'changePassword'>;
  /** The form is over: the change was acknowledged, or a refusal closed it. */
  onFinished: (view: CallbackView) => void;
};

/**
 * The new password, chosen after a reset link was exchanged. Shown only by the
 * callback page, only for a reset link. The change is reported only when the
 * provider acknowledged it; a refusal keeps the form (nothing changed), a doubt
 * is worded as a doubt, and neither entry outlives the attempt that used it.
 */
export function CloudNewPasswordForm({
  account,
  onFinished,
}: CloudNewPasswordFormProps) {
  const passwordId = useId();
  const confirmationId = useId();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function change() {
    if (busy) {
      return;
    }

    const problem = checkNewPassword(password, confirmation);

    if (problem !== null) {
      setNotice(
        accountSyncEnabled
          ? {
              tone: 'danger',
              title: 'Sjekk passordet',
              lines: ['Passordene må være like og ha riktig lengde.'],
            }
          : problem,
      );
      return;
    }

    setBusy(true);
    setNotice(null);

    try {
      await account.changePassword(password);
      onFinished(
        accountSyncEnabled
          ? {
              kind: 'done',
              tone: 'success',
              title: 'Passordet er endret',
              detail: 'Logg inn med det nye passordet.',
            }
          : passwordChangedView,
      );
    } catch (error) {
      const failure = describePasswordChangeFailure(error);

      if (failure.kind === 'closed') {
        onFinished(
          accountSyncEnabled
            ? {
                kind: 'done',
                tone: 'danger',
                title: 'Lenken kan ikke brukes',
                detail: 'Be om en ny lenke fra innloggingen.',
              }
            : failure.view,
        );
      } else {
        setNotice(
          accountSyncEnabled
            ? {
                tone: 'danger',
                title: 'Kunne ikke bekrefte passordendringen',
                lines: ['Sjekk nettforbindelsen og prøv igjen.'],
              }
            : failure.notice,
        );
      }
    } finally {
      // Neither entry is kept longer than the attempt that used it.
      setPassword('');
      setConfirmation('');
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void change();
  }

  return (
    <form className="profile-form" noValidate onSubmit={handleSubmit}>
      <FormField
        controlId={passwordId}
        description={
          accountSyncEnabled
            ? `${cloudPasswordMinLength} til ${cloudPasswordMaxLength} tegn.`
            : newPasswordText.hint
        }
        label={accountSyncEnabled ? 'Nytt passord' : newPasswordText.newLabel}
      >
        {({ describedBy, inputId }) => (
          <TextInput
            aria-describedby={describedBy}
            autoComplete="new-password"
            autoFocus
            disabled={busy}
            id={inputId}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        )}
      </FormField>
      <FormField
        controlId={confirmationId}
        label={
          accountSyncEnabled ? 'Gjenta passordet' : newPasswordText.confirmLabel
        }
      >
        {({ inputId }) => (
          <TextInput
            autoComplete="new-password"
            disabled={busy}
            id={inputId}
            onChange={(event) => setConfirmation(event.target.value)}
            type="password"
            value={confirmation}
          />
        )}
      </FormField>
      {notice ? <CloudNotice notice={notice} /> : null}
      <div className="action-row">
        <Button loading={busy} type="submit" variant="primary">
          {accountSyncEnabled ? 'Lagre nytt passord' : newPasswordText.submit}
        </Button>
      </div>
    </form>
  );
}
