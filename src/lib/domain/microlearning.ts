/**
 * Neutral microlearning contracts. A programme may own a small, curated bank of
 * stateless practice cards (`ProgrammeContent.microlearning`); programmes that
 * ship none simply have no microlearning surface. These are content shapes
 * only: nothing here is a learner record, and no card result is ever stored.
 * The validator is a pure function so a programme definition fails closed at
 * load time when its bank is malformed or points at material that is not in
 * its own catalogue.
 */

import type { ProgrammeContentIndex } from './lessonContent';

export type MicroCardKind =
  | 'learn'
  | 'select'
  | 'order'
  | 'match'
  | 'tap'
  | 'assemble';

/**
 * Why a card is where it is in its session: `explain` is the non-assessed
 * Learn card; the others are practice and say what the card does for the
 * learner relative to what came before.
 */
export type MicroRole =
  | 'explain'
  | 'scaffold'
  | 'retrieval'
  | 'representation'
  | 'application';

/**
 * Where a card's idea comes from, in the programme's own identifiers: the
 * catalogue module, the authored lesson units, and the existing skill IDs.
 */
export type MicroSource = {
  readonly moduleId: string;
  readonly lessonUnitIds: readonly string[];
  readonly skillIds: readonly string[];
};

export type MicroOption = {
  readonly id: string;
  readonly label: string;
  /**
   * Why this particular wrong option is wrong, shown when the learner picks
   * it in place of the card's general hint. Optional; never on the answer.
   */
  readonly feedback?: string;
};

/** A code token. `name` is the spoken form for symbols such as `(`. */
export type MicroToken = {
  readonly id: string;
  readonly text: string;
  readonly name?: string;
};

/** A static board illustration, never a learner record or a new exercise kind. */
export type MicroKanbanBoard = {
  readonly title: string;
  readonly wipLimit: number;
  readonly change?: string;
  readonly items: readonly {
    readonly id: string;
    readonly title: string;
    readonly status: 'ready' | 'active' | 'done';
    readonly detail?: string;
    /** A reason, not a colour: blocked work remains active. */
    readonly blocked?: string;
  }[];
};

type MicroCardBase = {
  readonly id: string;
  /** Says what to DO ("Hva skrives ut?"), never just the topic. */
  readonly title: string;
  readonly role: MicroRole;
  readonly source: MicroSource;
};

/** Practice cards: a hint for the first miss, an explanation for the end. */
type MicroPracticeBase = MicroCardBase & {
  /**
   * The situation under the title, when the task needs it. A line break starts
   * a new paragraph, so two statements can be read apart.
   */
  readonly context?: string;
  /**
   * The question itself, shown directly above the choices. Optional: without
   * it the title is the question. With it the title is a short heading and the
   * question sits next to what the learner acts on, after the situation.
   */
  readonly question?: string;
  /** Points at the idea after a first miss without giving the answer away. */
  readonly hint: string;
  /** Why the answer is the answer; shown when the card ends. */
  readonly explanation: string;
};

export type MicroLearnCard = MicroCardBase & {
  readonly kind: 'learn';
  readonly role: 'explain';
  /** Plain text; a line break starts a new paragraph. */
  readonly idea: string;
  readonly board?: MicroKanbanBoard;
  /**
   * Key words, each with a short plain explanation, shown after the idea with
   * the word in bold. Structured data rather than markup, so nothing in the
   * text itself is ever interpreted. Optional.
   */
  readonly definitions?: readonly {
    readonly term: string;
    readonly text: string;
  }[];
  /**
   * A tiny worked example. Required in «Forbered deg» and «Repeter»; a
   * voluntary track (`MicroTrack`) may teach in text alone, never in
   * explanation written as fake code.
   */
  readonly example?: { readonly code: string; readonly note: string };
  /** The explicit hand-over to the practice that follows. */
  readonly bridge: string;
};

export type MicroSelectCard = MicroPracticeBase & {
  readonly kind: 'select';
  readonly board?: MicroKanbanBoard;
  readonly code?: string;
  readonly options: readonly MicroOption[];
  readonly correctId: string;
};

