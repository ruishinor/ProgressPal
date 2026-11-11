import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  getLessonPosition,
  initializeDatabase,
  listLearnerEvidence,
  saveLearnerProfile,
  saveLessonPosition,
  submitExerciseAttempt,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { localCoordinationStorageKeys } from '@/lib/storage';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

import type { FakeLockManager } from '../../lib/localDataCoordinationFakes';
import { p2Index as manifest } from '../../programmes/p2Content';

/**
 * Epic E §3 items 6–11 and 16, §7: lessons render through the existing
 * course-item route for item type `lesson`, with Programvareutvikling active
 * in the real composition (real registry, real provider, real shells).
 */

const p2 = programvareutviklingDefinition;
const exerciseMeta = new Map(
  manifest.exercises.map((entry) => [entry.exerciseId, entry]),
);

beforeEach(() => {
  closeSharedDatabase();
  getSharedDatabase(resolveDatabaseMigrationContext());
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem(localCoordinationStorageKeys.message);
  localStorage.removeItem(localCoordinationStorageKeys.revision);
});

async function onboardWithProgrammeActive() {
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
}

async function openLesson(itemId: string) {
  await onboardWithProgrammeActive();
  await renderAppAtRoute(`/course/${itemId}`);
  return screen.findByRole('article', { name: /./ }, { timeout: 15_000 });
}

function exerciseGroup(number: number) {
  return screen.getByRole('group', {
    name: new RegExp(`^Oppgave ${number}\\b`),
  });
}

describe('lesson rendering (DC-01 to DC-07, DC-43)', () => {
  it('exposes the mission language, accessible name and estimated duration', async () => {
    const lesson = await openLesson('s1-m01-o01');

    expect(lesson).toHaveAttribute('lang', 'nb');
    const heading = within(lesson).getByRole('heading', {
      level: 1,
      name: /\S/,
    });
    expect(lesson).toHaveAttribute('aria-labelledby', heading.id);
    expect(lesson).toHaveAccessibleName(heading.textContent);
    expect(lesson.querySelector('header > p')).toHaveTextContent(/\b70\b/);
  });

  it('marks code and terminal text as preformatted English technical text', async () => {
    const lesson = await openLesson('s1-m01-o01');
    const preformatted = lesson.querySelectorAll('pre');

    expect(preformatted.length).toBeGreaterThan(0);
    for (const element of preformatted) {
      expect(element).toHaveAttribute('lang', 'en');
      expect(element).toHaveAttribute('tabindex', '0');
    }
  });

  it('exposes no unit, skill, objective or exercise identifier, gating role or difficulty', async () => {
    const lesson = await openLesson('s1-m01-chk');
    const text = lesson.textContent ?? '';

    expect(text).not.toMatch(
      /S1-M0\d|SK-[A-Z]{3}|LO-[A-Z]{3}|critical-gate|mastery_gate|required-supporting/,
    );
  });

  it('renders traceback text such as <module> as text, never as markup', async () => {
    const lesson = await openLesson('s1-m01-o06');

    expect(lesson).toHaveTextContent('<module>');
    expect(document.querySelector('module')).toBeNull();
  });

  it('advances to the next phase and saves its position', async () => {
    const lesson = await openLesson('s1-m02-o05');

    const previous = () =>
      within(lesson).queryByRole('button', {
        name: p2.content.lessons!.copy!.text.previousPhase,
      });
    expect(previous()).toBeNull();
    fireEvent.click(
      within(lesson).getByRole('button', {
        name: p2.content.lessons!.copy!.text.nextPhase,
      }),
    );
    await waitFor(async () => {
      expect(previous()).toBeEnabled();
      const position = await getLessonPosition('s1-m02-o05');
      expect(position?.stepIndex).toBeGreaterThan(0);
      expect(
        lesson.querySelector('[id$="-step-' + position!.stepIndex + '"]'),
      ).toBeInTheDocument();
    });
  });

  it('exposes zero completed criteria for an untouched checkpoint', async () => {
    const lesson = await openLesson('s1-m01-chk');

    const checkpoint = lesson.querySelector(
      ':scope > p.lesson-note[role="status"]',
    );
    expect(checkpoint).toBeVisible();
    const counts = checkpoint?.textContent?.match(/\d+/g)?.map(Number);
    expect(counts).toEqual([0, expect.any(Number)]);
    expect(counts![1]).toBeGreaterThan(0);
  });
});

