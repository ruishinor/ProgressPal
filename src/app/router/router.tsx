import { createBrowserRouter, Navigate } from 'react-router-dom';

import { HomePage } from '@/app/routes/HomePage';
import { NotFoundPage } from '@/app/routes/NotFoundPage';
import { getRouteDefinition } from '@/app/router/routeDefinitions';
import { AppShell } from '@/app/shell/AppShell';
import { RpgRouteShell } from '@/app/shell/RpgRouteShell';
import { AchievementsPage } from '@/features/achievements';
import { ContentDetailPage, CoursePage } from '@/features/course';
import { DashboardPage } from '@/features/dashboard';
import { InsightsPage } from '@/features/insights';
import { OnboardingPage } from '@/features/profile';
import {
  RpgBadgesPage,
  RpgFocusPage,
  RpgHeroPage,
  RpgHomePage,
  RpgLogPage,
  RpgMapPage,
  RpgModulePage,
  RpgResourcePage,
  RpgSettingsPage,
  RpgShell,
} from '@/features/rpg';
import { SessionsPage } from '@/features/sessions';
import { SettingsPage } from '@/features/settings';

const onboardingRoute = getRouteDefinition('onboarding');
const dashboardRoute = getRouteDefinition('dashboard');
const courseRoute = getRouteDefinition('course');
const courseDetailRoute = getRouteDefinition('courseDetail');
const rpgRoute = getRouteDefinition('rpg');
const rpgMapRoute = getRouteDefinition('rpgMap');
const rpgWeekRoute = getRouteDefinition('rpgWeek');
const rpgResourceRoute = getRouteDefinition('rpgResource');
const rpgFocusRoute = getRouteDefinition('rpgFocus');
const rpgHeroRoute = getRouteDefinition('rpgHero');
const rpgBadgesRoute = getRouteDefinition('rpgBadges');
const rpgLogRoute = getRouteDefinition('rpgLog');
const rpgSettingsRoute = getRouteDefinition('rpgSettings');
const sessionsRoute = getRouteDefinition('sessions');
const achievementsRoute = getRouteDefinition('achievements');
const insightsRoute = getRouteDefinition('insights');
const settingsRoute = getRouteDefinition('settings');
const notFoundRoute = getRouteDefinition('notFound');
const homeRoute = getRouteDefinition('home');
const profileRoute = getRouteDefinition('profile');

export const router = createBrowserRouter([
  {
    path: homeRoute.to,
    element: <Navigate replace to="/rpg" />,
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        path: profileRoute.segment,
        element: <HomePage />,
      },
      {
        path: onboardingRoute.segment,
        element: <OnboardingPage />,
      },
      {
        path: dashboardRoute.segment,
        element: <DashboardPage />,
      },
      {
        path: courseRoute.segment,
        element: <CoursePage />,
      },
      {
        path: courseDetailRoute.segment,
        element: <ContentDetailPage />,
      },
      {
        path: sessionsRoute.segment,
        element: <SessionsPage />,
      },
      {
        path: achievementsRoute.segment,
        element: <AchievementsPage />,
      },
      {
        path: insightsRoute.segment,
        element: <InsightsPage />,
      },
      {
        path: settingsRoute.segment,
        element: <SettingsPage />,
      },
      {
        path: notFoundRoute.segment,
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: rpgRoute.segment,
    element: <RpgRouteShell />,
    children: [
      {
        element: <RpgShell />,
        children: [
          {
            index: true,
            element: <RpgHomePage />,
          },
          {
            path: rpgMapRoute.segment,
            element: <RpgMapPage />,
          },
          {
            path: rpgWeekRoute.segment,
            element: <RpgModulePage />,
          },
          {
            path: rpgResourceRoute.segment,
            element: <RpgResourcePage />,
          },
          {
            path: rpgFocusRoute.segment,
            element: <RpgFocusPage />,
          },
          {
            path: rpgHeroRoute.segment,
            element: <RpgHeroPage />,
          },
          {
            path: rpgBadgesRoute.segment,
            element: <RpgBadgesPage />,
          },
          {
            path: rpgLogRoute.segment,
            element: <RpgLogPage />,
          },
          {
            path: rpgSettingsRoute.segment,
            element: <RpgSettingsPage />,
          },
        ],
      },
    ],
  },
]);
