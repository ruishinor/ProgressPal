import { describe, expect, it } from 'vitest';

import {
  buildSessionCatalog,
  buildSessionLedgerRows,
  buildStudySessionInput,
  createIdleLiveSession,
  createManualSessionFormValues,
  discardLiveSession,
  finishLiveSession,
  pauseLiveSession,
  resumeLiveSession,
  startLiveSession,
  validateManualSessionForm,
  type LiveSessionState,
} from '@/features/sessions';
import type { CourseItem, CourseUnit, StudySession } from '@/lib/domain';

const courseUnits: CourseUnit[] = [
  {
    courseId: 'cs50x-2026',
    createdAt: '2026-06-12T08:00:00.000Z',
    id: 'week-0',
    order: 0,
    required: true,
    sourceYear: 2026,
    title: 'Week 0: Scratch',
    type: 'week',
    updatedAt: '2026-06-12T08:00:00.000Z',
  },
  {
    courseId: 'cs50x-2026',
    createdAt: '2026-06-12T08:00:00.000Z',
    id: 'final-project',
    order: 1,
    required: true,
    sourceYear: 2026,
    title: 'Final Project',
    type: 'final_project',
    updatedAt: '2026-06-12T08:00:00.000Z',
  },
];

const courseItems: CourseItem[] = [
  {
    createdAt: '2026-06-12T08:00:00.000Z',
    estimatedMinutes: 120,
    id: 'week-0-lecture',
    order: 0,
    required: true,
    title: 'Lecture',
    type: 'lecture',
    unitId: 'week-0',
    updatedAt: '2026-06-12T08:00:00.000Z',
  },
  {
    createdAt: '2026-06-12T08:00:00.000Z',
    estimatedMinutes: 45,
    id: 'week-0-shorts',
    order: 1,
    required: false,
    title: 'Shorts',
    type: 'shorts',
    unitId: 'week-0',
    updatedAt: '2026-06-12T08:00:00.000Z',
  },
  {
    createdAt: '2026-06-12T08:00:00.000Z',
    estimatedMinutes: 180,
    id: 'final-project-plan',
    order: 0,
    required: true,
    title: 'Plan milestone',
    type: 'project_task',
    unitId: 'final-project',
    updatedAt: '2026-06-12T08:00:00.000Z',
  },
];

const sessionCatalog = buildSessionCatalog(courseUnits, courseItems);

function expectLiveSessionPhase<TPhase extends LiveSessionState['phase']>(
  state: LiveSessionState,
  phase: TPhase,
) {
  expect(state.phase).toBe(phase);

  return state as Extract<LiveSessionState, { phase: TPhase }>;
}

