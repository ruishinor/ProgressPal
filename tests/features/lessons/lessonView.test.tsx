import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
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
  it('renders the mission with its type label, honest minutes and goal, in Bokmål from metadata', async () => {
    const lesson = await openLesson('s1-m01-o01');

    expect(lesson).toHaveAttribute('lang', 'nb');
    expect(
      within(lesson).getByRole('heading', {
        level: 1,
        name: 'Sett opp arbeidsstedet',
      }),
    ).toBeInTheDocument();
    expect(lesson).toHaveTextContent('Økt');
    expect(lesson).toHaveTextContent('ca. 70 min');
    expect(lesson).toHaveTextContent(
      'Python og VS Code er på plass, og du har kjørt ditt første program fra terminalen.',
    );
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
      /S1-M0\d|SK-[A-Z]{3}|LO-[A-Z]{3}|critical-gate|mastery_gate|required-supporting|difficulty|vanskelighet/,
    );
  });

  it('renders traceback text such as <module> as text, never as markup', async () => {
    const lesson = await openLesson('s1-m01-o06');

    expect(lesson).toHaveTextContent('<module>');
    expect(document.querySelector('module')).toBeNull();
  });

  it('offers a long mission through its named phases as pause points', async () => {
    const lesson = await openLesson('s1-m02-o05');

    expect(lesson).toHaveTextContent(/Etappe 1 av 3: Forstå de to feilene/);
    fireEvent.click(
      within(lesson).getByRole('button', { name: /Neste etappe/ }),
    );
    await waitFor(() => {
      expect(lesson).toHaveTextContent(
        /Etappe 2 av 3: Rett de første programmene/,
      );
    });
  });

  it('labels the optional reinforcement mission as optional', async () => {
    const lesson = await openLesson('s1-m02-o08');

    expect(lesson).toHaveTextContent('Ekstra øving (valgfri)');
  });

  it('presents an untouched checkpoint plainly, with no pass claim and no rule-missing notice (K-4 decided)', async () => {
    const lesson = await openLesson('s1-m01-chk');

    expect(lesson).toHaveTextContent('Modulsjekk');
    expect(lesson.textContent).not.toMatch(/regelen .* ikke fastsatt/i);
    expect(lesson.textContent).not.toMatch(
      /\bbestått\b(?! eller)|\bklarert\b|\bcleared\b|\bpassed\b/i,
    );
  });

  it('never equates lesson completion with competence', async () => {
    const lesson = await openLesson('s1-m01-o01');

    expect(lesson).toHaveTextContent(
      /Fullført betyr at du har gått gjennom økta\. Det betyr ikke at du har vist at du mestrer/,
    );
  });
});

describe('version coherence (schema record §5, prompt §4.5)', () => {
  it('shows an honest unavailable state when the content does not match this app version', async () => {
    vi.spyOn(p2.content.lessons!, 'loadLesson').mockResolvedValue({
      status: 'version_mismatch',
      reason: 'test',
    });
    await onboardWithProgrammeActive();
    await renderAppAtRoute('/course/s1-m01-o01');

    expect(
      await screen.findByText(
        /Innholdet passer ikke med denne versjonen av appen/,
        {},
        { timeout: 15_000 },
      ),
    ).toBeInTheDocument();
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

    expect(within(group).queryByText(/^(Riktig|Ikke riktig ennå)$/)).toBeNull();
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
    expect(status).toHaveTextContent(/Riktig|Ikke riktig ennå/);
  });

  it('says plainly what ProgressPal can and cannot check in pasted output', async () => {
    await openLesson('s1-m01-o01');
    const group = within(screen.getByRole('article', { name: /./ }))
      .getAllByRole('group', { name: /^Oppgave \d+/ })
      .find((entry) => /py --version/.test(entry.textContent ?? ''))!;

    expect(group).toHaveTextContent(
      /ProgressPal kan sjekke teksten du limer inn, men kan ikke se maskinen din/,
    );
    expect(group.textContent).not.toMatch(/Selvrapportert/);
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

    expect(programGroup).toHaveTextContent(
      /Automatisk kjøring av Python er ikke tilgjengelig/,
    );
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
    expect(group.textContent).not.toMatch(/kan ikke prøves på nytt/);
  });
});

describe('resume and recovery (DC-06, invariant 10)', () => {
  it('lands on the saved position with the content reminder', async () => {
    await onboardWithProgrammeActive();
    await saveLessonPosition({
      itemId: 's1-m01-o02',
      programmeId: p2.programmeId,
      contentVersion: manifest.contentVersion,
      unitId: 's1-m01-p02',
      stepIndex: 0,
    });
    await renderAppAtRoute('/course/s1-m01-o02');
    const lesson = await screen.findByRole(
      'article',
      { name: /./ },
      { timeout: 15_000 },
    );

    expect(
      within(lesson).getByRole('heading', { name: /Fortsett der du slapp/ }),
    ).toBeInTheDocument();
    // The lesson's summaries claim exposure and a goal, not a capability.
    expect(lesson).toHaveTextContent(/Du har gått gjennom dette/);
    expect(lesson.textContent).not.toMatch(/Du kan nå/);
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
