import { cleanup, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
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
 * Owner decision 2026-10-03 (Epic E continuation §13): lesson behaviour is
 * shared, presentation is contextual. In RPG — the primary experience — a
 * lesson and the module checkpoint are built from the RPG primitives (panels,
 * page header, buttons), not a Classic document dropped into the RPG shell.
 * Classic keeps its simpler cards. The same exercises, controls and data
 * paths are rendered in both.
 */

const p2 = programvareutviklingDefinition;

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
  await enrolAndSwitchActiveProgramme(p2.programmeId, { seed: p2.catalogue });
});

async function lessonAt(route: string) {
  await renderAppAtRoute(route);
  return screen.findByRole('article', { name: /./ }, { timeout: 15_000 });
}

function exerciseNames(lesson: HTMLElement) {
  return within(lesson)
    .getAllByRole('group', { name: /^Oppgave \d+/ })
    .map((group) => group.getAttribute('aria-labelledby') ?? '')
    .map((id) => document.getElementById(id)?.textContent ?? id);
}

describe('contextual lesson presentation', () => {
  it('renders the Classic lesson with Classic cards and no RPG primitives', async () => {
    const lesson = await lessonAt('/course/s1-m01-o02');

    expect(lesson).toHaveAttribute('data-presentation', 'classic');
    expect(lesson.querySelector('.card')).not.toBeNull();
    expect(lesson.querySelector('[class*="rpg-"]')).toBeNull();
  });

  it('renders the RPG lesson from RPG primitives, not Classic cards', async () => {
    const lesson = await lessonAt('/rpg/resource/s1-m01-o02');

    expect(lesson).toHaveAttribute('data-presentation', 'rpg');
    expect(lesson.querySelector('.card')).toBeNull();
    expect(lesson.querySelector('.rpg-page-header')).not.toBeNull();
    for (const group of within(lesson).getAllByRole('group', {
      name: /^Oppgave \d+/,
    })) {
      expect(
        group.closest('.rpg-panel'),
        'exercise inside an RPG panel',
      ).not.toBeNull();
    }
    for (const button of within(lesson).getAllByRole('button', {
      name: 'Sjekk svaret',
    })) {
      expect(button.className).toMatch(/\brpg-button\b/);
    }
  });

  it('renders the module checkpoint as part of the RPG journey', async () => {
    const lesson = await lessonAt('/rpg/resource/s1-m01-chk');

    expect(lesson).toHaveAttribute('data-presentation', 'rpg');
    expect(lesson).toHaveTextContent('Modulsjekk');
    expect(lesson.querySelector('.card')).toBeNull();
    expect(lesson.querySelector('.rpg-panel')).not.toBeNull();
  });

  it('shares the same exercises and controls in both presentations', async () => {
    const classic = exerciseNames(await lessonAt('/course/s1-m01-o02'));
    cleanup();
    const rpg = exerciseNames(await lessonAt('/rpg/resource/s1-m01-o02'));

    expect(classic.length).toBeGreaterThan(0);
    expect(rpg).toEqual(classic);
  });
});
