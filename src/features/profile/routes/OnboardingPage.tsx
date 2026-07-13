import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
  defaultLearnerProfileValues,
  restoreDatabaseFromBackup,
} from '@/lib/db';
import { getOnboardingReturnPath } from '@/lib/routing/onboardingReturnPath';
import { bundledCourseSeed } from '@/seed';

type OnboardingMode = 'quick' | 'customize';

export function OnboardingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, refresh, saveProfile } = useAppState();
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
        description="Track CS50 work, sessions, XP, achievements, notes, and progress on this device."
        eyebrow="Setup"
        meta={
          <>
            <StatusPill variant="planned">First run required</StatusPill>
            <Badge tone="accent">Stored only on this device</Badge>
          </>
        }
        title="Start tracking CS50 locally"
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
                loading={startingDefault}
                onClick={() => {
                  void handleUseDefaultLearner();
                }}
                size="lg"
              >
                Use default learner
              </Button>
              <Button
                disabled={startingDefault}
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
