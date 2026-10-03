import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createProgressPalDatabase } from '@/lib/db/database';
import { currentDatabaseSchemaVersion } from '@/lib/db';

import { defaultTestMigrationContext } from '../db/testDatabase';

/**
 * Epic C / C7 guard. C5 resolved the active programme once at the composition
 * root; C7 legitimately supersedes that: the runtime scope now derives from the
 * persisted `app_meta.activeProgrammeId` on every stable resolution and reaches
 * runtime code through the application-state boundary. What must still hold
 * is that the boundary stays controlled:
 *
 * - no runtime file derives active state from the registry (there is no
 *   static "active definition" accessor at all);
 * - the registry is read only by the composition root, and the CS50-default
 *   accessor only by the named CS50 compatibility entrypoints that existing
 *   preservation oracles call;
 * - runtime code uses the explicit-programme entrypoints, never the
 *   CS50-default compatibility ones;
 * - shared library and component code never imports a programme
 *   implementation, and the bundled seed is never imported by a runtime layer;
 * - read and write paths receive an explicit scope, and restore and reset do
 *   not seed from a pre-operation scope;
 * - switching is reachable only through the application-state boundary and
 *   only from Settings (no navigation, shell or HUD switcher);
 * - the schema stays v3 with no programme-ownership column on learner data.
 *
 * Bounded source-text guards over whitespace-normalized, comment-stripped
 * code; they are not TypeScript parsers.
 */

