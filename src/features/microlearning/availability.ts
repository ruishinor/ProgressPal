import type { MicroSession, MicrolearningBank } from '@/lib/domain';

/**
 * What the learner may open, worked out by the app layer from the Campaign's
 * own position (`selectPrimer`, `listReinforcementSessions`): at most one
 * primer, and the reinforcement sessions narrowed to the topics they have
 * reached. The page only receives the answer: it never reads app state or
 * storage.
 */
export type MicroAvailability =
  | { readonly status: 'loading' }
  | { readonly status: 'failed' }
  | {
      readonly status: 'ready';
      readonly primerId: string | null;
      readonly repeatSessions: readonly MicroSession[];
    };

/**
 * Where the learner is: the picker (`null`), the «Øv igjen» list on its own
 * screen (`list`, only when the picker is too full to hold it, see
 * `listsRepeatApart`), or one session at a card index, where `cards.length`
 * is its finished screen.
 */
export type MicroStep =
  | { readonly sessionId: string; readonly index: number }
  | { readonly list: 'repeat' }
  | null;

/**
 * The picker is one screen on a small phone, and it holds four rows. When
 * the primer and the «Øv igjen» sessions together need more, «Øv igjen» is
 * one row that opens its own list, so nothing is shortened to fit.
 */
const pickerRows = 4;

/**
 * Every session the learner may open now, the primer first: exactly what the
 * picker lists, so an address can be checked against it. Nothing while the
 * answer is loading or failed.
 */
export function listOpenMicroSessions(
  bank: MicrolearningBank | undefined,
  availability: MicroAvailability,
): MicroSession[] {
  if (bank === undefined || availability.status !== 'ready') {
    return [];
  }
  const primer = bank.primers?.find(
    (entry) => entry.id === availability.primerId,
  );

  return [
    ...(primer === undefined ? [] : [primer]),
    ...availability.repeatSessions,
  ];
}

/** Whether «Øv igjen» has its own screen (more than the picker's rows). */
export function listsRepeatApart(
  bank: MicrolearningBank | undefined,
  availability: MicroAvailability,
): boolean {
  return (
    availability.status === 'ready' &&
    listOpenMicroSessions(bank, availability).length > pickerRows &&
    availability.repeatSessions.length > 1
  );
}
