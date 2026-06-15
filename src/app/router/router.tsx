import { createBrowserRouter } from 'react-router-dom';

import { HomePage } from '@/app/routes/HomePage';
import { NotFoundPage } from '@/app/routes/NotFoundPage';
import { getRouteDefinition } from '@/app/router/routeDefinitions';
import { AppShell } from '@/app/shell/AppShell';
import { AchievementsPage } from '@/features/achievements';
import { ContentDetailPage, CoursePage } from '@/features/course';
import { DashboardPage } from '@/features/dashboard';
import { InsightsPage } from '@/features/insights';
import { OnboardingPage } from '@/features/profile';
import { SessionsPage } from '@/features/sessions';
import { SettingsPage } from '@/features/settings';

const onboardingRoute = getRouteDefinition('onboarding');
const dashboardRoute = getRouteDefinition('dashboard');
const courseRoute = getRouteDefinition('course');
const courseDetailRoute = getRouteDefinition('courseDetail');
const sessionsRoute = getRouteDefinition('sessions');
const achievementsRoute = getRouteDefinition('achievements');
const insightsRoute = getRouteDefinition('insights');
const settingsRoute = getRouteDefinition('settings');
const notFoundRoute = getRouteDefinition('notFound');
const homeRoute = getRouteDefinition('home');

export const router = createBrowserRouter([
  {
    path: homeRoute.to ?? '/',
    element: <AppShell />,
    children: [
      {
        index: true,
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
]);
