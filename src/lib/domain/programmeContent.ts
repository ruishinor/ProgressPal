/**
 * Neutral programme content contracts (Epic C / C4, promoted in C7). These are
 * type shapes only: the values belong to a programme definition
 * (`src/programmes/**`), and the active programme's content reaches runtime
 * code through the runtime `ProgrammeScope`, never through the registry.
 * `ProgrammeDefinition` composes and re-exports these; there is one contract.
 */

import type { LessonContentProvider } from '@/lib/domain/lessonContent';

export type ExternalResourceLink = {
  readonly label: string;
  readonly url: string;
};

export type UnitGuide = {
  summary: string;
  whatToDo?: string[];
  doneLooksLike?: string[];
  reflectionPrompt?: string;
};

export type ItemGuide = {
  summary: string;
  whatToDo?: string[];
  doneLooksLike?: string[];
  checklist?: string[];
  reflectionPrompt?: string;
};

export type ProgrammeExternalResources = {
  /** Every link URL must start with one of these declared prefixes. */
  readonly allowedUrlPrefixes: readonly string[];
  readonly unitLinks: Readonly<Record<string, ExternalResourceLink>>;
  readonly itemLinks: Readonly<Record<string, ExternalResourceLink>>;
};

export type ProgrammeStudyGuides = {
  readonly unitGuides: Readonly<Record<string, UnitGuide>>;
  readonly itemGuides: Readonly<Record<string, ItemGuide>>;
};

/**
 * Programme-owned copy (Epic C / C4): rendered strings whose wording belongs
 * to the programme. Shared UI supplies the surrounding layout and every
 * programme-neutral label.
 */
export type ProgrammeCopy = {
  readonly startupLoadingSummary: string;
  readonly shellActiveSummary: string;
  readonly profileDescription: string;
  readonly onboardingTitle: string;
  readonly onboardingDescription: string;
  readonly dashboardDescription: string;
  readonly dashboardErrorDescription: string;
  readonly courseMapEyebrow: string;
  readonly courseMapLoadingDescription: string;
  readonly courseMapErrorDescription: string;
  readonly catalogueDescription: string;
  readonly insightsDescription: string;
  readonly insightsErrorDescription: string;
  readonly rpgRequiredCompleteNote: string;
  readonly rpgHeroProgressNote: string;
  readonly rpgCourseBoundary: string;
  readonly officialResourceOpenLabel: string;
  readonly officialResourceReviewLabel: string;
  /** Appended in parentheses to a task reward shared by linked milestone items. */
  readonly sharedMilestoneRewardNote: string;
};

/**
 * Programme terminology (Epic C / C4). Canonical vocabulary labels (item,
 * unit and asset types, achievement categories, session modes) and rank
 * labels stay shared in their feature modules.
 */
export type ProgrammeTerminology = {
  /** The curriculum-unit noun used in unit-level copy ("Back to week"). */
  readonly unitNoun: {
    readonly lowercase: string;
    readonly capitalized: string;
  };
  /** The RPG hero identity tuple; the rank label is shared. */
  readonly rpgIdentity: {
    readonly guildLabel: string;
    readonly classLabel: string;
    readonly pathLabel: string;
  };
  /** Campaign-map node ordinal label for every catalogue unit, by unit ID. */
  readonly unitMapOrdinals: Readonly<Record<string, string>>;
  readonly copy: ProgrammeCopy;
  /**
   * The visible shell brand while this programme is active (Epic E, OD-6
   * mechanism). Absent means the shared default brand. The string itself is
   * an owner decision; a programme carries one only once it is decided.
   */
  readonly shellBrand?: string;
};

/** Everything a programme owns that runtime code renders (Epic C / C4). */
export type ProgrammeContent = {
  /**
   * Language identity of the programme's authored content (BCP 47, for
   * example `en` or `nb`). No single global content language is hard-coded;
   * learner evidence and mastery never depend on it (Epic E).
   */
  readonly language?: string;
  readonly externalResources: ProgrammeExternalResources;
  readonly studyGuides: ProgrammeStudyGuides;
  readonly terminology: ProgrammeTerminology;
  /**
   * The asynchronous lesson-content provider of a programme that delivers
   * authored lessons (Epic E). Absent for programmes without lesson content.
   */
  readonly lessons?: LessonContentProvider;
};
