import type { AddStudySessionInput } from '@/lib/db';
import type {
  CourseItem,
  CourseUnit,
  StudySession,
  StudySessionMode,
} from '@/lib/domain';
import {
  formatDurationMinutes,
  getWholeMinutesFromElapsedMilliseconds,
} from '@/lib/time';

export type SessionCatalog = {
  itemById: ReadonlyMap<string, CourseItem>;
  itemsByUnitId: ReadonlyMap<string, CourseItem[]>;
  unitById: ReadonlyMap<string, CourseUnit>;
  units: readonly CourseUnit[];
};

export type SessionValidationErrors = Partial<
  Record<
    | 'blockers'
    | 'durationMinutes'
    | 'itemId'
    | 'mode'
    | 'notes'
    | 'startedAtLocal'
    | 'unitId',
    string
  >
>;

export type ManualSessionFormValues = {
  blockersText: string;
  durationMinutes: string;
  itemId: string;
  mode: string;
  notes: string;
  startedAtLocal: string;
  unitId: string;
};

export type LiveSessionState =
  | {
      error: string | null;
      itemId: string;
      mode: string;
      phase: 'idle';
      blockersText: string;
      notes: string;
      unitId: string;
    }
  | {
      activeElapsedMilliseconds: number;
      blockersText: string;
      error: string | null;
      itemId: string;
      mode: StudySessionMode;
      phase: 'running';
      notes: string;
      resumedAtMilliseconds: number;
      startedAtIso: string;
      startedAtMilliseconds: number;
      unitId: string;
    }
  | {
      activeElapsedMilliseconds: number;
      blockersText: string;
      error: string | null;
      itemId: string;
      mode: StudySessionMode;
      phase: 'paused';
      notes: string;
      startedAtIso: string;
      startedAtMilliseconds: number;
      unitId: string;
    }
  | {
      activeElapsedMilliseconds: number;
      blockersText: string;
      durationMinutes: number;
      endedAtIso: string;
      error: string | null;
      itemId: string;
      mode: StudySessionMode;
      notes: string;
      phase: 'review';
      startedAtIso: string;
      startedAtMilliseconds: number;
      unitId: string;
    };

export type SessionLedgerRow = {
  blockerSummary: string | null;
  durationLabel: string;
  id: string;
  itemTitle: string;
  modeLabel: string;
  notesPreview: string | null;
  startedAtLabel: string;
  unitTitle: string;
};

type ClockSnapshot = {
  iso: string;
  milliseconds: number;
};

const modeLabels: Record<StudySessionMode, string> = {
  coding: 'Coding',
  debugging: 'Debugging',
  final_project: 'Final project',
  note_review: 'Note review',
  reading: 'Reading',
  reflection: 'Reflection',
  watching: 'Watching',
};

function sortItems(items: readonly CourseItem[]) {
  return [...items].sort(
    (left, right) =>
      left.order - right.order ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id),
  );
}

function sortUnits(units: readonly CourseUnit[]) {
  return [...units].sort(
    (left, right) =>
      left.order - right.order ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id),
  );
}

