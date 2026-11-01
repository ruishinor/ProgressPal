import catalogue from './entries.json';

export type ReferenceEntry = {
  id: string;
  name: string;
  type: string;
  summary: string;
  purpose: string;
  example: string;
  distinctions: string[];
  spoken?: string;
  aliases: { name: string; kind: 'synonym' | 'abbreviation' | 'historical' }[];
  topics: string[];
  purposeTerms: string[];
  relations: { target: string; kind: string; explanation: string }[];
  sources: { title: string; url: string; checked: string }[];
};

// JSON is checked deterministically by the catalogue contract tests. All text
// ships in the static boot graph; no request or learner-store access is needed.
export const entries: readonly ReferenceEntry[] = catalogue as ReferenceEntry[];
export const topics = [
  'Grunnbegreper',
  'Web og grensesnitt',
  'Drift',
  'Data',
  'Verktøy',
  'Språk',
  'Identitet',
] as const;

export function normalize(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('nb')
    .trim()
    .replace(/\s+/gu, ' ');
}

// Whole technical words: sentence punctuation separates words, but C#, C++,
// .NET, CI/CD and Node.js keep their identity. No stemming or substring search.
const words = (value: string) =>
  (normalize(value).match(/[\p{L}\p{N}#.+/-]+/gu) ?? [])
    .map((word) => word.replace(/\.+$/u, ''))
    .filter(Boolean);

// Bounded question scaffolding, not a general language parser. Kept separate
// from identity tokenization so aliases retain all their authored words.
const queryWords = (value: string) =>
  words(value)
    // One bounded Bokmål inflection needed for a common purpose query.
    .map((word) => (word === 'kjører' ? 'kjøre' : word))
    .filter(
      (word) =>
        ![
          'hvordan',
          'hva',
          'betyr',
          'hvorfor',
          'jeg',
          'er',
          'brukes',
          'til',
          'å',
          'og',
          'en',
          'et',
          'for',
          'forskjellen',
          'på',
          'what',
          'is',
          'how',
          'to',
          'a',
          'an',
          'the',
        ].includes(word),
    );

export type SearchHit = {
  entry: ReferenceEntry;
  score: number;
  alias?: string;
  match: 'name' | 'alias' | 'purpose' | 'context' | 'related' | 'browse';
  reason: string;
};

export function searchEntries(query: string, topic = ''): SearchHit[] {
  const inTopic = (entry: ReferenceEntry) =>
    !topic || entry.topics.includes(topic);
  const sort = (hits: SearchHit[]) =>
    hits.sort(
      (a, b) =>
        b.score - a.score || a.entry.name.localeCompare(b.entry.name, 'nb'),
    );
  if (!normalize(query))
    return sort(
      entries
        .filter(inTopic)
        .map((entry) => ({ entry, score: 0, match: 'browse', reason: '' })),
    );
  const tokens = queryWords(query);
  if (!tokens.length) return [];
  const needle = tokens.join(' ');
  const covers = (text: string) =>
    tokens.every((token) => words(text).includes(token));

  // Resolve identities across the catalogue before filtering: an excluded API
  // must not silently turn into an incidental Kubernetes prose mention.
  const identities = entries.flatMap((entry): SearchHit[] => {
    if (words(entry.name).join(' ') === needle)
      return [{ entry, score: 500, match: 'name', reason: 'Navnetreff' }];
    const alias = entry.aliases.find(
      (item) => words(item.name).join(' ') === needle,
    );
    return alias
      ? [
          {
            entry,
            score: 400,
            match: 'alias',
            alias: alias.name,
            reason: `Alias-treff: ${alias.name}`,
          },
        ]
      : [];
  });
  let direct = identities;
  if (!direct.length) {
    // Name words stay within one name/alias. Also support a query containing
    // multiple complete names (autentisering autorisasjon), with no unknown words.
    const named = entries.flatMap((entry): SearchHit[] => {
      const names = [entry.name, ...entry.aliases.map((alias) => alias.name)];
      return names.some(
        (name) =>
          covers(name) || words(name).every((word) => tokens.includes(word)),
      )
        ? [{ entry, score: 300, match: 'name', reason: 'Ord i navn' }]
        : [];
    });
    const nameWords = named.flatMap(({ entry }) =>
      [entry.name, ...entry.aliases.map((alias) => alias.name)].flatMap(words),
    );
    if (tokens.every((token) => nameWords.includes(token))) direct = named;
  }
  if (!direct.length)
    direct = entries.flatMap((entry): SearchHit[] => {
      const term = entry.purposeTerms.find(covers);
      return term
        ? [
            {
              entry,
              score: queryWords(term).join(' ') === needle ? 250 : 200,
              match: 'purpose',
              reason: `Formål: ${term}`,
            },
          ]
        : [];
    });
  if (!direct.length && tokens.length >= 2)
    direct = entries.flatMap((entry): SearchHit[] =>
      covers(`${entry.summary} ${entry.purpose} ${entry.example}`)
        ? [
            {
              entry,
              score: 100,
              match: 'context',
              reason: 'Omtale i forklaringen',
            },
          ]
        : [],
    );

  direct = sort(direct.filter(({ entry }) => inTopic(entry)));
  const related: SearchHit[] = [];
  // Only explicit, authored, outgoing links from an in-topic direct answer.
  // Relation prose and distinctions are never an unanchored search index.
  for (const hit of direct.filter(
    (hit) => hit.score >= 200 && hit.score === direct[0]?.score,
  )) {
    for (const relation of hit.entry.relations) {
      const entry = entries.find((entry) => entry.id === relation.target)!;
      if (
        !inTopic(entry) ||
        [...direct, ...related].some((hit) => hit.entry.id === entry.id)
      )
        continue;
      related.push({
        entry,
        score: 50,
        match: 'related',
        reason: `${hit.entry.name} → ${entry.name}: ${relation.kind}. ${relation.explanation}`,
      });
    }
  }
  return [...direct, ...sort(related)];
}

// Suggestions are separate from results. Never rewrite a short name or turn
// a spelling guess into a claimed match (Go, SQL, C#, .NET and CI/CD matter).
function editDistance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

export function suggestEntries(query: string, topic = '') {
  const needle = queryWords(query).join(' ');
  if (
    needle.length < 5 ||
    needle.includes(' ') ||
    searchEntries(query, topic).length
  )
    return [];
  return entries.filter(
    (entry) =>
      (!topic || entry.topics.includes(topic)) &&
      editDistance(needle, normalize(entry.name)) <= 2,
  );
}
