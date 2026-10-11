import type { LessonUiCopy } from '@/lib/domain';

/**
 * What a preformatted block is, said in words: a Python source file, or a real
 * transcript from the terminal. These helpers add only headings and a note
 * beside the code; the text itself is never changed, so display, selection and
 * Copy keep every authored byte.
 */

/** The number of spaces the first line starts with (0 when it does not). */
export function leadingSpaces(text: string): number {
  return /^ +(?=\S)/.exec(text)?.[0].length ?? 0;
}

/** True for a transcript that shows a PowerShell prompt. */
export function isPowerShellTranscript(text: string): boolean {
  return text.startsWith('PS ');
}

/**
 * The heading of a transcript: the PowerShell terminal when it shows its
 * prompt, otherwise the fallback (a bare traceback is an error message, not
 * the terminal session).
 */
export function transcriptHeading(
  copy: LessonUiCopy,
  text: string,
  fallback: string | undefined,
): string | undefined {
  return isPowerShellTranscript(text) ? copy.text.terminalLabel : fallback;
}
