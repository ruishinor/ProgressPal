import { describe, expect, it } from 'vitest';
import {
  entries,
  normalize,
  searchEntries,
  suggestEntries,
  topics,
  liveSuggestions,
} from '@/features/technologyReference/model';

describe('reference catalogue contract', () => {
  it('contains exactly the authorized canonical concepts and correct term types', () => {
    const expected = {
      api: 'Begrep',
      rest: 'Arkitekturstil',
      frontend: 'Begrep',
      backend: 'Begrep',
      html: 'Markeringsspråk',
      css: 'Stilspråk',
      javascript: 'Programmeringsspråk',
      typescript: 'Programmeringsspråk',
      react: 'Bibliotek',
      'react-native': 'Rammeverk',
      'node-js': 'Kjøremiljø',
      database: 'Begrep',
      'relational-database': 'Databasemodell',
      sql: 'Spørrespråk',
      postgresql: 'Databasesystem',
      'sql-server': 'Databasesystem',
      git: 'Versjonskontrollverktøy',
      github: 'Samarbeidsplattform',
      npm: 'Pakkeverktøy og register',
      vite: 'Byggverktøy',
      playwright: 'Testverktøy',
      container: 'Kjøreteknikk',
      docker: 'Containerverktøy',
      kubernetes: 'Driftsplattform',
      go: 'Programmeringsspråk',
      authentication: 'Sikkerhetsbegrep',
      authorization: 'Sikkerhetsbegrep',
      'microsoft-entra-id': 'Identitetstjeneste',
    };
    expect(
      Object.fromEntries(entries.map((entry) => [entry.id, entry.type])),
    ).toEqual(expected);
  });
  it('has unique canonical IDs, names and aliases, valid text, topics, sources and directional links', () => {
    const ids = new Set(entries.map((entry) => entry.id));
    expect(ids.size).toBe(entries.length);
    const names = new Set<string>();
    for (const entry of entries) {
      expect(entry.id).toMatch(/^[a-z][a-z0-9-]*$/);
      for (const text of [
        entry.name,
        entry.type,
        entry.summary,
        entry.purpose,
        entry.example,
        ...entry.distinctions,
        ...entry.purposeTerms,
      ])
        expect(text.trim().length).toBeGreaterThan(0);
      for (const name of [
        entry.name,
        ...entry.aliases.map((alias) => alias.name),
      ]) {
        expect(names.has(normalize(name)), name).toBe(false);
        names.add(normalize(name));
      }
      for (const alias of entry.aliases)
        expect(['synonym', 'abbreviation', 'historical']).toContain(alias.kind);
      expect(entry.topics.length).toBeGreaterThan(0);
      for (const topic of entry.topics) expect(topics).toContain(topic);
      expect(new Set(entry.relations.map((r) => r.target)).size).toBe(
        entry.relations.length,
      );
      for (const relation of entry.relations) {
        expect(ids.has(relation.target), relation.target).toBe(true);
        expect(relation.target).not.toBe(entry.id);
        expect(relation.kind.length).toBeGreaterThan(0);
        expect(relation.explanation.length).toBeGreaterThan(30);
      }
      expect(entry.sources.length).toBeGreaterThan(0);
      for (const source of entry.sources) {
        const url = new URL(source.url);
        expect(url.protocol).toBe('https:');
        expect(url.username + url.password).toBe('');
        expect(source.title.length).toBeGreaterThan(0);
        expect(source.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(new Date(source.checked).toISOString().slice(0, 10)).toBe(
          source.checked,
        );
      }
    }
  });
});

describe('live reference suggestions', () => {
  it.each([
    ['Postgre', 'postgresql'],
    ['K8', 'kubernetes'],
    ['Azure Act', 'microsoft-entra-id'],
  ])(
    'offers %s as a prediction without changing submitted search',
    (query, id) => {
      expect(searchEntries(query)).toEqual([]);
      expect(liveSuggestions(query)).toMatchObject([
        { entry: { id }, kind: 'prediction' },
      ]);
    },
  );
  it('keeps exact identities, aliases and spelling guesses distinct', () => {
    for (const [query, id] of [
      ['SQL', 'sql'],
      ['Go', 'go'],
      ['React', 'react'],
    ])
      expect(liveSuggestions(query)).toMatchObject([
        { entry: { id }, kind: 'identity' },
      ]);
    expect(liveSuggestions('Azure AD')).toMatchObject([
      { entry: { id: 'microsoft-entra-id' }, reason: 'Alias-treff: Azure AD' },
    ]);
    expect(liveSuggestions('Kubernets')).toMatchObject([
      { entry: { id: 'kubernetes' }, kind: 'spelling' },
    ]);
    expect(liveSuggestions('API', 'Drift')).toEqual([]);
    expect(liveSuggestions('Postgre', 'Drift')).toEqual([]);
  });
  it.each([
    ['Jeg vil se hva som ble endret i kildekoden tidligere', 'git'],
    [
      'Kan jeg teste at en nettside virker ved å klikke rundt automatisk?',
      'playwright',
    ],
    [
      'Vi trenger å lagre kunder og bestillinger i tabeller',
      'relational-database',
    ],
    ['Hvordan kan et program pakkes og kjøres likt flere steder?', 'docker'],
    ['Vi har mange containere på forskjellige maskiner', 'kubernetes'],
    ['Hvordan sjekker systemet hvem som logger inn?', 'authentication'],
    ['Hvem får lov til å se fakturaene?', 'authorization'],
    ['Hvordan får jeg JavaScript til å kjøre utenfor nettleseren?', 'node-js'],
  ])('labels an authored purpose for %s', (query, id) => {
    expect(searchEntries(query)[0]).toMatchObject({
      entry: { id },
      match: 'purpose',
    });
    expect(liveSuggestions(query)).toMatchObject([
      { entry: { id }, kind: 'purpose' },
    ]);
  });
  it.each([
    '',
    'a',
    'å',
    'Java',
    'Hva er Java?',
    'surdeigsstarter',
    'god',
    'C#',
    '.NET',
    'CI/CD',
    'Hva er et rammeverk?',
    'ikke teste en nettside automatisk',
    'slette historikk for kode',
  ])('does not invent suggestions for %s', (query) => {
    expect(liveSuggestions(query)).toEqual([]);
  });
});

describe('reference search', () => {
  it('does not match a short name inside ordinary words', () => {
    expect(searchEntries('Go')[0]?.entry.id).toBe('go');
    expect(searchEntries('god')).toEqual([]);
  });
  it.each(entries.map((entry) => [entry.name, entry.id]))(
    'canonical %s always ranks %s first',
    (query, id) => {
      expect(searchEntries(query)[0]).toMatchObject({
        entry: { id },
        score: 500,
      });
    },
  );
  it.each(
    entries.flatMap((entry) =>
      entry.aliases.map((alias) => [alias.name, entry.id]),
    ),
  )('alias %s always ranks %s first', (query, id) => {
    expect(searchEntries(query)[0]).toMatchObject({
      entry: { id },
      score: 400,
      alias: query,
    });
  });
  it.each([
    ['API', 'api'],
    ['React', 'react'],
    ['K8s', 'kubernetes'],
    ['Application Programming Interface', 'api'],
    ['programmeringsgrensesnitt', 'api'],
    ['hvordan kjøre containere', 'docker'],
  ])('%s ranks %s first', (query, id) => {
    expect(searchEntries(query)[0]?.entry.id).toBe(id);
  });
  it('understands basic Bokmål question scaffolding and one common verb inflection', () => {
    expect(searchEntries('Hva betyr JavaScript?')[0]?.entry.id).toBe(
      'javascript',
    );
    expect(searchEntries('Hvorfor brukes Kubernetes?')[0]?.entry.id).toBe(
      'kubernetes',
    );
    expect(searchEntries('Hvordan kjører jeg containere?')[0]?.entry.id).toBe(
      'docker',
    );
    expect(searchEntries('Java')).toEqual([]);
  });
  it('labels alias matches and keeps spelling suggestions separate from real results', () => {
    expect(searchEntries('K8s')[0]?.alias).toBe('K8s');
    expect(searchEntries('Kubernets')).toEqual([]);
    expect(suggestEntries('Kubernets').map((entry) => entry.id)).toEqual([
      'kubernetes',
    ]);
    for (const query of ['surdeigsstarter', 'MSDB', 'C#', '.NET', 'CI/CD']) {
      expect(searchEntries(query)).toEqual([]);
      expect(suggestEntries(query)).toEqual([]);
    }
  });
  it('normalizes Unicode, case and whitespace while preserving meaningful punctuation', () => {
    expect(normalize('  ＡＰＩ  ')).toBe('api');
    expect(normalize(' C# .NET CI/CD ')).toBe('c# .net ci/cd');
    expect(normalize('spra\u030ak')).toBe('språk');
    expect(searchEntries('  rEact  ')[0]?.entry.id).toBe('react');
    expect(searchEntries('API', 'Drift')).toEqual([]);
    expect(searchEntries('', 'Drift').map((hit) => hit.entry.id)).toEqual([
      'container',
      'docker',
      'kubernetes',
    ]);
  });
  it('separates identity, editorial purpose, supporting prose and explained relations', () => {
    const api = searchEntries('Hva er API?');
    expect(api[0]).toMatchObject({
      entry: { id: 'api' },
      match: 'name',
      score: 500,
    });
    expect(
      api
        .slice(1)
        .every(
          (hit) => hit.match === 'related' && hit.reason.includes('API →'),
        ),
    ).toBe(true);
    expect(api.map((hit) => hit.entry.id)).not.toContain('javascript');
    const react = searchEntries('React');
    expect(react.map((hit) => hit.entry.id)).toEqual([
      'react',
      'api',
      'react-native',
    ]);
    expect(react.slice(1).every((hit) => hit.match === 'related')).toBe(true);
    expect(searchEntries('registrerer historikk')[0]).toMatchObject({
      entry: { id: 'git' },
      match: 'context',
    });
    expect(searchEntries('hvordan kjøre containere')[0]).toMatchObject({
      entry: { id: 'docker' },
      match: 'purpose',
    });
    expect(
      searchEntries('hvordan kjøre containere')
        .slice(1)
        .map((hit) => [hit.entry.id, hit.match]),
    ).toEqual([
      ['container', 'related'],
      ['kubernetes', 'related'],
    ]);
    expect(searchEntries('Java')).toEqual([]);
    expect(searchEntries('React Native')[0]?.entry.id).toBe('react-native');
    expect(searchEntries('React', 'Identitet')).toEqual([]);
    expect(searchEntries('K8s?', 'Drift').map((hit) => hit.entry.id)).toEqual([
      'kubernetes',
      'container',
      'docker',
    ]);
  });
});
