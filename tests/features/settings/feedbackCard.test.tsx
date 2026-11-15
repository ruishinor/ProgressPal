import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FeedbackCard } from '@/features/settings/components/FeedbackCard';
import { currentApplicationVersion } from '@/lib/db';

describe('feedback card', () => {
  it('opens a prefilled email with the app version and no learner data', () => {
    render(<FeedbackCard titleAs="h2" />);
    const href =
      screen
        .getByRole('link', { name: 'Send feedback' })
        .getAttribute('href') ?? '';
    const url = new URL(href);

    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('ruishinor@gmail.com');
    expect(url.searchParams.get('subject')).toBe('ProgressPal feedback');
    expect(url.searchParams.get('body')).toMatch(
      new RegExp(
        `App version: ${currentApplicationVersion.replaceAll('.', '\\.')}$`,
      ),
    );
  });
});
