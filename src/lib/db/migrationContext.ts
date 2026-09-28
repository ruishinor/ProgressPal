/**
 * Neutral catalogue-authorization context for the v2 → v3 migration and
 * catalogue sync (Epic C / C6, binding control 2). Supplied by the app
 * composition root and bound to one `ProgressPalDatabase` instance at
 * construction; it never lives in a separate module-global and is never
 * threaded through the repository API. `src/lib` never imports
 * `@/programmes`: composition passes this as plain data.
 *
 * Lives in its own dependency-free module so both `database.ts` (the Dexie
 * upgrade) and `migrationV2ToV3.ts` (the pure mapping module) can depend on
 * it without a circular import between those two files.
 */
export type DatabaseMigrationContext = {
  readonly programmeId: string;
  readonly authorizedCatalogues: ReadonlyArray<{
    readonly courseId: string;
    readonly programmeId: string;
  }>;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function assertValidMigrationContext(
  context: DatabaseMigrationContext,
): void {
  if (!isNonEmptyString(context?.programmeId)) {
    throw new Error(
      'Database migration context requires a non-empty programmeId.',
    );
  }

  if (
    !Array.isArray(context.authorizedCatalogues) ||
    context.authorizedCatalogues.length === 0
  ) {
    throw new Error(
      'Database migration context requires at least one authorized catalogue.',
    );
  }

  for (const catalogue of context.authorizedCatalogues) {
    if (
      !isNonEmptyString(catalogue?.courseId) ||
      !isNonEmptyString(catalogue?.programmeId)
    ) {
      throw new Error(
        'Database migration context authorized catalogues require a non-empty courseId and programmeId.',
      );
    }
  }
}

export function migrationContextsAreEquivalent(
  a: DatabaseMigrationContext,
  b: DatabaseMigrationContext,
): boolean {
  return (
    a.programmeId === b.programmeId &&
    a.authorizedCatalogues.length === b.authorizedCatalogues.length &&
    a.authorizedCatalogues.every((entry, index) => {
      const other = b.authorizedCatalogues[index];

      return (
        other !== undefined &&
        entry.courseId === other.courseId &&
        entry.programmeId === other.programmeId
      );
    })
  );
}
