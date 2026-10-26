import { describe, expect, it } from 'vitest';

import type { MicroAssembleCard, MicroSelectCard } from '@/lib/domain';
import { tenkSomEnUtviklerTrack as track } from '@/programmes/programvareutvikling/microlearning/tenkSomEnUtvikler';
import { sqlMysqlSessions as sessions } from '@/programmes/programvareutvikling/microlearning/utviklerblikk/sqlMysql';

const cards = sessions.flatMap((session) => session.cards);
function select(id: string): MicroSelectCard {
  const card = cards.find((entry) => entry.id === `tsu-sql-${id}`);
  if (card?.kind !== 'select') throw new Error(`Missing select ${id}`);
  return card;
}
function answer(id: string) {
  const card = select(id);
  return card.options.find((option) => option.id === card.correctId)!.label;
}
function query(id: string) {
  const card = cards.find((entry) => entry.id === `tsu-sql-${id}`);
  if (card?.kind !== 'assemble') throw new Error(`Missing assemble ${id}`);
  return (card as MicroAssembleCard).correctOrder
    .map((id) => card.tokens.find((token) => token.id === id)!.text)
    .join(' ');
}

// Independent arithmetic over the fictional fixture, NOT a SQL interpreter.
const people = [
  { id: 1, navn: 'Ada', alder: 17, epost: 'ada@eksempel.no' },
  { id: 2, navn: 'Bo', alder: 20, epost: null },
  { id: 3, navn: 'Ada', alder: 22, epost: 'ada3@eksempel.no' },
  { id: 4, navn: 'Dina', alder: 30, epost: 'dina@eksempel.no' },
];
const registrations = [
  { id: 101, deltaker: 1, aktivitet: 'SQL', status: 'ja' },
  { id: 102, deltaker: 1, aktivitet: 'Web', status: 'nei' },
  { id: 103, deltaker: 2, aktivitet: 'SQL', status: 'ja' },
];

describe('SQL/MySQL authored assessment contract', () => {
  it('registers exactly six complete activities after the accepted 24', () => {
    expect(track.categories!.slice(4)).toEqual([
      {
        id: 'sql-mysql',
        title: 'Databaser – SQL/MySQL',
        summary:
          'Øv på SQL: hent, endre og koble data. Forutsi resultater og finn feil.',
        sessionIds: ['01', '02', '03', '04', '05', '06'].map(
          (id) => `tsu-sql-${id}`,
        ),
      },
    ]);
    expect(track.sessions.slice(24)).toEqual(sessions);
    for (const [index, session] of sessions.entries()) {
      expect(session.cards).toHaveLength(4);
      expect(session.cards[0]!.kind).toBe('learn');
      expect(session.cards.at(-1)!.title).toMatch(/^Ny situasjon:/);
      expect(session.takeaway).toBeTruthy();
      for (const card of session.cards) {
        expect(card.source.lessonUnitIds).toEqual([`SQL84-0${index + 1}`]);
        if (card.kind !== 'learn') expect(card.context, card.id).toBeTruthy();
      }
    }
  });

  it('constructs filters, a targeted write, a relationship and a valid grouping', () => {
    expect(query('02-bygg')).toBe(
      'SELECT navn FROM deltakere WHERE alder >= 18 AND alder <= 25 ORDER BY alder ASC;',
    );
    expect(query('03-bygg')).toBe(
      "UPDATE pameldinger SET status = 'ja' WHERE id = 102;",
    );
    expect(query('04-bygg')).toBe('ON d.id = p.deltaker_id;');
    expect(query('05-bygg')).toBe(
      'SELECT aktivitet, COUNT(*) FROM pameldinger GROUP BY aktivitet ORDER BY aktivitet;',
    );
  });

  it('checks the age boundaries, descending result and OR distractor against the fixture', () => {
    expect(
      people.filter((p) => p.alder >= 18 && p.alder <= 25).map((p) => p.id),
    ).toEqual([2, 3]);
    expect(people.filter((p) => p.alder >= 18 || p.alder <= 25)).toHaveLength(
      4,
    );
    const result = people
      .filter((p) => p.alder >= 20)
      .sort((a, b) => b.alder - a.alder)
      .slice(0, 2);
    expect(answer('02-resultat')).toBe(result.map((p) => p.navn).join(', '));
    expect(select('02-resultat').code).toContain(
      'ORDER BY alder DESC\nLIMIT 2;',
    );
  });

  it('distinguishes primary/foreign keys and preserves one-to-many joined rows', () => {
    expect(answer('01-nokkel')).toBe('Ada med ID 1.');
    expect(
      registrations.every((r) => people.some((p) => p.id === r.deltaker)),
    ).toBe(true);
    const pairs = people.flatMap((p) =>
      registrations
        .filter((r) => r.deltaker === p.id)
        .map((r) => `(${p.id}, ${r.id})`),
    );
    expect(answer('04-resultat')).toBe(pairs.join(', '));
    expect(select('04-resultat').code).toContain('ORDER BY d.id, p.id');
    expect(answer('04-overfor')).toBe('8');
    expect(select('04-overfor').code).toContain('WHERE o.ordre_id IS NULL;');
  });

  it('cross-checks deleted IDs, targeted update and a missing-WHERE transfer', () => {
    const deleted = registrations
      .filter((r) => r.deltaker === 1)
      .map((r) => r.id);
    expect(deleted).toEqual([101, 102]);
    expect(answer('03-slett')).toBe(`Påmelding ${deleted.join(' og ')}.`);
    expect(
      registrations.filter((r) => r.id === 102 && r.status !== 'ja'),
    ).toHaveLength(1);
    expect(select('03-fare').code).toBe('UPDATE varer\nSET pris = 100;');
    expect(answer('03-fare')).toBe('Begge varene får pris 100.');
  });

  it('checks NULL counting and aggregation arithmetic without substituting SQLite', () => {
    expect(answer('05-null')).toBe(
      `${people.length} og ${people.filter((p) => p.epost !== null).length}`,
    );
    expect(registrations.filter((r) => r.aktivitet === 'SQL')).toHaveLength(2);
    expect(registrations.filter((r) => r.aktivitet === 'Web')).toHaveLength(1);
    const known = [2, 4, null].filter((n): n is number => n !== null);
    expect(answer('05-overfor')).toBe(
      `${known.reduce((a, b) => a + b, 0) / known.length}, ${Math.min(...known)}, ${Math.max(...known)}`,
    );
  });

  it('corrects the column and NULL test and binds input as data', () => {
    expect(select('06-rett').code).toContain('WHERE email = NULL;');
    expect(answer('06-rett')).toBe('WHERE epost IS NULL;');
    expect(people.filter((p) => p.epost === null).map((p) => p.id)).toEqual([
      2,
    ]);
    expect(answer('06-overfor')).toMatch(
      /Parameterbinding: SELECT kunde_id.*separat verdi/,
    );
    expect(select('06-overfor').context).toMatch(/API-et.*MySQL-konsollen/);
    expect(answer('06-transaksjon')).toMatch(
      /START TRANSACTION.*kontroller.*COMMIT eller ROLLBACK/,
    );
    expect(select('06-transaksjon').context).toMatch(
      /ALTER\/DROP TABLE.*ikke angres/,
    );
  });
});
