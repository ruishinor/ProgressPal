import { useEffect, useState, type PropsWithChildren } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CloudSignInPanel } from '@/features/settings';
import { useAppState } from '@/lib/appState';
import {
  CloudError,
  getCloudAccount,
  readCloudPreferences,
  writeCloudPreferences,
} from '@/lib/cloud';
import { readSyncBinding, type SyncBinding } from '@/lib/cloudSync/binding';
import { accountSyncEnabled } from '@/lib/cloudSync/rollout';
import type { SyncCatalogue } from '@/lib/cloudSync/snapshot';

import { LearningSyncContext } from './learningSyncContext';
import { LearningSyncStatus } from './LearningSyncStatus';
import { resolveSyncCatalogue } from './programmeComposition';
import { useLearningSync } from './useLearningSync';

const consentKey = 'progresspal:sync:consent-v1';

function hasConsent() {
  try {
    return localStorage.getItem(consentKey) === 'true';
  } catch {
    return false;
  }
}

function enableAuth() {
  const preferences = readCloudPreferences();
  if (
    !preferences.enabled &&
    !writeCloudPreferences({ ...preferences, enabled: true })
  ) {
    throw new CloudError('unavailable', 'Browser storage is unavailable');
  }
}

function grantConsent() {
  enableAuth();
  localStorage.setItem(consentKey, 'true');
}

export function AccountSyncGate({ children }: PropsWithChildren) {
  const account = getCloudAccount();
  const [catalogue] = useState<SyncCatalogue>(resolveSyncCatalogue);
  const [auth, setAuth] = useState(account.getState);
  const [consented, setConsented] = useState(hasConsent);
  const [consentError, setConsentError] = useState(false);
  const { status } = useAppState();
  const userId = auth.status === 'signed-in' ? auth.userId : null;
  let binding: SyncBinding | null = null;
  let bindingUnreadable = false;
  try {
    binding = readSyncBinding(localStorage);
  } catch {
    bindingUnreadable = true;
  }
  const wrongAccount =
    binding !== null && userId !== null && binding.userId !== userId;
  const canSync =
    consented && accountSyncEnabled && !bindingUnreadable && !wrongAccount;
  const sync = useLearningSync(canSync ? userId : null, catalogue);

  useEffect(() => {
    function readAccount() {
      setAuth(account.getState());
      setConsented(hasConsent());
    }
    const unsubscribe = account.subscribe(readAccount);
    window.addEventListener('storage', readAccount);
    window.addEventListener('pageshow', readAccount);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', readAccount);
      window.removeEventListener('pageshow', readAccount);
    };
  }, [account]);

  if (
    userId !== null &&
    binding?.userId === userId &&
    binding.initialized &&
    (consented || !accountSyncEnabled)
  ) {
    return (
      <LearningSyncContext.Provider value={accountSyncEnabled ? sync : null}>
        {children}
      </LearningSyncContext.Provider>
    );
  }

  function refreshAccount() {
    setAuth(account.getState());
    setConsented(hasConsent());
  }

  const gateView = bindingUnreadable
    ? ({ status: 'device-unreadable' } as const)
    : wrongAccount
      ? ({ status: 'different-account' } as const)
      : !accountSyncEnabled
        ? ({ status: 'disabled' } as const)
        : sync.view;

  return (
    <main
      className="shell-root shell-main account-entry"
      id="main-content"
      lang="nb"
    >
      <div className="shell-brand-block">
        <h1 className="shell-title">Velkommen til ProgressPal</h1>
      </div>
      {userId === null ||
      (accountSyncEnabled &&
        !consented &&
        !wrongAccount &&
        !bindingUnreadable) ? (
        <Card title="Kontoen din" titleAs="h2">
          <div className="card__body">
            <p className="card__description">
              {accountSyncEnabled
                ? 'Når du logger inn, lagres studieaktiviteten på denne enheten og synkroniseres automatisk med kontoen din når du er på nett. Da kan du fortsette på en annen enhet. Tjenesteleverandøren og den som drifter ProgressPal kan lese dataene som lagres på serveren.'
                : 'Logg inn med kontoen som er knyttet til studiedataene i denne nettleseren. Automatisk synkronisering er slått av i denne versjonen.'}
            </p>
            {userId === null ? (
              <CloudSignInPanel
                account={{
                  signIn: async (credentials) => {
                    grantConsent();
                    await account.signIn(credentials);
                  },
                  signUp: async (credentials) => {
                    grantConsent();
                    return account.signUp(credentials);
                  },
                  setTrustedDevice: (trusted) => {
                    enableAuth();
                    account.setTrustedDevice(trusted);
                  },
                  requestPasswordReset: async (email) => {
                    enableAuth();
                    await account.requestPasswordReset(email);
                  },
                }}
                accountFirst
                onChanged={refreshAccount}
              />
            ) : (
              <>
                {consentError && (
                  <p role="alert">Nettleseren kunne ikke lagre valget.</p>
                )}
                <div className="action-row">
                  <Button
                    onClick={() => {
                      try {
                        grantConsent();
                        refreshAccount();
                      } catch {
                        setConsentError(true);
                      }
                    }}
                  >
                    Ta i bruk synkronisering
                  </Button>
                  <Button
                    variant="quiet"
                    onClick={() => void account.signOut()}
                  >
                    Logg ut
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      ) : (
        <Card title="Studiedata" titleAs="h2">
          {status === 'error' && (
            <p role="alert">Kunne ikke åpne dataene på denne enheten.</p>
          )}
          <LearningSyncContext.Provider value={{ ...sync, view: gateView }}>
            <LearningSyncStatus />
          </LearningSyncContext.Provider>
          <div className="action-row">
            <Button variant="quiet" onClick={() => void account.signOut()}>
              Logg ut
            </Button>
          </div>
        </Card>
      )}
    </main>
  );
}
