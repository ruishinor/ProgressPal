import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedbackWidget } from '@/features/feedback';
import { submitFeedback } from '@/features/feedback/transport';

vi.mock('@/features/feedback/transport', () => ({
  submitFeedback: vi.fn(),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

describe('voluntary feedback dialog', () => {
  beforeEach(() => vi.clearAllMocks());
  it('never sends while closed; sends opt-in report without learner metadata', async () => {
    vi.mocked(submitFeedback).mockResolvedValue({
      status: 'received',
      receipt: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });
    const user = userEvent.setup();
    render(<FeedbackWidget />);
    expect(submitFeedback).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Meld feil/ }));
    await user.type(screen.getByLabelText('Hva vil du fortelle oss?'), 'Synthetic report about the exercise');
    await user.click(screen.getByRole('button', { name: 'Send inn' }));
    await waitFor(() => {
      expect(submitFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          schemaVersion: 1,
          category: 'technical',
          message: 'Synthetic report about the exercise',
        }),
      );
    });
    const call = vi.mocked(submitFeedback).mock.calls[0]?.[0];
    expect(call).not.toHaveProperty('technicalContext');
    expect(call).not.toHaveProperty('replyEmail');
    expect(await screen.findByText(/Meldingen er mottatt/)).toBeInTheDocument();
  });

  it('retains an unsent draft after cancel and allows explicit diagnostic opt-in', async () => {
    const user = userEvent.setup();
    render(<FeedbackWidget compact />);
    await user.click(screen.getByRole('button', { name: 'Meld fra' }));
    await user.type(screen.getByLabelText('Hva vil du fortelle oss?'), 'Synthetic content issue');
    await user.click(screen.getByRole('button', { name: 'Avbryt' }));
    await user.click(screen.getByRole('button', { name: 'Meld fra' }));
    expect(screen.getByLabelText('Hva vil du fortelle oss?')).toHaveValue('Synthetic content issue');
    await user.click(screen.getByLabelText('Legg ved teknisk informasjon'));
    vi.mocked(submitFeedback).mockResolvedValue({ status: 'unavailable' });
    fireEvent.submit(screen.getByRole('button', { name: 'Send inn' }).closest('form')!);
    await waitFor(() => expect(submitFeedback).toHaveBeenCalled());
    const call = vi.mocked(submitFeedback).mock.lastCall?.[0];
    expect(call?.technicalContext).toMatchObject({
      version: expect.any(String),
      browser: expect.any(String),
      os: expect.any(String),
      page: expect.any(String),
    });
  });
});
