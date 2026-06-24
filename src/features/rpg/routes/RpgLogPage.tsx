import { InsightsSurface } from '@/features/insights';

// /rpg/log is a visual wrapper over the classic Insights capability. Insights is
// the product concept; "Journey Log" is no longer a competing concept. The
// shared InsightsSurface renders the same read-only insight truth inside the RPG
// shell — there is no separate RPG insights/journey-log engine on this route.
export function RpgLogPage() {
  return <InsightsSurface variant="rpg" />;
}
