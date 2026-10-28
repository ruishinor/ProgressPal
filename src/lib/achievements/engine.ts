import { isItemComplete } from '@/lib/completion';
import type {
  AchievementDefinition,
  ContentSlice,
  CourseItem,
  CourseUnit,
  MediaProgressEvent,
  ProgressEntry,
  StudySession,
} from '@/lib/domain';

/**
 * Read-only source-of-truth data the pure evaluator reasons over. The engine
 * never imports Dexie and never mutates any of these collections — it only
 * derives which achievements are satisfied.
 */
export type AchievementEvaluationContext = {
  courseUnits: readonly CourseUnit[];
  courseItems: readonly CourseItem[];
  progressEntries: readonly ProgressEntry[];
  contentSlices: readonly ContentSlice[];
  mediaProgressEvents: readonly MediaProgressEvent[];
  studySessions: readonly StudySession[];
};

/**
 * A satisfied achievement plus a deterministic `triggerSourceId` derived from
 * the qualifying source data (never from wall-clock or insertion order).
 */
export type SatisfiedAchievement = {
  achievementId: string;
  triggerSourceId: string;
};

const entityIdPattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

/**
 * Deterministic stable hash used only as a fallback when a derived identifier
 * would not satisfy the domain entity-id pattern. Mirrors the XP engine helper.
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
 * Deterministic, collision-resistant unlock id for an achievement. Achievement
 * ids are kebab-case, so `unlock-<achievementId>` normally satisfies the entity
 * id pattern; the hash fallback keeps the id valid for any future id shape.
 */
export function deriveAchievementUnlockId(achievementId: string): string {
  const canonical = `unlock-${achievementId}`;

  if (entityIdPattern.test(canonical)) {
    return canonical;
  }

  return `unlock-${simpleHash(canonical)}`;
}

/**
 * Builds a deterministic entity-id-safe trigger source id from one or more
 * qualifying source ids. Inputs are de-duplicated and sorted so the result is
 * independent of insertion order; if the joined form is not a valid entity id
 * it falls back to a stable hash.
 */
function deriveTriggerSourceId(sourceIds: readonly string[]): string {
  const sorted = [...new Set(sourceIds)].sort();
  const joined = sorted.join('-');

  if (joined.length > 0 && entityIdPattern.test(joined)) {
    return joined;
  }

  return `trigger-${simpleHash(joined)}`;
}

function readNumber(
  ruleConfig: Record<string, unknown>,
  key: string,
  ruleType: string,
): number {
  const value = ruleConfig[key];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(
      `Achievement rule "${ruleType}" requires a numeric "${key}" config value.`,
    );
  }

  return value;
}

function readString(
  ruleConfig: Record<string, unknown>,
  key: string,
  ruleType: string,
): string {
  const value = ruleConfig[key];

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `Achievement rule "${ruleType}" requires a string "${key}" config value.`,
    );
  }

  return value;
}

function readStringArray(
  ruleConfig: Record<string, unknown>,
  key: string,
  ruleType: string,
): string[] {
  const value = ruleConfig[key];

  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== 'string')
  ) {
    throw new Error(
      `Achievement rule "${ruleType}" requires a string[] "${key}" config value.`,
    );
  }

  return value as string[];
}

type EvaluationIndex = {
  itemsById: Map<string, CourseItem>;
  itemsByUnitId: Map<string, CourseItem[]>;
  progressByItemId: Map<string, ProgressEntry>;
  unitsById: Map<string, CourseUnit>;
};

function buildIndex(context: AchievementEvaluationContext): EvaluationIndex {
  const itemsById = new Map<string, CourseItem>();
  const itemsByUnitId = new Map<string, CourseItem[]>();

  for (const item of context.courseItems) {
    itemsById.set(item.id, item);
    const grouped = itemsByUnitId.get(item.unitId) ?? [];
    grouped.push(item);
    itemsByUnitId.set(item.unitId, grouped);
  }

  const progressByItemId = new Map<string, ProgressEntry>();
  for (const entry of context.progressEntries) {
    progressByItemId.set(entry.itemId, entry);
  }

  const unitsById = new Map<string, CourseUnit>();
  for (const unit of context.courseUnits) {
    unitsById.set(unit.id, unit);
  }

  return { itemsById, itemsByUnitId, progressByItemId, unitsById };
}

function isCompletedItem(index: EvaluationIndex, itemId: string): boolean {
  const entry = index.progressByItemId.get(itemId);
  return entry !== undefined && isItemComplete(entry.status);
}

function isUnitRequiredComplete(
  index: EvaluationIndex,
  unitId: string,
): boolean {
  const requiredItems = (index.itemsByUnitId.get(unitId) ?? []).filter(
    (item) => item.required,
  );

  if (requiredItems.length === 0) {
    return false;
  }

  return requiredItems.every((item) => isCompletedItem(index, item.id));
}

/**
 * Evaluates a single definition against the indexed source data, returning the
 * satisfying achievement (with a deterministic trigger source id) or `null`.
 */
