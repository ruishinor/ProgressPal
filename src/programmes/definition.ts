import { z } from 'zod';

import {
  CatalogueRulesSchema,
  SubmissionWorkflowSchema,
  XpPolicySchema,
  findCatalogueRuleIssues,
  type CourseSeed,
  type ProgrammePolicy,
} from '@/lib/domain';
import { SchemaValidationError, parseWithSchema } from '@/lib/validation';

/**
 * Programme definition (Epic C / C2, C3). Immutable, compile-time
 * configuration for one registered programme. It holds identity, a reference
 * to the bundled catalogue, core policy that shared engines receive as
 * parameters (C3), and content (external resources and study guides).
 *
 * Identity terms (C0 contract §2): `definitionKey` is a registry key and is
 * never persisted; `catalogueId` is the catalogue identity already persisted
 * on catalogue rows as `courseId`. Neither is the persisted programme
 * ownership identity, which does not exist before C6.
 */

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

export type ProgrammeDefinition = {
  readonly definitionKey: string;
  readonly catalogueId: string;
  readonly title: string;
  /** Reference to the bundled catalogue; it is never copied or migrated here. */
  readonly catalogue: CourseSeed;
  readonly policy: ProgrammePolicy;
  readonly content: {
    readonly externalResources: ProgrammeExternalResources;
    readonly studyGuides: ProgrammeStudyGuides;
  };
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

const definitionSchema = z
  .object({
    definitionKey: nonEmptyString,
    catalogueId: nonEmptyString,
    title: nonEmptyString,
    catalogue: z.custom<CourseSeed>(
      (value) => typeof value === 'object' && value !== null,
    ),
    policy: z
      .object({
        catalogueRules: CatalogueRulesSchema,
        xp: XpPolicySchema,
        workflow: SubmissionWorkflowSchema,
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
 * programme's catalogue rules, that XP milestones name catalogue items, that
 * every link and guide is keyed to a
 * real catalogue unit or item, that every link stays within a declared URL
 * prefix, and that guides embed no URLs (guide authoring rule).
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

  if (issues.length > 0) {
    throw new SchemaValidationError(label, issues);
  }

  return definition;
}
