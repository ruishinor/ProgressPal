import { describe, expect, it } from 'vitest';

import {
  findMicrolearningBankIssues,
  type MicroLearnCard,
  type MicroSelectCard,
  type MicroSession,
  type MicroTrack,
  type MicrolearningBank,
} from '@/lib/domain';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';

/**
 * The voluntary-track rules, and proof that they leave the «Forbered deg» and
 * «Repeter» rules exactly as strict as before (a code-less Learn card is still
 * refused there).
 */

const realBank = programvareutviklingDefinition.content.microlearning!;
const units = new Set(['s1-m01', 's1-m02']);

const trackSource = {
  moduleId: 't',
  lessonUnitIds: ['TSU-A1'],
  skillIds: ['SK-THK-01'],
};
const learn: MicroLearnCard = {
  kind: 'learn',
  id: 'l',
  title: 'Lær',
  role: 'explain',
  source: trackSource,
  idea: 'En idé.',
  bridge: 'Neste.',
};
const select: MicroSelectCard = {
  kind: 'select',
  id: 's',
  title: 'Velg',
  role: 'scaffold',
  source: trackSource,
  options: [
    { id: 'a', label: 'A', feedback: 'Ikke A.' },
    { id: 'b', label: 'B' },
  ],
  correctId: 'b',
  hint: 'Tenk.',
  explanation: 'Fordi B.',
};
const session = (
  id: string,
  overrides: Partial<MicroSession> = {},
): MicroSession => ({
  id,
  title: 'Aktivitet',
  summary: 'Kort.',
  minutes: 3,
  takeaway: 'Ta med deg.',
  cards: [
    { ...learn, id: `${id}-l` },
    { ...select, id: `${id}-s1` },
    { ...select, id: `${id}-s2` },
    { ...select, id: `${id}-s3` },
  ],
  ...overrides,
});
const track = (overrides: Partial<MicroTrack> = {}): MicroTrack => ({
  id: 't',
  title: 'Spor',
  summary: 'Et spor.',
  sessions: [session('a')],
  ...overrides,
});
const withTrack = (value: MicroTrack): MicrolearningBank => ({
  ...realBank,
  tracks: [value],
});

describe('the real Programvareutvikling bank', () => {
  it('validates, with one track of six activities', () => {
    expect(findMicrolearningBankIssues(realBank, units)).toEqual([]);
    expect(realBank.tracks).toHaveLength(1);
    expect(realBank.tracks![0]!.sessions).toHaveLength(6);
  });

  it('uses prose labels only on the eight conceptual matching cards', () => {
    const trackMatches = realBank.tracks![0]!.sessions.flatMap((session) =>
      session.cards.filter((card) => card.kind === 'match'),
    );
    expect(trackMatches).toHaveLength(8);
    for (const card of trackMatches) {
      expect(card.kind === 'match' && card.leftPresentation).toBe('text');
    }
    for (const session of realBank.sessions) {
      for (const card of session.cards) {
        if (card.kind === 'match') {
          expect(card.leftPresentation).toBeUndefined();
        }
      }
    }
  });

  it('keeps «Repeter» at four sessions and leaves its cards untouched', () => {
    expect(realBank.sessions).toHaveLength(4);
    const trackCards = new Set(
      realBank.tracks!.flatMap((entry) =>
        entry.sessions.flatMap((item) => item.cards),
      ),
    );
    for (const card of realBank.sessions.flatMap((item) => item.cards)) {
      expect(trackCards.has(card)).toBe(false);
    }
  });
});