export type MicroOrderCard = MicroPracticeBase & {
  readonly kind: 'order';
  /** Items in the order they are shown (deliberately not the answer). */
  readonly items: readonly MicroOption[];
  readonly correctOrder: readonly string[];
};

export type MicroMatchPair = {
  readonly id: string;
  readonly left: string;
  readonly right: string;
};

export type MicroMatchCard = MicroPracticeBase & {
  readonly kind: 'match';
  /** Ordinary prose on the left when requested; otherwise preserve code. */
  readonly leftPresentation?: 'text';
  readonly leftLabel: string;
  readonly rightLabel: string;
  readonly pairs: readonly MicroMatchPair[];
  /**
   * Right-hand choices that belong to no pair (a track's text matching only),
   * so the last pair is not found by elimination. Optional.
   */
  readonly unusedRight?: readonly MicroOption[];
  /** Pair and unused IDs in the order the right-hand column shows them. */
  readonly rightOrder: readonly string[];
};

export type MicroTapLine = {
  readonly number: number;
  readonly tokens: readonly MicroToken[];
};

export type MicroTapCard = MicroPracticeBase & {
  readonly kind: 'tap';
  readonly error?: string;
  readonly lines: readonly MicroTapLine[];
  readonly correctTokenId: string;
};

export type MicroAssembleCard = MicroPracticeBase & {
  readonly kind: 'assemble';
  /** Tokens in the order the pool shows them (distractors included). */
  readonly tokens: readonly MicroToken[];
  readonly correctOrder: readonly string[];
};

export type MicroCard =
  | MicroLearnCard
  | MicroSelectCard
  | MicroOrderCard
  | MicroMatchCard
  | MicroTapCard
  | MicroAssembleCard;

export type MicroSession = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly minutes: number;
  readonly cards: readonly MicroCard[];
  /** What to take away, shown on the finished screen. Optional. */
  readonly takeaway?: string;
  /**
   * Reinforcement only: the session's topics, when it repeats more than one
   * (see `listReinforcementSessions`). Every card belongs to exactly one part.
   * Optional; without parts the session is one topic.
   */
  readonly parts?: readonly MicroSessionPart[];
};

/**
 * One topic of a reinforcement session: the cards that teach and practise
 * one thing and still make sense without the session's other topics (a Learn
 * card and the practice it hands into always share a part).
 */
export type MicroSessionPart = {
  /** The cards, by ID; they keep the session's order. */
  readonly cardIds: readonly string[];
  /** What the part practises: the session's summary while only some parts are open. */
  readonly summary: string;
};

/** Category membership references the flat track registry; it owns no cards. */
export type MicroTrackCategory = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly sessionIds: readonly string[];
};

/**
 * A voluntary track: a small, named set of sessions the learner may open at
 * any time, in any order. It is not tied to the Campaign: nothing about it is
 * gated by, derived from or written to Campaign progress, and its cards cite
 * the track itself (`source.moduleId` is the track ID, `lessonUnitIds` the
 * authored activity IDs) rather than catalogue units.
 */
export type MicroTrack = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  /** What the track is for, behind the (i) of its Home entry. Optional. */
  readonly about?: string;
  readonly sessions: readonly MicroSession[];
  readonly categories?: readonly MicroTrackCategory[];
};

/**
 * A preparation session ("Forbered deg"): a short, teaching-first primer for
 * what the learner is about to meet in the Campaign. It is an advance
 * organizer, not a second curriculum: a key idea, a worked example and one
 * scaffolded check, ending long before the Campaign lesson does. `prepares`
 * names the programme's own Campaign items it is for. Its cards may be the
 * very same card objects a reinforcement session uses.
 */
export type MicroPrimer = MicroSession & {
  readonly prepares: readonly string[];
};

