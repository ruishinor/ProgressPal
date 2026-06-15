import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusPill } from '@/components/ui/StatusPill';

type PlaceholderPageProps = {
  nextAction: string;
  routeLabel: string;
  summary: string;
  title: string;
};

export function PlaceholderPage({
  nextAction,
  routeLabel,
  summary,
  title,
}: PlaceholderPageProps) {
  return (
    <section className="page-section">
      <PageHeader
        description={summary}
        eyebrow={routeLabel}
        meta={
          <>
            <StatusPill variant="planned">Feature placeholder</StatusPill>
            <Badge tone="neutral">Real logic deferred</Badge>
          </>
        }
        title={title}
      />
      <div className="placeholder-grid">
        <Card
          className="placeholder-card"
          description="These routes now inherit the shared visual system without pretending their domain workflows are complete."
          title="Why this stays minimal"
          variant="accent"
        >
          <div className="placeholder-card__support">
            <p>
              The shell, forms, statuses, and progress primitives are ready for
              later modules. Route-specific metrics and controls remain out of
              scope until their assigned modules land.
            </p>
            <ProgressBar
              helperText="Foundation work complete. Feature work intentionally deferred."
              label="This route's implementation depth"
              tone="neutral"
              value={18}
            />
          </div>
        </Card>
        <EmptyState
          action={
            <Button disabled variant="secondary">
              Later module required
            </Button>
          }
          description={nextAction}
          eyebrow="Next action"
          title="The route stays honest for now"
        />
      </div>
    </section>
  );
}
