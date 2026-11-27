import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  canonicalJson,
  createContentAssetProvider,
  lessonEvaluatorContractVersion,
  parseProgrammeContentCatalogue,
  type LessonExercise,
} from '@/lib/domain';
import { evaluateExercise, unavailablePythonRuntime } from '@/lib/evaluation';
import { getProgrammeRegistry } from '@/programmes';
import { gitVisualFor, gitVisuals } from '@/features/lessons/gitVisuals';
import { gitGithubDefinition } from '@/programmes/git-github';
import catalogueJson from '@/programmes/git-github/content/catalogue.json';
import offline from '../../public/content/offline.json';
import { p2Catalogue } from './p2Content';

const catalogue = parseProgrammeContentCatalogue(catalogueJson);
const readAsset = async (path: string) =>
  readFileSync(resolve('public', path), 'utf8');
const sha256Hex = async (text: string) =>
  createHash('sha256').update(text).digest('hex');
const provider = () =>
  createContentAssetProvider({
    catalogue,
    loadText: readAsset,
    sha256Hex,
    evaluatorContractVersion: lessonEvaluatorContractVersion,
  });
async function exercises() {
  const bundles = await Promise.all(
    catalogue.modules
      .flatMap((module) => module.missions)
      .map((mission) => provider().loadLesson(mission.itemId)),
  );
  return bundles.flatMap((bundle) => {
    expect(bundle.status).toBe('ready');
    return bundle.status === 'ready' ? bundle.value.exercises : [];
  });
}
const evaluate = (
  exercise: LessonExercise,
  answer: Parameters<typeof evaluateExercise>[1],
) => evaluateExercise(exercise, answer, { runtime: unavailablePythonRuntime });

