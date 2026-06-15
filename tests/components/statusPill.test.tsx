import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusPill } from '@/components/ui/StatusPill';

describe('StatusPill', () => {
  it('renders the core variants', () => {
    render(
      <>
        <StatusPill variant="notStarted" />
        <StatusPill variant="inProgress" />
        <StatusPill variant="completed" />
        <StatusPill variant="blocked" />
        <StatusPill variant="optional" />
      </>,
    );

    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });
});
