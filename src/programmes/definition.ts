import { z } from 'zod';

import { findAchievementCatalogueIssues } from '@/lib/achievements';
import {
  AchievementDefinitionSchema,
  CatalogueRulesSchema,
  SubmissionWorkflowSchema,
  XpPolicySchema,
  findCatalogueRuleIssues,
  type CourseSeed,
  type ExternalResourceLink,
  type ItemGuide,
  type ProgrammeContent,
  type ProgrammeCopy,
  type ProgrammeExternalResources,
  type ProgrammePolicy,
  type ProgrammeStudyGuides,
  type ProgrammeTerminology,
  type UnitGuide,
} from '@/lib/domain';
import { SchemaValidationError, parseWithSchema } from '@/lib/validation';

/**
 * Programme definition (Epic C / C2–C4). Immutable, compile-time
 * configuration for one registered programme. It holds identity, a reference
 * to the bundled catalogue, core policy that shared engines receive as
 * parameters (C3), and content (external resources, study guides and
 * terminology, C4).
 *
 * Identity terms (C0 contract §2): `definitionKey` is a registry key and is
 * never persisted; `catalogueId` is the catalogue identity already persisted
 * on catalogue rows as `courseId`. Neither is the persisted programme
 * ownership identity, which does not exist before C6.
 */

// The neutral content contracts live in `@/lib/domain` (C7); the definition
// composes them and re-exports the names for the programme layer's consumers.
export type {
  ExternalResourceLink,
  ItemGuide,
  ProgrammeContent,
  ProgrammeCopy,
  ProgrammeExternalResources,
  ProgrammeStudyGuides,
  ProgrammeTerminology,
  UnitGuide,
};

export type ProgrammeDefinition = {
  readonly definitionKey: string;
  readonly catalogueId: string;
  /**
   * Stable persisted programme ownership identity (Epic C / C6, OD-5).
   * Distinct from `definitionKey`/`catalogueId`: it never changes across a
   * catalogue edition and is the identity `catalogue_versions` and
   * `programme_enrolments` rows are keyed by.
   */
  readonly programmeId: string;
  readonly title: string;
  /** Reference to the bundled catalogue; it is never copied or migrated here. */
  readonly catalogue: CourseSeed;
  readonly policy: ProgrammePolicy;
  readonly content: ProgrammeContent;
};

const nonEmptyString = z.string().trim().min(1);
const httpsPrefix = nonEmptyString.regex(/^https:\/\/[^\s]+\/$/, {
  message: 'must be an https URL prefix ending in "/"',
});
const linkSchema = z
  .object({ label: nonEmptyString, url: nonEmptyString })
  .strict();
const guideLines = z.array(nonEmptyString).min(1).optional();
const unitGuideSchema = z
  .object({
    summary: nonEmptyString,
    whatToDo: guideLines,
    doneLooksLike: guideLines,
    reflectionPrompt: nonEmptyString.optional(),
  })
  .strict();
const itemGuideSchema = unitGuideSchema.extend({ checklist: guideLines });

const terminologySchema = z
  .object({
    unitNoun: z
      .object({ lowercase: nonEmptyString, capitalized: nonEmptyString })
      .strict(),
    rpgIdentity: z
      .object({
        guildLabel: nonEmptyString,
        classLabel: nonEmptyString,
        pathLabel: nonEmptyString,
      })
      .strict(),
    unitMapOrdinals: z.record(z.string(), nonEmptyString),
    copy: z
      .object({
        startupLoadingSummary: nonEmptyString,
        shellActiveSummary: nonEmptyString,
        profileDescription: nonEmptyString,
        onboardingTitle: nonEmptyString,
        onboardingDescription: nonEmptyString,
        dashboardDescription: nonEmptyString,
        dashboardErrorDescription: nonEmptyString,
        courseMapEyebrow: nonEmptyString,
        courseMapLoadingDescription: nonEmptyString,
        courseMapErrorDescription: nonEmptyString,
        catalogueDescription: nonEmptyString,
        insightsDescription: nonEmptyString,
        insightsErrorDescription: nonEmptyString,
        rpgRequiredCompleteNote: nonEmptyString,
        rpgHeroProgressNote: nonEmptyString,
        rpgCourseBoundary: nonEmptyString,
        officialResourceOpenLabel: nonEmptyString,
        officialResourceReviewLabel: nonEmptyString,
        sharedMilestoneRewardNote: nonEmptyString,
      })
      .strict(),
  })
  .strict();

const programmeIdPattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const programmeIdSchema = nonEmptyString.regex(programmeIdPattern, {
  message:
    'must be a lowercase kebab-case or snake_case identifier containing only letters, numbers, hyphens, or underscores',
});

const definitionSchema = z
  .object({
    definitionKey: nonEmptyString,
    catalogueId: nonEmptyString,
    programmeId: programmeIdSchema,
    title: nonEmptyString,
    catalogue: z.custom<CourseSeed>(
      (value) => typeof value === 'object' && value !== null,
    ),
    policy: z
      .object({
        catalogueRules: CatalogueRulesSchema,
        xp: XpPolicySchema,
        workflow: SubmissionWorkflowSchema,
        achievements: z.array(AchievementDefinitionSchema).min(1),
      })
      .strict(),
    content: z
      .object({
        externalResources: z
          .object({
            allowedUrlPrefixes: z.array(httpsPrefix).min(1),
            unitLinks: z.record(z.string(), linkSchema),
            itemLinks: z.record(z.string(), linkSchema),
          })
          .strict(),
        studyGuides: z
          .object({
            unitGuides: z.record(z.string(), unitGuideSchema),
            itemGuides: z.record(z.string(), itemGuideSchema),
          })
          .strict(),
        terminology: terminologySchema,
      })
      .strict(),
  })
  .strict();

