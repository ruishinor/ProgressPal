import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/ui/FormField';
import { TextInput } from '@/components/ui/TextInput';
import {
  cloudPasswordMaxLength,
  cloudPasswordMinLength,
  readCloudPreferences,
  type CloudAccountPort,
} from '@/lib/cloud';

import { describeCloudError, type Notice } from '../cloudModel';
import { CloudNotice } from './CloudNotice';

type CloudSignInPanelProps = {
  account: Pick<CloudAccountPort, 'signIn' | 'signUp' | 'setTrustedDevice'>;
  /** Re-read the account state after something changed it. */
  onChanged: () => void;
  onTurnOff: () => void;
};

type Attempt = 'sign-in' | 'create';

/**
 * The signed-out state: email and password, an explicit "stay signed in on
 * this device" choice, sign-in, account creation and turning the feature off.
 * Nothing here runs on its own; each request is a button the learner pressed.
 */
export function CloudSignInPanel({
  account,
  onChanged,
  onTurnOff,
}: CloudSignInPanelProps) {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(
    () => readCloudPreferences().trustedDevice,
  );
  const [busy, setBusy] = useState<Attempt | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function attempt(kind: Attempt) {
    const address = email.trim();

    if (address === '' || password === '') {
      setNotice({
        tone: 'danger',
        title: kind === 'sign-in' ? 'Not signed in' : 'Account not created',
        lines: ['Enter an email address and a password.'],
      });
      return;
    }

    if (
      kind === 'create' &&
      (password.length < cloudPasswordMinLength ||
        password.length > cloudPasswordMaxLength)
    ) {
      setNotice({
        tone: 'danger',
        title: 'Account not created',
        lines: [
          `Passwords are ${cloudPasswordMinLength} to ${cloudPasswordMaxLength} characters.`,
        ],
      });
      return;
    }

    setBusy(kind);
    setNotice(null);

    try {
      if (stayLoggedIn !== readCloudPreferences().trustedDevice) {
        account.setTrustedDevice(stayLoggedIn);
      }

      if (kind === 'sign-in') {
        await account.signIn({ email: address, password });
      } else {
        const result = await account.signUp({ email: address, password });

        if (result.kind === 'verification-required') {
          setNotice({
            tone: 'success',
            title: 'Check your email',
            lines: [
              'Open the link in the message to verify the address, then sign in here.',
            ],
          });
        }
      }

      onChanged();
    } catch (error) {
      setNotice({
        tone: 'danger',
        title: kind === 'sign-in' ? 'Not signed in' : 'Account not created',
        lines: [describeCloudError(error)],
      });
    } finally {
      // The password is never kept longer than the attempt that used it.
      setPassword('');
      setBusy(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void attempt('sign-in');
  }

  const working = busy !== null;

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      <FormField controlId={emailId} label="Email">
        {({ inputId }) => (
          <TextInput
            autoComplete="username"
            data-cloud-focus=""
            disabled={working}
            id={inputId}
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        )}
      </FormField>
      <FormField
        controlId={passwordId}
        description={`${cloudPasswordMinLength} to ${cloudPasswordMaxLength} characters.`}
        label="Password"
      >
        {({ describedBy, inputId }) => (
          <TextInput
            aria-describedby={describedBy}
            autoComplete="current-password"
            disabled={working}
            id={inputId}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        )}
      </FormField>
      <Checkbox
        checked={stayLoggedIn}
        description="Keeps the sign-in after this tab closes. Off by default."
        disabled={working}
        label="Stay signed in on this device"
        onChange={(event) => setStayLoggedIn(event.target.checked)}
      />
      {notice ? <CloudNotice notice={notice} /> : null}
      <div className="action-row">
        <Button
          disabled={working}
          loading={busy === 'sign-in'}
          type="submit"
          variant="primary"
        >
          Sign in
        </Button>
        <Button
          disabled={working}
          loading={busy === 'create'}
          onClick={() => {
            void attempt('create');
          }}
          variant="secondary"
        >
          Create account
        </Button>
        <Button disabled={working} onClick={onTurnOff} variant="quiet">
          Turn off cloud backup
        </Button>
      </div>
    </form>
  );
}
