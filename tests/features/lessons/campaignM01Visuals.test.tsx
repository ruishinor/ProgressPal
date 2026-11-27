import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import {
  campaignM01VisualFor,
  campaignM01Visuals,
} from '@/features/lessons/campaignM01Visuals';
import { GitLessonVisual } from '@/features/lessons/GitLessonVisual';

import { p2Modules } from '../../programmes/p2Content';

it('binds every visual to one existing teaching block in M01', () => {
  const units = p2Modules['S1-M01'].units;
  const keys = new Set<string>();
  for (const visual of campaignM01Visuals) {
    const unit = units.find((entry) => entry.unit_id === visual.lesson);
    const block = unit?.flow[visual.step];
    expect(block).toBeDefined();
    if (block?.t !== 'text' && block?.t !== 'orient') {
      throw new Error('Visual must belong to a teaching block');
    }
    expect(campaignM01VisualFor(visual.lesson, block.nb)).toBe(visual);
    expect(campaignM01VisualFor('S1-M02-L01', block.nb)).toBeUndefined();
    expect(campaignM01VisualFor(visual.lesson, '')).toBeUndefined();
    const key = `${visual.lesson}:${visual.step}`;
    expect(keys.has(key)).toBe(false);
    keys.add(key);
  }
});

it('lets the learner compare the saved and unsaved file', () => {
  const visual = campaignM01Visuals.find(
    (entry) => entry.lesson === 'S1-M01-L01' && entry.frames.length === 2,
  )!;
  render(<GitLessonVisual visual={visual} />);
  const save = screen.getByRole('button', { name: 'Etter Ctrl+S' });
  fireEvent.click(save);
  expect(save).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Hei, Ola!', { exact: true })).toBeVisible();
});
