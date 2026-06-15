import { Link } from 'react-router-dom';

import { getCourseItemDetailPath } from '@/features/course/paths';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusPill } from '@/components/ui/StatusPill';
import type { CourseMapUnit } from '@/features/course/model';
import { formatMinutes } from '@/features/course/model';

type CourseUnitCardProps = {
  unit: CourseMapUnit;
};

export function CourseUnitCard({ unit }: CourseUnitCardProps) {
  return (
    <Card
      className="course-unit-card"
      data-testid={`course-unit-${unit.id}`}
      description={`${unit.typeLabel} · ${formatMinutes(unit.estimatedMinutes)} planned`}
      title={unit.title}
      titleAs="h3"
    >
      <div className="course-unit-card__header">
        <ProgressBar
          helperText={`${unit.completedRequiredItemCount} of ${unit.requiredItemCount} required items complete`}
          label="Unit rollup"
          showValue={unit.requiredItemCount > 0}
          tone={unit.statusVariant === 'blocked' ? 'warning' : 'accent'}
          value={unit.completionPercent}
        />
        <div className="course-unit-card__meta">
          <StatusPill variant={unit.statusVariant}>
            {unit.statusLabel}
          </StatusPill>
          <Badge tone="neutral">{unit.itemCount} items</Badge>
          <Badge tone="accent">{formatMinutes(unit.estimatedMinutes)}</Badge>
          {unit.optionalItemCount > 0 ? (
            <Badge tone="warning">{unit.optionalItemCount} optional</Badge>
          ) : null}
        </div>
      </div>
      <ol className="course-item-list">
        {unit.items.map((item) => (
          <li
            className="course-item-row"
            data-testid={`course-item-${item.id}`}
            key={item.id}
          >
            <div className="course-item-row__copy">
              <div className="course-item-row__title-row">
                <p className="course-item-row__title">{item.title}</p>
                <Badge tone={item.required ? 'accent' : 'neutral'}>
                  {item.required ? 'Required' : 'Optional'}
                </Badge>
              </div>
              <p className="course-item-row__eyebrow">
                {item.typeLabel} · {formatMinutes(item.estimatedMinutes)}
              </p>
              {item.longFormProgress !== null &&
              item.longFormProgress.hasProgress ? (
                <p className="course-item-row__detail">
                  {item.longFormProgress.summaryLine}
                </p>
              ) : null}
            </div>
            <div className="course-item-row__aside">
              <StatusPill variant={item.statusVariant}>
                {item.statusLabel}
              </StatusPill>
              <Link
                className="button button--quiet button--md"
                to={getCourseItemDetailPath(item.id)}
              >
                Open detail
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
