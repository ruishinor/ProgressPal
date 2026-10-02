import { z } from 'zod';

import { domainScalarSchemas } from '@/lib/domain/schemas';
// Importing @/lib/validation applies its jitless Zod configuration before the
// schemas below are created (app CSP: no dynamic code).
import { formatZodIssues } from '@/lib/validation';

/**
 * Learner evidence and lesson positions (Epic E, E-SCHEMA-1 §3 and §4). The
 * evidence store is an append-only log of four immutable record kinds; the
 * position store is a mutable bookmark. Store and field names are the
 * accepted contract. Mastery is never stored: it is derived from these rows
 * and the content version's rules.
 */

export const learnerEvidenceKindValues = [
  'exercise_attempt',
  'evaluation_result',
  'support_event',
  'checkpoint_result',
] as const;

/** `correct` and `incorrect` are the only outcomes that can ever count. */
export const evaluationOutcomeValues = [
  'correct',
  'incorrect',
  'not_evaluable',
  'evaluator_error',
  'recorded',
] as const;

/** The 13 authored response modes (Package 21 `04`, DC-09). */
export const exerciseResponseModeValues = [
  'mcq',
  'sort',
  'assemble',
  'fill',
  'predict',
  'trace',
  'cmd',
  'diagnose',
  'program',
  'testtable',
  'evidence',
  'checklist',
  'reflect',
] as const;

export const supportKindValues = ['hint_reveal', 'teaching_reopened'] as const;

export const checkpointCriterionValues = ['c', 'd', 'r', 'x'] as const;
export const checkpointLevelValues = ['NY', 'D', 'S'] as const;

/**
 * Answer ceilings (E-SCHEMA-1 §3, an engineering derivation, not an owner
 * decision). Derived from the longest legitimate authored M01/M02 payloads
 * (pilot.json SHA-256 577cd120…): program source 399 characters (reference,
 * starter or authored failure variant), predicted output 88, pasted output
 * 140, typed command 48, every short structured value well under 100. Each
 * ceiling leaves at least tenfold headroom; at five attempts on every one of
 * the 291 exercises at its ceiling the evidence stays far below the 25 MB
 * backup cap. Input over a ceiling is refused at the input surface and never
 * becomes an attempt.
 */
export const answerBounds = Object.freeze({
  programSourceChars: 10_000,
  freeTextChars: 4_000,
  pastedOutputChars: 4_000,
  commandChars: 500,
  shortValueChars: 200,
  maxStructuredEntries: 50,
  serializedAnswerChars: 16_384,
});

/**
 * Deterministic JSON: object keys sorted, `undefined` members omitted. Used
 * for idempotency comparison of evidence payloads and for the per-exercise
 * content hash, which the content export computes with the same algorithm.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const members = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);

  return `{${members.join(',')}}`;
}

const { entityId, isoDateTime, positiveInteger, nonNegativeInteger } =
  domainScalarSchemas;
const optionIdSchema = z.string().regex(/^[a-h]$/);
const shortValueSchema = z.string().max(answerBounds.shortValueChars);
const entries = <T extends z.ZodType>(schema: T) =>
  z.array(schema).max(answerBounds.maxStructuredEntries);

/** One strict, bounded answer shape per response mode. */
export const exerciseAnswerSchemas = {
  mcq: z.object({ selected: z.array(optionIdSchema).max(8) }).strict(),
  sort: z.union([
    z.object({ categories: entries(shortValueSchema) }).strict(),
    z.object({ order: entries(z.number().int().nonnegative()) }).strict(),
    z.object({ matches: entries(shortValueSchema) }).strict(),
  ]),
  assemble: z.object({ slots: entries(optionIdSchema) }).strict(),
  fill: z.object({ blanks: entries(shortValueSchema) }).strict(),
  predict: z
    .object({ text: z.string().max(answerBounds.freeTextChars) })
    .strict(),
  trace: z.object({ cells: entries(entries(shortValueSchema)) }).strict(),
  cmd: z
    .object({ command: z.string().max(answerBounds.commandChars) })
    .strict(),
  diagnose: z
    .object({
      errorType: z.string().max(80),
      line: z.number().int().min(1).max(100_000),
      cause: optionIdSchema,
    })
    .strict(),
  program: z
    .object({ source: z.string().max(answerBounds.programSourceChars) })
    .strict(),
  testtable: z
    .object({
      rows: entries(
        z
          .object({
            inputs: entries(shortValueSchema),
            expected: shortValueSchema,
          })
          .strict(),
      ),
    })
    .strict(),
  evidence: z
    .object({ text: z.string().max(answerBounds.pastedOutputChars) })
    .strict(),
  checklist: z.object({ checked: entries(z.boolean()) }).strict(),
  reflect: z.union([
    z.object({ text: z.string().max(answerBounds.freeTextChars) }).strict(),
    z.object({ choice: shortValueSchema }).strict(),
  ]),
} as const satisfies Record<
  (typeof exerciseResponseModeValues)[number],
  z.ZodType
>;

