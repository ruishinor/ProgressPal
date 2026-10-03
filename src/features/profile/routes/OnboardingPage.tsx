import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  ImportBackupControl,
  type BackupImportSelection,
} from '@/components/ui/ImportBackupControl';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { Toast, ToastStack } from '@/components/ui/Toast';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { useAppState } from '@/lib/appState';
import {
  currentDatabaseSchemaVersion,
  defaultLearnerProfileValues,
  restoreDatabaseFromBackup,
} from '@/lib/db';
import { getSharedDatabase } from '@/lib/db/database';
import { getOnboardingReturnPath } from '@/lib/routing/onboardingReturnPath';

type OnboardingMode = 'quick' | 'customize';

/**
 * First run. A fresh learner explicitly chooses the programme to start with
 * (owner decision 2026-10-03): nothing is preselected, no programme is
 * presented as already chosen, and starting needs a choice. The choice
 * applies only to a not-yet-completed onboarding, never to an existing or
 * restored learner.
 */
export function OnboardingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    coordination,
    profile,
    programmeChoices,
    runLocalMutation,
    saveProfile,
  } = useAppState();
  const programmeDescriptionId = useId();
  const [programmeId, setProgrammeId] = useState<string | null>(null);
  const [mode, setMode] = useState<OnboardingMode>('quick');
  const [startingDefault, setStartingDefault] = useState(false);
  const [quickStartError, setQuickStartError] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(false);
  const customizeTitleRef = useRef<HTMLHeadingElement>(null);
  const returnTo = getOnboardingReturnPath(location.state);

  useEffect(() => {
    if (mode === 'customize') {
      customizeTitleRef.current?.focus();
    }
  }, [mode]);

  if (profile === null) {
    return null;
  }

  async function handleUseDefaultLearner() {
    if (programmeId === null) {
      return;
    }

    setStartingDefault(true);
    setQuickStartError(false);

    try {
      // Reuse the canonical defaults and the existing onboarding-completion
      // mechanism. Clone the mutable study-days array so the stored profile is
      // independent of the shared default constant.
      await saveProfile(
        {
          ...defaultLearnerProfileValues,
          targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
        },
        { completeOnboarding: true, startingProgrammeId: programmeId },
      );
      navigate(returnTo, { replace: true });
    } catch {
      setQuickStartError(true);
      setStartingDefault(false);
    }
  }

  async function handleImport(selection: BackupImportSelection) {
    setImporting(true);
    setImportError(false);

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
      // Refreshing re-reads app state; if the backup completed onboarding, the
      // app shell forwards to the dashboard. Otherwise the learner stays here.
    } catch {
      setImportError(true);
      setImporting(false);
    }
  }

  return (
    <section className="page-section">
      <PageHeader
        description="Choose a programme and set up a local learner profile. Everything stays on this device."
        eyebrow="Setup"
        meta={
          <>
            <StatusPill variant="planned">First run required</StatusPill>
            <Badge tone="accent">Stored only on this device</Badge>
          </>
        }
        title="Start with ProgressPal"
      />
      <fieldset
        aria-describedby={programmeDescriptionId}
        className="profile-fieldset"
        role="radiogroup"
      >
        <legend className="profile-fieldset__legend">
          Choose your programme
        </legend>
        <p
          className="profile-fieldset__description"
          id={programmeDescriptionId}
        >
          Pick the programme you want to start with. You can add or switch
          programmes later in Settings.
        </p>
        <div className="checkbox-grid">
          {programmeChoices.map((choice) => (
            <label className="checkbox" key={choice.programmeId}>
              <input
                checked={programmeId === choice.programmeId}
                disabled={startingDefault || !coordination.canWrite}
                name="starting-programme"
                onChange={() => setProgrammeId(choice.programmeId)}
                type="radio"
                value={choice.programmeId}
              />
              <span>{choice.title}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {mode === 'quick' ? (
        <Card
          description="Everything stays in this browser. No account, no cloud sync, no analytics. You can export, import, or reset it later."
          title="Start now"
        >
          <div className="onboarding-quick">
            <p>Start now with a local profile you can change later.</p>
            <div className="action-row">
              <Button
                disabled={programmeId === null || !coordination.canWrite}
                loading={startingDefault}
                onClick={() => {
                  void handleUseDefaultLearner();
                }}
                size="lg"
              >
                Use default learner
              </Button>
              <Button
                disabled={
                  programmeId === null ||
                  startingDefault ||
                  !coordination.canWrite
                }
                onClick={() => setMode('customize')}
                variant="secondary"
              >
                Customize first
              </Button>
            </div>
            {quickStartError ? (
              <p className="form-field__error" role="alert">
                The default learner could not be saved locally. Try again.
              </p>
            ) : null}
          </div>
        </Card>
      ) : (
        <div className="onboarding-customize">
          <div className="onboarding-customize__header">
            <h3
              className="onboarding-customize__title"
              ref={customizeTitleRef}
              tabIndex={-1}
            >
              Create your local learner profile
            </h3>
            <Button onClick={() => setMode('quick')} variant="quiet">
              Back to quick start
            </Button>
          </div>
          <ProfileForm
            disabled={programmeId === null || !coordination.canWrite}
            key={profile.updatedAt}
            mode="onboarding"
            onSubmit={async (input) => {
              if (programmeId === null) {
                return;
              }

              await saveProfile(input, {
                completeOnboarding: true,
                startingProgrammeId: programmeId,
              });
              navigate(returnTo, { replace: true });
            }}
            profile={profile}
            submitLabel="Save and continue"
          />
        </div>
      )}
      <ImportBackupControl
        busy={importing}
        disabled={!coordination.canWrite || coordination.peerActive}
        confirmLabel="Restore this backup"
        expectedSchemaVersion={currentDatabaseSchemaVersion}
        heading="Already have a backup?"
        migrationContext={getSharedDatabase().migrationContext}
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
