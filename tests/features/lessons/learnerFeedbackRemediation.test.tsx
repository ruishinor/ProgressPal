import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import type { LessonExercise } from '@/lib/domain';
import { localCoordinationStorageKeys } from '@/lib/storage';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

import { p2Modules } from '../../programmes/p2Content';

/**
 * Learner feedback 2026-10-08, product behaviour (LF-014, LF-023–LF-029).
 * Real app, real registry, real exported content, synthetic learner.
 */

const p2 = programvareutviklingDefinition;

beforeEach(() => {
  closeSharedDatabase();
  getSharedDatabase(resolveDatabaseMigrationContext());
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem(localCoordinationStorageKeys.message);
  localStorage.removeItem(localCoordinationStorageKeys.revision);
});

async function openLesson(itemId: string) {
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
  await renderAppAtRoute(`/course/${itemId}`);
  return screen.findByRole('article', { name: /./ }, { timeout: 15_000 });
}

function exerciseOf(id: string) {
  const flow = Object.values(p2Modules).flatMap(
    (module) =>
      (
        module as unknown as {
          units: Array<{ flow: Array<{ t: string }> }>;
        }
      ).units,
  );
  const found = flow
    .flatMap((unit) => unit.flow)
    .find(
      (block) => block.t === 'exercise' && (block as { id?: string }).id === id,
    ) as unknown as LessonExercise | undefined;

  if (found === undefined || found.type !== 'sort') {
    throw new Error(`${id} is not a sort exercise`);
  }

  return found;
}

const group = (number: number) =>
  screen.getByRole('group', { name: new RegExp(`^Oppgave ${number}\\b`) });

describe('LF-014: a stage change moves the learner to the new stage', () => {
  it('focuses and scrolls to the heading of the stage that opens', async () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    const lesson = await openLesson('s1-m01-o03');

    fireEvent.click(
      within(lesson).getByRole('button', { name: 'Neste etappe' }),
    );

    await waitFor(() =>
      expect(document.activeElement).toHaveTextContent(/^Etappe 2 av 2/),
    );
    expect(document.activeElement).toHaveAttribute('tabindex', '-1');
    expect(lesson).toContainElement(document.activeElement as HTMLElement);
    expect(scroll.mock.contexts).toContain(document.activeElement);
  });

  it('does the same when going back to the previous stage', async () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    const lesson = await openLesson('s1-m01-o03');

    fireEvent.click(
      within(lesson).getByRole('button', { name: 'Neste etappe' }),
    );
    await waitFor(() =>
      expect(document.activeElement).toHaveTextContent(/^Etappe 2 av 2/),
    );
    scroll.mockClear();
    fireEvent.click(
      within(lesson).getByRole('button', { name: 'Forrige etappe' }),
    );

    await waitFor(() =>
      expect(document.activeElement).toHaveTextContent(/^Etappe 1 av 2/),
    );
    expect(scroll.mock.contexts).toContain(document.activeElement);
  });
});

describe('LF-029: the end of a lesson says where the learner is and what is next', () => {
  it('names the next lesson and does not claim the module is done', async () => {
    const lesson = await openLesson('s1-m01-o04');
    const next = within(lesson).getByRole('region', {
      name: 'Slik går du videre',
    });

    expect(next).toHaveTextContent(/4 av 12/);
    expect(
      within(next).getByRole('link', { name: /Les og forutsi kode/ }),
    ).toHaveAttribute('href', '/course/s1-m01-o05');
    expect(next).toHaveTextContent(/modulsjekken/i);
    expect(next.textContent).not.toMatch(/modulen er fullført/i);
  });

  it('after a module checkpoint, points at the next module', async () => {
    const lesson = await openLesson('s1-m01-chk');
    const next = within(lesson).getByRole('region', {
      name: 'Slik går du videre',
    });

    expect(
      within(next).getByRole('link', { name: /Verdier og variabler/ }),
    ).toHaveAttribute('href', '/course/s1-m02-o01');
  });

  it('at the last available lesson, says plainly that nothing more exists yet', async () => {
    const lesson = await openLesson('s1-m02-chk');

    // The module check has three stages; the guidance belongs to the last.
    expect(
      within(lesson).queryByRole('region', { name: 'Slik går du videre' }),
    ).toBeNull();
    for (const stage of [2, 3]) {
      fireEvent.click(
        within(lesson).getByRole('button', { name: 'Neste etappe' }),
      );
      await within(lesson).findByText(new RegExp(`^Etappe ${stage} av 3`));
    }

    const next = within(lesson).getByRole('region', {
      name: 'Slik går du videre',
    });

    expect(next).toHaveTextContent(/ikke tilgjengelige? ennå/);
    expect(within(next).queryAllByRole('link')).toHaveLength(0);
  });
});

describe('LF-028: a summary does not claim a capability the app has not seen', () => {
  it('does not title a recap "Du kan nå"', async () => {
    const lesson = await openLesson('s1-m01-o01');

    expect(lesson.textContent).not.toMatch(/Du kan nå/);
    expect(lesson.textContent).toMatch(/Du har gått gjennom/);
  });
});

