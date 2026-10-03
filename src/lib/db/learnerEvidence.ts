import {
  EvaluationResultRecordSchema,
  ExerciseAttemptRecordSchema,
  LearnerEvidenceSchema,
  LessonPositionSchema,
  SupportEventRecordSchema,
  canonicalJson,
  deriveLessonPositionId,
  findAnswerPayloadIssues,
  type EvaluationOutcome,
  type EvaluationResultRecord,
  type ExerciseAnswer,
  type ExerciseAttemptRecord,
  type ExerciseResponseMode,
  type LearnerEvidence,
  type LessonPosition,
  type SupportEventRecord,
  type SupportKind,
  type XpTransaction,
} from '@/lib/domain';
import type { PotentialXpAward } from '@/lib/xp/engine';
import { parseWithSchema } from '@/lib/validation';

import { isAuthorizedProgramme, type ProgressPalDatabase } from './database';
import {
  awardXpOnce,
  createLogicalWriteScope,
  defaultClock,
  ensureBaseInitialization,
  ensureOpen,
  parseStoredArray,
  resolveDatabase,
  settleLogicalWriteScope,
  sortLearnerEvidence,
  type BaseDatabaseOptions,
  type DatabaseClock,
  type LogicalWriteScope,
} from './repositories';

/**
 * Learner-evidence and lesson-position repository (Epic E, E-SCHEMA-1 §3,
 * §4, §9). The evidence store has insert and read paths only: no update and
 * no delete. Its only removal paths are the whole-database reset and the
 * atomic restore. Every write goes through the existing coordinated-write
 * scope, so a read-only tab commits nothing and a committed write announces
 * one revision.
 */

/** A conflicting payload under an existing identity. The stored row stands. */
export class LearnerEvidenceConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LearnerEvidenceConflictError';
  }
}

/** A new submit for a subject whose earlier attempt has no terminal result. */
export class UnresolvedAttemptError extends Error {
  readonly attemptId: string;

  constructor(subjectId: string, attemptId: string) {
    super(
      `Exercise "${subjectId}" has an unresolved attempt "${attemptId}"; it is recovered, not replaced.`,
    );
    this.name = 'UnresolvedAttemptError';
    this.attemptId = attemptId;
  }
}

type EvidenceBinding = {
  programmeId: string;
  contentVersion: number;
  subjectId: string;
  contentHash: string;
};

export type ExerciseAttemptInput = EvidenceBinding & {
  id: string;
  responseMode: ExerciseResponseMode;
  answer: ExerciseAnswer;
  variantId?: string;
};

export type EvaluationResultInput = {
  id: string;
  attemptId: string;
  outcome: EvaluationOutcome;
  matchedFeedbackKey?: string;
};

export type SupportEventInput = EvidenceBinding & {
  id: string;
  supportKind: SupportKind;
  hintNumber?: number;
};

export type LessonPositionInput = {
  itemId: string;
  programmeId: string;
  contentVersion: number;
  unitId: string;
  stepIndex: number;
  phaseId?: string;
};

export type EvidenceWriteResult<Row> = { record: Row; created: boolean };

/**
 * The programme's reward rules for a newly recorded terminal result
 * (E-SCHEMA-1A; owner decision 2026-10-03). Pure: it receives the attempt,
 * its result and every evidence row of the attempt's programme (the new
 * result included) and returns the awards the result qualifies for. The
 * repository writes them once per programme and source, in the result's own
 * transaction, so a result and its XP commit together; a planner that throws
 * awards nothing and never costs the result.
 */
export type EvidenceAwardPlanner = (context: {
  readonly attempt: ExerciseAttemptRecord;
  readonly result: EvaluationResultRecord;
  readonly evidence: readonly LearnerEvidence[];
}) => readonly PotentialXpAward[];

type ResultWriteOptions = BaseDatabaseOptions & {
  awardXp?: EvidenceAwardPlanner;
};

export type ResultWriteResult = EvidenceWriteResult<EvaluationResultRecord> & {
  awardedTransactions: XpTransaction[];
};

type EvidenceReadOptions = BaseDatabaseOptions & {
  programmeId?: string;
  subjectIds?: readonly string[];
};

function assertProgrammeAuthorized(
  database: ProgressPalDatabase,
  programmeId: string,
) {
  if (!isAuthorizedProgramme(database.migrationContext, programmeId)) {
    throw new Error(
      `Programme "${programmeId}" is not an authorized programme.`,
    );
  }
}