function evaluateDefinition(
  definition: AchievementDefinition,
  context: AchievementEvaluationContext,
  index: EvaluationIndex,
): SatisfiedAchievement | null {
  const { ruleType, ruleConfig } = definition;

  switch (ruleType) {
    case 'first_item_completed': {
      const completedItemIds = context.progressEntries
        .filter((entry) => isItemComplete(entry.status))
        .map((entry) => entry.itemId)
        .sort();

      if (completedItemIds.length === 0) {
        return null;
      }

      return {
        achievementId: definition.id,
        triggerSourceId: completedItemIds[0]!,
      };
    }

    case 'unit_required_completed': {
      const unitId = readString(ruleConfig, 'unitId', ruleType);

      if (!isUnitRequiredComplete(index, unitId)) {
        return null;
      }

      return { achievementId: definition.id, triggerSourceId: unitId };
    }

    case 'course_required_completed': {
      const requiredUnits = context.courseUnits.filter((unit) => unit.required);

      if (requiredUnits.length === 0) {
        return null;
      }

      const allComplete = requiredUnits.every((unit) =>
        isUnitRequiredComplete(index, unit.id),
      );

      if (!allComplete) {
        return null;
      }

      const courseId = [...requiredUnits]
        .map((unit) => unit.courseId)
        .sort()[0]!;

      return { achievementId: definition.id, triggerSourceId: courseId };
    }

    case 'item_completed': {
      const itemId = readString(ruleConfig, 'itemId', ruleType);

      if (!isCompletedItem(index, itemId)) {
        return null;
      }

      return { achievementId: definition.id, triggerSourceId: itemId };
    }

    case 'items_all_completed': {
      const itemIds = readStringArray(ruleConfig, 'itemIds', ruleType);

      if (
        itemIds.length === 0 ||
        !itemIds.every((itemId) => isCompletedItem(index, itemId))
      ) {
        return null;
      }

      return {
        achievementId: definition.id,
        triggerSourceId: deriveTriggerSourceId(itemIds),
      };
    }

    case 'item_type_status_count': {
      const itemType = readString(ruleConfig, 'itemType', ruleType);
      const statuses = new Set(
        readStringArray(ruleConfig, 'statuses', ruleType),
      );
      const minCount = readNumber(ruleConfig, 'minCount', ruleType);
      const qualifyingItemIds = context.progressEntries
        .filter((entry) => {
          const item = index.itemsById.get(entry.itemId);
          return item?.type === itemType && statuses.has(entry.status);
        })
        .map((entry) => entry.itemId)
        .sort();

      if (qualifyingItemIds.length < minCount) {
        return null;
      }

      return {
        achievementId: definition.id,
        triggerSourceId: deriveTriggerSourceId(
          qualifyingItemIds.slice(0, minCount),
        ),
      };
    }

    case 'content_slice_completed_count': {
      const minCount = readNumber(ruleConfig, 'minCount', ruleType);
      const completedSliceIds = context.contentSlices
        .filter((slice) => slice.status === 'completed')
        .map((slice) => slice.id)
        .sort();

      if (completedSliceIds.length < minCount) {
        return null;
      }

      return {
        achievementId: definition.id,
        triggerSourceId: deriveTriggerSourceId(
          completedSliceIds.slice(0, minCount),
        ),
      };
    }

    case 'media_clean_stop': {
      const minWatchedSeconds = readNumber(
        ruleConfig,
        'minWatchedSeconds',
        ruleType,
      );
      const stopReasons = new Set(
        readStringArray(ruleConfig, 'stopReasons', ruleType),
      );
      const qualifyingEventIds = context.mediaProgressEvents
        .filter(
          (event) =>
            event.watchedSeconds >= minWatchedSeconds &&
            stopReasons.has(event.stoppedBecause),
        )
        .map((event) => event.id)
        .sort();

      if (qualifyingEventIds.length === 0) {
        return null;
      }

      return {
        achievementId: definition.id,
        triggerSourceId: qualifyingEventIds[0]!,
      };
    }

    case 'study_session_duration_count': {
      const minMinutes = readNumber(ruleConfig, 'minMinutes', ruleType);
      const minCount = readNumber(ruleConfig, 'minCount', ruleType);
      const qualifyingSessionIds = context.studySessions
        .filter((session) => session.durationMinutes >= minMinutes)
        .map((session) => session.id)
        .sort();

      if (qualifyingSessionIds.length < minCount) {
        return null;
      }

      return {
        achievementId: definition.id,
        triggerSourceId: deriveTriggerSourceId(
          qualifyingSessionIds.slice(0, minCount),
        ),
      };
    }

    case 'study_session_mode_count': {
      const mode = readString(ruleConfig, 'mode', ruleType);
      const minCount = readNumber(ruleConfig, 'minCount', ruleType);
      const qualifyingSessionIds = context.studySessions
        .filter((session) => session.mode === mode)
        .map((session) => session.id)
        .sort();

      if (qualifyingSessionIds.length < minCount) {
        return null;
      }

      return {
        achievementId: definition.id,
        triggerSourceId: deriveTriggerSourceId(
          qualifyingSessionIds.slice(0, minCount),
        ),
      };
    }

    case 'physical_activity':
    case 'evidence_subjects_solved':
    case 'checkpoint_cleared':
      // Evaluated only against trusted programme learner evidence. Generic
      // catalogue/activity saves must not reinterpret mastery semantics.
      return null;

    default: {
      // Exhaustiveness guard: an unhandled rule type is a programming error.
      const exhaustiveCheck: never = ruleType as never;
      throw new Error(`Unsupported achievement rule type: ${exhaustiveCheck}`);
    }
  }
}

/**
 * Pure achievement evaluation over accumulated local source data. Returns the
 * full satisfied set (sorted by achievement id for determinism). Re-running the
 * evaluator over identical input yields an identical result, which is what makes
 * the persistence layer idempotent. No Dexie, no clock, no side effects.
 *
 * `definitions` is the active programme's composed achievement catalogue
 * (Epic C / C3); the engine holds no definitions of its own.
 */
export function evaluateAchievements(
  definitions: readonly AchievementDefinition[],
  context: AchievementEvaluationContext,
): SatisfiedAchievement[] {
  const index = buildIndex(context);

  return definitions
    .map((definition) => evaluateDefinition(definition, context, index))
    .filter(
      (satisfied): satisfied is SatisfiedAchievement => satisfied !== null,
    )
    .sort((left, right) =>
      left.achievementId.localeCompare(right.achievementId),
    );
}