export type MicrolearningBank = {
  /** Reinforcement ("Repeter"): retrieval of material the learner has worked on. */
  readonly sessions: readonly MicroSession[];
  /** Preparation ("Forbered deg"), in Campaign order. Optional. */
  readonly primers?: readonly MicroPrimer[];
  /** Voluntary tracks, open regardless of the Campaign. Optional. */
  readonly tracks?: readonly MicroTrack[];
};

/** Every reinforcement card of a bank, in session order. */
export function listMicroCards(bank: MicrolearningBank): MicroCard[] {
  return bank.sessions.flatMap((session) => [...session.cards]);
}

/** The cards that exist only in a primer, in primer order. */
export function listPrimerOnlyCards(bank: MicrolearningBank): MicroCard[] {
  const known = new Set(listMicroCards(bank));

  return (bank.primers ?? []).flatMap((primer) =>
    primer.cards.filter((card) => !known.has(card)),
  );
}

/**
 * Where the learner is in the Campaign, as the Campaign itself reports it.
 * It is derived by the application's own Campaign read model (the one behind
 * Home and the Map: "N of M required tasks complete", the current quest), never
 * recomputed here and never written. `quests` are the Campaign items in
 * authored order. A quest is `complete` by the Campaign's own completion rule
 * and `reached` once the learner has started or completed it. `currentQuestId`
 * is the Campaign's current quest, or null when there is none (every required
 * task complete, or the Campaign could not be read).
 */
export type CampaignPosition = {
  readonly state: 'ready' | 'unavailable';
  readonly quests: readonly {
    readonly id: string;
    readonly required: boolean;
    readonly complete: boolean;
    readonly reached: boolean;
  }[];
  readonly currentQuestId: string | null;
};

/** The Campaign item (mission) each lesson unit of the content index belongs to. */
export function mapLessonUnitsToCampaignItems(
  index: Pick<ProgrammeContentIndex, 'modules' | 'units'>,
): Map<string, string> {
  const itemByMission = new Map(
    index.modules.flatMap((module) =>
      module.missions.map((mission) => [mission.missionId, mission.itemId]),
    ),
  );

  return new Map(
    index.units.flatMap((unit) => {
      const itemId = itemByMission.get(unit.missionId);

      return itemId === undefined ? [] : [[unit.unitId, itemId]];
    }),
  );
}

/** The Campaign items a session's cards teach, or null if one has no item. */
export function listSessionCampaignItems(
  session: MicroSession,
  itemOfUnit: ReadonlyMap<string, string>,
): string[] | null {
  const items = new Set<string>();

  for (const unitId of session.cards.flatMap(
    (card) => card.source.lessonUnitIds,
  )) {
    const itemId = itemOfUnit.get(unitId);

    if (itemId === undefined) {
      return null;
    }
    items.add(itemId);
  }

  return [...items];
}

/**
 * Reinforcement ("Repeter"), one topic at a time. A part of a session (the
 * whole session when it has no parts) opens when every Campaign item its own
 * cards come from has been reached (started or completed) in the Campaign. A
 * session is offered with its open parts only, in authored order: a topic the
 * learner has reached is not held back by another one they have not, and a
 * topic they have not reached is never shown, not in a card, a summary or a
 * takeaway. With every part open the session is the authored one; with some,
 * it is a copy holding those parts' cards and summaries, its minutes scaled
 * to its cards, and no takeaway. The requirement is derived from the cards'
 * own citations, so it cannot drift from what they teach, and the answer
 * comes from the same position the Campaign UI shows. An unknown citation
 * anywhere in a session, or an unreadable Campaign, opens nothing.
 */
export function listReinforcementSessions(
  bank: MicrolearningBank,
  index: Pick<ProgrammeContentIndex, 'modules' | 'units'>,
  position: CampaignPosition,
): MicroSession[] {
  if (position.state !== 'ready') {
    return [];
  }
  const itemOfUnit = mapLessonUnitsToCampaignItems(index);
  const reached = new Set(
    position.quests.filter((quest) => quest.reached).map((quest) => quest.id),
  );

  return bank.sessions.flatMap((session) => {
    const open = openReachedParts(session, itemOfUnit, reached);

    return open === null ? [] : [open];
  });
}

