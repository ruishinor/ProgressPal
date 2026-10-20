import { describe, expect, it } from 'vitest';

import {
  findMicrolearningBankIssues,
  type MicroCard,
  type MicroCardKind,
} from '@/lib/domain';
import { validateProgrammeDefinition } from '@/programmes/definition';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { tenkSomEnUtviklerTrack as track } from '@/programmes/programvareutvikling/microlearning/tenkSomEnUtvikler';

const cards = track.sessions.flatMap((session) => session.cards);
function card<K extends MicroCardKind>(
  id: string,
  kind: K,
): Extract<MicroCard, { kind: K }> {
  const found = cards.find((entry) => entry.id === id);
  if (found?.kind !== kind) throw new Error(`Missing ${kind} card ${id}`);
  return found as Extract<MicroCard, { kind: K }>;
}

const identities = [
  [
    'tsu-behov-eller-losning',
    [
      'tsu-a1-ord',
      'tsu-a1-behov',
      'tsu-a1-sorter',
      'tsu-a1-hvorfor',
      'tsu-a1-bibliotek',
    ],
  ],
  [
    'tsu-kravtyper',
    [
      'tsu-a2-typer',
      'tsu-a2-innlogging',
      'tsu-a2-sider',
      'tsu-a2-bibliotek',
      'tsu-a2-sikkerhet',
      'tsu-a2-testbart',
      'tsu-a2-billett',
    ],
  ],
  [
    'tsu-informasjon-funksjon',
    [
      'tsu-a3-begreper',
      'tsu-a3-hva-er-info',
      'tsu-a3-koble',
      'tsu-a3-pamelding',
      'tsu-a3-avhengig',
      'tsu-a3-konsert',
    ],
  ],
  [
    'tsu-data-mangler',
    [
      'tsu-a4-situasjon',
      'tsu-a4-hva-skjer',
      'tsu-a4-pavirkes',
      'tsu-a4-feil-tall',
      'tsu-a4-best',
      'tsu-a4-reiseapp',
    ],
  ],
  [
    'tsu-handling-atferd',
    [
      'tsu-a5-begreper',
      'tsu-a5-svar',
      'tsu-a5-rekkefolge',
      'tsu-a5-samtidig',
      'tsu-a5-avslag',
      'tsu-a5-kantine',
    ],
  ],
  [
    'tsu-rolle-fase',
    [
      'tsu-a6-begreper',
      'tsu-a6-ord',
      'tsu-a6-testing',
      'tsu-a6-samarbeid',
      'tsu-a6-kanban',
      'tsu-a6-scrum',
      'tsu-a6-festival',
    ],
  ],
];

