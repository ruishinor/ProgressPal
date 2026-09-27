import { cs50x2026Definition } from './cs50x-2026';
import type { ProgrammeDefinition } from './definition';

/**
 * The definitions compiled into the app. Epic C registers exactly one
 * production definition; a second one needs the cross-definition collision
 * validation that C7 adds. Nothing here is persisted: there is no stored
 * active key, enrolment or switching state (C6/C7).
 */
const registeredDefinitions: ReadonlyMap<string, ProgrammeDefinition> = new Map(
  [[cs50x2026Definition.definitionKey, cs50x2026Definition]],
);

export function listRegisteredDefinitionKeys(): readonly string[] {
  return [...registeredDefinitions.keys()];
}

/** Returns a registered definition; an unregistered key fails closed. */
export function getProgrammeDefinition(
  definitionKey: string,
): ProgrammeDefinition {
  const definition = registeredDefinitions.get(definitionKey);

  if (definition === undefined) {
    throw new Error(`Unregistered programme definition key "${definitionKey}"`);
  }

  return definition;
}

/**
 * The active definition. Until persisted enrolment exists (C6/C7), active
 * means the single registered definition; anything else fails closed rather
 * than guessing.
 */
export function getActiveProgrammeDefinition(): ProgrammeDefinition {
  const [only, ...others] = registeredDefinitions.values();

  if (only === undefined || others.length > 0) {
    throw new Error(
      `Expected exactly one registered programme definition, found ${registeredDefinitions.size}`,
    );
  }

  return only;
}
