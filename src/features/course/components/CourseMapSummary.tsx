import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusPill } from '@/components/ui/StatusPill';
import type { CourseMapView } from '@/features/course/model';
import { formatMinutes } from '@/features/course/model';

type CourseMapSummaryProps = {
  courseMap: CourseMapView;
};

export function CourseMapSummary({ courseMap }: CourseMapSummaryProps) {
  const remainingRequiredItems = Math.max(
    courseMap.requiredItemCount - courseMap.completedRequiredItemCount,
    0,
  );

  return (
    <div className="course-map-summary-grid">
      <Card
        description="Required progress stays honest: only completed, submitted, and accepted required items move the main course rollup."
        title="Required progress"
        variant="accent"
      >
        <ProgressBar
          helperText={`${courseMap.completedRequiredItemCount} of ${courseMap.requiredItemCount} required items complete`}
          label="Course completion"
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
        description="The course route now exposes the seeded catalog directly from local data instead of a placeholder."
        title="Catalog"
      >
        <dl className="course-map-stat-list">
          <div>
            <dt>Units</dt>
            <dd>{courseMap.unitCount}</dd>
          </div>
          <div>
            <dt>Items</dt>
            <dd>{courseMap.itemCount}</dd>
          </div>
          <div>
            <dt>Planned time</dt>
            <dd>{formatMinutes(courseMap.estimatedMinutes)}</dd>
          </div>
        </dl>
      </Card>
      <Card
        description="Item detail, watched-range logging, and later dashboard logic all hang off this stable ordered catalog."
        title="Current focus"
      >
        <div className="course-map-focus-card">
          <StatusPill
            variant={courseMap.blockedItemCount > 0 ? 'blocked' : 'inProgress'}
          >
            {courseMap.blockedItemCount > 0 ? 'Needs attention' : 'Next target'}
          </StatusPill>
          <p className="course-map-focus-card__title">
            {courseMap.nextUnitTitle ?? 'All required units resolved'}
          </p>
          <p className="course-map-focus-card__description">
            {courseMap.blockedItemCount > 0
              ? 'A saved blocked status already exists in the local data, so the course map highlights it instead of pretending progress is clean.'
              : 'The next unfinished required unit is surfaced here so the route works as an operational map, not a decorative catalog.'}
          </p>
        </div>
      </Card>
    </div>
  );
}