const URL_IN_TEXT = /https?:\/\//i;

function guideStrings(guide: UnitGuide | ItemGuide): string[] {
  return [
    guide.summary,
    ...(guide.whatToDo ?? []),
    ...(guide.doneLooksLike ?? []),
    ...('checklist' in guide ? (guide.checklist ?? []) : []),
    ...(guide.reflectionPrompt ? [guide.reflectionPrompt] : []),
  ];
}

/**
 * Validates a definition and fails closed. Beyond shape, it checks that the
 * definition matches its catalogue, that the catalogue satisfies the
 * programme's catalogue rules, that XP milestones and achievement rules name
 * catalogue units and items, that the achievement catalogue keeps every shared
 * achievement unchanged, that
 * every link and guide is keyed to a
 * real catalogue unit or item, that every link stays within a declared URL
 * prefix, that guides embed no URLs (guide authoring rule), and that every
 * catalogue unit, and only a catalogue unit, has a map ordinal label.
 */
export function validateProgrammeDefinition(
  definition: ProgrammeDefinition,
): ProgrammeDefinition {
  const label = `Programme definition "${String(definition?.definitionKey)}"`;
  parseWithSchema(definitionSchema, definition, label);

  const { catalogue, content, policy } = definition;
  const unitIds = new Set(catalogue.units.map((unit) => unit.id));
  const itemIds = new Set(
    catalogue.units.flatMap((unit) => unit.items.map((item) => item.id)),
  );
  const { allowedUrlPrefixes, unitLinks, itemLinks } =
    content.externalResources;
  const issues: string[] = [];

  if (catalogue.courseId !== definition.catalogueId) {
    issues.push(
      `catalogueId "${definition.catalogueId}" does not match catalogue courseId "${catalogue.courseId}"`,
    );
  }

  issues.push(...findCatalogueRuleIssues(catalogue, policy.catalogueRules));

  issues.push(...findAchievementCatalogueIssues(policy.achievements));

  for (const achievement of policy.achievements) {
    const {
      unitId,
      itemId: ruleItemId,
      itemIds: ruleItemIds,
    } = achievement.ruleConfig;
    const referencedItems: unknown[] = [
      ...(typeof ruleItemId === 'string' ? [ruleItemId] : []),
      ...(Array.isArray(ruleItemIds) ? ruleItemIds : []),
    ];
    if (typeof unitId === 'string' && !unitIds.has(unitId)) {
      issues.push(
        `achievement "${achievement.id}" unit "${unitId}" is not a catalogue unit`,
      );
    }
    for (const id of referencedItems) {
      if (typeof id !== 'string' || !itemIds.has(id)) {
        issues.push(
          `achievement "${achievement.id}" item "${String(id)}" is not a catalogue item`,
        );
      }
    }
  }

  for (const milestone of policy.xp.itemMilestones) {
    for (const itemId of milestone.itemIds) {
      if (!itemIds.has(itemId)) {
        issues.push(
          `XP milestone "${milestone.sourceId}" item "${itemId}" is not a catalogue item`,
        );
      }
    }
  }

  const checkLinks = (
    kind: 'unit' | 'item',
    links: Readonly<Record<string, ExternalResourceLink>>,
    knownIds: ReadonlySet<string>,
  ) => {
    for (const [id, link] of Object.entries(links)) {
      if (!knownIds.has(id)) {
        issues.push(`${kind} link "${id}" is not a catalogue ${kind}`);
      }
      if (!allowedUrlPrefixes.some((prefix) => link.url.startsWith(prefix))) {
        issues.push(`${kind} link "${id}" URL is outside the allowed prefixes`);
      }
    }
  };
  checkLinks('unit', unitLinks, unitIds);
  checkLinks('item', itemLinks, itemIds);

  const checkGuides = (
    kind: 'unit' | 'item',
    guides: Readonly<Record<string, UnitGuide | ItemGuide>>,
    knownIds: ReadonlySet<string>,
  ) => {
    for (const [id, guide] of Object.entries(guides)) {
      if (!knownIds.has(id)) {
        issues.push(`${kind} guide "${id}" is not a catalogue ${kind}`);
      }
      if (guideStrings(guide).some((text) => URL_IN_TEXT.test(text))) {
        issues.push(`${kind} guide "${id}" embeds a URL`);
      }
    }
  };
  checkGuides('unit', content.studyGuides.unitGuides, unitIds);
  checkGuides('item', content.studyGuides.itemGuides, itemIds);

  const { unitMapOrdinals } = content.terminology;
  for (const unitId of unitIds) {
    if (!Object.hasOwn(unitMapOrdinals, unitId)) {
      issues.push(`catalogue unit "${unitId}" has no map ordinal label`);
    }
  }
  for (const unitId of Object.keys(unitMapOrdinals)) {
    if (!unitIds.has(unitId)) {
      issues.push(`map ordinal "${unitId}" is not a catalogue unit`);
    }
  }

  if (issues.length > 0) {
    throw new SchemaValidationError(label, issues);
  }

  return definition;
}
