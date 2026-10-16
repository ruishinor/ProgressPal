import { describe, expect, it } from 'vitest';

import {
  findMicrolearningBankIssues,
  listPrimerOnlyCards,
  listReinforcementSessions,
  listSessionCampaignItems,
  mapLessonUnitsToCampaignItems,
  selectPrimer,
  type MicroCard,
  type MicroPrimer,
  type MicroSession,
  type MicrolearningBank,
} from '@/lib/domain';

import { campaignPosition } from '../support/campaignPosition';

/**
 * Availability is a pure read of the Campaign's own position against the
 * authored order. «Repeter» opens a session once every Campaign item its
 * cards come from has been reached; «Forbered deg» offers at most one primer
 * and never one that looks further ahead than the next step. A small
 * synthetic programme, so each rule can fail on its own.
 */

// Authored order: five required missions and one optional one.
const index = {
  modules: [
    {
      missions: [
        { itemId: 'i-1', missionId: 'M-1', optional: false },
        { itemId: 'i-2', missionId: 'M-2', optional: false },
        { itemId: 'i-3', missionId: 'M-3', optional: false },
        { itemId: 'i-opt', missionId: 'M-OPT', optional: true },
        { itemId: 'i-4', missionId: 'M-4', optional: false },
        { itemId: 'i-5', missionId: 'M-5', optional: false },
      ],
    },
  ],
  units: [
    { unitId: 'U-1', missionId: 'M-1' },
    { unitId: 'U-2', missionId: 'M-2' },
    { unitId: 'U-3a', missionId: 'M-3' },
    { unitId: 'U-3b', missionId: 'M-3' },
    { unitId: 'U-4', missionId: 'M-4' },
    { unitId: 'U-5', missionId: 'M-5' },
  ],
} as never;
const items = ['i-1', 'i-2', 'i-3', 'i-4', 'i-5'];
const at = (reach: Parameters<typeof campaignPosition>[1]) =>
  campaignPosition(index, reach);

const source = (...lessonUnitIds: string[]) => ({
  lessonUnitIds,
  moduleId: 'm',
  skillIds: ['SK-VAR-01'],
});
const learn = (id: string, ...units: string[]): MicroCard => ({
  bridge: 'Neste: prøv selv.',
  example: { code: 'x', note: 'n' },
  id,
  idea: 'i',
  kind: 'learn',
  role: 'explain',
  source: source(...units),
  title: 't',
});
const check = (id: string, ...units: string[]): MicroCard => ({
  correctId: 'a',
  explanation: 'Fordi.',
  hint: 'Tips.',
  id,
  kind: 'select',
  options: [
    { id: 'a', label: '1' },
    { id: 'b', label: '2' },
  ],
  role: 'scaffold',
  source: source(...units),
  title: 't',
});
const session = (id: string, cards: MicroCard[]): MicroSession => ({
  cards,
  id,
  minutes: 5,
  summary: 's',
  title: id,
});
const primer = (
  id: string,
  prepares: string[],
  cards: MicroCard[],
): MicroPrimer => ({ ...session(id, cards), minutes: 2, prepares });

const learnOne = learn('l1', 'U-1');
const checkOne = check('c1', 'U-1');
const bank: MicrolearningBank = {
  primers: [
    primer('p-first', ['i-1', 'i-2'], [learnOne, checkOne]),
    primer('p-third', ['i-3'], [learn('l3', 'U-3a'), check('c3', 'U-3a')]),
    primer('p-fifth', ['i-5'], [learn('l5', 'U-5'), check('c5', 'U-5')]),
  ],
  sessions: [
    session('one', [learnOne, checkOne, learn('x', 'U-1'), check('y', 'U-1')]),
    session('two', [
      learn('l2', 'U-2'),
      check('c2', 'U-3a', 'U-3b'),
      learn('l2b', 'U-2'),
      check('c2b', 'U-2'),
    ]),
    session('ghost', [learn('lg', 'U-unknown'), check('cg', 'U-unknown')]),
  ],
};

describe('the Campaign item behind each lesson unit', () => {
  const itemOfUnit = mapLessonUnitsToCampaignItems(index);

  it('follows the content index from unit to mission to Campaign item', () => {
    expect(itemOfUnit.get('U-1')).toBe('i-1');
    expect(itemOfUnit.get('U-3b')).toBe('i-3');
    expect(itemOfUnit.get('nope')).toBeUndefined();
  });

  it('derives a session’s items from what its cards cite, once each', () => {
    expect(listSessionCampaignItems(bank.sessions[0]!, itemOfUnit)).toEqual([
      'i-1',
    ]);
    expect(listSessionCampaignItems(bank.sessions[1]!, itemOfUnit)).toEqual([
      'i-2',
      'i-3',
    ]);
  });

  it('gives no answer for a citation the programme has no item for', () => {
    expect(listSessionCampaignItems(bank.sessions[2]!, itemOfUnit)).toBeNull();
  });
});

