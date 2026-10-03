import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  LearnerEvidenceSchema,
  canonicalJson,
  createContentAssetProvider,
  lessonEvaluatorContractVersion,
  type LessonContentProvider,
  type ProgrammeContentCatalogue,
} from '@/lib/domain';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';

import ledger from '../fixtures/programvareutvikling/source-ledger.json';
import {
  p2Catalogue,
  p2Index as manifest,
  p2Modules,
  readP2Asset,
} from './p2Content';

/**
 * Epic E §3 items 4–5 and 16, §5 (E0) and §6 (sanitation): the committed
 * content of the authored M01/M02 slice — the bundled catalogue and the
 * packaged content assets (owner decision 2026-10-03). The source workspace
 * is absent in CI, so source fidelity is proven through the exporter's source
 * ledger (digests of the source objects taken from `pilot.json` at the
 * recorded hash) plus the exporter's own `--check` run against the real
 * source before freeze. Content version 2 follows the source corrections of
 * 2026-10-03 (D-2 and the authored interleaving).
 */

const pilotSha256 =
  '5d6af68e7a417978e6aaf4389d9a99c2ae11be008a3a9ed6a9dda7c554b8cf5a';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function sha256Hex(text: string) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function stringLeaves(value: Json, path = '$'): Array<[string, string]> {
  if (typeof value === 'string') {
    return [[path, value]];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      stringLeaves(entry, `${path}[${index}]`),
    );
  }

  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) =>
      stringLeaves(entry, `${path}.${key}`),
    );
  }

  return [];
}

function allKeys(value: Json, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((entry) => allKeys(entry, keys));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      keys.add(key);
      allKeys(entry, keys);
    }
  }

  return keys;
}

const modules = [
  p2Modules['S1-M01']!,
  p2Modules['S1-M02']!,
] as unknown as Array<{
  moduleId: string;
  units: Array<{ unit_id: string; flow: Array<Record<string, Json>> }>;
}>;
const units = modules.flatMap((module) => module.units);
const exercises = units.flatMap((unit) =>
  unit.flow.filter((block) => block.t === 'exercise'),
);
const allSnapshotJson = [
  manifest,
  p2Modules['S1-M01']!,
  p2Modules['S1-M02']!,
] as unknown as Json[];

