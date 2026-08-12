import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  ImportBackupControl,
  type BackupImportSelection,
} from '@/components/ui/ImportBackupControl';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { TextInput } from '@/components/ui/TextInput';
import { Toast, ToastStack } from '@/components/ui/Toast';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import {
  BackupValidationError,
  buildBackupEnvelope,
  backupFileName,
  serializeBackupEnvelope,
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
import { rpgRoutePath } from '@/lib/routing/rpgRoutePaths';
import { bundledCourseSeed } from '@/seed';

// The same settings surface renders in two shells: the classic Settings route
// and the RPG settings route (/rpg/settings). Settings is the product concept;
// the RPG view is only a visual wrapper, not a second settings engine. Only the
// route header (and a collapsed local-first / course-boundary note in the RPG
// shell) differ by variant; the profile form and the authoritative
// export / import / reset controls are the same components with the same
// handlers and the same destructive-action safeguards.
type SettingsSurfaceVariant = 'classic' | 'rpg';

type SettingsSurfaceProps = {
  variant?: SettingsSurfaceVariant;
};

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

export function SettingsSurface({ variant = 'classic' }: SettingsSurfaceProps) {
  const isRpgVariant = variant === 'rpg';
  const sectionClassName = isRpgVariant
    ? 'page-section rpg-settings'
    : 'page-section';
  const navigate = useNavigate();
  const {
    coordination,
    persistenceStatus,
    profile,
    requestPersistentStorage,
    runLocalMutation,
    saveProfile,
  } = useAppState();
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

      const { contents } = serializeBackupEnvelope(envelope);

      downloadJson(fileName, contents);

      setToast({
        title: 'Backup download started',
        description: `Started downloading ${fileName}. Store it somewhere private.`,
        tone: 'success',
      });

      try {
        await runLocalMutation(
          () => recordBackupEvent({ type: 'export', fileName }),
          { invalidateRoute: false },
        );
        setToast({
          title: 'Backup download started',
          description: `Started downloading ${fileName} and recorded it in local backup history.`,
          tone: 'success',
        });
      } catch {
        setToast({
          title: 'Backup download started',
          description:
            'The file download started, but the local backup-history entry could not be recorded.',
          tone: 'danger',
        });
      }
    } catch (error) {
      setToast({
        title: 'Export failed',
        description:
          error instanceof BackupValidationError
            ? error.message
            : 'The local backup could not be created or downloaded.',
        tone: 'danger',
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleRequestPersistence() {
    const result = await requestPersistentStorage();

    setToast(
      result === 'persistent'
        ? {
            title: 'Persistent storage granted',
            description:
              'The browser reports reduced automatic-eviction risk. Manual deletion, device loss, and browser damage still require a backup.',
            tone: 'success',
          }
        : {
            title: 'Persistent storage not granted',
            description:
              'ProgressPal remains in best-effort browser storage. Export backups regularly.',
            tone: 'danger',
          },
    );
  }

  async function handleImport(selection: BackupImportSelection) {
    setImporting(true);

    try {
      await runLocalMutation(
        () =>
          restoreDatabaseFromBackup(selection.envelope.data, {
            seed: bundledCourseSeed,
            fileName: selection.fileName,
          }),
        { invalidateRoute: true },
      );
      // Land on the restored dashboard so the import has clear, visible
      // feedback. Refreshing app state forces a reload that unmounts this page,
      // so a success toast here would never survive; the dashboard is the
      // feedback instead. Verify-your-restore guidance lives in the preview.
      navigate('/dashboard', { replace: true });
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
      await runLocalMutation(() => resetAllData({ seed: bundledCourseSeed }), {
        invalidateRoute: true,
      });
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
    <section className={sectionClassName}>
      {isRpgVariant ? (
        <div className="rpg-settings__header">
          <div>
            <p className="rpg-settings__eyebrow">RPG</p>
            <h1>Settings</h1>
            <p className="rpg-settings__lede">
              Edit your local profile and manage on-device data: export a
              backup, import one, or reset everything. Stored only in this
              browser on this device.
            </p>
          </div>
          <div className="rpg-settings__actions">
            <Link
              className="button button--secondary button--md"
              to={rpgRoutePath}
            >
              Back to Hub
            </Link>
          </div>
        </div>
      ) : (
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
      )}
      <ProfileForm
        cardTitleAs={isRpgVariant ? 'h2' : 'h3'}
        disabled={!coordination.canWrite}
        key={profile.updatedAt}
        mode="settings"
        onSubmit={async (input) => {
          await saveProfile(input, { completeOnboarding: true });
          setToast({
            title: 'Local profile saved',
            description:
              'Profile, theme, motion, and study cadence were updated on this device.',
            tone: 'success',
          });
        }}
        profile={profile}
        submitLabel="Save local settings"
      />
      <Card
        title="Browser storage durability"
        titleAs={isRpgVariant ? 'h2' : 'h3'}
      >
        <p className="card__description">
          {persistenceStatus === 'persistent'
            ? 'This browser reports persistent storage for this site, which reduces automatic eviction risk.'
            : persistenceStatus === 'best-effort'
              ? 'This browser currently treats ProgressPal storage as best-effort and may evict it under storage pressure.'
              : persistenceStatus === 'unsupported'
                ? 'This browser does not expose a persistent-storage request to ProgressPal.'
                : persistenceStatus === 'error'
                  ? 'The browser did not provide a reliable persistent-storage status.'
                  : 'Checking the browser storage policy…'}
        </p>
        <p className="card__description">
          Persistent permission is not a backup. You, the browser, or device
          failure can still remove local data, and nothing is synced to another
          device.
        </p>
        {persistenceStatus === 'best-effort' ||
        persistenceStatus === 'error' ? (
          <div className="action-row">
            <Button
              onClick={() => {
                void handleRequestPersistence();
              }}
              variant="secondary"
            >
              Request persistent storage
            </Button>
          </div>
        ) : null}
      </Card>
      <Card title="Export a backup" titleAs={isRpgVariant ? 'h2' : 'h3'}>
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
        disabled={!coordination.canWrite || coordination.peerActive}
        expectedSchemaVersion={currentDatabaseSchemaVersion}
        onConfirmImport={handleImport}
      />
      <Card title="Reset local data" titleAs={isRpgVariant ? 'h2' : 'h3'}>
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
            disabled={!coordination.canWrite || coordination.peerActive}
            id="reset-confirmation"
            onChange={(event) => setResetPhrase(event.target.value)}
            placeholder={resetConfirmationPhrase}
            value={resetPhrase}
          />
        </div>
        <div className="action-row">
          <Button
            disabled={
              !resetReady || !coordination.canWrite || coordination.peerActive
            }
            loading={resetting}
            onClick={handleReset}
            variant="danger"
          >
            Reset all local data
          </Button>
        </div>
      </Card>
      {isRpgVariant ? (
        <Card title="Local-first and course boundary" titleAs="h2">
          <p className="card__description">
            ProgressPal keeps everything in this browser on this device. There
            is no account, no cloud sync, and no analytics. Browser storage can
            be cleared by you, your browser, or your device, so export a backup
            before clearing data or switching devices.
          </p>
          <p className="card__description">
            RPG ranks, badges, and profile summaries are local ProgressPal
            interpretations, not CS50, Harvard, edX, or OpenCourseWare status.
            Use official course systems for enrollment, submission, grading, and
            certificates.
          </p>
        </Card>
      ) : null}
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
