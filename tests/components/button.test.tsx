import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders a disabled button clearly', () => {
    render(<Button disabled>Save progress</Button>);

    expect(
      screen.getByRole('button', { name: 'Save progress' }),
    ).toBeDisabled();
  });

  it('renders a loading button as busy and disabled', () => {
    render(<Button loading>Saving progress</Button>);

    const button = screen.getByRole('button', { name: 'Saving progress' });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
