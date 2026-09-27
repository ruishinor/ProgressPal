import { z } from 'zod';

import {
  defaultSliceMinutes,
  achievementCategoryValues,
  backupRecordTypeValues,
  contentAssetTypeValues,
  contentSliceStatusValues,
  courseItemTypeValues,
  learnerAvatarFaceValues,
  learnerAvatarHairValues,
  learnerAvatarTopColorValues,
  courseUnitTypeValues,
  energyRatingMax,
  energyRatingMin,
  mediaStopReasonValues,
  preferredThemeValues,
  progressStatusValues,
  sliceMinuteOptions,
  studyDayValues,
  studySessionModeValues,
} from '@/lib/domain/constants';
import { getDuplicateValues, parseWithSchema } from '@/lib/validation';

const entityIdPattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const isoDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const nonEmptyStringSchema = z.string().trim().min(1);
const entityIdSchema = nonEmptyStringSchema.regex(entityIdPattern, {
  message:
    'Expected a lowercase kebab-case or snake_case identifier containing only letters, numbers, hyphens, or underscores.',
});
const isoDateSchema = z.string().regex(isoDatePattern, {
  message: 'Expected an ISO 8601 date string in YYYY-MM-DD format.',
});
const isoDateTimeSchema = z.string().regex(isoDateTimePattern, {
  message:
    'Expected an ISO 8601 datetime string with seconds and timezone information.',
});
const positiveIntegerSchema = z.number().int().positive();
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const nonNegativeFiniteNumberSchema = z.number().finite().nonnegative();
const finiteNumberSchema = z.number().finite();
const optionalTextSchema = z.string().trim().min(1).max(2000).optional();
const timestampFieldsSchema = z.object({
  id: entityIdSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
const sourceYearSchema = z.number().int().min(2000).max(2100);
const httpUrlTextSchema = nonEmptyStringSchema.refine((value) => {
  try {
    const parsedUrl = new URL(value);

    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}, 'Expected an absolute http(s) URL.');
const genericConfigSchema = z.record(z.string(), z.unknown());
const isSliceMinuteOption = (
  value: number,
): value is (typeof sliceMinuteOptions)[number] =>
  sliceMinuteOptions.includes(value as (typeof sliceMinuteOptions)[number]);

function addDuplicateIssues(
  ctx: z.RefinementCtx,
  path: Array<string | number>,
  duplicates: ReadonlyArray<string | number>,
  label: string,
) {
  for (const duplicate of duplicates) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: `Duplicate ${label} "${duplicate}" is not allowed.`,
    });
  }
}

export const CourseUnitTypeSchema = z.enum(courseUnitTypeValues);
export const CourseItemTypeSchema = z.enum(courseItemTypeValues);
export const ProgressStatusSchema = z.enum(progressStatusValues);
export const ContentAssetTypeSchema = z.enum(contentAssetTypeValues);
export const ContentSliceStatusSchema = z.enum(contentSliceStatusValues);
export const MediaStopReasonSchema = z.enum(mediaStopReasonValues);
export const StudySessionModeSchema = z.enum(studySessionModeValues);
export const PreferredThemeSchema = z.enum(preferredThemeValues);
export const StudyDaySchema = z.enum(studyDayValues);
export const LearnerAvatarFaceSchema = z.enum(learnerAvatarFaceValues);
export const LearnerAvatarHairSchema = z.enum(learnerAvatarHairValues);
export const LearnerAvatarTopColorSchema = z.enum(learnerAvatarTopColorValues);
export const AchievementCategorySchema = z.enum(achievementCategoryValues);
export const BackupRecordTypeSchema = z.enum(backupRecordTypeValues);
export const SliceMinuteSchema = z
  .number()
  .int()
  .refine(isSliceMinuteOption, {
    message: `Expected one of ${sliceMinuteOptions.join(', ')} minutes.`,
  });

export const AppMetaSchema = timestampFieldsSchema
  .extend({
    appVersion: nonEmptyStringSchema,
    onboardingCompletedAt: isoDateTimeSchema.optional(),
    schemaVersion: positiveIntegerSchema,
    seedVersion: nonNegativeIntegerSchema,
  })
  .strict();

export const LearnerAvatarConfigSchema = z
  .object({
    face: LearnerAvatarFaceSchema.optional(),
    hair: LearnerAvatarHairSchema.optional(),
    topColor: LearnerAvatarTopColorSchema.optional(),
  })
  .strict();

export const LearnerProfileSchema = timestampFieldsSchema
  .extend({
    displayName: nonEmptyStringSchema.max(80),
    avatarConfig: LearnerAvatarConfigSchema,
    targetStudyDays: z
      .array(StudyDaySchema)
      .min(1)
      .max(studyDayValues.length)
      .superRefine((days, ctx) => {
        addDuplicateIssues(
          ctx,
          ['targetStudyDays'],
          getDuplicateValues(days),
          'study day',
        );
      }),
    targetMinutesPerWeek: positiveIntegerSchema.max(10_080),
    preferredTheme: PreferredThemeSchema,
    reducedMotion: z.boolean(),
  })
  .strict();