async function assertProgrammeEnrolled(
  database: ProgressPalDatabase,
  programmeId: string,
) {
  if ((await database.programmeEnrolments.get(programmeId)) === undefined) {
    throw new Error(`Programme "${programmeId}" is not enrolled.`);
  }
}

function parseEvidenceRows(rows: unknown[]): LearnerEvidence[] {
  return parseStoredArray(
    rows,
    'Stored learner evidence',
    LearnerEvidenceSchema,
  ) as LearnerEvidence[];
}

async function readSubjectEvidence(
  database: ProgressPalDatabase,
  subjectId: string,
) {
  return parseEvidenceRows(
    await database.learnerEvidence
      .where('subjectId')
      .equals(subjectId)
      .toArray(),
  );
}

function attemptPayload(row: ExerciseAttemptInput | ExerciseAttemptRecord) {
  return canonicalJson({
    programmeId: row.programmeId,
    contentVersion: row.contentVersion,
    subjectId: row.subjectId,
    contentHash: row.contentHash,
    responseMode: row.responseMode,
    answer: row.answer,
    variantId: row.variantId,
  });
}

function resultPayload(
  binding: EvidenceBinding,
  row: Pick<EvaluationResultRecord, 'outcome' | 'matchedFeedbackKey'>,
) {
  return canonicalJson({
    programmeId: binding.programmeId,
    contentVersion: binding.contentVersion,
    subjectId: binding.subjectId,
    contentHash: binding.contentHash,
    outcome: row.outcome,
    matchedFeedbackKey: row.matchedFeedbackKey,
  });
}

function supportPayload(row: SupportEventInput | SupportEventRecord) {
  return canonicalJson({
    programmeId: row.programmeId,
    contentVersion: row.contentVersion,
    subjectId: row.subjectId,
    contentHash: row.contentHash,
    supportKind: row.supportKind,
    hintNumber: row.hintNumber,
  });
}

/** Attempts in the given evidence that have no terminal evaluation result. */
export function findUnresolvedAttempts(
  evidence: readonly LearnerEvidence[],
): ExerciseAttemptRecord[] {
  const resolved = new Set(
    evidence
      .filter((row) => row.kind === 'evaluation_result')
      .map((row) => (row as EvaluationResultRecord).attemptId),
  );

  return evidence.filter(
    (row): row is ExerciseAttemptRecord =>
      row.kind === 'exercise_attempt' && !resolved.has(row.id),
  );
}

/**
 * Runs one logical write: base invariants first (fail closed on an
 * inconsistent database), then the coordinated lease, then the action. One
 * logical write is one lease and announces one revision, however many
 * transactions it commits: the local coordinator marks the writer tab stale
 * after every completed lease, so a second lease before a re-read would be
 * refused.
 */
async function runEvidenceWrite<Result>(
  options: BaseDatabaseOptions,
  action: (
    database: ProgressPalDatabase,
    scope: LogicalWriteScope,
  ) => Promise<Result>,
): Promise<Result> {
  const database = await ensureOpen(resolveDatabase(options.db));
  const scope = createLogicalWriteScope(database);

  try {
    await ensureBaseInitialization({ ...options, db: database }, scope);
    scope.coordinatedWrite.begin();
    return await action(database, scope);
  } finally {
    settleLogicalWriteScope(scope);
  }
}

function assertAnswerPayload(input: ExerciseAttemptInput) {
  const answerIssues = findAnswerPayloadIssues(
    input.responseMode,
    input.answer,
  );

  if (answerIssues.length > 0) {
    throw new Error(
      `Invalid ${input.responseMode} answer: ${answerIssues.join('; ')}`,
    );
  }
}

