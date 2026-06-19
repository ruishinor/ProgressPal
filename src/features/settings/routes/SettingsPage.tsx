import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ImportBackupControl } from '@/components/ui/ImportBackupControl';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { TextInput } from '@/components/ui/TextInput';
import { Toast, ToastStack } from '@/components/ui/Toast';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import {
  buildBackupEnvelope,
  backupFileName,
  type BackupEnvelope,
} from '@/lib/backup';
import { useAppState } from '@/lib/appState';
import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  getDatabaseSnapshot,
  recordBackupEvent,
  resetAllData,
  restoreDatabaseFromBackup,
} from '@/lib/db';
import { bundledCourseSeed } from '@/seed';

type SettingsToast = {
  description: string;
  title: string;
  tone: 'success' | 'danger';
};

const resetConfirmationPhrase = 'RESET';

function downloadJson(fileName: string, contents: string) {
  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { profile, refresh, saveProfile } = useAppState();
  const [toast, setToast] = useState<SettingsToast | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetPhrase, setResetPhrase] = useState('');

  if (profile === null) {
    return null;
  }

  async function handleExport() {
    setExporting(true);

    try {
      const snapshot = await getDatabaseSnapshot();
      const fileName = backupFileName(new Date());
      const envelope = buildBackupEnvelope(snapshot, {
        appVersion: currentApplicationVersion,
        schemaVersion: currentDatabaseSchemaVersion,
        exportedAt: new Date().toISOString(),
      });

      downloadJson(fileName, JSON.stringify(envelope, null, 2));
      await recordBackupEvent({ type: 'export', fileName });

      setToast({
        title: 'Backup exported',
        description: `Saved ${fileName} to this device. Store it somewhere private.`,
        tone: 'success',
      });
    } catch {
      setToast({
        title: 'Export failed',
        description: 'The local backup could not be created.',
        tone: 'danger',
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(envelope: BackupEnvelope) {
    setImporting(true);

    try {
      await restoreDatabaseFromBackup(envelope.data, {
        seed: bundledCourseSeed,
        fileName: backupFileName(new Date()),
      });
      // Land on the restored dashboard so the import has clear, visible
      // feedback. Refreshing app state forces a reload that unmounts this page,
      // so a success toast here would never survive; the dashboard is the
      // feedback instead. Verify-your-restore guidance lives in the preview.
      navigate('/dashboard', { replace: true });
      await refresh();
    } catch {
      setToast({
        title: 'Import failed',
        description:
          'The backup could not be restored. Local data is unchanged.',
        tone: 'danger',
      });
      setImporting(false);
    }
  }

  async function handleReset() {
    setResetting(true);

    try {
      await resetAllData({ seed: bundledCourseSeed });
      await refresh();
      // App state now requires onboarding again; the shell redirects there.
    } catch {
      setToast({
        title: 'Reset failed',
        description: 'Local data could not be reset.',
        tone: 'danger',
      });
      setResetting(false);
    }
  }

  const resetReady = resetPhrase.trim() === resetConfirmationPhrase;

  return (
    <section className="page-section">
      <PageHeader
        actions={
          <div className="action-row">
            <Link className="button button--secondary button--md" to="/">
              Back to profile
            </Link>
          </div>
        }
        description="Edit your local profile and manage your on-device data: export a backup, restore one, or reset everything."
        eyebrow="Data controls"
        meta={
          <>
            <StatusPill variant="completed">Settings active</StatusPill>
            <Badge tone="accent">Local data controls</Badge>
          </>
        }
        title="Settings"
      />
      <ProfileForm
        key={profile.updatedAt}
        mode="settings"
        onSubmit={async (input) => {
          await saveProfile(input, { completeOnboarding: true });
          setToast({
            title: 'Local profile saved',
            description:
              'Theme, motion, avatar, and study cadence were updated on this device.',
            tone: 'success',
          });
        }}
        profile={profile}
        submitLabel="Save local settings"
      />
      <Card title="Export a backup" titleAs="h3">
        <p className="card__description">
          Download a full local backup as a JSON file. It contains your learning
          history and progress, notes and saved blockers, XP transactions and
          achievement unlocks, media progress and resume points, and your
          settings, profile, and app metadata. Keep exported files somewhere
          private; they are created and stored only by you.
        </p>
        <div className="action-row">
          <Button loading={exporting} onClick={handleExport} variant="primary">
            Export local backup
          </Button>
        </div>
      </Card>
      <ImportBackupControl
        busy={importing}
        expectedSchemaVersion={currentDatabaseSchemaVersion}
        onConfirmImport={handleImport}
      />
      <Card title="Reset local data" titleAs="h3">
        <p className="card__description">
          Permanently delete all local ProgressPal data on this device and start
          fresh. This removes your progress, sessions, XP, achievements, notes,
          media history, and backup history. It is destructive, local-only, and
          cannot be undone. Type <code>{resetConfirmationPhrase}</code> to
          enable the reset.
        </p>
        <div className="data-action">
          <label className="form-field__label" htmlFor="reset-confirmation">
            Confirmation phrase
          </label>
          <TextInput
            autoComplete="off"
            id="reset-confirmation"
            onChange={(event) => setResetPhrase(event.target.value)}
            placeholder={resetConfirmationPhrase}
            value={resetPhrase}
          />
        </div>
        <div className="action-row">
          <Button
            disabled={!resetReady}
            loading={resetting}
            onClick={handleReset}
            variant="danger"
          >
            Reset all local data
          </Button>
        </div>
      </Card>
      {toast ? (
        <ToastStack>
          <Toast
            description={toast.description}
            onDismiss={() => setToast(null)}
            title={toast.title}
            tone={toast.tone}
          />
        </ToastStack>
      ) : null}
    </section>
  );
}
