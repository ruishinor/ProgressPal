import { cloudCallbackPath } from '@/lib/cloud';
import {
  getRpgResourcePath as buildRpgResourcePath,
  getRpgWeekPath as buildRpgWeekPath,
  rpgActivityPath,
  rpgBadgesPath,
  rpgFocusPath,
  rpgHeroPath,
  rpgLogPath,
  rpgMapPath,
  rpgMicroPath,
  rpgResourcePathPattern,
  rpgRoutePath,
  rpgRouteSegments,
  rpgSettingsPath,
  rpgTrackPathPattern,
  rpgWeekPathPattern,
} from '@/lib/routing/rpgRoutePaths';

export type AppRouteId =
  | 'home'
  | 'profile'
  | 'onboarding'
  | 'dashboard'
  | 'course'
  | 'courseDetail'
  | 'rpg'
  | 'rpgMap'
  | 'rpgWeek'
  | 'rpgResource'
  | 'rpgFocus'
  | 'rpgActivity'
  | 'rpgHero'
  | 'rpgBadges'
  | 'rpgLog'
  | 'rpgSettings'
  | 'rpgMicro'
  | 'rpgTrack'
  | 'sessions'
  | 'achievements'
  | 'insights'
  | 'settings'
  | 'cloudCallback'
  | 'notFound';

type AppRouteDefinition = {
  id: AppRouteId;
  segment: '' | '*' | string;
  to?: `/${string}`;
  label?: string;
  end?: boolean;
  includeInPrimaryNavigation: boolean;
};

type PrimaryNavigationRoute = AppRouteDefinition & {
  label: NonNullable<AppRouteDefinition['label']>;
  to: NonNullable<AppRouteDefinition['to']>;
};

export const routeDefinitions: AppRouteDefinition[] = [
  {
    id: 'home',
    segment: '',
    to: '/',
    includeInPrimaryNavigation: false,
  },
  {
    id: 'profile',
    segment: 'profile',
    to: '/profile',
    label: 'Profile',
    end: true,
    includeInPrimaryNavigation: true,
  },
  {
    id: 'onboarding',
    segment: 'onboarding',
    to: '/onboarding',
    label: 'Setup',
    includeInPrimaryNavigation: false,
  },
  {
    id: 'dashboard',
    segment: 'dashboard',
    to: '/dashboard',
    label: 'Dashboard',
    includeInPrimaryNavigation: true,
  },
  {
    id: 'course',
    segment: 'course',
    to: '/course',
    label: 'Course Map',
    includeInPrimaryNavigation: true,
  },
  {
    id: 'courseDetail',
    segment: 'course/:itemId',
    to: '/course/:itemId',
    includeInPrimaryNavigation: false,
  },
  {
    id: 'rpg',
    segment: rpgRouteSegments.root,
    to: rpgRoutePath,
    label: 'RPG',
    includeInPrimaryNavigation: false,
  },
  {
    id: 'rpgMap',
    segment: rpgRouteSegments.map,
    to: rpgMapPath,
    includeInPrimaryNavigation: false,
  },
  {
    id: 'rpgWeek',
    segment: rpgRouteSegments.week,
    to: rpgWeekPathPattern,
    includeInPrimaryNavigation: false,
  },
  {
    id: 'rpgResource',
    segment: rpgRouteSegments.resource,
    to: rpgResourcePathPattern,
    includeInPrimaryNavigation: false,
  },
  {
    id: 'rpgFocus',
    segment: rpgRouteSegments.focus,
    to: rpgFocusPath,
    includeInPrimaryNavigation: false,
  },
  {
    id: 'rpgActivity',
    segment: rpgRouteSegments.activity,
    to: rpgActivityPath,
    includeInPrimaryNavigation: false,
  },
  {
    id: 'rpgHero',
    segment: rpgRouteSegments.hero,
    to: rpgHeroPath,
    includeInPrimaryNavigation: false,
  },
  {
    id: 'rpgBadges',
    segment: rpgRouteSegments.badges,
    to: rpgBadgesPath,
    includeInPrimaryNavigation: false,
  },
  {
    id: 'rpgLog',
    segment: rpgRouteSegments.log,
    to: rpgLogPath,
    includeInPrimaryNavigation: false,
  },
  {
    id: 'rpgSettings',
    segment: rpgRouteSegments.settings,
    to: rpgSettingsPath,
    includeInPrimaryNavigation: false,
  },
  {
    id: 'rpgMicro',
    segment: rpgRouteSegments.micro,
    to: rpgMicroPath,
    includeInPrimaryNavigation: false,
  },
  {
    id: 'rpgTrack',
    segment: rpgRouteSegments.track,
    to: rpgTrackPathPattern,
    includeInPrimaryNavigation: false,
  },
  {
    id: 'sessions',
    segment: 'sessions',
    to: '/sessions',
    label: 'Sessions',
    includeInPrimaryNavigation: true,
  },
  {
    id: 'achievements',
    segment: 'achievements',
    to: '/achievements',
    label: 'Achievements',
    includeInPrimaryNavigation: true,
  },
  {
    id: 'insights',
    segment: 'insights',
    to: '/insights',
    label: 'Insights',
    includeInPrimaryNavigation: true,
  },
  {
    id: 'settings',
    segment: 'settings',
    to: '/settings',
    label: 'Settings',
    includeInPrimaryNavigation: true,
  },
  {
    // Where the provider's email link lands. The path is the one the account
    // adapter asks the provider to redirect to (`@/lib/cloud`): one source.
    id: 'cloudCallback',
    segment: cloudCallbackPath.slice(1),
    to: cloudCallbackPath,
    includeInPrimaryNavigation: false,
  },
  {
    id: 'notFound',
    segment: '*',
    includeInPrimaryNavigation: false,
  },
];

