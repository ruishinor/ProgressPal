import { useId, useState } from 'react';

import type {
  EvaluationResultRecord,
  ExerciseAttemptRecord,
  LearnerEvidence,
  LessonExerciseEntry,
  LessonUiCopy,
  SupportEventRecord,
} from '@/lib/domain';
import {
  createEvidenceId,
  exerciseNeedsRuntime,
  retryPermission,
  submitAnswer,
  type PythonRuntime,
  type SubmissionOutcome,
} from '@/lib/evaluation';
import { recordSupportEvent } from '@/lib/db';

import {
  answerToDraft,
  draftToAnswer,
  emptyDraft,
  type AnswerDraft,
} from './drafts';
import { InlineText, Markup, type MarkupContext } from './markup';
import { formatCopy, presentResult } from './model';
import { useLessonSurfaces } from './presentation';
import { AnswerWidget, CodeView } from './widgets';

/**
 * One exercise. Everything it shows about an answer comes from durable
 * evidence: a hint appears only after its support event is stored
 * (invariant 6), and correctness or any evaluator notice appears only after
 * the terminal evaluation result is stored (invariant 5). Until then the
 * exercise shows a neutral pending state.
 */

export type LessonWrite = <Result>(
  mutation: () => Promise<Result>,
) => Promise<Result>;

type ExerciseCardProps = {
  readonly alreadyCorrect: boolean;
  readonly canWrite: boolean;
  readonly closedLesson: boolean;
  readonly context: MarkupContext;
  readonly contentVersion: number;
  readonly copy: LessonUiCopy;
  readonly entry: LessonExerciseEntry;
  readonly evidence: readonly LearnerEvidence[];
  readonly number: number;
  readonly onReopenTeaching: (() => Promise<void>) | null;
  readonly onSubmitted: () => Promise<void>;
  readonly programmeId: string;
  readonly remediationTitle: string | null;
  readonly runtime: PythonRuntime;
  readonly write: LessonWrite;
};

const refusalCopy = {
  incomplete: 'incomplete',
  too_large: 'tooLarge',
  malformed: 'malformed',
  capability_unavailable: 'runtimeUnavailable',
  retry_rule_missing: 'gateNoRetry',
  unresolved_attempt: 'unresolvedPending',
} as const;

