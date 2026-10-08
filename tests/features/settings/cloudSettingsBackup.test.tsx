import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

import { CloudError, type RemoteBackupWrite } from '@/lib/cloud';
import { produceBackupPayload } from '@/lib/cloudBackup';
import { saveLearnerProfile, upsertProgress } from '@/lib/db';
import { LocalWriteBlockedError } from '@/lib/storage';

import { createClock } from '../../db/testDatabase';
import {
  FakeBackupStore,
  gatewayFault,
  networkFault,
} from '../../lib/cloudBackup/fakeBackupStore';
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
  peerActiveCoordination,
  renderCard,
  stubState,
  type RenderCardOptions,
} from './cloudSettingsKit';

/**
 * The signed-in half of the Settings cloud card, against the real backup
 * service, the real strict parser and the real atomic restore on real
 * fake-indexeddb "devices". Only the provider is a model. What is proven:
 * one explicit Back up now and nothing automatic; outcomes worded exactly as
 * established (an unknown outcome is never success and never failure); the
 * inventory states server facts only; restore verifies before it offers, warns
 * and asks before it replaces, and any failure leaves this device unchanged.
 */

let source: Device;
let payloadText: string;
let devices: Device[] = [];
let store: FakeBackupStore;

beforeAll(async () => {
  source = await createLearnerDevice('card-source');
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
  // Nothing in this file may reach a real network.
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

/** A learner with data of their own, distinct from the backup's. */
async function createTargetLearner(label: string): Promise<Device> {
  const device = await createFreshDevice(label);
  const { db } = device.context;

  await saveLearnerProfile(
    {
      avatarConfig: { face: 'round', hair: 'short', topColor: 'forest' },
      displayName: 'Target Learner',
      preferredTheme: 'light',
      reducedMotion: false,
      targetMinutesPerWeek: 120,
      targetStudyDays: ['friday'],
    },
    {
      completeOnboarding: true,
      db,
      now: createClock('2026-10-08T10:00:00.000Z'),
    },
  );
  await upsertProgress(
    {
      itemId: 'week-0-lecture',
      status: 'started',
      startedAt: '2026-10-08T10:05:00.000Z',
      completedAt: undefined,
      confidence: 0.9,
      notes: 'Target note only.',
      evidenceType: undefined,
      evidenceText: undefined,
    },
    { db, now: createClock('2026-10-08T10:05:00.000Z') },
  );

  return device;
}

async function target(kind: 'fresh' | 'learner'): Promise<Device> {
  const device =
    kind === 'fresh'
      ? await createFreshDevice('card-target')
      : await createTargetLearner('card-target');

  devices.push(device);

  return device;
}

interface Setup {
  device: Device;
  account: ReturnType<typeof makeAccount>['account'];
  onExportLocal: ReturnType<typeof vi.fn>;
  restoreLocal: ReturnType<typeof vi.fn>;
  state: ReturnType<typeof stubState>;
  options: RenderCardOptions;
}

async function setup(
  kind: 'fresh' | 'learner' = 'learner',
  overrides: Partial<RenderCardOptions> = {},
): Promise<Setup> {
  const device = await target(kind);
  const made = makeAccount();
  const onExportLocal = vi.fn();
  const restoreLocal = vi.fn(device.restoreLocal);
  const state = overrides.state ?? stubState();

  enableCloud();
  made.signInDirectly();

  const options: RenderCardOptions = {
    state,
    onExportLocal,
    dependencies: {
      account: made.account,
      store,
      readSnapshot: device.readSnapshot,
      migrationContext: device.migrationContext,
      restoreLocal,
    },
    ...overrides,
  };

  return {
    device,
    account: made.account,
    onExportLocal,
    restoreLocal,
    state,
    options,
  };
}

/** Another device's backup of the source learner, as the server holds it. */
function seedRestorable(slot = 2, backupId = idFor(50)) {
  return store.seed(slot, { payload: payloadText, backupId });
}

const bannedFreshness =
  /\b(latest|current|currently|up[- ]to[- ]date|newer|older|newest|oldest|fresh(er)?|synced?|syncing|in sync|changes since|everything is backed up)\b/i;

const click = (name: string | RegExp) =>
  userEvent.click(screen.getByRole('button', { name }));

/**
 * The live region that holds a notice, found by the title it shows. More than
 * one status or alert can be on screen at once (a list summary, a warning), so
 * a bare role query would match several.
 */
const noticeWith = async (title: string) =>
  (await screen.findByText(title)).closest('[role]') as HTMLElement;

describe('Back up now', () => {
  it('is the only thing that stores a backup: one press, one backup, read-then-write-then-read, nothing else', async () => {
    const s = await setup();
    const before = await s.device.readSnapshot();

    renderCard(s.options);
    expect(store.requests).toHaveLength(0);

    await click('Back up now');

    const notice = await noticeWith('Backed up');

    expect(within(notice).getByText('Backed up')).toBeVisible();
    expect(notice).toHaveTextContent(
      /Stored by the server at \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC, [\d.]+ (KiB|MiB), slot 1\./,
    );
    // The inventory read, the one write, and the list refresh that shows it.
    expect(store.requests.map((request) => request.method)).toEqual([
      'listSlots',
      'replaceSlot',
      'listSlots',
    ]);
    expect(store.rows.size).toBe(1);
    // A backup changes nothing on this device.
    expect(await s.device.readSnapshot()).toEqual(before);
    expect(s.restoreLocal).not.toHaveBeenCalled();
    expect(s.state.runLocalMutation).not.toHaveBeenCalled();
    expect(s.state.refresh).not.toHaveBeenCalled();
  });

  it('shows the stored backup in the list it refreshed, from server facts', async () => {
    const s = await setup();

    renderCard(s.options);
    await click('Back up now');
    await screen.findByText('Backups on the server');

    expect(
      screen.getByText(
        '1 backup is stored on the server; 1 can be restored by this version.',
      ),
    ).toBeVisible();
    expect(screen.getByText('Slot 1')).toBeVisible();
    expect(screen.getByText(/Can be restored by this version\./)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Refresh list' })).toBeVisible();
  });

  it('a full ring says it replaced one earlier backup, without saying which is older', async () => {
    const s = await setup();

    for (let slot = 0; slot < 5; slot += 1) {
      store.seed(slot);
    }
    renderCard(s.options);
    await click('Back up now');

    const notice = await noticeWith('Backed up');

    expect(notice).toHaveTextContent('It replaced one earlier backup.');
    expect(store.rows.size).toBe(5);
    expect(notice.textContent).not.toMatch(bannedFreshness);
  });

  it('a confirmed refusal is worded as not backed up and says nothing changed on the server', async () => {
    const s = await setup();

    store.fault('replaceSlot', {
      kind: 'fail',
      failure: { kind: 'unauthenticated' },
    });
    renderCard(s.options);
    await click('Back up now');

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('Not backed up');
    expect(alert).toHaveTextContent(
      'The cloud service did not accept this sign-in. Sign out and sign in again.',
    );
    expect(alert).toHaveTextContent('Nothing was changed on the server.');
    expect(store.rows.size).toBe(0);
    // A refusal does not refresh the list.
    expect(store.count('listSlots')).toBe(1);
  });

  it("a precondition error is shown as not backed up in the account's own words", async () => {
    const s = await setup();

    store.fault('listSlots', {
      kind: 'throw',
      error: new CloudError('session-ended', 'Sign in to use cloud backup.'),
    });
    renderCard(s.options);
    await click('Back up now');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sign in to use cloud backup.',
    );
    expect(store.rows.size).toBe(0);
  });

  it('while it runs every cloud action is disabled, and a second press cannot start a second backup', async () => {
    const s = await setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const read = store.listSlots.bind(store);

    vi.spyOn(store, 'listSlots').mockImplementation(async () => {
      await gate;

      return read();
    });
    renderCard(s.options);

    const backUp = screen.getByRole('button', { name: 'Back up now' });

    await userEvent.click(backUp);
    await userEvent.click(backUp);

    expect(backUp).toBeDisabled();
    expect(backUp).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Show backups' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeDisabled();

    release();
    await screen.findByText('Backed up');

    expect(store.count('replaceSlot')).toBe(1);
  });

  it('is disabled while a local import or reset is running', async () => {
    const s = await setup('learner', { localBusy: true });

    renderCard(s.options);

    expect(screen.getByRole('button', { name: 'Back up now' })).toBeDisabled();
    expect(store.requests).toHaveLength(0);
  });

  it('is available in a read-only tab: a backup only reads this device', async () => {
    const s = await setup('learner', {
      state: stubState({ coordination: peerActiveCoordination }),
    });

    renderCard(s.options);
    await click('Back up now');

    expect(await screen.findByText('Backed up')).toBeVisible();
  });
});

describe('an outcome that is not known', () => {
  /** Two gateway failures: the write may or may not have committed. */
  function unknownOutcome(check: 'absent' | 'unreachable' = 'absent') {
    store.fault(
      'replaceSlot',
      { kind: 'fail', failure: gatewayFault },
      { kind: 'fail', failure: gatewayFault },
    );

    if (check === 'unreachable') {
      store.fault(
        'findBackup',
        { kind: 'fail', failure: networkFault },
        { kind: 'fail', failure: networkFault },
      );
    }
  }

  it('is its own state: neither stored nor not stored, with a check offered', async () => {
    const s = await setup();

    unknownOutcome();
    renderCard(s.options);
    await click('Back up now');

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('Backup outcome unknown');
    expect(alert).toHaveTextContent(
      'The cloud service did not give a clear answer, so it is not known whether this backup was stored.',
    );
    expect(alert).toHaveTextContent('When checked, it was not found.');
    expect(alert).toHaveTextContent(
      'It is not reported as stored or as not stored.',
    );
    expect(alert).not.toHaveTextContent(/Backed up|Stored by the server/);
    expect(alert).not.toHaveTextContent('Nothing was changed on the server');
    expect(
      within(alert).getByRole('button', { name: 'Check again' }),
    ).toBeEnabled();
    // An unknown outcome does not refresh or invent a list.
    expect(screen.queryByText('Backups on the server')).not.toBeInTheDocument();
  });

  it('says when the check itself could not reach the service', async () => {
    const s = await setup();

    unknownOutcome('unreachable');
    renderCard(s.options);
    await click('Back up now');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The check itself could not reach the cloud service.',
    );
  });

  it('Check again that still finds nothing stays unknown and offers the check again', async () => {
    const s = await setup();

    unknownOutcome();
    renderCard(s.options);
    await click('Back up now');
    await screen.findByText('Backup outcome unknown');
    await click('Check again');
    await waitFor(() => expect(store.count('findBackup')).toBe(3));

    expect(screen.getByText('Backup outcome unknown')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeEnabled();
    expect(store.count('replaceSlot')).toBe(2); // the check never writes
  });

  it('Check again that finds the backup with the matching hash reports it stored, once', async () => {
    const s = await setup();

    unknownOutcome();
    renderCard(s.options);
    await click('Back up now');
    await screen.findByText('Backup outcome unknown');

    // The first request lands late, with exactly the bytes that were sent.
    const attempted = store.requests.find(
      (request) => request.method === 'replaceSlot',
    )?.argument as RemoteBackupWrite;

    store.seed(attempted.slot, {
      backupId: attempted.backupId,
      payload: attempted.payload,
    });

    await click('Check again');

    const notice = await noticeWith('Backed up');

    expect(notice).toHaveTextContent('Backed up');
    expect(notice).toHaveTextContent(
      'The first request did not answer; the server confirmed this backup afterwards.',
    );
    expect(
      screen.queryByRole('button', { name: 'Check again' }),
    ).not.toBeInTheDocument();
    expect(await screen.findByText('Backups on the server')).toBeVisible();
    expect(store.count('replaceSlot')).toBe(2); // still only the original two
  });

  it('a backup with the same identity but a different server hash is stopped, not retried, not deleted', async () => {
    const s = await setup();

    store.hashDrift = true;
    renderCard(s.options);
    await click('Back up now');

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('Backup stopped');
    expect(alert).toHaveTextContent(
      "The server holds a backup with this backup's identity but different contents.",
    );
    expect(alert).toHaveTextContent(
      'Nothing was deleted, replaced or retried.',
    );
    expect(alert).toHaveTextContent(
      /expected checksum [0-9a-f]{8}, server checksum [0-9a-f]{8}\./,
    );
    expect(
      within(alert).queryByRole('button', { name: 'Check again' }),
    ).not.toBeInTheDocument();
    expect(store.count('replaceSlot')).toBe(1);
  });
});

describe('the inventory states server facts only', () => {
  it('nothing is listed until it is asked for, and then exactly one read happens', async () => {
    const s = await setup();

    seedRestorable(0);
    renderCard(s.options);

    expect(store.requests).toHaveLength(0);
    expect(screen.queryByText('Backups on the server')).not.toBeInTheDocument();

    await click('Show backups');
    await screen.findByText('Backups on the server');

    expect(store.requests.map((request) => request.method)).toEqual([
      'listSlots',
    ]);
    expect(
      screen.getByText(
        "Details only. Contents were not downloaded or checked. Times are the server's.",
      ),
    ).toBeVisible();
    // Metadata only: no payload was fetched, nothing was verified.
    expect(store.count('downloadBackup')).toBe(0);
  });

  it('lists every slot with its stored time, size, app version and whether this version can restore it', async () => {
    const s = await setup();

    seedRestorable(0);
    store.seed(1);
    store.seed(3, { schemaVersion: 3 });
    renderCard(s.options);
    await click('Show backups');

    expect(
      await screen.findByText(
        '3 backups are stored on the server; 2 can be restored by this version. The backup stored most recently by the server cannot be restored by this version.',
      ),
    ).toBeVisible();

    const list = screen.getByText('Slot 1').closest('dl') as HTMLElement;
    const rows = within(list).getAllByText(/^Slot \d$/);

    expect(rows.map((row) => row.textContent)).toEqual([
      'Slot 1',
      'Slot 2',
      'Slot 4',
    ]);
    expect(list).toHaveTextContent(/Stored 2026-10-08 12:00 UTC/);
    expect(list).toHaveTextContent(/app 1\.7\.1/);
    expect(
      list.textContent?.match(/Cannot be restored by this version\./g),
    ).toHaveLength(1);
    expect(
      list.textContent?.match(/Can be restored by this version\./g),
    ).toHaveLength(2);
  });

  it('an empty server says so, and offers no restore', async () => {
    const s = await setup();

    renderCard(s.options);
    await click('Show backups');

    expect(
      await screen.findByText('No backups are stored on the server.'),
    ).toBeVisible();
    expect(screen.queryByText('Restore a backup')).not.toBeInTheDocument();
  });

  it('only backups this version cannot restore: said so, and no restore is offered', async () => {
    const s = await setup();

    store.seed(0, { formatVersion: 2 });
    renderCard(s.options);
    await click('Show backups');

    expect(
      await screen.findByText(
        '1 backup is stored on the server; none can be restored by this version.',
      ),
    ).toBeVisible();
    expect(screen.queryByText('Restore a backup')).not.toBeInTheDocument();
  });

  it('a list that could not be read is never shown as an empty list', async () => {
    const s = await setup();

    store.fault('listSlots', { kind: 'fail', failure: networkFault });
    renderCard(s.options);
    await click('Show backups');

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent(
      'The backup list could not be read. The cloud service could not be reached.',
    );
    expect(screen.queryByText(/No backups are stored/)).not.toBeInTheDocument();
    expect(screen.queryByText('Restore a backup')).not.toBeInTheDocument();
  });

  it('Refresh list reads again', async () => {
    const s = await setup();

    renderCard(s.options);
    await click('Show backups');
    await screen.findByText('No backups are stored on the server.');
    seedRestorable(0);
    await click('Refresh list');

    expect(
      await screen.findByText(
        '1 backup is stored on the server; 1 can be restored by this version.',
      ),
    ).toBeVisible();
    expect(store.count('listSlots')).toBe(2);
  });

  it('never claims freshness, completeness or a comparison with this device, in any state it can reach', async () => {
    const s = await setup();
    const seen: string[] = [];
    const snapshot = () =>
      seen.push(
        screen
          .getByRole('heading', {
            name: 'Cloud backup (optional)',
          })
          .closest('.card')?.textContent ?? '',
      );

    seedRestorable(0);
    store.seed(1, { schemaVersion: 3 });
    renderCard(s.options);
    snapshot();
    await click('Back up now');
    await screen.findByText('Backups on the server');
    snapshot();
    await click('Download and check');
    await screen.findByText(/is ready to restore/);
    snapshot();

    expect(seen.join(' ').length).toBeGreaterThan(500);
    expect(seen.join(' ')).not.toMatch(bannedFreshness);
    expect(seen.join(' ')).not.toMatch(
      /Backup current|Changes since last backup/i,
    );
  });
});

describe('restore', () => {
  async function showAndChoose(s: Setup) {
    renderCard(s.options);
    await click('Show backups');
    await screen.findByText('Restore a backup');
  }

  it('offers only backups this version can restore, one at a time', async () => {
    const s = await setup();

    seedRestorable(2);
    store.seed(3, { formatVersion: 2 });
    await showAndChoose(s);

    const select = screen.getByLabelText('Backup to restore');

    expect(within(select).getAllByRole('option')).toHaveLength(1);
    expect(select).toHaveDisplayValue(/^Slot 3: stored 2026-10-08 12:00 UTC, /);
    expect(store.count('downloadBackup')).toBe(0);
  });

  it('downloads only the chosen backup, verifies it, and shows what it holds before anything changes', async () => {
    const s = await setup('learner');
    const before = await s.device.readSnapshot();

    seedRestorable(1, idFor(51));
    seedRestorable(2, idFor(52));
    await showAndChoose(s);
    await userEvent.selectOptions(
      screen.getByLabelText('Backup to restore'),
      idFor(52),
    );
    await click('Download and check');

    const ready = await screen.findByText(
      'Backup from slot 3 is ready to restore',
    );

    expect(store.requests.filter((r) => r.method === 'downloadBackup')).toEqual(
      [
        {
          method: 'downloadBackup',
          argument: { slot: 2, backupId: idFor(52) },
        },
      ],
    );
    expect(ready).toHaveFocus();
    expect(
      screen.getByText(
        "Downloaded, matched against the server's checksum and read successfully. Nothing has been changed yet.",
      ),
    ).toBeVisible();

    const preview = ready.parentElement as HTMLElement;

    expect(within(preview).getByText('Profile').nextSibling).toHaveTextContent(
      'Synthetic Learner',
    );
    expect(
      within(preview).getByText('Stored (server time)').nextSibling,
    ).toHaveTextContent(/^2026-10-08 12:00 UTC$/);
    expect(
      within(preview).getByText('Progress entries').nextSibling,
    ).toHaveTextContent('1');
    // Nothing on this device changed, and nothing was handed to the restore.
    expect(await s.device.readSnapshot()).toEqual(before);
    expect(s.restoreLocal).not.toHaveBeenCalled();
    expect(s.state.runLocalMutation).not.toHaveBeenCalled();
  });

  describe('when this device holds learner data', () => {
    async function prepared() {
      const s = await setup('learner');

      seedRestorable(2);
      await showAndChoose(s);
      await click('Download and check');
      await screen.findByText(/is ready to restore/);

      return s;
    }

    it('shows the destructive warning, offers the local export first, and will not confirm until it is acknowledged', async () => {
      const s = await prepared();

      expect(
        screen.getByText(
          'Restoring replaces all learner data on this device with this backup. This is destructive and cannot be undone.',
        ),
      ).toBeVisible();

      const confirm = screen.getByRole('button', {
        name: 'Replace local data with this backup',
      });
      const acknowledge = screen.getByRole('checkbox', {
        name: "Replace this device's data with this backup",
      });

      expect(confirm).toBeDisabled();
      expect(acknowledge).not.toBeChecked();

      await userEvent.click(confirm);
      expect(s.restoreLocal).not.toHaveBeenCalled();

      await click('Export local backup first');
      expect(s.onExportLocal).toHaveBeenCalledTimes(1);
      expect(confirm).toBeDisabled(); // exporting is not consent
      expect(s.restoreLocal).not.toHaveBeenCalled();

      await userEvent.click(acknowledge);
      expect(confirm).toBeEnabled();
    });

    it("replaces this device's data with the backup, once, through the existing restore and the mutation runner, then goes to the dashboard", async () => {
      const s = await prepared();

      await userEvent.click(
        screen.getByRole('checkbox', {
          name: "Replace this device's data with this backup",
        }),
      );
      await click('Replace local data with this backup');

      expect(await screen.findByText('RPG HOME REACHED')).toBeVisible();
      expect(s.restoreLocal).toHaveBeenCalledTimes(1);
      expect(s.restoreLocal.mock.calls[0]?.[1]).toEqual({
        fileName: `cloud-backup-${idFor(50)}.json`,
      });
      expect(s.state.runLocalMutation).toHaveBeenCalledTimes(1);
      expect(s.state.runLocalMutation).toHaveBeenCalledWith(
        expect.any(Function),
        { invalidateRoute: true },
      );

      const after = await s.device.readSnapshot();

      expect(after.learnerProfile?.displayName).toBe('Synthetic Learner');
      expect(after.progressEntries.map((entry) => entry.notes)).toEqual([
        'Synthetic note.',
      ]);
    });

    it('cancel drops the preparation and returns to choosing, with nothing changed', async () => {
      const s = await prepared();
      const before = await s.device.readSnapshot();

      await click('Cancel');

      expect(screen.queryByText(/is ready to restore/)).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Download and check' }),
      ).toBeEnabled();
      expect(await s.device.readSnapshot()).toEqual(before);
      expect(s.restoreLocal).not.toHaveBeenCalled();
    });

    it('a restore the local write lease refuses leaves this device unchanged and says another tab is writing', async () => {
      const s = await prepared();
      const before = await s.device.readSnapshot();

      s.restoreLocal.mockRejectedValueOnce(
        new LocalWriteBlockedError('peer-active', true),
      );
      await userEvent.click(
        screen.getByRole('checkbox', {
          name: "Replace this device's data with this backup",
        }),
      );
      await click('Replace local data with this backup');

      const alert = await noticeWith('Not restored');

      expect(alert).toHaveTextContent('Not restored');
      expect(alert).toHaveTextContent(
        'Another ProgressPal tab is writing, so the restore did not run. Close it and try again.',
      );
      expect(alert).toHaveTextContent('Nothing was changed on this device.');
      expect(screen.queryByText('RPG HOME REACHED')).not.toBeInTheDocument();
      expect(await s.device.readSnapshot()).toEqual(before);
    });

    it('any other restore failure is reported and leaves this device unchanged', async () => {
      const s = await prepared();
      const before = await s.device.readSnapshot();

      s.restoreLocal.mockRejectedValueOnce(new Error('disk full'));
      await userEvent.click(
        screen.getByRole('checkbox', {
          name: "Replace this device's data with this backup",
        }),
      );
      await click('Replace local data with this backup');

      const failure = await screen.findByText('The restore failed.');

      expect(failure).toBeVisible();
      expect(document.body.textContent).not.toMatch(/disk full/);
      expect(await s.device.readSnapshot()).toEqual(before);
    });

    it('a second press while the restore runs cannot restore twice', async () => {
      const s = await prepared();
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });

      s.restoreLocal.mockImplementationOnce(async (data, options) => {
        await gate;

        return s.device.restoreLocal(data, options);
      });
      await userEvent.click(
        screen.getByRole('checkbox', {
          name: "Replace this device's data with this backup",
        }),
      );

      const confirm = screen.getByRole('button', {
        name: 'Replace local data with this backup',
      });

      await userEvent.click(confirm);
      await userEvent.click(confirm);
      expect(confirm).toBeDisabled();
      release();
      await screen.findByText('RPG HOME REACHED');

      expect(s.restoreLocal).toHaveBeenCalledTimes(1);
    });
  });

  describe('when this device holds no learner data', () => {
    it('does not invent a warning: it says nothing here is replaced, and confirms in one step', async () => {
      const s = await setup('fresh');

      seedRestorable(2);
      await showAndChoose(s);
      await click('Download and check');
      await screen.findByText(/is ready to restore/);

      expect(
        screen.getByText(
          'This device holds no learner data, so nothing here is replaced.',
        ),
      ).toBeVisible();
      expect(screen.queryByText(/destructive/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Export local backup first' }),
      ).not.toBeInTheDocument();

      await click('Replace local data with this backup');
      await screen.findByText('RPG HOME REACHED');

      expect(s.restoreLocal).toHaveBeenCalledTimes(1);
    });

    it('if learner data appears before the confirmation, the warning and acknowledgement appear and nothing is replaced yet', async () => {
      const s = await setup('fresh');

      seedRestorable(2);
      await showAndChoose(s);
      await click('Download and check');
      await screen.findByText(/is ready to restore/);

      // The learner finishes onboarding in another window meanwhile.
      await saveLearnerProfile(
        {
          avatarConfig: { face: 'round', hair: 'short', topColor: 'forest' },
          displayName: 'Arrived meanwhile',
          preferredTheme: 'light',
          reducedMotion: false,
          targetMinutesPerWeek: 120,
          targetStudyDays: ['friday'],
        },
        {
          completeOnboarding: true,
          db: s.device.context.db,
          now: createClock('2026-10-08T11:00:00.000Z'),
        },
      );
      await click('Replace local data with this backup');

      expect(await noticeWith('Not restored')).toHaveTextContent(
        'This device now holds learner data. Confirm that it will be replaced, then try again.',
      );
      // The warning and the acknowledgement appeared with the refusal.
      expect(
        screen.getByText(
          'Restoring replaces all learner data on this device with this backup. This is destructive and cannot be undone.',
        ),
      ).toBeVisible();
      expect(s.restoreLocal).not.toHaveBeenCalled();

      const acknowledge = screen.getByRole('checkbox', {
        name: "Replace this device's data with this backup",
      });

      await userEvent.click(acknowledge);
      await click('Replace local data with this backup');
      await screen.findByText('RPG HOME REACHED');

      expect(s.restoreLocal).toHaveBeenCalledTimes(1);
    });
  });

  describe('verification failures leave this device exactly as it was', () => {
    async function attempt(s: Setup) {
      const before = await s.device.readSnapshot();

      await showAndChoose(s);
      await click('Download and check');

      return before;
    }

    function expectUntouched(s: Setup, before: unknown) {
      return async () => {
        expect(await s.device.readSnapshot()).toEqual(before);
        expect(s.restoreLocal).not.toHaveBeenCalled();
        expect(s.state.runLocalMutation).not.toHaveBeenCalled();
        expect(
          screen.queryByText(/is ready to restore/),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole('button', {
            name: 'Replace local data with this backup',
          }),
        ).not.toBeInTheDocument();
      };
    }

    it("a download whose checksum does not match the server's is refused and never parsed", async () => {
      const s = await setup('learner');

      seedRestorable(2);
      store.rows.get(2)!.payload = `${payloadText} tampered`;
      const before = await attempt(s);
      const alert = await screen.findByRole('alert');

      expect(alert).toHaveTextContent('Backup not used');
      expect(alert).toHaveTextContent(
        'The downloaded backup did not match the checksum the server computed. It was not used.',
      );
      expect(alert).toHaveTextContent('Nothing was changed on this device.');
      await expectUntouched(s, before)();
    });

    it("a checksummed download that is not a valid backup is refused with the parser's own message", async () => {
      const s = await setup('learner');

      store.seed(2, { payload: '{"not":"a backup"}' });
      const before = await attempt(s);
      const alert = await screen.findByRole('alert');

      expect(alert).toHaveTextContent('Backup not used');
      expect(alert).toHaveTextContent('Nothing was changed on this device.');
      await expectUntouched(s, before)();
    });

    it('a browser that cannot compute checksums refuses, and says that is the reason', async () => {
      const s = await setup('learner');

      seedRestorable(2);
      vi.spyOn(crypto.subtle, 'digest').mockRejectedValue(
        new Error('no subtle crypto'),
      );
      const before = await attempt(s);
      const alert = await screen.findByRole('alert');

      expect(alert).toHaveTextContent(
        'This browser cannot compute checksums here (it needs HTTPS or localhost), so the backup was not used.',
      );
      await expectUntouched(s, before)();
    });

    it('a backup that left its slot meanwhile is reported as gone', async () => {
      const s = await setup('learner');

      seedRestorable(2);
      renderCard(s.options);
      await click('Show backups');
      await screen.findByText('Restore a backup');
      store.rows.delete(2);
      const before = await s.device.readSnapshot();
      await click('Download and check');

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'That backup is no longer in that slot on the server. Refresh the list and choose again.',
      );
      await expectUntouched(s, before)();
    });

    it('a download that cannot be made is not an empty or corrupt backup', async () => {
      const s = await setup('learner');

      seedRestorable(2);
      store.fault('downloadBackup', { kind: 'fail', failure: networkFault });
      const before = await attempt(s);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The backup could not be downloaded. The cloud service could not be reached.',
      );
      await expectUntouched(s, before)();
    });
  });

  describe('write coordination and a second tab', () => {
    it('a read-only tab cannot choose, download or restore, and says why', async () => {
      const s = await setup('learner', {
        state: stubState({ coordination: peerActiveCoordination }),
      });

      seedRestorable(2);
      await showAndChoose(s);

      expect(
        screen.getByText(
          'This tab cannot write local data right now, so restore is unavailable.',
        ),
      ).toBeVisible();
      expect(screen.getByLabelText('Backup to restore')).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Download and check' }),
      ).toBeDisabled();
      expect(store.count('downloadBackup')).toBe(0);
    });

    it('a tab that becomes read-only after the preview can no longer confirm', async () => {
      const s = await setup('learner');
      const view = renderCard(s.options);

      seedRestorable(2);
      await click('Show backups');
      await screen.findByText('Restore a backup');
      await click('Download and check');
      await screen.findByText(/is ready to restore/);
      await userEvent.click(
        screen.getByRole('checkbox', {
          name: "Replace this device's data with this backup",
        }),
      );

      // Same mutation runner, so the preparation stays valid; only writing is lost.
      view.rerender(
        cardTree({
          ...s.options,
          state: stubState({
            coordination: peerActiveCoordination,
            runLocalMutation: s.state.runLocalMutation,
          }),
        }),
      );

      expect(
        screen.getByRole('button', {
          name: 'Replace local data with this backup',
        }),
      ).toBeDisabled();
      expect(
        screen.getByText(
          'This tab cannot write local data right now, so restore is unavailable.',
        ),
      ).toBeVisible();
      expect(s.restoreLocal).not.toHaveBeenCalled();
    });

    it('a local import or reset in progress blocks restore with its own reason', async () => {
      const s = await setup('learner', { localBusy: true });

      seedRestorable(2);
      await showAndChoose(s);

      expect(
        screen.getByText('A local import or reset is running.'),
      ).toBeVisible();
      expect(
        screen.getByRole('button', { name: 'Download and check' }),
      ).toBeDisabled();
    });

    it('restore actions are disabled while a backup or a list read is running', async () => {
      const s = await setup('learner');
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });

      seedRestorable(2);
      await showAndChoose(s);

      const read = store.listSlots.bind(store);

      vi.spyOn(store, 'listSlots').mockImplementation(async () => {
        await gate;

        return read();
      });
      await act(async () => {
        await userEvent.click(
          screen.getByRole('button', { name: 'Refresh list' }),
        );
      });

      expect(
        screen.getByRole('button', { name: 'Download and check' }),
      ).toBeDisabled();
      release();
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Download and check' }),
        ).toBeEnabled(),
      );
    });
  });

  it('keyboard: choose with the keyboard, download with Enter, acknowledge with Space, in one coherent order', async () => {
    const s = await setup('learner');

    seedRestorable(1, idFor(51));
    seedRestorable(2, idFor(52));
    await showAndChoose(s);

    const select = screen.getByLabelText('Backup to restore');

    // jsdom's user-event does not implement arrow-key selection inside a
    // native select; that part of the keyboard path is proven in the browser
    // (e2e/cloud-settings.spec.ts). Here the choice is made as a user would
    // make it, and the rest of the order is driven by the keyboard.
    select.focus();
    await userEvent.selectOptions(select, idFor(52));
    expect(select).toHaveDisplayValue(/^Slot 3:/);
    await userEvent.tab();
    expect(
      screen.getByRole('button', { name: 'Download and check' }),
    ).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await screen.findByText(/is ready to restore/);
    await userEvent.tab();
    const acknowledge = screen.getByRole('checkbox', {
      name: "Replace this device's data with this backup",
    });

    expect(acknowledge).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(acknowledge).toBeChecked();
    await userEvent.tab();
    expect(
      screen.getByRole('button', { name: 'Export local backup first' }),
    ).toHaveFocus();
    await userEvent.tab();
    expect(
      screen.getByRole('button', {
        name: 'Replace local data with this backup',
      }),
    ).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await screen.findByText('RPG HOME REACHED');
    expect(s.restoreLocal).toHaveBeenCalledTimes(1);
  });
});
