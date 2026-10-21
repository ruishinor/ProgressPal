/**
 * Derives, from a card's own data, the taps that solve it and the taps that
 * miss it, as accessible-name matchers. The jsdom tests and the Playwright
 * fit checks both drive every card of the real bank through these, so the
 * checks cover all cards and states rather than a hand-picked few. Pure data
 * in, matchers out; it imports nothing, so the Playwright project can load it
 * by path without sharing the application's `@/` alias.
 */

type Option = { readonly id: string; readonly label: string };
type Token = {
  readonly id: string;
  readonly text: string;
  readonly name?: string;
};

export type PlanCard =
  | { readonly kind: 'learn' }
  | {
      readonly kind: 'select';
      readonly options: readonly Option[];
      readonly correctId: string;
    }
  | {
      readonly kind: 'order';
      readonly items: readonly Option[];
      readonly correctOrder: readonly string[];
    }
  | {
      readonly kind: 'match';
      readonly pairs: readonly {
        readonly id: string;
        readonly left: string;
        readonly right: string;
      }[];
      readonly leftLabel: string;
      readonly rightLabel: string;
      readonly unusedRight?: readonly Option[];
    }
  | {
      readonly kind: 'tap';
      readonly lines: readonly {
        readonly number: number;
        readonly tokens: readonly Token[];
      }[];
      readonly correctTokenId: string;
    }
  | {
      readonly kind: 'assemble';
      readonly tokens: readonly Token[];
      readonly correctOrder: readonly string[];
    };

/** One tap: a button inside an optional named group, matched by its name. */
export type Tap = { group?: string; name: RegExp };

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A button's name is its own text, then optionally a spoken or marker suffix.
// The lines of a grouped answer are read as one name, a space apart.
const named = (text: string) =>
  new RegExp(`^${escape(text.replace(/\n/g, ' '))}(?:,| |$)`);

/** Cards that end with a deliberate "Sjekk" rather than on the last tap. */
export function needsCheck(card: PlanCard): boolean {
  return card.kind === 'order' || card.kind === 'assemble';
}

/** The first token of a card that is not the answer, then the next, ... */
function nthWrongToken(card: Extract<PlanCard, { kind: 'tap' }>, n: number) {
  return card.lines
    .flatMap((line) => line.tokens.map((token) => ({ line, token })))
    .filter(({ token }) => token.id !== card.correctTokenId)[n]!;
}

function tokenTap(line: { number: number }, token: Token): Tap {
  return { name: named(`Linje ${line.number}: ${token.name ?? token.text}`) };
}

function assembleTaps(
  card: Extract<PlanCard, { kind: 'assemble' }>,
  order: readonly string[],
) {
  const byId = new Map(card.tokens.map((token) => [token.id, token]));

  return order.map((id): Tap => {
    const token = byId.get(id)!;

    return {
      group: 'Deler',
      name: new RegExp(`^${escape(token.name ?? token.text.trim())}$`),
    };
  });
}

/** The taps that solve the card (before any "Sjekk"). */
export function rightTaps(card: PlanCard): Tap[] {
  switch (card.kind) {
    case 'learn':
      return [];
    case 'select':
      return [
        {
          name: named(card.options.find((o) => o.id === card.correctId)!.label),
        },
      ];
    case 'order':
      return card.correctOrder.map((id) => ({
        name: named(card.items.find((item) => item.id === id)!.label),
      }));
    case 'match':
      return card.pairs.flatMap((pair) => [
        { group: card.leftLabel, name: named(pair.left) },
        { group: card.rightLabel, name: named(pair.right) },
      ]);
    case 'tap': {
      const line = card.lines.find((l) =>
        l.tokens.some((t) => t.id === card.correctTokenId),
      )!;
      const token = line.tokens.find((t) => t.id === card.correctTokenId)!;

      return [tokenTap(line, token)];
    }
    case 'assemble':
      return assembleTaps(card, card.correctOrder);
  }
}

/**
 * The taps of the nth (0-based) distinct wrong answer. Select and Tap offer a
 * different wrong choice each time; Order and Assemble offer the reversed
 * sequence; Match offers a first left item paired with a different right one,
 * first with a choice that belongs to no pair when the card has one.
 */
export function wrongTaps(card: PlanCard, n = 0): Tap[] {
  switch (card.kind) {
    case 'learn':
      return [];
    case 'select':
      return [
        {
          name: named(
            card.options.filter((o) => o.id !== card.correctId)[n]!.label,
          ),
        },
      ];
    case 'order':
      return [...card.correctOrder].reverse().map((id) => ({
        name: named(card.items.find((item) => item.id === id)!.label),
      }));
    case 'match': {
      const [first, ...others] = card.pairs;
      const rights = [
        ...(card.unusedRight ?? []).map((option) => option.label),
        ...others.map((pair) => pair.right),
      ];

      return [
        { group: card.leftLabel, name: named(first!.left) },
        { group: card.rightLabel, name: named(rights[n]!) },
      ];
    }
    case 'tap': {
      const { line, token } = nthWrongToken(card, n);

      return [tokenTap(line, token)];
    }
    case 'assemble':
      return assembleTaps(card, [...card.correctOrder].reverse());
  }
}
