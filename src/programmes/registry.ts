import { sharedAchievementDefinitions } from '@/lib/achievements';
import { listPotentialXpRewardSourceKeys } from '@/lib/domain';
import { SchemaValidationError } from '@/lib/validation';

import { cs50x2026Definition } from './cs50x-2026';
import {
  validateProgrammeDefinition,
  type ProgrammeDefinition,
} from './definition';

/**
 * The programme registry (Epic C / C2, extended in C7): an immutable,
 * validated set of definitions with an explicit default, fail-closed lookup by
 * definition key and by persisted programme ID, and cross-definition identity
 * collision validation. Nothing here is persisted and nothing here says which
 * programme is active: the active programme is the persisted
 * `app_meta.activeProgrammeId`, resolved by the application composition root.
 */

export type ProgrammeRegistry = {
  /** The explicit default/bootstrap programme's persisted identity. */
  readonly defaultProgrammeId: string;
  /** Every registered definition, in construction order (deterministic). */
  readonly definitions: readonly ProgrammeDefinition[];
  getByDefinitionKey(definitionKey: string): ProgrammeDefinition;
  getByProgrammeId(programmeId: string): ProgrammeDefinition;
  getDefault(): ProgrammeDefinition;
};

export type ProgrammeRegistryInput = {
  readonly defaultProgrammeId: string;
  readonly definitions: readonly ProgrammeDefinition[];
};

const registryLabel = 'Programme registry';
const sharedAchievementIds: ReadonlySet<string> = new Set(
  sharedAchievementDefinitions.map((definition) => definition.id),
);

/**
 * Indexes `identity → owning definition keys` for one identity domain and
 * reports every identity owned by more than one definition. Definitions are
 * compared by registry position, so a definition never collides with itself.
 */
function findCollisions(
  definitions: readonly ProgrammeDefinition[],
  label: string,
  identitiesOf: (definition: ProgrammeDefinition) => Iterable<string>,
  describe: (identity: string) => string = (identity) => `"${identity}"`,
): string[] {
  const owners = new Map<string, string[]>();

  for (const definition of definitions) {
    for (const identity of new Set(identitiesOf(definition))) {
      owners.set(identity, [
        ...(owners.get(identity) ?? []),
        definition.definitionKey,
      ]);
    }
  }

  return [...owners.entries()]
    .filter(([, keys]) => keys.length > 1)
    .map(
      ([identity, keys]) =>
        `${label} ${describe(identity)} is owned by more than one definition (${keys
          .map((key) => `"${key}"`)
          .join(', ')})`,
    );
}

function findCrossDefinitionIssues(
  definitions: readonly ProgrammeDefinition[],
): string[] {
  return [
    ...findCollisions(definitions, 'definitionKey', (definition) => [
      definition.definitionKey,
    ]),
    ...findCollisions(definitions, 'programmeId', (definition) => [
      definition.programmeId,
    ]),
    ...findCollisions(definitions, 'catalogue', (definition) => [
      definition.catalogue.courseId,
    ]),
    ...findCollisions(definitions, 'course unit', (definition) =>
      definition.catalogue.units.map((unit) => unit.id),
    ),
    ...findCollisions(definitions, 'course item', (definition) =>
      definition.catalogue.units.flatMap((unit) =>
        unit.items.map((item) => item.id),
      ),
    ),
    // XP dedupe identity is `(sourceType, sourceId)`; this compares every
    // identity the engine can generate for any definition, fixed milestone
    // keys included, so a fixed key in one programme cannot alias a
    // generated key in another.
    ...findCollisions(definitions, 'XP reward source key', (definition) =>
      listPotentialXpRewardSourceKeys(
        definition.catalogue,
        definition.policy.xp,
      ),
    ),
    // Achievements are unlocked globally by `achievementId`. The six shared
    // achievements are intentionally common to every definition; any other
    // ID may belong to one definition only.
    ...findCollisions(definitions, 'achievement', (definition) =>
      definition.policy.achievements
        .map((achievement) => achievement.id)
        .filter((id) => !sharedAchievementIds.has(id)),
    ),
  ];
}

/**
 * Builds a registry, all-or-nothing: every definition is validated and every
 * cross-definition collision is reported before anything is published. Derived
 * long-form asset, slice and resume IDs are deterministic functions of the
 * item ID, so item-ID uniqueness covers them; runtime row IDs (sessions,
 * media events, progress records) are not definition identifiers.
 */
export function createProgrammeRegistry(
  input: ProgrammeRegistryInput,
): ProgrammeRegistry {
  const definitions = [...input.definitions];

  if (definitions.length === 0) {
    throw new SchemaValidationError(registryLabel, [
      'at least one programme definition is required',
    ]);
  }

  for (const definition of definitions) {
    validateProgrammeDefinition(definition);
  }

  const issues = findCrossDefinitionIssues(definitions);

  if (
    !definitions.some(
      (definition) => definition.programmeId === input.defaultProgrammeId,
    )
  ) {
    issues.push(
      `default programme "${input.defaultProgrammeId}" is not registered`,
    );
  }

  if (issues.length > 0) {
    throw new SchemaValidationError(registryLabel, issues);
  }

  const byDefinitionKey = new Map(
    definitions.map((definition) => [definition.definitionKey, definition]),
  );
  const byProgrammeId = new Map(
    definitions.map((definition) => [definition.programmeId, definition]),
  );

  return Object.freeze({
    defaultProgrammeId: input.defaultProgrammeId,
    definitions: Object.freeze(definitions),
    getByDefinitionKey(definitionKey: string) {
      const definition = byDefinitionKey.get(definitionKey);

      if (definition === undefined) {
        throw new Error(
          `Unregistered programme definition key "${definitionKey}"`,
        );
      }

      return definition;
    },
    getByProgrammeId(programmeId: string) {
      const definition = byProgrammeId.get(programmeId);

      if (definition === undefined) {
        throw new Error(`Unregistered programme "${programmeId}"`);
      }

      return definition;
    },
    getDefault() {
      return byProgrammeId.get(input.defaultProgrammeId)!;
    },
  });
}

let productionRegistry: ProgrammeRegistry | null = null;

/**
 * The registry compiled into the app. Production registers exactly one real
 * programme, CS50x, which is also the explicit default/bootstrap programme.
 * It is built through the same validated path as any other registry, on
 * first use, so an invalid registry surfaces as the existing bootstrap error
 * state instead of a blank page; a failed build is retried, never cached.
 */
export function getProgrammeRegistry(): ProgrammeRegistry {
  productionRegistry ??= createProgrammeRegistry({
    defaultProgrammeId: 'cs50x',
    definitions: [cs50x2026Definition],
  });

  return productionRegistry;
}

export function listRegisteredDefinitionKeys(): readonly string[] {
  return getProgrammeRegistry().definitions.map(
    (definition) => definition.definitionKey,
  );
}

/** Returns a registered definition; an unregistered key fails closed. */
export function getProgrammeDefinition(
  definitionKey: string,
): ProgrammeDefinition {
  return getProgrammeRegistry().getByDefinitionKey(definitionKey);
}

/**
 * The explicit default/bootstrap definition (CS50x in production). This is
 * not "the active programme": the active programme is persisted state and
 * reaches runtime code only through the application-state scope. Callers are
 * limited to composition and to the CS50-default compatibility entrypoints.
 */
export function getDefaultProgrammeDefinition(): ProgrammeDefinition {
  return getProgrammeRegistry().getDefault();
}
