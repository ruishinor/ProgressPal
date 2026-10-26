import {
  ActivityDateSchema,
  ActivityDaySchema,
  ActivityDefinitionSchema,
  ActivityEntrySchema,
  ActivitySettingsSchema,
  assertActivityInvariants,
  builtinActivities,
  defaultActivitySettings,
  type ActivityData,
  type ActivityDefinition,
  type ActivityEntry,
  type ActivitySettings,
} from '@/lib/domain/activity';
import { activityDate, activityParticipation } from '@/lib/activity/model';
import { parseWithSchema } from '@/lib/validation';

import {
  ensureBaseInitialization,
  ensureOpen,
  parseStoredArray,
  resolveDatabase,
  runCoordinatedWrite,
  type BaseDatabaseOptions,
} from './repositories';
import type { ProgressPalDatabase } from './database';

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const tables = (db: ProgressPalDatabase) => [
  db.activityEntries,
  db.activityDefinitions,
  db.activitySettings,
  db.activityDays,
];

async function readData(db: ProgressPalDatabase): Promise<ActivityData> {
  const [entries, definitions, settings, days] = await Promise.all([
    db.activityEntries.toArray(),
    db.activityDefinitions.toArray(),
    db.activitySettings.toArray(),
    db.activityDays.toArray(),
  ]);
  const data = {
    activityEntries: parseStoredArray(
      entries,
      'Stored activity entry',
      ActivityEntrySchema,
    ),
    activityDefinitions: parseStoredArray(
      definitions,
      'Stored activity definition',
      ActivityDefinitionSchema,
    ),
    activitySettings: parseStoredArray(
      settings,
      'Stored activity settings',
      ActivitySettingsSchema,
    ),
    activityDays: parseStoredArray(
      days,
      'Stored activity day',
      ActivityDaySchema,
    ),
  };
  assertActivityInvariants(data);
  return data;
}
export async function readActivityData(options: BaseDatabaseOptions = {}) {
  const db = await ensureOpen(resolveDatabase(options.db));
  return db.transaction('r', tables(db), () => readData(db));
}
export async function readActivitySettings(options: BaseDatabaseOptions = {}) {
  const db = await ensureOpen(resolveDatabase(options.db));
  const rows = await db.activitySettings.toArray();
  if (rows.length > 1) throw new Error('Duplicate activity settings.');
  return rows.length
    ? ActivitySettingsSchema.parse(rows[0])
    : defaultActivitySettings;
}
/** Index-only distinct dates: the persistent HUD never materializes the ledger. */
export async function readActivityParticipation(
  options: BaseDatabaseOptions = {},
) {
  const db = await ensureOpen(resolveDatabase(options.db));
  const dates = await db.activityEntries.orderBy('date').uniqueKeys();
  return activityParticipation(
    dates.map((date) => ActivityDateSchema.parse(date)),
    activityDate(new Date((options.now ?? (() => new Date().toISOString()))())),
  );
}
async function write<Result>(
  options: BaseDatabaseOptions,
  action: (
    db: ProgressPalDatabase,
    data: ActivityData,
    today: string,
  ) => Promise<Result>,
) {
  const db = await ensureOpen(resolveDatabase(options.db));
  await ensureBaseInitialization({ ...options, db });
  const today = activityDate(
    new Date((options.now ?? (() => new Date().toISOString()))()),
  );
  return runCoordinatedWrite(db, () =>
    db.transaction('rw', tables(db), async () =>
      action(db, await readData(db), today),
    ),
  );
}
async function ensureDay(
  db: ProgressPalDatabase,
  data: ActivityData,
  date: string,
  today: string,
) {
  if (!data.activityDays.some((day) => day.id === date)) {
    // Backfilled dates have no known plan; never invent one using today's goals.
    await db.activityDays.add({
      id: date,
      goals:
        date === today
          ? (data.activitySettings[0] ?? defaultActivitySettings).goals
          : [],
    });
  }
}
export async function saveActivityEntry(
  input: Omit<ActivityEntry, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
  },
  options: BaseDatabaseOptions = {},
) {
  return write(options, async (db, data, today) => {
    if (input.date > today)
      throw new Error('Future activity cannot be recorded.');
    const previous =
      input.id === undefined
        ? undefined
        : data.activityEntries.find((entry) => entry.id === input.id);
    if (input.id !== undefined && previous === undefined)
      throw new Error('This entry no longer exists.');
    const definition = [...builtinActivities, ...data.activityDefinitions].find(
      (row) => row.id === input.activityId,
    );
    if (
      !definition?.units.includes(input.unit) ||
      (definition.archived && previous?.activityId !== definition.id)
    )
      throw new Error('Choose an available activity and measurement.');
    const timestamp = (options.now ?? (() => new Date().toISOString()))();
    const record = parseWithSchema(
      ActivityEntrySchema,
      {
        ...input,
        id: previous?.id ?? makeId('activity'),
        createdAt: previous?.createdAt ?? timestamp,
        updatedAt: timestamp,
      },
      'Activity entry',
    );
    await ensureDay(db, data, record.date, today);
    assertActivityInvariants({
      ...data,
      activityEntries: [
        ...data.activityEntries.filter((entry) => entry.id !== record.id),
        record,
      ],
      activityDays: data.activityDays.some((day) => day.id === record.date)
        ? data.activityDays
        : [...data.activityDays, { id: record.date, goals: [] }],
    });
    if (previous) await db.activityEntries.put(record);
    else await db.activityEntries.add(record);
    return record;
  });
}
export async function deleteActivityEntry(
  id: string,
  options: BaseDatabaseOptions = {},
) {
  return write(options, async (db, data) => {
    if (!data.activityEntries.some((entry) => entry.id === id))
      throw new Error('This entry no longer exists.');
    await db.activityEntries.delete(id);
  });
}
export async function saveActivitySettings(
  input: ActivitySettings,
  options: BaseDatabaseOptions = {},
) {
  const record = parseWithSchema(
    ActivitySettingsSchema,
    input,
    'Activity settings',
  );
  return write(options, async (db, data, today) => {
    assertActivityInvariants({ ...data, activitySettings: [record] });
    await db.activitySettings.put(record);
    await db.activityDays.put({ id: today, goals: record.goals });
    return record;
  });
}
export async function saveActivityDefinition(
  input: {
    id?: string;
    name: string;
    unit?: ActivityDefinition['units'][number];
    archived?: boolean;
  },
  options: BaseDatabaseOptions = {},
) {
  return write(options, async (db, data) => {
    const previous = data.activityDefinitions.find(
      (definition) => definition.id === input.id,
    );
    if (input.id !== undefined && !previous)
      throw new Error('This custom activity no longer exists.');
    const record = parseWithSchema(
      ActivityDefinitionSchema,
      {
        id: previous?.id ?? makeId('custom'),
        name: input.name,
        units: previous?.units ?? [input.unit],
        archived: input.archived ?? previous?.archived ?? false,
      },
      'Activity definition',
    );
    if (previous) await db.activityDefinitions.put(record);
    else await db.activityDefinitions.add(record);
    if (record.archived) {
      const settings = data.activitySettings[0] ?? defaultActivitySettings;
      const updated = {
        ...settings,
        goals: settings.goals.map((goal) =>
          goal.activityId === record.id ? { ...goal, enabled: false } : goal,
        ),
      };
      await db.activitySettings.put(updated);
      await db.activityDays.put({
        id: activityDate(
          new Date((options.now ?? (() => new Date().toISOString()))()),
        ),
        goals: updated.goals,
      });
    }
    return record;
  });
}
