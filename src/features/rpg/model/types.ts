import type { CourseStatusVariant } from '@/features/course/model';
import type { CourseLongFormProgress } from '@/features/progress';
import type {
  AchievementCategory,
  CourseItem,
  CourseItemType,
  CourseUnit,
  LearnerAvatarConfig,
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
  rewardLabel: string;
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

export type RpgQuestRecommendation =
  | {
      state: 'actionable' | 'needs_attention';
      quest: RpgQuestSummary;
      remainingRequiredCount: number;
      optionalRemainingCount: number;
    }
  | {
      state: 'required_complete';
      quest: null;
      remainingRequiredCount: 0;
      optionalRemainingCount: number;
    }
  | {
      state: 'unavailable';
      quest: null;
    };

export type RpgHubSummary = {
  recommendation: RpgQuestRecommendation;
  courseProgress: RpgCourseProgressSummary;
  currentModule: RpgModuleSummary | null;
  identity: RpgHubIdentity;
  learnerAvatarConfig: LearnerAvatarConfig | null;
  learnerName: string;
  recentActivity: RpgHubRecentActivity[];
  studySummary: {
    sessionCount: number;
    totalMinutes: number;
  };
  weeklyProgress: RpgHubWeeklyProgress;
  weekFour: RpgModuleSummary | null;
  xpSummary: {
    currentLevelXp: number;
    currentLevelTargetXp: number;
    levelProgressLabel: string;
    level: number;
    levelProgressPercent: number;
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
  learnerAvatarConfig: LearnerAvatarConfig | null;
  learnerName: string;
  recentActivity: RpgHubRecentActivity[];
  studySummary: {
    sessionCount: number;
    totalMinutes: number;
  };
  xpSummary: {
    currentLevelXp: number;
    currentLevelTargetXp: number;
    levelProgressLabel: string;
    level: number;
    levelProgressPercent: number;
    totalXp: number;
    xpToNextLevel: number;
  };
};

export type RpgStudyResourceSummary = {
  rewardLabel: string;
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
