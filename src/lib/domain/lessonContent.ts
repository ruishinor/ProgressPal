import { z } from 'zod';

import {
  canonicalJson,
  exerciseResponseModeValues,
} from '@/lib/domain/learnerEvidence';
// Importing @/lib/validation applies its jitless Zod configuration before the
// schemas below are created (app CSP: no dynamic code).
import { formatZodIssues } from '@/lib/validation';

/**
 * Programme lesson content (Epic E, prompt §3 items 4–5). A programme that
 * delivers authored lessons exposes an asynchronous content provider; the
 * definition and catalogue stay lightweight. The provider returns, per
 * lesson, the validated content, exercise definitions, hints, feedback and
 * evaluator specifications as one bundle identified by the content version,
 * the source SHA-256 and per-exercise content hashes, and it fails closed
 * with a typed state. It is not a CMS and holds no learner data.
 *
 * Exercise and block objects keep the authored field names of the source
 * export, so the export only filters fields and never rewrites text.
 */

/** The evaluator contract this application implements. */
export const lessonEvaluatorContractVersion = 1;

export const lessonSurfaceValues = [
  'mission',
  'lab',
  'quest',
  'repetition',
  'checkpoint',
  'reinforcement',
] as const;
export const lessonUnitKindValues = [
  'L',
  'P',
  'W',
  'B',
  'Q',
  'R',
  'K',
] as const;
export const evaluatorModeValues = [
  'choice',
  'classify',
  'order',
  'match',
  'assemble',
  'blank-match',
  'output-match',
  'table-match',
  'command-regex',
  'diagnose',
  'paste-regex',
  'test-table',
  'program',
  'self-check',
  'self-report',
] as const;
export const evidenceTrustValues = [
  'deterministic-evaluator',
  'structured-reasoning',
  'self-reported-paste',
  'optional-reflection',
] as const;
export const exerciseRoleValues = [
  'formative',
  'lab',
  'quest',
  'retrieval',
  'checkpoint',
] as const;
export const gatingRoleValues = [
  'critical-gate',
  'required-supporting',
  'developmental',
  'extension',
] as const;

const text = z.string();
const strings = z.array(z.string());
const sourceId = z.string().regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/);
const lowerId = z.string().regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/);
const sha256Hex = z.string().regex(/^[0-9a-f]{64}$/, {
  message: 'Expected a lowercase SHA-256 hex fingerprint.',
});
const languageTag = z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/);

// ------------------------------------------------------------------ blocks

const sessionStep = z
  .object({
    prompt: text,
    cmd: text,
    out: text,
    status: z.number().int().nullable(),
    hidden: z.boolean().optional(),
  })
  .strict();

const blockSchemas = [
  z.object({ t: z.literal('orient'), nb: text }).strict(),
  z.object({ t: z.literal('text'), nb: text }).strict(),
  z.object({ t: z.literal('callout'), kind: text, nb: text }).strict(),
  z
    .object({
      t: z.literal('terminal'),
      session: z.array(sessionStep),
      nb: text,
      source: text.optional(),
    })
    .strict(),
  z
    .object({
      t: z.literal('code'),
      file: text,
      code: text,
      stdin: text,
      stdout: text,
      error: text,
      error_info: z
        .object({
          type: text.nullable(),
          message: text,
          line: z.number().int().nullable(),
          last: text,
        })
        .strict()
        .nullable(),
      nb: text,
    })
    .strict(),
  z
    .object({
      t: z.literal('table'),
      columns: strings,
      rows: z.array(strings),
      nb: text,
    })
    .strict(),
  z.object({ t: z.literal('recap'), can: strings, next: text }).strict(),
  z
    .object({
      t: z.literal('worked'),
      title: text,
      steps: z.array(
        z
          .object({
            say: text,
            code: text.nullable(),
            file: text.nullable(),
            stdout: text,
            error: text,
            session: z.array(sessionStep).optional(),
          })
          .strict(),
      ),
    })
    .strict(),
  z
    .object({
      t: z.literal('doc-terminal'),
      text,
      source: text,
      nb: text,
      unverified: z.literal(true),
    })
    .strict(),
  z
    .object({
      t: z.literal('error'),
      file: text,
      code: text,
      stdin: text,
      terminal: text,
      err_type: text.nullable(),
      err_line: z.number().int().nullable(),
      err_message: text,
      err_last: text,
      nb: text,
    })
    .strict(),
] as const;

// ------------------------------------------------------------------ exercises

const option = z
  .object({
    id: z.string().regex(/^[a-h]$/),
    text,
    correct: z.boolean(),
    feedback: text,
  })
  .strict();
