import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CoordinationRepairControl } from '@/components/ui/CoordinationRepairControl';
import * as storage from '@/lib/storage';
import { localCoordinationStorageKeys } from '@/lib/storage';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { installNavigatorLocks } from '../lib/localDataCoordinationFakes';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem(localCoordinationStorageKeys.revision);
  localStorage.removeItem(localCoordinationStorageKeys.message);
});

describe('corrupt revision recovery surface', () => {
  it('shows the repair control on the startup error screen when the revision is exhausted', async () => {
    localStorage.setItem(localCoordinationStorageKeys.revision, 'garbage');

    await renderAppAtRoute('/');

    expect(
      await screen.findByRole('heading', { name: 'Local startup failed' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Repair local tab safety' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Local tab-coordination metadata is corrupt. Repair resets only the tab-safety counter; your study data is not touched.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Retry local data load' }),
    ).toBeDisabled();
  });

  it('keeps the genuine Web Locks absence copy without the repair control', async () => {
    const restoreNavigatorLocks = installNavigatorLocks(undefined);

    try {
      await renderAppAtRoute('/');

      expect(
        await screen.findByRole('heading', { name: 'Local startup failed' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Safe local-tab coordination is unavailable in this browser context. ProgressPal will keep local writes blocked.',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Retry local data load' }),
      ).toBeDisabled();
      expect(
        screen.queryByRole('button', { name: 'Repair local tab safety' }),
      ).not.toBeInTheDocument();
    } finally {
      restoreNavigatorLocks();
    }
  });
});

describe('CoordinationRepairControl', () => {
  it('calls onRepaired exactly once after a successful repair', async () => {
    const user = userEvent.setup();
    const onRepaired = vi.fn();
    const repair = vi
      .spyOn(storage, 'repairLocalCoordinationRevision')
      .mockResolvedValue('repaired');
    render(<CoordinationRepairControl onRepaired={onRepaired} />);

    await user.click(
      screen.getByRole('button', { name: 'Repair local tab safety' }),
    );

    expect(repair).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(onRepaired).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.queryByText('Close every other ProgressPal tab, then try again.'),
    ).not.toBeInTheDocument();
  });

  it('shows guidance without calling onRepaired when repair is blocked', async () => {
    const user = userEvent.setup();
    const onRepaired = vi.fn();
    vi.spyOn(storage, 'repairLocalCoordinationRevision').mockResolvedValue(
      'blocked',
    );
    render(<CoordinationRepairControl onRepaired={onRepaired} />);

    await user.click(
      screen.getByRole('button', { name: 'Repair local tab safety' }),
    );

    expect(
      await screen.findByText(
        'Close every other ProgressPal tab, then try again.',
      ),
    ).toBeInTheDocument();
    expect(onRepaired).not.toHaveBeenCalled();
  });
});
