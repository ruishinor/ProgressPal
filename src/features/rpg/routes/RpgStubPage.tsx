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
        description="This route is intentionally present for RPG shell navigation only. Feature implementation is deferred to its own module."
        title="Stub route"
      >
        <p className="course-item-row__detail">
          No RPG feature data is loaded or written on this shell route.
        </p>
      </Card>
    </section>
  );
}
