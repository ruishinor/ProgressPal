import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import {
  RpgHeroIdentity,
  RpgHeroIdentityDetails,
} from '@/features/rpg/components/RpgHeroIdentity';

const identity = {
  classLabel: 'Generalist',
  guildLabel: 'Code Knights',
  pathLabel: 'CS Foundations',
  rankLabel: 'New Learner',
};

function renderHud(showDetails: boolean) {
  return render(
    <MemoryRouter>
      <RpgHeroIdentity
        avatarConfig={null}
        guildHref="/rpg/guild"
        identity={identity}
        name="Alex"
        secondaryStatistic={<a href="/rpg/movement">Activity Level 1</a>}
        showDetails={showDetails}
      />
    </MemoryRouter>,
  );
}

function traitLabels(container: HTMLElement) {
  return [...container.querySelectorAll('.rpg-identity__traits dt')].map(
    (term) => term.textContent,
  );
}

describe('Hero HUD identity lines', () => {
  it('puts the name and Activity on the first line, then Guild and Path', () => {
    const { container } = renderHud(false);
    const headline = container.querySelector('.rpg-identity__headline');

    expect(headline).not.toBeNull();
    expect(within(headline as HTMLElement).getByText('Alex')).toBeVisible();
    expect(
      within(headline as HTMLElement).getByRole('link', {
        name: 'Activity Level 1',
      }),
    ).toBeVisible();
    expect(traitLabels(container)).toEqual(['Guild', 'Path']);
    expect(screen.getByRole('link', { name: 'Code Knights' })).toHaveAttribute(
      'href',
      '/rpg/guild',
    );
  });

  it('adds the extended Class and Rank after Path when details are shown', () => {
    const { container } = renderHud(true);

    expect(traitLabels(container)).toEqual(['Guild', 'Path', 'Class', 'Rank']);
    expect(screen.getByText('Generalist')).toBeVisible();
    expect(screen.getByText('New Learner')).toBeVisible();
  });

  it('lists Programme, Class and Rank as aligned rows in the disclosure', () => {
    const { container } = render(
      <RpgHeroIdentityDetails
        identity={identity}
        programmeTitle="CS50x 2026"
      />,
    );

    expect(traitLabels(container)).toEqual(['Programme', 'Class', 'Rank']);
    expect(screen.getByText('CS50x 2026')).toBeVisible();
  });
});