/** The attempt transaction body (invariants 2, 4, 10). */
async function insertAttempt(
  database: ProgressPalDatabase,
  input: ExerciseAttemptInput,
  recordedAt: string,
): Promise<EvidenceWriteResult<ExerciseAttemptRecord>> {
  assertProgrammeAuthorized(database, input.programmeId);

  return database.transaction(
    'rw',
    database.learnerEvidence,
    database.programmeEnrolments,
    async () => {
      await assertProgrammeEnrolled(database, input.programmeId);

      const stored = await database.learnerEvidence.get(input.id);

      if (stored !== undefined) {
        const [row] = parseEvidenceRows([stored]);

        if (
          row?.kind === 'exercise_attempt' &&
          attemptPayload(row) === attemptPayload(input)
        ) {
          return { record: row, created: false };
        }

        throw new LearnerEvidenceConflictError(
          `Evidence "${input.id}" already exists with a different payload.`,
        );
      }

      const subjectRows = await readSubjectEvidence(database, input.subjectId);
      const [unresolved] = findUnresolvedAttempts(subjectRows);

      if (unresolved !== undefined) {
        throw new UnresolvedAttemptError(input.subjectId, unresolved.id);
      }

      const support = subjectRows.filter(
        (row): row is SupportEventRecord =>
          row.kind === 'support_event' && row.contentHash === input.contentHash,
      );
      // Numbering spans every row the unique [subjectId+attemptNumber] index
      // covers for this subject and never restarts per content version.
      const attemptNumber =
        Math.max(
          0,
          ...subjectRows.flatMap((row) =>
            row.kind === 'exercise_attempt' || row.kind === 'checkpoint_result'
              ? [row.attemptNumber]
              : [],
          ),
        ) + 1;
      const record = parseWithSchema(
        ExerciseAttemptRecordSchema,
        {
          id: input.id,
          kind: 'exercise_attempt',
          programmeId: input.programmeId,
          contentVersion: input.contentVersion,
          subjectId: input.subjectId,
          contentHash: input.contentHash,
          recordedAt,
          attemptNumber,
          responseMode: input.responseMode,
          answer: input.answer,
          hintsUsedMax: Math.max(
            0,
            ...support
              .filter((row) => row.supportKind === 'hint_reveal')
              .map((row) => row.hintNumber ?? 0),
          ),
          teachingReopened: support.some(
            (row) => row.supportKind === 'teaching_reopened',
          ),
          ...(input.variantId === undefined
            ? {}
            : { variantId: input.variantId }),
        },
        'Exercise attempt',
      );

      await database.learnerEvidence.add(record);

      return { record, created: true };
    },
  );
}

/** Awards for a newly recorded result, inside its transaction. */
async function awardForResult(
  database: ProgressPalDatabase,
  attempt: ExerciseAttemptRecord,
  result: EvaluationResultRecord,
  planner: EvidenceAwardPlanner | undefined,
  now: DatabaseClock,
): Promise<XpTransaction[]> {
  if (planner === undefined) {
    return [];
  }

  const evidence = parseEvidenceRows(
    await database.learnerEvidence
      .filter((row) => row.programmeId === attempt.programmeId)
      .toArray(),
  );
  let awards: readonly PotentialXpAward[];

  try {
    awards = planner({ attempt, result, evidence });
  } catch {
    return [];
  }

  const awarded: XpTransaction[] = [];

  for (const award of awards) {
    const transaction = await awardXpOnce(
      database,
      attempt.programmeId,
      award,
      result.recordedAt,
      now,
    );

    if (transaction !== null) {
      awarded.push(transaction);
    }
  }

  return awarded;
}

