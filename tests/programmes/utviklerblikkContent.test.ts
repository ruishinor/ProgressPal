import { createHash } from 'node:crypto';
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
const generelt = track.sessions.filter((session) =>
  track.categories![0]!.sessionIds.includes(session.id),
);
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
      generelt.map((session) => [
        session.id,
        session.cards.map((entry) => entry.id),
      ]),
    ).toEqual(identities);
    // Generelt comes first in the track, before the ACT 18 activities.
    expect(track.sessions.slice(0, 6)).toEqual(generelt);
  });

  it('keeps Generelt as accepted and adds UX/UU after the four preserved categories', () => {
    expect(
      track.categories?.map(({ id, title, summary }) => [id, title, summary]),
    ).toEqual([
      ['generelt', 'Generelt', 'Bred utviklerforståelse'],
      ['scrum', 'Scrum', 'Rammeverk og ansvar'],
      ['smidig-samarbeid', 'Smidig samarbeid', 'Team og koordinering'],
      ['kanban', 'Kanban', 'Arbeidsflyt og oversikt'],
      [
        'ux-og-universell-utforming',
        'UX og universell utforming',
        'Brukerreiser, barrierer og forbedring',
      ],
    ]);
    expect(track.categories?.[0]?.sessionIds).toEqual(
      identities.map(([id]) => id),
    );
    expect(
      track.categories?.slice(1, 4).map((entry) => entry.sessionIds),
    ).toEqual([
      ['s01', 's02', 's03', 's04', 's05', 's06'].map((id) => `tsu-scrum-${id}`),
      ['a01', 'a02', 'a03', 'a04', 'a05', 'a06'].map(
        (id) => `tsu-smidig-${id}`,
      ),
      ['k01', 'k02', 'k03', 'k04', 'k05', 'k06'].map(
        (id) => `tsu-kanban-${id}`,
      ),
    ]);
    expect(track.sessions).toHaveLength(30);
    expect(track.categories?.[4]?.sessionIds).toEqual(
      ['u01', 'u02', 'u03', 'u04', 'u05', 'u06'].map((id) => `tsu-ux-uu-${id}`),
    );
    // Whole-data fingerprint at c7f04b8: every original title, card, answer,
    // source, feedback and ordering remains identical, beyond identity checks.
    expect(
      createHash('sha256')
        .update(JSON.stringify(track.sessions.slice(0, 24)))
        .digest('hex'),
    ).toBe('a821664d3910121bf9376984393596de7a99265240f408668cfccabf36f30ead');
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

  it('introduces no forbidden learner wording or unapproved track fields', () => {
    expect(JSON.stringify(track)).not.toMatch(/\b(?:frivillig|kurs|kurset)\b/i);
    expect(Object.keys(track).sort()).toEqual([
      'about',
      'categories',
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
    const a6 = generelt[5]!;
    expect(generelt).toHaveLength(6);
    expect(generelt.flatMap((session) => session.cards)).toHaveLength(37);
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

/**
 * The 18 ACT 18 activities (final package of 2026-10-21) as the runtime ships
 * them. Each choice keeps its authored option order, so the authored answer
 * letters («Riktig svar») are the oracle: one letter per choice card, in card
 * order, and `match` where the package has a matching task.
 */
const act18Keys: Record<string, string[]> = {
  'tsu-scrum-s01': ['C', 'A'],
  'tsu-scrum-s02': ['A', 'C'],
  'tsu-scrum-s03': ['D', 'B', 'A'],
  'tsu-scrum-s04': ['B', 'C'],
  'tsu-scrum-s05': ['D', 'A'],
  'tsu-scrum-s06': ['A', 'B'],
  'tsu-smidig-a01': ['A', 'B'],
  'tsu-smidig-a02': ['B', 'A'],
  'tsu-smidig-a03': ['C', 'A'],
  'tsu-smidig-a04': ['D', 'match'],
  'tsu-smidig-a05': ['C', 'B'],
  'tsu-smidig-a06': ['A', 'C'],
  'tsu-kanban-k01': ['B', 'C'],
  'tsu-kanban-k02': ['C', 'A'],
  'tsu-kanban-k03': ['C', 'D', 'C'],
  'tsu-kanban-k04': ['C', 'match'],
  'tsu-kanban-k05': ['B', 'D', 'A'],
  'tsu-kanban-k06': ['C', 'B', 'A'],
};
const act18 = track.sessions.filter((session) => session.id in act18Keys);

describe('ACT 18: Scrum, Kanban and Smidig samarbeid', () => {
  it.each(act18.map((session) => [session.id, session] as const))(
    '%s: concept, situation, decision, transfer and takeaway with its authored answers',
    (id, session) => {
      const [concept, situation, ...practice] = session.cards;

      expect(concept!.kind).toBe('learn');
      expect(situation!.kind).toBe('learn');
      expect(practice.length).toBeGreaterThanOrEqual(2);
      expect(session.cards.length).toBeGreaterThanOrEqual(4);
      expect(session.takeaway!.trim()).not.toBe('');
      expect(
        practice.map((entry) =>
          entry.kind === 'select'
            ? 'ABCD'[entry.options.findIndex((o) => o.id === entry.correctId)]
            : entry.kind,
        ),
      ).toEqual(act18Keys[id]);
      for (const entry of practice) {
        if (entry.kind === 'learn')
          throw new Error(`${entry.id} is not practice`);
        expect(entry.question?.trim(), entry.id).toBeTruthy();
        expect(entry.context?.trim(), entry.id).toBeTruthy();
      }
    },
  );

  it('maps K04 and A04 with one unused choice that no pair needs', () => {
    const k04 = card('tsu-kanban-k04-ny', 'match');
    expect(k04.pairs.map((pair) => pair.right)).toEqual([
      'Gjennomstrømning',
      'Alder',
      'Syklustid',
    ]);
    expect(k04.pairs[0]!.left).toMatch(/Hvor mange.*ferdige.*uke/);
    expect(k04.pairs[1]!.left).toMatch(/startet på oppgaven min.*holdt på nå/);
    expect(k04.pairs[2]!.left).toMatch(
      /Hvor lang tid.*starter til den er ferdig/,
    );
    expect(k04.unusedRight).toEqual([{ id: 'wip', label: 'WIP' }]);

    const a04 = card('tsu-smidig-a04-ny', 'match');
    expect(a04.pairs.map((pair) => pair.right)).toEqual([
      'Skriftlig beskjed til hele teamet i den felles kanalen',
      'Kort møte med de berørte, med mål om å ta en beslutning',
      'Spørsmål direkte til én person som vet svaret',
    ]);
    expect(a04.pairs[0]!.left).toMatch(/Alle seks.*ingenting å diskutere/i);
    expect(a04.pairs[1]!.left).toMatch(/uenige.*bli enige i dag/);
    expect(a04.pairs[2]!.left).toMatch(/angår bare Emilie/);
    expect(a04.unusedRight?.map((option) => option.label)).toEqual([
      'Langt møte med hele teamet',
    ]);
    for (const entry of [k04, a04]) {
      expect(entry.context).toMatch(/blir ikke brukt/);
      expect(entry.rightOrder).toContain(entry.unusedRight![0]!.id);
    }
  });

  it('keeps each A05 set of three criteria as one answer', () => {
    const a05 = card('tsu-smidig-a05-sporsmal', 'select');
    expect(
      a05.options.map((option) => option.label.split('\n').length),
    ).toEqual([3, 3, 3, 3]);
    const right = a05.options.find((option) => option.id === a05.correctId)!;
    expect(right.label).toMatch(
      /under ett minutt.*\n.*alle registrerte foreldre/,
    );
  });

  it('ships learner text only: no authoring notes, markup or answer letters', () => {
    const text = JSON.stringify(act18);
    for (const authoring of [
      /Vises (før|etter) svar/,
      /Faglig grunnlag/,
      /Riktig svar/,
      /Tilbakemelding på/,
      /i korte trekk/,
      /ikke det beste valget/,
      /Kort \d/,
      /\*\*|\|---/,
      /\b(?:alternativ|svar) [A-D]\b|\benn [A-D]\b|\bat [A-D] /,
      /\b(?:frivillig|kurs|kurset)\b/i,
    ]) {
      expect(text).not.toMatch(authoring);
    }
  });
});

describe('UX og universell utforming: original UXUU activities', () => {
  const expected = [
    ['u01', ['pris', 'antakelse', 'reise']],
    ['u02', ['noytral', 'tekst', 'kode']],
    ['u03', ['barriere', 'tekst']],
    ['u04', ['fokus', 'flyt']],
    ['u05', ['tekst', 'forklar', 'navn']],
    ['u06', ['stopp', 'oppgave', 'avgrens']],
  ] as const;

  it.each(expected)(
    '%s teaches before assessing, with explicit decision and transfer keys',
    (id, keys) => {
      const session = track.sessions.find((s) => s.id === `tsu-ux-uu-${id}`)!;
      expect(session).toBeDefined();
      expect(session.cards[0]!.kind).toBe('learn');
      const practice = session.cards.filter((c) => c.kind === 'select');
      expect(practice.map((c) => c.correctId)).toEqual(keys);
      expect(
        session.cards.every((c) => c.kind === 'learn' || c.kind === 'select'),
      ).toBe(true);
      expect(session.cards.at(-1)!.role).toBe('application');
      expect(session.cards.at(-1)!.title).toMatch(/^Ny situasjon:/);
      for (const entry of session.cards) {
        expect(entry.source).toEqual({
          moduleId: track.id,
          lessonUnitIds: [`UXUU-${id.toUpperCase()}`],
          skillIds: ['SK-METH-01'],
        });
        if (entry.kind === 'select') {
          expect(entry.context?.trim(), entry.id).toBeTruthy();
          expect(entry.question?.trim(), entry.id).toBeTruthy();
        }
      }
    },
  );
});
