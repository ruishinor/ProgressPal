import type { CourseItem, CourseUnit, ProgressEntry } from '@/lib/domain';
import { isItemComplete } from '@/lib/completion';
import { mergeCoveredRanges } from '@/lib/progress';

export type XpSummary = {
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  currentLevelFloorXp: number;
  nextLevelXp: number;
};

/**
 * Calculates level and progress thresholds based on total XP.
 * level = floor(sqrt(totalXp / 100)) + 1
 */
export function calculateXpSummary(totalXp: number): XpSummary {
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;
  const nextLevelXp = 100 * level * level;
  const currentLevelFloorXp = 100 * (level - 1) * (level - 1);
  const xpToNextLevel = nextLevelXp - totalXp;

  return {
    totalXp,
    level,
    xpToNextLevel,
    currentLevelFloorXp,
    nextLevelXp,
  };
}

/**
 * Deterministic stable hash function to avoid collisions
 * and produce a clean, valid entityId hex string.
 */
function simpleHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}`;
}

/**
 * Derives a collision-resistant deterministic transaction ID.
 * Falls back to hashing if the key doesn't match the entityIdSchema regex.
 */
export function deriveXpTransactionId(
  sourceType: string,
  sourceId: string,
): string {
  const canonicalKey = `xp-${sourceType}-${sourceId}`;
  const entityIdPattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

  if (entityIdPattern.test(canonicalKey)) {
    return canonicalKey;
  }
  return `xp-hashed-${simpleHash(canonicalKey)}`;
}

/**
 * Calculates which 10-minute blocks of unique watched ranges are fully covered.
 * A 10-minute block is fully covered if it has 600 seconds of unique watched time.
 */
export function getCrossedBlocks(
  ranges: Array<{ startSecond: number; endSecond: number }>,
  durationSeconds: number,
): number[] {
  const merged = mergeCoveredRanges(ranges);
  const crossed: number[] = [];
  const numBlocks = Math.floor(durationSeconds / 600);

  for (let i = 0; i < numBlocks; i++) {
    const blockStart = i * 600;
    const blockEnd = (i + 1) * 600;
    let overlapSeconds = 0;

    for (const range of merged) {
      const overlapStart = Math.max(blockStart, range.startSecond);
      const overlapEnd = Math.min(blockEnd, range.endSecond);
      if (overlapEnd > overlapStart) {
        overlapSeconds += overlapEnd - overlapStart;
      }
    }

    if (overlapSeconds >= 600) {
      crossed.push(i);
    }
  }

  return crossed;
}

export type PotentialXpAward = {
  sourceType: string;
  sourceId: string;
  xp: number;
  reason: string;
};

/**
 * Evaluates progress entry updates to derive potential XP awards.
 * Pure function with no database side effects.
 */
export function evaluateProgressXp(params: {
  progressEntry: ProgressEntry;
  item: CourseItem;
  unit: CourseUnit;
  allUnitItems: CourseItem[];
  allUnitProgress: ProgressEntry[];
  finalProjectProgress?: ProgressEntry[];
}): PotentialXpAward[] {
  const {
    progressEntry,
    item,
    unit,
    allUnitItems,
    allUnitProgress,
    finalProjectProgress = [],
  } = params;
  const awards: PotentialXpAward[] = [];
  const status = progressEntry.status;

  // 1. Completion awards for specific item types
  if (isItemComplete(status)) {
    if (item.type === 'lecture') {
      awards.push({
        sourceType: 'lecture_completed',
        sourceId: `${item.id}-completed`,
        xp: 40,
        reason: `Completed lecture: ${item.title}`,
      });
    } else if (item.type === 'section') {
      awards.push({
        sourceType: 'section_completed',
        sourceId: `${item.id}-completed`,
        xp: 20,
        reason: `Completed section: ${item.title}`,
      });
    } else if (item.type === 'shorts') {
      awards.push({
        sourceType: 'shorts_completed',
        sourceId: `${item.id}-completed`,
        xp: 15,
        reason: `Completed shorts: ${item.title}`,
      });
    } else if (item.type === 'practice') {
      awards.push({
        sourceType: 'practice_completed',
        sourceId: `${item.id}-completed`,
        xp: 30,
        reason: `Completed practice: ${item.title}`,
      });
    } else if (item.type === 'notes') {
      awards.push({
        sourceType: 'notes_completed',
        sourceId: `${item.id}-completed`,
        xp: 15,
        reason: `Completed notes: ${item.title}`,
      });
    } else if (item.type === 'reflection') {
      awards.push({
        sourceType: 'reflection_completed',
        sourceId: `${item.id}-completed`,
        xp: 15,
        reason: `Completed reflection: ${item.title}`,
      });
    }
  }

  // 2. Problem set milestones
  if (item.type === 'problem_set') {
    const startedStatuses = [
      'started',
      'blocked',
      'completed',
      'submitted',
      'accepted',
    ];
    if (startedStatuses.includes(status)) {
      awards.push({
        sourceType: 'problem_set_started',
        sourceId: `${item.id}-started`,
        xp: 20,
        reason: `Started problem set: ${item.title}`,
      });
    }

    const submittedStatuses = ['submitted', 'accepted'];
    if (submittedStatuses.includes(status)) {
      awards.push({
        sourceType: 'problem_set_submitted',
        sourceId: `${item.id}-submitted`,
        xp: 75,
        reason: `Submitted problem set: ${item.title}`,
      });
    }

    if (status === 'accepted') {
      awards.push({
        sourceType: 'problem_set_accepted',
        sourceId: `${item.id}-accepted`,
        xp: 125,
        reason: `Accepted problem set: ${item.title}`,
      });
    }
  }

  // 3. Required week unit completion
  if (unit.type === 'week' && unit.required) {
    const requiredItems = allUnitItems.filter((i) => i.required);
    if (requiredItems.length > 0) {
      const allRequiredCompleted = requiredItems.every((ui) => {
        const p =
          ui.id === item.id
            ? progressEntry
            : allUnitProgress.find((up) => up.itemId === ui.id);
        return p && isItemComplete(p.status);
      });

      if (allRequiredCompleted) {
        awards.push({
          sourceType: 'week_completed',
          sourceId: unit.id,
          xp: 150,
          reason: `Completed all required items for ${unit.title}`,
        });
      }
    }
  }

  // 4. Final project milestones
  if (item.id === 'final-project-build' && isItemComplete(status)) {
    awards.push({
      sourceType: 'final_project_build_completed',
      sourceId: 'final-project-build-completed',
      xp: 250,
      reason: 'Completed final project build',
    });
  }

  if (
    (item.id === 'final-project-readme' ||
      item.id === 'final-project-video-demo') &&
    isItemComplete(status)
  ) {
    const otherId =
      item.id === 'final-project-readme'
        ? 'final-project-video-demo'
        : 'final-project-readme';
    const otherProgress = finalProjectProgress.find(
      (p) => p.itemId === otherId,
    );
    const otherComplete = otherProgress && isItemComplete(otherProgress.status);

    if (otherComplete) {
      awards.push({
        sourceType: 'final_project_readme_demo_completed',
        sourceId: 'final-project-readme-demo-combined',
        xp: 200,
        reason: 'Completed both final project README and video demo',
      });
    }
  }

  return awards;
}

export function getXpAwardSourceKey(sourceType: string, sourceId: string) {
  return JSON.stringify([sourceType, sourceId]);
}

export function evaluateCompletionPreviewXp(params: {
  allCourseItems: readonly CourseItem[];
  allProgress: readonly ProgressEntry[];
  item: CourseItem;
  unit: CourseUnit;
}): PotentialXpAward[] {
  const { allCourseItems, allProgress, item, unit } = params;
  const completion: ProgressEntry = {
    id: `preview-${item.id}`,
    itemId: item.id,
    status: item.type === 'problem_set' ? 'accepted' : 'completed',
    confidence: 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
  const sharedFinalReward =
    item.id === 'final-project-readme' ||
    item.id === 'final-project-video-demo';
  const finalProjectProgress = sharedFinalReward
    ? ['final-project-readme', 'final-project-video-demo'].map((id) => ({
        ...completion,
        itemId: id,
      }))
    : [...allProgress];

  return evaluateProgressXp({
    item,
    unit,
    progressEntry: completion,
    allUnitItems: allCourseItems.filter(
      (candidate) => candidate.unitId === unit.id,
    ),
    allUnitProgress: [...allProgress],
    finalProjectProgress,
  });
}
