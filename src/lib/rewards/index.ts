export {
  rewardNotificationTiming,
  useRewardAnnouncer,
  useRewardNotificationState,
  type AnnounceRewards,
  type RewardNotification,
  type RewardNotificationState,
} from '@/lib/rewards/RewardNotificationContext';
export { RewardNotificationProvider } from '@/lib/rewards/RewardNotificationProvider';
export {
  createLessonAwardPlanner,
  lessonEffortTier,
  planLessonXpAwards,
  solvedTaskXp,
  type LessonAwardContext,
  type LessonAwardPlannerInput,
  type LessonEffortTier,
} from '@/lib/rewards/lessonXp';
export {
  deriveRewardEvents,
  isRewardMutationResult,
  type RewardEvent,
  type RewardMutationResult,
} from '@/lib/rewards/rewardEvents';
