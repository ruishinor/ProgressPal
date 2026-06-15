import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { useAppState } from '@/lib/appState';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { profile, saveProfile } = useAppState();

  if (profile === null) {
    return null;
  }

  return (
    <section className="page-section">
      <PageHeader
        description="Create the first local learner profile before the rest of ProgressPal opens. Nothing is uploaded, synced, or shared."
        eyebrow="Route: /onboarding"
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
    </section>
  );
}
