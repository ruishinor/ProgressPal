import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { deleteSharedDatabase } from '@/lib/db/database';
import { FakeLockManager } from './tests/lib/localDataCoordinationFakes';

// IndexedDB-backed route reads can exceed Testing Library's 1 s default on a
// constrained Windows runner. Browser gates cover user-visible timing; unit
// integration queries get a bounded 5 s window so scheduler variance is not a
// false product failure.
configure({ asyncUtilTimeout: 5000 });

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

// Browser gates verify focus visibility; jsdom has no scrolling layout.
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  writable: true,
  value: () => undefined,
});

// jsdom does not implement the Web Locks API. Install a fresh spec-shaped lock
// manager for every test so browser-session tests exercise the same mandatory
// ownership path as production. Tests for unsupported browsers explicitly
// remove this property within their own scope.
beforeEach(() => {
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: new FakeLockManager(),
  });
});

afterEach(async () => {
  cleanup();

  document.documentElement.removeAttribute('data-motion');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = 'light';

  await deleteSharedDatabase();
});
