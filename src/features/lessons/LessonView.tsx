import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  createEvidenceAchievementPlanner,
  hasEvidenceAchievementRules,
} from '@/lib/achievements';
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
  exerciseNeedsRuntime,
  getPythonRuntime,
  recoverUnresolvedAttempts,
} from '@/lib/evaluation';
import { deriveProgrammeMastery } from '@/lib/mastery';
import { createLessonAwardPlanner } from '@/lib/rewards';

import { ExerciseCard } from './ExerciseCard';
import { LessonTextBlockView } from './LessonBlocks';
import type { MarkupContext } from './markup';
import {
  createWording,
  formatCopy,
  isCurrentEvidence,
  lessonSteps,
  reminderBefore,
  type LessonStep,
} from './model';
import {
  LessonSurfaceContext,
  lessonSurfaces,
  type LessonPresentation,
} from './presentation';

/**
 * The lesson surface for a catalogue item of type `lesson` (Epic E §3 items
 * 6–11). The learner-facing unit is the mission; units appear only as
 * headings of authored sections, and no unit, skill, objective or exercise
 * identifier, gating role or difficulty is ever shown (DC-04, INV-11). Long
 * missions are offered through their named phases (DC-05). Content language
 * comes from the content metadata (DC-43). A mission with an authored
 * interleaved sequence is one flow: lessons keep their headings, practice
 * continues inline, and exercises are numbered across the mission. The host
 * chooses the presentation (Classic or RPG); behaviour is shared.
 */

