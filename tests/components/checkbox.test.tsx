import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Checkbox } from '@/components/ui/Checkbox';

describe('Checkbox', () => {
  it('keeps the label clickable and exposes checked state', () => {
    render(
      <Checkbox checked label="Reduce motion" onChange={() => undefined} />,
    );

    expect(screen.getByLabelText('Reduce motion')).toBeChecked();
  });
});
