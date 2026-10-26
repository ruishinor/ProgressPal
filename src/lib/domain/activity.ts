import { z } from 'zod';
import '@/lib/validation';

const idSchema = z.string().regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/);
export const ActivityUnitSchema = z.enum(['reps', 'seconds', 'metres']);
export type ActivityUnit = z.infer<typeof ActivityUnitSchema>;
export const ActivityDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, 'Invalid calendar date.');
const amountSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const ActivityDefinitionSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1).max(80),
    units: z
      .array(ActivityUnitSchema)
      .min(1)
      .max(3)
      .refine((units) => new Set(units).size === units.length),
    archived: z.boolean(),
  })
  .strict();
export type ActivityDefinition = z.infer<typeof ActivityDefinitionSchema>;
export const ActivityEntrySchema = z
  .object({
    id: idSchema,
    date: ActivityDateSchema,
    activityId: idSchema,
    unit: ActivityUnitSchema,
    amount: amountSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();
export type ActivityEntry = z.infer<typeof ActivityEntrySchema>;
export const ActivityGoalSchema = z
  .object({
    id: idSchema,
    activityId: idSchema,
    unit: ActivityUnitSchema,
    target: amountSchema,
    enabled: z.boolean(),
  })
  .strict();
export type ActivityGoal = z.infer<typeof ActivityGoalSchema>;
const goalsSchema = z
  .array(ActivityGoalSchema)
  .refine(
    (goals) => new Set(goals.map((goal) => goal.id)).size === goals.length,
    'Duplicate goal identity.',
  );
export const ActivitySettingsSchema = z
  .object({
    id: z.literal('activity-settings'),
    goals: goalsSchema,
    reminderMinutes: z.union([
      z.literal(0),
      z.literal(30),
      z.literal(45),
      z.literal(60),
      z.literal(90),
    ]),
  })
  .strict();
export type ActivitySettings = z.infer<typeof ActivitySettingsSchema>;
export const defaultActivitySettings: ActivitySettings = {
  id: 'activity-settings',
  goals: [],
  reminderMinutes: 0,
};
// Only goal meaning is snapshotted. Quantities and progression remain derived.
export const ActivityDaySchema = z
  .object({ id: ActivityDateSchema, goals: goalsSchema })
  .strict();
export type ActivityDay = z.infer<typeof ActivityDaySchema>;

export const builtinActivities: readonly ActivityDefinition[] = [
  { id: 'pushups', name: 'Push-ups', units: ['reps'], archived: false },
  { id: 'squats', name: 'Squats', units: ['reps'], archived: false },
  { id: 'kickbacks', name: 'Kickbacks', units: ['reps'], archived: false },
  {
    id: 'walking',
    name: 'Walking',
    units: ['seconds', 'metres'],
    archived: false,
  },
  {
    id: 'running',
    name: 'Running',
    units: ['seconds', 'metres'],
    archived: false,
  },
  {
    id: 'cycling',
    name: 'Cycling',
    units: ['seconds', 'metres'],
    archived: false,
  },
];

export type ActivityData = {
  activityEntries: ActivityEntry[];
  activityDefinitions: ActivityDefinition[];
  activitySettings: ActivitySettings[];
  activityDays: ActivityDay[];
};

/** Shared by repository reads and complete-backup preflight; never drop bad rows. */
export function assertActivityInvariants(data: ActivityData) {
  const definitions = new Map(
    builtinActivities.map((definition) => [definition.id, definition]),
  );
  for (const definition of data.activityDefinitions) {
    if (definitions.has(definition.id))
      throw new Error('Duplicate activity identity.');
    definitions.set(definition.id, definition);
  }
  if (data.activitySettings.length > 1)
    throw new Error('Duplicate activity settings.');
  for (const rows of [data.activityEntries, data.activityDays]) {
    if (new Set(rows.map((row) => row.id)).size !== rows.length)
      throw new Error('Duplicate activity record.');
  }
  for (const row of [
    ...data.activityEntries,
    ...data.activitySettings.flatMap((settings) => settings.goals),
    ...data.activityDays.flatMap((day) => day.goals),
  ]) {
    if (!definitions.get(row.activityId)?.units.includes(row.unit))
      throw new Error('Activity record has an unknown activity or unit.');
  }
  const dates = new Set(data.activityDays.map((day) => day.id));
  // Archival keeps historical goals valid, but current enabled goals must
  // remain loggable. Apply the same rule to stored data and backup preflight.
  if (
    data.activitySettings.some((settings) =>
      settings.goals.some(
        (goal) => goal.enabled && definitions.get(goal.activityId)?.archived,
      ),
    )
  )
    throw new Error('An active goal uses a removed activity.');
  if (data.activityEntries.some((entry) => !dates.has(entry.date)))
    throw new Error('Activity entry has no day context.');
  const totals = new Map<string, number>();
  for (const entry of data.activityEntries) {
    const key = `${entry.activityId}:${entry.unit}`;
    const total = (totals.get(key) ?? 0) + entry.amount;
    if (!Number.isSafeInteger(total))
      throw new Error('Activity total exceeds exact numeric storage.');
    totals.set(key, total);
  }
}