export function ExerciseCard({
  alreadyCorrect,
  canWrite,
  closedLesson,
  context,
  contentVersion,
  copy,
  entry,
  evidence,
  number,
  onReopenTeaching,
  onSubmitted,
  programmeId,
  remediationTitle,
  runtime,
  write,
}: ExerciseCardProps) {
  const { exercise, meta } = entry;
  const surfaces = useLessonSurfaces();
  const headingId = useId();
  const idPrefix = useId().replace(/:/g, '');
  const [draft, setDraft] = useState<AnswerDraft>(() => emptyDraft(exercise));
  const [retrying, setRetrying] = useState(false);
  const [busy, setBusy] = useState<'none' | 'submit' | 'hint' | 'reopen'>(
    'none',
  );
  const [notice, setNotice] = useState<string | null>(null);

  const attempts = evidence
    .filter(
      (row): row is ExerciseAttemptRecord => row.kind === 'exercise_attempt',
    )
    .sort((left, right) => left.attemptNumber - right.attemptNumber);
  const resultsByAttempt = new Map(
    evidence
      .filter(
        (row): row is EvaluationResultRecord =>
          row.kind === 'evaluation_result',
      )
      .map((row) => [row.attemptId, row]),
  );
  const latest = attempts.at(-1);
  const latestResult =
    latest === undefined ? undefined : resultsByAttempt.get(latest.id);
  const unresolved = latest !== undefined && latestResult === undefined;
  const permission = retryPermission(
    { exercise, masteryGate: meta.masteryGate },
    evidence,
  );
  const hintsRevealed = Math.max(
    0,
    ...evidence
      .filter(
        (row): row is SupportEventRecord =>
          row.kind === 'support_event' &&
          row.supportKind === 'hint_reveal' &&
          row.contentHash === meta.contentHash,
      )
      .map((row) => row.hintNumber ?? 0),
  );
  const runtimeBlocked =
    exerciseNeedsRuntime(exercise) && runtime.status() !== 'available';
  const showResult =
    latest !== undefined && latestResult !== undefined && !retrying;
  const formDisabled =
    !canWrite || busy !== 'none' || runtimeBlocked || unresolved || showResult;
  const shownDraft =
    showResult && latest !== undefined
      ? answerToDraft(exercise, latest.answer)
      : draft;
  const typeLabel = [
    copy.exerciseTypeLabels[exercise.response_mode],
    exercise.optional ? copy.text.optionalSuffix : null,
    exercise.evaluable ? null : copy.text.noPointsSuffix,
  ]
    .filter(Boolean)
    .join(' ');

  async function revealHint() {
    setBusy('hint');
    setNotice(null);

    try {
      await write(() =>
        recordSupportEvent({
          id: createEvidenceId('hint'),
          programmeId,
          contentVersion,
          subjectId: meta.subjectId,
          contentHash: meta.contentHash,
          supportKind: 'hint_reveal',
          hintNumber: hintsRevealed + 1,
        }),
      );
    } catch {
      setNotice(copy.text.hintNotSaved);
    } finally {
      setBusy('none');
    }
  }

  async function submit() {
    const answer = draftToAnswer(exercise, draft);

    if (answer === 'incomplete') {
      setNotice(copy.text.incomplete);
      return;
    }

    setBusy('submit');
    setNotice(null);

    let outcome: SubmissionOutcome;
    const attemptId = createEvidenceId('attempt');

    try {
      outcome = await write(() =>
        submitAnswer(
          {
            programmeId,
            contentVersion,
            exercise,
            contentHash: meta.contentHash,
            masteryGate: meta.masteryGate,
            runtime,
          },
          { attemptId, resultId: `result-${attemptId}`, answer },
        ),
      );
    } catch {
      outcome = { status: 'not_persisted', error: null };
    }

    if (outcome.status === 'refused') {
      setNotice(copy.text[refusalCopy[outcome.reason]]);
    } else if (outcome.status === 'not_persisted') {
      setNotice(copy.text.notSaved);
    } else {
      setRetrying(false);
      await onSubmitted().catch(() => undefined);
    }

    setBusy('none');
  }

  async function reopenTeaching() {
    if (onReopenTeaching === null) {
      return;
    }

    setBusy('reopen');

    try {
      await onReopenTeaching();
    } finally {
      setBusy('none');
    }
  }

  const result =
    showResult && latestResult !== undefined
      ? presentResult(
          exercise,
          latestResult,
          copy,
          (latest?.answer as { selected?: string[] }).selected ?? [],
        )
      : null;

  return (
    <div aria-labelledby={headingId} className={surfaces.exercise} role="group">
      <h3 id={headingId}>
        {formatCopy(copy, 'exerciseHeading', { n: number })} · {typeLabel}
      </h3>
      <Markup context={context} text={exercise.prompt} />
      {exercise.type === 'mcq' && exercise.code ? (
        <CodeView code={exercise.code} context={context} />
      ) : null}
      {closedLesson && alreadyCorrect ? (
        <p className="lesson-note">{copy.text.alreadyCorrect}</p>
      ) : null}
      {runtimeBlocked ? (
        <p className="lesson-note" role="note">
          {copy.text.runtimeUnavailable}
        </p>
      ) : null}
      <AnswerWidget
        context={context}
        copy={copy}
        disabled={formDisabled}
        draft={shownDraft}
        exercise={exercise}
        idPrefix={idPrefix}
        onChange={setDraft}
        seed={`${meta.subjectId}|${attempts.length + (showResult ? 0 : 1)}`}
      />
      {exercise.hints.length > 0 ? (
        <div className="lesson-hints">
          {exercise.hints.slice(0, hintsRevealed).map((hint, index) => (
            <div className="lesson-hint" key={index}>
              <p>
                <strong>
                  {formatCopy(copy, 'hintHeading', { n: index + 1 })}
                </strong>
              </p>
              <Markup context={context} text={hint} />
            </div>
          ))}
          {hintsRevealed < exercise.hints.length ? (
            <button
              className={surfaces.quiet}
              disabled={!canWrite || busy !== 'none'}
              onClick={() => void revealHint()}
              type="button"
            >
              {formatCopy(copy, 'hintButton', {
                n: hintsRevealed + 1,
                count: exercise.hints.length,
              })}
            </button>
          ) : null}
        </div>
      ) : null}
      {unresolved ? (
        <p className="lesson-note">{copy.text.unresolvedPending}</p>
      ) : null}
      {busy === 'submit' ? (
        <p className="lesson-note" role="status">
          {copy.text.saving}
        </p>
      ) : null}
      {notice !== null ? (
        <p className="form-field__error" role="alert">
          {notice}
        </p>
      ) : null}
      {result !== null ? (
        <div
          aria-label={copy.text.resultLabel}
          className={surfaces.result}
          role="status"
        >
          <p>
            <strong>{result.title}</strong>
          </p>
          {result.messages.map((message, index) => (
            <Markup context={context} key={index} text={message} />
          ))}
          {latestResult?.outcome === 'correct' ? (
            <CorrectExtras context={context} copy={copy} entry={entry} />
          ) : null}
        </div>
      ) : null}
      <div className="action-row">
        {showResult ? (
          permission === 'allowed' ? (
            <button
              className={surfaces.secondary}
              disabled={!canWrite || busy !== 'none'}
              onClick={() => {
                setDraft(answerToDraft(exercise, latest!.answer));
                setRetrying(true);
                setNotice(null);
              }}
              type="button"
            >
              {copy.text.retry}
            </button>
          ) : null
        ) : (
          <button
            aria-busy={busy === 'submit' || undefined}
            className={surfaces.primary}
            disabled={formDisabled}
            onClick={() => void submit()}
            type="button"
          >
            {copy.text.submit}
          </button>
        )}
        {showResult &&
        closedLesson &&
        latestResult?.outcome !== 'correct' &&
        onReopenTeaching !== null &&
        remediationTitle !== null ? (
          <button
            className={surfaces.quiet}
            disabled={!canWrite || busy !== 'none'}
            onClick={() => void reopenTeaching()}
            type="button"
          >
            {formatCopy(copy, 'remediation', { title: remediationTitle })}
          </button>
        ) : null}
      </div>
      {permission === 'blocked_gate_retry_rule_missing' && showResult ? (
        <p className="lesson-note">{copy.text.gateNoRetry}</p>
      ) : null}
    </div>
  );
}

function CorrectExtras({
  context,
  copy,
  entry,
}: {
  context: MarkupContext;
  copy: LessonUiCopy;
  entry: LessonExerciseEntry;
}) {
  const { exercise } = entry;

  if (exercise.type === 'predict') {
    return (
      <>
        <p>
          <strong>{copy.text.afterSubmitExplanation}</strong>
        </p>
        <CodeView code={exercise.explain_output} context={context} />
      </>
    );
  }

  if (exercise.type === 'diagnose' && exercise.fix !== null) {
    return (
      <>
        <CodeView code={exercise.fix.code} context={context} />
        <p>{copy.text.output}</p>
        <CodeView code={exercise.fix.output} context={context} />
      </>
    );
  }

  if (exercise.type === 'cmd' && exercise.effect) {
    return (
      <>
        <p>
          <InlineText context={context} text={`\`${exercise.canonical}\``} />
        </p>
        <CodeView code={exercise.effect} context={context} />
      </>
    );
  }

  return null;
}
