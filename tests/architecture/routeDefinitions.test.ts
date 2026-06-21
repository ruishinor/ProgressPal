import { describe, expect, it } from 'vitest';

import {
  getCourseItemDetailPath,
  getRpgResourcePath,
  getRpgWeekPath,
  getStudySessionsPath,
  knownRoutePaths,
  primaryNavigationItems,
  routeDefinitions,
} from '@/app/router/routeDefinitions';

describe('routeDefinitions', () => {
  it('keeps the baseline routes in a single source of truth', () => {
    expect(knownRoutePaths).toEqual([
      '/',
      '/onboarding',
      '/dashboard',
      '/course',
      '/course/:itemId',
      '/rpg',
      '/rpg/map',
      '/rpg/week/:unitId',
      '/rpg/resource/:itemId',
      '/rpg/focus',
      '/rpg/hero',
      '/rpg/badges',
      '/rpg/log',
      '/rpg/settings',
      '/sessions',
      '/achievements',
      '/insights',
      '/settings',
    ]);
    expect(primaryNavigationItems.map((item) => item.to)).toEqual([
      '/',
      '/dashboard',
      '/course',
      '/sessions',
      '/achievements',
      '/insights',
      '/settings',
    ]);
  });

  it('keeps primary navigation labels aligned with the baseline route set', () => {
    expect(primaryNavigationItems.map((item) => item.label)).toEqual([
      'Profile',
      'Dashboard',
      'Course Map',
      'Sessions',
      'Achievements',
      'Insights',
      'Settings',
    ]);

    const uniqueRouteIds = new Set(routeDefinitions.map((route) => route.id));
    expect(uniqueRouteIds.size).toBe(routeDefinitions.length);
  });

  it('builds a stable content-detail path for one course item', () => {
    expect(getCourseItemDetailPath('week-0-lecture')).toBe(
      '/course/week-0-lecture',
    );
  });

  it('builds stable RPG route paths', () => {
    expect(getRpgWeekPath('week-4')).toBe('/rpg/week/week-4');
    expect(getRpgResourcePath('week-0-lecture')).toBe(
      '/rpg/resource/week-0-lecture',
    );
  });

  it('builds a stable sessions path with optional item prefill', () => {
    expect(getStudySessionsPath()).toBe('/sessions');
    expect(getStudySessionsPath('week-0-lecture')).toBe(
      '/sessions?itemId=week-0-lecture',
    );
  });
});
