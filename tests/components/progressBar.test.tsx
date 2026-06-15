import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProgressBar } from '@/components/ui/ProgressBar';

describe('ProgressBar', () => {
  it('renders zero progress honestly', () => {
    render(<ProgressBar label="Zero state" value={0} />);

    expect(
      screen.getByRole('progressbar', { name: 'Zero state' }),
    ).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders partial progress', () => {
    render(<ProgressBar label="Partial state" value={37} />);

    expect(
      screen.getByRole('progressbar', { name: 'Partial state' }),
    ).toHaveAttribute('aria-valuenow', '37');
    expect(screen.getByText('37%')).toBeInTheDocument();
  });

  it('renders full progress', () => {
    render(<ProgressBar label="Complete state" value={100} />);

    expect(
      screen.getByRole('progressbar', { name: 'Complete state' }),
    ).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps invalid progress values', () => {
    render(
      <>
        <ProgressBar label="Negative state" value={-15} />
        <ProgressBar label="Overflow state" value={180} />
      </>,
    );

    expect(
      screen.getByRole('progressbar', { name: 'Negative state' }),
    ).toHaveAttribute('aria-valuenow', '0');
    expect(
      screen.getByRole('progressbar', { name: 'Overflow state' }),
    ).toHaveAttribute('aria-valuenow', '100');
  });
});
