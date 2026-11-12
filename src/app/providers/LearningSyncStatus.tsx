import { useContext, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  buildBackupEnvelope,
  serializeBackupEnvelope,
  type BackupData,
} from '@/lib/backup';
import { downloadBackupFile } from '@/lib/backup/download';
import { getCloudAccount } from '@/lib/cloud';
import type { SyncConflict, SyncResolution } from '@/lib/cloudSync/reconcile';
import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
} from '@/lib/db';

import { LearningSyncContext } from './learningSyncContext';

function saveCopy(data: BackupData, name: string) {
  const envelope = buildBackupEnvelope(data, {
    appVersion: currentApplicationVersion,
    schemaVersion: currentDatabaseSchemaVersion,
    exportedAt: new Date().toISOString(),
  });
  downloadBackupFile(
    `progresspal-${name}.json`,
    serializeBackupEnvelope(envelope).contents,
  );
}

function RecoveryExport({
  data,
  name,
  children,
  onDownloaded,
}: {
  data: BackupData;
  name: string;
  children: string;
  onDownloaded?: () => void;
}) {
  const [error, setError] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          try {
            saveCopy(data, name);
            onDownloaded?.();
            setError(false);
          } catch {
            setError(true);
          }
        }}
      >
        {children}
      </Button>
      {error && <p role="alert">Kunne ikke laste ned kopien.</p>}
    </>
  );
}

function ConflictRecovery({
  conflict,
  resolve,
}: {
  conflict: SyncConflict;
  resolve: (resolution: SyncResolution) => void;
}) {
  const [localDownloaded, setLocalDownloaded] = useState(false);
  const [remoteDownloaded, setRemoteDownloaded] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const downloaded =
    localDownloaded && (conflict.remote === null || remoteDownloaded);
  return (
    <Card title="Velg hvilke studiedata du vil fortsette med" titleAs="h2">
      <div className="card__body">
        <p className="card__description" role="status">
          {conflict.remote === null
            ? 'Kontoen har ingen lagret kopi. Lagre en kopi før du sender dataene fra denne enheten på nytt.'
            : 'Denne enheten og kontoen har forskjellige endringer. Lagre begge kopiene før du velger.'}
        </p>
        <ul>
          <li>
            Denne enheten har {conflict.local.studySessions.length} studieøkter
            og {conflict.local.learnerEvidence.length} registreringer fra
            oppgaver.
          </li>
          {conflict.remote !== null && (
            <li>
              Kontoen har {conflict.remote.studySessions.length} studieøkter og{' '}
              {conflict.remote.learnerEvidence.length} registreringer fra
              oppgaver.
            </li>
          )}
        </ul>
        <div className="action-row">
          <RecoveryExport
            data={conflict.local}
            name="enhet"
            onDownloaded={() => setLocalDownloaded(true)}
          >
            Last ned fra denne enheten
          </RecoveryExport>
          {conflict.remote !== null && (
            <RecoveryExport
              data={conflict.remote}
              name="konto"
              onDownloaded={() => setRemoteDownloaded(true)}
            >
              Last ned fra kontoen
            </RecoveryExport>
          )}
        </div>
        <Checkbox
          checked={confirmed}
          disabled={!downloaded}
          label="Jeg har lagret kopiene jeg trenger"
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <div className="action-row">
          <Button
            disabled={!confirmed}
            variant="secondary"
            onClick={() => resolve({ conflict, choice: 'local' })}
          >
            Behold dataene fra denne enheten
          </Button>
          {conflict.remote !== null && (
            <Button
              disabled={!confirmed}
              variant="secondary"
              onClick={() => resolve({ conflict, choice: 'remote' })}
            >
              Behold dataene fra kontoen
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function LearningSyncStatus() {
  const sync = useContext(LearningSyncContext);
  if (sync === null) return null;

  const { view, resolve, retry } = sync;
  if (view.status === 'conflict') {
    return (
      <ConflictRecovery
        key={view.conflict.head.hash ?? 'empty'}
        conflict={view.conflict}
        resolve={resolve}
      />
    );
  }
  if (view.status === 'unowned') {
    return (
      <>
        <p role="status">
          Denne nettleseren har studiedata uten konto. Last ned en kopi, eller
          bruk en annen nettleserprofil for å fortsette med kontoen.
        </p>
        <RecoveryExport data={view.local} name="lokal-kopi">
          Last ned studiedata
        </RecoveryExport>
      </>
    );
  }
  if (view.status === 'different-account') {
    return (
      <p role="status">
        Studiedataene i denne nettleseren tilhører en annen konto. Logg ut og
        bruk den opprinnelige kontoen, eller åpne ProgressPal i en annen
        nettleserprofil.
      </p>
    );
  }
  const messages = {
    initial: 'Kontrollerer studiedataene …',
    ready: 'Synkronisert',
    'ready-to-learn': 'Klar til å synkronisere',
    'tab-open':
      'Lukk de andre ProgressPal-fanene for å hente oppdateringen fra kontoen.',
    pending: 'Endringer venter på synkronisering.',
    synchronizing: 'Synkroniserer studiedata …',
    offline:
      'Frakoblet. Endringer på denne enheten synkroniseres når du er på nett.',
    unavailable:
      'Synkronisering er midlertidig utilgjengelig. ProgressPal prøver igjen.',
    authentication: 'Logg inn på nytt for å synkronisere endringene.',
    disabled: 'Automatisk synkronisering er slått av i denne versjonen.',
    'device-unreadable':
      'ProgressPal kan ikke bekrefte hvilken konto studiedataene i denne nettleseren tilhører.',
    incompatible:
      'Studiedataene kunne ikke synkroniseres med denne versjonen av ProgressPal.',
    'too-large':
      'Studiedataene overskrider grensen for synkronisering. Du kan fortsatt laste ned en sikkerhetskopi.',
  };
  return (
    <div>
      <p className="card__description" role="status">
        {messages[view.status]}
      </p>
      {['unavailable', 'incompatible', 'too-large'].includes(view.status) && (
        <Button variant="quiet" onClick={retry}>
          Prøv igjen
        </Button>
      )}
      {view.status === 'authentication' && (
        <Button
          variant="quiet"
          onClick={() => void getCloudAccount().signOut()}
        >
          Logg inn på nytt
        </Button>
      )}
    </div>
  );
}
