import { useEffect, useRef, useState } from 'react';
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
import { getOnboardingReturnPath } from '@/lib/routing/onboardingReturnPath';
import { getActiveProgrammeDefinition } from '@/programmes';
import { bundledCourseSeed } from '@/seed';

type OnboardingMode = 'quick' | 'customize';

export function OnboardingPage() {
  const { copy } = getActiveProgrammeDefinition().content.terminology;
  const location = useLocation();
  const navigate = useNavigate();
  const { coordination, profile, runLocalMutation, saveProfile } =
    useAppState();
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
        { completeOnboarding: true },
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
          restoreDatabaseFromBackup(selection.envelope.data, {
            seed: bundledCourseSeed,
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
        description={copy.onboardingDescription}
        eyebrow="Setup"
        meta={
          <>
            <StatusPill variant="planned">First run required</StatusPill>
            <Badge tone="accent">Stored only on this device</Badge>
          </>
        }
        title={copy.onboardingTitle}
      />
      {mode === 'quick' ? (
        <Card
          description="Everything stays in this browser. No account, no cloud sync, no analytics. You can export, import, or reset it later."
          title="Start now"
        >
          <div className="onboarding-quick">
            <p>Start now with a local profile you can change later.</p>
            <div className="action-row">
              <Button
                disabled={!coordination.canWrite}
                loading={startingDefault}
                onClick={() => {
                  void handleUseDefaultLearner();
                }}
                size="lg"
              >
                Use default learner
              </Button>
              <Button
                disabled={startingDefault || !coordination.canWrite}
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
            disabled={!coordination.canWrite}
            key={profile.updatedAt}
            mode="onboarding"
            onSubmit={async (input) => {
              await saveProfile(input, { completeOnboarding: true });
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