describe('Utviklerblikk content contract', () => {
  it('preserves the locked identity and every activity/card in authored order', () => {
    expect(track.id).toBe('tenk-som-en-utvikler');
    expect(track.title).toBe('Utviklerblikk');
    expect(track.summary).toBe(
      'Øv på å stille gode spørsmål, forstå krav og se hvordan valgene dine påvirker systemet og andre.',
    );
    expect(
      track.sessions.map((session) => [
        session.id,
        session.cards.map((entry) => entry.id),
      ]),
    ).toEqual(identities);
  });

  it('validates through the existing bank and programme contracts', () => {
    const bank = programvareutviklingDefinition.content.microlearning!;
    expect(bank.tracks).toContain(track);
    expect(
      findMicrolearningBankIssues(bank, new Set(['s1-m01', 's1-m02'])),
    ).toEqual([]);
    expect(() =>
      validateProgrammeDefinition(programvareutviklingDefinition),
    ).not.toThrow();
  });

  it('keeps hints, explanations, and feedback on every incorrect select option', () => {
    for (const entry of cards) {
      if (entry.kind === 'learn') continue;
      expect(entry.hint.trim(), entry.id).not.toBe('');
      expect(entry.explanation.trim(), entry.id).not.toBe('');
      expect(entry.hint, entry.id).not.toBe(entry.explanation);
      if (entry.kind !== 'select') continue;
      expect(
        entry.options.filter((option) => option.id === entry.correctId),
        entry.id,
      ).toHaveLength(1);
      for (const option of entry.options) {
        if (option.id === entry.correctId)
          expect(option.feedback, entry.id).toBeUndefined();
        else
          expect(
            option.feedback?.trim(),
            `${entry.id}/${option.id}`,
          ).toBeTruthy();
      }
    }
  });

  it('retains valid pair permutations and normal-flow ordering', () => {
    const expected = {
      'tsu-a1-sorter': ['losning', 'antakelse', 'problem', 'behov'],
      'tsu-a2-bibliotek': ['regel', 'funksjon', 'egenskap'],
      'tsu-a2-billett': ['egenskap', 'regel', 'funksjon'],
      'tsu-a3-koble': ['deltakere', 'timeplan', 'logge-inn'],
      'tsu-a4-pavirkes': ['ledige', 'melde', 'tid'],
      'tsu-a5-svar': ['meld-av', 'meld-pa', 'feil-epost'],
      'tsu-a6-ord': ['status', 'oppgave', 'rolle', 'fase'],
      'tsu-a6-festival': ['oppgave', 'status', 'rolle'],
    };
    for (const [id, order] of Object.entries(expected)) {
      const entry = card(id, 'match');
      expect(entry.rightOrder, id).toEqual(order);
      expect([...entry.rightOrder].sort(), id).toEqual(
        entry.pairs.map((pair) => pair.id).sort(),
      );
    }
    const sequence = card('tsu-a5-rekkefolge', 'order');
    expect(sequence.items.map((item) => item.id)).toEqual([
      'lagre',
      'motta',
      'bekrefte',
      'sjekke',
    ]);
    expect(sequence.correctOrder).toEqual([
      'motta',
      'sjekke',
      'lagre',
      'bekrefte',
    ]);
    expect(sequence.items.find((item) => item.id === 'motta')!.label).toMatch(
      /motta.*forespørsel/i,
    );
  });

  it('compares functions with functions and includes capacity and reservations', () => {
    const dependency = card('tsu-a3-avhengig', 'select');
    expect(dependency.correctId).toBe('ledige');
    for (const option of dependency.options)
      expect(option.label).toMatch(/^Vise /);
    const booking = card('tsu-a3-pamelding', 'select');
    expect(booking.correctId).toBe('alt');
    const answer = booking.options.find(
      (option) => option.id === booking.correctId,
    )!.label;
    for (const required of [
      /time/i,
      /medlem/i,
      /antall plasser/i,
      /påmeldinger/i,
    ])
      expect(answer).toMatch(required);
    const login = card('tsu-a3-koble', 'match').pairs.find(
      (pair) => pair.id === 'logge-inn',
    )!;
    expect(login.right).toMatch(/e-postadresse.*opplysninger.*innlogging/i);
    expect(login.right).not.toMatch(/sikker innlogging|lagr.*passord/i);
  });

  it('puts the available and missing information on each affected gym practice card', () => {
    for (const id of [
      'tsu-a4-hva-skjer',
      'tsu-a4-pavirkes',
      'tsu-a4-feil-tall',
      'tsu-a4-best',
    ]) {
      const entry = cards.find((candidate) => candidate.id === id)!;
      if (entry.kind === 'learn') throw new Error('Expected practice');
      expect(entry.context, id).toMatch(/timeplan/i);
      expect(entry.context, id).toMatch(/ikke.*hent.*påmelding/i);
    }
    expect(card('tsu-a4-feil-tall', 'select').correctId).toBe('null');
    expect(card('tsu-a4-feil-tall', 'select').question).toMatch(
      /mulig regnefeil/,
    );
    expect(card('tsu-a4-reiseapp', 'select').correctId).toBe('planlagt');
  });

  it('uses detectable email validation and investigates conflicting responses', () => {
    const email = card('tsu-a5-svar', 'match').pairs.find(
      (pair) => pair.id === 'feil-epost',
    )!;
    expect(email.left).toMatch(/uten @/);
    expect(email.right).toMatch(/e-postformat/);
    expect(card('tsu-a5-samtidig', 'select').correctId).toBe('forst');
    const conflict = card('tsu-a5-avslag', 'select');
    expect(conflict.correctId).toBe('riktig');
    expect(conflict.context).toMatch(/fullt.*1 plass ledig/);
    expect(conflict.question).toMatch(/undersøke først/);
    const answer = conflict.options.find(
      (option) => option.id === conflict.correctId,
    )!.label;
    expect(answer).toMatch(/kapasitet.*påmeldinger/);
  });

  it('introduces no forbidden learner wording or new feature contract', () => {
    expect(JSON.stringify(track)).not.toMatch(/\b(?:frivillig|kurs|kurset)\b/i);
    expect(Object.keys(track).sort()).toEqual([
      'about',
      'id',
      'sessions',
      'summary',
      'title',
    ]);
    for (const session of track.sessions) {
      expect(Object.keys(session).sort()).toEqual([
        'cards',
        'id',
        'minutes',
        'summary',
        'takeaway',
        'title',
      ]);
      for (const entry of session.cards) {
        expect(entry.source.moduleId).toBe(track.id);
        expect(
          Object.keys(entry).filter((key) =>
            /^(progress|xp|storage|prerequisites|mastery)$/i.test(key),
          ),
        ).toEqual([]);
      }
    }
  });
  it('applies responsibility, task and status to an unresolved rule before a fresh festival case', () => {
    const a6 = track.sessions[5]!;
    expect(track.sessions).toHaveLength(6);
    expect(cards).toHaveLength(37);
    expect(a6.cards).toHaveLength(7);
    const applied = card('tsu-a6-scrum', 'learn');
    expect(a6.cards[4]!.id).toBe('tsu-a6-kanban');
    expect(a6.cards[5]).toBe(applied);
    expect(a6.cards[6]!.id).toBe('tsu-a6-festival');
    expect(applied.title + applied.idea + applied.bridge).not.toMatch(/scrum/i);
    expect(applied.idea).toMatch(/aldersgrensen.*Venter på avklaring/);
    expect(applied.idea).toMatch(/hvem.*avklarer.*gir svaret videre/);
    expect(applied.definitions).toBeUndefined();
    const festival = card('tsu-a6-festival', 'match');
    for (const pair of festival.pairs) {
      expect(applied.idea.toLowerCase()).not.toContain(pair.left.toLowerCase());
    }
    expect(applied.source).toEqual(a6.cards[0]!.source);
    expect(applied.bridge).toMatch(/festival/);
  });
});
