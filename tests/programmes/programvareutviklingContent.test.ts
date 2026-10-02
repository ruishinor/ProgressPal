import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  LearnerEvidenceSchema,
  canonicalJson,
  createSnapshotLessonContentProvider,
  lessonEvaluatorContractVersion,
  type LessonContentProvider,
} from '@/lib/domain';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import manifest from '@/programmes/programvareutvikling/content/manifest.json';
import moduleOne from '@/programmes/programvareutvikling/content/s1-m01.json';
import moduleTwo from '@/programmes/programvareutvikling/content/s1-m02.json';

import ledger from '../fixtures/programvareutvikling/source-ledger.json';

/**
 * Epic E §3 items 4–5 and 16, §5 (E0) and §6 (sanitation): the committed
 * runtime snapshot of the authored M01/M02 slice. The source workspace is
 * read only and absent in CI, so source fidelity is proven through the
 * exporter's source ledger (digests of the source objects taken from
 * `pilot.json` at the recorded hash) plus the exporter's own `--check` run
 * against the real source before freeze.
 */

const pilotSha256 =
  '577cd120b514d3df1445380e516916e1816dac16467311171d28764df7d96bc5';

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

const modules = [moduleOne, moduleTwo] as unknown as Array<{
  moduleId: string;
  units: Array<{ unit_id: string; flow: Array<Record<string, Json>> }>;
}>;
const units = modules.flatMap((module) => module.units);
const exercises = units.flatMap((unit) =>
  unit.flow.filter((block) => block.t === 'exercise'),
);
const allSnapshotJson = [manifest, moduleOne, moduleTwo] as unknown as Json[];

describe('E0: source identity and re-derived counts', () => {
  it('records the authoritative source identity, content version and language metadata', () => {
    expect(manifest.format).toBe('progresspal-programme-content');
    expect(manifest.formatVersion).toBe(1);
    expect(manifest.contentVersion).toBe(1);
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
      bytes: 1_110_182,
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

  it('records that the source authors no gate retry rule (K-3) and no checkpoint pass rule (K-4)', () => {
    expect(manifest.checkpointRules).toEqual([]);
    expect(manifest.gateRetryRule).toBeNull();
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

  it('finds exactly the known unresolved D-2 observer sentence and nothing else', () => {
    const violations = allSnapshotJson
      .flatMap((json, index) =>
        stringLeaves(json).map(([path, text]) => [`${index}${path}`, text]),
      )
      .filter(([, text]) => studyOnly.some((pattern) => pattern.test(text)));
    const d2 = exercises.find((exercise) => exercise.id === 'S1-M01-CHK-E05');

    expect(violations).toHaveLength(1);
    expect(violations[0]![1]).toBe(d2!.prompt);
    expect(d2!.prompt).toContain(
      '(Dette beviset er selvrapportert. Observatøren ser selv på skjermen din at committen finnes.)',
    );
    expect(manifest.source.knownSourceDefects).toEqual([
      {
        id: 'D-2',
        exerciseId: 'S1-M01-CHK-E05',
        field: 'prompt',
        stopState: 'EPIC_E_STOP_MISSING_AUTHORITATIVE_PROGRAMME_SOURCE',
      },
    ]);
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
      contentVersion: 1,
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

describe('§3 item 4: the asynchronous content-provider boundary', () => {
  const provider: LessonContentProvider =
    programvareutviklingDefinition.content.lessons!;

  function tamperedProvider(
    change: (copies: { manifest: Json; m1: Json; m2: Json }) => void,
    evaluatorContractVersion = lessonEvaluatorContractVersion,
  ) {
    const copies = structuredClone({
      manifest: manifest as unknown as Json,
      m1: moduleOne as unknown as Json,
      m2: moduleTwo as unknown as Json,
    });
    change(copies);

    return createSnapshotLessonContentProvider({
      manifest: copies.manifest,
      modules: { 'S1-M01': () => copies.m1, 'S1-M02': () => copies.m2 },
      evaluatorContractVersion,
    });
  }

  it('returns a ready bundle for every lesson item, carrying its version identity', async () => {
    for (const itemId of provider.lessonItemIds) {
      const result = await provider.loadLesson(itemId);

      expect(result.status, itemId).toBe('ready');
      if (result.status === 'ready') {
        expect(result.value.itemId).toBe(itemId);
        expect(result.value.contentVersion).toBe(1);
        expect(result.value.sourceSha256).toBe(pilotSha256);
        expect(result.value.language).toBe('nb');
        expect(result.value.units.length).toBeGreaterThan(0);
      }
    }
  });

  it('returns the lightweight programme index', async () => {
    const result = await provider.loadIndex();

    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.value.exercises).toHaveLength(291);
      expect(result.value.skills.length).toBeGreaterThanOrEqual(18);
      expect(result.value.modules).toHaveLength(2);
    }
  });

  it('returns unavailable for an item it does not carry', async () => {
    await expect(provider.loadLesson('week-0-lecture')).resolves.toMatchObject({
      status: 'unavailable',
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
      (m1 as { contentVersion: number }).contentVersion = 2;
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

  it('returns version_mismatch when the app implements another evaluator contract', async () => {
    const otherContract = tamperedProvider(
      () => undefined,
      lessonEvaluatorContractVersion + 1,
    );

    await expect(otherContract.loadLesson('s1-m01-o01')).resolves.toMatchObject(
      {
        status: 'version_mismatch',
      },
    );
  });

  it('returns invalid for a schema-invalid module, an unknown unit or a malformed fingerprint', async () => {
    const malformed = tamperedProvider(({ m1 }) => {
      (m1 as { units: unknown }).units = 'not an array';
    });
    const unknownUnit = tamperedProvider(({ manifest: copy }) => {
      (
        copy as { modules: Array<{ missions: Array<{ unitIds: string[] }> }> }
      ).modules[0]!.missions[0]!.unitIds.push('S1-M01-L99');
    });
    const badFingerprint = tamperedProvider(({ manifest: copy }) => {
      (
        copy as { exercises: Array<{ contentHash: string }> }
      ).exercises[0]!.contentHash = 'XYZ';
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
  });
});