describe('LF-023/LF-024: ordering the ten steps', () => {
  const task = () => exerciseOf('S1-M01-P05-E06');
  const names = () => task().items.map((item) => item[0]!);
  const place = (card: HTMLElement, name: string) =>
    fireEvent.click(
      within(card).getByRole('button', { name: `Legg til: ${name}` }),
    );

  it('builds the order from one list of steps, not ten drop-downs', async () => {
    await openLesson('s1-m01-o04');
    const card = group(6);

    expect(within(card).queryAllByRole('combobox')).toHaveLength(0);
    expect(
      within(
        within(card).getByRole('group', { name: 'Steg å plassere' }),
      ).getAllByRole('button'),
    ).toHaveLength(10);
    // Oracle replaced 2026-10-10 (continuation A2, owner-authorized density
    // work): the list no longer shows ten empty places before anything is
    // placed; it states the total and grows from the next empty place.
    expect(card).toHaveTextContent('Plassert: 0 av 10');
    expect(
      within(
        within(card).getByRole('list', { name: 'Din rekkefølge' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(1);
  });

  it('accepts the correct order placed step by step', async () => {
    await openLesson('s1-m01-o04');
    const card = group(6);

    for (const name of names()) {
      place(card, name);
    }
    fireEvent.click(within(card).getByRole('button', { name: 'Sjekk svaret' }));

    expect(
      await within(card).findByRole('status', { name: 'Resultat' }),
    ).toHaveTextContent('Riktig');
  });

  it('marks which places are right, and keeps them when the learner tries again', async () => {
    await openLesson('s1-m01-o04');
    const card = group(6);
    const order = names();
    // Steps 3 and 4 are swapped; the other eight are in their place.
    const attempt = [...order];
    [attempt[2], attempt[3]] = [attempt[3]!, attempt[2]!];

    for (const name of attempt) {
      place(card, name);
    }
    fireEvent.click(within(card).getByRole('button', { name: 'Sjekk svaret' }));
    await within(card).findByRole('status', { name: 'Resultat' });

    const rows = within(
      within(card).getByRole('list', { name: 'Din rekkefølge' }),
    ).getAllByRole('listitem');

    rows.forEach((row, index) => {
      expect(row).toHaveTextContent(
        index === 2 || index === 3 ? 'Feil plass' : 'Riktig plass',
      );
    });

    fireEvent.click(within(card).getByRole('button', { name: 'Prøv igjen' }));

    const after = within(
      within(card).getByRole('list', { name: 'Din rekkefølge' }),
    ).getAllByRole('listitem');

    expect(after[0]).toHaveTextContent(order[0]!);
    expect(after[1]).toHaveTextContent(order[1]!);
    expect(after[2]).toHaveTextContent(/tom/i);
    expect(after[3]).toHaveTextContent(/tom/i);
    expect(after[4]).toHaveTextContent(order[4]!);
    expect(
      within(
        within(card).getByRole('group', { name: 'Steg å plassere' }),
      ).getAllByRole('button'),
    ).toHaveLength(2);
  });

  it('does not reveal the order after a wrong answer', async () => {
    await openLesson('s1-m01-o04');
    const card = group(6);
    const reversed = [...names()].reverse();

    for (const name of reversed) {
      place(card, name);
    }
    fireEvent.click(within(card).getByRole('button', { name: 'Sjekk svaret' }));
    const result = await within(card).findByRole('status', {
      name: 'Resultat',
    });

    expect(result).toHaveTextContent('Ikke riktig ennå');
    expect(result.textContent).not.toMatch(/Problem.*Behov.*Krav.*Modellering/);
  });
});

describe('LF-025/LF-026: matching a situation to what it produces', () => {
  const task = () => exerciseOf('S1-M01-P05-E07');

  it('lets each option be used once', async () => {
    await openLesson('s1-m01-o04');
    const card = group(7);
    const items = task().items;
    const first = within(card).getByRole('combobox', { name: items[0]![0]! });
    const second = within(card).getByRole('combobox', {
      name: items[1]![0]!,
    });

    fireEvent.change(first, { target: { value: items[0]![1]! } });

    const option = within(second).getByRole('option', {
      name: items[0]![1]!,
    });

    expect(option).toBeDisabled();
  });

  it('marks which pairs are right after a wrong answer, and keeps them on retry', async () => {
    await openLesson('s1-m01-o04');
    const card = group(7);
    const items = task().items;

    // Every pair right except the first two, which are swapped.
    items.forEach(([left, right], index) => {
      const value =
        index === 0 ? items[1]![1]! : index === 1 ? items[0]![1]! : right!;
      fireEvent.change(within(card).getByRole('combobox', { name: left! }), {
        target: { value },
      });
    });
    fireEvent.click(within(card).getByRole('button', { name: 'Sjekk svaret' }));
    await within(card).findByRole('status', { name: 'Resultat' });

    expect(
      within(card).getAllByText('Feil kobling').length,
    ).toBeGreaterThanOrEqual(2);
    expect(within(card).getAllByText('Riktig kobling')).toHaveLength(
      items.length - 2,
    );

    fireEvent.click(within(card).getByRole('button', { name: 'Prøv igjen' }));

    expect(
      within(card).getByRole('combobox', { name: items[2]![0]! }),
    ).toHaveValue(items[2]![1]!);
    expect(
      within(card).getByRole('combobox', { name: items[0]![0]! }),
    ).toHaveValue('');
  });
});