const SRC = join(process.cwd(), 'src');

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(?<![:'"`])\/\/.*$/gm, ' ');
const normalize = (source: string) =>
  stripComments(source).replace(/\s+/g, ' ');
const name = (path: string) =>
  relative(process.cwd(), path).replace(/\\/g, '/');

const layerFiles = (...layers: string[]) =>
  layers.flatMap((layer) => listSourceFiles(join(SRC, layer)));

function filesReferencing(files: string[], pattern: RegExp) {
  return files
    .filter((file) => pattern.test(normalize(readFileSync(file, 'utf8'))))
    .map(name)
    .sort();
}

const runtimeFiles = layerFiles('app', 'features', 'lib', 'components');
const appAndFeatureFiles = layerFiles('app', 'features');

/** The application composition root: the only reader of the registry. */
const COMPOSITION_ROOT_FILES = [
  'src/app/providers/AppProviders.tsx',
  'src/app/providers/programmeComposition.ts',
];

/**
 * The CS50-default compatibility entrypoints (existing preservation oracles
 * and tests call them with the old signatures and no scope). They may read
 * the default definition; runtime code never calls them.
 */
const CS50_DEFAULT_COMPAT_FILES = [
  'src/features/course/cs50Links.ts',
  'src/features/course/detailModel.ts',
  'src/features/course/guideContent.ts',
  'src/features/rpg/model/questRewards.ts',
  'src/features/rpg/model/readModels.ts',
];

const compatEntrypoints = [
  'getCs50UnitLink',
  'getCs50ItemLink',
  'getUnitGuide',
  'getItemGuide',
  'buildQuestRewardLabel',
  'getCourseProgressStatusOptions',
  'validateCourseDetailProgressForm',
  'loadRpgBadgeGallerySummary',
];

describe('C7 programme boundary guards', () => {
  it('detects the forbidden patterns (positive control)', () => {
    const sample = normalize(`
      const definition = getActiveProgrammeDefinition();
      const { catalogueId } = getDefaultProgrammeDefinition();
      read({ policy: getDefaultProgrammeDefinition().policy, db });
      await restoreDatabaseFromBackup(data, { seed: scope.catalogue, fileName });
      await resetAllData({ seed: scope.catalogue });
      import { bundledCourseSeed } from '@/seed';
      const link = getCs50UnitLink(id);
      // getActiveProgrammeDefinition() in a comment is ignored
    `);

    expect(/\bgetActiveProgrammeDefinition\b/.test(sample)).toBe(true);
    expect(catalogueFromAccessor.some((pattern) => pattern.test(sample))).toBe(
      true,
    );
    expect(optionsFromAccessor.test(sample)).toBe(true);
    expect(restoreOrResetSeeded.test(sample)).toBe(true);
    expect(bundledSeedImport.test(sample)).toBe(true);
    expect(/\bgetCs50UnitLink\b/.test(sample)).toBe(true);
    expect(
      /\bgetActiveProgrammeDefinition\b/.test(
        normalize('// getActiveProgrammeDefinition()\nconst x = 1;'),
      ),
    ).toBe(false);
  });

  it('has no static active-programme accessor anywhere in the source', () => {
    expect(
      filesReferencing(
        layerFiles('app', 'features', 'lib', 'components', 'programmes'),
        /\bgetActiveProgrammeDefinition\b/,
      ),
    ).toEqual([]);
  });

  it('lets only the composition root read the registry', () => {
    const consumers = [
      'getProgrammeRegistry',
      'getProgrammeDefinition',
      'listRegisteredDefinitionKeys',
      'createProgrammeRegistry',
    ].flatMap((identifier) =>
      filesReferencing(runtimeFiles, new RegExp(`\\b${identifier}\\b`)),
    );

    // The composition root must read it (the running app resolves programmes
    // through it) and nothing else may.
    expect(consumers.length).toBeGreaterThan(0);
    for (const file of new Set(consumers)) {
      expect(COMPOSITION_ROOT_FILES, file).toContain(file);
    }
  });

  it('lets only the CS50 compatibility entrypoints read the default definition', () => {
    for (const file of filesReferencing(
      runtimeFiles,
      /\bgetDefaultProgrammeDefinition\b/,
    )) {
      expect(CS50_DEFAULT_COMPAT_FILES, file).toContain(file);
    }
  });

  it('keeps runtime code off the CS50-default compatibility entrypoints', () => {
    const definingFiles = new Set([
      ...CS50_DEFAULT_COMPAT_FILES,
      'src/features/rpg/index.ts',
    ]);
    const violations = compatEntrypoints.flatMap((identifier) =>
      filesReferencing(appAndFeatureFiles, new RegExp(`\\b${identifier}\\b`))
        .filter((file) => !definingFiles.has(file))
        .map((file) => `${file}: ${identifier}`),
    );

    expect(violations).toEqual([]);
  });

  it('keeps shared library and component code free of programme implementations', () => {
    expect(
      filesReferencing(
        layerFiles('lib', 'components'),
        /from ['"](?:@\/programmes|(?:\.\.?\/)+programmes)(?:\/[^'"]*)?['"]/,
      ),
    ).toEqual([]);
  });

  it('contains no test-only second-programme identity in production source', () => {
    expect(
      filesReferencing(
        layerFiles(
          'app',
          'features',
          'lib',
          'components',
          'programmes',
          'seed',
        ),
        /c5-alt|c7-alt|Alt Guild/,
      ),
    ).toEqual([]);
  });

  it('never imports the bundled seed from a runtime layer', () => {
    expect(filesReferencing(runtimeFiles, bundledSeedImport)).toEqual([]);
  });

  it('never builds shared read or write options from a definition accessor', () => {
    expect(filesReferencing(appAndFeatureFiles, optionsFromAccessor)).toEqual(
      [],
    );
    expect(
      catalogueFromAccessor.flatMap((pattern) =>
        filesReferencing(appAndFeatureFiles, pattern),
      ),
    ).toEqual([]);
  });

  it('does not seed restore or reset from a pre-operation programme scope', () => {
    expect(filesReferencing(appAndFeatureFiles, restoreOrResetSeeded)).toEqual(
      [],
    );
  });

  it('reaches the switching mutations only through the application-state boundary', () => {
    const mutationConsumers = filesReferencing(
      runtimeFiles,
      /\b(?:enrolAndSwitchActiveProgramme|switchActiveProgramme|enrolInProgramme)\b/,
    );

    for (const file of mutationConsumers) {
      expect(
        file.startsWith('src/lib/db/') || file.startsWith('src/lib/appState/'),
        file,
      ).toBe(true);
    }
  });

  it('exposes programme switching to no surface but Settings', () => {
    const consumers = filesReferencing(
      runtimeFiles,
      /\b(?:switchProgramme|enrolAndSwitchProgramme)\b/,
    );

    for (const file of consumers) {
      expect(
        file.startsWith('src/lib/appState/') ||
          file === 'src/features/settings/components/SettingsSurface.tsx',
        file,
      ).toBe(true);
    }
    expect(consumers).toContain(
      'src/features/settings/components/SettingsSurface.tsx',
    );
  });

  // Owner decision 2026-10-03: a fresh learner explicitly chooses the
  // starting programme during onboarding. The first run reads the choices;
  // it never switches an existing learner's programme.
  it('offers the programme choices only to Settings and the first run', () => {
    const consumers = filesReferencing(runtimeFiles, /\bprogrammeChoices\b/);

    for (const file of consumers) {
      expect(
        file.startsWith('src/lib/appState/') ||
          file === 'src/features/settings/components/SettingsSurface.tsx' ||
          file === 'src/features/profile/routes/OnboardingPage.tsx',
        file,
      ).toBe(true);
    }
  });
});

const catalogueFromAccessor = [
  /\{[^{}]*\bcatalogueId\b[^{}]*\} = get(?:Active|Default)ProgrammeDefinition\(\)/,
  /get(?:Active|Default)ProgrammeDefinition\(\) ?\. ?catalogueId\b/,
];
const optionsFromAccessor =
  /\bpolicy ?: ?get(?:Active|Default)ProgrammeDefinition\(\) ?\. ?policy ?[,}]/;
const restoreOrResetSeeded =
  /\b(?:restoreDatabaseFromBackup|resetAllData)\([^;]*?\bseed ?:/;
const bundledSeedImport = /from ['"]@\/seed['"]/;

describe('C7 schema guards', () => {
  // Epic E (accepted E-SCHEMA-1): exactly one further declared version.
  it('stays on schema v4 with exactly the four declared versions', () => {
    const database = normalize(
      readFileSync(join(SRC, 'lib', 'db', 'database.ts'), 'utf8'),
    );

    expect(currentDatabaseSchemaVersion).toBe(4);
    expect(database.match(/this\.version\(\d+\)/g)).toEqual([
      'this.version(1)',
      'this.version(2)',
      'this.version(3)',
      'this.version(4)',
    ]);
    expect(createProgressPalDatabase(defaultTestMigrationContext).verno).toBe(
      4,
    );
  });

  it('adds no programme-ownership column or index to learner data', () => {
    const db = createProgressPalDatabase(defaultTestMigrationContext);
    const ownershipTables = new Set([
      'catalogue_versions',
      'programme_enrolments',
    ]);

    for (const table of db.tables) {
      const indexNames = [
        table.schema.primKey.name,
        ...table.schema.indexes.map((index) => index.name),
      ];

      if (ownershipTables.has(table.name)) {
        expect(indexNames, table.name).toContain('programmeId');
      } else {
        expect(
          indexNames.filter((indexName) => /programme/i.test(indexName)),
          table.name,
        ).toEqual([]);
      }
    }
  });
});