type LessonViewProps = {
  readonly itemId: string;
  readonly scope: ProgrammeScope;
  /** The route of a lesson item in the hosting experience (Classic or RPG). */
  readonly lessonPath: (itemId: string) => string;
  /** Rendered after the lesson (the host's lesson-level progress controls). */
  readonly footer?: ReactNode;
  /** The hosting experience's surface (default Classic). */
  readonly presentation?: LessonPresentation;
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

const noRuntimeSubscription = () => () => undefined;

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

function LessonContent(
  props: LessonViewProps & {
    readonly copy: LessonUiCopy;
    readonly provider: LessonContentProvider;
  },
) {
  const surfaces = lessonSurfaces(props.presentation ?? 'classic');

  return (
    <LessonSurfaceContext.Provider value={surfaces}>
      <LessonSurface {...props} />
    </LessonSurfaceContext.Provider>
  );
}

function LessonSurface({
  copy,
  footer,
  itemId,
  lessonPath,
  presentation,
  provider,
  scope,
}: LessonViewProps & {
  readonly copy: LessonUiCopy;
  readonly provider: LessonContentProvider;
}) {
  const surfaces = lessonSurfaces(presentation ?? 'classic');
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
  const phaseHeadingRef = useRef<HTMLParagraphElement>(null);
  const phaseMovePendingRef = useRef(false);
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

      const hashBySubject = new Map(
        lessonBundle.exercises.map((entry) => [
          entry.meta.subjectId,
          entry.meta.contentHash,
        ]),
      );

      setEvidence(rows);
      setInitialCorrect(
        new Set(
          rows
            .filter(
              (row) =>
                row.kind === 'evaluation_result' &&
                row.outcome === 'correct' &&
                isCurrentEvidence(row, hashBySubject.get(row.subjectId)),
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
  const lessonXp = scope.policy.lessonXp;
  // Re-render when the Python runtime becomes ready (or fails to load).
  const runtimeStatus = useSyncExternalStore(
    runtime.subscribe ?? noRuntimeSubscription,
    () => runtime.status(),
  );
  const runtimeAvailable = runtimeStatus === 'available';
  const needsRuntime =
    bundle?.exercises.some((entry) => exerciseNeedsRuntime(entry.exercise)) ??
    false;

  // The runtime is large: it loads only for a lesson that needs it.
  useEffect(() => {
    if (needsRuntime) {
      runtime.prepare?.();
    }
  }, [needsRuntime, runtime]);
  // The programme's lesson XP rules over the whole content index; results
  // run it in their own transaction against every evidence row.
  const awardXp = useMemo(
    () =>
      lessonXp === undefined || load.status !== 'ready'
        ? undefined
        : createLessonAwardPlanner({
            policy: lessonXp,
            index: load.index,
            runtimeAvailable,
          }),
    [lessonXp, load, runtimeAvailable],
  );
  // The programme's evidence-backed achievements; like XP, they commit in the
  // result's own transaction. Programmes with none get no planner.
  const awardAchievements = useMemo(
    () =>
      load.status !== 'ready' ||
      !hasEvidenceAchievementRules(scope.policy.achievements)
        ? undefined
        : createEvidenceAchievementPlanner({
            definitions: scope.policy.achievements,
            index: load.index,
            runtimeAvailable,
          }),
    [load, runtimeAvailable, scope.policy.achievements],
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
  // (invariant 10), once a runtime the lesson needs has settled; a read-only
  // tab shows them pending.
  useEffect(() => {
    if (
      bundle === null ||
      !coordination.canWrite ||
      recoveryAttemptedRef.current ||
      (needsRuntime && runtimeStatus === 'loading') ||
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
        awardXp,
        awardAchievements,
        ...(scope.policy.levelCurve === undefined
          ? {}
          : { levelCurve: scope.policy.levelCurve }),
      }),
    ).catch(() => undefined);
  }, [
    awardAchievements,
    awardXp,
    bundle,
    coordination.canWrite,
    evidence,
    needsRuntime,
    programmeId,
    runtime,
    runtimeStatus,
    scope.policy.levelCurve,
    write,
  ]);

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

  // `Fortsett` after a section: keep the bookmark (when this tab may write)
  // and then bring the learner to the next section. The page is one long,
  // fully expanded flow, so the move is the visible part of the action.
  // Focus goes to the next section's heading (or its first block when the
  // practice continues without a heading), which also tells assistive
  // technology where the learner is now. The scroll is instant and
  // deterministic (no smooth animation to reduce), and it still happens, as a
  // focus move, when the next section is already on screen.
  const continueTo = useCallback(
    async (nextStepIndex: number) => {
      if (coordination.canWrite) {
        await savePosition(nextStepIndex);
      }

      const target =
        document.getElementById(`${anchorPrefix}-group-${nextStepIndex}`) ??
        document.getElementById(`${anchorPrefix}-step-${nextStepIndex}`);

      if (target === null) {
        return;
      }

      target.focus({ preventScroll: true });
      target.scrollIntoView?.({ behavior: 'auto', block: 'start' });
    },
    [anchorPrefix, coordination.canWrite, savePosition],
  );

  // `Neste etappe` / `Forrige etappe` open another stage of one long page:
  // the learner is brought to that stage's heading, which also takes focus so
  // assistive technology announces where they are. Only a learner-made move
  // does this, never the first render or a resumed bookmark.
  useEffect(() => {
    if (!phaseMovePendingRef.current) {
      return;
    }

    phaseMovePendingRef.current = false;
    const heading = phaseHeadingRef.current;

    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView?.({ behavior: 'auto', block: 'start' });
  }, [phaseIndex]);

  if (load.status === 'loading') {
    return <p className="lesson-note">{copy.text.lessonLoading}</p>;
  }

  if (load.status === 'failed') {
    return (
      <div className={surfaces.alert} role="alert">
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
  // A module checkpoint's gate items are this lesson's own exercises, so
  // the lesson's evidence is all its judgement (K-4) reads.
  const mastery =
    mission.surface === 'checkpoint'
      ? deriveProgrammeMastery({
          index,
          evidence,
          openedMissionIds: new Set(),
          runtimeAvailable,
        })
      : null;
  const checkpoint = mastery?.checkpoints[readyBundle.moduleId];
  const moduleBlockers = mastery?.modules[readyBundle.moduleId]?.blockers ?? [];
  const reminder =
    position === null ? null : reminderBefore(steps, position.stepIndex);
  const missionsById = new Map(
    index.modules
      .flatMap((module) => module.missions)
      .map((entry) => [entry.missionId, entry]),
  );
  const lastStepIndex = steps.length - 1;
  // Where the learner is in the module and what comes next, from the content
  // index only. It states a position, never a completion.
  const modules = [...index.modules].sort((a, b) => a.order - b.order);
  const moduleEntry = modules.find(
    (candidate) => candidate.moduleId === readyBundle.moduleId,
  );
  const moduleMissions = moduleEntry?.missions ?? [];
  const missionPosition = moduleMissions.findIndex(
    (candidate) => candidate.missionId === mission.missionId,
  );
  const nextMission =
    missionPosition < 0 ? undefined : moduleMissions[missionPosition + 1];
  const nextModule =
    moduleEntry === undefined
      ? undefined
      : modules[modules.indexOf(moduleEntry) + 1];
  const nextModuleFirst = nextModule?.missions[0];
  const atLessonEnd = phases.length === 0 || phaseIndex === phases.length - 1;
  const sequenced = mission.sequence !== undefined;
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
        className={surfaces.article}
        data-presentation={surfaces.name}
        lang={readyBundle.language}
      >
        <header className={surfaces.header}>
          <p className={surfaces.eyebrow}>
            <span>{copy.surfaceLabels[mission.surface]}</span>
            {' · '}
            <span>{formatCopy(copy, 'minutes', { minutes })}</span>
          </p>
          <h1 id={titleId}>{mission.title}</h1>
          <p className={surfaces.lede}>
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
        {checkpoint === undefined ? null : checkpoint.status ===
          'rule_missing' ? (
          <p className="lesson-note">{copy.text.checkpointNotice}</p>
        ) : checkpoint.status === 'cleared' ? (
          <p className="lesson-note" role="status">
            {copy.text.checkpointCleared}
          </p>
        ) : (
          <>
            <p className="lesson-note">{copy.text.checkpointHow}</p>
            <p className="lesson-note" role="status">
              {formatCopy(copy, 'checkpointProgress', {
                done: checkpoint.criteria.filter(
                  (criterion) => criterion.level === 'D',
                ).length,
                count: checkpoint.criteria.length,
              })}
            </p>
          </>
        )}
        {mission.surface === 'checkpoint' &&
        runtimeStatus === 'unavailable' &&
        moduleBlockers.includes('executable_evaluation_unavailable') ? (
          <p className="lesson-note">{copy.text.checkpointRuntimeNotice}</p>
        ) : null}
        {position !== null ? (
          <section className={surfaces.resume}>
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
            <p ref={phaseHeadingRef} tabIndex={-1}>
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
          // In an interleaved mission a lesson is headed where it begins and
          // practice continues inline, without a heading of its own.
          const headed =
            !sequenced || (group[0]!.firstInUnit && unit.kind !== 'P');
          const bookmark = !sequenced || unit.kind !== 'P';

          return (
            <section
              className={surfaces.section}
              key={`${unit.unit_id}-${group[0]!.stepIndex}`}
            >
              {headed ? (
                // The kind reads as the eyebrow of the unit title.
                <header className="lesson-unit__header">
                  <p className={surfaces.eyebrow}>
                    {copy.unitKindLabels[unit.kind]}
                    {unit.optional ? ` · ${copy.text.optionalSuffix}` : ''}
                  </p>
                  <h2
                    id={`${anchorPrefix}-group-${group[0]!.stepIndex}`}
                    tabIndex={-1}
                  >
                    {unit.title_nb}
                  </h2>
                </header>
              ) : null}
              {group.map((step, indexInGroup) => (
                <div
                  id={`${anchorPrefix}-step-${step.stepIndex}`}
                  key={step.stepIndex}
                  tabIndex={!headed && indexInGroup === 0 ? -1 : undefined}
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
                          awardAchievements={awardAchievements}
                          awardXp={awardXp}
                          canWrite={coordination.canWrite}
                          closedLesson={readyBundle.closedLesson}
                          context={context}
                          contentVersion={readyBundle.contentVersion}
                          copy={copy}
                          entry={entry}
                          evidence={evidence.filter(
                            (row) => row.subjectId === entry.meta.subjectId,
                          )}
                          gateRetryRule={index.gateRetryRule !== null}
                          levelCurve={scope.policy.levelCurve}
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
                          progressCheck={
                            provider.progressCheckSubjectIds?.includes(
                              entry.meta.subjectId,
                            ) ?? false
                          }
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
              {bookmark &&
              groupEnd < lastStepIndex &&
              steps[groupEnd + 1]?.phaseIndex ===
                steps[groupEnd]?.phaseIndex ? (
                <div className="action-row">
                  <button
                    className={surfaces.secondary}
                    disabled={!coordination.canWrite}
                    onClick={() => void continueTo(groupEnd + 1)}
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
                className={surfaces.secondary}
                onClick={() => {
                  const target = steps.find(
                    (step) => step.phaseIndex === phaseIndex - 1,
                  );
                  phaseMovePendingRef.current = true;
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
                className={surfaces.primary}
                onClick={() => {
                  const target = steps.find(
                    (step) => step.phaseIndex === phaseIndex + 1,
                  );
                  phaseMovePendingRef.current = true;
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
        {atLessonEnd ? (
          <section
            aria-labelledby={`${anchorPrefix}-where-next`}
            className={surfaces.recap}
          >
            <h2 id={`${anchorPrefix}-where-next`}>
              {copy.text.whereNextHeading}
            </h2>
            <p>{formatCopy(copy, 'whereNextEnd', { title: mission.title })}</p>
            {missionPosition < 0 ? null : (
              <p>
                {formatCopy(copy, 'whereNextPosition', {
                  n: missionPosition + 1,
                  count: moduleMissions.length,
                  module: readyBundle.moduleTitle,
                })}
              </p>
            )}
            {nextMission === undefined ? (
              <>
                <p>{copy.text.whereNextLastInModule}</p>
                {nextModule !== undefined && nextModuleFirst !== undefined ? (
                  <p>
                    {formatCopy(copy, 'whereNextNextModule', {
                      module: nextModule.title,
                    })}{' '}
                    <Link to={lessonPath(nextModuleFirst.itemId)}>
                      {nextModuleFirst.title}
                    </Link>
                  </p>
                ) : (
                  <p>{copy.text.whereNextNoMore}</p>
                )}
              </>
            ) : (
              <p>
                {copy.text.whereNextNext}{' '}
                <Link to={lessonPath(nextMission.itemId)}>
                  {nextMission.title}
                </Link>
                {nextMission.optional ? ` ${copy.text.optionalSuffix}` : ''}
              </p>
            )}
            <p>{copy.text.whereNextModuleRule}</p>
            {footer === undefined ? null : <p>{copy.text.whereNextMark}</p>}
          </section>
        ) : null}
        <p className="lesson-note">{copy.text.completionDisclaimer}</p>
      </article>
      {footer === undefined ? null : <Fragment>{footer}</Fragment>}
    </>
  );
}
