import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';

describe('Checkbox', () => {
  it('keeps the label clickable and exposes checked state', () => {
    render(
      <Checkbox checked label="Reduce motion" onChange={() => undefined} />,
    );

    expect(screen.getByLabelText('Reduce motion')).toBeChecked();
  });

  it('preserves the adjacent input and indicator structure used by focus CSS', () => {
    render(
      <Checkbox
        description="Neutralizes app motion."
        label="Reduce motion"
        onChange={() => undefined}
      />,
    );

    const input = screen.getByLabelText(/Reduce motion/);
    const indicator = input.nextElementSibling;

    expect(input).toHaveClass('checkbox__input');
    expect(indicator).toHaveClass('checkbox__indicator');
  });
});

describe('status component class contracts', () => {
  it('EmptyState keeps the subtle card and state-card classes', () => {
    render(
      <EmptyState
        description="Nothing has been recorded yet."
        title="No activity yet"
      />,
    );

    const card = screen.getByText('No activity yet').closest('.card');

    expect(card).toHaveClass('card--subtle');
    expect(card).toHaveClass('state-card');
  });

  it('LoadingState keeps the subtle card and loading-state classes', () => {
    render(
      <LoadingState
        description="Opening local data stores."
        title="Preparing your workspace"
      />,
    );

    const card = screen.getByRole('status');

    expect(card).toHaveClass('card--subtle');
    expect(card).toHaveClass('loading-state');
  });

  it('ErrorState keeps the danger card and error-state classes', () => {
    render(
      <ErrorState
        description="Local data could not be loaded."
        title="Startup failed"
      />,
    );

    const card = screen.getByRole('alert');

    expect(card).toHaveClass('card--danger');
    expect(card).toHaveClass('error-state');
  });
});
