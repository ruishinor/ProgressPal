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
import { gitGithubDefinition } from '@/programmes/git-github';
import catalogueJson from '@/programmes/git-github/content/catalogue.json';
import offline from '../../public/content/offline.json';

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
    expect(gitGithubDefinition.catalogue.units).toHaveLength(2);
    expect(gitGithubDefinition.catalogue.dataVersion).toBe(2);
    expect(catalogue.contentVersion).toBe(1);
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

  it('loads every real lesson through current validation and binds every exercise to its actual hash', async () => {
    const entries = await exercises();
    expect(entries).toHaveLength(19);
    expect(
      catalogue.subjectIds.filter((id) => id.startsWith('git-m02-')),
    ).toHaveLength(12);
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
    expect(
      offline.assets.filter((path) =>
        path.startsWith('/content/programvareutvikling/'),
      ),
    ).toHaveLength(3);
    for (const asset of [
      catalogue.assets.index,
      ...Object.values(catalogue.assets.modules),
    ]) {
      expect(offline.assets).toContain('/' + asset.path);
      expect(Buffer.byteLength(await readAsset(asset.path))).toBe(asset.bytes);
    }
  });

  it('checks the taught misconceptions and offers an explained wrong answer for each choice', async () => {
    const entries = await exercises();
    for (const { exercise } of entries) {
      if (exercise.type !== 'mcq') continue;
      for (const option of exercise.options) {
        expect(option.feedback.length).toBeGreaterThan(40);
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
