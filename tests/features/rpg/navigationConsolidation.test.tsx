import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  initializeDatabase,
  saveLearnerProfile,
  type SaveLearnerProfileInput,
} from '@/lib/db';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { bundledCourseSeed } from '@/seed';

const learnerProfileInput: SaveLearnerProfileInput = {
  avatarConfig: { face: 'square', hair: 'parted', topColor: 'ocean' },
  displayName: 'Alex',
  preferredTheme: 'dark',
  reducedMotion: true,
  targetMinutesPerWeek: 360,
  targetStudyDays: ['monday', 'thursday'],
};

async function seedOnboardedLearner() {
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(learnerProfileInput, { completeOnboarding: true });
}

function getPrimaryNav() {
  return screen.getByRole('navigation', { name: 'RPG primary navigation' });
}

describe('RPG navigation consolidation', () => {
  describe('persistent primary navigation', () => {
    it('is exactly Home, Campaign, Focus, Awards, Insights, in that order', async () => {
      await seedOnboardedLearner();
      await renderAppAtRoute('/rpg');
      await screen.findByTestId('rpg-shell');

      const links = within(getPrimaryNav()).getAllByRole('link');

      expect(
        links.map((link) => [link.textContent, link.getAttribute('href')]),
      ).toEqual([
        ['Home', '/rpg'],
        ['Campaign', '/rpg/map'],
        ['Focus', '/rpg/focus'],
        ['Awards', '/rpg/badges'],
        ['Insights', '/rpg/log'],
      ]);
    });

    it('does not carry Hero, Profile or the old Map label', async () => {
      await seedOnboardedLearner();
      await renderAppAtRoute('/rpg');
      await screen.findByTestId('rpg-shell');

      for (const label of [/hero/i, /profile/i, /^map$/i]) {
        expect(
          within(getPrimaryNav()).queryByRole('link', { name: label }),
        ).not.toBeInTheDocument();
      }
    });

    it.each([
      ['/rpg', 'Home'],
      ['/rpg/map', 'Campaign'],
      ['/rpg/week/week-4', 'Campaign'],
      ['/rpg/focus', 'Focus'],
      ['/rpg/badges', 'Awards'],
      ['/rpg/log', 'Insights'],
    ])('marks exactly %s as the %s destination', async (route, label) => {
      await seedOnboardedLearner();
      await renderAppAtRoute(route);
      await screen.findByTestId('rpg-shell');

      const current = within(getPrimaryNav()).getAllByRole('link', {
        current: 'page',
      });

      expect(current).toHaveLength(1);
      expect(current[0]).toHaveAccessibleName(label);
    });
  });

  describe('Home as the primary landing destination', () => {
    it('lands on Home from the root without a redirect loop', async () => {
      await seedOnboardedLearner();
      await renderAppAtRoute('/');

      expect(
        await screen.findByRole('heading', { name: 'Home' }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe('/rpg');
      expect(
        within(getPrimaryNav()).getByRole('link', { current: 'page' }),
      ).toHaveAccessibleName('Home');
    });

    it('lands on Home at /rpg and keeps explicit deep links', async () => {
      await seedOnboardedLearner();
      await renderAppAtRoute('/rpg');

      expect(
        await screen.findByRole('heading', { name: 'Home' }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe('/rpg');

      cleanup();
      await renderAppAtRoute('/rpg/map');

      expect(
        await screen.findByRole('heading', { name: 'Campaign' }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe('/rpg/map');
    });
  });

  describe('Hero Profile entry from the learner avatar', () => {
    it('opens the Hero Profile from the avatar, by keyboard, keeping the avatar art', async () => {
      const user = userEvent.setup();
      await seedOnboardedLearner();
      await renderAppAtRoute('/rpg');

      const profileLink = await screen.findByRole('link', {
        name: 'Open Hero Profile',
      });

      expect(
        screen
          .getByRole('region', { name: 'Persistent hero HUD' })
          .contains(profileLink),
      ).toBe(true);
      expect(profileLink).toHaveAttribute('href', '/rpg/hero');
      expect(
        within(profileLink).getByRole('img', { name: 'Alex hero avatar' }),
      ).toHaveAttribute('data-avatar-source', 'configured');

      profileLink.focus();
      expect(profileLink).toHaveFocus();
      await user.keyboard('{Enter}');

      expect(
        await screen.findByRole('heading', { name: 'Hero Profile' }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe('/rpg/hero');
    });

    it('is reachable from every non-Hero RPG route', async () => {
      await seedOnboardedLearner();

      for (const route of [
        '/rpg',
        '/rpg/map',
        '/rpg/focus',
        '/rpg/badges',
        '/rpg/log',
        '/rpg/resource/week-0-lecture',
      ]) {
        cleanup();
        await renderAppAtRoute(route);

        expect(
          await screen.findByRole('link', { name: 'Open Hero Profile' }),
        ).toHaveAttribute('href', '/rpg/hero');
      }
    });
  });

  describe('Campaign stays the overview; a lesson is its own route', () => {
    it('keeps the Campaign overview structural, without lesson content', async () => {
      await seedOnboardedLearner();
      await renderAppAtRoute('/rpg/map');

      expect(
        await screen.findByRole('heading', { name: 'Campaign' }),
      ).toBeInTheDocument();
      expect(
        await screen.findByRole('heading', { name: 'Course route' }),
      ).toBeInTheDocument();

      // Lesson/resource surfaces live only on /rpg/resource/:itemId.
      expect(
        screen.queryByRole('heading', { name: 'Save progress' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Mark locally complete' }),
      ).not.toBeInTheDocument();
    });

    it('opens a quest on the dedicated lesson route and leaves Campaign', async () => {
      const user = userEvent.setup();
      await seedOnboardedLearner();
      await renderAppAtRoute('/rpg/map');

      const questList = await screen.findByRole('list', {
        name: /quest status/i,
      });
      const questLink = within(questList).getAllByRole('link')[0]!;
      const href = questLink.getAttribute('href');

      expect(href).toMatch(/^\/rpg\/resource\/.+/);

      await user.click(questLink);

      expect(
        await screen.findByRole('heading', { name: 'Save progress' }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe(href);
      expect(
        screen.queryByRole('heading', { name: 'Campaign' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: 'Course route' }),
      ).toBeNull();

      // Campaign is not left marked current while a lesson is open, and the
      // learner has a direct way back.
      const nav = getPrimaryNav();
      expect(
        within(nav).queryAllByRole('link', { current: 'page' }),
      ).toHaveLength(0);
      expect(
        within(nav).getByRole('link', { name: 'Campaign' }),
      ).toHaveAttribute('href', '/rpg/map');

      await user.click(within(nav).getByRole('link', { name: 'Campaign' }));

      await waitFor(() => {
        expect(window.location.pathname).toBe('/rpg/map');
      });
      expect(
        await screen.findByRole('heading', { name: 'Campaign' }),
      ).toBeInTheDocument();
    });
  });
});
