import { readFileSync } from 'node:fs';
import path from 'node:path';

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  RpgButton,
  RpgEmptyState,
  RpgPanel,
  RpgProgressBar,
  RpgQuestRow,
  RpgRankBadge,
  RpgResourceCard,
  RpgStatusPill,
} from '@/features/rpg';

describe('RPG visual primitives', () => {
  it('renders panel, rank, and empty-state text as DOM text', () => {
    render(
      <div className="rpg-shell">
        <RpgPanel
          description="Local progress summary"
          footer={<RpgRankBadge rank="Apprentice" />}
          title="Command table"
        >
          <p>Continue with Week 4.</p>
        </RpgPanel>
        <RpgEmptyState
          description="Start by opening the campaign map."
          eyebrow="No pending quest"
          title="Nothing queued"
        />
      </div>,
    );

    expect(
      screen.getByRole('heading', { name: 'Command table' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Local progress summary')).toBeInTheDocument();
    expect(screen.getByText('Continue with Week 4.')).toBeInTheDocument();
    expect(screen.getByText('Rank:')).toBeInTheDocument();
    expect(screen.getByText('Apprentice')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Nothing queued' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Start by opening the campaign map.'),
    ).toBeInTheDocument();
  });

  it('renders semantic button and link controls', () => {
    render(
      <div className="rpg-shell">
        <RpgButton>Save local progress</RpgButton>
        <RpgButton
          href="https://cs50.harvard.edu/x/"
          rel="noopener noreferrer"
          target="_blank"
          variant="quiet"
        >
          Open official CS50x resource
        </RpgButton>
      </div>,
    );

    expect(
      screen.getByRole('button', { name: 'Save local progress' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open official CS50x resource' }),
    ).toHaveAttribute('href', 'https://cs50.harvard.edu/x/');
  });

  it('exposes readable progress labels and clamps values', () => {
    render(
      <div className="rpg-shell">
        <RpgProgressBar
          helperText="Required quests only"
          label="Week 4 completion"
          value={140}
        />
      </div>,
    );

    const progress = screen.getByRole('progressbar', {
      name: 'Week 4 completion',
    });

    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '100');
    expect(progress).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Required quests only')).toBeInTheDocument();
  });

  it('renders status, quest, and resource primitives without color-only state', () => {
    render(
      <div className="rpg-shell">
        <ol>
          <RpgQuestRow
            action={
              <RpgButton href="/rpg/resource/week-4-memory" variant="quiet">
                Open resource
              </RpgButton>
            }
            meta="Lecture - 90 min"
            requiredLabel="Required"
            status={<RpgStatusPill tone="progress">In progress</RpgStatusPill>}
            summary="Local note exists"
            title="Memory"
          />
        </ol>
        <RpgResourceCard
          actions={
            <>
              <RpgButton href="https://cs50.harvard.edu/x/" variant="quiet">
                Open official CS50x resource
              </RpgButton>
              <RpgButton variant="secondary">Start focus session</RpgButton>
            </>
          }
          description="Week 4"
          meta={
            <>
              <RpgStatusPill tone="progress">In progress</RpgStatusPill>
              <span>Required</span>
              <span>Lecture</span>
            </>
          }
          title="Memory"
        >
          <p>Use the official link, then save local progress explicitly.</p>
        </RpgResourceCard>
      </div>,
    );

    const quest = screen.getByRole('listitem');
    expect(within(quest).getByText('Memory')).toBeInTheDocument();
    expect(within(quest).getByText('Required')).toBeInTheDocument();
    expect(within(quest).getByText('In progress')).toBeInTheDocument();
    expect(
      within(quest).getByRole('link', { name: 'Open resource' }),
    ).toHaveAttribute('href', '/rpg/resource/week-4-memory');

    expect(
      screen.getByText(
        'Use the official link, then save local progress explicitly.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start focus session' }),
    ).toBeInTheDocument();
  });

  it('does not render image-dependent primitives', () => {
    const { container } = render(
      <div className="rpg-shell">
        <RpgPanel title="Image-free primitive">
          <RpgProgressBar label="Completion" value={45} />
          <RpgStatusPill tone="warning">Needs review</RpgStatusPill>
        </RpgPanel>
      </div>,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('picture')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
  });
});

describe('RPG primitive CSS scope', () => {
  it('defines required tokens only under the RPG shell boundary', () => {
    const tokensCss = readFileSync(
      path.resolve(process.cwd(), 'src/styles/rpg-tokens.css'),
      'utf8',
    );
    const requiredTokens = [
      '--rpg-bg',
      '--rpg-surface',
      '--rpg-surface-raised',
      '--rpg-border',
      '--rpg-border-strong',
      '--rpg-text',
      '--rpg-text-muted',
      '--rpg-accent',
      '--rpg-accent-strong',
      '--rpg-progress',
      '--rpg-success',
      '--rpg-warning',
      '--rpg-danger',
      '--rpg-focus-ring',
    ];

    expect(tokensCss.trim().startsWith('.rpg-shell {')).toBe(true);
    for (const token of requiredTokens) {
      expect(tokensCss).toContain(token);
    }
  });

  it('does not add remote or image asset references to RPG component CSS', () => {
    const componentsCss = readFileSync(
      path.resolve(process.cwd(), 'src/styles/rpg-components.css'),
      'utf8',
    );

    expect(componentsCss).not.toMatch(/url\(/);
    expect(componentsCss).not.toMatch(/https?:\/\//);
  });
});
