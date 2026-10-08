import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

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

import {
  describeCloudError,
  resetRequestText,
  type Notice,
} from '../cloudModel';
import { CloudNotice } from './CloudNotice';
import { CloudResetRequestPanel } from './CloudResetRequestPanel';

type CloudSignInPanelProps = {
  account: Pick<
    CloudAccountPort,
    'requestPasswordReset' | 'setTrustedDevice' | 'signIn' | 'signUp'
  >;
  /** Re-read the account state after something changed it. */
  onChanged: () => void;
  onTurnOff: () => void;
};

type Attempt = 'sign-in' | 'create';

/** The sign-in form, asking for a reset link, and the answer to that request. */
type View = 'sign-in' | 'reset' | 'reset-sent';

/**
 * The signed-out state: email and password, an explicit "stay signed in on
 * this device" choice, sign-in, account creation, a way to ask for a password
 * reset link, and turning the feature off. Nothing here runs on its own; each
 * request is a button the learner pressed.
 */
export function CloudSignInPanel({
  account,
  onChanged,
  onTurnOff,
}: CloudSignInPanelProps) {
  const emailId = useId();
  const passwordId = useId();
  const root = useRef<HTMLDivElement>(null);
  const shownView = useRef<View>('sign-in');
  const [view, setView] = useState<View>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(
    () => readCloudPreferences().trustedDevice,
  );
  const [busy, setBusy] = useState<Attempt | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Moving between the sign-in form and the reset views replaces the control
  // that was pressed, so keyboard focus goes to the first control of the view
  // that appears instead of being lost.
  useEffect(() => {
    if (shownView.current === view) {
      return;
    }

    shownView.current = view;
    root.current?.querySelector<HTMLElement>('[data-cloud-focus]')?.focus();
  }, [view]);

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

  function askForResetLink() {
    // A reset has no use for the password typed for signing in.
    setPassword('');
    setNotice(null);
    setView('reset');
  }

  const working = busy !== null;

  return (
    <div ref={root}>
      {view === 'sign-in' ? (
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
            <Button
              disabled={working}
              onClick={askForResetLink}
              variant="quiet"
            >
              {resetRequestText.forgot}
            </Button>
            <Button disabled={working} onClick={onTurnOff} variant="quiet">
              Turn off cloud backup
            </Button>
          </div>
        </form>
      ) : (
        <CloudResetRequestPanel
          account={account}
          email={email}
          onBack={() => setView('sign-in')}
          onEmailChange={setEmail}
          onSent={() => setView('reset-sent')}
          sent={view === 'reset-sent'}
        />
      )}
    </div>
  );
}
