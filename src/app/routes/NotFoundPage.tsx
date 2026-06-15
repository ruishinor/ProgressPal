import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export function NotFoundPage() {
  return (
    <section className="page-section">
      <PageHeader
        description="This path does not exist in the current local app shell."
        eyebrow="Unknown route"
        title="Page not found"
      />
      <EmptyState
        action={
          <Link className="button button--secondary button--md" to="/dashboard">
            Go to dashboard
          </Link>
        }
        description="Use the primary navigation to return to a known route."
        title="No route matches this address"
      />
    </section>
  );
}