const regexMessage = z.object({ regex: text, message: text }).strict();
const programTest = z
  .object({
    stdin: text,
    visible: z.boolean(),
    expected_transcript: text,
    expected: text,
  })
  .strict();
const programExample = z
  .object({ stdin: text, expected_transcript: text, expected: text })
  .strict();
const compareMode = z.enum(['stdout', 'last_line', 'transcript']);
const coverageRule = z
  .object({
    name: text,
    input_regex: text.nullable(),
    reference_output_regex: text.nullable(),
    message: text,
  })
  .strict();

const exerciseCommon = {
  t: z.literal('exercise'),
  id: sourceId,
  role: z.enum(exerciseRoleValues),
  activity: z.enum(['guided', 'independent']),
  optional: z.boolean(),
  evaluable: z.boolean(),
  evidence_trust: z.enum(evidenceTrustValues),
  evidence_layer: z.enum(['A', 'B', 'C']),
  prompt: text,
  hints: strings,
  feedback: z.object({ correct: text, incorrect: text }).strict(),
  checkpoint_task: z.enum(['c', 'd', 'r', 'x']).nullable(),
  how: text.optional(),
  unit: sourceId,
  required_practice: z.boolean(),
  mastery_gate: z.boolean(),
  skill_ids: z.array(sourceId),
};

