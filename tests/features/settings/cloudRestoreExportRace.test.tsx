import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { produceBackupPayload } from '@/lib/cloudBackup';

import { FakeBackupStore } from '../../lib/cloudBackup/fakeBackupStore';
import { idFor } from '../../lib/cloudBackup/harness';
import {
  appVersion,
  createFreshDevice,
  createLearnerDevice,
  schemaVersion,
  type Device,
} from '../../lib/cloudBackup/support';
import {
  cardTree,
  enableCloud,
  makeAccount,
  stubState,
  type RenderCardOptions,
} from './cloudSettingsKit';

/**
 * Epic G repair 01, finding 4: while the learner's own local export is pending,
 * the destructive "Replace local data with this backup" is unavailable. An
 * export that is still reading the device while a restore replaces it would
 * hand the learner a file that is not the data they chose to protect. The
 * export is controlled by a deferred promise the test settles.
 */

const acknowledgement = "Replace this device's data with this backup";
const replace = 'Replace local data with this backup';

let source: Device;
let payloadText: string;
let devices: Device[] = [];
let store: FakeBackupStore;

beforeAll(async () => {
  source = await createLearnerDevice('race-source');
  payloadText = (
    await produceBackupPayload({
      data: await source.readSnapshot(),
      appVersion,
      schemaVersion,
      exportedAt: '2026-10-08T09:50:00.000Z',
    })
  ).contents;
});

afterAll(async () => {
  await source.cleanup();
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  store = new FakeBackupStore();
  devices = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('no network in these tests');
    }),
  );
});

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await Promise.all(devices.map((device) => device.cleanup()));
});

/**
 * The card as Settings hosts it: `exporting` is true from the moment the
 * learner starts the local export until it settles, however it ends (Settings
 * reports a failure itself, so a rejection is swallowed here the same way).
 */
function ExportingCard({
  options,
  runExport,
}: {
  options: RenderCardOptions;
  runExport: () => Promise<void>;
}) {
  const [exporting, setExporting] = useState(false);

  async function onExportLocal() {
    setExporting(true);

    try {
      await runExport();
    } catch {
      // Reported by the host (Settings shows an "Export failed" message).
    } finally {
      setExporting(false);
    }
  }

  return cardTree({ ...options, exporting, onExportLocal });
}

/** A promise the test settles by hand. */
function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

async function setup(kind: 'learner' | 'fresh') {
  const device =
    kind === 'learner'
      ? await createLearnerDevice('race-target')
      : await createFreshDevice('race-target');
  const made = makeAccount();
  const restoreLocal = vi.fn(device.restoreLocal);
  const state = stubState();

  devices.push(device);
  enableCloud();
  made.signInDirectly();
  store.seed(2, { payload: payloadText, backupId: idFor(50) });

  const options: RenderCardOptions = {
    state,
    dependencies: {
      account: made.account,
      store,
      readSnapshot: device.readSnapshot,
      migrationContext: device.migrationContext,
      restoreLocal,
    },
  };

  return { device, options, restoreLocal, state };
}

const click = (name: string | RegExp) =>
  userEvent.click(screen.getByRole('button', { name }));

/** Show the backups and download-and-check the only one: ready to restore. */
async function readyToRestore() {
  await click('Show backups');
  await screen.findByText('Restore a backup');
  await click('Download and check');
  await screen.findByText(/is ready to restore/);
}

/** React's own props for a node: the handler a disabled button would not be given. */
function reactProps(element: HTMLElement) {
  const key = Object.keys(element).find((name) =>
    name.startsWith('__reactProps$'),
  );

  return (element as unknown as Record<string, { onClick?: () => void }>)[
    key ?? ''
  ];
}

