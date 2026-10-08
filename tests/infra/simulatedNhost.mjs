// Installs the SIMULATED Nhost stack (simulatedNhostCore.mjs) as the global
// fetch, loaded with `node --import`, so the real live-validation harness can
// be exercised offline. The model, its modes and its limits are described in
// the core module; this file only installs it and reports what a run left
// behind.
//
// This is a test double. It proves the harness logic; it proves nothing about
// the real provider, which is exactly why the owner-run live step exists.
import { writeFileSync } from 'node:fs';

import { createSimulatedNhost } from './simulatedNhostCore.mjs';

globalThis.__PROGRESSPAL_SIMULATED_NHOST__ = true;

const simulation = createSimulatedNhost({
  mode: process.env.FAKE_NHOST_MODE ?? 'healthy',
});

// Lets the test see what the run left behind: rows per signed-in account.
process.on('exit', () => {
  const file = process.env.FAKE_NHOST_STATE_FILE;

  if (!file) return;

  writeFileSync(file, JSON.stringify(simulation.snapshot()));
});

globalThis.fetch = simulation.fetch;