/** The result transaction body (invariants 4 and 11; E-SCHEMA-1A awards). */
async function insertResult(
  database: ProgressPalDatabase,
  input: EvaluationResultInput,
  recordedAt: string,
  options: { awardXp?: EvidenceAwardPlanner; now: DatabaseClock } = {
    now: defaultClock,
  },
): Promise<ResultWriteResult> {
  return database.transaction(
    'rw',
    [
      database.learnerEvidence,
      database.programmeEnrolments,
      database.xpTransactions,
    ],
    async () => {
      const storedAttempt = await database.learnerEvidence.get(input.attemptId);
      const [attempt] =
        storedAttempt === undefined ? [] : parseEvidenceRows([storedAttempt]);

      if (attempt?.kind !== 'exercise_attempt') {
        throw new Error(
          `Evaluation result "${input.id}" names no exercise attempt ("${input.attemptId}").`,
        );
      }

      assertProgrammeAuthorized(database, attempt.programmeId);
      await assertProgrammeEnrolled(database, attempt.programmeId);

      const binding: EvidenceBinding = {
        programmeId: attempt.programmeId,
        contentVersion: attempt.contentVersion,
        subjectId: attempt.subjectId,
        contentHash: attempt.contentHash,
      };
      const record = parseWithSchema(
        EvaluationResultRecordSchema,
        {
          id: input.id,
          kind: 'evaluation_result',
          ...binding,
          recordedAt,
          attemptId: attempt.id,
          outcome: input.outcome,
          ...(input.matchedFeedbackKey === undefined
            ? {}
            : { matchedFeedbackKey: input.matchedFeedbackKey }),
        },
        'Evaluation result',
      );
      const incoming = resultPayload(binding, record);
      const storedForAttempt = await database.learnerEvidence
        .where('attemptId')
        .equals(attempt.id)
        .first();

      if (storedForAttempt !== undefined) {
        const [existing] = parseEvidenceRows([storedForAttempt]);
        const idIsFree =
          existing?.id === input.id ||
          (await database.learnerEvidence.get(input.id)) === undefined;

        if (
          existing?.kind === 'evaluation_result' &&
          resultPayload(existing, existing) === incoming &&
          idIsFree
        ) {
          return { record: existing, created: false, awardedTransactions: [] };
        }

        throw new LearnerEvidenceConflictError(
          `Attempt "${attempt.id}" already has a different terminal result.`,
        );
      }

      if ((await database.learnerEvidence.get(input.id)) !== undefined) {
        throw new LearnerEvidenceConflictError(
          `Evidence "${input.id}" already exists with a different payload.`,
        );
      }

      await database.learnerEvidence.add(record);

      return {
        record,
        created: true,
        awardedTransactions: await awardForResult(
          database,
          attempt,
          record as EvaluationResultRecord,
          options.awardXp,
          options.now,
        ),
      };
    },
  );
}

/**
 * Persists a submitted answer as an immutable `exercise_attempt` before any
 * evaluation (invariants 2, 4, 5, 7, 10). A replay with the same id and the
 * same submission payload is a no-op returning the stored row; the same id
 * with another payload fails closed. A new submit is refused while the
 * subject has an unresolved attempt. Support accounting comes from the
 * persisted support events at the bound content hash, never from the
 * caller.
 */
export async function submitExerciseAttempt(
  input: ExerciseAttemptInput,
  options: BaseDatabaseOptions = {},
): Promise<EvidenceWriteResult<ExerciseAttemptRecord>> {
  const now = options.now ?? defaultClock;
  assertAnswerPayload(input);

  return runEvidenceWrite(options, async (database, scope) => {
    const written = await insertAttempt(database, input, now());
    scope.changed ||= written.created;
    return written;
  });
}

/**
 * Records the immutable terminal result of one persisted attempt
 * (invariants 4 and 11). The binding is the attempt's own, so a result can
 * never be judged under another binding. Idempotent per attempt: an
 * identical replay returns the stored row even under a new id; a
 * conflicting result fails closed and the stored result stands.
 */
export async function recordEvaluationResult(
  input: EvaluationResultInput,
  options: ResultWriteOptions = {},
): Promise<ResultWriteResult> {
  const now = options.now ?? defaultClock;

  return runEvidenceWrite(options, async (database, scope) => {
    const written = await insertResult(database, input, now(), {
      awardXp: options.awardXp,
      now,
    });
    scope.changed ||= written.created;
    return written;
  });
}

/** What the evaluation stage returns for a committed attempt; `null` keeps it pending. */
export type ProduceEvaluationResult = (
  attempt: ExerciseAttemptRecord,
) => Promise<Omit<EvaluationResultInput, 'attemptId'> | null>;

export type AttemptLifecycleResult = {
  attempt: ExerciseAttemptRecord;
  attemptCreated: boolean;
  result: EvaluationResultRecord | null;
  /** XP the newly recorded result earned in its programme (E-SCHEMA-1A). */
  awardedTransactions: XpTransaction[];
};

/**
 * The two-stage submission lifecycle in one logical write (E-SCHEMA-1 §3
 * invariants 5, 7, 11): the attempt transaction commits first and is durable
 * on its own; only then does the evaluation stage run, outside any
 * transaction, against that persisted attempt; its terminal result commits
 * in a second transaction. If the evaluation stage or the result commit
 * fails, the attempt stays unresolved and is recovered later, never
 * replaced. A replayed submit whose attempt already has a result returns
 * both without evaluating again.
 */
