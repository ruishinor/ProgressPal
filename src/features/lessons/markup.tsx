import { Fragment, type ReactNode } from 'react';

/**
 * A small, purpose-built renderer for the markup the authored lessons use:
 * inline code, **bold**, *italic*, `#`–`###` headings, `-` and numbered
 * lists (one nesting level), paragraphs and fenced code. It produces React
 * text nodes and elements only, so authored text such as `<module>` or
 * `<class 'str'>` is always text and raw HTML is never injected. Code keeps
 * whitespace exactly and carries the technical language.
 */

export type MarkupContext = {
  readonly technicalLanguage: string;
  /** Learner-wording rules for prose; never applied to code. */
  readonly wording: (text: string) => string;
  /** Heading level used for `#`/`##` lines inside a lesson. */
  readonly headingLevel: 3 | 4;
};

const inlinePattern = /`([^`]+)`|\*\*([^*]+?)\*\*|\*([^*\s][^*]*?)\*/g;

export function InlineText({
  context,
  text,
}: {
  context: MarkupContext;
  text: string;
}) {
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(inlinePattern)) {
    const start = match.index ?? 0;

    if (start > cursor) {
      parts.push(context.wording(text.slice(cursor, start)));
    }

    if (match[1] !== undefined) {
      parts.push(
        <code key={start} lang={context.technicalLanguage}>
          {match[1]}
        </code>,
      );
    } else if (match[2] !== undefined) {
      parts.push(
        <strong key={start}>
          <InlineText context={context} text={match[2]} />
        </strong>,
      );
    } else if (match[3] !== undefined) {
      parts.push(
        <em key={start}>
          <InlineText context={context} text={match[3]} />
        </em>,
      );
    }

    cursor = start + match[0].length;
  }

  if (cursor < text.length) {
    parts.push(context.wording(text.slice(cursor)));
  }

  return <>{parts}</>;
}

type ListItem = { text: string; children: string[] };
type MarkupNode =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; depth: number; text: string }
  | { kind: 'list'; ordered: boolean; items: ListItem[] }
  | { kind: 'fence'; text: string };

const listLine = /^(\s*)(-|\d+\.)\s+(.*)$/;

function parseMarkup(text: string): MarkupNode[] {
  const nodes: MarkupNode[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      nodes.push({ kind: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;

    if (line.trimStart().startsWith('```')) {
      flushParagraph();
      const fenced: string[] = [];
      index += 1;

      while (
        index < lines.length &&
        !lines[index]!.trimStart().startsWith('```')
      ) {
        fenced.push(lines[index]!);
        index += 1;
      }

      nodes.push({ kind: 'fence', text: fenced.join('\n') });
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);

    if (heading !== null) {
      flushParagraph();
      nodes.push({
        kind: 'heading',
        depth: heading[1]!.length,
        text: heading[2]!,
      });
      continue;
    }

    const item = line.match(listLine);

    if (item !== null) {
      flushParagraph();
      const ordered = /\d/.test(item[2]!);
      const nested = item[1]!.length > 0;
      const previous = nodes.at(-1);

      if (nested && previous?.kind === 'list') {
        previous.items.at(-1)?.children.push(item[3]!);
      } else if (previous?.kind === 'list' && previous.ordered === ordered) {
        previous.items.push({ text: item[3]!, children: [] });
      } else {
        nodes.push({
          kind: 'list',
          ordered,
          items: [{ text: item[3]!, children: [] }],
        });
      }
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  return nodes;
}

export function Markup({
  context,
  text,
}: {
  context: MarkupContext;
  text: string;
}) {
  return (
    <>
      {parseMarkup(text).map((node, index) => {
        switch (node.kind) {
          case 'paragraph':
            return (
              <p key={index}>
                <InlineText context={context} text={node.text} />
              </p>
            );
          case 'heading': {
            const Heading =
              node.depth >= 3 && context.headingLevel === 3
                ? 'h4'
                : (`h${context.headingLevel}` as 'h3' | 'h4');
            return (
              <Heading key={index}>
                <InlineText context={context} text={node.text} />
              </Heading>
            );
          }
          case 'list': {
            const List = node.ordered ? 'ol' : 'ul';
            return (
              <List key={index}>
                {node.items.map((entry, itemIndex) => (
                  <li key={itemIndex}>
                    <InlineText context={context} text={entry.text} />
                    {entry.children.length > 0 ? (
                      <ul>
                        {entry.children.map((child, childIndex) => (
                          <li key={childIndex}>
                            <InlineText context={context} text={child} />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </List>
            );
          }
          case 'fence':
            return (
              <pre key={index} tabIndex={0} lang={context.technicalLanguage}>
                <code>{node.text}</code>
              </pre>
            );
        }

        return <Fragment key={index} />;
      })}
    </>
  );
}
