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

afterEach(async () => {
  cleanup();

  document.documentElement.removeAttribute('data-motion');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = 'light';

  await deleteSharedDatabase();
});
