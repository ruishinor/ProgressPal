import { act, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RewardNoticeRegion } from '@/components/ui/RewardNotice';
import {
  RewardNotificationProvider,
  rewardNotificationTiming,
  useRewardAnnouncer,
  useRewardNotificationState,
  type AnnounceRewards,
  type RewardEvent,
} from '@/lib/rewards';

const { enterMs, exitMs, holdMs } = rewardNotificationTiming;
const lifetimeMs = enterMs + holdMs + exitMs;

const levelUp: RewardEvent = { kind: 'level-up', level: 7 };
const firstStep: RewardEvent = {
  achievementId: 'first-step',
  kind: 'achievement',
  title: 'First Step',
};
const bugHunter: RewardEvent = {
  achievementId: 'bug-hunter',
  kind: 'achievement',
  title: 'Bug Hunter',
};

let announce: AnnounceRewards | null = null;
let forceRender: (() => void) | null = null;

function Harness() {
  const [, setTick] = useState(0);
  const state = useRewardNotificationState();
  const announcer = useRewardAnnouncer();

  useEffect(() => {
    announce = announcer;
    forceRender = () => setTick((tick) => tick + 1);
  }, [announcer]);

  return (
    <RewardNoticeRegion
      leaving={state.leaving}
      notification={state.current}
      renderArtwork={(achievementId) => (
        <img alt="" data-testid={`art-${achievementId}`} />
      )}
    />
  );
}

function renderQueue() {
  return render(
    <RewardNotificationProvider>
      <Harness />
    </RewardNotificationProvider>,
  );
}

function visibleNotices() {
  return screen.queryAllByRole('status').map((notice) => notice.textContent);
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('reward notification queue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    announce = null;
    forceRender = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows nothing until a reward is announced, and nothing outside a provider', () => {
    renderQueue();

    expect(visibleNotices()).toEqual([]);
    expect(screen.getByTestId('reward-notice-region')).toBeEmptyDOMElement();

    render(<AnnouncerProbe />);
    expect(screen.getByTestId('announcer-probe')).toHaveTextContent('absent');
  });

  it('presents level-up then achievements one at a time, in order, then clears', () => {
    renderQueue();

    act(() => announce!([levelUp, firstStep, bugHunter]));

    expect(visibleNotices()).toEqual(['Level up! Level 7']);
    advance(enterMs + holdMs - 1);
    expect(visibleNotices()).toEqual(['Level up! Level 7']);
    expect(screen.getByRole('status')).not.toHaveClass(
      'reward-notice--leaving',
    );
    advance(1);
    expect(screen.getByRole('status')).toHaveClass('reward-notice--leaving');
    advance(exitMs);
    expect(visibleNotices()).toEqual(['Achievement earned First Step']);
    advance(lifetimeMs);
    expect(visibleNotices()).toEqual(['Achievement earned Bug Hunter']);
    advance(lifetimeMs);
    expect(visibleNotices()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps a reward announced while another is leaving and shows it next', () => {
    renderQueue();

    act(() => announce!([levelUp]));
    advance(enterMs + holdMs + 10);
    expect(screen.getByRole('status')).toHaveClass('reward-notice--leaving');

    act(() => announce!([firstStep]));
    expect(visibleNotices()).toEqual(['Level up! Level 7']);
    advance(exitMs);
    expect(visibleNotices()).toEqual(['Achievement earned First Step']);
    expect(screen.getByRole('status')).not.toHaveClass(
      'reward-notice--leaving',
    );
    advance(lifetimeMs);
    expect(visibleNotices()).toEqual([]);
  });

  it('does not create or restart a notice on rerender', () => {
    renderQueue();

    act(() => announce!([firstStep]));
    advance(holdMs);
    act(() => forceRender!());
    act(() => forceRender!());
    expect(visibleNotices()).toEqual(['Achievement earned First Step']);
    advance(enterMs + exitMs);
    expect(visibleNotices()).toEqual([]);
    act(() => forceRender!());
    expect(visibleNotices()).toEqual([]);
  });

  it('ignores an empty announcement', () => {
    renderQueue();

    act(() => announce!([]));
    expect(visibleNotices()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears its timers when the provider unmounts', () => {
    const errors = vi.spyOn(console, 'error');
    const view = renderQueue();

    act(() => announce!([levelUp, firstStep]));
    expect(vi.getTimerCount()).toBe(2);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    advance(lifetimeMs * 2);
    expect(errors).not.toHaveBeenCalled();
  });

  it('exposes a non-focusable polite status without interactive content', () => {
    renderQueue();

    act(() => announce!([firstStep]));

    const region = screen.getByTestId('reward-notice-region');
    const notice = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toContainElement(notice);
    expect(notice).not.toHaveAttribute('tabindex');
    expect(
      notice.querySelectorAll('button, a, input, [tabindex]'),
    ).toHaveLength(0);
    expect(document.activeElement).toBe(document.body);
    expect(notice).toHaveAttribute('data-reward-kind', 'achievement');
    // Artwork is decorative; the accessible text is the label and title.
    expect(screen.getByTestId('art-first-step').parentElement).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(notice).toHaveTextContent('Achievement earned First Step');
  });
});

function AnnouncerProbe() {
  const announcer = useRewardAnnouncer();

  return (
    <span data-testid="announcer-probe">
      {announcer === null ? 'absent' : 'present'}
    </span>
  );
}