export const primaryNavigationItems = routeDefinitions.filter(
  (route): route is PrimaryNavigationRoute =>
    route.includeInPrimaryNavigation &&
    route.label !== undefined &&
    route.to !== undefined,
);

export const knownRoutePaths = routeDefinitions
  .filter(
    (
      route,
    ): route is AppRouteDefinition & {
      to: NonNullable<AppRouteDefinition['to']>;
    } => route.id !== 'notFound' && route.to !== undefined,
  )
  .map((route) => route.to);

export function getRouteDefinition(routeId: AppRouteId) {
  const routeDefinition = routeDefinitions.find(
    (route) => route.id === routeId,
  );

  if (!routeDefinition) {
    throw new Error(`Route definition "${routeId}" was not found.`);
  }

  return routeDefinition;
}

export function getCourseItemDetailPath(itemId: string) {
  const detailPath = getRouteDefinition('courseDetail').to;

  if (detailPath === undefined) {
    throw new Error('Course detail path is not configured.');
  }

  return detailPath.replace(':itemId', itemId);
}

export function getRpgWeekPath(unitId: string) {
  const weekPath = getRouteDefinition('rpgWeek').to;

  if (weekPath === undefined) {
    throw new Error('RPG week path is not configured.');
  }

  return buildRpgWeekPath(unitId);
}

export function getRpgResourcePath(itemId: string) {
  const resourcePath = getRouteDefinition('rpgResource').to;

  if (resourcePath === undefined) {
    throw new Error('RPG resource path is not configured.');
  }

  return buildRpgResourcePath(itemId);
}

export function getStudySessionsPath(itemId?: string) {
  const sessionsPath = getRouteDefinition('sessions').to;

  if (sessionsPath === undefined) {
    throw new Error('Study sessions path is not configured.');
  }

  if (itemId === undefined || itemId.trim().length === 0) {
    return sessionsPath;
  }

  return `${sessionsPath}?itemId=${encodeURIComponent(itemId)}`;
}
