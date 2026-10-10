import { createContext, useContext } from 'react';

/**
 * Contextual lesson presentation (owner decision 2026-10-03). Behaviour,
 * data paths, widgets and copy are shared; only the surface classes differ.
 * Classic keeps its simple cards; RPG, the primary experience, builds the
 * lesson and the module checkpoint from the RPG primitives (page header,
 * panels, buttons) and lets shared form controls take the RPG palette
 * through the RPG token bridge (`.lesson--rpg` in `rpg-components.css`).
 */

export type LessonPresentation = 'classic' | 'rpg';

const surfaces = {
  classic: {
    name: 'classic',
    article: 'page-section lesson',
    header: 'lesson-header',
    eyebrow: 'lesson-note',
    lede: undefined,
    section: 'page-section lesson-unit',
    resume: 'card card--accent card--compact lesson-resume',
    exercise: 'card card--default card--compact lesson-exercise',
    result: 'card card--subtle card--compact',
    alert: 'card card--danger card--compact',
    callout: 'card card--subtle card--compact lesson-callout',
    worked: 'card card--subtle card--compact lesson-worked',
    recap: 'card card--accent card--compact lesson-recap',
    primary: 'button button--primary button--md',
    secondary: 'button button--secondary button--md',
    quiet: 'button button--quiet button--md',
    quietSmall: 'button button--quiet button--sm',
    xp: 'badge badge--neutral badge--soft',
  },
  rpg: {
    name: 'rpg',
    article: 'page-section lesson lesson--rpg',
    header: 'lesson-header rpg-page-header',
    eyebrow: 'rpg-page-eyebrow',
    lede: 'rpg-page-lede',
    section: 'rpg-panel rpg-panel--comfortable lesson-unit',
    resume: 'rpg-panel rpg-panel--compact rpg-panel--raised lesson-resume',
    exercise: 'rpg-panel rpg-panel--compact rpg-panel--raised lesson-exercise',
    result: 'rpg-panel rpg-panel--compact',
    alert: 'rpg-panel rpg-panel--compact',
    callout: 'rpg-panel rpg-panel--compact lesson-callout',
    worked: 'rpg-panel rpg-panel--compact lesson-worked',
    recap: 'rpg-panel rpg-panel--compact rpg-panel--raised lesson-recap',
    primary: 'rpg-button rpg-button--primary rpg-button--md',
    secondary: 'rpg-button rpg-button--secondary rpg-button--md',
    quiet: 'rpg-button rpg-button--quiet rpg-button--md',
    quietSmall: 'rpg-button rpg-button--quiet rpg-button--sm',
    xp: 'rpg-status-pill rpg-status-pill--success',
  },
} as const;

export type LessonSurfaces = (typeof surfaces)[LessonPresentation];

export function lessonSurfaces(presentation: LessonPresentation) {
  return surfaces[presentation] as LessonSurfaces;
}

export const LessonSurfaceContext = createContext<LessonSurfaces>(
  surfaces.classic,
);

export function useLessonSurfaces(): LessonSurfaces {
  return useContext(LessonSurfaceContext);
}
