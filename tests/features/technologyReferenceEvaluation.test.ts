import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import {
  searchEntries,
  suggestEntries,
} from '@/features/technologyReference/model';

// Adjudicated from user intent and the concepts before changing retrieval.
// Secondary concepts are permitted, not required. Holdouts do not change keywords.
const cases: {
  query: string;
  intent: string;
  first: string[];
  secondary?: string[];
  topic?: string;
  suggestion?: string;
}[] = [
  { query: 'Java', intent: 'Unknown, distinct language', first: [] },
  {
    query: 'JavaScript',
    intent: 'Language identity',
    first: ['javascript'],
    secondary: ['typescript', 'node-js'],
  },
  {
    query: 'hvordan kjøre containere',
    intent: 'Basic container running',
    first: ['docker', 'container'],
    secondary: ['kubernetes'],
  },
  {
    query: 'API?',
    intent: 'Punctuated identity',
    first: ['api'],
    secondary: ['react', 'kubernetes', 'rest'],
  },
  {
    query: 'React?',
    intent: 'Punctuated identity',
    first: ['react'],
    secondary: ['react-native', 'api'],
  },
  {
    query: 'K8s?',
    intent: 'Punctuated abbreviation',
    first: ['kubernetes'],
    secondary: ['api', 'container', 'docker'],
  },
  {
    query: 'SQL Server?',
    intent: 'Punctuated product identity',
    first: ['sql-server'],
    secondary: ['sql', 'relational-database'],
  },
  {
    query: 'Hva er API?',
    intent: 'Beginner definition',
    first: ['api'],
    secondary: ['react', 'kubernetes', 'rest'],
  },
  {
    query: 'Hva er en database',
    intent: 'Beginner definition',
    first: ['database'],
    secondary: ['relational-database'],
  },
  {
    query: 'Hva brukes Kubernetes til?',
    intent: 'Named platform purpose',
    first: ['kubernetes'],
    secondary: ['api', 'container', 'docker'],
  },
  {
    query: 'Hva er React',
    intent: 'Beginner definition',
    first: ['react'],
    secondary: ['react-native', 'api'],
  },
  {
    query: 'API',
    topic: 'Drift',
    intent: 'Identity excluded by filter: clear filter, no substitute',
    first: [],
  },
  {
    query: 'API',
    intent: 'Concept identity',
    first: ['api'],
    secondary: ['react', 'kubernetes', 'rest'],
  },
  {
    query: 'React',
    intent: 'Library identity',
    first: ['react'],
    secondary: ['react-native', 'api'],
  },
  {
    query: 'React Native',
    intent: 'Framework, distinct from React',
    first: ['react-native'],
    secondary: ['react'],
  },
  {
    query: 'Postgres',
    intent: 'Accepted alias',
    first: ['postgresql'],
    secondary: ['sql', 'relational-database'],
  },
  {
    query: 'Azure AD',
    intent: 'Historical name',
    first: ['microsoft-entra-id'],
    secondary: ['authentication', 'authorization'],
  },
  {
    query: 'SQL',
    intent: 'Language, not product identity',
    first: ['sql'],
    secondary: ['sql-server', 'postgresql', 'relational-database'],
  },
  {
    query: 'SQL Server',
    intent: 'Product, not SQL identity',
    first: ['sql-server'],
    secondary: ['sql', 'relational-database'],
  },
  {
    query: 'Go',
    intent: 'Short language name',
    first: ['go'],
    secondary: ['backend'],
  },
  {
    query: 'teste nettsider automatisk',
    intent: 'Browser automation purpose',
    first: ['playwright'],
    secondary: ['frontend'],
  },
  {
    query: 'lagre data',
    intent: 'Storage concept',
    first: ['database'],
    secondary: ['postgresql', 'relational-database', 'backend'],
  },
  {
    query: 'registrerer historikk',
    intent: 'Version history',
    first: ['git'],
    secondary: ['github'],
  },
  {
    query: 'K8s',
    intent: 'Abbreviation',
    first: ['kubernetes'],
    secondary: ['api', 'container', 'docker'],
  },
  {
    query: 'Kubernets',
    intent: 'Typo: suggestion only',
    first: [],
    suggestion: 'kubernetes',
  },
  {
    query: 'autentisering autorisasjon',
    intent: 'Two distinct concepts',
    first: ['authentication', 'authorization'],
    secondary: ['microsoft-entra-id'],
  },
  {
    query: 'innlogging organisasjoner',
    intent: 'Organisational identity service',
    first: ['microsoft-entra-id'],
    secondary: ['authentication', 'authorization'],
  },
  {
    query: 'komponenter skjermen',
    intent: 'UI components',
    first: ['react'],
    secondary: ['react-native', 'api'],
  },
  // Four held-out questions. No editorial keyword changes for these.
  {
    query: 'Hva er Node.js?',
    intent: 'Holdout: dotted technical name',
    first: ['node-js'],
    secondary: ['javascript', 'npm'],
  },
  {
    query: 'Hvordan installere pakker?',
    intent: 'Holdout: package management purpose',
    first: ['npm'],
    secondary: ['node-js', 'react'],
  },
  {
    query: 'Hva er forskjellen på autentisering og autorisasjon?',
    intent: 'Holdout: named comparison',
    first: ['authentication', 'authorization'],
    secondary: ['microsoft-entra-id'],
  },
  {
    query: 'Hva brukes React Native til?',
    intent: 'Holdout: multiword purpose question',
    first: ['react-native'],
    secondary: ['react'],
  },
  ...[
    'surdeigsstarter',
    'slette surdeigsstarter',
    'MSDB',
    'C#',
    '.NET',
    'CI/CD',
    'C++',
    'god',
    'Django',
  ].map((query) => ({
    query,
    intent: 'Negative control: no identity in this catalogue',
    first: [],
  })),
  {
    query: 'ReactNative',
    intent: 'Do not merge names; suggestion is permissible',
    first: [],
    suggestion: 'react-native',
  },
  {
    query: 'Nodejs',
    intent: 'Do not erase technical punctuation',
    first: [],
    suggestion: 'node-js',
  },
  {
    query: 'SQLServer',
    intent: 'Do not merge words; suggestion is permissible',
    first: [],
    suggestion: 'sql-server',
  },
];

it('records and challenges the same independent oracle before and after remediation', () => {
  const report = cases.map((item) => ({
    ...item,
    results: searchEntries(item.query, item.topic).map(
      ({ entry, ...match }) => ({ id: entry.id, ...match }),
    ),
    suggestions: suggestEntries(item.query, item.topic).map(
      (entry) => entry.id,
    ),
  }));
  mkdirSync('artifacts/technology-reference/remediation', { recursive: true });
  writeFileSync(
    `artifacts/technology-reference/remediation/${process.env.REFERENCE_EVAL_PHASE === 'before' ? 'before' : 'after'}-search.json`,
    JSON.stringify(report, null, 2) + '\n',
  );
  for (const row of report) {
    const ids = row.results.map((hit) => hit.id);
    if (!row.first.length) expect.soft(ids, row.query).toEqual([]);
    else {
      expect.soft(row.first, row.query).toContain(ids[0]);
      const allowed = [...row.first, ...(row.secondary ?? [])];
      expect
        .soft(
          ids.filter((id) => !allowed.includes(id)),
          row.query,
        )
        .toEqual([]);
      if (row.first.includes('authentication'))
        expect
          .soft(ids.slice(0, 2).sort(), row.query)
          .toEqual(['authentication', 'authorization']);
    }
    expect
      .soft(row.suggestions, row.query)
      .toEqual(row.suggestion ? [row.suggestion] : []);
  }
});
