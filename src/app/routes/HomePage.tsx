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
        description="Modules 07 through 11 establish the local learner identity, the seeded CS50 course map, the long-form progression engine, the content-detail logging surface, and append-only study-session logging. Theme, motion, study cadence, and session effort all stay on-device."
        eyebrow="Route: /"
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
          description="The rest of the product still stays honest about what has not been built yet."
          title="What this module does not claim"
        >
          <ul className="detail-list">
            <li>
              The course map now reflects the seeded catalog and saved item
              status.
            </li>
            <li>
              Long-form progress now has local slice and resume tracking under
              the course map.
            </li>
            <li>
              Achievements now unlock from your explicit saves and list under
              the achievements route. Dashboard metrics and insights stay
              deferred.
            </li>
            <li>
              Item detail and long-form logging are now live from the course
              map.
            </li>
            <li>
              Study sessions now log effort and award XP. They do not imply
              watched time, completion, or dashboard rollups.
            </li>
          </ul>
        </Card>
      </div>
      <Card
        description="The app now has a stable first-run profile checkpoint without pretending later modules already exist."
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
