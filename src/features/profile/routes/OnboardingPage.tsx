import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ImportBackupControl } from '@/components/ui/ImportBackupControl';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { Toast, ToastStack } from '@/components/ui/Toast';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import type { BackupEnvelope } from '@/lib/backup';
import { useAppState } from '@/lib/appState';
import {
  currentDatabaseSchemaVersion,
  restoreDatabaseFromBackup,
} from '@/lib/db';
import { bundledCourseSeed } from '@/seed';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { profile, refresh, saveProfile } = useAppState();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(false);

  if (profile === null) {
    return null;
  }

  async function handleImport(envelope: BackupEnvelope) {
    setImporting(true);
    setImportError(false);

    try {
      await restoreDatabaseFromBackup(envelope.data, {
        seed: bundledCourseSeed,
        fileName: 'restored-backup.json',
      });
      // Refreshing re-reads app state; if the backup completed onboarding, the
      // app shell forwards to the dashboard. Otherwise the learner stays here.
      await refresh();
    } catch {
      setImportError(true);
      setImporting(false);
    }
  }

  return (
    <section className="page-section">
      <PageHeader
        description="Create the first local learner profile before the rest of ProgressPal opens. Nothing is uploaded, synced, or shared."
        eyebrow="Setup"
        meta={
          <>
            <StatusPill variant="planned">First run required</StatusPill>
            <Badge tone="accent">Stored only on this device</Badge>
          </>
        }
        title="Create your local learner profile"
      />
      <Card
        description="The profile starts with safe defaults, so you can continue immediately without inventing a perfect setup."
        title="Why this gate exists"
      >
        <ul className="detail-list">
          <li>
            The app needs one local learner record before progress becomes
            meaningful.
          </li>
          <li>The avatar is plain JSON config, not a fetched image.</li>
          <li>
            Theme and motion preferences apply only inside this app shell.
          </li>
        </ul>
      </Card>
      <ProfileForm
        key={profile.updatedAt}
        mode="onboarding"
        onSubmit={async (input) => {
          await saveProfile(input, { completeOnboarding: true });
          navigate('/dashboard', { replace: true });
        }}
        profile={profile}
        submitLabel="Save and open dashboard"
      />
      <ImportBackupControl
        busy={importing}
        confirmLabel="Restore this backup"
        expectedSchemaVersion={currentDatabaseSchemaVersion}
        heading="Already have a backup?"
        onConfirmImport={handleImport}
      />
      {importError ? (
        <ToastStack>
          <Toast
            description="The backup could not be restored. Local data is unchanged."
            onDismiss={() => setImportError(false)}
            title="Import failed"
            tone="danger"
          />
        </ToastStack>
      ) : null}
    </section>
  );
}
