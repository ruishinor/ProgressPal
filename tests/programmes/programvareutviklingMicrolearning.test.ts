import { describe, expect, it } from 'vitest';

import {
  listMicroCards,
  listPrimerOnlyCards,
  listReinforcementSessions,
  listSessionCampaignItems,
  mapLessonUnitsToCampaignItems,
  selectPrimer,
  type MicroCard,
  type MicroCardKind,
  type MicroSession,
} from '@/lib/domain';
import { cs50x2026Definition } from '@/programmes/cs50x-2026';
import { validateProgrammeDefinition } from '@/programmes/definition';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { programvareutviklingMicrolearning as bank } from '@/programmes/programvareutvikling/microlearning';

import { campaignPosition, firstRequired } from '../support/campaignPosition';
import { p2Index, p2Modules } from './p2Content';

/**
 * The Programme #2 microlearning bank as content: how big it is, what arcs
 * its sessions follow, whether every instruction says what to do, and whether
 * every card traces to authored M01/M02 material that really exists.
 */

// The 24 reinforcement cards, and every card including the six that exist only
// in a primer. Wording, tone and traceability rules apply to all of them.
const reinforcementCards = listMicroCards(bank);
const cards = [...reinforcementCards, ...listPrimerOnlyCards(bank)];

function count(kind: MicroCardKind): number {
  return reinforcementCards.filter((card) => card.kind === kind).length;
}

describe('bank size and shape', () => {
  it('has 20 to 24 cards in four deliberate sessions', () => {
    expect(reinforcementCards.length).toBeGreaterThanOrEqual(20);
    expect(reinforcementCards.length).toBeLessThanOrEqual(24);
    expect(bank.sessions).toHaveLength(4);
    for (const session of bank.sessions) {
      expect(session.cards.length).toBeGreaterThanOrEqual(5);
      expect(session.cards.length).toBeLessThanOrEqual(6);
    }
  });

  it('uses all six families at or above the agreed minimum', () => {
    expect(count('learn')).toBeGreaterThanOrEqual(4);
    expect(count('select')).toBeGreaterThanOrEqual(4);
    expect(count('order')).toBeGreaterThanOrEqual(3);
    expect(count('match')).toBeGreaterThanOrEqual(3);
    expect(count('tap')).toBeGreaterThanOrEqual(3);
    expect(count('assemble')).toBeGreaterThanOrEqual(3);
  });

  it('is hand-ordered, not three quiz cards in a row', () => {
    for (const session of bank.sessions) {
      const kinds = session.cards.map((card) => card.kind);
      const adjacentRepeats = kinds.filter(
        (kind, index) => index > 0 && kind === kinds[index - 1],
      );

      expect(adjacentRepeats, session.id).toEqual([]);
    }
  });

  it('is the bank the Programme 2 definition ships and validates', () => {
    expect(programvareutviklingDefinition.content.microlearning).toBe(bank);
    expect(() =>
      validateProgrammeDefinition(programvareutviklingDefinition),
    ).not.toThrow();
  });
});

describe('learning arcs', () => {
  it('hands every Learn card into a scaffolded practice card on the same skill', () => {
    for (const session of bank.sessions) {
      session.cards.forEach((card, index) => {
        if (card.kind !== 'learn') {
          return;
        }
        const next = session.cards[index + 1];

        expect(next, card.id).toBeDefined();
        expect(next!.role, card.id).toBe('scaffold');
        expect(
          next!.source.skillIds.some((skill) =>
            card.source.skillIds.includes(skill),
          ),
          card.id,
        ).toBe(true);
        expect(card.kind === 'learn' && card.bridge, card.id).toMatch(
          /^Neste: /,
        );
      });
    }
  });

  it('follows at least one full Learn, scaffolded, independent sequence', () => {
    const sequences = bank.sessions.filter((session) =>
      session.cards.some(
        (card, index) =>
          card.role === 'explain' &&
          session.cards[index + 1]?.role === 'scaffold' &&
          session.cards
            .slice(index + 2)
            .some(
              (later) =>
                later.role === 'retrieval' &&
                later.source.skillIds.some((skill) =>
                  card.source.skillIds.includes(skill),
                ),
            ),
      ),
    );

    expect(sequences.length).toBeGreaterThanOrEqual(1);
  });

  it('gives Learn cards no answer, check or hint', () => {
    for (const card of cards.filter((entry) => entry.kind === 'learn')) {
      // Key words with their explanations (`definitions`) are teaching text,
      // never an answer; they may be there or not.
      expect(
        Object.keys(card)
          .filter((key) => key !== 'definitions')
          .sort(),
      ).toEqual(
        [
          'bridge',
          'example',
          'id',
          'idea',
          'kind',
          'role',
          'source',
          'title',
        ].sort(),
      );
    }
  });
});