describe('E0: source identity and re-derived counts', () => {
  it('records the authoritative source identity, content version and language metadata', () => {
    expect(manifest.format).toBe('progresspal-programme-content');
    expect(manifest.formatVersion).toBe(1);
    expect(manifest.contentVersion).toBe(2);
    expect(manifest.evaluatorContractVersion).toBe(
      lessonEvaluatorContractVersion,
    );
    expect(manifest.language).toBe('nb');
    expect(manifest.technicalLanguage).toBe('en');
    expect(manifest.source).toMatchObject({
      artefact: '05_OUTPUT/07_VERTICAL_SLICE/pilot.json',
      schema: 'progresspal-pilot-content',
      schemaVersion: '0.1',
      sha256: pilotSha256,
      bytes: 1_121_780,
    });
    for (const module of modules) {
      expect((module as unknown as { sourceSha256: string }).sourceSha256).toBe(
        pilotSha256,
      );
    }
  });

  it('re-derives 2 modules, 25 missions, 47 units and 291 exercises from the snapshot', () => {
    expect(manifest.modules.map((module) => module.missions.length)).toEqual([
      12, 13,
    ]);
    expect(units).toHaveLength(47);
    expect(exercises).toHaveLength(291);
    expect(manifest.exercises).toHaveLength(291);
    expect(exercises.filter((exercise) => exercise.evaluable)).toHaveLength(
      276,
    );
    expect(
      manifest.exercises.filter((exercise) => exercise.needsRuntime),
    ).toHaveLength(49);
    expect(
      manifest.exercises
        .filter((exercise) => exercise.masteryGate)
        .map((exercise) => exercise.exerciseId),
    ).toHaveLength(25);
    expect(
      manifest.exercises
        .filter((exercise) => exercise.masteryGate && exercise.needsRuntime)
        .map((exercise) => exercise.exerciseId),
    ).toEqual([
      'S1-M01-CHK-E01',
      'S1-M02-CHK-E01',
      'S1-M02-CHK-E02',
      'S1-M02-CHK-E03',
    ]);
  });

  it('carries no URL in any snapshot string', () => {
    const urls = allSnapshotJson
      .flatMap((json) => stringLeaves(json))
      .filter(([, text]) => /https?:\/\//i.test(text));

    expect(urls).toEqual([]);
  });

  it('records the owner-approved K-3 and K-4 rules as owner metadata; the source authors neither', () => {
    expect(manifest.checkpointRules).toEqual([
      {
        ruleId: 'owner-k4-2026-10-03',
        authority: 'owner decision K-4, 2026-10-03',
        criteria: 'every-gating-checkpoint-task',
        itemQualification: 'correct-unsupported-counting',
        passLevel: 'D',
      },
    ]);
    expect(manifest.gateRetryRule).toEqual({
      ruleId: 'owner-k3-2026-10-03',
      authority: 'owner decision K-3, 2026-10-03',
      retryMode: 'same-task-new-attempt',
      presentation: 'deterministic-reshuffle',
      masteryAfterFailure: 'practised-from-that-task',
    });
    expect(exercises.every((exercise) => !('retry' in exercise))).toBe(true);
    expect(exercises.every((exercise) => !('retry_variant' in exercise))).toBe(
      true,
    );
  });
});

describe('field disposition: study-only, authoring-only and reward fields never ship', () => {
  it('ships no study, authoring or reward field anywhere in the runtime snapshot', () => {
    const keys = new Set<string>();
    for (const json of allSnapshotJson) {
      allKeys(json, keys);
    }

    for (const forbidden of [
      'counts_with_observer_verification',
      'reward',
      'reward_events',
      'misconception_tags',
      'difficulty',
      'd',
      '_time',
      '_raw_stderr',
      '_status',
      'title_en',
      'knowledge_ids',
      'extra_knowledge_ids',
      'source_refs',
      'external_fact_refs',
      'objective_ids',
      'expected_evidence',
      'scaffold',
      'retry',
      'examples_ok',
      'examples_bad',
      'good_rows',
      'bad_row_sets',
      'necessity_screen',
      'lineage',
      'benchmark',
    ]) {
      expect(keys.has(forbidden), forbidden).toBe(false);
    }
  });
});

describe('§6 Programme #2 sanitation', () => {
  const studyOnly = [
    /observatør/i,
    /\bobserver\b/i,
    /samtykke/i,
    /participant consent/i,
    /\bTrack [AB]\b/,
    /intervensjonsnivå|intervention level/i,
    /PRB-SET/,
    /study baseline|studiebaseline/i,
    /utprøvingsversjon/i,
    /Du får hjelp hvis du står fast/i,
    /counts_with_observer_verification/,
  ];

  it('finds no study-only language: D-2 is corrected at the source with the owner-given sentence', () => {
    const violations = allSnapshotJson
      .flatMap((json, index) =>
        stringLeaves(json).map(([path, text]) => [`${index}${path}`, text]),
      )
      .filter(([, text]) => studyOnly.some((pattern) => pattern.test(text)));
    const d2 = exercises.find((exercise) => exercise.id === 'S1-M01-CHK-E05');

    expect(violations).toEqual([]);
    expect(d2!.prompt).toBe(
      'Lag commit-en på din egen maskin. Lim inn `git log --oneline`. Øverst skal den nye commit-en stå. ProgressPal kan sjekke teksten du limer inn, men kan ikke se Git-historikken på maskinen din.',
    );
    expect(manifest.source.knownSourceDefects).toEqual([]);
  });
});

describe('source fidelity: authored strings reach the snapshot unchanged', () => {
  it('binds the ledger to the same source and content version', () => {
    expect(ledger.sourceSha256).toBe(pilotSha256);
    expect(ledger.contentVersion).toBe(manifest.contentVersion);
    expect(ledger.units).toHaveLength(47);
    expect(ledger.missions).toHaveLength(25);
  });

  it('matches every unit string leaf by path and text', () => {
    const byId = new Map(units.map((unit) => [unit.unit_id, unit]));

    for (const entry of ledger.units) {
      const unit = byId.get(entry.unitId);
      expect(unit, entry.unitId).toBeDefined();
      const leaves = stringLeaves(unit as unknown as Json).sort(([a], [b]) =>
        a.localeCompare(b),
      );

      expect(leaves.length, entry.unitId).toBe(entry.stringCount);
      expect(sha256Hex(JSON.stringify(leaves)), entry.unitId).toBe(
        entry.sha256,
      );
    }
  });

  it('matches every mission string leaf (title, goal, phase titles)', () => {
    const missions = new Map(
      manifest.modules
        .flatMap((module) => module.missions)
        .map((mission) => [mission.missionId, mission]),
    );

    for (const entry of ledger.missions) {
      const mission = missions.get(entry.missionId)!;
      const leaves = [
        ['title', mission.title],
        ['goal', mission.goal],
        ...(mission.phases ?? []).map((phase, index) => [
          `phases[${index}].title`,
          phase.title,
        ]),
      ];

      expect(sha256Hex(JSON.stringify(leaves)), entry.missionId).toBe(
        entry.sha256,
      );
    }
  });
});

describe('content binding: contentVersion, source hash and per-exercise content hashes', () => {
  it('gives every exercise a unique lowercase subject ID and a hash of its exported definition', () => {
    const exportedById = new Map(
      exercises.map((exercise) => [exercise.id as string, exercise]),
    );
    const subjects = new Set<string>();

    for (const entry of manifest.exercises) {
      expect(entry.subjectId).toBe(entry.exerciseId.toLowerCase());
      expect(entry.subjectId).toMatch(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/);
      expect(entry.contentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(
        sha256Hex(canonicalJson(exportedById.get(entry.exerciseId) as Json)),
        entry.exerciseId,
      ).toBe(entry.contentHash);
      subjects.add(entry.subjectId);
    }
    expect(subjects.size).toBe(291);
  });

  it('keeps exercise subject IDs disjoint from every registered catalogue identity', () => {
    const catalogueIds = new Set(
      programvareutviklingDefinition.catalogue.units.flatMap((unit) => [
        unit.id,
        ...unit.items.map((item) => item.id),
      ]),
    );

    for (const entry of manifest.exercises) {
      expect(catalogueIds.has(entry.subjectId), entry.subjectId).toBe(false);
    }
  });

  it('evidence does not depend on language: schema-4 evidence rows cannot carry a language', () => {
    const attempt = {
      id: 'attempt-1',
      kind: 'exercise_attempt',
      programmeId: 'programvareutvikling',
      contentVersion: 2,
      subjectId: manifest.exercises[0]!.subjectId,
      contentHash: manifest.exercises[0]!.contentHash,
      recordedAt: '2026-10-03T10:00:00.000Z',
      attemptNumber: 1,
      responseMode: 'evidence',
      answer: { text: 'Python 3.14.4' },
      hintsUsedMax: 0,
      teachingReopened: false,
    };

    expect(LearnerEvidenceSchema.safeParse(attempt).success).toBe(true);
    expect(
      LearnerEvidenceSchema.safeParse({ ...attempt, language: 'nb' }).success,
    ).toBe(false);
  });
});

describe('§3 item 4 and owner decision 2026-10-03: the content-asset provider', () => {
  const provider: LessonContentProvider =
    programvareutviklingDefinition.content.lessons!;

  type Copies = { index: Json; m1: Json; m2: Json };

  /**
   * A provider over edited copies of the real assets. With `rehash` the
   * catalogue records the edited bytes, so the inner identity and content
   * checks are what must catch the change; without it the asset no longer
   * matches its recorded SHA-256.
   */
  function tamperedProvider(
    change: (copies: Copies) => void,
    options: {
      evaluatorContractVersion?: number;
      rehash?: boolean;
      missing?: string;
      catalogue?: (copy: ProgrammeContentCatalogue) => void;
    } = {},
  ) {
    const copies = structuredClone({
      index: manifest as unknown as Json,
      m1: p2Modules['S1-M01']! as unknown as Json,
      m2: p2Modules['S1-M02']! as unknown as Json,
    });
    change(copies);
    const catalogue = structuredClone(p2Catalogue);
    const texts = new Map<string, string>();
    const place = (
      entry: { path: string; sha256: string; bytes: number },
      json: Json,
    ) => {
      const text = `${JSON.stringify(json)}\n`;
      texts.set(entry.path, text);
      if (options.rehash ?? true) {
        entry.sha256 = sha256Hex(text);
        entry.bytes = Buffer.byteLength(text);
      }
    };
    place(catalogue.assets.index, copies.index);
    place(catalogue.assets.modules['S1-M01']!, copies.m1);
    place(catalogue.assets.modules['S1-M02']!, copies.m2);
    options.catalogue?.(catalogue);

    return createContentAssetProvider({
      catalogue,
      loadText: async (path) => {
        const text = texts.get(path);
        if (text === undefined || path === options.missing) {
          throw new Error('missing');
        }
        return text;
      },
      evaluatorContractVersion:
        options.evaluatorContractVersion ?? lessonEvaluatorContractVersion,
    });
  }

  it('serves byte-identical assets whose SHA-256 the bundled catalogue records', () => {
    for (const asset of [
      p2Catalogue.assets.index,
      ...Object.values(p2Catalogue.assets.modules),
    ]) {
      const text = readP2Asset(asset.path);
      expect(sha256Hex(text), asset.path).toBe(asset.sha256);
      expect(Buffer.byteLength(text), asset.path).toBe(asset.bytes);
      expect(asset.path, asset.path).toContain(asset.sha256.slice(0, 16));
    }
    expect(p2Catalogue.contentVersion).toBe(2);
    expect(p2Catalogue.sourceSha256).toBe(pilotSha256);
    expect(p2Catalogue.subjectIds).toEqual(
      manifest.exercises.map((entry) => entry.subjectId),
    );
  });

  it('returns a ready bundle for every lesson item, carrying its version identity', async () => {
    for (const itemId of provider.lessonItemIds) {
      const result = await provider.loadLesson(itemId);

      expect(result.status, itemId).toBe('ready');
      if (result.status === 'ready') {
        expect(result.value.itemId).toBe(itemId);
        expect(result.value.contentVersion).toBe(2);
        expect(result.value.sourceSha256).toBe(pilotSha256);
        expect(result.value.language).toBe('nb');
        expect(result.value.units.length).toBeGreaterThan(0);
      }
    }
  });

  it('returns the programme index', async () => {
    const result = await provider.loadIndex();

    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.value.exercises).toHaveLength(291);
      expect(result.value.skills.length).toBeGreaterThanOrEqual(18);
      expect(result.value.modules).toHaveLength(2);
    }
  });

  it('returns unavailable for an item it does not carry, and for an asset it cannot read', async () => {
    await expect(provider.loadLesson('week-0-lecture')).resolves.toMatchObject({
      status: 'unavailable',
    });
    const offline = tamperedProvider(() => undefined, {
      missing: p2Catalogue.assets.modules['S1-M02']!.path,
    });
    await expect(offline.loadLesson('s1-m02-o01')).resolves.toMatchObject({
      status: 'unavailable',
    });
    await expect(offline.loadLesson('s1-m01-o01')).resolves.toMatchObject({
      status: 'ready',
    });
  });

  it('returns version_mismatch when an asset does not match its recorded SHA-256', async () => {
    const stale = tamperedProvider(
      ({ m1 }) => {
        (m1 as { units: Array<{ title_nb: string }> }).units[0]!.title_nb +=
          ' (endret)';
      },
      { rehash: false },
    );

    await expect(stale.loadLesson('s1-m01-o01')).resolves.toMatchObject({
      status: 'version_mismatch',
    });
  });

  it('returns version_mismatch when an exercise no longer matches its recorded hash', async () => {
    const tampered = tamperedProvider(({ m1 }) => {
      const unit = (
        m1 as { units: Array<{ flow: Array<Record<string, Json>> }> }
      ).units[1]!;
      const exercise = unit.flow.find((block) => block.t === 'exercise')!;
      exercise.prompt = `${exercise.prompt as string} (endret)`;
    });

    await expect(tampered.loadLesson('s1-m01-o01')).resolves.toMatchObject({
      status: 'version_mismatch',
    });
  });

  it('returns version_mismatch when a module carries another content version or source', async () => {
    const otherVersion = tamperedProvider(({ m1 }) => {
      (m1 as { contentVersion: number }).contentVersion = 3;
    });
    const otherSource = tamperedProvider(({ m2 }) => {
      (m2 as { sourceSha256: string }).sourceSha256 = 'f'.repeat(64);
    });

    await expect(otherVersion.loadLesson('s1-m01-o01')).resolves.toMatchObject({
      status: 'version_mismatch',
    });
    await expect(otherSource.loadLesson('s1-m02-o01')).resolves.toMatchObject({
      status: 'version_mismatch',
    });
  });

  it('returns version_mismatch when the index disagrees with the bundled catalogue', async () => {
    const otherIndex = tamperedProvider(({ index }) => {
      (index as { contentVersion: number }).contentVersion = 3;
    });
    const otherCatalogue = tamperedProvider(() => undefined, {
      catalogue: (copy) => {
        copy.subjectIds = copy.subjectIds.slice(1);
      },
    });

    await expect(otherIndex.loadIndex()).resolves.toMatchObject({
      status: 'version_mismatch',
    });
    await expect(otherCatalogue.loadIndex()).resolves.toMatchObject({
      status: 'version_mismatch',
    });
  });

  it('returns version_mismatch when the app implements another evaluator contract', async () => {
    const otherContract = tamperedProvider(() => undefined, {
      evaluatorContractVersion: lessonEvaluatorContractVersion + 1,
    });

    await expect(otherContract.loadLesson('s1-m01-o01')).resolves.toMatchObject(
      {
        status: 'version_mismatch',
      },
    );
  });

  it('returns invalid for a schema-invalid module, an unknown unit, a malformed fingerprint or a broken sequence', async () => {
    const malformed = tamperedProvider(({ m1 }) => {
      (m1 as { units: unknown }).units = 'not an array';
    });
    const unknownUnit = tamperedProvider(({ index }) => {
      (
        index as { modules: Array<{ missions: Array<{ unitIds: string[] }> }> }
      ).modules[0]!.missions[0]!.unitIds.push('S1-M01-L99');
    });
    const badFingerprint = tamperedProvider(({ index }) => {
      (
        index as { exercises: Array<{ contentHash: string }> }
      ).exercises[0]!.contentHash = 'XYZ';
    });
    const brokenSequence = tamperedProvider(({ index }) => {
      const mission = (
        index as {
          modules: Array<{
            missions: Array<{ sequence?: Array<{ from: number }> }>;
          }>;
        }
      ).modules[0]!.missions[0]!;
      mission.sequence![1]!.from += 1;
    });

    await expect(malformed.loadLesson('s1-m01-o01')).resolves.toMatchObject({
      status: 'invalid',
    });
    await expect(unknownUnit.loadLesson('s1-m01-o01')).resolves.toMatchObject({
      status: 'invalid',
    });
    await expect(badFingerprint.loadIndex()).resolves.toMatchObject({
      status: 'invalid',
    });
    await expect(
      brokenSequence.loadLesson('s1-m01-o01'),
    ).resolves.toMatchObject({ status: 'invalid' });
  });
});
