import type { CourseStatusVariant } from '@/features/course/model';
import type { CourseLongFormProgress } from '@/features/progress';
import type {
  AchievementCategory,
  CourseItem,
  CourseItemType,
  CourseUnit,
  ProgressStatus,
} from '@/lib/domain';

export type RpgOfficialLink = {
  label: string;
  url: string;
};

export type RpgCourseProgressSummary = {
  completedRequiredItemCount: number;
  completionPercent: number;
  requiredItemCount: number;
};

export type RpgHubIdentity = {
  classLabel: 'Generalist';
  guildLabel: 'Code Knights';
  pathLabel: 'CS Foundations';
  rankLabel: string;
};

export type RpgHubRecentActivity = {
  date: string;
  id: string;
  label: string;
  timestamp: string;
};

export type RpgHubWeeklyProgress = {
  completedRequiredItemCount: number;
  savedProgressCount: number;
  sessionCount: number;
  totalMinutes: number;
  weekEndDate: string;
  weekStartDate: string;
  xpEarned: number;
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
  currentModule: RpgModuleSummary | null;
  identity: RpgHubIdentity;
  learnerName: string;
  recentActivity: RpgHubRecentActivity[];
  studySummary: {
    sessionCount: number;
    totalMinutes: number;
  };
  weeklyProgress: RpgHubWeeklyProgress;
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
  currentModule: RpgModuleSummary | null;
  modules: RpgModuleSummary[];
  requiredItemCount: number;
  unitCount: number;
  weekFour: RpgModuleSummary | null;
};

export type RpgBadgeStatus = 'earned' | 'locked';

export type RpgBadgeSummary = {
  category: AchievementCategory;
  categoryLabel: string;
  description: string;
  earned: boolean;
  earnedAt: string | null;
  id: string;
  order: number;
  requirementText: string;
  status: RpgBadgeStatus;
  statusLabel: 'Earned' | 'Locked';
  title: string;
  triggerSourceId: string | null;
};

export type RpgBadgeGallerySummary = {
  badges: RpgBadgeSummary[];
  earnedBadgeCount: number;
  lockedBadgeCount: number;
  totalBadgeCount: number;
};

export type RpgHeroProfileSummary = {
  badges: {
    earnedBadgeCount: number;
    totalBadgeCount: number;
  };
  courseProgress: RpgCourseProgressSummary;
  hasLocalActivity: boolean;
  identity: RpgHubIdentity;
  learnerName: string;
  recentActivity: RpgHubRecentActivity[];
  studySummary: {
    sessionCount: number;
    totalMinutes: number;
  };
  xpSummary: {
    level: number;
    totalXp: number;
    xpToNextLevel: number;
  };
};

export type RpgStudyResourceSummary = {
  estimatedMinutesLabel: string;
  itemId: string;
  itemType: CourseItemType;
  longFormProgress: CourseLongFormProgress | null;
  officialLink: RpgOfficialLink | null;
  progressStatus: ProgressStatus | 'not_started';
  required: boolean;
  savedProgress: {
    completedAt: string | null;
    confidence: number;
    evidenceText: string | null;
    notes: string | null;
    startedAt: string | null;
    status: ProgressStatus;
    updatedAt: string;
  } | null;
  statusLabel: string;
  statusVariant: CourseStatusVariant;
  title: string;
  typeLabel: string;
  unitId: string;
  unitTitle: string;
};

export type RpgFocusSessionSummary = {
  items: Pick<
    CourseItem,
    | 'estimatedMinutes'
    | 'id'
    | 'order'
    | 'required'
    | 'title'
    | 'type'
    | 'unitId'
  >[];
  requestedItemId: string | null;
  selectedResource: RpgStudyResourceSummary | null;
  units: Pick<
    CourseUnit,
    'courseId' | 'id' | 'order' | 'required' | 'sourceYear' | 'title' | 'type'
  >[];
};

export type RpgJourneyLogActivityType = 'progress' | 'study_session' | 'xp';

export type RpgJourneyLogActivityLink = {
  href: string;
  label: string;
};

export type RpgJourneyLogActivity = {
  contextLabel: string | null;
  date: string;
  detail: string;
  id: string;
  itemId: string | null;
  itemTitle: string | null;
  links: RpgJourneyLogActivityLink[];
  note: string | null;
  timestamp: string;
  title: string;
  type: RpgJourneyLogActivityType;
  typeLabel: string;
  unitId: string | null;
  unitTitle: string | null;
};

export type RpgJourneyLogSummary = {
  activities: RpgJourneyLogActivity[];
  totals: {
    activityCount: number;
    progressCount: number;
    sessionCount: number;
    totalMinutes: number;
    totalXp: number;
    xpTransactionCount: number;
  };
};
