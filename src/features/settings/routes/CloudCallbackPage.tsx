import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { getCloudAccount, type CloudAccountPort } from '@/lib/cloud';
import { rpgSettingsPath } from '@/lib/routing/rpgRoutePaths';

import {
  describeCallbackFailure,
  describeCallbackOutcome,
  type CallbackView,
} from '../cloudModel';

type CallbackAccount = Pick<CloudAccountPort, 'completeEmailLink' | 'getState'>;

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
 */
export function CloudCallbackPage({ account }: CloudCallbackPageProps) {
  const [view, setView] = useState<CallbackView>({ kind: 'working' });
  // Held across React's development double-run of effects: a one-time code
  // must be exchanged once, not twice.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;

    const target = account ?? getCloudAccount();

    target.completeEmailLink().then(
      (outcome) =>
        setView(describeCallbackOutcome(outcome, isSignedIn(target))),
      (error: unknown) => setView(describeCallbackFailure(error)),
    );
  }, [account]);

  return (
    <main className="shell-root shell-main" id="main-content" tabIndex={-1}>
      <div className="shell-brand-block">
        <p className="shell-brand">ProgressPal</p>
        <h1 className="shell-title">Cloud sign-in</h1>
      </div>
      {view.kind === 'working' ? (
        <LoadingState description="Please wait." title="Finishing sign-in" />
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