export type ExerciseResponseMode = (typeof exerciseResponseModeValues)[number];
export type EvaluationOutcome = (typeof evaluationOutcomeValues)[number];
export type SupportKind = (typeof supportKindValues)[number];
export type ExerciseAnswer = {
  [Mode in ExerciseResponseMode]: z.infer<(typeof exerciseAnswerSchemas)[Mode]>;
}[ExerciseResponseMode];

/**
 * Validates an answer against its response mode and the overall serialized
 * ceiling. Returns the issues; an empty list means the payload is valid.
 */
export function findAnswerPayloadIssues(
  responseMode: ExerciseResponseMode,
  answer: unknown,
): string[] {
  const result = exerciseAnswerSchemas[responseMode].safeParse(answer);

  if (!result.success) {
    return formatZodIssues(result.error);
  }

  if (canonicalJson(answer).length > answerBounds.serializedAnswerChars) {
    return [`answer exceeds ${answerBounds.serializedAnswerChars} characters`];
  }

  return [];
}

const contentHashSchema = z.string().regex(/^[0-9a-f]{64}$/, {
  message: 'Expected a lowercase SHA-256 hex content hash.',
});
const matchedFeedbackKeySchema = z.string().regex(/^[a-z0-9:_-]{1,80}$/, {
  message: 'Expected a bounded matched-feedback key.',
});

const evidenceCommon = {
  id: entityId,
  programmeId: entityId,
  contentVersion: positiveInteger,
  subjectId: entityId,
  contentHash: contentHashSchema,
  recordedAt: isoDateTime,
};

export const ExerciseAttemptRecordSchema = z
  .object({
    ...evidenceCommon,
    kind: z.literal('exercise_attempt'),
    attemptNumber: positiveInteger,
    responseMode: z.enum(exerciseResponseModeValues),
    // Typed here; validated per response mode by the refinement below.
    answer: z.custom<ExerciseAnswer>(() => true),
    hintsUsedMax: nonNegativeInteger,
    teachingReopened: z.boolean(),
    variantId: entityId.optional(),
  })
  .strict()
  .superRefine((attempt, ctx) => {
    for (const issue of findAnswerPayloadIssues(
      attempt.responseMode,
      attempt.answer,
    )) {
      ctx.addIssue({
        code: 'custom',
        path: ['answer'],
        message: `Invalid ${attempt.responseMode} answer: ${issue}`,
      });
    }
  });

export const EvaluationResultRecordSchema = z
  .object({
    ...evidenceCommon,
    kind: z.literal('evaluation_result'),
    attemptId: entityId,
    outcome: z.enum(evaluationOutcomeValues),
    matchedFeedbackKey: matchedFeedbackKeySchema.optional(),
  })
  .strict();

export const SupportEventRecordSchema = z
  .object({
    ...evidenceCommon,
    kind: z.literal('support_event'),
    supportKind: z.enum(supportKindValues),
    hintNumber: positiveInteger.optional(),
  })
  .strict()
  .superRefine((event, ctx) => {
    const isHint = event.supportKind === 'hint_reveal';

    if (isHint !== (event.hintNumber !== undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: ['hintNumber'],
        message: 'hintNumber is required exactly for hint_reveal events.',
      });
    }
  });

export const CheckpointResultRecordSchema = z
  .object({
    ...evidenceCommon,
    kind: z.literal('checkpoint_result'),
    attemptNumber: positiveInteger,
    criteria: z
      .array(
        z
          .object({
            criterion: z.enum(checkpointCriterionValues),
            skillId: entityId,
            level: z.enum(checkpointLevelValues),
          })
          .strict(),
      )
      .min(1)
      .max(answerBounds.maxStructuredEntries),
    passed: z.boolean(),
    ruleId: entityId,
    basisAttemptIds: z
      .array(entityId)
      .min(1)
      .max(answerBounds.maxStructuredEntries),
    variantId: entityId.optional(),
  })
  .strict();

export const LearnerEvidenceSchema = z.discriminatedUnion('kind', [
  ExerciseAttemptRecordSchema,
  EvaluationResultRecordSchema,
  SupportEventRecordSchema,
  CheckpointResultRecordSchema,
]);

export type ExerciseAttemptRecord = z.infer<typeof ExerciseAttemptRecordSchema>;
export type EvaluationResultRecord = z.infer<
  typeof EvaluationResultRecordSchema
>;
export type SupportEventRecord = z.infer<typeof SupportEventRecordSchema>;
export type CheckpointResultRecord = z.infer<
  typeof CheckpointResultRecordSchema
>;
export type LearnerEvidence =
  | ExerciseAttemptRecord
  | EvaluationResultRecord
  | SupportEventRecord
  | CheckpointResultRecord;

/** The mutable lesson bookmark (E-SCHEMA-1 §4). */
export const LessonPositionSchema = z
  .object({
    id: entityId,
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
    itemId: entityId,
    programmeId: entityId,
    contentVersion: positiveInteger,
    unitId: entityId,
    stepIndex: nonNegativeInteger,
    phaseId: entityId.optional(),
  })
  .strict();

export type LessonPosition = z.infer<typeof LessonPositionSchema>;

/** Lesson position IDs are a pure function of the lesson item ID. */
export function deriveLessonPositionId(itemId: string): string {
  return `lesson-position-${itemId}`;
}