describe('listReinforcementSessions («Repeter»)', () => {
  const open = (reach: Parameters<typeof campaignPosition>[1]) =>
    listReinforcementSessions(bank, index, at(reach)).map((entry) => entry.id);

  it('opens nothing for a learner who has reached nothing', () => {
    expect(open({})).toEqual([]);
  });

  it('opens a session once every item it comes from is complete', () => {
    expect(open({ complete: ['i-1'] })).toEqual(['one']);
    expect(open({ complete: ['i-1', 'i-2'] })).toEqual(['one']);
    expect(open({ complete: ['i-1', 'i-2', 'i-3'] })).toEqual(['one', 'two']);
  });

  it('counts an item the learner has started, but not one they have not', () => {
    expect(open({ started: ['i-1'] })).toEqual(['one']);
    expect(open({ complete: ['i-2'], started: ['i-3'] })).toEqual(['two']);
    expect(open({ complete: ['i-2'] })).toEqual([]);
  });

  it('keeps a session shut while any one of its items is still ahead', () => {
    expect(open({ complete: ['i-3'] })).toEqual([]);
    expect(open({ complete: ['i-4', 'i-5'] })).toEqual([]);
  });

  it('never opens a session whose citation has no Campaign item', () => {
    expect(open({ complete: items })).not.toContain('ghost');
  });

  it('opens nothing when the Campaign position is unavailable', () => {
    expect(
      listReinforcementSessions(bank, index, {
        ...at({ complete: items }),
        state: 'unavailable',
      }),
    ).toEqual([]);
  });

  it('does not change the position it reads', () => {
    const position = at({ complete: ['i-1'] });
    const before = JSON.stringify(position);

    listReinforcementSessions(bank, index, position);
    selectPrimer(bank, position);

    expect(JSON.stringify(position)).toBe(before);
  });
});

describe('selectPrimer («Forbered deg»)', () => {
  const chosen = (reach: Parameters<typeof campaignPosition>[1]) =>
    selectPrimer(bank, at(reach))?.id;

  it('gives a learner who has done nothing the primer for where they begin', () => {
    expect(chosen({})).toBe('p-first');
  });

  it('keeps a primer while any item it prepares for is still to do', () => {
    expect(chosen({ complete: ['i-1'] })).toBe('p-first');
  });

  it('prefers the primer that covers the current quest over the next step’s', () => {
    // Current is i-2: p-first covers it; p-third (i-3) is the next step.
    expect(chosen({ complete: ['i-1'] })).toBe('p-first');
  });

  it('moves on to the next step once the current primer’s items are done', () => {
    // i-1 and i-2 done: current is i-3, which p-third covers.
    expect(chosen({ complete: ['i-1', 'i-2'] })).toBe('p-third');
  });

  it('looks at most one step ahead, never at the far future', () => {
    // At i-1 the third and fifth items are two and four steps away.
    expect(chosen({})).toBe('p-first');
    // At i-3 the fifth is two steps away: only the current one is offered.
    expect(chosen({ complete: ['i-1', 'i-2'] })).toBe('p-third');
  });

  it('counts steps in the Campaign’s required order, skipping optional items', () => {
    const next = {
      primers: [
        primer('p-fourth', ['i-4'], [learn('l4', 'U-4'), check('c4', 'U-4')]),
      ],
      sessions: bank.sessions,
    };

    // Current is i-3. The optional item sits between it and i-4 in the
    // authored list, but i-4 is the next required step, so it is in range.
    expect(selectPrimer(next, at({ complete: ['i-1', 'i-2'] }))?.id).toBe(
      'p-fourth',
    );
    // Current is i-2: i-4 is two required steps away.
    expect(selectPrimer(next, at({ complete: ['i-1'] }))).toBeUndefined();
  });

  it('offers the next step’s primer when nothing covers the current quest', () => {
    const only = {
      primers: [
        primer('p-fifth', ['i-5'], [learn('l5', 'U-5'), check('c5', 'U-5')]),
      ],
      sessions: bank.sessions,
    };

    // Current is i-4; i-5 is the next required step.
    expect(
      selectPrimer(only, at({ complete: ['i-1', 'i-2', 'i-3'] }))?.id,
    ).toBe('p-fifth');
    // Current is i-3: i-5 is two steps away.
    expect(
      selectPrimer(only, at({ complete: ['i-1', 'i-2'] })),
    ).toBeUndefined();
  });

  it('drops a primer for something the learner has passed over', () => {
    // Work began at i-3 while i-1 and i-2 were left undone: the Campaign's
    // current quest is i-3, so the primer for i-1 and i-2 is stale.
    expect(chosen({ started: ['i-3'] })).toBe('p-third');
    // Left undone but not passed: the current quest is still i-1.
    expect(chosen({ complete: ['i-2'] })).toBe('p-first');
  });

  it('offers nothing once every required item is complete or when the Campaign is unreadable', () => {
    expect(chosen({ complete: items })).toBeUndefined();
    expect(
      selectPrimer(bank, { ...at({}), state: 'unavailable' }),
    ).toBeUndefined();
    expect(
      selectPrimer(bank, { ...at({}), currentQuestId: null }),
    ).toBeUndefined();
  });

  it('fails closed on a primer for an item the Campaign does not have', () => {
    const odd = {
      primers: [primer('p-odd', ['i-1', 'not-an-item'], [learnOne, checkOne])],
      sessions: bank.sessions,
    };

    expect(selectPrimer(odd, at({}))).toBeUndefined();
  });

  it('treats a bank with no primers as having none', () => {
    expect(selectPrimer({ sessions: bank.sessions }, at({}))).toBeUndefined();
  });
});

