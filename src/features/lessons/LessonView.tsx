import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppState } from '@/lib/appState';
import {
  getLessonPosition,
  listLearnerEvidence,
  recordSupportEvent,
  saveLessonPosition,
} from '@/lib/db';
import type {
  ContentLoadFailureStatus,
  LearnerEvidence,
  LessonBundle,
  LessonContentProvider,
  LessonPosition,
  LessonUiCopy,
  ProgrammeContentIndex,
  ProgrammeScope,
} from '@/lib/domain';
import {
  createEvidenceId,
  getPythonRuntime,
  recoverUnresolvedAttempts,
} from '@/lib/evaluation';
import { deriveProgrammeMastery } from '@/lib/mastery';

import { ExerciseCard } from './ExerciseCard';
import { LessonTextBlockView } from './LessonBlocks';
import type { MarkupContext } from './markup';
import {
  createWording,
  formatCopy,
  lessonSteps,
  reminderBefore,
  type LessonStep,
} from './model';

/**
 * The lesson surface for a catalogue item of type `lesson` (Epic E §3 items
 * 6–11). The learner-facing unit is the mission; units appear only as
 * headings of authored sections, and no unit, skill, objective or exercise
 * identifier, gating role or difficulty is ever shown (DC-04, INV-11). Long
 * missions are offered through their named phases (DC-05). Content language
 * comes from the content metadata (DC-43).
 */

type LessonViewProps = {
  readonly itemId: string;
  readonly scope: ProgrammeScope;
  /** The route of a lesson item in the hosting experience (Classic or RPG). */
  readonly lessonPath: (itemId: string) => string;
  /** Rendered after the lesson (the host's lesson-level progress controls). */
  readonly footer?: ReactNode;
};

type LoadState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'ready';
      readonly bundle: LessonBundle;
      readonly index: ProgrammeContentIndex;
      readonly steps: readonly LessonStep[];
    }
  | { readonly status: 'failed'; readonly reason: ContentLoadFailureStatus };

const failureCopy = {
  unavailable: 'lessonUnavailable',
  version_mismatch: 'lessonVersionMismatch',
  invalid: 'lessonInvalid',
} as const;

function stepPhaseId(bundle: LessonBundle, step: LessonStep | undefined) {
  const phase =
    step === undefined ? undefined : bundle.mission.phases?.[step.phaseIndex];
  return phase?.phaseId.toLowerCase();
}

export function LessonView(props: LessonViewProps) {
  const provider = props.scope.content.lessons;

  if (provider === undefined || provider.copy === undefined) {
    return null;
  }

  // Keyed so another lesson or programme starts from a fresh load state.
  return (
    <LessonContent
      key={`${props.scope.programmeId}|${props.itemId}`}
      {...props}
      copy={provider.copy}
      provider={provider}
    />
  );
}