export const CourseUnitSchema = timestampFieldsSchema
  .extend({
    courseId: entityIdSchema,
    title: nonEmptyStringSchema.max(120),
    order: nonNegativeIntegerSchema,
    type: CourseUnitTypeSchema,
    sourceYear: sourceYearSchema,
    required: z.boolean(),
  })
  .strict();

export const CourseItemSchema = timestampFieldsSchema
  .extend({
    unitId: entityIdSchema,
    type: CourseItemTypeSchema,
    title: nonEmptyStringSchema.max(120),
    required: z.boolean(),
    estimatedMinutes: nonNegativeIntegerSchema,
    order: nonNegativeIntegerSchema,
  })
  .strict();

export const ProgressEntrySchema = timestampFieldsSchema
  .extend({
    itemId: entityIdSchema,
    status: ProgressStatusSchema,
    startedAt: isoDateTimeSchema.optional(),
    completedAt: isoDateTimeSchema.optional(),
    confidence: nonNegativeFiniteNumberSchema,
    notes: optionalTextSchema,
    evidenceType: nonEmptyStringSchema.max(80).optional(),
    evidenceText: optionalTextSchema,
  })
  .strict();

export const ContentAssetSchema = timestampFieldsSchema
  .extend({
    itemId: entityIdSchema,
    assetType: ContentAssetTypeSchema,
    title: nonEmptyStringSchema.max(120),
    sourceLabel: nonEmptyStringSchema.max(120),
    sourceUrl: httpUrlTextSchema.optional(),
    estimatedMinutes: nonNegativeIntegerSchema,
    durationSeconds: positiveIntegerSchema.optional(),
    defaultSliceMinutes: SliceMinuteSchema.optional(),
    order: nonNegativeIntegerSchema,
    required: z.boolean(),
  })
  .strict()
  .superRefine((asset, ctx) => {
    if (asset.assetType === 'video' && asset.durationSeconds === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durationSeconds'],
        message: 'Video assets must include a durationSeconds value.',
      });
    }

    if (
      asset.assetType === 'video' &&
      asset.defaultSliceMinutes === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['defaultSliceMinutes'],
        message:
          'Video assets must define a defaultSliceMinutes value from the supported options.',
      });
    }

    if (
      asset.assetType !== 'video' &&
      asset.defaultSliceMinutes !== undefined &&
      !sliceMinuteOptions.includes(asset.defaultSliceMinutes)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['defaultSliceMinutes'],
        message: 'Unsupported defaultSliceMinutes value.',
      });
    }
  });

export const ContentSliceSchema = timestampFieldsSchema
  .extend({
    assetId: entityIdSchema,
    itemId: entityIdSchema,
    order: nonNegativeIntegerSchema,
    label: nonEmptyStringSchema.max(120),
    startSecond: nonNegativeIntegerSchema,
    endSecond: positiveIntegerSchema,
    plannedMinutes: positiveIntegerSchema,
    status: ContentSliceStatusSchema,
    skipReason: optionalTextSchema,
    completedAt: isoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((slice, ctx) => {
    if (slice.endSecond <= slice.startSecond) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endSecond'],
        message: 'endSecond must be greater than startSecond.',
      });
    }

    if (slice.status === 'skipped' && slice.skipReason === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['skipReason'],
        message: 'Skipped slices must include a skipReason.',
      });
    }
  });

export const MediaProgressEventSchema = timestampFieldsSchema
  .extend({
    itemId: entityIdSchema,
    assetId: entityIdSchema,
    sliceId: entityIdSchema.optional(),
    sessionId: entityIdSchema.optional(),
    startSecond: nonNegativeIntegerSchema,
    endSecond: positiveIntegerSchema,
    watchedSeconds: positiveIntegerSchema,
    completedSlice: z.boolean(),
    stoppedBecause: MediaStopReasonSchema,
    energyBefore: z.number().int().min(energyRatingMin).max(energyRatingMax),
    energyAfter: z.number().int().min(energyRatingMin).max(energyRatingMax),
    notes: optionalTextSchema,
  })
  .strict()
  .superRefine((event, ctx) => {
    if (event.endSecond <= event.startSecond) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endSecond'],
        message: 'endSecond must be greater than startSecond.',
      });
    }

    if (event.watchedSeconds > event.endSecond - event.startSecond) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['watchedSeconds'],
        message:
          'watchedSeconds cannot exceed the logged range between startSecond and endSecond.',
      });
    }

    if (event.completedSlice && event.sliceId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sliceId'],
        message: 'completedSlice events must reference a sliceId.',
      });
    }
  });

export const ResumePointSchema = timestampFieldsSchema
  .extend({
    itemId: entityIdSchema,
    assetId: entityIdSchema,
    lastSecond: nonNegativeIntegerSchema,
    nextSliceId: entityIdSchema.optional(),
    updatedFromEventId: entityIdSchema,
  })
  .strict();