describe('version coherence (schema record §5, prompt §4.5)', () => {
  it('exposes an alert and no submission when lesson content has a version mismatch', async () => {
    vi.spyOn(p2.content.lessons!, 'loadLesson').mockResolvedValue({
      status: 'version_mismatch',
      reason: 'test',
    });
    await onboardWithProgrammeActive();
    await renderAppAtRoute('/course/s1-m01-o01');

    expect(
      await screen.findByRole('alert', {}, { timeout: 15_000 }),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Sjekk svaret' })).toBeNull();
  });
});

describe('hints, submission and feedback (DC-15 to DC-17, DC-23, invariants 5 and 6)', () => {
  const choiceId = 'S1-M01-P01-E03';

  it('shows a hint only after its support event is durable', async () => {
    await openLesson('s1-m01-o01');
    const group = exerciseGroup(3);
    fireEvent.click(
      within(group).getByRole('button', { name: /Vis hint 1 av 1/ }),
    );

    await within(group).findByText(/^Hint 1/);
    const rows = await listLearnerEvidence();
    expect(rows).toEqual([
      expect.objectContaining({
        kind: 'support_event',
        supportKind: 'hint_reveal',
        hintNumber: 1,
        subjectId: exerciseMeta.get(choiceId)!.subjectId,
      }),
    ]);
  });

  it('shows no feedback before the terminal result commits, then feedback for that result', async () => {
    await openLesson('s1-m01-o01');
    const group = exerciseGroup(3);

    expect(within(group).queryByRole('status', { name: /\S/ })).toBeNull();
    fireEvent.click(within(group).getAllByRole('radio')[0]!);
    fireEvent.click(
      within(group).getByRole('button', { name: 'Sjekk svaret' }),
    );

    const status = await within(group).findByRole('status', {
      name: /Resultat/,
    });
    const rows = await listLearnerEvidence();
    expect(rows.map((row) => row.kind)).toEqual([
      'exercise_attempt',
      'evaluation_result',
    ]);
    const result = rows[1];
    expect(result?.kind).toBe('evaluation_result');
    if (result?.kind !== 'evaluation_result') throw new Error('Missing result');
    expect(['correct', 'incorrect']).toContain(result.outcome);
    expect(status).toHaveClass(
      result.outcome === 'correct'
        ? 'lesson-result--success'
        : 'lesson-result--neutral',
    );
  });

  it('cannot reveal a hint or submit in a read-only tab', async () => {
    await onboardWithProgrammeActive();
    const locks = navigator.locks as unknown as FakeLockManager;
    await locks.hold(localCoordinationStorageKeys.presenceLock, 'shared');
    await locks.hold(localCoordinationStorageKeys.writerLock, 'exclusive');
    await renderAppAtRoute('/course/s1-m01-o01');
    await screen.findByRole('article', { name: /./ }, { timeout: 15_000 });
    const group = exerciseGroup(3);

    await waitFor(() => {
      expect(
        within(group).getByRole('button', { name: /Vis hint/ }),
      ).toBeDisabled();
      expect(
        within(group).getByRole('button', { name: 'Sjekk svaret' }),
      ).toBeDisabled();
    });
    expect(await listLearnerEvidence()).toEqual([]);
  });
});

describe('runtime-dependent exercises while executable evaluation is unavailable (§4.2, §4.5)', () => {
  it('disables submit with an honest unavailable state and creates no attempt', async () => {
    const lesson = await openLesson('s1-m01-o03');
    const programGroup = within(lesson)
      .getAllByRole('group', { name: /^Oppgave \d+/ })
      .find((group) =>
        /Skriv eller endre program/.test(group.textContent ?? ''),
      )!;

    expect(
      within(programGroup).getByRole('button', { name: 'Sjekk svaret' }),
    ).toBeDisabled();
    expect(await listLearnerEvidence()).toEqual([]);
  });
});

describe('K-3 (owner rule 2026-10-03): a checkpoint task can be retried as a new attempt', () => {
  it('offers Prøv igjen after an incorrect checkpoint answer and records the retry as attempt 2', async () => {
    const lesson = await openLesson('s1-m01-chk');
    const group = within(lesson)
      .getAllByRole('group', { name: /^Oppgave \d+/ })
      .find((entry) => /Skriv kommandoen/.test(entry.textContent ?? ''))!;
    const field = within(group).getByRole('textbox');

    await waitFor(() => expect(field).toBeEnabled());
    fireEvent.change(field, { target: { value: 'not a command' } });
    fireEvent.click(
      within(group).getByRole('button', { name: 'Sjekk svaret' }),
    );
    await within(group).findByText('Ikke riktig ennå', {}, { timeout: 15_000 });

    // Write controls stay disabled through the shell's refresh after a
    // committed mutation, as the answer field does before the first submit.
    const retry = within(group).getByRole('button', { name: 'Prøv igjen' });
    await waitFor(() => expect(retry).toBeEnabled());
    fireEvent.click(retry);
    const retryField = within(group).getByRole('textbox');
    fireEvent.change(retryField, { target: { value: 'still not a command' } });
    fireEvent.click(
      within(group).getByRole('button', { name: 'Sjekk svaret' }),
    );

    await waitFor(async () => {
      const attempts = (await listLearnerEvidence()).filter(
        (row) => row.kind === 'exercise_attempt',
      );
      expect(attempts.map((row) => row.attemptNumber)).toEqual([1, 2]);
    });
    // The second submission settles (result, bookmark and refresh) before the
    // test ends, so teardown never closes the database under it.
    await within(group).findByText('Ikke riktig ennå', {}, { timeout: 15_000 });
    await waitFor(() =>
      expect(
        within(group).getByRole('button', { name: 'Prøv igjen' }),
      ).toBeEnabled(),
    );
  });
});

describe('resume and recovery (DC-06, invariant 10)', () => {
  it('links to the rendered block at a saved nonzero position', async () => {
    await onboardWithProgrammeActive();
    await saveLessonPosition({
      itemId: 's1-m01-o02',
      programmeId: p2.programmeId,
      contentVersion: manifest.contentVersion,
      unitId: 's1-m01-p02',
      stepIndex: 2,
    });
    await renderAppAtRoute('/course/s1-m01-o02');
    const lesson = await screen.findByRole(
      'article',
      { name: /./ },
      { timeout: 15_000 },
    );

    const resumeLink = await waitFor(() => {
      const link = lesson.querySelector<HTMLAnchorElement>(
        'a[href^="#"][href$="-step-2"]',
      );
      expect(link).toHaveAccessibleName();
      return link!;
    });
    const target = document.getElementById(resumeLink.hash.slice(1));
    expect(lesson).toContainElement(target);
    expect(target).toBeVisible();
  });

  it('finishes an interrupted attempt on load without creating another attempt', async () => {
    await onboardWithProgrammeActive();
    const meta = exerciseMeta.get('S1-M01-P01-E03')!;
    await submitExerciseAttempt({
      id: 'attempt-interrupted',
      programmeId: p2.programmeId,
      contentVersion: manifest.contentVersion,
      subjectId: meta.subjectId,
      contentHash: meta.contentHash,
      responseMode: 'mcq',
      answer: { selected: ['a'] },
    });
    await renderAppAtRoute('/course/s1-m01-o01');
    await screen.findByRole('article', { name: /./ }, { timeout: 15_000 });

    await within(exerciseGroup(3)).findByRole('status', { name: /Resultat/ });
    const rows = await listLearnerEvidence();
    expect(rows.filter((row) => row.kind === 'exercise_attempt')).toHaveLength(
      1,
    );
    expect(rows.filter((row) => row.kind === 'evaluation_result')).toEqual([
      expect.objectContaining({ attemptId: 'attempt-interrupted' }),
    ]);
  });
});