function LessonContent({
  copy,
  footer,
  itemId,
  lessonPath,
  provider,
  scope,
}: LessonViewProps & {
  readonly copy: LessonUiCopy;
  readonly provider: LessonContentProvider;
}) {
  const { coordination, runLocalMutation } = useAppState();
  const navigate = useNavigate();
  const runtime = getPythonRuntime();
  const titleId = useId();
  const anchorPrefix = useId().replace(/:/g, '');
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [evidence, setEvidence] = useState<readonly LearnerEvidence[]>([]);
  const [initialCorrect, setInitialCorrect] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [position, setPosition] = useState<LessonPosition | null>(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const recoveryAttemptedRef = useRef(false);
  const programmeId = scope.programmeId;

  // The lesson is published only once its content, the learner's evidence
  // and the saved position have all been read, so a returning learner never
  // sees the lesson un-resumed first. A failed evidence read fails closed.
  useEffect(() => {
    let active = true;

    void (async () => {
      const [lesson, index] = await Promise.all([
        provider.loadLesson(itemId),
        provider.loadIndex(),
      ]);

      if (!active) {
        return;
      }

      if (lesson.status !== 'ready') {
        setLoad({ status: 'failed', reason: lesson.status });
        return;
      }

      if (index.status !== 'ready') {
        setLoad({ status: 'failed', reason: index.status });
        return;
      }

      const lessonBundle = lesson.value;
      const lessonStepList = lessonSteps(lessonBundle);
      const lessonSubjectIds = lessonBundle.exercises.map(
        (entry) => entry.meta.subjectId,
      );
      const [rows, stored] = await Promise.all([
        lessonSubjectIds.length === 0
          ? Promise.resolve([])
          : listLearnerEvidence({ programmeId, subjectIds: lessonSubjectIds }),
        getLessonPosition(itemId),
      ]);

      if (!active) {
        return;
      }

      setEvidence(rows);
      setInitialCorrect(
        new Set(
          rows
            .filter(
              (row) =>
                row.kind === 'evaluation_result' && row.outcome === 'correct',
            )
            .map((row) => row.subjectId),
        ),
      );

      if (stored !== null && stored.programmeId === programmeId) {
        // A bookmark from another content version resolves to its unit's
        // start, or the mission start (schema record §5 rule 6).
        const resolved =
          stored.contentVersion === lessonBundle.contentVersion
            ? Math.min(stored.stepIndex, Math.max(lessonStepList.length - 1, 0))
            : (lessonStepList.find(
                (step) =>
                  step.firstInUnit &&
                  step.unitId.toLowerCase() === stored.unitId,
              )?.stepIndex ?? 0);
        setPosition({ ...stored, stepIndex: resolved });
        setPhaseIndex(lessonStepList[resolved]?.phaseIndex ?? 0);
      } else {
        setPosition(null);
        setPhaseIndex(0);
      }

      setLoad({
        status: 'ready',
        bundle: lessonBundle,
        index: index.value,
        steps: lessonStepList,
      });
    })().catch(() => {
      if (active) {
        setLoad({ status: 'failed', reason: 'unavailable' });
      }
    });

    return () => {
      active = false;
    };
  }, [itemId, programmeId, provider]);

  const bundle = load.status === 'ready' ? load.bundle : null;
  const steps = useMemo(
    () => (load.status === 'ready' ? load.steps : []),
    [load],
  );
  const subjectIds = useMemo(
    () => bundle?.exercises.map((entry) => entry.meta.subjectId) ?? [],
    [bundle],
  );

  const reloadEvidence = useCallback(async () => {
    if (subjectIds.length === 0) {
      setEvidence([]);
      return [];
    }

    const rows = await listLearnerEvidence({ programmeId, subjectIds });
    setEvidence(rows);
    return rows;
  }, [programmeId, subjectIds]);

  const write = useCallback(
    async <Result,>(mutation: () => Promise<Result>) => {
      try {
        return await runLocalMutation(mutation, { invalidateRoute: false });
      } finally {
        await reloadEvidence().catch(() => undefined);
      }
    },
    [reloadEvidence, runLocalMutation],
  );

  // Interrupted evaluations are finished by the writer tab on load
  // (invariant 10); a read-only tab shows them pending.
  useEffect(() => {
    if (
      bundle === null ||
      !coordination.canWrite ||
      recoveryAttemptedRef.current ||
      !evidence.some(
        (row) =>
          row.kind === 'exercise_attempt' &&
          !evidence.some(
            (other) =>
              other.kind === 'evaluation_result' && other.attemptId === row.id,
          ),
      )
    ) {
      return;
    }

    recoveryAttemptedRef.current = true;
    void write(() =>
      recoverUnresolvedAttempts({
        programmeId,
        exercises: bundle.exercises.map((entry) => ({
          exercise: entry.exercise,
          contentHash: entry.meta.contentHash,
        })),
        runtime,
      }),
    ).catch(() => undefined);
  }, [bundle, coordination.canWrite, evidence, programmeId, runtime, write]);

  const savePosition = useCallback(
    async (stepIndex: number) => {
      if (bundle === null || steps.length === 0) {
        return;
      }

      const target = Math.min(stepIndex, steps.length - 1);
      const step = steps[target]!;
      const phaseId = stepPhaseId(bundle, step);

      await write(() =>
        saveLessonPosition({
          itemId,
          programmeId,
          contentVersion: bundle.contentVersion,
          unitId: step.unitId.toLowerCase(),
          stepIndex: target,
          ...(phaseId === undefined ? {} : { phaseId }),
        }),
      ).catch(() => undefined);
    },
    [bundle, itemId, programmeId, steps, write],
  );

  if (load.status === 'loading') {
    return <p className="lesson-note">{copy.text.lessonLoading}</p>;
  }

  if (load.status === 'failed') {
    return (
      <div className="card card--danger card--compact" role="alert">
        <p>{copy.text[failureCopy[load.reason]]}</p>
      </div>
    );
  }

  const { index } = load;
  const readyBundle = load.bundle;
  const { mission } = readyBundle;
  const phases = mission.phases ?? [];
  const visibleSteps =
    phases.length > 0
      ? steps.filter((step) => step.phaseIndex === phaseIndex)
      : steps;
  const context: MarkupContext = {
    technicalLanguage: readyBundle.technicalLanguage,
    wording: createWording(copy),
    headingLevel: 3,
  };
  const minutes =
    mission.surface === 'reinforcement'
      ? (mission.optionalMinutes ?? mission.minutes)
      : mission.minutes;
  const moduleBlockers =
    deriveProgrammeMastery({
      index,
      evidence: [],
      openedMissionIds: new Set(),
      runtimeAvailable: runtime.status() === 'available',
    }).modules[readyBundle.moduleId]?.blockers ?? [];
  const reminder =
    position === null ? null : reminderBefore(steps, position.stepIndex);
  const missionsById = new Map(
    index.modules
      .flatMap((module) => module.missions)
      .map((entry) => [entry.missionId, entry]),
  );
  const lastStepIndex = steps.length - 1;
  const groups: LessonStep[][] = [];

  for (const step of visibleSteps) {
    const current = groups.at(-1);

    if (current !== undefined && current[0]!.unitId === step.unitId) {
      current.push(step);
    } else {
      groups.push([step]);
    }
  }

  return (
    <>
      <article
        aria-labelledby={titleId}
        className="page-section lesson"
        lang={readyBundle.language}
      >
        <header className="lesson-header">
          <p className="lesson-note">
            <span>{copy.surfaceLabels[mission.surface]}</span>
            {' · '}
            <span>{formatCopy(copy, 'minutes', { minutes })}</span>
          </p>
          <h1 id={titleId}>{mission.title}</h1>
          <p>
            <em>{copy.text.goalLabel}</em> {mission.goal}
          </p>
        </header>
        {/* Only when another tab owns writing, as the shell decides; during
            the startup discovery the controls are disabled without a note. */}
        {coordination.blockReason === 'peer-active' ? (
          <p className="lesson-note" role="note">
            {copy.text.readOnly}
          </p>
        ) : null}
        {readyBundle.closedLesson ? (
          <p className="lesson-note">{copy.text.closedLessonNotice}</p>
        ) : null}
        {mission.surface === 'checkpoint' ? (
          <p className="lesson-note">{copy.text.checkpointNotice}</p>
        ) : null}
        {mission.surface === 'checkpoint' &&
        moduleBlockers.includes('executable_evaluation_unavailable') ? (
          <p className="lesson-note">{copy.text.checkpointRuntimeNotice}</p>
        ) : null}
        {position !== null ? (
          <section className="card card--accent card--compact lesson-resume">
            <h2>{copy.text.resumeHeading}</h2>
            {reminder === null ? null : (
              <p>{formatCopy(copy, 'resumeReminder', { can: reminder })}</p>
            )}
            <a href={`#${anchorPrefix}-step-${position.stepIndex}`}>
              {copy.text.continue}
            </a>
          </section>
        ) : null}
        {phases.length > 0 ? (
          <>
            <p>{formatCopy(copy, 'phaseIntro', { count: phases.length })}</p>
            <p>
              <strong>
                {formatCopy(copy, 'phaseHeading', {
                  n: phaseIndex + 1,
                  count: phases.length,
                  title: phases[phaseIndex]!.title,
                })}
              </strong>{' '}
              {formatCopy(copy, 'phaseMinutes', {
                minutes: phases[phaseIndex]!.minutes,
              })}
            </p>
          </>
        ) : null}
        {groups.map((group) => {
          const unit = readyBundle.units[group[0]!.unitIndex]!;
          const groupEnd = group.at(-1)!.stepIndex;

          return (
            <section
              className="page-section lesson-unit"
              key={`${unit.unit_id}-${group[0]!.stepIndex}`}
            >
              <h2>{unit.title_nb}</h2>
              <p className="lesson-note">
                {copy.unitKindLabels[unit.kind]}
                {unit.optional ? ` · ${copy.text.optionalSuffix}` : ''}
              </p>
              {group.map((step) => (
                <div
                  id={`${anchorPrefix}-step-${step.stepIndex}`}
                  key={step.stepIndex}
                >
                  {step.block.t === 'exercise' ? (
                    (() => {
                      const entry = readyBundle.exercises.find(
                        (candidate) => candidate.exercise === step.block,
                      )!;
                      const skill = index.skills.find((candidate) =>
                        entry.meta.skillIds.includes(candidate.skillId),
                      );
                      const teaching =
                        skill?.introducingMissionId === undefined ||
                        skill?.introducingMissionId === null
                          ? undefined
                          : missionsById.get(skill.introducingMissionId);

                      return (
                        <ExerciseCard
                          alreadyCorrect={initialCorrect.has(
                            entry.meta.subjectId,
                          )}
                          canWrite={coordination.canWrite}
                          closedLesson={readyBundle.closedLesson}
                          context={context}
                          contentVersion={readyBundle.contentVersion}
                          copy={copy}
                          entry={entry}
                          evidence={evidence.filter(
                            (row) => row.subjectId === entry.meta.subjectId,
                          )}
                          number={step.exerciseNumber!}
                          onReopenTeaching={
                            teaching === undefined || teaching.itemId === itemId
                              ? null
                              : async () => {
                                  await write(() =>
                                    recordSupportEvent({
                                      id: createEvidenceId('reopen'),
                                      programmeId,
                                      contentVersion:
                                        readyBundle.contentVersion,
                                      subjectId: entry.meta.subjectId,
                                      contentHash: entry.meta.contentHash,
                                      supportKind: 'teaching_reopened',
                                    }),
                                  );
                                  navigate(lessonPath(teaching.itemId));
                                }
                          }
                          onSubmitted={() => savePosition(step.stepIndex + 1)}
                          programmeId={programmeId}
                          remediationTitle={teaching?.title ?? null}
                          runtime={runtime}
                          write={write}
                        />
                      );
                    })()
                  ) : (
                    <LessonTextBlockView
                      block={step.block}
                      context={context}
                      copy={copy}
                    />
                  )}
                </div>
              ))}
              {groupEnd < lastStepIndex &&
              steps[groupEnd + 1]?.phaseIndex ===
                steps[groupEnd]?.phaseIndex ? (
                <div className="action-row">
                  <button
                    className="button button--secondary button--md"
                    disabled={!coordination.canWrite}
                    onClick={() => void savePosition(groupEnd + 1)}
                    type="button"
                  >
                    {copy.text.continue}
                  </button>
                </div>
              ) : null}
            </section>
          );
        })}
        {phases.length > 0 ? (
          <div className="action-row">
            {phaseIndex > 0 ? (
              <button
                className="button button--secondary button--md"
                onClick={() => {
                  const target = steps.find(
                    (step) => step.phaseIndex === phaseIndex - 1,
                  );
                  setPhaseIndex(phaseIndex - 1);
                  if (target !== undefined) {
                    void savePosition(target.stepIndex);
                  }
                }}
                type="button"
              >
                {copy.text.previousPhase}
              </button>
            ) : null}
            {phaseIndex < phases.length - 1 ? (
              <button
                className="button button--primary button--md"
                onClick={() => {
                  const target = steps.find(
                    (step) => step.phaseIndex === phaseIndex + 1,
                  );
                  setPhaseIndex(phaseIndex + 1);
                  if (target !== undefined) {
                    void savePosition(target.stepIndex);
                  }
                }}
                type="button"
              >
                {copy.text.nextPhase}
              </button>
            ) : null}
          </div>
        ) : null}
        <p className="lesson-note">{copy.text.completionDisclaimer}</p>
      </article>
      {footer === undefined ? null : <Fragment>{footer}</Fragment>}
    </>
  );
}
