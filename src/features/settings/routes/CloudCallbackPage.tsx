import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { getCloudAccount, type CloudAccountPort } from '@/lib/cloud';
import { rpgSettingsPath } from '@/lib/routing/rpgRoutePaths';

import { CloudNewPasswordForm } from '../components/CloudNewPasswordForm';
import {
  describeCallbackFailure,
  describeCallbackOutcome,
  newPasswordText,
  type CallbackView,
} from '../cloudModel';

type CallbackAccount = Pick<
  CloudAccountPort,
  'changePassword' | 'completeEmailLink' | 'getState'
>;

type CloudCallbackPageProps = {
  /** Test seam; the route renders it with nothing and gets the shared account. */
  account?: CallbackAccount;
};

function isSignedIn(account: CallbackAccount): boolean {
  try {
    return account.getState().status === 'signed-in';
  } catch {
    return false;
  }
}

/**
 * Where the provider's email link lands (`/cloud/callback`). It sits outside
 * both shells on purpose: a shell can redirect (to onboarding) before this
 * runs, and the one-time code must be consumed by exactly one thing.
 *
 * The page never reads the address itself. It asks the public account boundary
 * to complete the link, which reads the browser location once, removes every
 * callback-shaped parameter from it and only then exchanges what it removed.
 * Nothing the link carried is rendered, logged or kept in history, and every
 * result, good or bad, ends at the same destination: Settings.
 *
 * One kind of link needs more than a message: a password-reset link that was
 * really exchanged. The page then asks for the new password (and nothing else)
 * and reports a change only when the provider acknowledged it.
 */
export function CloudCallbackPage({ account }: CloudCallbackPageProps) {
  const [view, setView] = useState<CallbackView>({ kind: 'working' });
  const target = account ?? getCloudAccount();
  const main = useRef<HTMLElement>(null);
  // Held across React's development double-run of effects: a one-time code
  // must be exchanged once, not twice.
  const started = useRef(false);
  // True once the new-password form has ended with a result to announce.
  const afterForm = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;

    target.completeEmailLink().then(
      (outcome) =>
        setView(describeCallbackOutcome(outcome, isSignedIn(target))),
      (error: unknown) => setView(describeCallbackFailure(error)),
    );
  }, [target]);

  // The form that was pressed is replaced by its result: keyboard focus goes to
  // the top of the page, so the result is read first and Tab reaches its link.
  useEffect(() => {
    if (view.kind === 'done' && afterForm.current) {
      main.current?.focus();
    }
  }, [view]);

  function finish(next: CallbackView) {
    afterForm.current = true;
    setView(next);
  }

  return (
    <main
      className="shell-root shell-main"
      id="main-content"
      ref={main}
      tabIndex={-1}
    >
      <div className="shell-brand-block">
        <p className="shell-brand">ProgressPal</p>
        <h1 className="shell-title">Cloud sign-in</h1>
      </div>
      {view.kind === 'working' ? (
        <LoadingState description="Please wait." title="Finishing sign-in" />
      ) : view.kind === 'new-password' ? (
        <Card title={newPasswordText.title} titleAs="h2">
          <p className="card__description">{newPasswordText.lead}</p>
          <CloudNewPasswordForm account={target} onFinished={finish} />
          <div className="action-row">
            <Link
              className="button button--quiet button--md"
              replace
              to={rpgSettingsPath}
            >
              Open Settings
            </Link>
          </div>
        </Card>
      ) : (
        <Card
          role={view.tone === 'danger' ? 'alert' : 'status'}
          title={view.title}
          titleAs="h2"
          variant={
            view.tone === 'danger'
              ? 'danger'
              : view.tone === 'success'
                ? 'accent'
                : 'default'
          }
        >
          <p className="card__description">{view.detail}</p>
          <div className="action-row">
            <Link
              className="button button--primary button--md"
              replace
              to={rpgSettingsPath}
            >
              Open Settings
            </Link>
          </div>
        </Card>
      )}
    </main>
  );
}