describe('track rules', () => {
  it('accepts a minimal valid track whose Learn card has no code', () => {
    expect(findMicrolearningBankIssues(withTrack(track()), units)).toEqual([]);
  });

  it('accepts a question by the choices and bold key words, and refuses empty ones', () => {
    const withExtras = (question: string, term: string): MicrolearningBank =>
      withTrack(
        track({
          sessions: [
            session('a', {
              cards: [
                {
                  ...learn,
                  id: 'q-l',
                  definitions: [{ term, text: 'en forklaring.' }],
                },
                { ...select, id: 'q-1', question },
                { ...select, id: 'q-2' },
                { ...select, id: 'q-3' },
              ],
            }),
          ],
        }),
      );

    expect(
      findMicrolearningBankIssues(
        withExtras('Hva er behovet?', 'Behov'),
        units,
      ),
    ).toEqual([]);
    expect(
      findMicrolearningBankIssues(withExtras(' ', 'Behov'), units),
    ).toContain('card "q-1" has an empty question');
    expect(
      findMicrolearningBankIssues(withExtras('Hva er behovet?', ''), units),
    ).toContain('card "q-l" has an empty definition');
  });

  it('still refuses a code-less Learn card in «Repeter»', () => {
    const first = realBank.sessions[0]!;
    const noCode = first.cards.map((card) =>
      card.kind === 'learn' ? { ...card, example: undefined } : card,
    );
    const issues = findMicrolearningBankIssues(
      { ...realBank, sessions: [{ ...first, cards: noCode }] },
      units,
    );

    expect(issues.some((issue) => issue.includes('has no example code'))).toBe(
      true,
    );
  });

  it.each([
    [
      'a catalogue citation',
      track({
        sessions: [
          session('a', {
            cards: [
              {
                ...learn,
                id: 'x-l',
                source: { ...trackSource, moduleId: 's1-m01' },
              },
              { ...select, id: 'x-1' },
              { ...select, id: 'x-2' },
              { ...select, id: 'x-3' },
            ],
          }),
        ],
      }),
      'not its track',
    ],
    [
      'more than six activities',
      track({
        sessions: ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => session(id)),
      }),
      'one to six sessions',
    ],
    [
      'no takeaway',
      track({ sessions: [session('a', { takeaway: ' ' })] }),
      'needs a takeaway',
    ],
    [
      'an activity that does not start by teaching',
      track({
        sessions: [
          session('a', {
            cards: [
              { ...select, id: 'y-1' },
              { ...learn, id: 'y-l' },
              { ...select, id: 'y-2' },
              { ...select, id: 'y-3' },
            ],
          }),
        ],
      }),
      'must start by teaching',
    ],
    [
      'feedback on the answer itself',
      track({
        sessions: [
          session('a', {
            cards: [
              { ...learn, id: 'z-l' },
              {
                ...select,
                id: 'z-1',
                options: [
                  { id: 'a', label: 'A' },
                  { id: 'b', label: 'B', feedback: 'Riktig?' },
                ],
              },
              { ...select, id: 'z-2' },
              { ...select, id: 'z-3' },
            ],
          }),
        ],
      }),
      'gives the answer wrong-option feedback',
    ],
    [
      'a session ID already used by «Repeter»',
      track({ sessions: [session(realBank.sessions[0]!.id)] }),
      'needs a unique lowercase ID',
    ],
  ])('refuses %s', (_label, value, expected) => {
    const issues = findMicrolearningBankIssues(withTrack(value), units);

    expect(issues.some((issue) => issue.includes(expected))).toBe(true);
  });
});

describe('track category membership', () => {
  const category = {
    id: 'general',
    title: 'Generelt',
    summary: 'Bred forståelse',
    sessionIds: ['a'],
  };
  it('accepts more than six independent activities in one category', () => {
    const sessions = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) =>
      session(id),
    );
    expect(
      findMicrolearningBankIssues(
        withTrack(
          track({
            sessions,
            categories: [
              { ...category, sessionIds: sessions.map((entry) => entry.id) },
              { ...category, id: 'empty', sessionIds: [] },
            ],
          }),
        ),
        units,
      ),
    ).toEqual([]);
  });

  it.each([
    [[{ ...category, id: 'Bad ID' }], 'unique lowercase ID'],
    [[category, { ...category, sessionIds: [] }], 'unique lowercase ID'],
    [[{ ...category, title: ' ' }], 'title and a summary'],
    [[{ ...category, summary: ' ' }], 'title and a summary'],
    [[{ ...category, sessionIds: ['missing'] }], 'unknown session'],
    [[{ ...category, sessionIds: ['a', 'a'] }], 'more than one category entry'],
    [[category, { ...category, id: 'other' }], 'more than one category entry'],
    [[{ ...category, sessionIds: [] }], 'needs a category'],
    [[], 'needs sessions and categories'],
  ])('rejects invalid category membership %#', (categories, expected) => {
    expect(
      findMicrolearningBankIssues(withTrack(track({ categories })), units).some(
        (issue) => issue.includes(expected),
      ),
    ).toBe(true);
  });

  it('still validates the cards and identities of categorized activities', () => {
    const invalid = track({
      categories: [category],
      sessions: [session('a', { takeaway: ' ' })],
    });
    expect(findMicrolearningBankIssues(withTrack(invalid), units)).toContain(
      'session "a" needs a takeaway',
    );
    expect(
      findMicrolearningBankIssues(
        withTrack(track({ categories: [category], sessions: [] })),
        units,
      ),
    ).toContain('track "t" needs sessions and categories');
  });
});
