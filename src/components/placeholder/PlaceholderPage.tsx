import uiCopy from '@/ui-copy/interface.json';
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
            <StatusPill variant="planned">
              {uiCopy.surfaces.placeholderPage.featurePlaceholder}
            </StatusPill>
            <Badge tone="neutral">
              {uiCopy.surfaces.placeholderPage.realLogicDeferred}
            </Badge>
          </>
        }
        title={title}
      />
      <div className="placeholder-grid">
        <Card
          className="placeholder-card"
          description={
            uiCopy.surfaces.placeholderPage
              .theseRoutesNowInheritTheSharedVisualSystem
          }
          title={uiCopy.surfaces.placeholderPage.whyThisStaysMinimal}
          variant="accent"
        >
          <div className="placeholder-card__support">
            <p>
              {
                uiCopy.surfaces.placeholderPage
                  .theShellFormsStatusesAndProgressPrimitivesAre
              }
            </p>
            <ProgressBar
              helperText={
                uiCopy.surfaces.placeholderPage
                  .foundationWorkCompleteFeatureWorkIntentionallyDeferred
              }
              label={
                uiCopy.surfaces.placeholderPage.thisRouteSImplementationDepth
              }
              tone="neutral"
              value={18}
            />
          </div>
        </Card>
        <EmptyState
          action={
            <Button disabled variant="secondary">
              {uiCopy.surfaces.placeholderPage.laterModuleRequired}
            </Button>
          }
          description={nextAction}
          eyebrow="Next action"
          title={uiCopy.surfaces.placeholderPage.theRouteStaysHonestForNow}
        />
      </div>
    </section>
  );
}
