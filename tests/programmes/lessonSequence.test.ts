import { describe, expect, it } from 'vitest';

import { lessonSteps, type LessonStep } from '@/features/lessons/model';
import type { LessonBundle } from '@/lib/domain';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import manifest from '@/programmes/programvareutvikling/content/manifest.json';

/**
 * Owner decision 2026-10-03 (Epic E continuation §10): Programme #2 teaches
 * in interleaved microcycles (explain → see → do → feedback), not as one long
 * walkthrough followed by one long block of checks. This oracle reads the
 * real rendered order of every teaching mission. It does not require a
 * question after every block; it detects batching:
 *
 * - a mission with two or more teaching sections must place active practice
 *   before its last teaching section, and
 * - no run of more than six consecutive exercises, unless the authored
 *   sequence records why that run belongs together.
 *
 * Labs, quests, repetition, the module checkpoint and the optional
 * reinforcement set are practice surfaces by design and are not teaching
 * missions; the module checkpoint stays separate and independent.
 */

const maximumExerciseRun = 6;
const provider = programvareutviklingDefinition.content.lessons!;

type AuthoredSegment = {
  readonly unitId: string;
  readonly from: number;
  readonly to: number;
  readonly note?: string;
};

const teachingMissions = manifest.modules.flatMap((module) =>
  module.missions
    .filter((mission) => mission.surface === 'mission' && !mission.optional)
    .map((mission) => mission.itemId),
);

async function bundleOf(itemId: string): Promise<LessonBundle> {
  const loaded = await provider.loadLesson(itemId);

  if (loaded.status !== 'ready') {
    throw new Error(`${itemId}: ${loaded.status}`);
  }

  return loaded.value;
}

function isTeachingSection(step: LessonStep, bundle: LessonBundle) {
  const unit = bundle.units.find((entry) => entry.unit_id === step.unitId);

  return (
    unit !== undefined &&
    (unit.kind === 'L' || unit.kind === 'W') &&
    step.block.t === 'text' &&
    /^##\s/.test(step.block.nb)
  );
}

/** The authored notes that explain a longer run, keyed by unit and block. */
function runNotes(bundle: LessonBundle): Map<string, string> {
  const sequence = (bundle.mission as { sequence?: AuthoredSegment[] })
    .sequence;
  const notes = new Map<string, string>();

  for (const segment of sequence ?? []) {
    if (segment.note !== undefined) {
      for (let index = segment.from; index <= segment.to; index += 1) {
        notes.set(`${segment.unitId}#${index}`, segment.note);
      }
    }
  }

  return notes;
}

describe('Programme #2 teaching missions interleave practice with teaching', () => {
  it('covers every M01/M02 teaching mission', () => {
    expect(teachingMissions).toHaveLength(15);
  });

  it.each(teachingMissions)(
    '%s places practice before its last teaching section',
    async (itemId) => {
      const bundle = await bundleOf(itemId);
      const steps = lessonSteps(bundle);
      const sections = steps.filter((step) => isTeachingSection(step, bundle));

      if (sections.length < 2) {
        return;
      }

      const lastSection = sections.at(-1)!.stepIndex;
      const practiceBefore = steps.some(
        (step) => step.block.t === 'exercise' && step.stepIndex < lastSection,
      );

      expect(
        practiceBefore,
        `${itemId}: all practice follows all teaching`,
      ).toBe(true);
    },
  );

  it.each(teachingMissions)(
    '%s has no unexplained run of more than six exercises in a row',
    async (itemId) => {
      const bundle = await bundleOf(itemId);
      const steps = lessonSteps(bundle);
      const notes = runNotes(bundle);
      let run: LessonStep[] = [];
      const runs: LessonStep[][] = [];

      for (const step of [...steps, null]) {
        if (step !== null && step.block.t === 'exercise') {
          run.push(step);
        } else {
          if (run.length > 0) runs.push(run);
          run = [];
        }
      }

      for (const exerciseRun of runs) {
        const explained = exerciseRun.every((step) => {
          const flowIndex = bundle.units
            .find((unit) => unit.unit_id === step.unitId)!
            .flow.indexOf(step.block);
          return notes.has(`${step.unitId}#${flowIndex}`);
        });

        expect(
          exerciseRun.length <= maximumExerciseRun || explained,
          `${itemId}: ${exerciseRun.length} exercises in a row without a recorded reason`,
        ).toBe(true);
      }
    },
  );

  it('keeps every block of every unit exactly once, in authored order within its unit', async () => {
    for (const itemId of teachingMissions) {
      const bundle = await bundleOf(itemId);
      const steps = lessonSteps(bundle);
      const expected = bundle.units.flatMap((unit) =>
        unit.flow.map((block) => `${unit.unit_id}|${unit.flow.indexOf(block)}`),
      );
      const rendered = steps.map(
        (step) =>
          `${step.unitId}|${bundle.units
            .find((unit) => unit.unit_id === step.unitId)!
            .flow.indexOf(step.block)}`,
      );

      expect([...rendered].sort(), itemId).toEqual([...expected].sort());
      for (const unit of bundle.units) {
        const order = rendered
          .filter((key) => key.startsWith(`${unit.unit_id}|`))
          .map((key) => Number(key.split('|')[1]));
        expect(order, `${itemId} ${unit.unit_id}`).toEqual(
          [...order].sort((left, right) => left - right),
        );
      }
      expect(steps.map((step) => step.stepIndex)).toEqual(
        steps.map((_, index) => index),
      );
    }
  });
});
