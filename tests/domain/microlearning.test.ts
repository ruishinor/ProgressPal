import { describe, expect, it } from 'vitest';

import {
  findMicrolearningBankIssues,
  type MicroCard,
  type MicroSession,
  type MicrolearningBank,
} from '@/lib/domain';

/**
 * The bank validator fails closed on every shape a renderer would otherwise
 * have to guess about. Each case breaks exactly one rule of an otherwise
 * valid session, so a passing test names the rule that caught it.
 */

const units = new Set(['s1-m02']);
const source = {
  moduleId: 's1-m02',
  lessonUnitIds: ['S1-M02-L01'],
  skillIds: ['SK-VAR-01'],
};
const practice = {
  role: 'scaffold',
  source,
  hint: 'Tips.',
  explanation: 'Fordi.',
} as const;

const learn: MicroCard = {
  kind: 'learn',
  id: 'l1',
  title: 'Lær noe',
  role: 'explain',
  source,
  idea: 'Idé.',
  example: { code: 'x = 1', note: 'Note.' },
  bridge: 'Neste: prøv selv.',
};
const select: MicroCard = {
  ...practice,
  kind: 'select',
  id: 's1',
  title: 'Hva skrives ut?',
  options: [
    { id: 'a', label: '1' },
    { id: 'b', label: '2' },
  ],
  correctId: 'a',
};
const order: MicroCard = {
  ...practice,
  kind: 'order',
  id: 'o1',
  title: 'Sett i rekkefølge',
  items: [
    { id: 'b', label: 'B' },
    { id: 'a', label: 'A' },
    { id: 'c', label: 'C' },
  ],
  correctOrder: ['a', 'b', 'c'],
};
const match: MicroCard = {
  ...practice,
  kind: 'match',
  id: 'm1',
  title: 'Koble',
  leftLabel: 'L',
  rightLabel: 'R',
  pairs: [
    { id: 'a', left: '1', right: 'en' },
    { id: 'b', left: '2', right: 'to' },
    { id: 'c', left: '3', right: 'tre' },
  ],
  rightOrder: ['b', 'c', 'a'],
};
const tap: MicroCard = {
  ...practice,
  kind: 'tap',
  id: 't1',
  title: 'Trykk på feilen',
  lines: [
    {
      number: 1,
      tokens: [
        { id: 'x', text: 'x' },
        { id: 'y', text: 'y' },
      ],
    },
  ],
  correctTokenId: 'x',
};
const assemble: MicroCard = {
  ...practice,
  kind: 'assemble',
  id: 'a1',
  title: 'Bygg linjen',
  tokens: [
    { id: 'two', text: '2' },
    { id: 'one', text: '1' },
  ],
  correctOrder: ['one', 'two'],
};

function session(cards: MicroCard[], overrides: Partial<MicroSession> = {}) {
  return {
    id: 'okt',
    title: 'Økt',
    summary: 'Kort.',
    minutes: 5,
    cards,
    ...overrides,
  } satisfies MicroSession;
}

const valid: MicroSession = session([
  learn,
  select,
  order,
  match,
  tap,
  assemble,
]);

function issues(next: MicroSession): string[] {
  return findMicrolearningBankIssues({ sessions: [next] }, units);
}

function replaceCard(id: string, patch: Record<string, unknown>): MicroSession {
  return session(
    valid.cards.map((card) =>
      card.id === id ? ({ ...card, ...patch } as MicroCard) : card,
    ),
  );
}

