import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Epic G repair 01 (finding 2): learner-visible wording must not claim that
 * ProgressPal is local-only. The released product is local-only and the
 * default (cloud off) state still is, but a learner may now turn on an
 * optional, manual remote backup, so exclusivity words ("only", "never",
 * "no account", "Offline only", "stored remotely") became untrue on the
 * surfaces that carried them. The rendered proof, in both states, is
 * tests/app/localFirstCopy.test.tsx; this keeps the retired phrasing from
 * returning anywhere in the application source.
 *
 * State-neutral statements stay welcome: "stored on this device", "No account
 * is needed", "nothing is synced", "backups are manual".
 */

const root = process.cwd();

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    return entry.isDirectory() ? walk(full) : [full];
  });
}

const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, '$1');

const sources = walk(path.join(root, 'src'))
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .map((file) => ({
    path: path.relative(root, file).replace(/\\/g, '/'),
    // Whitespace collapsed so a sentence broken across JSX lines is one line.
    code: stripComments(readFileSync(file, 'utf8')).replace(/\s+/g, ' '),
  }));

/** Wording that is only true when nothing leaves the device, ever. */
const retired: ReadonlyArray<[string, RegExp]> = [
  ['"Offline only"', /Offline only/i],
  ['"Everything (here) stays …"', /Everything (here )?stays/i],
  // ("created and stored only by you", about exported files, is true.)
  ['"Stored only in/on this …"', /Stored only (in|on) this/i],
  ['"only in/on this browser/device"', /only (in|on) this (browser|device)/i],
  ['"stay(s) local to this device"', /stays? local to this device/i],
  ['"never shared"', /never shared/i],
  ['"Nothing is synced or sent anywhere"', /Nothing is synced or sent/i],
  ['"synced or stored remotely"', /synced or stored remotely/i],
  ['"No account, no cloud sync"', /no account, no cloud sync/i],
  ['"There is no account"', /there is no account/i],
  ['"does not create an account"', /does not create an account/i],
  [
    '"backup, restore, reset … all run on this device"',
    /backup, restore, reset, and offline support/i,
  ],
  [
    'Bokmål "lagret/lagres bare på denne enheten"',
    /lagre[ts]+ bare på denne enheten/i,
  ],
  ['Bokmål "lagres eksternt"', /lagres eksternt/i],
];

function offenders(text: string): string[] {
  return retired
    .filter(([, pattern]) => pattern.test(text))
    .map(([label]) => label);
}

describe('retired local-only wording', () => {
  it('can see every phrase it forbids (positive control)', () => {
    const samples = [
      "value: 'Offline only'",
      'Everything stays in this browser.',
      'Everything here stays on this device.',
      'Stored only on this device',
      'Stored only in this browser on this device.',
      'are stored on this device and never shared',
      'Profile preferences stay local to this device.',
      'Nothing is synced or sent anywhere.',
      'Nothing is synced or stored remotely.',
      'No account, no cloud sync, no analytics.',
      'There is no account, no cloud sync',
      'It does not create an account',
      'backup, restore, reset, and offline support all run on this device',
      'Svaret er lagret bare på denne enheten.',
      'lagres bare på denne enheten',
      'Ingenting synkroniseres eller lagres eksternt.',
    ];

    for (const sample of samples) {
      expect(offenders(sample), sample).not.toEqual([]);
    }
  });

  it('does not flag the state-neutral statements that replace it', () => {
    const fine = [
      'Your data is stored in this browser. No account is needed, nothing is synced, and there is no analytics.',
      'Nothing is uploaded automatically.',
      'Your CS50 progress on this device. Nothing is synced; backups are manual.',
      'Svaret er lagret på denne enheten. Det gir ingen poeng.',
      'Ingenting synkroniseres; du lager sikkerhetskopier selv.',
    ];

    for (const sample of fine) {
      expect(offenders(sample), sample).toEqual([]);
    }
  });

  it('appears nowhere in the application source', () => {
    expect(sources.length).toBeGreaterThan(150);
    expect(
      sources
        .map((source) => ({
          path: source.path,
          found: offenders(source.code),
        }))
        .filter((entry) => entry.found.length > 0),
    ).toEqual([]);
  });
});
