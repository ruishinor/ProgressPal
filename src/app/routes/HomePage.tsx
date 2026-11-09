import uiCopy from '@/ui-copy/interface.json';
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
import { requireProgrammeScope } from '@/lib/domain';

function formatStudyDays(days: readonly string[]) {
  return studyDayOptions
    .filter((option) => days.includes(option.value))
    .map((option) => option.label)
    .join(' / ');
}

export function HomePage() {
  const { copy } = requireProgrammeScope(useAppState().programmeScope).content
    .terminology;
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
              {uiCopy.surfaces.homePage.editProfile}
            </Link>
            <Link className="button button--secondary button--md" to="/course">
              {uiCopy.surfaces.homePage.openCourseMap}
            </Link>
            <Link className="button button--primary button--md" to="/dashboard">
              {uiCopy.surfaces.homePage.openDashboard}
            </Link>
          </div>
        }
        description={copy.profileDescription}
        eyebrow="Local profile"
        meta={
          <>
            <StatusPill variant="completed">
              {uiCopy.surfaces.homePage.onboardingComplete}
            </StatusPill>
            <Badge tone="accent">{profile.targetMinutesPerWeek} min/week</Badge>
          </>
        }
        title={`Local profile for ${profile.displayName}`}
      />
      <div className="profile-page-grid">
        <Card
          description={
            uiCopy.surfaces.homePage.thisRecordIsTheLocalSourceOfTruth
          }
          title={uiCopy.surfaces.homePage.savedProfile}
          variant="accent"
        >
          <div className="profile-preview-card">
            <ProfileAvatar avatarConfig={profile.avatarConfig} />
            <dl className="profile-summary-list">
              <div>
                <dt>{uiCopy.surfaces.homePage.displayName}</dt>
                <dd>{profile.displayName}</dd>
              </div>
              <div>
                <dt>{uiCopy.surfaces.homePage.studyDays}</dt>
                <dd>{formatStudyDays(profile.targetStudyDays)}</dd>
              </div>
              <div>
                <dt>{uiCopy.surfaces.homePage.theme}</dt>
                <dd>{getThemeLabel(profile.preferredTheme)}</dd>
              </div>
              <div>
                <dt>{uiCopy.surfaces.homePage.motion}</dt>
                <dd>
                  {profile.reducedMotion
                    ? uiCopy.surfaces.homePage.reduced
                    : uiCopy.surfaces.homePage.standard}
                </dd>
              </div>
            </dl>
          </div>
        </Card>
        <Card
          description={
            uiCopy.surfaces.homePage
              .progressPalStoresYourProgressInThisBrowserIt
          }
          title={uiCopy.surfaces.homePage.privacyBoundary}
        >
          {null}
        </Card>
      </div>
      <Card
        description={
          uiCopy.surfaces.homePage
            .yourLearningIdentityThemeMotionAndStudySchedule
        }
        title={uiCopy.surfaces.homePage.currentLocalState}
      >
        <dl className="profile-summary-list">
          <div>
            <dt>{uiCopy.surfaces.homePage.weeklyTarget}</dt>
            <dd>{profile.targetMinutesPerWeek} minutes</dd>
          </div>
          <div>
            <dt>{uiCopy.surfaces.homePage.onboardingCompleted}</dt>
            <dd>
              {appMeta?.onboardingCompletedAt ??
                uiCopy.surfaces.homePage.recoveredFromLocalDefaults}
            </dd>
          </div>
        </dl>
      </Card>
    </section>
  );
}
