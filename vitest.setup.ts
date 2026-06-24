import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import { deleteSharedDatabase } from '@/lib/db';

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  }),
});

// jsdom does not implement scrollTo; the RPG shell calls it on route change.
Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  writable: true,
  value: () => undefined,
});

afterEach(async () => {
  cleanup();

  document.documentElement.removeAttribute('data-motion');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = 'light';

  await deleteSharedDatabase();
});
