import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { Toast, ToastStack } from '@/components/ui/Toast';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { useAppState } from '@/lib/appState';

export function SettingsPage() {
  const { profile, saveProfile } = useAppState();
  const [showToast, setShowToast] = useState(false);

  if (profile === null) {
    return null;
  }

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
        description="Profile editing is now live. Export, import, backup, and reset still land in later modules."
        eyebrow="Route: /settings"
        meta={
          <>
            <StatusPill variant="inProgress">Partial settings</StatusPill>
            <Badge tone="accent">Profile controls active</Badge>
          </>
        }
        title="Settings"
      />
      <ProfileForm
        key={profile.updatedAt}
        mode="settings"
        onSubmit={async (input) => {
          await saveProfile(input, { completeOnboarding: true });
          setShowToast(true);
        }}
        profile={profile}
        submitLabel="Save local settings"
      />
      <Card
        description="Later modules still need deliberate recovery and storage-control workflows."
        title="Still deferred"
      >
        <ul className="detail-list">
          <li>Backup and restore stay assigned to Module 16.</li>
          <li>Full privacy copy and reset controls are not implemented yet.</li>
          <li>Course defaults and slice preferences remain future work.</li>
        </ul>
      </Card>
      {showToast ? (
        <ToastStack>
          <Toast
            description="Theme, motion, avatar, and study cadence were updated on this device."
            onDismiss={() => setShowToast(false)}
            title="Local profile saved"
            tone="success"
          />
        </ToastStack>
      ) : null}
    </section>
  );
}
