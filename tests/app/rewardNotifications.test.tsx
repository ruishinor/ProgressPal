import { act, cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  addStudySession,
  addXpTransaction,
  defaultLearnerProfileValues,
  getDatabaseSnapshot,
  initializeDatabase,
  saveLearnerProfile,
  upsertProgressAndAwardXp,
} from '@/lib/db';
import { rewardNotificationTiming } from '@/lib/rewards';
import { localCoordinationStorageKeys } from '@/lib/storage';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { bundledCourseSeed } from '@/seed';
import { cs50CatalogueId, cs50Policy } from '../programmes/cs50Policy';

const { enterMs, exitMs, holdMs } = rewardNotificationTiming;
const lifetimeMs = enterMs + holdMs + exitMs;
const rewardTestTimeout = 40_000;

/**
 * Synthetic learner state just below level 2 (100 XP): the next award crosses
 * the boundary. Seeded through the plain repository writes, which evaluate no
 * rewards, so nothing here is announced.
 */
async function seedLearner({
  deepSessions,
  xp,
}: {
  deepSessions: number;
  xp: number;
}) {
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
  if (xp > 0) {
    await addXpTransaction({
      awardedAt: '2026-06-10T08:00:00.000Z',
      id: 'xp-synthetic-seed',
      reason: 'Synthetic test seed',
      sourceId: 'synthetic-seed',
      programmeId: 'cs50x',
      sourceType: 'study_session',
      xp,
    });
  }

  for (let index = 0; index < deepSessions; index += 1) {
    await addStudySession({
      durationMinutes: 45,
      endedAt: `2026-06-1${index}T09:45:00.000Z`,
      id: `session-seeded-${index}`,
      itemId: 'week-0-lecture',
      mode: 'watching',
      startedAt: `2026-06-1${index}T09:00:00.000Z`,
      unitId: 'week-0',
    });
  }
}

/**
 * Records every reward notice element inserted into the region. A notice that
 * was presented twice (a replay, a duplicate announcement or a remount) shows
 * up as an extra entry.
 */
function recordPresentedNotices() {
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

  return {
    presented,
    stop: () => observer.disconnect(),
  };
}

async function waitForQueueToClear(notices: number) {
  await waitFor(
    () => {
      expect(screen.getByTestId('reward-notice-region')).toBeEmptyDOMElement();
    },
    { timeout: notices * lifetimeMs + 2_000 },
  );
}

function rewardNotice() {
  return screen
    .getByTestId('reward-notice-region')
    .querySelector('.reward-notice');
}

function dispatchPeerWrite(revision: number) {
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: localCoordinationStorageKeys.message,
      newValue: JSON.stringify({
        id: `reward-peer-write-${revision}`,
        kind: 'write',
        revision,
        sentAt: Date.now(),
        tabId: 'reward-test-peer',
      }),
    }),
  );
}

describe('reward notifications from real saves', () => {
  it(
    'presents level-up then both new achievements once after a Classic progress save, and never replays them',
    async () => {
      const user = userEvent.setup();
      await seedLearner({ deepSessions: 3, xp: 90 });
      await renderAppAtRoute('/course/week-1-shorts');

      await screen.findByRole('button', { name: 'Save progress' });
      const recorder = recordPresentedNotices();
      expect(rewardNotice()).toBeNull();

      await user.selectOptions(
        screen.getByLabelText(/^(Progress|Status)/),
        'completed',
      );
      await user.click(screen.getByRole('button', { name: 'Save progress' }));

      await waitFor(() => {
        expect(rewardNotice()).toHaveTextContent('Level up! Level 2');
      });
      // The level is the one the save crossed into, from the mutation result.
      expect((await getDatabaseSnapshot()).xpTransactions).toHaveLength(2);

      // Another tab's write forces a provider refresh and a route remount
      // (dataEpoch) while the queue is running. Automatic refresh is held
      // while a local mutation is in flight, so wait for the save to settle.
      await screen.findByText(/\+15 XP!/);
      const saveButtonBeforeRefresh = screen.getByRole('button', {
        name: 'Save progress',
      });
      dispatchPeerWrite(10_000);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save progress' })).not.toBe(
          saveButtonBeforeRefresh,
        );
      });

      await waitForQueueToClear(3);
      expect(recorder.presented).toEqual([
        'Level up! Level 2',
        'Achievement earned First Step',
        'Achievement earned Three Deep Sessions',
      ]);

      // Route navigation afterwards replays nothing.
      await user.click(screen.getByRole('link', { name: 'Course Map' }));
      await screen.findByRole('heading', { name: 'Course Map' });
      await act(
        () => new Promise((resolve) => setTimeout(resolve, enterMs + 100)),
      );
      expect(rewardNotice()).toBeNull();
      expect(recorder.presented).toHaveLength(3);
      recorder.stop();

      // A reload (fresh app instance over the same persisted state) shows
      // nothing: the earned rewards are state now, not events.
      cleanup();
      await renderAppAtRoute('/course/week-1-shorts');
      await screen.findByRole('button', { name: 'Save progress' });
      const afterReload = recordPresentedNotices();
      await act(
        () => new Promise((resolve) => setTimeout(resolve, enterMs + 100)),
      );
      expect(rewardNotice()).toBeNull();
      expect(afterReload.presented).toEqual([]);
      afterReload.stop();
    },
    rewardTestTimeout,
  );

  it(
    'presents the same shared notice over the RPG shell, with the badge artwork',
    async () => {
      const user = userEvent.setup();
      await seedLearner({ deepSessions: 0, xp: 90 });
      await renderAppAtRoute('/rpg/resource/week-1-shorts');

      const markComplete = await screen.findByRole('button', {
        name: 'Mark locally complete',
      });
      const recorder = recordPresentedNotices();
      await user.click(markComplete);

      await waitFor(() => {
        expect(rewardNotice()).toHaveTextContent('Level up! Level 2');
      });
      expect(document.body).toHaveClass('rpg-route-active');

      await waitFor(
        () => {
          expect(rewardNotice()).toHaveTextContent(
            'Achievement earned First Step',
          );
        },
        { timeout: lifetimeMs + 2_000 },
      );
      expect(
        rewardNotice()!.querySelector(
          '.reward-notice__art .rpg-achievement-art',
        ),
      ).not.toBeNull();

      await waitForQueueToClear(1);
      expect(recorder.presented).toEqual([
        'Level up! Level 2',
        'Achievement earned First Step',
      ]);
      recorder.stop();
    },
    rewardTestTimeout,
  );

  it(
    'presents nothing for a save that awards XP without crossing a level or unlocking anything',
    async () => {
      const user = userEvent.setup();
      await seedLearner({ deepSessions: 0, xp: 0 });
      // First Step is already earned before this app instance starts.
      await upsertProgressAndAwardXp(
        { confidence: 3, itemId: 'week-2-lecture', status: 'completed' },
        { catalogueId: cs50CatalogueId, policy: cs50Policy },
      );
      await renderAppAtRoute('/course/week-0-lecture');
      await screen.findByRole('button', { name: 'Save progress' });
      const recorder = recordPresentedNotices();

      await user.selectOptions(
        screen.getByLabelText(/^(Progress|Status)/),
        'completed',
      );
      await user.click(screen.getByRole('button', { name: 'Save progress' }));
      await screen.findByText(/\+40 XP!/);
      await act(
        () => new Promise((resolve) => setTimeout(resolve, enterMs + 100)),
      );

      expect(rewardNotice()).toBeNull();
      expect(recorder.presented).toEqual([]);
      recorder.stop();
    },
    rewardTestTimeout,
  );
});