describe('instruction clarity', () => {
  const action =
    /^(Hva|Hvilken|Hvilket|Hvilke|Sett|Trykk|Koble|Bygg|Velg|Finn)\b/;

  it('opens every interactive title with the thing to do', () => {
    for (const card of cards.filter((entry) => entry.kind !== 'learn')) {
      expect(card.title, card.id).toMatch(action);
    }
  });

  it('never names only the topic', () => {
    const topicOnly =
      /^(Les en feilmelding|Variabler|Typer|Feilmeldinger|Git|Input)$/i;

    for (const card of cards) {
      expect(card.title, card.id).not.toMatch(topicOnly);
    }
  });

  it('keeps every title short enough for two lines of a phone card', () => {
    for (const card of cards) {
      expect(card.title.length, card.id).toBeLessThanOrEqual(52);
    }
  });
});

describe('feedback fits the fixed footer', () => {
  // The footer shows three lines at 360 px: the first-miss line is "Ikke
  // helt." plus the hint, the closing line the label plus the explanation.
  const practice = cards.filter(
    (card): card is Exclude<MicroCard, { kind: 'learn' }> =>
      card.kind !== 'learn',
  );

  it('keeps hints and explanations to what three lines hold', () => {
    for (const card of practice) {
      expect(card.hint.length, `${card.id} hint`).toBeLessThanOrEqual(80);
      expect(
        card.explanation.length,
        `${card.id} explanation`,
      ).toBeLessThanOrEqual(100);
    }
  });

  it('does not let a hint repeat the answer it protects', () => {
    for (const card of practice) {
      expect(card.hint, card.id).not.toBe(card.explanation);
    }
  });
});

