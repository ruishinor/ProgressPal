import { describe, expect, it } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import { migrationContextsAreEquivalent } from '@/lib/db/migrationContext';

import { defaultTestMigrationContext } from '../db/testDatabase';

describe('the shared test migration context', () => {
  it('stays equivalent to the production composition root context', () => {
    expect(
      migrationContextsAreEquivalent(
        defaultTestMigrationContext,
        resolveDatabaseMigrationContext(),
      ),
    ).toBe(true);
  });
});
