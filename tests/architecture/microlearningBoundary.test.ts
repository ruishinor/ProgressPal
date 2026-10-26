import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Microlearning is an additive, stateless, silent surface. This guard keeps it
 * that way mechanically. The feature may import only React, the router, its
 * own files, one RPG button, the RPG route paths and TYPES from the domain
 * contract, so no evidence, mastery, XP, achievement, Campaign-progress,
 * app-state or storage writer is reachable from it. It names no browser
 * storage, network, audio or speech API. The programme-owned bank is pure
 * data. Widening any list here is a product decision.
 */
const ROOT = process.cwd();

const ALLOWED_FEATURE_IMPORT =
  /^(\.{1,2}\/.*|react|@\/features\/microlearning\/.*|@\/features\/rpg\/components\/RpgButton|@\/lib\/routing\/rpgRoutePaths|@\/lib\/domain)$/;

const FORBIDDEN_TOKENS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: 'localStorage', pattern: /\blocalStorage\b/ },
  { label: 'sessionStorage', pattern: /\bsessionStorage\b/ },
  { label: 'indexedDB', pattern: /\bindexedDB\b/ },
  { label: 'Dexie', pattern: /\bDexie\b/ },
  { label: 'document.cookie', pattern: /\bdocument\s*\.\s*cookie\b/ },
  { label: 'network fetch', pattern: /\bfetch\s*\(/ },
  { label: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/ },
  { label: 'WebSocket', pattern: /\bWebSocket\b/ },
  { label: 'app state', pattern: /\buseAppState\b/ },
  { label: 'speech synthesis', pattern: /\bspeechSynthesis\b/ },
  { label: 'speech recognition', pattern: /\b(webkit)?SpeechRecognition\b/ },
  { label: 'audio context', pattern: /\b(webkit)?AudioContext\b/ },
  { label: 'audio element', pattern: /\bnew\s+Audio\s*\(|<audio\b/ },
];

function listSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSources(full);
    }

    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

function load(directory: string) {
  return listSources(path.join(ROOT, directory)).map((file) => ({
    file: path.relative(ROOT, file).replace(/\\/g, '/'),
    text: readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1'),
  }));
}

const importsOf = (text: string) =>
  [...text.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1]!,
  );

const feature = load('src/features/microlearning');
const bank = load('src/programmes/programvareutvikling/microlearning');
const contract = load('src/lib/domain').filter(({ file }) =>
  file.endsWith('/microlearning.ts'),
);

describe('microlearning feature boundary', () => {
  it('finds the sources it guards', () => {
    expect(feature.length).toBeGreaterThanOrEqual(15);
    // Seven bank files, ACT 18 content (four files), and SQL (one file).
    expect(bank.length).toBe(12);
    expect(contract).toHaveLength(1);
  });

  it('imports only React, itself, the RPG button, the route paths and domain types', () => {
    const offenders = feature.flatMap(({ file, text }) =>
      importsOf(text)
        .filter((specifier) => !ALLOWED_FEATURE_IMPORT.test(specifier))
        .map((specifier) => `${file} -> ${specifier}`),
    );

    expect(offenders).toEqual([]);
  });

  it('takes nothing but types from the domain contract', () => {
    const offenders = feature.flatMap(({ file, text }) =>
      [
        ...text.matchAll(
          /import\s+(type\s+)?(?:\{[^}]*\}|\w+)\s+from\s+'@\/lib\/domain'/g,
        ),
      ]
        .filter((match) => match[1] === undefined)
        .map(() => `${file}: runtime import from @/lib/domain`),
    );

    expect(offenders).toEqual([]);
  });

  it('names no browser storage, network, app-state, audio or speech API', () => {
    const offenders = feature.flatMap(({ file, text }) =>
      FORBIDDEN_TOKENS.filter(({ pattern }) => pattern.test(text)).map(
        ({ label }) => `${file}: ${label}`,
      ),
    );

    expect(offenders).toEqual([]);
  });
});