describe('a pending local export holds the destructive restore', () => {
  it('unavailable from the moment the export starts until it settles; then it needs the learner, nothing runs by itself', async () => {
    const s = await setup('learner');
    const pending = deferred();
    const runExport = vi.fn(() => pending.promise);

    render(<ExportingCard options={s.options} runExport={runExport} />);
    await readyToRestore();
    await userEvent.click(
      screen.getByRole('checkbox', { name: acknowledgement }),
    );

    const confirm = screen.getByRole('button', { name: replace });

    // Every other prerequisite holds: backup checked, consent given, tab writable.
    expect(confirm).toBeEnabled();

    await click('Export local backup first');
    expect(runExport).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(confirm).toBeDisabled(), { timeout: 1500 });
    expect(
      screen.getByRole('button', { name: 'Export local backup first' }),
    ).toHaveAttribute('aria-busy', 'true');

    await userEvent.click(confirm);
    expect(s.restoreLocal).not.toHaveBeenCalled();
    expect(s.state.runLocalMutation).not.toHaveBeenCalled();
    expect(screen.queryByText('RPG HOME REACHED')).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve();
    });

    await waitFor(() => expect(confirm).toBeEnabled());
    // Settling the export is not a decision: nothing was restored, the
    // consent the learner gave is still theirs, and the choice is still theirs.
    expect(s.restoreLocal).not.toHaveBeenCalled();
    expect(
      screen.getByRole('checkbox', { name: acknowledgement }),
    ).toBeChecked();

    await userEvent.click(confirm);

    expect(await screen.findByText('RPG HOME REACHED')).toBeVisible();
    expect(s.restoreLocal).toHaveBeenCalledTimes(1);
    expect(s.state.runLocalMutation).toHaveBeenCalledTimes(1);
  });

  it('a call that reaches the handler anyway starts nothing while the export runs, and works once it has settled', async () => {
    const s = await setup('learner');
    const pending = deferred();

    render(
      <ExportingCard options={s.options} runExport={() => pending.promise} />,
    );
    await readyToRestore();
    await userEvent.click(
      screen.getByRole('checkbox', { name: acknowledgement }),
    );
    await click('Export local backup first');

    const confirm = screen.getByRole('button', { name: replace });

    await waitFor(() => expect(confirm).toBeDisabled(), { timeout: 1500 });
    // A stale event or a script bypassing the disabled attribute:
    await act(async () => {
      reactProps(confirm)?.onClick?.();
    });
    expect(s.restoreLocal).not.toHaveBeenCalled();
    expect(s.state.runLocalMutation).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve();
    });
    await waitFor(() => expect(confirm).toBeEnabled());
    await act(async () => {
      reactProps(confirm)?.onClick?.();
    });

    await waitFor(() => expect(s.restoreLocal).toHaveBeenCalledTimes(1));
  });

  it('a failed export frees the button again, claims nothing about a saved copy, and restores nothing by itself', async () => {
    const s = await setup('learner');
    const pending = deferred();

    render(
      <ExportingCard options={s.options} runExport={() => pending.promise} />,
    );
    await readyToRestore();
    await userEvent.click(
      screen.getByRole('checkbox', { name: acknowledgement }),
    );
    await click('Export local backup first');

    const confirm = screen.getByRole('button', { name: replace });

    await waitFor(() => expect(confirm).toBeDisabled(), { timeout: 1500 });
    await act(async () => {
      pending.reject(new Error('disk full'));
    });

    await waitFor(() => expect(confirm).toBeEnabled());
    expect(s.restoreLocal).not.toHaveBeenCalled();
    // Nothing announced here says a copy exists: the host reports the failure.
    const announced = [
      ...screen.queryAllByRole('alert'),
      ...screen.queryAllByRole('status'),
    ]
      .map((region) => region.textContent ?? '')
      .join(' ');

    expect(announced).not.toMatch(/export|saved|stored|download|copy|safe/i);
    expect(document.body.textContent).not.toMatch(/disk full/);
    // Still the learner's call, still with the consent they gave.
    expect(
      screen.getByRole('checkbox', { name: acknowledgement }),
    ).toBeChecked();
  });

  it('exporting is not consent: after a successful export the acknowledgement is still required', async () => {
    const s = await setup('learner');
    const pending = deferred();

    render(
      <ExportingCard options={s.options} runExport={() => pending.promise} />,
    );
    await readyToRestore();

    const confirm = screen.getByRole('button', { name: replace });

    await click('Export local backup first');
    await act(async () => {
      pending.resolve();
    });

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Export local backup first' }),
      ).not.toHaveAttribute('aria-busy'),
    );
    expect(confirm).toBeDisabled();
    expect(s.restoreLocal).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole('checkbox', { name: acknowledgement }),
    );
    expect(confirm).toBeEnabled();
  });

  it('with no learner data on the device, an export started from the Export a backup card still holds the restore', async () => {
    const s = await setup('fresh');
    const view = render(cardTree({ ...s.options, exporting: true }));

    await readyToRestore();

    const confirm = screen.getByRole('button', { name: replace });

    // No warning and no acknowledgement apply here; the export alone holds it.
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(confirm).toBeDisabled();
    await userEvent.click(confirm);
    expect(s.restoreLocal).not.toHaveBeenCalled();

    view.rerender(cardTree({ ...s.options, exporting: false }));

    expect(confirm).toBeEnabled();
  });

  it('a pending export does not stop the learner from cancelling the preparation', async () => {
    const s = await setup('learner');
    const pending = deferred();

    render(
      <ExportingCard options={s.options} runExport={() => pending.promise} />,
    );
    await readyToRestore();
    await click('Export local backup first');
    await click('Cancel');

    expect(screen.queryByText(/is ready to restore/)).not.toBeInTheDocument();
    expect(s.restoreLocal).not.toHaveBeenCalled();
    await act(async () => {
      pending.resolve();
    });
  });
});
