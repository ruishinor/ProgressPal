export const courseUnitTypeValues = [
  'week',
  'special',
  'final_project',
] as const;

export const courseItemTypeValues = [
  'lecture',
  'section',
  'shorts',
  'reading',
  'problem_set',
  'lab',
  'practice',
  'project_task',
  'notes',
  'reflection',
] as const;

export const progressStatusValues = [
  'not_started',
  'started',
  'blocked',
  'completed',
  'submitted',
  'accepted',
  'skipped_optional',
] as const;

export const contentAssetTypeValues = [
  'video',
  'shorts_group',
  'reading',
  'problem_set',
  'lab',
  'project_task',
] as const;

export const contentSliceStatusValues = [
  'not_started',
  'active',
  'completed',
  'skipped',
] as const;

export const mediaStopReasonValues = [
  'completed_slice',
  'reached_limit',
  'interruption',
  'confusion',
  'fatigue',
  'time_box_finished',
  'other',
] as const;

export const studySessionModeValues = [
  'watching',
  'coding',
  'debugging',
  'reading',
  'note_review',
  'final_project',
  'reflection',
] as const;

export const preferredThemeValues = ['system', 'light', 'dark'] as const;

export const learnerAvatarFaceValues = ['round', 'oval', 'square'] as const;

export const learnerAvatarHairValues = ['short', 'curly', 'parted'] as const;

export const learnerAvatarTopColorValues = [
  'forest',
  'ocean',
  'clay',
  'amber',
] as const;

export const studyDayValues = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export const achievementCategoryValues = [
  'course_progress',
  'problem_sets',
  'debugging',
  'consistency',
  'recovery',
  'final_project',
  'reflection',
] as const;

export const backupRecordTypeValues = ['export', 'import'] as const;

export const sliceMinuteOptions = [10, 15, 20, 25, 30] as const;

export const defaultSliceMinutes = 20;

export const energyRatingMin = 1;
export const energyRatingMax = 5;
