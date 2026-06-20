import type { CourseStatusVariant } from '@/features/course/model';
import type { CourseLongFormProgress } from '@/features/progress';
import type { CourseItemType, ProgressStatus } from '@/lib/domain';

export type RpgOfficialLink = {
  label: string;
  url: string;
};

export type RpgCourseProgressSummary = {
  completedRequiredItemCount: number;
  completionPercent: number;
  requiredItemCount: number;
};

export type RpgQuestSummary = {
  estimatedMinutes: number;
  id: string;
  longFormProgress: CourseLongFormProgress | null;
  officialLink: RpgOfficialLink | null;
  required: boolean;
  status: ProgressStatus | 'not_started';
  statusLabel: string;
  statusVariant: CourseStatusVariant;
  title: string;
  type: CourseItemType;
  typeLabel: string;
  unitId: string;
  unitTitle: string;
};

export type RpgModuleSummary = {
  completedRequiredItemCount: number;
  completionPercent: number;
  estimatedMinutes: number;
  id: string;
  itemCount: number;
  officialLink: RpgOfficialLink | null;
  quests: RpgQuestSummary[];
  requiredItemCount: number;
  statusLabel: string;
  statusVariant: CourseStatusVariant;
  title: string;
  typeLabel: string;
};

export type RpgHubSummary = {
  continueQuest: RpgQuestSummary | null;
  courseProgress: RpgCourseProgressSummary;
  learnerName: string;
  studySummary: {
    sessionCount: number;
    totalMinutes: number;
  };
  weekFour: RpgModuleSummary | null;
  xpSummary: {
    level: number;
    totalXp: number;
    xpToNextLevel: number;
  };
};

export type RpgCourseMapSummary = {
  completedRequiredItemCount: number;
  completionPercent: number;
  modules: RpgModuleSummary[];
  requiredItemCount: number;
  unitCount: number;
  weekFour: RpgModuleSummary | null;
};

export type RpgStudyResourceSummary = {
  estimatedMinutesLabel: string;
  itemId: string;
  longFormProgress: CourseLongFormProgress | null;
  officialLink: RpgOfficialLink | null;
  progressStatus: ProgressStatus | 'not_started';
  required: boolean;
  statusLabel: string;
  statusVariant: CourseStatusVariant;
  title: string;
  typeLabel: string;
  unitId: string;
  unitTitle: string;
};
