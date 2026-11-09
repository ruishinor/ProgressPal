import uiCopy from '@/ui-copy/interface.json';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

type RpgStubPageProps = {
  description: string;
  title: string;
};

export function RpgStubPage({ description, title }: RpgStubPageProps) {
  return (
    <section className="page-section">
      <PageHeader description={description} eyebrow="RPG shell" title={title} />
      <Card
        description={
          uiCopy.surfaces.rpgRpgStubPage
            .thisRouteIsIntentionallyPresentForRPGShell
        }
        title={uiCopy.surfaces.rpgRpgStubPage.stubRoute}
      >
        <p className="course-item-row__detail">
          {uiCopy.surfaces.rpgRpgStubPage.noRPGFeatureDataIsLoadedOrWritten}
        </p>
      </Card>
    </section>
  );
}
