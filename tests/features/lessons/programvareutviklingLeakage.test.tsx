import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

/**
 * Epic E §3 item 15 and §6 "Leaks": with Programvareutvikling active, no
 * reachable surface shows CS50 wording, guides, links, workflow or
 * terminology. The shell brand follows owner decision OD-6 (2026-10-03):
 * the product brand "ProgressPal", never the CS50 edition name.
 */

const p2 = programvareutviklingDefinition;

const cs50Leaks = [
  /\bCS50\b/,
  /Harvard|edX|OpenCourseWare/,
  /cs50\.harvard\.edu/,
  /Code Knights|CS Foundations|Generalist/,
  /\b(?:Lecture|Problem set|Final project|Shorts|Section)\b/,
  /\bWeek \d/,
  /Back to week/,
];

const routes = [
  '/dashboard',
  '/course',
  '/course/s1-m01-o01',
  '/insights',
  '/achievements',
  '/sessions',
  '/rpg',
  '/rpg/map',
  '/rpg/week/s1-m01',
  '/rpg/resource/s1-m01-o01',
  '/rpg/hero',
  '/rpg/badges',
];

beforeEach(async () => {
  closeSharedDatabase();
  getSharedDatabase(resolveDatabaseMigrationContext());
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      displayName: 'Kari',
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
  await enrolAndSwitchActiveProgramme(p2.programmeId, { seed: p2.catalogue });
});

async function settledText(route: string) {
  await renderAppAtRoute(route);
  await waitFor(
    () => {
      expect(screen.queryByText(/Loading|Laster/i)).toBeNull();
      expect(screen.queryByText(/Preparing RPG|Opening local data/)).toBeNull();
      expect(
        document.querySelector('main')?.textContent?.length ?? 0,
      ).toBeGreaterThan(40);
    },
    { timeout: 15_000 },
  );
  return (document.body.textContent ?? '').replace(/\s+/g, ' ');
}

describe('no CS50 leakage with Programvareutvikling active', () => {
  it.each(routes)(
    '%s shows no CS50 wording, link or terminology',
    async (route) => {
      const text = await settledText(route);

      for (const pattern of cs50Leaks) {
        expect(text, `${route} ${String(pattern)}`).not.toMatch(pattern);
      }
      expect(text).toMatch(
        /Programvareutvikling|Kom i gang|Verdier, typer og input|Sett opp arbeidsstedet/,
      );
    },
  );

  it('renders no CS50 official-resource link anywhere', async () => {
    for (const route of [
      '/course',
      '/course/s1-m01-o01',
      '/rpg/resource/s1-m01-o01',
    ]) {
      await settledText(route);
      expect(
        [...document.querySelectorAll('a[href]')].filter((anchor) =>
          /cs50|harvard/i.test(anchor.getAttribute('href') ?? ''),
        ),
        route,
      ).toEqual([]);
    }
  });
});

describe('OD-6 (owner decision 2026-10-03): the shell brand is ProgressPal', () => {
  it.each(['/dashboard', '/rpg'])(
    '%s shows the product brand and no CS50 edition name',
    async (route) => {
      const text = await settledText(route);

      expect(text).toContain('ProgressPal');
      expect(text).not.toMatch(/CS50 Edition/);
      expect(document.title).toBe('ProgressPal');
    },
  );
});
