import uiCopy from '@/ui-copy/interface.json';
import { gitPathwayProgrammeId } from '@/lib/routing/pathwaysPaths';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import {
  ImportBackupControl,
  type BackupImportSelection,
} from '@/components/ui/ImportBackupControl';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
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
import { requireProgrammeScope } from '@/lib/domain';
import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  getDatabaseSnapshot,
  recordBackupEvent,
  resetAllData,
  restoreDatabaseFromBackup,
} from '@/lib/db';
import { getSharedDatabase } from '@/lib/db/database';
import { rpgRoutePath } from '@/lib/routing/rpgRoutePaths';

import { CloudBackupCard } from './CloudBackupCard';

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
  const { copy } = requireProgrammeScope(useAppState().programmeScope).content
    .terminology;
  const isRpgVariant = variant === 'rpg';
  const sectionClassName = isRpgVariant
    ? 'page-section rpg-settings'
    : 'page-section';
  const navigate = useNavigate();
  const {
    coordination,
    enrolAndSwitchProgramme,
    persistenceStatus,
    profile,
    programmeChoices,
    requestPersistentStorage,
    runLocalMutation,
    saveProfile,
    switchProgramme,
  } = useAppState();
  const [toast, setToast] = useState<SettingsToast | null>(null);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(
    null,
  );
  const [switching, setSwitching] = useState(false);
  const [switchFailed, setSwitchFailed] = useState(false);
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
          // No seed: a restored backup keeps its own validated active
          // programme, and the provider's refresh materializes that
          // programme's catalogue from the persisted state.
          restoreDatabaseFromBackup(selection.envelope.data, {
            fileName: selection.fileName,
          }),
        { invalidateRoute: true },
      );
      // Land on the restored dashboard so the import has clear, visible
      // feedback. Refreshing app state forces a reload that unmounts this page,
      // so a success toast here would never survive; the dashboard is the
      // feedback instead. Verify-your-restore guidance lives in the preview.
      navigate('/rpg', { replace: true });
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
      // Reset ends in the explicit default programme; the provider's refresh
      // then materializes that programme's catalogue. Nothing is seeded from
      // whichever programme happened to be active before the reset.
      await runLocalMutation(() => resetAllData(), {
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
  const activeProgramme = programmeChoices.find((choice) => choice.active);
  const switchTargets = programmeChoices.filter(
    (choice) => !choice.active && choice.programmeId !== gitPathwayProgrammeId,
  );
  const switchTarget =
    switchTargets.find(
      (choice) => choice.programmeId === selectedProgrammeId,
    ) ?? switchTargets[0];
  const switchDisabled = !coordination.canWrite || coordination.peerActive;

  async function handleSwitchProgramme() {
    if (switchTarget === undefined) {
      return;
    }

    setSwitching(true);
    setSwitchFailed(false);

    try {
      if (switchTarget.enrolled) {
        await switchProgramme(switchTarget.programmeId);
      } else {
        await enrolAndSwitchProgramme(switchTarget.programmeId);
      }
      // A successful switch changes the programme, which remounts the routes:
      // the visible active programme and the page content agree afterwards.
    } catch {
      setSwitchFailed(true);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <section className={sectionClassName}>
      {isRpgVariant ? (
        <div className="rpg-settings__header rpg-page-header">
          <div>
            <p className="rpg-settings__eyebrow rpg-page-eyebrow">
              {uiCopy.surfaces.settingsScreen.rPG}
            </p>
            <h1>{uiCopy.surfaces.settingsScreen.settings}</h1>
            <p className="rpg-settings__lede rpg-page-lede">
              {
                uiCopy.surfaces.settingsScreen
                  .editYourLocalProfileAndManageOnDevice
              }
            </p>
          </div>
          <div className="rpg-settings__actions">
            <Link
              className="button button--secondary button--md"
              to={rpgRoutePath}
            >
              {uiCopy.surfaces.settingsScreen.backToHome}
            </Link>
          </div>
        </div>
      ) : (
        <PageHeader
          actions={
            <div className="action-row">
              <Link
                className="button button--secondary button--md"
                to="/profile"
              >
                {uiCopy.surfaces.settingsScreen.backToProfile}
              </Link>
            </div>
          }
          description={
            uiCopy.surfaces.settingsScreen.editYourLocalProfileAndManageYourOn
          }
          eyebrow="Data controls"
          meta={
            <>
              <StatusPill variant="completed">
                {uiCopy.surfaces.settingsScreen.settingsActive}
              </StatusPill>
              <Badge tone="accent">
                {uiCopy.surfaces.settingsScreen.localDataControls}
              </Badge>
            </>
          }
          title={uiCopy.surfaces.settingsScreen.settings}
        />
      )}
      <Card
        title={uiCopy.surfaces.settingsScreen.interface}
        titleAs={isRpgVariant ? 'h2' : 'h3'}
      >
        <p className="card__description">
          {isRpgVariant
            ? uiCopy.surfaces.settingsScreen
                .rPGInterfaceIsActiveProgressPalAlsoIncludesThe
            : uiCopy.surfaces.settingsScreen
                .classicInterfaceIsActiveItUsesTheSame}
        </p>
        <div className="action-row">
          <Link
            className="button button--secondary button--md"
            to={isRpgVariant ? '/dashboard' : rpgRoutePath}
          >
            {isRpgVariant
              ? uiCopy.surfaces.settingsScreen.openClassicInterface
              : uiCopy.surfaces.settingsScreen.openRPGInterface}
          </Link>
        </div>
      </Card>
      {activeProgramme?.programmeId === gitPathwayProgrammeId ? (
        <p role="status">
          {
            uiCopy.surfaces.settingsScreen
              .gitGitHubLiggerNaUnderPathwaysArbeidetDitt
          }
        </p>
      ) : null}
      <Card
        title={uiCopy.surfaces.settingsScreen.programme}
        titleAs={isRpgVariant ? 'h2' : 'h3'}
      >
        <p className="card__description">
          Active programme:{' '}
          <strong>
            {activeProgramme?.title ??
              uiCopy.surfaces.settingsScreen.unavailable}
          </strong>
        </p>
        {switchTarget === undefined ? (
          <p className="card__description">
            {
              uiCopy.surfaces.settingsScreen
                .thisIsTheOnlyProgrammeAvailableInThis
            }
          </p>
        ) : (
          <>
            <p className="card__description">
              {
                uiCopy.surfaces.settingsScreen
                  .switchingChangesTheCourseWordingAndRewardsProgressPal
              }
            </p>
            <FormField
              controlId="programme-switch-target"
              label={uiCopy.surfaces.settingsScreen.programmeToSwitchTo}
            >
              {({ inputId }) => (
                <Select
                  disabled={switchDisabled || switching}
                  id={inputId}
                  onChange={(event) =>
                    setSelectedProgrammeId(event.target.value)
                  }
                  options={switchTargets.map((choice) => ({
                    label: `${choice.title} (${choice.enrolled ? 'enrolled' : 'not enrolled'})`,
                    value: choice.programmeId,
                  }))}
                  value={switchTarget.programmeId}
                />
              )}
            </FormField>
            <div className="action-row">
              <Button
                disabled={switchDisabled}
                loading={switching}
                onClick={() => {
                  void handleSwitchProgramme();
                }}
                variant="secondary"
              >
                {switchTarget.enrolled
                  ? uiCopy.surfaces.settingsScreen.switchProgramme
                  : uiCopy.surfaces.settingsScreen.enrolAndSwitch}
              </Button>
            </div>
            {switchFailed ? (
              <p className="form-field__error" role="alert">
                {
                  uiCopy.surfaces.settingsScreen
                    .theProgrammeCouldNotBeSwitchedYourActive
                }
              </p>
            ) : null}
          </>
        )}
      </Card>
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
              'Profile, appearance, motion, and study cadence were updated on this device.',
            tone: 'success',
          });
        }}
        profile={profile}
        submitLabel="Save local settings"
      />
      <Card
        title={uiCopy.surfaces.settingsScreen.browserStorageDurability}
        titleAs={isRpgVariant ? 'h2' : 'h3'}
      >
        <p className="card__description">
          {persistenceStatus === 'persistent'
            ? uiCopy.surfaces.settingsScreen
                .thisBrowserReportsPersistentStorageForThisSite
            : persistenceStatus === 'best-effort'
              ? uiCopy.surfaces.settingsScreen
                  .thisBrowserCurrentlyTreatsProgressPalStorageAsBest
              : persistenceStatus === 'unsupported'
                ? uiCopy.surfaces.settingsScreen
                    .thisBrowserDoesNotExposeAPersistentStorage
                : persistenceStatus === 'error'
                  ? uiCopy.surfaces.settingsScreen
                      .theBrowserDidNotProvideAReliablePersistent
                  : uiCopy.surfaces.settingsScreen
                      .checkingTheBrowserStoragePolicy}
        </p>
        <p className="card__description">
          {
            uiCopy.surfaces.settingsScreen
              .persistentPermissionIsNotABackupYouThe
          }
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
              {uiCopy.surfaces.settingsScreen.requestPersistentStorage}
            </Button>
          </div>
        ) : null}
      </Card>
      <Card
        title={uiCopy.surfaces.settingsScreen.exportABackup}
        titleAs={isRpgVariant ? 'h2' : 'h3'}
      >
        <p className="card__description">
          {uiCopy.surfaces.settingsScreen.downloadAFullLocalBackupAsAJSON}
        </p>
        <div className="action-row">
          <Button loading={exporting} onClick={handleExport} variant="primary">
            {uiCopy.surfaces.settingsScreen.exportLocalBackup}
          </Button>
        </div>
      </Card>
      <ImportBackupControl
        busy={importing}
        disabled={!coordination.canWrite || coordination.peerActive}
        expectedSchemaVersion={currentDatabaseSchemaVersion}
        migrationContext={getSharedDatabase().migrationContext}
        onConfirmImport={handleImport}
      />
      <CloudBackupCard
        exporting={exporting}
        localBusy={importing || resetting}
        onExportLocal={handleExport}
        titleAs={isRpgVariant ? 'h2' : 'h3'}
      />
      <Card
        title={uiCopy.surfaces.settingsScreen.resetLocalData}
        titleAs={isRpgVariant ? 'h2' : 'h3'}
      >
        <p className="card__description">
          Permanently delete all local ProgressPal data on this device and start
          fresh. This removes your progress, sessions, XP, achievements, notes,
          media history, and backup history. It is destructive, local-only, and
          cannot be undone. Type <code>{resetConfirmationPhrase}</code> to
          enable the reset.
        </p>
        <div className="data-action">
          <label className="form-field__label" htmlFor="reset-confirmation">
            {uiCopy.surfaces.settingsScreen.confirmationPhrase}
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
            {uiCopy.surfaces.settingsScreen.resetAllLocalData}
          </Button>
        </div>
      </Card>
      {isRpgVariant ? (
        <Card title={copy.settingsBoundaryTitle} titleAs="h2">
          <p className="card__description">{copy.settingsBoundaryText}</p>
          {copy.rpgCourseBoundary ? (
            <p className="card__description">{copy.rpgCourseBoundary}</p>
          ) : null}
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
