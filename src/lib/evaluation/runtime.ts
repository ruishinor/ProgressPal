/**
 * The Python execution boundary for the 49 runtime-dependent exercises
 * (42 `program`, 7 `testtable`). No runtime is selected or shipped: the
 * bounded runtime spike decides the smallest safe client-side capability,
 * and until an owner decision accepts one, executable evaluation is
 * unavailable (Epic E prompt §4.2–§4.5). Learner code is never sent to a
 * server.
 *
 * A runtime must reproduce the authoring harness: the program is saved as
 * the exercise's file name, run with the test's stdin, and `input()` echoes
 * what it read, so stdout is the interactive transcript the authored
 * expectations were recorded from.
 */

export type PythonRunRequest = {
  readonly source: string;
  readonly file: string;
  readonly stdin: string;
  /** The authored `timeout_s`, enforced by the runtime. */
  readonly timeoutMs: number;
};

export type PythonRunResult =
  | {
      readonly kind: 'completed';
      readonly exitCode: number;
      readonly stdout: string;
      readonly stderr: string;
    }
  /** The runtime stopped the program at its time limit. */
  | { readonly kind: 'timeout' }
  /** Initialization failure, worker crash, missing asset or similar. */
  | { readonly kind: 'failed'; readonly reason: string };

export type PythonRuntime = {
  /** Whether evaluation can run now. Checked before a submit is accepted. */
  status(): 'available' | 'unavailable';
  run(request: PythonRunRequest): Promise<PythonRunResult>;
};

/** The production runtime until the spike outcome is accepted: none. */
export const unavailablePythonRuntime: PythonRuntime = Object.freeze({
  status: () => 'unavailable' as const,
  run: async (): Promise<PythonRunResult> => ({
    kind: 'failed',
    reason: 'Executable evaluation is not available.',
  }),
});

export function getPythonRuntime(): PythonRuntime {
  return unavailablePythonRuntime;
}
