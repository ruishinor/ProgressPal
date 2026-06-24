import { AchievementsSurface } from '@/features/achievements/components/AchievementsSurface';

// The classic Achievements route renders the shared achievements surface. The
// surface holds the read-only definitions + persisted-unlock view; this route
// only selects the classic shell variant.
export function AchievementsPage() {
  return <AchievementsSurface variant="classic" />;
}