export async function submitAttemptAndRecordResult(
  input: ExerciseAttemptInput,
  produceResult: ProduceEvaluationResult,
  options: ResultWriteOptions = {},
): Promise<AttemptLifecycleResult> {
  const now = options.now ?? defaultClock;
  assertAnswerPayload(input);

  return runEvidenceWrite(options, async (database, scope) => {
    const attempt = await insertAttempt(database, input, now());
    scope.changed ||= attempt.created;

    const existingResult = await database.learnerEvidence
      .where('attemptId')
      .equals(attempt.record.id)
      .first();

    if (existingResult !== undefined) {
      const [result] = parseEvidenceRows([existingResult]);

      return {
        attempt: attempt.record,
        attemptCreated: attempt.created,
        result: result?.kind === 'evaluation_result' ? result : null,
        awardedTransactions: [],
      };
    }

    const produced = await produceResult(attempt.record);

    if (produced === null) {
      return {
        attempt: attempt.record,
        attemptCreated: attempt.created,
        result: null,
        awardedTransactions: [],
      };
    }

    const result = await insertResult(
      database,
      { ...produced, attemptId: attempt.record.id },
      now(),
      { awardXp: options.awardXp, now },
    );
    scope.changed ||= result.created;

    return {
      attempt: attempt.record,
      attemptCreated: attempt.created,
      result: result.record,
      awardedTransactions: result.awardedTransactions,
    };
  });
}

export type AttemptRecoveryStatus = {
  attemptId: string;
  result: EvaluationResultRecord | null;
  awardedTransactions: XpTransaction[];
};

/**
 * Finishes unresolved attempts (invariant 10) in one logical write: for each
 * attempt that still has no terminal result, the evaluation stage runs
 * against that same persisted attempt and its result commits. `null` from
 * the stage leaves the attempt pending (for example while the capability it
 * needs is unavailable). Nothing here creates an attempt.
 */
export async function recordResultsForUnresolvedAttempts(
  attemptIds: readonly string[],
  produceResult: ProduceEvaluationResult,
  options: ResultWriteOptions = {},
): Promise<AttemptRecoveryStatus[]> {
  const now = options.now ?? defaultClock;

  return runEvidenceWrite(options, async (database, scope) => {
    const statuses: AttemptRecoveryStatus[] = [];

    for (const attemptId of attemptIds) {
      const stored = await database.learnerEvidence.get(attemptId);
      const [attempt] = stored === undefined ? [] : parseEvidenceRows([stored]);

      if (attempt?.kind !== 'exercise_attempt') {
        throw new Error(`"${attemptId}" is not an exercise attempt.`);
      }

      const existing = await database.learnerEvidence
        .where('attemptId')
        .equals(attemptId)
        .first();

      if (existing !== undefined) {
        const [result] = parseEvidenceRows([existing]);
        statuses.push({
          attemptId,
          result: result?.kind === 'evaluation_result' ? result : null,
          awardedTransactions: [],
        });
        continue;
      }

      const produced = await produceResult(attempt);

      if (produced === null) {
        statuses.push({ attemptId, result: null, awardedTransactions: [] });
        continue;
      }

      const written = await insertResult(
        database,
        { ...produced, attemptId },
        now(),
        { awardXp: options.awardXp, now },
      );
      scope.changed ||= written.created;
      statuses.push({
        attemptId,
        result: written.record,
        awardedTransactions: written.awardedTransactions,
      });
    }

    return statuses;
  });
}

/**
 * Records a support event (a hint reveal or reopened teaching) before the
 * support is shown (invariant 6). Idempotent by id.
 */
export async function recordSupportEvent(
  input: SupportEventInput,
  options: BaseDatabaseOptions = {},
): Promise<EvidenceWriteResult<SupportEventRecord>> {
  const now = options.now ?? defaultClock;
  const record = parseWithSchema(
    SupportEventRecordSchema,
    {
      id: input.id,
      kind: 'support_event',
      programmeId: input.programmeId,
      contentVersion: input.contentVersion,
      subjectId: input.subjectId,
      contentHash: input.contentHash,
      recordedAt: now(),
      supportKind: input.supportKind,
      ...(input.hintNumber === undefined
        ? {}
        : { hintNumber: input.hintNumber }),
    },
    'Support event',
  );

  return runEvidenceWrite(options, async (database, scope) => {
    assertProgrammeAuthorized(database, input.programmeId);

    return database.transaction(
      'rw',
      database.learnerEvidence,
      database.programmeEnrolments,
      async () => {
        await assertProgrammeEnrolled(database, input.programmeId);

        const stored = await database.learnerEvidence.get(input.id);

        if (stored !== undefined) {
          const [row] = parseEvidenceRows([stored]);

          if (
            row?.kind === 'support_event' &&
            supportPayload(row) === supportPayload(input)
          ) {
            return { record: row, created: false };
          }

          throw new LearnerEvidenceConflictError(
            `Evidence "${input.id}" already exists with a different payload.`,
          );
        }

        await database.learnerEvidence.add(record);
        scope.changed = true;

        return { record, created: true };
      },
    );
  });
}

