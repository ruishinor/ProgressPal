import { useState } from 'react';

import type { LessonTextBlock, LessonUiCopy } from '@/lib/domain';

import { InlineText, Markup, type MarkupContext } from './markup';
import { formatCopy } from './model';
import { useLessonSurfaces } from './presentation';

/**
 * Renders the authored, non-exercise step kinds (DC-01, DC-02): orientation,
 * text, callouts, executed terminal sessions, code with expected output,
 * parsed error transcripts, tables, worked examples, documented-but-
 * unreproduced transcripts with their source, and recaps. Code, commands and
 * tool output keep whitespace, case and quotes exactly as authored, are
 * copyable, and are never executed by being displayed.
 */

function CopyButton({ copy, text }: { copy: LessonUiCopy; text: string }) {
  const surfaces = useLessonSurfaces();
  const [copied, setCopied] = useState(false);
  const clipboard =
    typeof navigator === 'undefined' ? undefined : navigator.clipboard;

  if (clipboard === undefined) {
    return null;
  }

  return (
    <button
      className={`${surfaces.quiet} lesson-copy`}
      onClick={() => {
        void clipboard.writeText(text).then(
          () => setCopied(true),
          () => setCopied(false),
        );
      }}
      type="button"
    >
      {copied ? copy.text.copied : copy.text.copyCode}
    </button>
  );
}

function Preformatted({
  context,
  copy,
  label,
  text,
}: {
  context: MarkupContext;
  copy: LessonUiCopy;
  label?: string;
  text: string;
}) {
  return (
    <div className="lesson-pre">
      {label === undefined ? null : <p className="lesson-note">{label}</p>}
      <pre lang={context.technicalLanguage}>
        <code>{text}</code>
      </pre>
      <CopyButton copy={copy} text={text} />
    </div>
  );
}

function Caption({ context, text }: { context: MarkupContext; text: string }) {
  return text.trim() === '' ? null : (
    <div className="lesson-note">
      <Markup context={context} text={text} />
    </div>
  );
}

const sessionText = (
  session: ReadonlyArray<{ prompt: string; cmd: string; out: string }>,
) =>
  session
    .map(
      (step) => `${step.prompt}${step.cmd}${step.out ? `\n${step.out}` : ''}`,
    )
    .join('\n');

export function LessonTextBlockView({
  block,
  context,
  copy,
}: {
  block: LessonTextBlock;
  context: MarkupContext;
  copy: LessonUiCopy;
}) {
  const surfaces = useLessonSurfaces();

  switch (block.t) {
    case 'orient':
    case 'text':
      return (
        <div className="lesson-text">
          <Markup context={context} text={block.nb} />
        </div>
      );
    case 'callout':
      return (
        // A note, not a landmark: callouts sit inside the page landmarks.
        <div className={surfaces.callout} role="note">
          <p>
            <strong>{copy.calloutLabels[block.kind] ?? block.kind}</strong>
          </p>
          <Markup context={context} text={block.nb} />
        </div>
      );
    case 'terminal':
      return (
        <figure className="lesson-figure">
          <Preformatted
            context={context}
            copy={copy}
            text={sessionText(block.session)}
          />
          <Caption context={context} text={block.nb} />
        </figure>
      );
    case 'code':
      return (
        <figure className="lesson-figure">
          <Preformatted
            context={context}
            copy={copy}
            label={formatCopy(copy, 'fileLabel', { file: block.file })}
            text={block.code}
          />
          {block.stdout ? (
            <Preformatted
              context={context}
              copy={copy}
              label={copy.text.output}
              text={block.stdout}
            />
          ) : null}
          {block.error ? (
            <Preformatted
              context={context}
              copy={copy}
              label={copy.text.errorOutput}
              text={block.error}
            />
          ) : null}
          <Caption context={context} text={block.nb} />
        </figure>
      );
    case 'error':
      return (
        <figure className="lesson-figure">
          <Preformatted
            context={context}
            copy={copy}
            label={formatCopy(copy, 'fileLabel', { file: block.file })}
            text={block.code}
          />
          <Preformatted context={context} copy={copy} text={block.terminal} />
          <Caption context={context} text={block.nb} />
        </figure>
      );
    case 'doc-terminal':
      return (
        <figure className="lesson-figure">
          <Preformatted context={context} copy={copy} text={block.text} />
          <Caption context={context} text={block.nb} />
          <p className="lesson-note">
            {formatCopy(copy, 'unverifiedTranscript', { source: block.source })}
          </p>
        </figure>
      );
    case 'table':
      return (
        <div className="lesson-table">
          <table className="insights-table">
            <thead>
              <tr>
                {block.columns.map((column, index) => (
                  <th key={index} scope="col">
                    <InlineText context={context} text={column} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      <InlineText context={context} text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <Caption context={context} text={block.nb} />
        </div>
      );
    case 'worked':
      return (
        <section className={surfaces.worked}>
          <p>
            <strong>
              <InlineText context={context} text={block.title} />
            </strong>
          </p>
          <ol>
            {block.steps.map((step, index) => (
              <li key={index}>
                <Markup context={context} text={step.say} />
                {step.code ? (
                  <Preformatted
                    context={context}
                    copy={copy}
                    text={step.code}
                  />
                ) : null}
                {step.session ? (
                  <Preformatted
                    context={context}
                    copy={copy}
                    text={sessionText(step.session)}
                  />
                ) : null}
                {step.stdout ? (
                  <Preformatted
                    context={context}
                    copy={copy}
                    label={copy.text.output}
                    text={step.stdout}
                  />
                ) : null}
                {step.error ? (
                  <Preformatted
                    context={context}
                    copy={copy}
                    text={step.error}
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      );
    case 'recap':
      return (
        <section className={surfaces.recap}>
          <p>
            <strong>{copy.text.recapCan}</strong>
          </p>
          <ul>
            {block.can.map((entry, index) => (
              <li key={index}>
                <InlineText context={context} text={entry} />
              </li>
            ))}
          </ul>
          <p>
            <strong>{copy.text.recapNext}</strong>{' '}
            <InlineText context={context} text={block.next} />
          </p>
        </section>
      );
  }
}
