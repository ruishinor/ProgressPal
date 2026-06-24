import { SettingsSurface } from '@/features/settings';

// /rpg/settings is a visual wrapper over the classic Settings/data-controls
// capability. The authoritative export / import / reset controls (and their
// destructive-action safeguards) are the classic ones, rendered here inside the
// RPG shell — there is no separate RPG settings engine and no "Open classic
// Settings" hand-off, because the real controls now live on this route.
export function RpgSettingsPage() {
  return <SettingsSurface variant="rpg" />;
}