const exerciseSchemas = [
  z
    .object({
      ...exerciseCommon,
      type: z.literal('mcq'),
      response_mode: z.literal('mcq'),
      code: text.nullable(),
      code_lang: z.enum(['python', 'text']),
      multi: z.boolean(),
      options: z.array(option).min(2).max(8),
      evaluator: z
        .object({
          mode: z.literal('choice'),
          correct: z.array(z.string().regex(/^[a-h]$/)).min(1),
          shuffle: z.boolean(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...exerciseCommon,
      type: z.literal('sort'),
      response_mode: z.literal('sort'),
      kind: z.enum(['classify', 'match', 'order']),
      categories: strings.nullable(),
      items: z.array(z.array(text).min(1).max(2)).min(2),
      items_feedback: strings,
      distractors: strings,
      evaluator: z.discriminatedUnion('mode', [
        z
          .object({
            mode: z.literal('classify'),
            expected: z.array(z.tuple([text, text])),
          })
          .strict(),
        z
          .object({
            mode: z.literal('order'),
            expected: strings,
            keyboard_alternative: text,
          })
          .strict(),
        z
          .object({
            mode: z.literal('match'),
            pairs: z.array(z.tuple([text, text])),
            distractors: strings,
          })
          .strict(),
      ]),
    })
    .strict(),
  z
    .object({
      ...exerciseCommon,
      type: z.literal('assemble'),
      response_mode: z.literal('assemble'),
      slots: z
        .array(
          z.object({ label: text, options: z.array(option).min(2) }).strict(),
        )
        .min(1),
      evaluator: z
        .object({
          mode: z.literal('assemble'),
          expected: z.array(z.tuple([text, z.string().regex(/^[a-h]$/)])),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...exerciseCommon,
      type: z.literal('fill'),
      response_mode: z.literal('fill'),
      template: text,
      file: text,
      stdin: text,
      expected_output: text,
      blanks: z.array(strings.min(1)).min(1),
      evaluator: z
        .object({
          mode: z.literal('blank-match'),
          blanks: z.array(strings.min(1)).min(1),
          expected_output: text,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...exerciseCommon,
      type: z.literal('predict'),
      response_mode: z.literal('predict'),
      code: text,
      file: text,
      stdin: text,
      expected_lines: strings.min(1),
      traps: z.array(z.object({ answer: text, feedback: text }).strict()),
      explain_output: text,
      evaluator: z
        .object({
          mode: z.literal('output-match'),
          expected: strings.min(1),
          normalize: z.literal('trim-trailing-space-and-blank-edge-lines'),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...exerciseCommon,
      type: z.literal('trace'),
      response_mode: z.literal('trace'),
      code: text,
      vars: strings.min(1),
      table: z.array(strings).min(1),
      evaluator: z
        .object({
          mode: z.literal('table-match'),
          columns: strings,
          expected: z.array(strings).min(1),
          blank_marker: text,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...exerciseCommon,
      type: z.literal('cmd'),
      response_mode: z.literal('cmd'),
      context: text,
      layout: z.null(),
      canonical: text,
      effect: text.nullable(),
      evaluator: z
        .object({
          mode: z.literal('command-regex'),
          accept: text,
          flags: z.literal('i'),
          near_misses: z.array(z.tuple([text, text])),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...exerciseCommon,
      type: z.literal('diagnose'),
      response_mode: z.literal('diagnose'),
      code: text,
      file: text,
      stdin: text,
      terminal: text,
      err: z
        .object({ type: text, line: z.number().int(), message: text })
        .strict(),
      type_options: strings.min(2),
      cause_options: z.array(option).min(2),
      fix: z.object({ code: text, output: text }).strict().nullable(),
      evaluator: z
        .object({
          mode: z.literal('diagnose'),
          expected: z
            .object({
              type: text,
              line: z.number().int(),
              cause: z.string().regex(/^[a-h]$/),
            })
            .strict(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...exerciseCommon,
      type: z.literal('program'),
      response_mode: z.literal('program'),
      file: text,
      starter: text,
      reads_input: z.boolean(),
      compare: compareMode,
      broken_run: z
        .object({ stdin: text, terminal: text, failed: z.boolean() })
        .strict()
        .nullable()
        .optional(),
      structure: z.array(regexMessage),
      forbid: z.array(regexMessage),
      examples: z.array(programExample),
      evaluator: z
        .object({
          mode: z.literal('program'),
          compare: compareMode,
          timeout_s: z.number().positive(),
          tests: z.array(programTest).min(1),
          structure_checks: z.array(regexMessage),
          forbidden_patterns: z.array(regexMessage),
          failure_signatures: z.array(
            z.object({ signature: strings, feedback: text }).strict(),
          ),
          unseen_policy: text,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...exerciseCommon,
      type: z.literal('testtable'),
      response_mode: z.literal('testtable'),
      fields: strings.min(1),
      min_rows: z.number().int().positive(),
      coverage: z.array(coverageRule),
      reference: text,
      file: text,
      compare: compareMode,
      evaluator: z
        .object({
          mode: z.literal('test-table'),
          compare: compareMode,
          numeric_values_compared_as_numbers: z.boolean(),
          reference_executed: z.boolean(),
          min_rows: z.number().int().positive(),
          coverage: z.array(coverageRule),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...exerciseCommon,
      type: z.literal('evidence'),
      response_mode: z.literal('evidence'),
      evaluator: z
        .object({
          mode: z.literal('paste-regex'),
          pattern: text,
          flags: z.literal('m'),
          diagnostics: z.array(
            z.object({ regex: text, feedback: text }).strict(),
          ),
          privacy: text,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...exerciseCommon,
      type: z.literal('checklist'),
      response_mode: z.literal('checklist'),
      items: strings.min(1),
      evaluator: z
        .object({
          mode: z.literal('self-check'),
          mastery_gate: z.literal(false),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...exerciseCommon,
      type: z.literal('reflect'),
      response_mode: z.literal('reflect'),
      choices: strings.nullable(),
      evaluator: z
        .object({
          mode: z.literal('self-report'),
          mastery_gate: z.literal(false),
        })
        .strict(),
    })
    .strict(),
] as const;

export const LessonExerciseSchema = z.discriminatedUnion('type', [
  ...exerciseSchemas,
]);
export type LessonExercise = z.infer<typeof LessonExerciseSchema>;
export type LessonExerciseOf<Type extends LessonExercise['type']> = Extract<
  LessonExercise,
  { type: Type }
>;

export const LessonBlockSchema = z.union([
  z.discriminatedUnion('t', [...blockSchemas]),
  LessonExerciseSchema,
]);
export type LessonBlock = z.infer<typeof LessonBlockSchema>;
export type LessonTextBlock = Exclude<LessonBlock, LessonExercise>;

export const LessonUnitSchema = z
  .object({
    unit_id: sourceId,
    kind: z.enum(lessonUnitKindValues),
    title_nb: text,
    goal_nb: text,
    optional: z.boolean(),
    mission: sourceId,
    flow: z.array(LessonBlockSchema).min(1),
  })
  .strict();
export type LessonUnit = z.infer<typeof LessonUnitSchema>;

export const LessonModuleContentSchema = z
  .object({
    format: z.literal('progresspal-programme-lessons'),
    formatVersion: z.literal(1),
    programmeId: lowerId,
    moduleId: sourceId,
    contentVersion: z.number().int().positive(),
    evaluatorContractVersion: z.number().int().positive(),
    sourceSha256: sha256Hex,
    units: z.array(LessonUnitSchema).min(1),
  })
  .strict();
export type LessonModuleContent = z.infer<typeof LessonModuleContentSchema>;

// ------------------------------------------------------------------ manifest

const phaseSchema = z
  .object({
    phaseId: sourceId,
    title: text,
    minutes: z.number().int().positive(),
    parts: z
      .array(
        z
          .object({
            unitId: sourceId,
            exercisesFrom: z.number().int().positive().optional(),
            exercisesTo: z.number().int().positive().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const missionSchema = z
  .object({
    missionId: sourceId,
    itemId: lowerId,
    surface: z.enum(lessonSurfaceValues),
    title: text,
    goal: text,
    minutes: z.number().int().nonnegative(),
    optionalMinutes: z.number().int().nonnegative().optional(),
    optional: z.boolean(),
    order: z.number().int().nonnegative(),
    unitIds: z.array(sourceId).min(1),
    phases: z.array(phaseSchema).optional(),
  })
  .strict();

export const ProgrammeContentIndexSchema = z
  .object({
    format: z.literal('progresspal-programme-content'),
    formatVersion: z.literal(1),
    programmeId: lowerId,
    contentVersion: z.number().int().positive(),
    evaluatorContractVersion: z.number().int().positive(),
    language: languageTag,
    technicalLanguage: languageTag,
    source: z
      .object({
        artefact: text,
        schema: text,
        schemaVersion: text,
        sha256: sha256Hex,
        bytes: z.number().int().positive(),
        status: text,
        skillGraphSha256: sha256Hex,
        structureSha256: sha256Hex,
        knownSourceDefects: z.array(
          z
            .object({
              id: text,
              exerciseId: sourceId,
              field: text,
              stopState: text,
            })
            .strict(),
        ),
      })
      .strict(),
    /** Authored or owner-approved checkpoint pass rules (K-4); none exist. */
    checkpointRules: z.array(z.never()),
    /** Authored or owner-approved gate-item retry rule (K-3); none exists. */
    gateRetryRule: z.null(),
    modules: z
      .array(
        z
          .object({
            moduleId: sourceId,
            catalogueUnitId: lowerId,
            title: text,
            order: z.number().int().nonnegative(),
            checkpoint: z
              .object({
                missionId: sourceId.nullable(),
                criticalGateSkillIds: z.array(sourceId),
                tasks: z.array(
                  z
                    .object({
                      key: z.enum(['c', 'd', 'r', 'x']),
                      kind: text,
                      skillIds: z.array(sourceId),
                      gatingLayer: z.enum(['A', 'B', 'C']),
                      gating: z.boolean(),
                    })
                    .strict(),
                ),
              })
              .strict(),
            missions: z.array(missionSchema).min(1),
          })
          .strict(),
      )
      .min(1),
    units: z
      .array(
        z
          .object({
            unitId: sourceId,
            kind: z.enum(lessonUnitKindValues),
            missionId: sourceId,
            moduleId: sourceId,
            optional: z.boolean(),
            teaches: z.array(sourceId),
            practises: z.array(sourceId),
            models: z.array(sourceId),
            retrieves: z.array(sourceId),
          })
          .strict(),
      )
      .min(1),
    skills: z
      .array(
        z
          .object({
            skillId: sourceId,
            gatingRole: z.enum(gatingRoleValues),
            prerequisiteSkillIds: z.array(sourceId),
            introducedInModule: sourceId,
            introducingMissionId: sourceId.nullable(),
            stateTargetModule: text,
            retention: z
              .object({
                target: z.boolean(),
                gate: z.boolean(),
                opportunityUnits: z.array(sourceId),
              })
              .strict(),
            integrationTarget: z.boolean(),
          })
          .strict(),
      )
      .min(1),
    exercises: z
      .array(
        z
          .object({
            exerciseId: sourceId,
            subjectId: lowerId,
            moduleId: sourceId,
            missionId: sourceId,
            unitId: sourceId,
            unitKind: z.enum(lessonUnitKindValues),
            order: z.number().int().nonnegative(),
            responseMode: z.enum(exerciseResponseModeValues),
            evaluatorMode: z.enum(evaluatorModeValues),
            role: z.enum(exerciseRoleValues),
            activity: z.enum(['guided', 'independent']),
            optional: z.boolean(),
            evaluable: z.boolean(),
            requiredPractice: z.boolean(),
            masteryGate: z.boolean(),
            evidenceTrust: z.enum(evidenceTrustValues),
            evidenceLayer: z.enum(['A', 'B', 'C']),
            checkpointTask: z.enum(['c', 'd', 'r', 'x']).nullable(),
            skillIds: z.array(sourceId),
            needsRuntime: z.boolean(),
            hintCount: z.number().int().nonnegative(),
            contentHash: sha256Hex,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type ProgrammeContentIndex = z.infer<typeof ProgrammeContentIndexSchema>;
export type ContentModule = ProgrammeContentIndex['modules'][number];
export type ContentMission = ContentModule['missions'][number];
export type ContentPhase = NonNullable<ContentMission['phases']>[number];
export type ContentUnitMeta = ProgrammeContentIndex['units'][number];
export type ContentSkill = ProgrammeContentIndex['skills'][number];
export type ContentExerciseMeta = ProgrammeContentIndex['exercises'][number];

/** Response modes whose evaluator needs a Python runtime. */
export const runtimeEvaluatorModes: ReadonlySet<string> = new Set([
  'program',
  'test-table',
]);

/** The evaluator mode each response mode is allowed to declare. */
const evaluatorModesByResponseMode: Record<string, readonly string[]> = {
  mcq: ['choice'],
  sort: ['classify', 'order', 'match'],
  assemble: ['assemble'],
  fill: ['blank-match'],
  predict: ['output-match'],
  trace: ['table-match'],
  cmd: ['command-regex'],
  diagnose: ['diagnose'],
  program: ['program'],
  testtable: ['test-table'],
  evidence: ['paste-regex'],
  checklist: ['self-check'],
  reflect: ['self-report'],
};

// ------------------------------------------------------------------ provider

export type ContentLoadFailureStatus =
  | 'unavailable'
  | 'version_mismatch'
  | 'invalid';

export type ContentLoadResult<Value> =
  | { status: 'ready'; value: Value }
  | { status: ContentLoadFailureStatus; reason: string };

export type LessonExerciseEntry = {
  readonly exercise: LessonExercise;
  readonly meta: ContentExerciseMeta;
};

/** One lesson (mission) as the learner meets it, bound to its content identity. */
export type LessonBundle = {
  readonly itemId: string;
  readonly mission: ContentMission;
  readonly moduleId: string;
  readonly moduleTitle: string;
  readonly units: readonly LessonUnit[];
  readonly exercises: readonly LessonExerciseEntry[];
  /** Repetition and checkpoint missions are taken with the lesson closed. */
  readonly closedLesson: boolean;
  readonly contentVersion: number;
  readonly sourceSha256: string;
  readonly language: string;
  readonly technicalLanguage: string;
};

/**
 * The asynchronous content-provider boundary. Synchronous members are
 * identity only; content is always loaded and validated asynchronously.
 */
/** Interface strings of the lesson surface (see {@link LessonUiCopy}). */
export const lessonUiTextKeys = [
  'goalLabel',
  'minutes',
  'optionalSuffix',
  'noPointsSuffix',
  'exerciseHeading',
  'howPrefix',
  'phaseIntro',
  'phaseHeading',
  'phaseMinutes',
  'nextPhase',
  'previousPhase',
  'recapCan',
  'recapNext',
  'output',
  'errorOutput',
  'pythonAnswered',
  'unverifiedTranscript',
  'fileLabel',
  'selectAll',
  'traceInstruction',
  'traceLine',
  'categoryLabel',
  'matchInstruction',
  'orderInstruction',
  'positionLabel',
  'chooseOption',
  'diagnoseIntro',
  'diagnoseType',
  'diagnoseLine',
  'diagnoseCause',
  'programExamples',
  'compareLastLine',
  'compareAll',
  'programToFix',
  'programToChange',
  'programRun',
  'programRunWithInput',
  'cmdHow',
  'predictHowNoInput',
  'predictHowInput',
  'predictHowInputMulti',
  'testtableHow',
  'expectedOutputColumn',
  'addRow',
  'removeRow',
  'answerLabel',
  'submit',
  'saving',
  'hintButton',
  'hintHeading',
  'resultLabel',
  'correct',
  'incorrect',
  'notEvaluable',
  'evaluatorError',
  'recorded',
  'notEvaluableBody',
  'evaluatorErrorBody',
  'recordedBody',
  'retry',
  'gateNoRetry',
  'runtimeUnavailable',
  'selfReported',
  'privacy',
  'incomplete',
  'tooLarge',
  'malformed',
  'readOnly',
  'notSaved',
  'hintNotSaved',
  'unresolvedPending',
  'resumeHeading',
  'resumeReminder',
  'continue',
  'lessonLoading',
  'lessonUnavailable',
  'lessonVersionMismatch',
  'lessonInvalid',
  'checkpointNotice',
  'checkpointRuntimeNotice',
  'closedLessonNotice',
  'alreadyCorrect',
  'remediation',
  'completionDisclaimer',
  'afterSubmitExplanation',
  'revealedTests',
  'copyCode',
  'copied',
  'blankLabel',
  'traceCellLabel',
  'rowLabel',
] as const;

export type LessonUiTextKey = (typeof lessonUiTextKeys)[number];

/**
 * Programme-owned interface copy of the shared lesson surface. The shared
 * feature hard-codes no content language: a programme that delivers lessons
 * supplies its own labels (templates use {name} placeholders).
 */
export type LessonUiCopy = {
  readonly surfaceLabels: Readonly<
    Record<(typeof lessonSurfaceValues)[number], string>
  >;
  readonly unitKindLabels: Readonly<
    Record<(typeof lessonUnitKindValues)[number], string>
  >;
  readonly calloutLabels: Readonly<Record<string, string>>;
  readonly exerciseTypeLabels: Readonly<
    Record<(typeof exerciseResponseModeValues)[number], string>
  >;
  readonly text: Readonly<Record<LessonUiTextKey, string>>;
  /**
   * The programme's own learner-facing wording rules, applied to prose at
   * display time (never to code, terminal or tool text, and never to the
   * stored snapshot). For Programvareutvikling these are the authoring
   * workspace's learner-render rules.
   */
  readonly learnerWording?: ReadonlyArray<{
    readonly pattern: string;
    readonly flags: string;
    readonly replacement: string;
  }>;
};

export type LessonContentProvider = {
  readonly programmeId: string;
  readonly contentVersion: number;
  readonly sourceSha256: string;
  readonly evaluatorContractVersion: number;
  readonly language: string;
  readonly technicalLanguage: string;
  /** Catalogue item IDs (lowercase mission IDs) this provider carries. */
  readonly lessonItemIds: readonly string[];
  /** Lowercase exercise subject IDs; collision-checked across programmes. */
  readonly subjectIds: readonly string[];
  /** The lesson surface's interface copy, in the programme's language. */
  readonly copy?: LessonUiCopy;
  loadIndex(): Promise<ContentLoadResult<ProgrammeContentIndex>>;
  loadLesson(itemId: string): Promise<ContentLoadResult<LessonBundle>>;
};

export type SnapshotLessonContentProviderInput = {
  readonly manifest: unknown;
  /** Module loaders keyed by source module ID (for example `S1-M01`). */
  readonly modules: Readonly<Record<string, () => unknown | Promise<unknown>>>;
  /** The evaluator contract version the application implements. */
  readonly evaluatorContractVersion: number;
  readonly copy?: LessonUiCopy;
  readonly sha256Hex?: (text: string) => Promise<string>;
};

async function webCryptoSha256Hex(textToHash: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(textToHash),
  );

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      repeated.add(value);
    }
    seen.add(value);
  }

  return [...repeated];
}

/** Cross-reference checks a schema cannot express; returns the issues. */
export function findContentIndexIssues(index: ProgrammeContentIndex): string[] {
  const issues: string[] = [];
  const missions = index.modules.flatMap((module) => module.missions);
  const unitIds = new Set(index.units.map((unit) => unit.unitId));
  const skillIds = new Set(index.skills.map((skill) => skill.skillId));
  const missionIds = new Set(missions.map((mission) => mission.missionId));
  const moduleIds = new Set(index.modules.map((module) => module.moduleId));

  for (const [label, values] of [
    ['mission', missions.map((mission) => mission.missionId)],
    ['lesson item', missions.map((mission) => mission.itemId)],
    ['unit', index.units.map((unit) => unit.unitId)],
    ['exercise', index.exercises.map((entry) => entry.exerciseId)],
    ['exercise subject', index.exercises.map((entry) => entry.subjectId)],
    ['skill', index.skills.map((skill) => skill.skillId)],
  ] as const) {
    for (const duplicate of duplicates(values)) {
      issues.push(`duplicate ${label} "${duplicate}"`);
    }
  }

  for (const mission of missions) {
    if (mission.itemId !== mission.missionId.toLowerCase()) {
      issues.push(
        `lesson item "${mission.itemId}" does not match mission "${mission.missionId}"`,
      );
    }
    for (const unitId of [
      ...mission.unitIds,
      ...(mission.phases ?? []).flatMap((phase) =>
        phase.parts.map((part) => part.unitId),
      ),
    ]) {
      if (!unitIds.has(unitId)) {
        issues.push(
          `mission "${mission.missionId}" names unknown unit "${unitId}"`,
        );
      }
    }
  }

  for (const unit of index.units) {
    if (!missionIds.has(unit.missionId) || !moduleIds.has(unit.moduleId)) {
      issues.push(`unit "${unit.unitId}" names an unknown mission or module`);
    }
    for (const skillId of [
      ...unit.teaches,
      ...unit.practises,
      ...unit.models,
      ...unit.retrieves,
    ]) {
      if (!skillIds.has(skillId)) {
        issues.push(`unit "${unit.unitId}" names unknown skill "${skillId}"`);
      }
    }
  }

  for (const entry of index.exercises) {
    if (entry.subjectId !== entry.exerciseId.toLowerCase()) {
      issues.push(
        `exercise "${entry.exerciseId}" has a non-derived subject ID`,
      );
    }
    if (!unitIds.has(entry.unitId) || !missionIds.has(entry.missionId)) {
      issues.push(`exercise "${entry.exerciseId}" is orphaned`);
    }
    for (const skillId of entry.skillIds) {
      if (!skillIds.has(skillId)) {
        issues.push(
          `exercise "${entry.exerciseId}" names unknown skill "${skillId}"`,
        );
      }
    }
    if (
      !evaluatorModesByResponseMode[entry.responseMode]?.includes(
        entry.evaluatorMode,
      )
    ) {
      issues.push(
        `exercise "${entry.exerciseId}" declares an unsupported evaluator "${entry.evaluatorMode}"`,
      );
    }
    if (entry.needsRuntime !== runtimeEvaluatorModes.has(entry.evaluatorMode)) {
      issues.push(`exercise "${entry.exerciseId}" misstates its runtime need`);
    }
  }

  for (const module of index.modules) {
    for (const skillId of [
      ...module.checkpoint.criticalGateSkillIds,
      ...module.checkpoint.tasks.flatMap((task) => task.skillIds),
    ]) {
      if (!skillIds.has(skillId)) {
        issues.push(
          `module "${module.moduleId}" checkpoint names unknown skill "${skillId}"`,
        );
      }
    }
  }

  for (const skill of index.skills) {
    for (const prerequisite of skill.prerequisiteSkillIds) {
      if (!skillIds.has(prerequisite)) {
        issues.push(
          `skill "${skill.skillId}" names unknown prerequisite "${prerequisite}"`,
        );
      }
    }
  }

  return issues;
}

function readString(value: unknown, key: string, fallback: string): string {
  const field = (value as Record<string, unknown> | null)?.[key];
  return typeof field === 'string' ? field : fallback;
}

function readNumber(value: unknown, key: string): number {
  const field = (value as Record<string, unknown> | null)?.[key];
  return typeof field === 'number' ? field : 0;
}

/** Defensive, schema-free extraction for the synchronous identity members. */
function readIdentity(manifest: unknown) {
  const modules = (manifest as { modules?: unknown })?.modules;
  const exercises = (manifest as { exercises?: unknown })?.exercises;
  const lessonItemIds = Array.isArray(modules)
    ? modules.flatMap((module) =>
        Array.isArray((module as { missions?: unknown })?.missions)
          ? (module as { missions: unknown[] }).missions
              .map((mission) => (mission as { itemId?: unknown })?.itemId)
              .filter((itemId): itemId is string => typeof itemId === 'string')
          : [],
      )
    : [];
  const subjectIds = Array.isArray(exercises)
    ? exercises
        .map((entry) => (entry as { subjectId?: unknown })?.subjectId)
        .filter(
          (subjectId): subjectId is string => typeof subjectId === 'string',
        )
    : [];
  const source = (manifest as { source?: unknown })?.source;

  return {
    programmeId: readString(manifest, 'programmeId', ''),
    contentVersion: readNumber(manifest, 'contentVersion'),
    evaluatorContractVersion: readNumber(manifest, 'evaluatorContractVersion'),
    language: readString(manifest, 'language', ''),
    technicalLanguage: readString(manifest, 'technicalLanguage', ''),
    sourceSha256: readString(source, 'sha256', ''),
    lessonItemIds: Object.freeze(lessonItemIds),
    subjectIds: Object.freeze(subjectIds),
  };
}

/**
 * A provider over a committed content snapshot. Validation is lazy and
 * fail-closed: the index is schema- and cross-reference-checked once, and
 * every lesson load re-checks its module's version identity and recomputes
 * each exercise's content hash against the index, so new app code is never
 * combined with stale or tampered content without noticing.
 */
export function createSnapshotLessonContentProvider(
  input: SnapshotLessonContentProviderInput,
): LessonContentProvider {
  const identity = readIdentity(input.manifest);
  const hash = input.sha256Hex ?? webCryptoSha256Hex;
  let indexResult: Promise<ContentLoadResult<ProgrammeContentIndex>> | null =
    null;

  const loadIndex = () => {
    indexResult ??= Promise.resolve().then(
      (): ContentLoadResult<ProgrammeContentIndex> => {
        const parsed = ProgrammeContentIndexSchema.safeParse(input.manifest);

        if (!parsed.success) {
          return {
            status: 'invalid',
            reason: formatZodIssues(parsed.error).slice(0, 5).join('; '),
          };
        }

        if (
          parsed.data.evaluatorContractVersion !==
          input.evaluatorContractVersion
        ) {
          return {
            status: 'version_mismatch',
            reason: `content needs evaluator contract ${parsed.data.evaluatorContractVersion}; this app implements ${input.evaluatorContractVersion}`,
          };
        }

        const issues = findContentIndexIssues(parsed.data);

        return issues.length > 0
          ? { status: 'invalid', reason: issues.slice(0, 5).join('; ') }
          : { status: 'ready', value: parsed.data };
      },
    );

    return indexResult;
  };

  const loadLesson = async (
    itemId: string,
  ): Promise<ContentLoadResult<LessonBundle>> => {
    const index = await loadIndex();

    if (index.status !== 'ready') {
      return index;
    }

    const module = index.value.modules.find((entry) =>
      entry.missions.some((mission) => mission.itemId === itemId),
    );
    const mission = module?.missions.find((entry) => entry.itemId === itemId);
    const loader =
      module === undefined ? undefined : input.modules[module.moduleId];

    if (module === undefined || mission === undefined || loader === undefined) {
      return {
        status: 'unavailable',
        reason: `no lesson content for "${itemId}"`,
      };
    }

    let raw: unknown;

    try {
      raw = await loader();
    } catch {
      return {
        status: 'unavailable',
        reason: `lesson content for "${itemId}" could not be loaded`,
      };
    }

    const parsed = LessonModuleContentSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        status: 'invalid',
        reason: formatZodIssues(parsed.error).slice(0, 5).join('; '),
      };
    }

    const content = parsed.data;

    if (
      content.programmeId !== index.value.programmeId ||
      content.moduleId !== module.moduleId ||
      content.contentVersion !== index.value.contentVersion ||
      content.sourceSha256 !== index.value.source.sha256 ||
      content.evaluatorContractVersion !== input.evaluatorContractVersion
    ) {
      return {
        status: 'version_mismatch',
        reason: `module "${module.moduleId}" does not match the content index identity`,
      };
    }

    const unitsById = new Map(
      content.units.map((unit) => [unit.unit_id, unit]),
    );
    const units: LessonUnit[] = [];

    for (const unitId of mission.unitIds) {
      const unit = unitsById.get(unitId);

      if (unit === undefined || unit.mission !== mission.missionId) {
        return {
          status: 'invalid',
          reason: `mission "${mission.missionId}" names unknown unit "${unitId}"`,
        };
      }
      units.push(unit);
    }

    const metaById = new Map(
      index.value.exercises.map((entry) => [entry.exerciseId, entry]),
    );
    const exercises: LessonExerciseEntry[] = [];

    for (const unit of units) {
      for (const block of unit.flow) {
        if (block.t !== 'exercise') {
          continue;
        }

        const meta = metaById.get(block.id);

        if (
          meta === undefined ||
          meta.unitId !== unit.unit_id ||
          block.unit !== unit.unit_id
        ) {
          return {
            status: 'invalid',
            reason: `exercise "${block.id}" is not in the content index`,
          };
        }

        if ((await hash(canonicalJson(block))) !== meta.contentHash) {
          return {
            status: 'version_mismatch',
            reason: `exercise "${block.id}" does not match its recorded content hash`,
          };
        }

        exercises.push({ exercise: block, meta });
      }
    }

    return {
      status: 'ready',
      value: {
        itemId,
        mission,
        moduleId: module.moduleId,
        moduleTitle: module.title,
        units,
        exercises,
        closedLesson:
          mission.surface === 'repetition' || mission.surface === 'checkpoint',
        contentVersion: index.value.contentVersion,
        sourceSha256: index.value.source.sha256,
        language: index.value.language,
        technicalLanguage: index.value.technicalLanguage,
      },
    };
  };

  return {
    ...identity,
    ...(input.copy === undefined ? {} : { copy: input.copy }),
    loadIndex,
    loadLesson,
  };
}