function toLocalDateTimeInputValue(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseLocalDateTimeInput(value: string) {
  if (value.trim().length === 0) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function truncateText(value: string, maxLength: number) {
  const trimmedValue = value.trim();

  if (trimmedValue.length <= maxLength) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function parseBlockersText(blockersText: string) {
  return blockersText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function validateNotesAndBlockers(
  notes: string,
  blockersText: string,
): {
  blockers: string[];
  blockersError?: string;
  notesError?: string;
  notesValue: string | undefined;
} {
  const trimmedNotes = notes.trim();
  const blockers = parseBlockersText(blockersText);
  let notesError: string | undefined;
  let blockersError: string | undefined;

  if (trimmedNotes.length > 2000) {
    notesError = 'Notes must stay within 2000 characters.';
  }

  if (blockers.length > 20) {
    blockersError = 'List no more than 20 blockers.';
  } else if (blockers.some((blocker) => blocker.length > 200)) {
    blockersError = 'Each blocker must stay within 200 characters.';
  }

  return {
    blockers,
    blockersError,
    notesError,
    notesValue: trimmedNotes.length === 0 ? undefined : trimmedNotes,
  };
}

function validateSelectedItem(
  unitId: string,
  itemId: string,
  catalog: SessionCatalog,
) {
  const item =
    itemId.trim().length === 0 ? null : (catalog.itemById.get(itemId) ?? null);

  if (unitId.trim().length === 0) {
    return {
      error: 'Choose a course unit before saving.',
      item: null,
    };
  }

  if (itemId.trim().length === 0) {
    return {
      error: 'Choose a course item before saving.',
      item: null,
    };
  }

  if (item === null) {
    return {
      error: 'Choose an existing course item before saving.',
      item: null,
    };
  }

  if (item.unitId !== unitId) {
    return {
      error: 'The selected item does not belong to the selected unit.',
      item: null,
    };
  }

  return {
    error: null,
    item,
  };
}

function createIdleState(itemId = '', unitId = ''): LiveSessionState {
  return {
    blockersText: '',
    error: null,
    itemId,
    mode: '',
    notes: '',
    phase: 'idle',
    unitId,
  };
}

function formatLocalDateTimeLabel(isoTimestamp: string) {
  const date = new Date(isoTimestamp);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function getModeLabel(mode: StudySessionMode) {
  return modeLabels[mode];
}

export function getStudySessionModeOptions() {
  return (Object.entries(modeLabels) as Array<[StudySessionMode, string]>).map(
    ([value, label]) => ({
      label,
      value,
    }),
  );
}

export function buildSessionCatalog(
  units: readonly CourseUnit[],
  items: readonly CourseItem[],
): SessionCatalog {
  const sortedUnits = sortUnits(units);
  const sortedItems = sortItems(items);
  const itemById = new Map(sortedItems.map((item) => [item.id, item]));
  const unitById = new Map(sortedUnits.map((unit) => [unit.id, unit]));
  const itemsByUnitId = new Map<string, CourseItem[]>();

  for (const item of sortedItems) {
    const groupedItems = itemsByUnitId.get(item.unitId) ?? [];

    groupedItems.push(item);
    itemsByUnitId.set(item.unitId, groupedItems);
  }

  return {
    itemById,
    itemsByUnitId,
    unitById,
    units: sortedUnits,
  };
}

export function getUnitScopedItemOptions(
  catalog: SessionCatalog,
  unitId: string,
) {
  return (catalog.itemsByUnitId.get(unitId) ?? []).map((item) => ({
    label: item.title,
    value: item.id,
  }));
}

export function createManualSessionFormValues(
  now = new Date(),
  itemId = '',
  unitId = '',
): ManualSessionFormValues {
  return {
    blockersText: '',
    durationMinutes: '',
    itemId,
    mode: '',
    notes: '',
    startedAtLocal: toLocalDateTimeInputValue(now),
    unitId,
  };
}

export function createIdleLiveSession(itemId = '', unitId = '') {
  return createIdleState(itemId, unitId);
}

export function discardLiveSession(itemId = '', unitId = '') {
  return createIdleState(itemId, unitId);
}

export function validateSessionSelection(
  values: Pick<ManualSessionFormValues, 'itemId' | 'mode' | 'unitId'>,
  catalog: SessionCatalog,
): SessionValidationErrors {
  const errors: SessionValidationErrors = {};

  if (values.mode.trim().length === 0) {
    errors.mode = 'Choose a session mode before saving.';
  }

  if (values.unitId.trim().length === 0) {
    errors.unitId = 'Choose a course unit before saving.';
  }

  const selectedItem = validateSelectedItem(
    values.unitId,
    values.itemId,
    catalog,
  );

  if (selectedItem.error !== null) {
    if (values.itemId.trim().length === 0 || selectedItem.item === null) {
      errors.itemId = selectedItem.error;
    }

    if (values.unitId.trim().length === 0) {
      errors.unitId = 'Choose a course unit before saving.';
    }
  }

  return errors;
}

export function validateManualSessionForm(
  values: ManualSessionFormValues,
  catalog: SessionCatalog,
  nowIso: string,
):
  | { errors: SessionValidationErrors; input: null }
  | { errors: SessionValidationErrors; input: AddStudySessionInput } {
  const selectionErrors = validateSessionSelection(values, catalog);
  const errors: SessionValidationErrors = {
    ...selectionErrors,
  };
  const parsedDurationMinutes = Number.parseInt(values.durationMinutes, 10);
  const startedAt = parseLocalDateTimeInput(values.startedAtLocal);

  if (
    !Number.isInteger(parsedDurationMinutes) ||
    String(parsedDurationMinutes) !== values.durationMinutes.trim()
  ) {
    errors.durationMinutes =
      'Enter a whole number of minutes between 1 and 720.';
  } else if (parsedDurationMinutes < 1 || parsedDurationMinutes > 720) {
    errors.durationMinutes =
      'Enter a whole number of minutes between 1 and 720.';
  }

  if (startedAt === null) {
    errors.startedAtLocal = 'Choose a valid local start date and time.';
  } else if (startedAt.getTime() > Date.parse(nowIso)) {
    errors.startedAtLocal = 'Start date and time cannot be in the future.';
  }

  const selectedItem = validateSelectedItem(
    values.unitId,
    values.itemId,
    catalog,
  );

  if (selectedItem.error !== null) {
    errors.itemId = selectedItem.error;
  }

  const noteValidation = validateNotesAndBlockers(
    values.notes,
    values.blockersText,
  );

  if (noteValidation.notesError !== undefined) {
    errors.notes = noteValidation.notesError;
  }

  if (noteValidation.blockersError !== undefined) {
    errors.blockers = noteValidation.blockersError;
  }

  if (
    Object.keys(errors).length > 0 ||
    startedAt === null ||
    selectedItem.item === null
  ) {
    return {
      errors,
      input: null,
    };
  }

  const endedAt = new Date(
    startedAt.getTime() + parsedDurationMinutes * 60_000,
  ).toISOString();

  return {
    errors: {},
    input: {
      blockers: noteValidation.blockers,
      durationMinutes: parsedDurationMinutes,
      endedAt,
      itemId: selectedItem.item.id,
      mode: values.mode as StudySessionMode,
      notes: noteValidation.notesValue,
      startedAt: startedAt.toISOString(),
      unitId: selectedItem.item.unitId,
    },
  };
}

export function startLiveSession(
  state: LiveSessionState,
  catalog: SessionCatalog,
  clock: ClockSnapshot,
) {
  if (state.phase !== 'idle') {
    return {
      errors: {
        itemId: 'Only one live session can run at a time.',
      } satisfies SessionValidationErrors,
      nextState: state,
    };
  }

  const errors = validateSessionSelection(state, catalog);

  if (Object.keys(errors).length > 0) {
    return {
      errors,
      nextState: {
        ...state,
        error: null,
      },
    };
  }

  return {
    errors: {},
    nextState: {
      activeElapsedMilliseconds: 0,
      blockersText: '',
      error: null,
      itemId: state.itemId,
      mode: state.mode as StudySessionMode,
      notes: '',
      phase: 'running',
      resumedAtMilliseconds: clock.milliseconds,
      startedAtIso: clock.iso,
      startedAtMilliseconds: clock.milliseconds,
      unitId: state.unitId,
    } satisfies LiveSessionState,
  };
}

export function getLiveSessionElapsedMilliseconds(
  state: LiveSessionState,
  nowMilliseconds: number,
) {
  if (state.phase === 'running') {
    return (
      state.activeElapsedMilliseconds +
      Math.max(0, nowMilliseconds - state.resumedAtMilliseconds)
    );
  }

  if (state.phase === 'paused' || state.phase === 'review') {
    return state.activeElapsedMilliseconds;
  }

  return 0;
}

export function pauseLiveSession(
  state: LiveSessionState,
  nowMilliseconds: number,
): LiveSessionState {
  if (state.phase !== 'running') {
    return state;
  }

  return {
    activeElapsedMilliseconds: getLiveSessionElapsedMilliseconds(
      state,
      nowMilliseconds,
    ),
    blockersText: state.blockersText,
    error: state.error,
    itemId: state.itemId,
    mode: state.mode,
    notes: state.notes,
    phase: 'paused',
    startedAtIso: state.startedAtIso,
    startedAtMilliseconds: state.startedAtMilliseconds,
    unitId: state.unitId,
  };
}

export function resumeLiveSession(
  state: LiveSessionState,
  nowMilliseconds: number,
): LiveSessionState {
  if (state.phase !== 'paused') {
    return state;
  }

  return {
    ...state,
    error: null,
    phase: 'running',
    resumedAtMilliseconds: nowMilliseconds,
  };
}

export function finishLiveSession(
  state: LiveSessionState,
  clock: ClockSnapshot,
): LiveSessionState {
  if (state.phase !== 'running' && state.phase !== 'paused') {
    return state;
  }

  const activeElapsedMilliseconds =
    state.phase === 'running'
      ? getLiveSessionElapsedMilliseconds(state, clock.milliseconds)
      : state.activeElapsedMilliseconds;
  const durationMinutes = getWholeMinutesFromElapsedMilliseconds(
    activeElapsedMilliseconds,
  );

  if (durationMinutes < 1) {
    return {
      ...state,
      activeElapsedMilliseconds,
      error:
        'Live sessions need at least 60 seconds of active time before they can be saved.',
    };
  }

  return {
    activeElapsedMilliseconds,
    blockersText: state.blockersText,
    durationMinutes,
    endedAtIso: clock.iso,
    error: null,
    itemId: state.itemId,
    mode: state.mode,
    notes: state.notes,
    phase: 'review',
    startedAtIso: state.startedAtIso,
    startedAtMilliseconds: state.startedAtMilliseconds,
    unitId: state.unitId,
  };
}

export function buildStudySessionInput(
  state: LiveSessionState,
  catalog: SessionCatalog,
):
  | { errors: SessionValidationErrors; input: null }
  | { errors: SessionValidationErrors; input: AddStudySessionInput } {
  if (state.phase !== 'review') {
    return {
      errors: {
        itemId: 'Only completed live sessions can be saved.',
      },
      input: null,
    };
  }

  const selectionErrors = validateSessionSelection(state, catalog);
  const noteValidation = validateNotesAndBlockers(
    state.notes,
    state.blockersText,
  );

  const errors: SessionValidationErrors = {
    ...selectionErrors,
  };

  if (noteValidation.notesError !== undefined) {
    errors.notes = noteValidation.notesError;
  }

  if (noteValidation.blockersError !== undefined) {
    errors.blockers = noteValidation.blockersError;
  }

  const selectedItem = validateSelectedItem(
    state.unitId,
    state.itemId,
    catalog,
  );

  if (
    selectedItem.error !== null ||
    Object.keys(errors).length > 0 ||
    selectedItem.item === null
  ) {
    return {
      errors: {
        ...errors,
        ...(selectedItem.error !== null ? { itemId: selectedItem.error } : {}),
      },
      input: null,
    };
  }

  return {
    errors: {},
    input: {
      blockers: noteValidation.blockers,
      durationMinutes: state.durationMinutes,
      endedAt: state.endedAtIso,
      itemId: selectedItem.item.id,
      mode: state.mode,
      notes: noteValidation.notesValue,
      startedAt: state.startedAtIso,
      unitId: selectedItem.item.unitId,
    },
  };
}

export function buildSessionLedgerRows(
  sessions: readonly StudySession[],
  catalog: SessionCatalog,
): SessionLedgerRow[] {
  return [...sessions]
    .sort(
      (left, right) =>
        right.startedAt.localeCompare(left.startedAt) ||
        right.id.localeCompare(left.id),
    )
    .map((session) => {
      const item = catalog.itemById.get(session.itemId);
      const unit = catalog.unitById.get(session.unitId);
      const blockerCount = session.blockers.length;

      return {
        blockerSummary:
          blockerCount === 0
            ? null
            : blockerCount === 1
              ? `1 blocker: ${session.blockers[0]}`
              : `${blockerCount} blockers`,
        durationLabel: formatDurationMinutes(session.durationMinutes),
        id: session.id,
        itemTitle: item?.title ?? session.itemId,
        modeLabel: getModeLabel(session.mode),
        notesPreview:
          session.notes === undefined ? null : truncateText(session.notes, 120),
        startedAtLabel: formatLocalDateTimeLabel(session.startedAt),
        unitTitle: unit?.title ?? session.unitId,
      };
    });
}
