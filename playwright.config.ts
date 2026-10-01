import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = 42_183;
const E2E_URL = `http://127.0.0.1:${E2E_PORT}`;
const OFFLINE_SPEC = /offline\.spec\.ts/;
const VITE_CLI = 'node ./node_modules/vite/bin/vite.js';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  globalTimeout: 13 * 60 * 1000,
  reporter: 'list',
  retries: 0,
  workers: 1,
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: `${VITE_CLI} build && ${VITE_CLI} preview --host 127.0.0.1 --port ${E2E_PORT} --strictPort`,
      name: 'ProgressPal E2E production preview',
      reuseExistingServer: false,
      timeout: 180000,
      url: E2E_URL,
    },
  ],
  projects: [
    {
      name: 'chromium',
      testIgnore: OFFLINE_SPEC,
      use: { ...devices['Desktop Chrome'], baseURL: E2E_URL },
    },
    {
      name: 'offline',
      testMatch: OFFLINE_SPEC,
      use: { ...devices['Desktop Chrome'], baseURL: E2E_URL },
    },
  ],
});
