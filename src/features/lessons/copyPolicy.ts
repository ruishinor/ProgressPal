/**
 * What a preformatted block is, which decides whether Copy is offered. Copy
 * is an explicit property of the role, never inferred from the fact that the
 * text is preformatted.
 *
 * - `source`: code the learner may reasonably type into an editor. Copyable.
 * - `terminal`: a transcript (prompt, command and output together). Not
 *   text to carry anywhere, so no Copy.
 * - `output`: what a program printed, shown for comparison. No Copy.
 * - `error`: what Python or the shell reported. No Copy.
 */
export type PreformattedRole = 'source' | 'terminal' | 'output' | 'error';

export const copyableRoles = {
  source: true,
  terminal: false,
  output: false,
  error: false,
} as const satisfies Readonly<Record<PreformattedRole, boolean>>;
