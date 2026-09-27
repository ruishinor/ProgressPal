import { bundledCourseSeed } from '@/seed';

import {
  validateProgrammeDefinition,
  type ProgrammeDefinition,
} from '../definition';
import { cs50ExternalResources } from './externalResources';
import {
  cs50CatalogueRules,
  cs50SubmissionWorkflow,
  cs50XpPolicy,
} from './policy';
import { cs50StudyGuides } from './studyGuides';

/**
 * The CS50x definition. Its definition key equals its catalogue identity
 * `cs50x-2026` for compatibility through C5 (C0 contract §2); that key is not
 * a persisted programme ownership identity. The catalogue is the existing
 * bundled seed, referenced in place. Validated at module load; an invalid
 * definition fails closed.
 */
export const cs50x2026Definition: ProgrammeDefinition =
  validateProgrammeDefinition({
    definitionKey: bundledCourseSeed.courseId,
    catalogueId: bundledCourseSeed.courseId,
    title: bundledCourseSeed.title,
    catalogue: bundledCourseSeed,
    policy: {
      catalogueRules: cs50CatalogueRules,
      xp: cs50XpPolicy,
      workflow: cs50SubmissionWorkflow,
    },
    content: {
      externalResources: cs50ExternalResources,
      studyGuides: cs50StudyGuides,
    },
  });
