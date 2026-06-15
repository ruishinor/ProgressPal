import type { z } from 'zod';

import {
  AchievementCategorySchema,
  AchievementDefinitionSchema,
  AchievementUnlockSchema,
  AppMetaSchema,
  BackupRecordSchema,
  BackupRecordTypeSchema,
  ContentAssetSchema,
  ContentAssetTypeSchema,
  ContentSliceSchema,
  ContentSliceStatusSchema,
  CourseItemSchema,
  CourseItemTypeSchema,
  CourseSeedItemSchema,
  CourseSeedSchema,
  CourseSeedUnitSchema,
  CourseUnitSchema,
  CourseUnitTypeSchema,
  LearnerAvatarConfigSchema,
  LearnerAvatarFaceSchema,
  LearnerAvatarHairSchema,
  LearnerAvatarTopColorSchema,
  LearnerProfileSchema,
  MediaProgressEventSchema,
  MediaStopReasonSchema,
  PreferredThemeSchema,
  ProgressEntrySchema,
  ProgressStatusSchema,
  ResumePointSchema,
  SliceMinuteSchema,
  StudyDaySchema,
  StudySessionModeSchema,
  StudySessionSchema,
  XpTransactionSchema,
} from '@/lib/domain/schemas';

export type CourseUnitType = z.infer<typeof CourseUnitTypeSchema>;
export type CourseItemType = z.infer<typeof CourseItemTypeSchema>;
export type ProgressStatus = z.infer<typeof ProgressStatusSchema>;
export type ContentAssetType = z.infer<typeof ContentAssetTypeSchema>;
export type ContentSliceStatus = z.infer<typeof ContentSliceStatusSchema>;
export type MediaStopReason = z.infer<typeof MediaStopReasonSchema>;
export type StudySessionMode = z.infer<typeof StudySessionModeSchema>;
export type PreferredTheme = z.infer<typeof PreferredThemeSchema>;
export type StudyDay = z.infer<typeof StudyDaySchema>;
export type LearnerAvatarFace = z.infer<typeof LearnerAvatarFaceSchema>;
export type LearnerAvatarHair = z.infer<typeof LearnerAvatarHairSchema>;
export type LearnerAvatarTopColor = z.infer<typeof LearnerAvatarTopColorSchema>;
export type AchievementCategory = z.infer<typeof AchievementCategorySchema>;
export type BackupRecordType = z.infer<typeof BackupRecordTypeSchema>;
export type SliceMinute = z.infer<typeof SliceMinuteSchema>;

export type AppMeta = z.infer<typeof AppMetaSchema>;
export type LearnerAvatarConfig = z.infer<typeof LearnerAvatarConfigSchema>;
export type LearnerProfile = z.infer<typeof LearnerProfileSchema>;
export type CourseUnit = z.infer<typeof CourseUnitSchema>;
export type CourseItem = z.infer<typeof CourseItemSchema>;
export type ProgressEntry = z.infer<typeof ProgressEntrySchema>;
export type ContentAsset = z.infer<typeof ContentAssetSchema>;
export type ContentSlice = z.infer<typeof ContentSliceSchema>;
export type MediaProgressEvent = z.infer<typeof MediaProgressEventSchema>;
export type ResumePoint = z.infer<typeof ResumePointSchema>;
export type StudySession = z.infer<typeof StudySessionSchema>;
export type XpTransaction = z.infer<typeof XpTransactionSchema>;
export type AchievementDefinition = z.infer<typeof AchievementDefinitionSchema>;
export type AchievementUnlock = z.infer<typeof AchievementUnlockSchema>;
export type BackupRecord = z.infer<typeof BackupRecordSchema>;
export type CourseSeedItem = z.infer<typeof CourseSeedItemSchema>;
export type CourseSeedUnit = z.infer<typeof CourseSeedUnitSchema>;
export type CourseSeed = z.infer<typeof CourseSeedSchema>;
