import { Card } from '@/components/ui/Card';
import { currentApplicationVersion } from '@/lib/db';

import { feedbackAddress, feedbackMailto } from '../feedbackModel';

/** Opens the learner's own email app; the app itself sends nothing. */
export function FeedbackCard({ titleAs }: { titleAs: 'h2' | 'h3' }) {
  return (
    <Card title="Feedback" titleAs={titleAs}>
      <p className="card__description">
        Found a problem or have an idea? Your email app opens with the app
        version filled in. Nothing is sent until you send the email. Please
        leave out passwords and other sensitive details. You can also write to{' '}
        {feedbackAddress}.
      </p>
      <div className="action-row">
        <a
          className="button button--secondary button--md"
          href={feedbackMailto(currentApplicationVersion)}
        >
          Send feedback
        </a>
      </div>
    </Card>
  );
}
