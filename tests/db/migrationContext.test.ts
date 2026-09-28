import { afterEach, describe, expect, it } from 'vitest';

import {
  closeSharedDatabase,
  createProgressPalDatabase,
  deleteSharedDatabase,
  getSharedDatabase,
  type DatabaseMigrationContext,
} from '@/lib/db/database';

import { defaultTestMigrationContext } from './testDatabase';

/**
 * Epic C / C6 — binding control 2. The neutral migration/authorization
 * context is bound once to the shared database instance at construction; a
 * missing or conflicting context fails closed, and the binding lives only on
 * the instance itself (not a separate module-global).
 */
describe('database migration context (binding control 2)', () => {
  afterEach(async () => {
    await deleteSharedDatabase();
  });

  it('rejects opening the shared database with no migration context bound yet', async () => {
    await deleteSharedDatabase();

    expect(() => getSharedDatabase()).toThrow(/migration context/i);
  });

  it('binds the supplied context to a freshly constructed shared database', () => {
    const db = getSharedDatabase(defaultTestMigrationContext);

    expect(db.migrationContext).toEqual(defaultTestMigrationContext);
  });

  it('allows a later call to omit the context once it is bound', () => {
    const first = getSharedDatabase(defaultTestMigrationContext);
    const second = getSharedDatabase();

    expect(second).toBe(first);
  });

  it('allows a later call to repeat an equivalent context', () => {
    const first = getSharedDatabase(defaultTestMigrationContext);
    const second = getSharedDatabase({
      programmeId: defaultTestMigrationContext.programmeId,
      authorizedCatalogues: [
        ...defaultTestMigrationContext.authorizedCatalogues,
      ],
    });

    expect(second).toBe(first);
  });

  it('rejects a later call with a conflicting programmeId', () => {
    getSharedDatabase(defaultTestMigrationContext);

    expect(() =>
      getSharedDatabase({
        programmeId: 'a-different-programme',
        authorizedCatalogues: defaultTestMigrationContext.authorizedCatalogues,
      }),
    ).toThrow(/conflicts/i);
  });

  it('rejects a later call with a conflicting authorized catalogue set', () => {
    getSharedDatabase(defaultTestMigrationContext);

    expect(() =>
      getSharedDatabase({
        programmeId: defaultTestMigrationContext.programmeId,
        authorizedCatalogues: [
          { courseId: 'a-different-catalogue', programmeId: 'cs50x' },
        ],
      }),
    ).toThrow(/conflicts/i);
  });

  it('discards the bound context when the shared database is closed', () => {
    getSharedDatabase(defaultTestMigrationContext);
    closeSharedDatabase();

    expect(() => getSharedDatabase()).toThrow(/migration context/i);
  });

  const invalidContexts: Array<[string, DatabaseMigrationContext]> = [
    [
      'empty programmeId',
      {
        programmeId: '',
        authorizedCatalogues: [{ courseId: 'x', programmeId: 'x' }],
      },
    ],
    [
      'no authorized catalogues',
      { programmeId: 'cs50x', authorizedCatalogues: [] },
    ],
    [
      'an authorized catalogue with an empty courseId',
      {
        programmeId: 'cs50x',
        authorizedCatalogues: [{ courseId: '', programmeId: 'cs50x' }],
      },
    ],
  ];

  it.each(invalidContexts)(
    'rejects constructing a database with %s',
    (_label, context) => {
      expect(() =>
        createProgressPalDatabase(context, 'invalid-context-db'),
      ).toThrow();
    },
  );
});
