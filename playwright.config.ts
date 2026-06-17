import { defineConfig, devices } from '@playwright/test';

const DEV_PORT = 4173;
const PREVIEW_PORT = 4180;
const DEV_URL = `http://127.0.0.1:${DEV_PORT}`;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;
const OFFLINE_SPEC = /offline\.spec\.ts/;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  retries: 0,
  use: {
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${DEV_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      url: DEV_URL,
    },
    {
      // Offline/cold-start tests must run against the real production build, so
      // this server builds first, then serves dist via vite preview on its own
      // port. The existing dev-based suite is unaffected.
      command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PREVIEW_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180000,
      url: PREVIEW_URL,
    },
  ],
  projects: [
    {
      name: 'chromium',
      testIgnore: OFFLINE_SPEC,
      use: { ...devices['Desktop Chrome'], baseURL: DEV_URL },
    },
    {
      name: 'offline',
      testMatch: OFFLINE_SPEC,
      use: { ...devices['Desktop Chrome'], baseURL: PREVIEW_URL },
    },
  ],
});
