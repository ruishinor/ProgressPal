import uiCopy from '@/ui-copy/interface.json';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export function NotFoundPage() {
  return (
    <section className="page-section">
      <PageHeader
        description={
          uiCopy.surfaces.notFoundPage.thisPathDoesNotExistInTheCurrent
        }
        eyebrow="Unknown route"
        title={uiCopy.surfaces.notFoundPage.pageNotFound}
      />
      <EmptyState
        action={
          <Link className="button button--secondary button--md" to="/dashboard">
            {uiCopy.surfaces.notFoundPage.goToDashboard}
          </Link>
        }
        description={
          uiCopy.surfaces.notFoundPage.useThePrimaryNavigationToReturnToA
        }
        title={uiCopy.surfaces.notFoundPage.noRouteMatchesThisAddress}
      />
    </section>
  );
}
