/**
 * Test helpers for "where is this learner in the Campaign?". Pure data in, data
 * out, no imports, so the jsdom tests and the Playwright spec (which loads it by
 * path) share one definition. Two shapes:
 *
 * - `campaignPosition`: the `CampaignPosition` the availability functions read,
 *   built from the real content index the way the Campaign read model reports
 *   it (quests in authored order, complete / reached flags, a current quest);
 * - `progressRows`: the `progress_entries` rows the Campaign itself keeps, to
 *   seed a real database so the real read model produces the position.
 */

type IndexLike = {
  readonly modules: readonly {
    readonly missions: readonly {
      readonly itemId: string;
      readonly optional: boolean;
    }[];
  }[];
};

export type Reach = {
  /** Items the learner has completed. */
  readonly complete?: readonly string[];
  /** Items they have started but not completed. */
  readonly started?: readonly string[];
};

/** Every Campaign item in authored order, with whether it is required. */
export function campaignItems(index: IndexLike) {
  return index.modules.flatMap((module) =>
    module.missions.map((mission) => ({
      id: mission.itemId,
      required: !mission.optional,
    })),
  );
}

/** The first `count` required items in authored order. */
export function firstRequired(index: IndexLike, count: number): string[] {
  return campaignItems(index)
    .filter((item) => item.required)
    .slice(0, count)
    .map((item) => item.id);
}

/**
 * The position the Campaign read model reports for this reach: the current
 * quest is the first started-but-incomplete required item, else the first
 * incomplete required item (the same preference `selectQuestRecommendation`
 * applies), or null once every required item is complete.
 */
export function campaignPosition(index: IndexLike, reach: Reach = {}) {
  const complete = new Set(reach.complete ?? []);
  const started = new Set(reach.started ?? []);
  const quests = campaignItems(index).map((item) => ({
    complete: complete.has(item.id),
    id: item.id,
    reached: complete.has(item.id) || started.has(item.id),
    required: item.required,
  }));
  const incomplete = quests.filter(
    (quest) => quest.required && !quest.complete,
  );
  const current =
    incomplete.find((quest) => started.has(quest.id)) ?? incomplete[0] ?? null;

  return {
    currentQuestId: current === null ? null : current.id,
    quests,
    state: 'ready' as const,
  };
}

/** `progress_entries` rows, as the Campaign's own progress form writes them. */
export function progressRows(
  items: readonly string[],
  status: 'completed' | 'started',
  at = '2026-10-05T09:00:00.000Z',
) {
  return items.map((itemId) => ({
    ...(status === 'completed' ? { completedAt: at } : {}),
    confidence: 0,
    createdAt: at,
    id: `seed-progress-${itemId}`,
    itemId,
    startedAt: at,
    status,
    updatedAt: at,
  }));
}
