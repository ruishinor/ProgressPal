import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadRpgHubSummary: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@/features/rpg/model/readModels', () => ({
  loadRpgHubSummary: mocks.loadRpgHubSummary,
}));

vi.mock('@/lib/appState', () => ({
  useAppState: () => ({
    coordination: { blockReason: null },
    refresh: mocks.refresh,
  }),
}));

import { RpgShell } from '@/features/rpg/shell/RpgShell';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RpgShell HUD lifecycle', () => {
  it('ignores a HUD read failure after the shell unmounts', async () => {
    let rejectLoad!: (reason: Error) => void;
    mocks.loadRpgHubSummary.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectLoad = reject;
      }),
    );
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const view = render(
      <MemoryRouter>
        <RpgShell />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mocks.loadRpgHubSummary).toHaveBeenCalledOnce();
    });

    view.unmount();
    await act(async () => {
      rejectLoad(new Error('database closed during teardown'));
      await Promise.resolve();
    });

    expect(consoleError).not.toHaveBeenCalled();
  });
});
