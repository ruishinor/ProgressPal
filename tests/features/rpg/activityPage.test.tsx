import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  today: '2026-10-25',
  canWrite: true,
  nb: false,
  data: {
    activityEntries: [],
    activityDefinitions: [],
    activitySettings: [],
    activityDays: [],
  } as import('@/lib/domain/activity').ActivityData,
}));
const save = vi.hoisted(() => vi.fn());
const settingsSave = vi.hoisted(() => vi.fn());
vi.mock('@/features/rpg/activity/useActivity', () => ({
  useActivityLanguage: () => state.nb,
  useActivityRead: () => ({
    today: state.today,
    data: state.data,
    error: false,
    retry: vi.fn(),
  }),
}));
vi.mock('@/lib/appState', () => ({
  useAppState: () => ({
    coordination: { canWrite: state.canWrite },
    runLocalMutation: async (action: () => Promise<unknown>) => action(),
  }),
}));
vi.mock('@/lib/db/activity', () => ({
  readActivityData: vi.fn(),
  saveActivityEntry: save,
  saveActivitySettings: settingsSave,
  saveActivityDefinition: vi.fn(),
  deleteActivityEntry: vi.fn(),
}));
import { ActivityPage } from '@/features/rpg/activity/ActivityPage';

const mount = () =>
  render(
    <MemoryRouter>
      <ActivityPage />
    </MemoryRouter>,
  );
beforeEach(() => {
  state.today = '2026-10-25';
  state.canWrite = true;
  state.nb = false;
  state.data = {
    activityEntries: [],
    activityDefinitions: [],
    activitySettings: [],
    activityDays: [],
  };
  save.mockReset();
  settingsSave.mockReset();
});
afterEach(() => vi.useRealTimers());

const tab = (name: string) =>
  fireEvent.click(screen.getByRole('tab', { name }));
const enterAmount = (amount: string) =>
  fireEvent.change(screen.getByLabelText('Amount', { exact: true }), {
    target: { value: amount },
  });