/** Reads evidence, validating every row; a malformed row fails the read. */
export async function listLearnerEvidence(
  options: EvidenceReadOptions = {},
): Promise<LearnerEvidence[]> {
  const database = await ensureOpen(resolveDatabase(options.db));
  const rows =
    options.subjectIds === undefined
      ? await database.learnerEvidence.toArray()
      : await database.learnerEvidence
          .where('subjectId')
          .anyOf([...options.subjectIds])
          .toArray();
  const evidence = parseEvidenceRows(rows).filter(
    (row) =>
      options.programmeId === undefined ||
      row.programmeId === options.programmeId,
  );

  return sortLearnerEvidence(evidence);
}

export async function listUnresolvedAttempts(
  options: EvidenceReadOptions = {},
): Promise<ExerciseAttemptRecord[]> {
  return findUnresolvedAttempts(await listLearnerEvidence(options));
}

/**
 * Upserts the one mutable bookmark of a lesson item (E-SCHEMA-1 §4). The
 * item must be a materialized catalogue item of the named programme, so the
 * position can always be backed up and restored. An unchanged position is
 * not rewritten.
 */
export async function saveLessonPosition(
  input: LessonPositionInput,
  options: BaseDatabaseOptions = {},
): Promise<LessonPosition> {
  const now = options.now ?? defaultClock;
  const timestamp = now();
  const candidate = parseWithSchema(
    LessonPositionSchema,
    {
      id: deriveLessonPositionId(input.itemId),
      createdAt: timestamp,
      updatedAt: timestamp,
      itemId: input.itemId,
      programmeId: input.programmeId,
      contentVersion: input.contentVersion,
      unitId: input.unitId,
      stepIndex: input.stepIndex,
      ...(input.phaseId === undefined ? {} : { phaseId: input.phaseId }),
    },
    'Lesson position',
  );

  return runEvidenceWrite(options, async (database, scope) => {
    assertProgrammeAuthorized(database, input.programmeId);

    return database.transaction(
      'rw',
      [
        database.lessonPositions,
        database.programmeEnrolments,
        database.courseItems,
        database.courseUnits,
      ],
      async () => {
        await assertProgrammeEnrolled(database, input.programmeId);

        const item = await database.courseItems.get(input.itemId);
        const unit =
          item === undefined
            ? undefined
            : await database.courseUnits.get(item.unitId);
        const owner = database.migrationContext.authorizedCatalogues.find(
          (catalogue) => catalogue.courseId === unit?.courseId,
        );

        if (owner?.programmeId !== input.programmeId) {
          throw new Error(
            `Lesson "${input.itemId}" is not a materialized item of programme "${input.programmeId}".`,
          );
        }

        const storedRow = await database.lessonPositions
          .where('itemId')
          .equals(input.itemId)
          .first();

        if (storedRow === undefined) {
          await database.lessonPositions.add(candidate);
          scope.changed = true;
          return candidate;
        }

        const stored = parseWithSchema(
          LessonPositionSchema,
          storedRow,
          'Stored lesson position',
        );
        const next = parseWithSchema(
          LessonPositionSchema,
          {
            ...candidate,
            id: stored.id,
            createdAt: stored.createdAt,
            updatedAt: timestamp,
          },
          'Lesson position',
        );
        const unchanged =
          canonicalJson({ ...stored, updatedAt: '' }) ===
          canonicalJson({ ...next, updatedAt: '' });

        if (unchanged) {
          return stored;
        }

        await database.lessonPositions.put(next);
        scope.changed = true;
        return next;
      },
    );
  });
}

export async function getLessonPosition(
  itemId: string,
  options: BaseDatabaseOptions = {},
): Promise<LessonPosition | null> {
  const database = await ensureOpen(resolveDatabase(options.db));
  const row = await database.lessonPositions
    .where('itemId')
    .equals(itemId)
    .first();

  return row === undefined
    ? null
    : parseWithSchema(LessonPositionSchema, row, 'Stored lesson position');
}