function openReachedParts(
  session: MicroSession,
  itemOfUnit: ReadonlyMap<string, string>,
  reached: ReadonlySet<string>,
): MicroSession | null {
  const items = listSessionCampaignItems(session, itemOfUnit);

  if (items === null || items.length === 0) {
    return null;
  }
  const parts = session.parts ?? [
    { cardIds: session.cards.map((card) => card.id), summary: session.summary },
  ];
  const isReached = (cardId: string) =>
    session.cards
      .find((card) => card.id === cardId)
      ?.source.lessonUnitIds.every((unitId) =>
        reached.has(itemOfUnit.get(unitId) ?? ''),
      ) === true;
  const openParts = parts.filter(
    (part) => part.cardIds.length > 0 && part.cardIds.every(isReached),
  );

  if (openParts.length === 0) {
    return null;
  }
  if (openParts.length === parts.length) {
    return session;
  }
  const openIds = new Set(openParts.flatMap((part) => part.cardIds));
  const cards = session.cards.filter((card) => openIds.has(card.id));

  return {
    cards,
    id: session.id,
    minutes: Math.max(
      1,
      Math.round((session.minutes * cards.length) / session.cards.length),
    ),
    parts: openParts,
    summary: openParts.map((part) => part.summary).join(' '),
    title: session.title,
  };
}

/**
 * Preparation ("Forbered deg"): at most one primer, and never one that looks
 * further ahead than the next step. With `c` the Campaign's current required
 * quest, a primer is in range when its items are not all complete, it does not
 * start later than the quest after the current one, and it does not end
 * before the current one (a primer for something the learner passed over is
 * stale, not preparation). Positions come from the Campaign's authored order,
 * not from numbers written here. When two are in range, the one that covers
 * the current quest wins over the one for the next step.
 */
export function selectPrimer(
  bank: MicrolearningBank,
  position: CampaignPosition,
): MicroPrimer | undefined {
  if (position.state !== 'ready' || position.currentQuestId === null) {
    return undefined;
  }
  const order = position.quests.filter((quest) => quest.required);
  const at = new Map(order.map((quest, place) => [quest.id, place]));
  const current = at.get(position.currentQuestId);

  if (current === undefined) {
    return undefined;
  }
  const inRange = (bank.primers ?? []).filter((primer) => {
    const places = primer.prepares.map((id) => at.get(id));

    if (places.length === 0 || places.some((place) => place === undefined)) {
      return false;
    }
    const first = Math.min(...(places as number[]));
    const last = Math.max(...(places as number[]));
    const allComplete = primer.prepares.every(
      (id) => order[at.get(id) ?? 0]?.complete === true,
    );

    return !allComplete && first <= current + 1 && last >= current;
  });

  return (
    inRange.find((primer) =>
      primer.prepares.some((id) => at.get(id) === current),
    ) ?? inRange[0]
  );
}

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const skillPattern = /^SK-[A-Z]+-\d{2}$/;

function isPermutation(
  candidate: readonly string[],
  ids: readonly string[],
): boolean {
  return (
    candidate.length === ids.length &&
    new Set(candidate).size === candidate.length &&
    candidate.every((id) => ids.includes(id))
  );
}

