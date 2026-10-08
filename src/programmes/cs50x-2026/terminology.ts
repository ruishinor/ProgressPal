import type { ProgrammeTerminology } from '../definition';

/**
 * CS50 terminology (Epic C / C4): the programme's rendered copy, the unit noun
 * "week", the RPG identity tuple and the campaign-map ordinal of every
 * catalogue unit. The wording is unchanged from the pre-C4 components. The
 * brand "ProgressPal CS50 Edition" is not here (OD-6).
 */
export const cs50Terminology: ProgrammeTerminology = {
  unitNoun: { lowercase: 'week', capitalized: 'Week' },
  rpgIdentity: {
    guildLabel: 'Code Knights',
    classLabel: 'Generalist',
    pathLabel: 'CS Foundations',
  },
  unitMapOrdinals: {
    'week-0': '0',
    'week-1': '1',
    'week-2': '2',
    'week-3': '3',
    'week-4': '4',
    'week-5': '5',
    'week-6': '6',
    'week-7': '7',
    'artificial-intelligence': '+',
    'week-8': '8',
    'week-9': '9',
    'week-10': '10',
    'additional-practice': '+',
    'final-project': '◆',
  },
  copy: {
    startupLoadingSummary:
      'Preparing local profile data and the bundled CS50 catalog.',
    shellActiveSummary:
      'Local-first CS50 tracking is active. Course progress, study sessions, XP, achievements, insights, and offline support all run on this device. Backups are manual.',
    profileDescription:
      'Your local CS50 profile is the starting point for ProgressPal. It keeps your study target, theme preference, reduced-motion preference, and learning identity on this device.',
    dashboardDescription:
      'Your CS50 progress on this device. Nothing is synced; backups are manual.',
    dashboardErrorDescription:
      'This page shows your CS50 progress on this device.',
    courseMapEyebrow: 'CS50 course map',
    courseMapLoadingDescription:
      'The app is opening the CS50 course list and your saved progress.',
    courseMapErrorDescription:
      'This page uses the built-in CS50 course list and your saved progress.',
    catalogueDescription:
      'The CS50x 2026 course list is built in and ready to track.',
    insightsDescription:
      "Your CS50 study activity over time. Saved sessions, watched video, and earned XP appear here. Days and weeks use this device's local time.",
    insightsErrorDescription: 'This page shows your CS50 study activity.',
    rpgRequiredCompleteNote:
      'All required tasks are marked complete locally. This does not confirm official CS50 completion.',
    rpgHeroProgressNote:
      'Local ProgressPal progress, not official CS50 completion.',
    rpgCourseBoundary:
      'RPG ranks, badges, and profile summaries are local ProgressPal interpretations, not CS50, Harvard, edX, or OpenCourseWare status. Use official course systems for enrollment, submission, grading, and certificates.',
    officialResourceOpenLabel: 'Open official CS50x resource',
    officialResourceReviewLabel: 'Review official CS50x resource',
    sharedMilestoneRewardNote: 'shared with README + demo',
  },
};
