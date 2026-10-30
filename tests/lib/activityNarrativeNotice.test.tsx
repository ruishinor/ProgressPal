import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';
import { describe, expect, it } from 'vitest';

import { ActivityNarrativePanel } from '@/components/ui/ActivityNarrativePanel';
import { RewardNoticeRegion } from '@/components/ui/RewardNotice';
import { activityAchievementData } from '@/lib/activity/achievementData';
import {
  deriveRewardEvents,
  RewardNotificationProvider,
  useRewardAnnouncer,
  useRewardNotificationState,
  type AnnounceRewards,
  type RewardEvent,
} from '@/lib/rewards';

const first = activityAchievementData[0];
const second = activityAchievementData[1];
const activityEvent = (
  row: (typeof activityAchievementData)[number],
): RewardEvent => ({
  kind: 'achievement',
  achievementId: row.id,
  title: row.name,
  message: row.unlock,
  narrative: row.fiction,
});

let announce: AnnounceRewards | null = null;
function Harness() {
  const publish = useRewardAnnouncer();
  const { current, leaving, narratives, dismissNarratives } =
    useRewardNotificationState();
  const [clicks, setClicks] = useState(0);
  useEffect(() => {
    announce = publish;
  }, [publish]);
  return (
    <>
      <button onClick={() => setClicks((n) => n + 1)} type="button">
        Continue learning: {clicks}
      </button>
      <RewardNoticeRegion leaving={leaving} notification={current} />
      <ActivityNarrativePanel
        notifications={narratives}
        onDismiss={dismissNarratives}
        renderArtwork={(id) => <img alt="" data-testid={`badge-${id}`} />}
      />
    </>
  );
}
function mount() {
  return render(
    <RewardNotificationProvider>
      <Harness />
    </RewardNotificationProvider>,
  );
}

describe('Activity narrative unlock delivery', () => {
  it('derives exact approved fiction only from newly committed Activity unlocks', () => {
    const result = deriveRewardEvents(
      {
        awardedTransactions: [],
        unlockedAchievements: [{ achievementId: first.id }],
        xpSummary: { level: 1, totalXp: 0 },
      },
      [],
    );
    expect(result).toEqual([activityEvent(first)]);
    expect(
      deriveRewardEvents(
        {
          awardedTransactions: [],
          unlockedAchievements: [],
          xpSummary: { level: 1, totalXp: 0 },
        },
        [],
      ),
    ).toEqual([]);
  });

  it('shows original story, badge and title without timing out, while learning stays usable', async () => {
    mount();
    act(() => announce!([activityEvent(first)]));
    const panel = screen.getByTestId('activity-narrative-panel');
    expect(panel).toHaveAccessibleName('New activity achievements');
    expect(panel).toHaveTextContent(first.fiction);
    expect(screen.getByRole('heading', { name: first.name })).toBeVisible();
    expect(screen.getByTestId(`badge-${first.id}`)).toHaveAttribute('alt', '');
    expect(screen.getByTestId('reward-notice-region')).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue learning: 0' }),
    );
    expect(
      screen.getByRole('button', { name: 'Continue learning: 1' }),
    ).toBeVisible();
    expect(panel).toHaveTextContent(first.fiction);
    const dismiss = screen.getByRole('button', { name: 'Dismiss stories' });
    dismiss.focus();
    expect(dismiss).toHaveFocus();
    await userEvent.setup().keyboard('{Enter}');
    expect(screen.queryByTestId('activity-narrative-panel')).toBeNull();
  });

  it('groups simultaneous unlocks into one panel without queued Activity toasts', () => {
    mount();
    act(() => announce!([activityEvent(first), activityEvent(second)]));
    expect(screen.getAllByTestId('activity-narrative-panel')).toHaveLength(1);
    expect(screen.getByText(first.fiction)).toBeVisible();
    expect(screen.getByText(second.fiction)).toBeVisible();
    expect(screen.getByTestId('reward-notice-region')).toBeEmptyDOMElement();
    act(() => announce!([activityEvent(first)]));
    expect(
      screen.getByTestId('activity-narrative-panel').querySelectorAll('li'),
    ).toHaveLength(2);
  });

  it('does not replay history on remount or after an empty announcement', () => {
    const view = mount();
    act(() => announce!([activityEvent(first)]));
    view.unmount();
    announce = null;
    mount();
    expect(screen.queryByTestId('activity-narrative-panel')).toBeNull();
    act(() => announce!([]));
    expect(screen.queryByTestId('activity-narrative-panel')).toBeNull();
    cleanup();
  });

  it('keeps the existing transient queue for non-Activity rewards', () => {
    mount();
    act(() => announce!([{ kind: 'level-up', level: 2 }]));
    expect(screen.getByRole('status')).toHaveTextContent('Level up! Level 2');
    expect(screen.queryByTestId('activity-narrative-panel')).toBeNull();
  });
});
