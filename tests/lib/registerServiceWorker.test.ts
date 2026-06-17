import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerServiceWorker } from '@/lib/pwa';

function setServiceWorkerSupport(
  register: ((scriptUrl: string) => Promise<unknown>) | undefined,
): void {
  if (register === undefined) {
    Reflect.deleteProperty(navigator, 'serviceWorker');
    return;
  }

  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setServiceWorkerSupport(undefined);
});

describe('registerServiceWorker', () => {
  it('does nothing outside a production build', () => {
    vi.stubEnv('PROD', false);
    const register = vi.fn(() => Promise.resolve());
    setServiceWorkerSupport(register);
    const addEventListener = vi.spyOn(window, 'addEventListener');

    registerServiceWorker();

    expect(addEventListener).not.toHaveBeenCalledWith(
      'load',
      expect.any(Function),
    );
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing when service workers are unsupported', () => {
    vi.stubEnv('PROD', true);
    setServiceWorkerSupport(undefined);
    const addEventListener = vi.spyOn(window, 'addEventListener');

    registerServiceWorker();

    expect(addEventListener).not.toHaveBeenCalledWith(
      'load',
      expect.any(Function),
    );
  });

  it('registers /sw.js on load in production when supported', () => {
    vi.stubEnv('PROD', true);
    const register = vi.fn(() => Promise.resolve());
    setServiceWorkerSupport(register);
    const addEventListener = vi.spyOn(window, 'addEventListener');

    registerServiceWorker();

    const loadHandler = addEventListener.mock.calls.find(
      ([eventName]) => eventName === 'load',
    )?.[1];
    expect(loadHandler).toBeTypeOf('function');

    (loadHandler as EventListener)(new Event('load'));
    expect(register).toHaveBeenCalledWith('/sw.js');
  });
});