describe('Git beginner pilot source, boundaries and truthful evidence', () => {
  it('adds only an independent programme and leaves the default and existing policy identities intact', () => {
    const registry = getProgrammeRegistry();
    expect(registry.defaultProgrammeId).toBe('cs50x');
    expect(registry.getByProgrammeId('git-github')).toBe(gitGithubDefinition);
    expect(
      registry.getByProgrammeId('programvareutvikling').policy.lessonXp,
    ).toBeDefined();
    expect(gitGithubDefinition.policy.lessonXp).toBeUndefined();
    expect(gitGithubDefinition.policy.xp).toEqual({
      completionAwards: [],
      statusMilestones: [],
      unitCompletionBonuses: [],
      itemMilestones: [],
    });
    expect(gitGithubDefinition.content.microlearning).toBeUndefined();
    expect(gitGithubDefinition.catalogue.units).toHaveLength(7);
    expect(gitGithubDefinition.catalogue.dataVersion).toBe(7);
    expect(catalogue.contentVersion).toBe(1);
    expect(
      gitGithubDefinition.catalogue.units[2]!.items.map((item) => item.id),
    ).toEqual([
      'git-m03-o01',
      'git-m03-o02',
      'git-m03-o03',
      'git-m03-o04',
      'git-m03-o05',
      'git-m03-o06',
    ]);
    expect(
      gitGithubDefinition.catalogue.units[3]!.items.map((item) => item.id),
    ).toEqual([
      'git-m04-o01',
      'git-m04-o02',
      'git-m04-o03',
      'git-m04-o04',
      'git-m04-o05',
      'git-m04-o06',
      'git-m04-o07',
    ]);
    expect(
      gitGithubDefinition.catalogue.units[4]!.items.map((item) => item.id),
    ).toEqual([
      'git-m05-o01',
      'git-m05-o02',
      'git-m05-o03',
      'git-m05-o04',
      'git-m05-o05',
      'git-m05-o06',
      'git-m05-o07',
      'git-m05-o08',
    ]);
    expect(
      gitGithubDefinition.catalogue.units[5]!.items.map((item) => item.id),
    ).toEqual([
      'git-m06-o01',
      'git-m06-o02',
      'git-m06-o03',
      'git-m06-o04',
      'git-m06-o05',
      'git-m06-o06',
      'git-m06-o07',
    ]);
    expect(
      gitGithubDefinition.catalogue.units[6]!.items.map((item) => item.id),
    ).toEqual([
      'git-m07-o01',
      'git-m07-o02',
      'git-m07-o03',
      'git-m07-o04',
      'git-m07-o05',
      'git-m07-o06',
      'git-m07-o07',
      'git-m07-o08',
    ]);
    expect(
      gitGithubDefinition.catalogue.units[1]!.items.map((item) => item.id),
    ).toEqual([
      'git-m02-o01',
      'git-m02-o02',
      'git-m02-o03',
      'git-m02-o04',
      'git-m02-o05',
      'git-m02-o06',
    ]);
    expect(
      gitGithubDefinition.catalogue.units[0]!.items.map((item) => item.id),
    ).toEqual([
      'git-m01-o01',
      'git-m01-o02',
      'git-m01-o03',
      'git-m01-o04',
      'git-m01-o05',
    ]);
  });

  it('binds every visual to its existing lesson block without adding steps', async () => {
    const lessons = catalogue.modules.flatMap((module) => module.missions);
    const slots = new Set<string>();
    for (const lesson of lessons) {
      const bundle = await provider().loadLesson(lesson.itemId);
      expect(bundle.status).toBe('ready');
      if (bundle.status !== 'ready') continue;
      const flow = bundle.value.units.flatMap((unit) => unit.flow);
      const visuals = gitVisuals.filter(
        (visual) => visual.lesson === lesson.itemId,
      );
      expect(visuals.length).toBeGreaterThan(0);
      for (const visual of visuals) {
        const slot = `${visual.lesson}:${visual.step}`;
        expect(slots.has(slot)).toBe(false);
        slots.add(slot);
        const block = flow[visual.step];
        expect(block?.t).toBe('text');
        if (block?.t !== 'text') continue;
        expect(gitVisualFor(lesson.itemId, visual.step, block.nb)).toBe(visual);
        expect(visual.frames.length).toBeGreaterThan(0);
        for (const frame of visual.frames) {
          const ids = new Set(frame.nodes?.map((node) => node.id));
          for (const edge of frame.edges ?? []) {
            expect(ids.has(edge.from) && ids.has(edge.to)).toBe(true);
          }
        }
      }
    }
    expect(slots.size).toBe(gitVisuals.length);
  });

  it('loads every real lesson through current validation and binds every exercise to its actual hash', async () => {
    const entries = await exercises();
    expect(entries).toHaveLength(113);
    expect(
      catalogue.subjectIds.filter((id) => id.startsWith('git-m02-')),
    ).toHaveLength(12);
    expect(
      catalogue.subjectIds.filter((id) => id.startsWith('git-m03-')),
    ).toHaveLength(13);
    expect(
      catalogue.subjectIds.filter((id) => id.startsWith('git-m04-')),
    ).toHaveLength(20);
    expect(
      catalogue.subjectIds.filter((id) => id.startsWith('git-m05-')),
    ).toHaveLength(22);
    expect(
      catalogue.subjectIds.filter((id) => id.startsWith('git-m06-')),
    ).toHaveLength(16);
    expect(
      catalogue.subjectIds.filter((id) => id.startsWith('git-m07-')),
    ).toHaveLength(23);
    for (const { exercise, meta } of entries) {
      expect(meta.contentHash).toBe(await sha256Hex(canonicalJson(exercise)));
      expect(meta.masteryGate).toBe(false);
      expect(meta.needsRuntime).toBe(false);
    }
    expect(catalogue.sourceSha256).toBe(
      await sha256Hex(
        [
          'src/programmes/git-github/source.mjs',
          'src/programmes/git-github/m02.mjs',
          'src/programmes/git-github/m03.mjs',
          'src/programmes/git-github/m04.mjs',
          'src/programmes/git-github/m05.mjs',
          'src/programmes/git-github/m06.mjs',
          'src/programmes/git-github/m07.mjs',
        ]
          .map((path) => readFileSync(resolve(path), 'utf8'))
          .join(''),
      ),
    );
  });

  it('rejects tampered assets and retains both programmes in the offline list', async () => {
    const tampered = createContentAssetProvider({
      catalogue,
      evaluatorContractVersion: lessonEvaluatorContractVersion,
      sha256Hex,
      loadText: async (path) => (await readAsset(path)) + ' ',
    });
    expect((await tampered.loadLesson('git-m01-o01')).status).toBe(
      'version_mismatch',
    );
    for (const [programmeId, { assets }] of [
      ['git-github', catalogue],
      ['programvareutvikling', p2Catalogue],
    ] as const) {
      const expected = [assets.index, ...Object.values(assets.modules)];
      expect(
        offline.assets
          .filter((path) => path.startsWith(`/content/${programmeId}/`))
          .sort(),
      ).toEqual(expected.map(({ path }) => '/' + path).sort());

      for (const asset of expected) {
        const content = await readAsset(asset.path);
        expect(Buffer.byteLength(content), asset.path).toBe(asset.bytes);
        expect(await sha256Hex(content), asset.path).toBe(asset.sha256);
      }
    }
  });

  it('evaluates each offered choice against its authored answer key', async () => {
    const entries = await exercises();
    for (const { exercise } of entries) {
      if (exercise.type !== 'mcq') continue;
      for (const option of exercise.options) {
        expect(
          (await evaluate(exercise, { selected: [option.id] })).outcome,
        ).toBe(option.correct ? 'correct' : 'incorrect');
      }
    }
  });

  it('accepts only the complete constrained filename list, never an embedded match or fabricated execution claim', async () => {
    const exercise = (await exercises()).find(
      (entry) => entry.exercise.type === 'evidence',
    )!.exercise;
    for (const text of ['plan.txt', '\r\nplan.txt\r\n', ' plan.txt \n']) {
      expect((await evaluate(exercise, { text })).outcome).toBe('correct');
    }
    for (const text of [
      'README.txt\nplan.txt',
      'plan.txt\nREADME.txt',
      'other\nplan.txt',
      'plan.txt\nother',
      'PS C:\\private> plan.txt',
      '<script>plan.txt</script>',
    ]) {
      expect((await evaluate(exercise, { text })).outcome).toBe('incorrect');
    }
    expect((await evaluate(exercise, { text: '' })).outcome).toBe(
      'not_evaluable',
    );
  });

  it('records partial self-reports without correct/incorrect judgements or mastery gates', async () => {
    const entries = await exercises();
    const checklist = entries.find(
      (entry) => entry.exercise.type === 'checklist',
    )!;
    const reflection = entries.find(
      (entry) => entry.exercise.type === 'reflect',
    )!;
    expect(
      (await evaluate(checklist.exercise, { checked: [true, false] })).outcome,
    ).toBe('recorded');
    expect(
      (
        await evaluate(reflection.exercise, {
          text: 'Jeg fikk ikke laget siste commit.',
        })
      ).outcome,
    ).toBe('recorded');
    for (const entry of [checklist, reflection]) {
      expect(entry.meta.requiredPractice).toBe(false);
      expect(entry.meta.evaluable).toBe(false);
    }
  });
});
