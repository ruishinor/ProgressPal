import type { LessonUiCopy } from '@/lib/domain';

import { leadingSpaces } from './codeLabels';
import { formatCopy } from './model';

const countWords = ['null', 'ett', 'to', 'tre', 'fire', 'fem'] as const;

/**
 * The one visible sign of a leading space in the teaching view. A note says
 * what it is and shows the first line with each space as a marker (·). The
 * marker is not part of the code, the copy text or any transcript.
 */
export function LeadingSpaceNote({
  code,
  copy,
}: {
  code: string;
  copy: LessonUiCopy;
}) {
  const count = leadingSpaces(code);

  if (count === 0) {
    return null;
  }

  const firstLine = code.split('\n', 1)[0]!;
  const marked = `${'·'.repeat(count)}${firstLine.slice(count)}`;

  return (
    <p className="lesson-note">
      {formatCopy(copy, 'leadingSpaceNote', {
        count: count === 1 ? countWords[1] : count,
      })}{' '}
      <code aria-hidden="true" className="lesson-mono">
        {marked}
      </code>
    </p>
  );
}
