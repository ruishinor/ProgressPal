import { useEffect, useRef, type ReactNode } from 'react';

export type MicroFeedbackState =
  | 'idle'
  | 'bridge'
  | 'correct'
  | 'incorrect'
  | 'hint'
  | 'revealed';

export type MicroFeedback = {
  state: MicroFeedbackState;
  /** Spoken and shown, so the state never depends on colour or an icon. */
  label?: string;
  message: ReactNode;
};

const icons: Partial<Record<MicroFeedbackState, string>> = {
  correct: '✓',
  incorrect: '✗',
};

/**
 * The fixed anatomy of every card: a body that fits the space the shell gives
 * it at normal text size (what the card says on top, what the learner acts on
 * below, next to the thumb), and a footer that always holds the feedback strip
 * and the one action. Answer, feedback and Next change what the footer says;
 * they never add height. Neither the body nor the footer clips or scrolls: at
 * larger text they grow and the shell scrolls. The title takes focus when a
 * card mounts, so a keyboard or screen-reader learner lands on the new card
 * instead of on a removed control.
 */
export function CardFrame({
  action,
  children,
  context,
  feedback,
  kindLabel,
  prompt,
  title,
}: {
  action?: ReactNode;
  /** The interaction: tap targets the learner acts on. */
  children?: ReactNode;
  context?: string;
  /** Absent on screens that only choose or finish (picker, done). */
  feedback?: MicroFeedback;
  kindLabel: string;
  /** What the card shows above the interaction: code, an error, an idea. */
  prompt?: ReactNode;
  title: string;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const icon = feedback === undefined ? undefined : icons[feedback.state];

  useEffect(() => {
    const heading = headingRef.current;
    const shell = heading?.closest('.micro');

    heading?.focus({ preventScroll: true });
    // The shell outlives a card: a new card starts at its top even when the
    // last one was left scrolled down (larger text only; otherwise a no-op).
    if (shell) {
      shell.scrollTop = 0;
    }
  }, []);

  return (
    <section aria-labelledby="micro-card-title" className="micro-card">
      <div className="micro-card__body">
        <div className="micro-card__prompt">
          <p className="micro-card__kind">{kindLabel}</p>
          <h1
            className="micro-card__title"
            id="micro-card-title"
            ref={headingRef}
            tabIndex={-1}
          >
            {title}
          </h1>
          {context === undefined ? null : (
            <p className="micro-card__text">{context}</p>
          )}
          {prompt}
        </div>
        {children === undefined ? null : (
          <div className="micro-card__play">{children}</div>
        )}
      </div>
      {feedback === undefined && action === undefined ? null : (
        <div className="micro-card__foot">
          {feedback === undefined ? null : (
            <div
              aria-live="polite"
              className="micro-feedback"
              data-state={feedback.state}
              role="status"
            >
              <p>
                {icon === undefined ? null : <b aria-hidden="true">{icon} </b>}
                {feedback.label === undefined ? null : (
                  <strong>{feedback.label} </strong>
                )}
                {feedback.message}
              </p>
            </div>
          )}
          {action}
        </div>
      )}
    </section>
  );
}