describe('findMicrolearningBankIssues', () => {
  it('accepts a well-formed session', () => {
    expect(issues(valid)).toEqual([]);
  });

  it('rejects a fifth session: the picker is one screen and does not scroll', () => {
    const sessions = ['a', 'b', 'c', 'd', 'e'].map((id) => ({
      ...valid,
      id,
      cards: valid.cards.map((card) => ({ ...card, id: `${id}-${card.id}` })),
    }));

    expect(findMicrolearningBankIssues({ sessions }, units)).toContain(
      'microlearning bank offers more than four sessions',
    );
    expect(
      findMicrolearningBankIssues({ sessions: sessions.slice(0, 4) }, units),
    ).toEqual([]);
  });

  it('rejects an empty bank and a session of the wrong size', () => {
    const empty: MicrolearningBank = { sessions: [] };

    expect(findMicrolearningBankIssues(empty, units)).toContain(
      'microlearning bank has no sessions',
    );
    expect(issues(session([learn, select, order]))).toContain(
      'session "okt" needs four to eight cards',
    );
  });

  it('rejects a duplicate card ID', () => {
    expect(
      issues(
        session([learn, select, { ...order, id: 's1' }, match, tap]),
      ).join(),
    ).toMatch(/card "s1" needs a unique lowercase ID/);
  });

  it('rejects a card that cites a module the programme lacks', () => {
    const elsewhere = { ...source, moduleId: 's9-m09' };

    expect(issues(replaceCard('s1', { source: elsewhere })).join()).toMatch(
      /not a catalogue unit/,
    );
  });

  it('rejects missing lesson units or malformed skill IDs', () => {
    expect(
      issues(replaceCard('s1', { source: { ...source, lessonUnitIds: [] } })),
    ).toContain('card "s1" needs lesson units and skill IDs');
    expect(
      issues(replaceCard('s1', { source: { ...source, skillIds: ['var-1'] } })),
    ).toContain('card "s1" needs lesson units and skill IDs');
  });

  it('rejects a Learn card with no bridge or no practice after it', () => {
    expect(issues(replaceCard('l1', { bridge: '  ' }))).toContain(
      'card "l1" has no bridge into the practice that follows',
    );
    expect(issues(session([select, order, match, tap, learn])).join()).toMatch(
      /Learn card "l1" must be followed by a practice card/,
    );
  });

  it('rejects an answer that is not among the options', () => {
    expect(issues(replaceCard('s1', { correctId: 'zzz' })).join()).toMatch(
      /options must be unique and include the answer/,
    );
  });

  it('rejects a Select with too many options for one phone card', () => {
    const many = ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id }));

    expect(issues(replaceCard('s1', { options: many })).join()).toMatch(
      /needs two or three options/,
    );
  });

  it('rejects an Order that is not a permutation or is shown solved', () => {
    expect(
      issues(replaceCard('o1', { correctOrder: ['a', 'b'] })).join(),
    ).toMatch(/answer must order every step exactly once/);
    expect(
      issues(
        replaceCard('o1', {
          items: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
            { id: 'c', label: 'C' },
          ],
        }),
      ).join(),
    ).toMatch(/already in answer order/);
  });

  it('rejects a Match whose right column is not a permutation or is unshuffled', () => {
    expect(
      issues(replaceCard('m1', { rightOrder: ['a', 'b'] })).join(),
    ).toMatch(/right column must list every pair once/);
    expect(
      issues(replaceCard('m1', { rightOrder: ['a', 'b', 'c'] })).join(),
    ).toMatch(/already in pair order/);
  });

  it('rejects a Tap whose answer is not a token', () => {
    expect(
      issues(replaceCard('t1', { correctTokenId: 'nope' })).join(),
    ).toMatch(/answer is not one of its tokens/);
  });

  it('rejects an Assemble that reuses or invents a token', () => {
    expect(
      issues(replaceCard('a1', { correctOrder: ['one', 'one'] })).join(),
    ).toMatch(/at most once/);
    expect(
      issues(replaceCard('a1', { correctOrder: ['one', 'x'] })).join(),
    ).toMatch(/at most once/);
  });

  it('rejects a practice card with no hint or a hint that repeats the explanation', () => {
    expect(issues(replaceCard('s1', { hint: '' })).join()).toMatch(
      /needs a hint and an explanation/,
    );
    expect(
      issues(
        replaceCard('s1', { hint: 'Samme.', explanation: 'Samme.' }),
      ).join(),
    ).toMatch(/hint repeats the explanation/);
  });
});
