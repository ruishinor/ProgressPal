import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { TextInput } from '@/components/ui/TextInput';
import type { CloudAccountPort } from '@/lib/cloud';

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
      setNotice(problem);
      return;
    }

    setBusy(true);
    setNotice(null);

    try {
      await account.changePassword(password);
      onFinished(passwordChangedView);
    } catch (error) {
      const failure = describePasswordChangeFailure(error);

      if (failure.kind === 'closed') {
        onFinished(failure.view);
      } else {
        setNotice(failure.notice);
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
        description={newPasswordText.hint}
        label={newPasswordText.newLabel}
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
        label={newPasswordText.confirmLabel}
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
          {newPasswordText.submit}
        </Button>
      </div>
    </form>
  );
}
