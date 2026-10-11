import { useId, useState } from 'react';

import type { LessonTextBlock, LessonUiCopy } from '@/lib/domain';

import { transcriptHeading } from './codeLabels';
import { LeadingSpaceNote } from './LeadingSpaceNote';
import { copyableRoles, type PreformattedRole } from './copyPolicy';
import { InlineText, Markup, type MarkupContext } from './markup';
import { formatCopy } from './model';
import { useLessonSurfaces } from './presentation';

/**
 * Renders the authored, non-exercise step kinds (DC-01, DC-02): orientation,
 * text, callouts, executed terminal sessions, code with expected output,
 * parsed error transcripts, tables, worked examples, documented-but-
 * unreproduced transcripts with their source, and recaps. Code, commands and
 * tool output keep whitespace, case and quotes exactly as authored and are
 * never executed by being displayed. Whether a block offers Copy is decided by
 * its role, never by the fact that it is preformatted.
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
  role,
  text,
}: {
  context: MarkupContext;
  copy: LessonUiCopy;
  label?: string;
  role: PreformattedRole;
  text: string;
}) {
  const labelId = useId();

  return (
    <div
      aria-labelledby={label === undefined ? undefined : labelId}
      className={`lesson-pre lesson-pre--${role}`}
      role={label === undefined ? undefined : 'group'}
    >
      {label === undefined ? null : (
        <p className="lesson-note" id={labelId}>
          {label}
        </p>
      )}
      <pre tabIndex={0} lang={context.technicalLanguage}>
        <code>{text}</code>
      </pre>
      {role === 'source' ? <LeadingSpaceNote code={text} copy={copy} /> : null}
      {copyableRoles[role] ? <CopyButton copy={copy} text={text} /> : null}
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

/**
 * Small inline glyphs, one per callout kind, so the kind is never carried by
 * colour alone (the label stays the primary signal). They are decorative.
 */
const calloutGlyphs: Readonly<Record<string, string>> = {
  tip: 'M12 3.5a5.5 5.5 0 0 0-3 10.1V16h6v-2.4A5.5 5.5 0 0 0 12 3.5ZM9.5 19h5M10.5 21h3',
  merk: 'M6 4.5h12v15H6zM9 9h6M9 12.5h6M9 16h3.5',
  'pass-paa': 'M12 4 2.8 19.5h18.4L12 4ZM12 10v4.5M12 17v.2',
  veikart: 'M5 21V4M5 5h11l-2 3.5 2 3.5H5',
  hjelp:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17v.2',
  norsk:
    'M4 6h9M8.5 4v2M6 6c.5 3 2.5 5.5 5.5 7M11 6c-.5 3-2.5 5.5-5.5 7M13 20l4-9 4 9M14.5 17h5',
};

function CalloutGlyph({ kind }: { kind: string }) {
  const path = calloutGlyphs[kind] ?? calloutGlyphs.merk!;

  return (
    <svg
      aria-hidden="true"
      className="lesson-callout__glyph"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d={path} />
    </svg>
  );
}

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
        <div
          className={`${surfaces.callout} lesson-callout--${block.kind}`}
          role="note"
        >
          <p className="lesson-callout__label">
            <CalloutGlyph kind={block.kind} />
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
            label={copy.text.terminalLabel}
            role="terminal"
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
            role="source"
            text={block.code}
          />
          {block.stdout ? (
            <Preformatted
              context={context}
              copy={copy}
              label={copy.text.output}
              role="output"
              text={block.stdout}
            />
          ) : null}
          {block.error ? (
            <Preformatted
              context={context}
              copy={copy}
              label={transcriptHeading(
                copy,
                block.error,
                copy.text.errorOutput,
              )}
              role="error"
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
            role="source"
            text={block.code}
          />
          <Preformatted
            context={context}
            copy={copy}
            label={transcriptHeading(
              copy,
              block.terminal,
              copy.text.errorOutput,
            )}
            role="error"
            text={block.terminal}
          />
          <Caption context={context} text={block.nb} />
        </figure>
      );
    case 'doc-terminal':
      return (
        <figure className="lesson-figure">
          <Preformatted
            context={context}
            copy={copy}
            label={transcriptHeading(copy, block.text, undefined)}
            role="terminal"
            text={block.text}
          />
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
                    label={copy.text.sourceLabel}
                    role="source"
                    text={step.code}
                  />
                ) : null}
                {step.session ? (
                  <Preformatted
                    context={context}
                    copy={copy}
                    label={copy.text.terminalLabel}
                    role="terminal"
                    text={sessionText(step.session)}
                  />
                ) : null}
                {step.stdout ? (
                  <Preformatted
                    context={context}
                    copy={copy}
                    label={copy.text.output}
                    role="output"
                    text={step.stdout}
                  />
                ) : null}
                {step.error ? (
                  <Preformatted
                    context={context}
                    copy={copy}
                    label={transcriptHeading(
                      copy,
                      step.error,
                      copy.text.errorOutput,
                    )}
                    role="error"
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