describe('programme-owned bank and contract', () => {
  it('keeps the bank pure data: type imports and sibling files only', () => {
    const offenders = bank.flatMap(({ file, text }) =>
      importsOf(text)
        .filter((specifier) => !/^(\.\/.*|@\/lib\/domain)$/.test(specifier))
        .map((specifier) => `${file} -> ${specifier}`),
    );

    expect(offenders).toEqual([]);
    for (const { file, text } of bank) {
      expect(text, file).not.toMatch(/import\s+\{[^}]*\}\s+from\s+'@\/lib/);
    }
  });

  it('takes only types from one sibling domain file, and names no forbidden API', () => {
    const [{ file, text }] = contract as [(typeof contract)[number]];

    expect(importsOf(text).sort(), file).toEqual(['./lessonContent']);
    expect(text, file).not.toMatch(/import\s+(?!type\b)/);
    expect(
      FORBIDDEN_TOKENS.filter(({ pattern }) => pattern.test(text)),
    ).toEqual([]);
  });

  it('keeps the availability functions pure: no storage handle, no mutation of what they read', () => {
    const [{ text }] = contract as [(typeof contract)[number]];
    // From the first availability function to the validator's own constants.
    const body = text.slice(
      text.indexOf('export function mapLessonUnitsToCampaignItems'),
      text.indexOf('const idPattern'),
    );

    expect(body.length).toBeGreaterThan(1000);

    expect(body).not.toMatch(
      /\.(push|splice|pop|shift|unshift|sort|reverse)\(/,
    );
    expect(body).not.toMatch(/\b(db|database|Dexie|transaction)\b/i);
  });
});

describe('the app-layer route seam', () => {
  const [route] = load('src/app/routes').filter(({ file }) =>
    file.endsWith('MicrolearningRoute.tsx'),
  ) as [{ file: string; text: string }];

  it('reads the active programme scope and the Campaign’s own position, and hands the answer to the feature', () => {
    // The router holds the learner's place in the address (Back/Forward),
    // as in a track; it is not a data source.
    expect(importsOf(route.text).sort()).toEqual([
      '@/features/microlearning',
      '@/features/rpg',
      '@/lib/appState',
      '@/lib/domain',
      'react',
      'react-router-dom',
    ]);
  });

  it('imports one Campaign read model and no storage layer or writer at all', () => {
    const named = [
      ...route.text.matchAll(
        /import\s*\{([^}]*)\}\s*from\s*'@\/features\/rpg'/g,
      ),
    ].flatMap((match) =>
      match[1]!
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean),
    );

    expect(named).toEqual(['loadRpgMicroAvailability']);
    expect(route.text).not.toMatch(/@\/lib\/db/);
    expect(route.text).not.toMatch(
      /\b(switchProgramme|enrolAndSwitchProgramme|refresh|saveLearnerProfile|submitExerciseAttempt|saveLessonPosition|recordSupportEvent|recordEvaluationResult|submitAttemptAndRecordResult|listLearnerEvidence)\b/,
    );
    expect(route.text).not.toMatch(
      /\.(add|put|bulkAdd|bulkPut|delete|update|clear)\(/,
    );
  });

  it('reads the Campaign position through the same course-map read as Home, and writes nothing', () => {
    const models = load('src/features/rpg/model').find(({ file }) =>
      file.endsWith('readModels.ts'),
    )!;
    const start = models.text.indexOf(
      'export async function loadRpgCampaignPosition',
    );
    const body = models.text.slice(
      start,
      models.text.indexOf('export async function loadRpgModuleSummary'),
    );

    expect(start).toBeGreaterThan(0);
    expect(body).toMatch(/getCourseMapReadData\(/);
    expect(body).toMatch(/selectQuestRecommendation\(/);
    expect(body).not.toMatch(
      /\.(add|put|bulkAdd|bulkPut|delete|update|clear)\(|upsert|save[A-Z]|record[A-Z]|submit[A-Z]/,
    );
  });

  it('decides what is open in one place, from the Campaign position, and writes nothing', () => {
    const models = load('src/features/rpg/model').find(({ file }) =>
      file.endsWith('readModels.ts'),
    )!;
    const start = models.text.indexOf(
      'export async function loadRpgMicroAvailability',
    );
    const body = models.text.slice(
      start,
      models.text.indexOf('export async function loadRpgModuleSummary'),
    );

    expect(start).toBeGreaterThan(0);
    expect(body).toMatch(/loadRpgCampaignPosition\(/);
    expect(body).toMatch(/selectPrimer\(/);
    expect(body).toMatch(/listReinforcementSessions\(/);
    expect(body).not.toMatch(
      /\.(add|put|bulkAdd|bulkPut|delete|update|clear)\(|upsert|save[A-Z]|record[A-Z]|submit[A-Z]/,
    );
  });

  it('gives Home only a read of that same answer: no second availability rule, no write', () => {
    const [home] = load('src/features/rpg/routes').filter(({ file }) =>
      file.endsWith('RpgHomePage.tsx'),
    );

    // The one source of truth, shared with the picker...
    expect(home!.text).toMatch(/loadRpgMicroAvailability\(/);
    // ...and nothing that could become a second one.
    expect(home!.text).not.toMatch(
      /features\/microlearning|loadRpgCampaignPosition|selectPrimer|listReinforcementSessions|listPrimerOnlyCards|@\/lib\/db/,
    );
    expect(home!.text).not.toMatch(
      /\.(add|put|bulkAdd|bulkPut|delete|update|clear)\(|save[A-Z]|record[A-Z]|submit[A-Z]/,
    );
    // Only a programme that ships a bank is ever read for.
    expect(home!.text).toMatch(/content\.microlearning !== undefined/);
  });
});

/**
 * The enlarged-text contract in the stylesheet: the route is the one scroll
 * context, and nothing below it clips, scrolls, pins or has a fixed height.
 * jsdom has no layout, so the E2E walk proves the behaviour; this keeps the
 * structure that makes it true from being undone by a small edit.
 */
describe('microlearning stylesheet keeps text growth reachable', () => {
  const css = readFileSync(
    path.join(ROOT, 'src', 'styles', 'microlearning.css'),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    body: match[2]!,
    selector: match[1]!.trim(),
  }));
  const declared = (selector: string) =>
    rules.find((rule) => rule.selector === selector)?.body ?? '';

  it('lets the route scroll while it fills the viewport', () => {
    const route = declared('.micro');

    expect(route).toMatch(/overflow-y:\s*auto/);
    expect(route).toMatch(/position:\s*fixed/);
    expect(route).toMatch(/height:\s*100dvh/);
  });

  it('never clips, scrolls, pins or fixes the height of anything below the route', () => {
    // The one rule above the route, `html:has(.micro)`, keeps the document
    // from scrolling underneath the fixed route.
    const below = rules.filter(
      (rule) =>
        rule.selector.startsWith('.micro') && rule.selector !== '.micro',
    );

    expect(below.length).toBeGreaterThan(10);
    for (const rule of below) {
      expect(rule.body, rule.selector).not.toMatch(
        /overflow(-[xy])?:\s*(?!visible)/,
      );
      expect(rule.body, rule.selector).not.toMatch(
        /position:\s*(sticky|fixed)/,
      );
      // Only the progress bars and the numbered badge are fixed-height, and
      // none of them holds a line of text that could outgrow it.
      if (!/^\.micro(__segment|-slot)/.test(rule.selector)) {
        expect(rule.body, rule.selector).not.toMatch(/(^|[;\s])(max-)?height:/);
      }
      expect(rule.body, rule.selector).not.toMatch(/min-height:\s*0\s*;/);
    }
  });
});