export const StudySessionSchema = timestampFieldsSchema
  .extend({
    unitId: entityIdSchema,
    itemId: entityIdSchema,
    startedAt: isoDateTimeSchema,
    endedAt: isoDateTimeSchema,
    durationMinutes: nonNegativeFiniteNumberSchema,
    mode: StudySessionModeSchema,
    notes: optionalTextSchema,
    blockers: z.array(nonEmptyStringSchema.max(200)).max(20).default([]),
  })
  .strict()
  .superRefine((session, ctx) => {
    if (Date.parse(session.endedAt) < Date.parse(session.startedAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endedAt'],
        message: 'endedAt must be the same as or later than startedAt.',
      });
    }
  });

export const XpTransactionSchema = timestampFieldsSchema
  .extend({
    sourceType: nonEmptyStringSchema.max(80),
    sourceId: entityIdSchema,
    xp: positiveIntegerSchema,
    reason: nonEmptyStringSchema.max(160),
    awardedAt: isoDateTimeSchema,
  })
  .strict();

export const AchievementDefinitionSchema = timestampFieldsSchema
  .extend({
    title: nonEmptyStringSchema.max(120),
    description: nonEmptyStringSchema.max(500),
    category: AchievementCategorySchema,
    xpReward: nonNegativeIntegerSchema,
    ruleType: nonEmptyStringSchema.max(80),
    ruleConfig: genericConfigSchema,
  })
  .strict();

export const AchievementUnlockSchema = timestampFieldsSchema
  .extend({
    achievementId: entityIdSchema,
    unlockedAt: isoDateTimeSchema,
    triggerSourceId: entityIdSchema,
  })
  .strict();

export const BackupRecordSchema = timestampFieldsSchema
  .extend({
    type: BackupRecordTypeSchema,
    fileName: nonEmptyStringSchema.max(200),
    notes: optionalTextSchema,
  })
  .strict();

export const CourseSeedItemSchema = z
  .object({
    id: entityIdSchema,
    type: CourseItemTypeSchema,
    title: nonEmptyStringSchema.max(120),
    required: z.boolean(),
    estimatedMinutes: nonNegativeIntegerSchema,
    order: nonNegativeIntegerSchema,
  })
  .strict();

export const CourseSeedUnitSchema = z
  .object({
    id: entityIdSchema,
    order: nonNegativeIntegerSchema,
    title: nonEmptyStringSchema.max(120),
    type: CourseUnitTypeSchema,
    sourceYear: sourceYearSchema,
    required: z.boolean(),
    items: z.array(CourseSeedItemSchema).min(1),
  })
  .strict()
  .superRefine((unit, ctx) => {
    addDuplicateIssues(
      ctx,
      ['items'],
      getDuplicateValues(unit.items.map((item) => item.id)),
      'item id',
    );

    const definedOrders = unit.items
      .map((item) => item.order)
      .filter((order): order is number => order !== undefined);

    addDuplicateIssues(
      ctx,
      ['items'],
      getDuplicateValues(definedOrders),
      'item order',
    );
  });

export const CourseSeedSchema = z
  .object({
    courseId: entityIdSchema,
    title: nonEmptyStringSchema.max(120),
    dataVersion: positiveIntegerSchema,
    sourceCheckedDate: isoDateSchema,
    units: z.array(CourseSeedUnitSchema).min(1),
  })
  .strict()
  .superRefine((course, ctx) => {
    addDuplicateIssues(
      ctx,
      ['units'],
      getDuplicateValues(course.units.map((unit) => unit.id)),
      'unit id',
    );
    addDuplicateIssues(
      ctx,
      ['units'],
      getDuplicateValues(course.units.map((unit) => unit.order)),
      'unit order',
    );

    addDuplicateIssues(
      ctx,
      ['units'],
      getDuplicateValues(
        course.units.flatMap((unit) => unit.items.map((item) => item.id)),
      ),
      'course item id',
    );

    if (
      !course.units.some((unit) =>
        unit.items.some((item) => item.required === true),
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['units'],
        message: 'Course seed must contain at least one required item.',
      });
    }
  });

export function parseCourseSeed(input: unknown) {
  return parseWithSchema(CourseSeedSchema, input, 'Course seed');
}

export const domainDefaults = {
  defaultSliceMinutes,
  energyRatingMin,
  energyRatingMax,
  supportedSliceMinuteOptions: sliceMinuteOptions,
} as const;

export const domainScalarSchemas = {
  entityId: entityIdSchema,
  isoDate: isoDateSchema,
  isoDateTime: isoDateTimeSchema,
  finiteNumber: finiteNumberSchema,
  nonNegativeFiniteNumber: nonNegativeFiniteNumberSchema,
  nonNegativeInteger: nonNegativeIntegerSchema,
  positiveInteger: positiveIntegerSchema,
} as const;
