import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import {
  addXpTransaction,
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  getDatabaseSnapshot,
  initializeDatabase,
  listXpTransactions,
  saveLearnerProfile,
  switchActiveProgramme,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { rewardNotificationTiming } from '@/lib/rewards';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

/**
 * Owner decision 2026-10-03 (Epic E continuation §6, §7): Programvareutvikling
 * is not a no-XP programme. Correct work earns Programvareutvikling XP in its
 * own ledger, atomically with the durable result; reading, opening, revealing
 * a hint, reloading, replaying or switching earns nothing, and nothing is ever
 * taken away.
 */

const p2 = programvareutviklingDefinition;
const pwdPrompt = /husker ikke hvilken/;
const { enterMs, holdMs, exitMs } = rewardNotificationTiming;

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

async function openLesson(itemId: string) {
  await renderAppAtRoute(`/course/${itemId}`);
  return screen.findByRole('article', { name: /./ }, { timeout: 15_000 });
}

function groupWith(lesson: HTMLElement, prompt: RegExp) {
  return within(lesson)
    .getAllByRole('group', { name: /^Oppgave \d+/ })
    .find((group) => prompt.test(group.textContent ?? ''))!;
}

async function answerCommand(group: HTMLElement, command: string) {
  const field = within(group).getByRole('textbox');
  await waitFor(() => expect(field).toBeEnabled());
  fireEvent.change(field, { target: { value: command } });
  fireEvent.click(within(group).getByRole('button', { name: 'Sjekk svaret' }));
  return within(group).findByRole(
    'status',
    { name: /Resultat/ },
    { timeout: 15_000 },
  );
}

const p2Xp = () => listXpTransactions({ programmeId: p2.programmeId });
const cs50Xp = () => listXpTransactions({ programmeId: 'cs50x' });

describe('Programvareutvikling earns its own XP for correct work', () => {
  it('awards Programvareutvikling XP for a correct answer, and none to CS50', async () => {
    const lesson = await openLesson('s1-m01-o02');
    const status = await answerCommand(groupWith(lesson, pwdPrompt), 'pwd');

    expect(status).toHaveTextContent('Riktig');
    await waitFor(async () => {
      const awards = await p2Xp();
      expect(awards.length).toBeGreaterThan(0);
      expect(awards.every((row) => row.programmeId === p2.programmeId)).toBe(
        true,
      );
      expect(awards.every((row) => row.xp > 0)).toBe(true);
    });
    expect(await cs50Xp()).toEqual([]);
  });

  it('awards nothing for an incorrect answer and takes nothing away', async () => {
    const lesson = await openLesson('s1-m01-o02');
    const status = await answerCommand(groupWith(lesson, pwdPrompt), 'hello');

    expect(status).toHaveTextContent('Ikke riktig ennå');
    expect(await p2Xp()).toEqual([]);
  });

  it('awards nothing for opening or reading a lesson, or for revealing a hint', async () => {
    const lesson = await openLesson('s1-m01-o02');
    const hint = within(lesson).getAllByRole('button', {
      name: /Vis hint/,
    })[0]!;
    await waitFor(() => expect(hint).toBeEnabled());
    fireEvent.click(hint);
    await within(lesson).findByText(/^Hint 1/);

    expect((await getDatabaseSnapshot()).xpTransactions).toEqual([]);
  });

  it('awards a solved task once, however often the page reloads', async () => {
    const lesson = await openLesson('s1-m01-o02');
    await answerCommand(groupWith(lesson, pwdPrompt), 'pwd');
    await waitFor(async () => expect((await p2Xp()).length).toBeGreaterThan(0));
    const awarded = await p2Xp();

    cleanup();
    await openLesson('s1-m01-o02');
    cleanup();
    await openLesson('s1-m01-o02');

    expect(await p2Xp()).toEqual(awarded);
  });

  it('keeps each programme ledger unchanged across switching', async () => {
    const lesson = await openLesson('s1-m01-o02');
    await answerCommand(groupWith(lesson, pwdPrompt), 'pwd');
    await waitFor(async () => expect((await p2Xp()).length).toBeGreaterThan(0));
    const before = (await getDatabaseSnapshot()).xpTransactions;
    cleanup();

    await switchActiveProgramme('cs50x', { seed: bundledCourseSeed });
    await switchActiveProgramme(p2.programmeId, { seed: p2.catalogue });

    expect((await getDatabaseSnapshot()).xpTransactions).toEqual(before);
  });

  it('marks a lesson locally complete without awarding Programvareutvikling XP', async () => {
    await renderAppAtRoute('/rpg/resource/s1-m01-o02');

    const markComplete = await screen.findByRole('button', {
      name: 'Mark locally complete',
    });
    expect(markComplete).toHaveAccessibleDescription(/Det gir ikke XP/);

    fireEvent.click(markComplete);
    await screen.findByRole('heading', { name: 'Progress saved' });

    const snapshot = await getDatabaseSnapshot();
    expect(
      snapshot.progressEntries.find((entry) => entry.itemId === 's1-m01-o02'),
    ).toMatchObject({
      itemId: 's1-m01-o02',
      status: 'completed',
    });
    expect(
      snapshot.xpTransactions.filter(
        (transaction) => transaction.programmeId === p2.programmeId,
      ),
    ).toEqual([]);
    expect(snapshot.learnerEvidence).toEqual([]);
    const region = screen.getByTestId('reward-notice-region');
    expect(region.querySelector('[data-reward-kind="level-up"]')).toBeNull();
    expect(region).toHaveTextContent('Achievement earned First Step');
    expect(screen.queryByText(/\+\d+ XP/)).not.toBeInTheDocument();
  });

  it('announces a real Programvareutvikling level-up and does not replay it after reload', async () => {
    await addXpTransaction({
      awardedAt: '2026-10-06T10:00:00.000Z',
      id: 'p2-level-seed',
      reason: 'Synthetic test seed',
      sourceId: 'p2-level-seed',
      programmeId: p2.programmeId,
      sourceType: 'study_session',
      xp: 99,
    });

    const lesson = await openLesson('s1-m01-o02');
    const region = screen.getByTestId('reward-notice-region');
    const presented: string[] = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (
            node instanceof HTMLElement &&
            node.classList.contains('reward-notice')
          ) {
            presented.push(node.textContent ?? '');
          }
        }
      }
    });
    observer.observe(region, { childList: true });
    const status = await answerCommand(groupWith(lesson, pwdPrompt), 'pwd');

    expect(status).toHaveTextContent('Riktig');
    await waitFor(() => expect(region).toHaveTextContent('Level up! Level 2'));
    expect((await p2Xp()).reduce((total, row) => total + row.xp, 0)).toBe(104);
    await waitFor(() => expect(region).toBeEmptyDOMElement(), {
      timeout: enterMs + holdMs + exitMs + 2_000,
    });
    expect(presented).toEqual(['Level up! Level 2']);
    observer.disconnect();

    cleanup();
    await openLesson('s1-m01-o02');
    await act(
      () => new Promise((resolve) => setTimeout(resolve, enterMs + 100)),
    );

    expect(screen.getByTestId('reward-notice-region')).toBeEmptyDOMElement();
  }, 20_000);
});