function sameSequence(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * A track card (`track`) may teach in text alone, offer a fourth option, and
 * give a text Match right-hand choices that belong to no pair.
 */
function findCardShapeIssues(
  card: MicroCard,
  { track = false }: { track?: boolean } = {},
): string[] {
  const label = `card "${card.id}"`;
  const issues: string[] = [];
  const unique = (ids: readonly string[]) => new Set(ids).size === ids.length;

  if ((card.kind === 'learn' || card.kind === 'select') && card.board) {
    const { title, wipLimit, items, change } = card.board;
    if (
      !track ||
      title.trim() === '' ||
      !Number.isSafeInteger(wipLimit) ||
      wipLimit < 1 ||
      items.length === 0 ||
      !unique(items.map((item) => item.id)) ||
      change?.trim() === '' ||
      items.some(
        (item) =>
          item.id.trim() === '' ||
          item.title.trim() === '' ||
          !['ready', 'active', 'done'].includes(item.status) ||
          item.detail?.trim() === '' ||
          (item.blocked !== undefined &&
            (item.blocked.trim() === '' || item.status !== 'active')),
      )
    ) {
      issues.push(`${label} has an invalid track board`);
    }
  }

  switch (card.kind) {
    case 'learn':
      if (card.example === undefined) {
        if (!track) {
          issues.push(`${label} has no example code`);
        }
      } else if (card.example.code.trim() === '') {
        issues.push(`${label} has no example code`);
      }
      if (card.idea.trim() === '') {
        issues.push(`${label} has no idea`);
      }
      if (
        card.definitions?.some(
          (entry) => entry.term.trim() === '' || entry.text.trim() === '',
        )
      ) {
        issues.push(`${label} has an empty definition`);
      }
      if (card.bridge.trim() === '') {
        issues.push(`${label} has no bridge into the practice that follows`);
      }
      break;
    case 'select': {
      const ids = card.options.map((option) => option.id);
      if (card.options.length < 2 || card.options.length > (track ? 4 : 3)) {
        issues.push(
          `${label} needs two or ${track ? 'up to four' : 'three'} options`,
        );
      }
      if (!unique(ids) || !ids.includes(card.correctId)) {
        issues.push(`${label} options must be unique and include the answer`);
      }
      for (const option of card.options) {
        if (option.feedback === undefined) {
          continue;
        }
        if (option.id === card.correctId) {
          issues.push(`${label} gives the answer wrong-option feedback`);
        } else if (option.feedback.trim() === '') {
          issues.push(`${label} option "${option.id}" has empty feedback`);
        }
      }
      break;
    }
    case 'order': {
      const ids = card.items.map((item) => item.id);
      if (card.items.length < 3 || card.items.length > 5) {
        issues.push(`${label} needs three to five steps`);
      }
      if (!isPermutation(card.correctOrder, ids)) {
        issues.push(`${label} answer must order every step exactly once`);
      } else if (sameSequence(card.correctOrder, ids)) {
        issues.push(`${label} shows the steps already in answer order`);
      }
      break;
    }
    case 'match': {
      const ids = card.pairs.map((pair) => pair.id);
      const unused = (card.unusedRight ?? []).map((option) => option.id);
      const rightIds = [...ids, ...unused];
      if (card.pairs.length < 3 || card.pairs.length > 4) {
        issues.push(`${label} needs three or four pairs`);
      }
      if (!unique(rightIds)) {
        issues.push(`${label} pair IDs must be unique`);
      }
      if (
        unused.length > 0 &&
        (!track || card.leftPresentation !== 'text' || rightIds.length > 4)
      ) {
        issues.push(`${label} may only add unused choices to a track's text`);
      }
      if (!isPermutation(card.rightOrder, rightIds)) {
        issues.push(`${label} right column must list every pair once`);
      } else if (sameSequence(card.rightOrder, ids)) {
        issues.push(`${label} right column is already in pair order`);
      }
      break;
    }
    case 'tap': {
      const ids = card.lines.flatMap((line) =>
        line.tokens.map((token) => token.id),
      );
      if (card.lines.length === 0 || !unique(ids)) {
        issues.push(`${label} needs lines with unique tokens`);
      }
      if (!ids.includes(card.correctTokenId)) {
        issues.push(`${label} answer is not one of its tokens`);
      }
      break;
    }
    case 'assemble': {
      const ids = card.tokens.map((token) => token.id);
      if (!unique(ids)) {
        issues.push(`${label} token IDs must be unique`);
      }
      if (
        !unique(card.correctOrder) ||
        !card.correctOrder.every((id) => ids.includes(id))
      ) {
        issues.push(`${label} answer must use its own tokens at most once`);
      } else if (sameSequence(card.correctOrder, ids)) {
        issues.push(`${label} shows the tokens already in answer order`);
      }
      break;
    }
  }

  if (card.kind !== 'learn') {
    if (card.hint.trim() === '' || card.explanation.trim() === '') {
      issues.push(`${label} needs a hint and an explanation`);
    } else if (card.hint.trim() === card.explanation.trim()) {
      issues.push(`${label} hint repeats the explanation`);
    }
    if (card.question !== undefined && card.question.trim() === '') {
      issues.push(`${label} has an empty question`);
    }
  }

  return issues;
}

/**
 * Structural problems of a bank, or an empty list. `catalogueUnitIds` are the
 * programme's own catalogue unit IDs: a card may only cite a module the
 * programme actually has.
 */
export function findMicrolearningBankIssues(
  bank: MicrolearningBank,
  catalogueUnitIds: ReadonlySet<string>,
): string[] {
  const issues: string[] = [];
  const cardIds = new Set<string>();
  const sessionIds = new Set<string>();

  if (bank.sessions.length === 0) {
    issues.push('microlearning bank has no sessions');
  }
  // The picker is one screen that does not scroll: four sessions fit a phone.
  if (bank.sessions.length > 4) {
    issues.push('microlearning bank offers more than four sessions');
  }

  for (const session of bank.sessions) {
    if (!idPattern.test(session.id) || sessionIds.has(session.id)) {
      issues.push(`session "${session.id}" needs a unique lowercase ID`);
    }
    sessionIds.add(session.id);
    if (session.cards.length < 4 || session.cards.length > 8) {
      issues.push(`session "${session.id}" needs four to eight cards`);
    }
    if (session.title.trim() === '' || session.summary.trim() === '') {
      issues.push(`session "${session.id}" needs a title and a summary`);
    }
    if (!Number.isInteger(session.minutes) || session.minutes < 1) {
      issues.push(`session "${session.id}" needs whole minutes`);
    }

    session.cards.forEach((card, index) => {
      if (!idPattern.test(card.id) || cardIds.has(card.id)) {
        issues.push(`card "${card.id}" needs a unique lowercase ID`);
      }
      cardIds.add(card.id);
      issues.push(...findCardIssues(card, catalogueUnitIds));
      if (card.kind === 'learn') {
        const next = session.cards[index + 1];
        if (next === undefined || next.kind === 'learn') {
          issues.push(
            `Learn card "${card.id}" must be followed by a practice card`,
          );
        }
      }
    });
    issues.push(...findPartIssues(session));
  }

  const reinforcementCards = new Set(listMicroCards(bank));
  const primerIds = new Set<string>();

  for (const primer of bank.primers ?? []) {
    if (
      !idPattern.test(primer.id) ||
      sessionIds.has(primer.id) ||
      primerIds.has(primer.id)
    ) {
      issues.push(`primer "${primer.id}" needs a unique lowercase ID`);
    }
    primerIds.add(primer.id);
    if (primer.cards.length < 2 || primer.cards.length > 3) {
      issues.push(`primer "${primer.id}" needs two or three cards`);
    }
    if (primer.title.trim() === '' || primer.summary.trim() === '') {
      issues.push(`primer "${primer.id}" needs a title and a summary`);
    }
    if (!Number.isInteger(primer.minutes) || primer.minutes < 1) {
      issues.push(`primer "${primer.id}" needs whole minutes`);
    }
    if (
      primer.prepares.length === 0 ||
      new Set(primer.prepares).size !== primer.prepares.length ||
      !primer.prepares.every((id) => idPattern.test(id))
    ) {
      issues.push(
        `primer "${primer.id}" must name the Campaign items it is for`,
      );
    }
    if (primer.cards[0]?.kind !== 'learn') {
      issues.push(`primer "${primer.id}" must start by teaching`);
    }

    primer.cards.forEach((card, index) => {
      // A primer card is either a reinforcement card itself or its own card.
      if (!reinforcementCards.has(card)) {
        if (!idPattern.test(card.id) || cardIds.has(card.id)) {
          issues.push(`card "${card.id}" needs a unique lowercase ID`);
        }
        cardIds.add(card.id);
        issues.push(...findCardIssues(card, catalogueUnitIds));
      }
      if (card.kind === 'learn') {
        const next = primer.cards[index + 1];
        if (next === undefined || next.kind === 'learn') {
          issues.push(
            `Learn card "${card.id}" must be followed by a practice card`,
          );
        }
      }
    });
  }

  issues.push(...findTrackIssues(bank, sessionIds, primerIds, cardIds));

  return issues;
}

/**
 * A reinforcement session's parts are its topics, so each must stand alone:
 * at least two, each with cards and a summary, every card in exactly one,
 * and a Learn card in the same part as the practice it hands into (opening
 * some parts then never leaves an explanation without its practice).
 */
function findPartIssues(session: MicroSession): string[] {
  if (session.parts === undefined) {
    return [];
  }
  const label = `session "${session.id}"`;
  const issues: string[] = [];
  const partOf = new Map<string, number>();

  if (session.parts.length < 2) {
    issues.push(`${label} needs two or more parts, or none`);
  }
  session.parts.forEach((part, place) => {
    if (part.cardIds.length === 0 || part.summary.trim() === '') {
      issues.push(`${label} part ${place + 1} needs cards and a summary`);
    }
    for (const id of part.cardIds) {
      if (partOf.has(id)) {
        issues.push(`${label} puts card "${id}" in more than one part`);
      }
      partOf.set(id, place);
    }
  });
  const ids = session.cards.map((card) => card.id);

  if (!isPermutation([...partOf.keys()], ids)) {
    issues.push(`${label} parts must hold each of its cards once`);
  }
  session.cards.forEach((card, index) => {
    const next = session.cards[index + 1];

    if (
      card.kind === 'learn' &&
      next !== undefined &&
      partOf.get(card.id) !== partOf.get(next.id)
    ) {
      issues.push(
        `${label} separates Learn card "${card.id}" from its practice`,
      );
    }
  });

  return issues;
}

/**
 * Voluntary tracks: the same card rules as the rest of the bank (one Learn
 * card at a time, each followed by practice; three or four pairs; nothing
 * shown already solved), with differences that follow from what a track is.
 * Cards cite the track, not a catalogue unit. A Learn card may teach in text
 * alone. A choice may have four options, and a text Match may add a choice
 * that belongs to no pair (the track scrolls when its content needs it). A
 * concept Learn card may hand over to one situation Learn card before the
 * practice, never to more. A session starts by teaching and ends on what to
 * take away. Tracks
 * without categories allow one to six sessions; categorized tracks can
 * contain more with each session in one category.
 */
function findTrackIssues(
  bank: MicrolearningBank,
  sessionIds: ReadonlySet<string>,
  primerIds: ReadonlySet<string>,
  cardIds: Set<string>,
): string[] {
  const issues: string[] = [];
  const trackIds = new Set<string>();
  const trackSessionIds = new Set<string>();
  const taken = (id: string) =>
    sessionIds.has(id) || primerIds.has(id) || trackSessionIds.has(id);

  for (const track of bank.tracks ?? []) {
    if (!idPattern.test(track.id) || trackIds.has(track.id)) {
      issues.push(`track "${track.id}" needs a unique lowercase ID`);
    }
    trackIds.add(track.id);
    if (track.title.trim() === '' || track.summary.trim() === '') {
      issues.push(`track "${track.id}" needs a title and a summary`);
    }
    if (track.about !== undefined && track.about.trim() === '') {
      issues.push(`track "${track.id}" has an empty description`);
    }
    if (track.categories === undefined) {
      if (track.sessions.length === 0 || track.sessions.length > 6) {
        issues.push(`track "${track.id}" needs one to six sessions`);
      }
    } else {
      if (track.sessions.length === 0 || track.categories.length === 0) {
        issues.push(`track "${track.id}" needs sessions and categories`);
      }
      const categoryIds = new Set<string>();
      const members = new Set<string>();
      const sessionIds = new Set(track.sessions.map((session) => session.id));
      for (const category of track.categories) {
        if (!idPattern.test(category.id) || categoryIds.has(category.id)) {
          issues.push(
            `track "${track.id}" category needs a unique lowercase ID`,
          );
        }
        categoryIds.add(category.id);
        if (category.title.trim() === '' || category.summary.trim() === '') {
          issues.push(`category "${category.id}" needs a title and a summary`);
        }
        for (const id of category.sessionIds) {
          if (!sessionIds.has(id)) {
            issues.push(
              `category "${category.id}" references unknown session "${id}"`,
            );
          }
          if (members.has(id)) {
            issues.push(
              `session "${id}" belongs to more than one category entry`,
            );
          }
          members.add(id);
        }
      }
      for (const id of sessionIds) {
        if (!members.has(id)) {
          issues.push(`session "${id}" needs a category`);
        }
      }
    }

    for (const session of track.sessions) {
      if (!idPattern.test(session.id) || taken(session.id)) {
        issues.push(`session "${session.id}" needs a unique lowercase ID`);
      }
      trackSessionIds.add(session.id);
      if (session.cards.length < 4 || session.cards.length > 8) {
        issues.push(`session "${session.id}" needs four to eight cards`);
      }
      if (session.title.trim() === '' || session.summary.trim() === '') {
        issues.push(`session "${session.id}" needs a title and a summary`);
      }
      if (!Number.isInteger(session.minutes) || session.minutes < 1) {
        issues.push(`session "${session.id}" needs whole minutes`);
      }
      if (session.cards[0]?.kind !== 'learn') {
        issues.push(`session "${session.id}" must start by teaching`);
      }
      if ((session.takeaway ?? '').trim() === '') {
        issues.push(`session "${session.id}" needs a takeaway`);
      }

      session.cards.forEach((card, index) => {
        if (!idPattern.test(card.id) || cardIds.has(card.id)) {
          issues.push(`card "${card.id}" needs a unique lowercase ID`);
        }
        cardIds.add(card.id);
        issues.push(...findCardIssues(card, new Set(), track));
        if (card.kind === 'learn') {
          const next = session.cards[index + 1];
          // A concept may hand over to one situation card, then to practice.
          const situation =
            next?.kind === 'learn' &&
            session.cards[index - 1]?.kind !== 'learn' &&
            session.cards[index + 2] !== undefined &&
            session.cards[index + 2]!.kind !== 'learn';
          if (next === undefined || (next.kind === 'learn' && !situation)) {
            issues.push(
              `Learn card "${card.id}" must be followed by a practice card`,
            );
          }
        }
      });
    }
  }

  return issues;
}

/**
 * A card of «Forbered deg» or «Repeter» cites a catalogue unit; a card of a
 * voluntary `track` cites that track instead and may teach in text alone.
 */
function findCardIssues(
  card: MicroCard,
  catalogueUnitIds: ReadonlySet<string>,
  track?: MicroTrack,
): string[] {
  const issues: string[] = [];

  if (card.title.trim() === '') {
    issues.push(`card "${card.id}" has no title`);
  }
  if (track === undefined && !catalogueUnitIds.has(card.source.moduleId)) {
    issues.push(
      `card "${card.id}" cites module "${card.source.moduleId}", which is not a catalogue unit`,
    );
  }
  if (track !== undefined && card.source.moduleId !== track.id) {
    issues.push(
      `card "${card.id}" cites "${card.source.moduleId}", not its track "${track.id}"`,
    );
  }
  if (
    card.source.lessonUnitIds.length === 0 ||
    card.source.skillIds.length === 0 ||
    !card.source.skillIds.every((skill) => skillPattern.test(skill))
  ) {
    issues.push(`card "${card.id}" needs lesson units and skill IDs`);
  }

  return [
    ...issues,
    ...findCardShapeIssues(card, { track: track !== undefined }),
  ];
}
