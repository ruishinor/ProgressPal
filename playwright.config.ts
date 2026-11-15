import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = 42_183;
const E2E_URL = `http://127.0.0.1:${E2E_PORT}`;
const OFFLINE_SPEC = /offline\.spec\.ts/;
const ACCOUNT_SYNC_SPEC = /account-sync\.spec\.ts/;
// Needs a build with VITE_PROGRESSPAL_GUILD_COMMONS=true; off by default.
const GUILD_COMMONS_SPEC = /guild-commons\.spec\.ts/;
// Capture-only review tooling for closed epics: screenshots, no comparison.
// Opt in with PROGRESSPAL_REVIEW_CAPTURE=true; not part of certification.
const REVIEW_CAPTURE_SPEC =
  /(b2-shell-visual-review|b4-shell-coherence-visual-review|c1-baseline-visual-capture|d-shell-review-capture)\.spec\.ts/;
const VITE_CLI = 'node ./node_modules/vite/bin/vite.js';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  globalTimeout: 75 * 60 * 1000,
  reporter: 'list',
  retries: 0,
  maxFailures: 1,
  // Three CI workers on the two-vCPU runner: tests partly wait, so the third
  // worker still raises throughput (hosted e2e 24.7 min with three workers,
  // about 31 min with two), but contention makes each test up to ~1.4x slower.
  // The per-test budget absorbs that; assertions keep their own timeouts.
  workers: process.env.CI ? 3 : 1,
  timeout: 60_000,
  use: {
    screenshot: 'only-on-failure',
    // The retained trace holds the failure's screencast, DOM and network.
    // Recording a video of every passing test only cost CPU.
    trace: 'retain-on-failure',
    video: 'off',
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
  projects:
    process.env.PROGRESSPAL_REVIEW_CAPTURE === 'true'
      ? [
          {
            name: 'review-capture',
            testMatch: REVIEW_CAPTURE_SPEC,
            use: { ...devices['Desktop Chrome'], baseURL: E2E_URL },
          },
        ]
      : process.env.VITE_PROGRESSPAL_GUILD_COMMONS === 'true'
        ? [
            {
              name: 'guild-commons',
              testMatch: GUILD_COMMONS_SPEC,
              use: { ...devices['Desktop Chrome'], baseURL: E2E_URL },
            },
          ]
        : process.env.VITE_PROGRESSPAL_ACCOUNT_SYNC === 'true'
          ? [
              {
                name: 'account-sync',
                testMatch: ACCOUNT_SYNC_SPEC,
                use: { ...devices['Desktop Chrome'], baseURL: E2E_URL },
              },
            ]
          : [
              {
                name: 'chromium',
                testIgnore: [
                  OFFLINE_SPEC,
                  ACCOUNT_SYNC_SPEC,
                  GUILD_COMMONS_SPEC,
                  REVIEW_CAPTURE_SPEC,
                ],
                use: { ...devices['Desktop Chrome'], baseURL: E2E_URL },
              },
              {
                name: 'offline',
                testMatch: OFFLINE_SPEC,
                use: { ...devices['Desktop Chrome'], baseURL: E2E_URL },
              },
            ],
});