function withGoal() {
  state.data.activitySettings = [
    {
      id: 'activity-settings',
      reminderMinutes: 0,
      goals: [
        {
          id: 'goal-pushups',
          activityId: 'pushups',
          unit: 'reps',
          target: 20,
          enabled: true,
        },
      ],
    },
  ];
}
function withEntry() {
  state.data.activityEntries = [
    {
      id: 'entry-one',
      date: '2026-10-24',
      activityId: 'pushups',
      unit: 'reps',
      amount: 8,
      createdAt: '2026-10-24T12:00:00.000Z',
      updatedAt: '2026-10-24T12:00:00.000Z',
    },
  ];
  state.data.activityDays = [{ id: '2026-10-24', goals: [] }];
}
describe('Activity save feedback', () => {
  it('waits for the authoritative save, guards repeated submits, then clears the entered amount', async () => {
    let complete!: () => void;
    save.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    mount();
    fireEvent.change(screen.getByLabelText('Amount', { exact: true }), {
      target: { value: '8' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save activity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save activity' }));
    expect(save).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Save activity' }),
    ).toBeDisabled();
    expect(screen.queryByText('Activity saved.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveValue(8);
    await act(async () => complete());
    expect(screen.getByRole('status')).toHaveTextContent('Activity saved.');
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveValue(null);
  });
  it('keeps user input after failed storage and permits a retry', async () => {
    save
      .mockRejectedValueOnce(new Error('Quota exceeded'))
      .mockResolvedValueOnce(undefined);
    mount();
    fireEvent.change(screen.getByLabelText('Amount', { exact: true }), {
      target: { value: '8' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save activity' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Could not save.'),
    );
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveValue(8);
    fireEvent.click(screen.getByRole('button', { name: 'Save activity' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Activity saved.'),
    );
    expect(save).toHaveBeenCalledTimes(2);
  });
  it('follows local midnight only for an automatic date and preserves an explicit historical date', async () => {
    const view = mount();
    state.today = '2026-10-26';
    view.rerender(
      <MemoryRouter>
        <ActivityPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Date', { exact: true })).toHaveValue(
      '2026-10-26',
    );
    fireEvent.change(screen.getByLabelText('Date', { exact: true }), {
      target: { value: '2026-10-24' },
    });
    state.today = '2026-10-27';
    view.rerender(
      <MemoryRouter>
        <ActivityPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Date', { exact: true })).toHaveValue(
      '2026-10-24',
    );
  });
  it('replaces and restarts success feedback, retains errors, and cleans up on unmount', async () => {
    vi.useFakeTimers();
    save.mockResolvedValue(undefined);
    const view = mount();
    const submit = async () => {
      enterAmount('8');
      await act(async () =>
        fireEvent.click(screen.getByRole('button', { name: 'Save activity' })),
      );
    };
    await submit();
    expect(screen.getByRole('status')).toHaveTextContent('Activity saved.');
    act(() => vi.advanceTimersByTime(3000));
    await submit();
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole('status')).toHaveTextContent('Activity saved.');
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByText('Activity saved.')).not.toBeInTheDocument();
    save.mockRejectedValueOnce(new Error('storage full'));
    await submit();
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save.');
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveValue(8);
    await submit();
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Activity local sections', () => {
  it('defaults to Today, retains unsaved forms and switches by arrow/Home/End without saving', () => {
    mount();
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Today');
    enterAmount('9');
    const today = screen.getByRole('tab', { name: 'Today' });
    fireEvent.keyDown(today, { key: 'End' });
    const settings = screen.getByRole('tab', { name: 'Settings' });
    expect(settings).toHaveFocus();
    expect(settings).toHaveAttribute('aria-selected', 'true');
    fireEvent.change(screen.getByLabelText('Repetitions per day'), {
      target: { value: '30' },
    });
    fireEvent.change(screen.getByLabelText('Activity name'), {
      target: { value: 'Rucking' },
    });
    fireEvent.keyDown(settings, { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'History' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'History' }), {
      key: 'Home',
    });
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveValue(9);
    tab('Settings');
    expect(screen.getByLabelText('Repetitions per day')).toHaveValue(30);
    expect(screen.getByLabelText('Activity name')).toHaveValue('Rucking');
    expect(save).not.toHaveBeenCalled();
    expect(settingsSave).not.toHaveBeenCalled();
  });
  it('opens goal controls and an inline entry without replacing the full form draft', () => {
    withGoal();
    mount();
    fireEvent.change(screen.getByLabelText('Activity type'), {
      target: { value: 'walking' },
    });
    fireEvent.change(screen.getByLabelText('Date', { exact: true }), {
      target: { value: '2026-10-23' },
    });
    enterAmount('2.5');
    fireEvent.click(screen.getByRole('button', { name: 'Manage goals' }));
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('heading', { name: 'Daily goals' })).toHaveFocus();
    tab('Today');
    fireEvent.click(screen.getByRole('button', { name: 'Log' }));
    expect(screen.getByLabelText('Activity type')).toHaveValue('walking');
    expect(screen.getByLabelText('Measurement', { exact: true })).toHaveValue(
      'seconds',
    );
    expect(screen.getByLabelText('Date', { exact: true })).toHaveValue(
      '2026-10-23',
    );
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveValue(2.5);
    const quick = screen.getByRole('form', { name: 'Log Push-ups' });
    expect(
      within(quick).getByRole('spinbutton', { name: 'Repetitions' }),
    ).toHaveFocus();
    expect(
      screen.getByRole('button', { name: 'Save activity' }),
    ).toBeDisabled();
  });
  it('moves a historical edit to Today and preserves it across sections until explicitly cancelled', () => {
    withEntry();
    withGoal();
    mount();
    tab('History');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveFocus();
    expect(screen.getByLabelText('Date', { exact: true })).toHaveValue(
      '2026-10-24',
    );
    enterAmount('6');
    expect(screen.getByRole('button', { name: 'Log' })).toBeDisabled();
    tab('History');
    fireEvent.click(screen.getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveValue(6);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Log' })).toBeEnabled();
  });
  it('keeps ACT-01 unknown state out of compact history and uses natural Norwegian singulars', () => {
    state.nb = true;
    withEntry();
    mount();
    tab('Historikk');
    const history = screen.getByRole('tabpanel');
    expect(within(history).getByText('1 aktiv dag')).toBeVisible();
    expect(within(history).getAllByText('1 dag')).toHaveLength(2);
    expect(history).not.toHaveTextContent('Målstatus ukjent');
    expect(history).not.toHaveTextContent('Ingen aktive mål');
    expect(history).toHaveTextContent('24.10.2026');
    expect(
      within(history).getAllByRole('cell', { name: '8 repetisjoner' }),
    ).toHaveLength(2);
    expect(screen.getByText(/Mengden du trener/)).not.toBeVisible();
    fireEvent.click(screen.getByLabelText('Om aktivitetsnivå'));
    expect(screen.getByText(/Mengden du trener/)).toBeVisible();
  });
  it('updates the goal amount label with its unit and clears success on section changes', async () => {
    save.mockResolvedValue(undefined);
    mount();
    enterAmount('8');
    fireEvent.click(screen.getByRole('button', { name: 'Save activity' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Activity saved.'),
    );
    tab('Settings');
    expect(screen.queryByText('Activity saved.')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Goal activity'), {
      target: { value: 'walking' },
    });
    expect(screen.getByLabelText('Minutes per day')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Goal measurement'), {
      target: { value: 'metres' },
    });
    expect(screen.getByLabelText('Kilometres per day')).toBeVisible();
  });
});

describe('Goal quick entry', () => {
  it('waits for one authoritative write and returns focus to the goal after saving today', async () => {
    withGoal();
    let complete!: () => void;
    save.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    mount();
    enterAmount('12');
    fireEvent.change(screen.getByLabelText('Date', { exact: true }), {
      target: { value: '2001-02-03' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log' }));
    const form = screen.getByRole('form', { name: 'Log Push-ups' });
    fireEvent.change(within(form).getByRole('spinbutton'), {
      target: { value: '5' },
    });
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(save).toHaveBeenCalledTimes(1);
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(save).toHaveBeenCalledWith({
      activityId: 'pushups',
      unit: 'reps',
      amount: 5,
      date,
    });
    expect(within(form).getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.queryByText('Activity saved.')).not.toBeInTheDocument();
    await act(async () => complete());
    expect(screen.getByRole('status')).toHaveTextContent('Activity saved.');
    expect(
      screen.queryByRole('form', { name: 'Log Push-ups' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log' })).toHaveFocus();
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveValue(12);
    expect(screen.getByLabelText('Date', { exact: true })).toHaveValue(
      '2001-02-03',
    );
  });
  it('retains failed input, permits retry, and preserves it across local sections', async () => {
    withGoal();
    save
      .mockRejectedValueOnce(new Error('quota'))
      .mockResolvedValueOnce(undefined);
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Log' }));
    const form = screen.getByRole('form', { name: 'Log Push-ups' });
    const amount = within(form).getByRole('spinbutton');
    fireEvent.change(amount, { target: { value: '7' } });
    fireEvent.submit(form);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Could not save.'),
    );
    tab('History');
    tab('Today');
    expect(amount).toHaveValue(7);
    fireEvent.submit(form);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Activity saved.'),
    );
    expect(save).toHaveBeenCalledTimes(2);
  });
  it('prevents conflicting goals and historical edits until explicit cancellation without saving', () => {
    withGoal();
    withEntry();
    state.data.activitySettings[0].goals.push({
      id: 'goal-squats',
      activityId: 'squats',
      unit: 'reps',
      target: 30,
      enabled: true,
    });
    mount();
    fireEvent.click(screen.getAllByRole('button', { name: 'Log' })[0]);
    const form = screen.getByRole('form', { name: 'Log Push-ups' });
    fireEvent.change(within(form).getByRole('spinbutton'), {
      target: { value: '8' },
    });
    expect(screen.getByRole('button', { name: 'Log' })).toBeDisabled();
    tab('History');
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
    tab('Today');
    expect(within(form).getByRole('spinbutton')).toHaveValue(8);
    fireEvent.click(within(form).getByRole('button', { name: 'Cancel' }));
    expect(save).not.toHaveBeenCalled();
    expect(
      screen
        .getAllByRole('button', { name: 'Log' })
        .every((button) => !button.hasAttribute('disabled')),
    ).toBe(true);
    expect(screen.getByRole('button', { name: 'Save activity' })).toBeEnabled();
  });
  it.each([
    {
      unit: 'reps' as const,
      activityId: 'pushups',
      label: 'Repetitions',
      invalid: '1.5',
      valid: '3',
      expected: 3,
    },
    {
      unit: 'seconds' as const,
      activityId: 'walking',
      label: 'Minutes',
      invalid: '0.001',
      valid: '1.5',
      expected: 90,
    },
    {
      unit: 'metres' as const,
      activityId: 'walking',
      label: 'Kilometres',
      invalid: '0.0001',
      valid: '2.345',
      expected: 2345,
    },
  ])(
    'shares validation and conversion for $unit',
    async ({ unit, activityId, label, invalid, valid, expected }) => {
      withGoal();
      Object.assign(state.data.activitySettings[0].goals[0], {
        unit,
        activityId,
      });
      save.mockResolvedValue(undefined);
      mount();
      fireEvent.click(screen.getByRole('button', { name: 'Log' }));
      const form = screen.getByRole('form', {
        name: `Log ${activityId === 'walking' ? 'Walking' : 'Push-ups'}`,
      });
      const amount = within(form).getByRole('spinbutton', { name: label });
      for (const value of ['0', '-2', invalid]) {
        fireEvent.change(amount, { target: { value } });
        fireEvent.submit(form);
        expect(save).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Enter a positive number.',
        );
      }
      fireEvent.change(amount, { target: { value: valid } });
      fireEvent.submit(form);
      await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
      expect(save.mock.calls[0][0]).toMatchObject({
        activityId,
        unit,
        amount: expected,
      });
    },
  );
});
