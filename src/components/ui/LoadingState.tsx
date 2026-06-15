import { Card } from '@/components/ui/Card';

export type LoadingStateProps = {
  description: string;
  title: string;
};

export function LoadingState({ description, title }: LoadingStateProps) {
  return (
    <Card className="loading-state" role="status" variant="subtle">
      <div className="loading-state__header">
        <span aria-hidden="true" className="loading-state__bar" />
        <div>
          <h3 className="loading-state__title">{title}</h3>
          <p className="loading-state__description">{description}</p>
        </div>
      </div>
      <div aria-hidden="true" className="loading-state__skeleton">
        <span className="loading-state__line loading-state__line--wide" />
        <span className="loading-state__line" />
        <span className="loading-state__line loading-state__line--short" />
      </div>
    </Card>
  );
}
