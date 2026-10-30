import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityIcon } from '@/features/rpg/activity/ActivityIcon';
import { builtinActivities } from '@/lib/domain/activity';

describe('Activity icon roles', () => {
  it.each(['running', 'walking', 'pushups', 'squats', 'cycling'])(
    'uses approved movement artwork for %s',
    (activityId) => {
      const { container } = render(<ActivityIcon activityId={activityId} />);
      expect(container.firstChild).toHaveAttribute(
        'data-activity-icon',
        activityId,
      );
      expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    },
  );

  it.each([
    ...builtinActivities.map(({ id }) => id),
    'custom-movement',
    'general',
    'complete',
    '',
    'toString',
  ])('never assigns the Activity heart to movement ID %s', (activityId) => {
    const { container } = render(<ActivityIcon activityId={activityId} />);
    expect(
      container.querySelector('[data-activity-icon="general"]'),
    ).toBeNull();
  });

  it.each(['kickbacks', 'custom-movement'])(
    'leaves %s to its existing text label when approved art is unavailable',
    (activityId) => {
      const { container } = render(<ActivityIcon activityId={activityId} />);
      expect(container).toBeEmptyDOMElement();
    },
  );

  it('reserves the heart for Activity context and the checkmark for completion', () => {
    const { container, rerender } = render(<ActivityIcon />);
    expect(container.firstChild).toHaveAttribute(
      'data-activity-icon',
      'general',
    );
    rerender(<ActivityIcon complete />);
    expect(container.firstChild).toHaveAttribute(
      'data-activity-icon',
      'complete',
    );
  });
});
