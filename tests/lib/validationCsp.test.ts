import { expect, it, vi } from 'vitest';

it('creates and runs app schemas without probing or compiling dynamic code', async () => {
  vi.resetModules();
  const dynamicCode = vi
    .spyOn(globalThis, 'Function')
    .mockImplementation(() => {
      throw new Error('Dynamic code is prohibited by the app CSP.');
    });

  try {
    const { ProgressEntrySchema } = await import('@/lib/domain');
    const { BackupEnvelopeSchema } = await import('@/lib/backup/envelope');
    const progress = {
      id: 'progress-example',
      itemId: 'week-0-lecture',
      status: 'blocked',
      confidence: 3,
      createdAt: '2026-09-16T08:00:00Z',
      updatedAt: '2026-09-16T08:00:00Z',
    };

    expect(ProgressEntrySchema.safeParse(progress).success).toBe(true);
    expect(
      ProgressEntrySchema.safeParse({ ...progress, status: 'invalid-status' })
        .success,
    ).toBe(false);
    expect(BackupEnvelopeSchema.safeParse({}).success).toBe(false);
    expect(dynamicCode).not.toHaveBeenCalled();
  } finally {
    dynamicCode.mockRestore();
    vi.resetModules();
  }
});