describe('traceability to M01 and M02', () => {
  const unitById = new Map(p2Index.units.map((unit) => [unit.unitId, unit]));
  const moduleOfUnit = (unitId: string) =>
    Object.entries(p2Modules).find(([, content]) =>
      content.units.some((unit) => unit.unit_id === unitId),
    )?.[0];

  it('cites only the two authored modules and lessons that exist', () => {
    for (const card of cards) {
      expect(['s1-m01', 's1-m02'], card.id).toContain(card.source.moduleId);
      for (const unitId of card.source.lessonUnitIds) {
        expect(unitById.has(unitId), `${card.id} ${unitId}`).toBe(true);
        expect(
          moduleOfUnit(unitId)?.toLowerCase(),
          `${card.id} ${unitId}`,
        ).toBe(card.source.moduleId);
      }
    }
  });

  it('only uses skills the cited lesson teaches, practises or models', () => {
    for (const card of cards) {
      const known = new Set(
        card.source.lessonUnitIds.flatMap((unitId) => {
          const unit = unitById.get(unitId);

          return unit === undefined
            ? []
            : [
                ...unit.teaches,
                ...unit.practises,
                ...unit.models,
                ...unit.retrieves,
              ];
        }),
      );

      for (const skill of card.source.skillIds) {
        expect(known.has(skill), `${card.id} ${skill}`).toBe(true);
      }
    }
  });

  it('shows only error messages that the cited lessons already show', () => {
    for (const card of cards) {
      const message = card.kind === 'tap' ? card.error : undefined;

      if (message === undefined) {
        continue;
      }
      const lessonText = card.source.lessonUnitIds
        .map((unitId) => {
          const moduleId = Object.keys(p2Modules).find(
            (key) => key.toLowerCase() === card.source.moduleId,
          )!;

          return JSON.stringify(
            p2Modules[moduleId]!.units.find((unit) => unit.unit_id === unitId),
          );
        })
        .join('');
      const [, detail = ''] = message.split(': ');
      const stem = detail.replace(/ Did you mean.*$/, '');

      expect(
        lessonText.includes(stem.replace(/"/g, '\\"')) ||
          lessonText.includes(stem),
        `${card.id}: ${message}`,
      ).toBe(true);
    }
  });

  it('draws nothing from later modules', () => {
    const allowedSkills = new Set(
      p2Index.units
        .filter((unit) => /^S1-M0[12]-/.test(unit.unitId))
        .flatMap((unit) => [...unit.teaches, ...unit.practises]),
    );

    for (const card of cards) {
      for (const skill of card.source.skillIds) {
        expect(allowedSkills.has(skill), `${card.id} ${skill}`).toBe(true);
      }
    }
  });
});

// The required Campaign items in authored order: 12 in Module 1, 12 in Module 2.
const order = firstRequired(p2Index, 99);
const [variabler, typer, feil, tenk] = bank.sessions;
const primers = bank.primers ?? [];
const itemOfUnit = mapLessonUnitsToCampaignItems(p2Index);

/** The learner has completed the first `count` required items in order. */
const afterCompleting = (count: number) =>
  campaignPosition(p2Index, { complete: order.slice(0, count) });
const repeatIds = (count: number) =>
  listReinforcementSessions(bank, p2Index, afterCompleting(count)).map(
    (session) => session.id,
  );
const primerId = (count: number) =>
  selectPrimer(bank, afterCompleting(count))?.id;

describe('«Forbered deg»: the primers are an advance organizer, not a second curriculum', () => {
  const reused = new Set(reinforcementCards);
  const ownCards = listPrimerOnlyCards(bank);

  it('adds six cards of its own at most, and reuses the rest', () => {
    expect(ownCards.map((card) => card.id)).toEqual([
      'oppsett-tre-ting',
      'oppsett-hvem',
      'print-forste',
      'print-forutsi',
      'tenk-kart',
      'commit-versjon',
    ]);
    expect(ownCards.length).toBeLessThanOrEqual(6);
    expect(reinforcementCards).toHaveLength(24);
    expect(
      primers.flatMap((primer) => primer.cards).filter((c) => reused.has(c))
        .length,
    ).toBe(12);
  });

  it('is short and teaching-first: one idea, one example, one scaffolded check', () => {
    expect(primers).toHaveLength(9);
    for (const primer of primers) {
      expect(primer.cards, primer.id).toHaveLength(2);
      expect(primer.minutes, primer.id).toBeLessThanOrEqual(2);
      expect(primer.cards[0]!.kind, primer.id).toBe('learn');

      const [, check] = primer.cards;

      expect(['select', 'order', 'match'], primer.id).toContain(check!.kind);
      expect(['scaffold', 'representation'], primer.id).toContain(check!.role);
    }
  });

  it('keeps a reused Learn card’s bridge true: the card it names follows it', () => {
    for (const primer of primers) {
      const [learn, check] = primer.cards;
      const home = bank.sessions.find((session) =>
        session.cards.includes(learn!),
      );

      if (home === undefined) {
        continue;
      }
      expect(check, primer.id).toBe(home.cards[home.cards.indexOf(learn!) + 1]);
    }
  });

  it('prepares for real required Campaign missions, in order, without overlap', () => {
    const places = primers.map((primer) =>
      primer.prepares.map((id) => order.indexOf(id)),
    );

    for (const [at, primer] of primers.entries()) {
      expect(
        places[at]!.every((place) => place >= 0),
        primer.id,
      ).toBe(true);
    }
    const flat = places.flat();

    expect(flat).toEqual([...flat].sort((a, b) => a - b));
    expect(new Set(flat).size).toBe(flat.length);
  });

  it('teaches only the missions it prepares for', () => {
    for (const primer of primers) {
      for (const card of primer.cards) {
        for (const unitId of card.source.lessonUnitIds) {
          expect(
            primer.prepares,
            `${primer.id} ${card.id} ${unitId}`,
          ).toContain(itemOfUnit.get(unitId));
        }
      }
    }
  });

  it('stays out of Build work: no Lab, quest, repetition or checkpoint is a target', () => {
    for (const primer of primers) {
      for (const id of primer.prepares) {
        expect(id, primer.id).toMatch(/-o\d\d$/);
      }
    }
  });

  it('never exposes a session’s practice cards through a primer', () => {
    for (const primer of primers) {
      expect(
        primer.cards.filter((card) => card.kind !== 'learn'),
        primer.id,
      ).toHaveLength(1);
    }
  });
});

describe('availability against the real Campaign order', () => {
  it('derives each session’s Campaign items from what its cards cite', () => {
    expect(listSessionCampaignItems(variabler!, itemOfUnit)).toEqual([
      's1-m02-o01',
    ]);
    expect(listSessionCampaignItems(typer!, itemOfUnit)).toEqual([
      's1-m02-o03',
      's1-m02-o04',
    ]);
    expect(listSessionCampaignItems(feil!, itemOfUnit)).toEqual([
      's1-m01-o06',
      's1-m02-o05',
    ]);
    expect(listSessionCampaignItems(tenk!, itemOfUnit)).toEqual([
      's1-m02-o07',
      's1-m01-o04',
      's1-m02-o06',
      's1-m01-o07',
    ]);
  });

  it('can always be opened: every session cites only required Campaign missions', () => {
    for (const session of bank.sessions) {
      const items = listSessionCampaignItems(session, itemOfUnit);

      expect(items, session.id).not.toBeNull();
      for (const id of items!) {
        expect(order, `${session.id} ${id}`).toContain(id);
      }
    }
  });

  it('gives a fresh learner something to do: the primer for where they begin, and no Repeter yet', () => {
    expect(primerId(0)).toBe('forb-oppsett');
    expect(repeatIds(0)).toEqual([]);
  });

  it('follows the Campaign: the primer moves with the current quest', () => {
    const current = (count: number) => [order[count], primerId(count)];

    expect(current(1)).toEqual(['s1-m01-o02', 'forb-oppsett']);
    expect(current(2)).toEqual(['s1-m01-o03', 'forb-print']);
    expect(current(3)).toEqual(['s1-m01-o04', 'forb-tenk']);
    // Nothing covers o05, so the next step's primer is offered.
    expect(current(4)).toEqual(['s1-m01-o05', 'forb-feil']);
    expect(current(5)).toEqual(['s1-m01-o06', 'forb-feil']);
    expect(current(6)).toEqual(['s1-m01-o07', 'forb-commit']);
    expect(current(12)).toEqual(['s1-m02-o01', 'forb-variabler']);
    expect(current(13)).toEqual(['s1-m02-o02', 'forb-typer']);
    expect(current(15)).toEqual(['s1-m02-o04', 'forb-input']);
    expect(current(17)).toEqual(['s1-m02-o06', 'forb-test']);
  });

  it('reproduces the physical test: 2 then 3 of 24 required tasks complete', () => {
    // Home said "2 of 24" and then "3 of 24", and Microlearning showed nothing.
    for (const count of [2, 3]) {
      expect(
        afterCompleting(count).quests.filter((q) => q.complete),
      ).toHaveLength(count);
      expect(
        afterCompleting(count).quests.filter((q) => q.required),
      ).toHaveLength(24);
      // There is something relevant to do...
      expect(primerId(count)).toBeDefined();
      // ...and the reinforcement stays shut, because every one of the four
      // sessions repeats material from Module 2 or from later in Module 1,
      // which the learner has not reached.
      expect(repeatIds(count)).toEqual([]);
    }
  });

  it('opens Repeter one reached topic at a time, as the Campaign is worked', () => {
    expect(repeatIds(3)).toEqual([]);
    // «Tenk før du koder» (s1-m01-o04) is reached: its own topic opens.
    expect(repeatIds(4)).toEqual(['tenk-forst']);
    // «Feilmeldinger» (s1-m01-o06): the reading routine opens.
    expect(repeatIds(6)).toEqual(['feilmeldinger', 'tenk-forst']);
    expect(repeatIds(12)).toEqual(['feilmeldinger', 'tenk-forst']);
    expect(repeatIds(13)).toEqual(['variabler', 'feilmeldinger', 'tenk-forst']);
    expect(repeatIds(15)).toEqual(bank.sessions.map((session) => session.id));
    expect(repeatIds(24)).toEqual(bank.sessions.map((session) => session.id));
  });

  it('holds only the reached topics of a session, and the whole session once all are reached', () => {
    const cardsOf = (count: number, id: string) =>
      listReinforcementSessions(bank, p2Index, afterCompleting(count))
        .find((session) => session.id === id)
        ?.cards.map((card) => card.id);

    expect(cardsOf(4, 'tenk-forst')).toEqual(['tenk-kjede']);
    expect(cardsOf(7, 'tenk-forst')).toEqual([
      'tenk-kjede',
      'git-koble',
      'git-commit-bygg',
    ]);
    expect(cardsOf(6, 'feilmeldinger')).toEqual([
      'feil-les-nedenfra',
      'feil-rutine',
      'feil-skrivefeil',
      'feil-anforselstegn',
    ]);
    expect(cardsOf(15, 'typer-og-input')).toEqual([
      'typer-forskjell',
      'typer-type-av',
      'typer-koble',
    ]);
    // Complete once every topic is reached: the authored session itself.
    for (const [count, session] of [
      [13, variabler],
      [16, typer],
      [17, feil],
      [19, tenk],
    ] as const) {
      expect(
        listReinforcementSessions(bank, p2Index, afterCompleting(count)),
      ).toContain(session);
    }
  });

  it('opens a reached topic that the old all-or-nothing rule held back', () => {
    const position = afterCompleting(6);
    const reached = new Set(
      position.quests.filter((q) => q.reached).map((q) => q.id),
    );
    const oldRuleOpens = (session: MicroSession) =>
      listSessionCampaignItems(session, itemOfUnit)!.every((id) =>
        reached.has(id),
      );

    // Under the old rule nothing repeats yet: each session also cites later
    // material. Under the topic rule the reached topics open.
    expect(bank.sessions.filter(oldRuleOpens)).toEqual([]);
    expect(
      listReinforcementSessions(bank, p2Index, position).map((s) => s.id),
    ).toEqual(['feilmeldinger', 'tenk-forst']);
  });

  it('never shows an unreached topic: not a card, its summary, its minutes or a takeaway', () => {
    const [feilNow, tenkNow] = listReinforcementSessions(
      bank,
      p2Index,
      afterCompleting(6),
    );

    expect(feilNow!.cards.map((card) => card.id)).not.toContain('feil-arsak');
    expect(feilNow!.summary).toBe('Les feilen nedenfra og finn linjen.');
    expect(feilNow!.minutes).toBe(4);
    expect(feilNow!.takeaway).toBeUndefined();
    expect(tenkNow!.cards.map((card) => card.id)).toEqual(['tenk-kjede']);
    expect(tenkNow!.summary).toBe(
      'Fra problem til løsning, i riktig rekkefølge.',
    );
    expect(tenkNow!.minutes).toBe(1);
    // Each open card comes from a mission already reached.
    for (const session of [feilNow!, tenkNow!]) {
      for (const card of session.cards) {
        for (const unitId of card.source.lessonUnitIds) {
          expect(order.indexOf(itemOfUnit.get(unitId)!)).toBeLessThan(6);
        }
      }
    }
  });

  it('counts a mission the learner has started, not only completed ones', () => {
    const position = campaignPosition(p2Index, {
      complete: order.slice(0, 12),
      started: ['s1-m02-o01'],
    });

    expect(
      listReinforcementSessions(bank, p2Index, position).map((s) => s.id),
    ).toEqual(['variabler', 'feilmeldinger', 'tenk-forst']);
  });

  it('never shows anything from further ahead than the next step, and never repeats what is unreached', () => {
    for (let count = 0; count <= order.length; count += 1) {
      const position = afterCompleting(count);
      const chosen = selectPrimer(bank, position);

      if (chosen !== undefined) {
        const first = Math.min(
          ...chosen.prepares.map((id) => order.indexOf(id)),
        );

        // At most one required step beyond the current quest.
        expect(first, `${count} complete`).toBeLessThanOrEqual(count + 1);
      }
      for (const session of listReinforcementSessions(
        bank,
        p2Index,
        position,
      )) {
        for (const id of listSessionCampaignItems(session, itemOfUnit)!) {
          // Everything it repeats has already been completed.
          expect(order.indexOf(id), `${session.id} at ${count}`).toBeLessThan(
            count,
          );
        }
      }
    }
  });

  it('only ever grows Repeter as the Campaign advances', () => {
    let previous = 0;

    for (let count = 0; count <= order.length; count += 1) {
      const open = repeatIds(count).length;

      expect(open, `${count} complete`).toBeGreaterThanOrEqual(previous);
      previous = open;
    }
  });

  it('is honest about its gaps: no state is left with neither a primer nor Repeter', () => {
    const empty = order
      .slice(0, -1)
      .map((id, count) => ({ count, id }))
      .filter(
        ({ count }) =>
          primerId(count) === undefined && repeatIds(count).length === 0,
      )
      .map(({ id }) => id);

    // The Build phase of Module 1 (AI use, lab, quest, repetition) gets no
    // primer, because authentic Build work stays in the Campaign. Under the
    // topic rule it still offers Repeter of the Module 1 topics already
    // reached, so no state is empty.
    expect(empty).toEqual([]);
    for (const count of [7, 8, 9, 10]) {
      expect(primerId(count), `${count}`).toBeUndefined();
      expect(repeatIds(count), `${count}`).toEqual([
        'feilmeldinger',
        'tenk-forst',
      ]);
    }
  });

  it('offers nothing once every required task is complete except Repeter', () => {
    expect(primerId(24)).toBeUndefined();
    expect(repeatIds(24)).toHaveLength(4);
  });
});

describe('programme isolation', () => {
  it('ships no microlearning with CS50x', () => {
    expect(cs50x2026Definition.content.microlearning).toBeUndefined();
  });

  it('refuses a bank that cites modules the programme does not have', () => {
    expect(() =>
      validateProgrammeDefinition({
        ...cs50x2026Definition,
        content: { ...cs50x2026Definition.content, microlearning: bank },
      }),
    ).toThrow(/not a catalogue unit/);
  });
});
