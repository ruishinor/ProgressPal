import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import {
  campaignM02VisualFor,
  campaignM02Visuals,
} from '@/features/lessons/campaignM02Visuals';
import { GitLessonVisual } from '@/features/lessons/GitLessonVisual';

import { p2Modules } from '../../programmes/p2Content';

it('binds every model to exactly one instructional block in M02', () => {
  const units = Object.values(p2Modules).flatMap((module) => module.units);
  for (const visual of campaignM02Visuals) {
    const unit = units.find((entry) => entry.unit_id === visual.lesson);
    const matches = unit?.flow.filter(
      (block) =>
        (block.t === 'text' || block.t === 'orient') &&
        block.nb === visual.anchor,
    );
    expect(matches).toHaveLength(1);
    for (const frame of visual.frames) {
      const labels = frame.cards?.map((card) => card.label) ?? [];
      expect(new Set(labels).size).toBe(labels.length);
    }
    expect(campaignM02VisualFor(visual.lesson, visual.anchor)).toBe(visual);
    const changed = campaignM02VisualFor(visual.lesson, 'Changed source');
    expect(changed).toBeUndefined();
  }
});

it('shows the value change when stepping through an assignment', () => {
  const visual = campaignM02Visuals.find(
    (entry) => entry.lesson === 'S1-M02-L01' && entry.step === 3,
  )!;
  render(<GitLessonVisual visual={visual} />);
  const next = screen.getByRole('button', { name: 'Linje 2' });
  fireEvent.click(next);
  expect(next).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('antall = 5')).toBeVisible();
});
