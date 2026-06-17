import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  getThemeLabel,
  ProfileAvatar,
  studyDayOptions,
} from '@/features/profile';
import { useAppState } from '@/lib/appState';

function formatStudyDays(days: readonly string[]) {
  return studyDayOptions
    .filter((option) => days.includes(option.value))
    .map((option) => option.label)
    .join(' / ');
}

export function HomePage() {
  const { appMeta, profile } = useAppState();

  if (profile === null) {
    return null;
  }

  return (
    <section className="page-section">
      <PageHeader
        actions={
          <div className="action-row">
            <Link
              className="button button--secondary button--md"
              to="/settings"
            >
              Edit profile
            </Link>
            <Link className="button button--secondary button--md" to="/course">
              Open course map
            </Link>
            <Link className="button button--primary button--md" to="/dashboard">
              Open dashboard
            </Link>
          </div>
        }
        description="Your local CS50 profile is the starting point for ProgressPal. It keeps your study target, theme preference, reduced-motion preference, and learning identity on this device."
        eyebrow="Local profile"
        meta={
          <>
            <StatusPill variant="completed">Onboarding complete</StatusPill>
            <Badge tone="accent">{profile.targetMinutesPerWeek} min/week</Badge>
          </>
        }
        title={`Local profile for ${profile.displayName}`}
      />
      <div className="profile-page-grid">
        <Card
          description="This record is the local source of truth for the learner shell."
          title="Saved profile"
          variant="accent"
        >
          <div className="profile-preview-card">
            <ProfileAvatar avatarConfig={profile.avatarConfig} />
            <dl className="profile-summary-list">
              <div>
                <dt>Display name</dt>
                <dd>{profile.displayName}</dd>
              </div>
              <div>
                <dt>Study days</dt>
                <dd>{formatStudyDays(profile.targetStudyDays)}</dd>
              </div>
              <div>
                <dt>Theme</dt>
                <dd>{getThemeLabel(profile.preferredTheme)}</dd>
              </div>
              <div>
                <dt>Motion</dt>
                <dd>{profile.reducedMotion ? 'Reduced' : 'Standard'}</dd>
              </div>
            </dl>
          </div>
        </Card>
        <Card
          description="ProgressPal stores your progress in this browser. It does not create an account, sync to a server, send analytics, or back up data automatically. Exported backup files are your responsibility."
          title="Privacy boundary"
        >
          {null}
        </Card>
      </div>
      <Card
        description="Your learning identity, theme, motion, and study schedule are stored on this device and never shared."
        title="Current local state"
      >
        <dl className="profile-summary-list">
          <div>
            <dt>Weekly target</dt>
            <dd>{profile.targetMinutesPerWeek} minutes</dd>
          </div>
          <div>
            <dt>Onboarding completed</dt>
            <dd>
              {appMeta?.onboardingCompletedAt ??
                'Recovered from local defaults'}
            </dd>
          </div>
        </dl>
      </Card>
    </section>
  );
}
