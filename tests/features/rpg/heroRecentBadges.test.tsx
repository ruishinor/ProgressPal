import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import { selectRecentBadges } from '@/features/rpg/model/readModels';
import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

/**
 * The full Hero Profile keeps recent accomplishments visible (owner request
 * 2026-10-10): at most three earned badges of the active programme, newest
 * first, each named in text, with the way to the Badge Gallery. Nothing is
 * shown that the learner has not earned, and the persistent HUD gets no
 * badges. Rows here are synthetic, on a fresh learner.
 */

const p2 = programvareutviklingDefinition;
const definitions = p2.policy.achievements;
const titleOf = (id: string) =>
  definitions.find((definition) => definition.id === id)!.title;
const at = (day: number) =>
  new Date(Date.UTC(2026, 9, day, 9, 0, 0)).toISOString();

describe('selectRecentBadges', () => {
  it('lists earned badges newest first, at most three', () => {
    expect(
      selectRecentBadges(
        [
          { achievementId: 'first-step', unlockedAt: at(1) },
          { achievementId: 'p2-code-reader', unlockedAt: at(4) },
          { achievementId: 'p2-error-reader', unlockedAt: at(2) },
          { achievementId: 'p2-foundation-checkpoint', unlockedAt: at(3) },
        ],
        definitions,
      ).map((badge) => badge.id),
    ).toEqual([
      'p2-code-reader',
      'p2-foundation-checkpoint',
      'p2-error-reader',
    ]);
  });

  it('keeps the catalogue order for badges unlocked at the same moment', () => {
    expect(
      selectRecentBadges(
        [
          { achievementId: 'p2-error-reader', unlockedAt: at(2) },
          { achievementId: 'p2-code-reader', unlockedAt: at(2) },
        ],
        definitions,
      ).map((badge) => badge.id),
    ).toEqual(['p2-code-reader', 'p2-error-reader']);
  });

  it('ignores unlocks outside the programme catalogue and handles none, one and two', () => {
    expect(selectRecentBadges([], definitions)).toEqual([]);
    expect(
      selectRecentBadges(
        [
          { achievementId: 'pointer-survivor', unlockedAt: at(9) },
          { achievementId: 'first-step', unlockedAt: at(1) },
        ],
        definitions,
      ),
    ).toEqual([
      { id: 'first-step', title: titleOf('first-step'), unlockedAt: at(1) },
    ]);
    expect(
      selectRecentBadges(
        [
          { achievementId: 'first-step', unlockedAt: at(1) },
          { achievementId: 'p2-code-reader', unlockedAt: at(2) },
        ],
        definitions,
      ).map((badge) => badge.id),
    ).toEqual(['p2-code-reader', 'first-step']);
  });
});

describe('Hero Profile recent badges (real route, fresh learner)', () => {
  beforeEach(async () => {
    closeSharedDatabase();
    getSharedDatabase(resolveDatabaseMigrationContext());
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(
      {
        ...defaultLearnerProfileValues,
        displayName: 'Kari',
        targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
      },
      { completeOnboarding: true },
    );
    await enrolAndSwitchActiveProgramme(p2.programmeId, {
      seed: p2.catalogue,
    });
  });

  async function unlock(rows: ReadonlyArray<[string, number]>) {
    const database = getSharedDatabase();

    for (const [achievementId, day] of rows) {
      await database.achievementUnlocks.put({
        id: `unlock-${achievementId}`,
        createdAt: at(day),
        updatedAt: at(day),
        achievementId,
        unlockedAt: at(day),
        triggerSourceId: 'synthetic-seed',
      });
    }
  }

  /** The panel, once the profile (not its loading state) is shown. */
  async function badgesPanel() {
    const heading = await screen.findByRole(
      'heading',
      { level: 2, name: 'Recent badges' },
      { timeout: 15_000 },
    );

    return heading.closest('section')!;
  }

  it('shows the three newest earned badges by name, with the way to the gallery', async () => {
    await unlock([
      ['first-step', 1],
      ['p2-code-reader', 4],
      ['p2-error-reader', 2],
      ['p2-foundation-checkpoint', 3],
      // Earned in CS50x: not part of this programme's catalogue.
      ['pointer-survivor', 9],
    ]);
    await renderAppAtRoute('/rpg/hero');
    const panel = await badgesPanel();
    const items = within(panel).getAllByRole('listitem');

    expect(items.map((item) => item.textContent)).toEqual([
      titleOf('p2-code-reader'),
      titleOf('p2-foundation-checkpoint'),
      titleOf('p2-error-reader'),
    ]);
    expect(
      within(panel).getByRole('link', { name: 'View all badges' }),
    ).toHaveAttribute('href', '/rpg/badges');
    expect(screen.getByText('4 of 13')).toBeInTheDocument();
  });

  it('shows a single earned badge, and an honest empty state with none', async () => {
    await unlock([['first-step', 1]]);
    await renderAppAtRoute('/rpg/hero');
    const panel = await badgesPanel();

    expect(
      within(panel)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([titleOf('first-step')]);
  });

  it('says where badges will appear before any is earned', async () => {
    await renderAppAtRoute('/rpg/hero');
    const panel = await badgesPanel();

    expect(within(panel).queryAllByRole('listitem')).toEqual([]);
    expect(panel).toHaveTextContent('The badges you earn will appear here.');
    expect(
      within(panel).getByRole('link', { name: 'View all badges' }),
    ).toBeInTheDocument();
  });

  it('keeps the persistent HUD free of badges', async () => {
    await unlock([['first-step', 1]]);
    await renderAppAtRoute('/rpg/map');
    const hud = await screen.findByRole(
      'region',
      { name: 'Persistent hero HUD' },
      { timeout: 15_000 },
    );

    expect(hud).not.toHaveTextContent(titleOf('first-step'));
    expect(within(hud).queryAllByRole('img')).toHaveLength(
      within(hud).queryAllByRole('img', { name: /avatar/ }).length,
    );
  });
});
