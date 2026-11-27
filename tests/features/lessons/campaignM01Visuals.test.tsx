import { createHash } from 'node:crypto';

import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import {
  campaignM01Editorial,
  campaignM01SourceSha,
  campaignM01TextKey,
  reviseCampaignM01,
} from '@/features/lessons/campaignM01Editorial';
import {
  campaignM01VisualFor,
  campaignM01VisualPath,
  campaignM01VisualSha,
} from '@/features/lessons/campaignM01Visuals';
import type { GitVisual } from '@/features/lessons/gitVisuals';
import { GitLessonVisual } from '@/features/lessons/GitLessonVisual';
import { InlineText, Markup } from '@/features/lessons/markup';

import { p2Catalogue, p2Modules, readP2Asset } from '../../programmes/p2Content';

const visualText = readP2Asset(campaignM01VisualPath);
const campaignM01Visuals = JSON.parse(visualText) as readonly GitVisual[];

it('ships the pinned visual data in the offline asset list', () => {
  expect(createHash('sha256').update(visualText).digest('hex')).toBe(
    campaignM01VisualSha,
  );
  expect(JSON.parse(readP2Asset('content/offline.json')).assets).toContain(
    '/' + campaignM01VisualPath,
  );
});

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
    expect(
      campaignM01VisualFor(campaignM01Visuals, visual.lesson, block.nb),
    ).toBe(visual);
    expect(
      campaignM01VisualFor(campaignM01Visuals, 'S1-M02-L01', block.nb),
    ).toBeUndefined();
    expect(
      campaignM01VisualFor(campaignM01Visuals, visual.lesson, ''),
    ).toBeUndefined();
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

it('applies editorial revisions only to exact source strings', () => {
  expect(p2Catalogue.sourceSha256).toBe(campaignM01SourceSha);
  const strings = new Set<string>();
  function collect(value: unknown) {
    if (typeof value === 'string') {
      strings.add(value);
    } else if (value !== null && typeof value === 'object') {
      Object.values(value).forEach(collect);
    }
  }
  collect(p2Modules['S1-M01']);
  for (const [key, revised] of campaignM01Editorial) {
    const matches = [...strings].filter(
      (text) => campaignM01TextKey(text) === key,
    );
    expect(matches).toHaveLength(1);
    const original = matches[0]!;
    expect(reviseCampaignM01(original)).toBe(revised);
    expect(reviseCampaignM01(original + '!')).toBe(original + '!');
  }
});

it('revises learner prose without changing a fenced code example', () => {
  const original = 'Sjekkliste: oppsettet ditt (kun for deg, ingen poeng).';
  const context = {
    technicalLanguage: 'en',
    wording: (text: string) => text,
    editorial: reviseCampaignM01,
    headingLevel: 3 as const,
  };
  const fenced = ['```', original, '```'].join('\n');
  render(
    <>
      <InlineText context={context} text={original} />
      <Markup context={context} text={fenced} />
    </>,
  );
  expect(screen.getByText('Sjekkliste: oppsettet ditt.')).toBeVisible();
  expect(screen.getByText(original)).toBeVisible();
});
