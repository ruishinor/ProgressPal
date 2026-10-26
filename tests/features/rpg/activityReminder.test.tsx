import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  settings: {
    id: 'activity-settings' as const,
    goals: [],
    reminderMinutes: 30,
  },
  failed: false,
  canWrite: true,
}));
const save = vi.hoisted(() => vi.fn());
vi.mock('@/features/rpg/activity/useActivity', () => ({
  useActivityLanguage: () => false,
  useActivityRead: () => ({ data: state.settings, error: state.failed }),
}));
vi.mock('@/lib/appState', () => ({
  useAppState: () => ({
    coordination: { canWrite: state.canWrite },
    runLocalMutation: async (action: () => Promise<unknown>) => action(),
  }),
}));
vi.mock('@/lib/db/activity', () => ({
  readActivitySettings: vi.fn(),
  saveActivitySettings: save,
}));
import { MovementReminder } from '@/features/rpg/activity/MovementReminder';

beforeEach(() => {
  vi.useFakeTimers();
  state.settings = { id: 'activity-settings', goals: [], reminderMinutes: 30 };
  state.failed = false;
  state.canWrite = true;
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  save.mockReset().mockImplementation(async (settings) => {
    state.settings = settings;
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
function useFor(minutes: number) {
  for (let minute = 0; minute < minutes; minute++)
    act(() => {
      fireEvent.keyDown(window, { key: 'a' });
      vi.advanceTimersByTime(60_000);
    });
}
const mount = () =>
  render(
    <MemoryRouter>
      <MovementReminder />
    </MemoryRouter>,
  );
describe('optional movement reminders', () => {
  it('stays silent by default and cleans up timers/listeners on unmount', () => {
    state.settings.reminderMinutes = 0;
    const view = mount();
    useFor(90);
    expect(
      screen.queryByText('Time for a movement break?'),
    ).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    view.unmount();
  });
  it('counts only visible recent interaction; postpones once and dismisses without automatic logging', () => {
    const view = mount();
    act(() => vi.advanceTimersByTime(60 * 60_000));
    expect(
      screen.queryByText('Time for a movement break?'),
    ).not.toBeInTheDocument();
    useFor(30);
    expect(screen.getByText('Time for a movement break?')).toBeInTheDocument();
    fireEvent(window, new Event('blur'));
    expect(
      screen.queryByText('Time for a movement break?'),
    ).not.toBeInTheDocument();
    useFor(30);
    fireEvent.click(screen.getByRole('button', { name: 'Postpone 5 min' }));
    useFor(4);
    expect(
      screen.queryByText('Time for a movement break?'),
    ).not.toBeInTheDocument();
    useFor(1);
    expect(screen.getByText('Time for a movement break?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss reminder' }));
    expect(
      screen.queryByText('Time for a movement break?'),
    ).not.toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('clears a stale notification when hidden and persists disable only after the save succeeds', async () => {
    mount();
    useFor(30);
    expect(screen.getByText('Time for a movement break?')).toBeInTheDocument();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    useFor(90);
    expect(
      screen.queryByText('Time for a movement break?'),
    ).not.toBeInTheDocument();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    fireEvent(document, new Event('visibilitychange'));
    useFor(30);
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Disable reminders' }),
      );
    });
    expect(save).toHaveBeenCalledWith({
      id: 'activity-settings',
      goals: [],
      reminderMinutes: 0,
    });
    expect(
      screen.queryByText('Time for a movement break?'),
    ).not.toBeInTheDocument();
  });
  it('preserves the visible reminder on a failed disable and prevents persistent changes in a read-only tab', async () => {
    mount();
    useFor(30);
    save.mockRejectedValueOnce(new Error('No lease'));
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Disable reminders' }),
      );
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
    expect(screen.getByText('Time for a movement break?')).toBeInTheDocument();
    state.canWrite = false;
    fireEvent.click(screen.getByRole('button', { name: 'Postpone 5 min' }));
    useFor(5);
    expect(
      screen.getByRole('button', { name: 'Disable reminders' }),
    ).toBeDisabled();
  });
});
