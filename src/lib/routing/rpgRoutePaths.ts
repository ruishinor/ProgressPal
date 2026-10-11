export const rpgRoutePath = '/rpg' as const;
export const rpgMapPath = '/rpg/map' as const;
export const rpgWeekPathPattern = '/rpg/week/:unitId' as const;
export const rpgResourcePathPattern = '/rpg/resource/:itemId' as const;
export const rpgFocusPath = '/rpg/focus' as const;
export const rpgHeroPath = '/rpg/hero' as const;
export const rpgBadgesPath = '/rpg/badges' as const;
export const rpgLogPath = '/rpg/log' as const;
export const rpgSettingsPath = '/rpg/settings' as const;

export const rpgRouteSegments = {
  badges: 'badges',
  focus: 'focus',
  hero: 'hero',
  log: 'log',
  map: 'map',
  resource: 'resource/:itemId',
  root: 'rpg',
  settings: 'settings',
  week: 'week/:unitId',
} as const;

/**
 * A module's page. With a task ID the page opens at that task (route hash),
 * so a deep link and a reload land at the same place.
 */
export function getRpgWeekPath(unitId: string, questId?: string | null) {
  const path = rpgWeekPathPattern.replace(':unitId', unitId);

  return questId ? `${path}#${encodeURIComponent(questId)}` : path;
}

export function getRpgResourcePath(itemId: string) {
  return rpgResourcePathPattern.replace(':itemId', itemId);
}

export function getRpgFocusPath(itemId: string) {
  return `${rpgFocusPath}?itemId=${encodeURIComponent(itemId)}`;
}
