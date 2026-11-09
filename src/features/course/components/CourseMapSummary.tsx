import uiCopy from '@/ui-copy/interface.json';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusPill } from '@/components/ui/StatusPill';
import type { CourseMapView } from '@/features/course/model';
import { formatEstimatedMinutes } from '@/lib/time';
import { useAppState } from '@/lib/appState';
import { requireProgrammeScope } from '@/lib/domain';

type CourseMapSummaryProps = {
  courseMap: CourseMapView;
};

export function CourseMapSummary({ courseMap }: CourseMapSummaryProps) {
  const { copy } = requireProgrammeScope(useAppState().programmeScope).content
    .terminology;
  const remainingRequiredItems = Math.max(
    courseMap.requiredItemCount - courseMap.completedRequiredItemCount,
    0,
  );

  return (
    <div className="course-map-summary-grid">
      <Card
        description={
          uiCopy.surfaces.courseCourseMapSummary
            .requiredProgressStaysHonestOnlyCompletedSubmittedAnd
        }
        title={uiCopy.surfaces.courseCourseMapSummary.requiredProgress}
        variant="accent"
      >
        <ProgressBar
          helperText={`${courseMap.completedRequiredItemCount} of ${courseMap.requiredItemCount} required tasks complete`}
          label={uiCopy.surfaces.courseCourseMapSummary.courseCompletion}
          tone={courseMap.blockedItemCount > 0 ? 'warning' : 'accent'}
          value={courseMap.completionPercent}
        />
        <div className="meta-cluster">
          <Badge tone="accent">{remainingRequiredItems} remaining</Badge>
          <Badge tone="neutral">{courseMap.optionalItemCount} optional</Badge>
          {courseMap.blockedItemCount > 0 ? (
            <Badge tone="warning">{courseMap.blockedItemCount} blocked</Badge>
          ) : null}
        </div>
      </Card>
      <Card
        description={copy.catalogueDescription}
        title={uiCopy.surfaces.courseCourseMapSummary.catalog}
      >
        <dl className="course-map-stat-list">
          <div>
            <dt>{uiCopy.surfaces.courseCourseMapSummary.units}</dt>
            <dd>{courseMap.unitCount}</dd>
          </div>
          <div>
            <dt>{uiCopy.surfaces.courseCourseMapSummary.tasks}</dt>
            <dd>{courseMap.itemCount}</dd>
          </div>
          <div>
            <dt>{uiCopy.surfaces.courseCourseMapSummary.plannedTime}</dt>
            <dd>{formatEstimatedMinutes(courseMap.estimatedMinutes)}</dd>
          </div>
        </dl>
      </Card>
      <Card
        description={
          uiCopy.surfaces.courseCourseMapSummary
            .openAnyTaskToTrackYourProgressYour
        }
        title={uiCopy.surfaces.courseCourseMapSummary.currentFocus}
      >
        <div className="course-map-focus-card">
          <StatusPill
            variant={courseMap.blockedItemCount > 0 ? 'blocked' : 'inProgress'}
          >
            {courseMap.blockedItemCount > 0
              ? uiCopy.surfaces.courseCourseMapSummary.needsAttention
              : uiCopy.surfaces.courseCourseMapSummary.nextTarget}
          </StatusPill>
          <p className="course-map-focus-card__title">
            {courseMap.nextUnitTitle ??
              uiCopy.surfaces.courseCourseMapSummary.allRequiredUnitsResolved}
          </p>
          <p className="course-map-focus-card__description">
            {courseMap.blockedItemCount > 0
              ? uiCopy.surfaces.courseCourseMapSummary
                  .atLeastOneItemIsMarkedBlockedResolve
              : uiCopy.surfaces.courseCourseMapSummary
                  .theNextUnfinishedRequiredUnitIsShownHere}
          </p>
        </div>
      </Card>
    </div>
  );
}