describe('primers in the bank validator', () => {
  const units = new Set(['m']);
  const issues = (primers: MicroPrimer[]) =>
    findMicrolearningBankIssues({ primers, sessions: sessionsOf4 }, units);
  const sessionsOf4 = [
    session('s', [
      learn('a', 'U-1'),
      check('b', 'U-1'),
      learn('c', 'U-1'),
      check('d', 'U-1'),
    ]),
  ];
  const good = primer('p', ['i-1'], [learn('pl', 'U-1'), check('pc', 'U-1')]);

  it('accepts a short primer of its own cards', () => {
    expect(issues([good])).toEqual([]);
  });

  it('accepts a primer built from reinforcement cards themselves', () => {
    expect(
      issues([
        primer(
          'p',
          ['i-1'],
          [sessionsOf4[0]!.cards[0]!, sessionsOf4[0]!.cards[1]!],
        ),
      ]),
    ).toEqual([]);
  });

  it('refuses a duplicate or malformed primer ID, and a primer named like a session', () => {
    expect(
      issues([
        good,
        { ...good, cards: [learn('x1', 'U-1'), check('x2', 'U-1')] },
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/primer "p" needs a unique/),
      ]),
    );
    expect(issues([{ ...good, id: 's' }])).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/primer "s" needs a unique/),
      ]),
    );
    expect(issues([{ ...good, id: 'Not Valid' }])).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/needs a unique lowercase/),
      ]),
    );
  });

  it('keeps a primer short: two or three cards that start by teaching', () => {
    expect(issues([{ ...good, cards: [learn('pl', 'U-1')] }])).toEqual(
      expect.arrayContaining([expect.stringMatching(/two or three cards/)]),
    );
    expect(
      issues([
        {
          ...good,
          cards: [
            check('p1', 'U-1'),
            check('p2', 'U-1'),
            check('p3', 'U-1'),
            check('p4', 'U-1'),
          ],
        },
      ]),
    ).toEqual(
      expect.arrayContaining([expect.stringMatching(/two or three cards/)]),
    );
    expect(
      issues([{ ...good, cards: [check('p1', 'U-1'), check('p2', 'U-1')] }]),
    ).toEqual(
      expect.arrayContaining([expect.stringMatching(/start by teaching/)]),
    );
  });

  it('needs the Campaign items it prepares for', () => {
    expect(issues([{ ...good, prepares: [] }])).toEqual(
      expect.arrayContaining([expect.stringMatching(/Campaign items/)]),
    );
    expect(issues([{ ...good, prepares: ['i-1', 'i-1'] }])).toEqual(
      expect.arrayContaining([expect.stringMatching(/Campaign items/)]),
    );
  });

  it('checks its own cards like any other, and a Learn card must hand into practice', () => {
    expect(
      issues([{ ...good, cards: [learn('pl', 'U-1'), learn('pm', 'U-1')] }]),
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/must be followed by a practice card/),
      ]),
    );
    // An ID that collides with a different card is refused.
    expect(
      issues([{ ...good, cards: [learn('a', 'U-1'), check('pc', 'U-1')] }]),
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/card "a" needs a unique/),
      ]),
    );
  });

  it('lists only the cards that exist nowhere else', () => {
    const shared = sessionsOf4[0]!.cards[0]!;
    const own = check('own', 'U-1');
    const found = listPrimerOnlyCards({
      primers: [primer('p', ['i-1'], [shared, own])],
      sessions: sessionsOf4,
    });

    expect(found).toEqual([own]);
  });
});
