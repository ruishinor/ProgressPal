import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  getCloudAccount,
  readCloudPreferences,
  writeCloudPreferences,
  type CloudAccountPort,
  type CloudAccountState,
  type CloudSignOutResult,
} from '@/lib/cloud';
import { rpgRoutePath } from '@/lib/routing/rpgRoutePaths';

import type { CloudSettingsDependencies } from '../cloudDependencies';
import {
  cloudCardTitle,
  remoteBackupDisclosure,
  type Notice,
} from '../cloudModel';
import { CloudBackupPanel } from './CloudBackupPanel';
import { CloudNotice } from './CloudNotice';
import { CloudSignInPanel } from './CloudSignInPanel';

type CloudBackupCardProps = {
  titleAs: 'h2' | 'h3';
  /** A local import or reset is running. */
  localBusy: boolean;
  exporting: boolean;
  /** The existing local-file export, offered before a restore replaces data. */
  onExportLocal: () => void | Promise<void>;
  /** Test seam; production composes the shared account, store and database. */
  dependencies?: Partial<CloudSettingsDependencies>;
};

type CardState = CloudAccountState | { status: 'unavailable' };

function readState(account: Pick<CloudAccountPort, 'getState'>): CardState {
  try {
    return account.getState();
  } catch {
    // Settings also hosts the local data controls: a cloud fault stays here.
    return { status: 'unavailable' };
  }
}

/**
 * Optional remote backup in Settings (Epic G alpha). Off by default and
 * invisible on the network until the learner turns it on, signs in and presses
 * a button. Reading the account state builds no request; there is no effect
 * that contacts the cloud. IndexedDB stays the only authority: nothing here
 * reads the cloud to decide anything about this device. Every state, including
 * "off" and "unavailable", opens with the same short disclosure.
 */
export function CloudBackupCard({
  dependencies,
  exporting,
  localBusy,
  onExportLocal,
  titleAs,
}: CloudBackupCardProps) {
  const navigate = useNavigate();
  const account = dependencies?.account ?? getCloudAccount();
  const [state, setState] = useState<CardState>(() => readState(account));
  const [notice, setNotice] = useState<Notice | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const shownStatus = useRef(state.status);

  useEffect(() => account.subscribe((next) => setState(next)), [account]);

  // The control that was pressed is replaced by the next state's controls, so
  // keyboard focus moves to that state's first control instead of being lost.
  useEffect(() => {
    if (shownStatus.current === state.status) {
      return;
    }

    shownStatus.current = state.status;
    body.current?.querySelector<HTMLElement>('[data-cloud-focus]')?.focus();
  }, [state.status]);

  function refresh() {
    setState(readState(account));
  }

  function setEnabled(enabled: boolean) {
    setNotice(null);

    if (!writeCloudPreferences({ ...readCloudPreferences(), enabled })) {
      setNotice({
        tone: 'danger',
        title: 'Not changed',
        lines: ['This browser did not save the setting.'],
      });
      return;
    }

    refresh();
  }

  function handleSignedOut(result: CloudSignOutResult) {
    setNotice(
      result.serverInvalidation === 'confirmed'
        ? { tone: 'neutral', title: 'Signed out', lines: [] }
        : {
            tone: 'neutral',
            title: 'Signed out on this device',
            lines: [
              'The cloud service did not confirm that it ended the session.',
            ],
          },
    );
    refresh();
  }

  return (
    <Card title={cloudCardTitle} titleAs={titleAs}>
      <div className="card__body" ref={body}>
        {remoteBackupDisclosure.map((paragraph) => (
          <p className="card__description" key={paragraph}>
            {paragraph}
          </p>
        ))}
        {state.status === 'disabled' ? (
          <>
            <p className="card__description">
              Off on this device. While it is off, nothing is sent to any cloud
              service.
            </p>
            {notice ? <CloudNotice notice={notice} /> : null}
            <div className="action-row">
              <Button
                data-cloud-focus=""
                onClick={() => setEnabled(true)}
                variant="secondary"
              >
                Turn on cloud backup
              </Button>
            </div>
          </>
        ) : null}
        {state.status === 'unavailable' ? (
          <p className="data-action__error" role="alert">
            Cloud backup is unavailable in this browser.
          </p>
        ) : null}
        {state.status === 'signed-out' ? (
          <>
            <p className="card__description">
              Sign in to back up to, or restore from, your cloud account.
              Backups are manual.
            </p>
            {notice ? <CloudNotice notice={notice} /> : null}
            <CloudSignInPanel
              account={account}
              onChanged={refresh}
              onTurnOff={() => setEnabled(false)}
            />
          </>
        ) : null}
        {state.status === 'signed-in' ? (
          <CloudBackupPanel
            account={account}
            dependencies={dependencies}
            email={state.email}
            exporting={exporting}
            localBusy={localBusy}
            onExportLocal={onExportLocal}
            onRestored={() => navigate(rpgRoutePath, { replace: true })}
            onSignedOut={handleSignedOut}
            staysSignedIn={readCloudPreferences().trustedDevice}
          />
        ) : null}
      </div>
    </Card>
  );
}