describe('sessions model', () => {
  it('builds a valid manual session input for one existing item', () => {
    const manualForm = {
      ...createManualSessionFormValues(
        new Date('2026-06-12T10:30:00.000Z'),
        'week-0-lecture',
        'week-0',
      ),
      blockersText: 'Context switch\nUnclear pointer segment',
      durationMinutes: '25',
      mode: 'watching',
      notes: 'Focused on the opening lecture range.',
      startedAtLocal: '2026-06-12T10:00',
    };

    const validation = validateManualSessionForm(
      manualForm,
      sessionCatalog,
      '2026-06-12T12:00:00.000Z',
    );

    expect(validation.errors).toEqual({});
    expect(validation.input).toEqual({
      blockers: ['Context switch', 'Unclear pointer segment'],
      durationMinutes: 25,
      endedAt: expect.any(String),
      itemId: 'week-0-lecture',
      mode: 'watching',
      notes: 'Focused on the opening lecture range.',
      startedAt: expect.any(String),
      unitId: 'week-0',
    });
  });

  it('rejects manual sessions with missing mode, invalid duration, future starts, unknown items, and mismatched units', () => {
    const nowIso = '2026-06-12T12:00:00.000Z';
    const baseForm = {
      ...createManualSessionFormValues(
        new Date('2026-06-12T10:30:00.000Z'),
        'week-0-lecture',
        'week-0',
      ),
      durationMinutes: '25',
      mode: 'watching',
      startedAtLocal: '2026-06-12T10:00',
    };

    expect(
      validateManualSessionForm(
        { ...baseForm, mode: '' },
        sessionCatalog,
        nowIso,
      ).errors.mode,
    ).toMatch(/Choose a session mode/i);
    expect(
      validateManualSessionForm(
        { ...baseForm, durationMinutes: '0' },
        sessionCatalog,
        nowIso,
      ).errors.durationMinutes,
    ).toMatch(/between 1 and 720/i);
    expect(
      validateManualSessionForm(
        { ...baseForm, durationMinutes: '721' },
        sessionCatalog,
        nowIso,
      ).errors.durationMinutes,
    ).toMatch(/between 1 and 720/i);
    expect(
      validateManualSessionForm(
        { ...baseForm, durationMinutes: '1.5' },
        sessionCatalog,
        nowIso,
      ).errors.durationMinutes,
    ).toMatch(/whole number/i);
    expect(
      validateManualSessionForm(
        { ...baseForm, startedAtLocal: '2099-06-12T13:00' },
        sessionCatalog,
        nowIso,
      ).errors.startedAtLocal,
    ).toMatch(/cannot be in the future/i);
    expect(
      validateManualSessionForm(
        { ...baseForm, itemId: 'missing-item' },
        sessionCatalog,
        nowIso,
      ).errors.itemId,
    ).toMatch(/existing task/i);
    expect(
      validateManualSessionForm(
        { ...baseForm, itemId: 'final-project-plan', unitId: 'week-0' },
        sessionCatalog,
        nowIso,
      ).errors.itemId,
    ).toMatch(/does not belong/i);
    expect(
      validateManualSessionForm(
        { ...baseForm, itemId: '', unitId: '' },
        sessionCatalog,
        nowIso,
      ).errors.unitId,
    ).toMatch(/Choose a course unit/i);
  });

  it('runs the live-session state machine with paused time excluded', () => {
    const liveDraft: LiveSessionState = {
      ...createIdleLiveSession('week-0-lecture', 'week-0'),
      mode: 'watching',
    };
    const started = startLiveSession(liveDraft, sessionCatalog, {
      iso: '2026-06-12T10:00:00.000Z',
      milliseconds: 0,
    });

    expect(started.errors).toEqual({});
    const running = expectLiveSessionPhase(started.nextState, 'running');
    const paused = expectLiveSessionPhase(
      pauseLiveSession(running, 30_000),
      'paused',
    );
    const resumed = expectLiveSessionPhase(
      resumeLiveSession(paused, 50_000),
      'running',
    );
    const finished = expectLiveSessionPhase(
      finishLiveSession(resumed, {
        iso: '2026-06-12T10:01:30.000Z',
        milliseconds: 110_000,
      }),
      'review',
    );

    expect(paused.activeElapsedMilliseconds).toBe(30_000);
    expect(finished.activeElapsedMilliseconds).toBe(90_000);
    expect(finished.durationMinutes).toBe(1);

    const saveValidation = buildStudySessionInput(
      {
        ...finished,
        blockersText: 'Context switch',
        notes: 'Recovered after a short interruption.',
      },
      sessionCatalog,
    );

    expect(saveValidation.errors).toEqual({});
    expect(saveValidation.input).toEqual({
      blockers: ['Context switch'],
      durationMinutes: 1,
      endedAt: '2026-06-12T10:01:30.000Z',
      itemId: 'week-0-lecture',
      mode: 'watching',
      notes: 'Recovered after a short interruption.',
      startedAt: '2026-06-12T10:00:00.000Z',
      unitId: 'week-0',
    });
  });

  it('rejects live sessions under 60 active seconds and exposes discard as a reset', () => {
    const liveDraft: LiveSessionState = {
      ...createIdleLiveSession('week-0-lecture', 'week-0'),
      mode: 'watching',
    };
    const started = startLiveSession(liveDraft, sessionCatalog, {
      iso: '2026-06-12T10:00:00.000Z',
      milliseconds: 0,
    });
    const running = expectLiveSessionPhase(started.nextState, 'running');
    const finished = expectLiveSessionPhase(
      finishLiveSession(running, {
        iso: '2026-06-12T10:00:59.000Z',
        milliseconds: 59_000,
      }),
      'running',
    );

    expect(finished.error).toMatch(/at least 60 seconds/i);
    expect(discardLiveSession('week-0-lecture', 'week-0')).toEqual({
      blockersText: '',
      error: null,
      itemId: 'week-0-lecture',
      mode: '',
      notes: '',
      phase: 'idle',
      unitId: 'week-0',
    });
  });

  it('sorts ledger rows newest first and uses deterministic same-time ordering', () => {
    const sessions: StudySession[] = [
      {
        blockers: [],
        createdAt: '2026-06-12T12:40:00.000Z',
        durationMinutes: 30,
        endedAt: '2026-06-12T12:40:00.000Z',
        id: 'study-session-a',
        itemId: 'week-0-lecture',
        mode: 'watching',
        notes: 'Reviewed the first lecture slice carefully.',
        startedAt: '2026-06-12T12:10:00.000Z',
        unitId: 'week-0',
        updatedAt: '2026-06-12T12:40:00.000Z',
      },
      {
        blockers: ['Scope drift'],
        createdAt: '2026-06-12T12:40:00.000Z',
        durationMinutes: 25,
        endedAt: '2026-06-12T12:40:00.000Z',
        id: 'study-session-b',
        itemId: 'week-0-lecture',
        mode: 'reading',
        notes: undefined,
        startedAt: '2026-06-12T12:10:00.000Z',
        unitId: 'week-0',
        updatedAt: '2026-06-12T12:40:00.000Z',
      },
      {
        blockers: ['Context switch', 'Noisy room'],
        createdAt: '2026-06-12T13:50:00.000Z',
        durationMinutes: 45,
        endedAt: '2026-06-12T13:50:00.000Z',
        id: 'study-session-c',
        itemId: 'final-project-plan',
        mode: 'final_project',
        notes: 'Outlined the project scope and next checkpoint.',
        startedAt: '2026-06-12T13:05:00.000Z',
        unitId: 'final-project',
        updatedAt: '2026-06-12T13:50:00.000Z',
      },
    ];

    const rows = buildSessionLedgerRows(sessions, sessionCatalog);

    expect(rows.map((row) => row.id)).toEqual([
      'study-session-c',
      'study-session-b',
      'study-session-a',
    ]);
    expect(rows[0]).toMatchObject({
      blockerSummary: '2 blockers',
      durationLabel: '45 min',
      itemTitle: 'Plan milestone',
      modeLabel: 'Final project',
      unitTitle: 'Final Project',
    });
    expect(rows[1]).toMatchObject({
      blockerSummary: '1 blocker: Scope drift',
      modeLabel: 'Reading',
    });
  });
});
