import { useRef, useState } from 'react';
import {
  Form,
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import {
  getRpgReferencePath,
  rpgReferencePath,
} from '@/lib/routing/rpgRoutePaths';

import {
  entries,
  liveSuggestions,
  searchEntries,
  suggestEntries,
  topics,
} from './model';
import './reference.css';

const aliasLabels = {
  synonym: 'Synonym',
  abbreviation: 'Forkortelse / fullt navn',
  historical: 'Tidligere navn',
};

function ReferenceSearch({ query, topic }: { query: string; topic: string }) {
  const [draft, setDraft] = useState(query);
  const [draftTopic, setDraftTopic] = useState(topic);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = showSuggestions ? liveSuggestions(draft, draftTopic) : [];
  const context = new URLSearchParams({ q: draft, tema: draftTopic });

  return (
    <Form
      method="get"
      action={rpgReferencePath}
      role="search"
      className="reference__search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setShowSuggestions(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          setShowSuggestions(false);
          inputRef.current?.focus();
        }
      }}
    >
      <div className="reference__query">
        <label>
          Søk etter navn, alias eller formål
          <input
            ref={inputRef}
            name="q"
            type="search"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setShowSuggestions(true);
            }}
            maxLength={200}
            autoComplete="off"
            aria-describedby={
              suggestions.length ? 'reference-suggestion-help' : undefined
            }
          />
        </label>
        {suggestions.length ? (
          <div className="reference__suggestions">
            <p id="reference-suggestion-help">
              Søkeforslag
              <span className="sr-only">
                {' '}
                — velg en lenke, eller trykk Enter i feltet for å søke.
              </span>
            </p>
            <ul aria-label="Søkeforslag">
              {suggestions.map(({ entry, reason }) => (
                <li key={entry.id}>
                  <Link to={`${getRpgReferencePath(entry.id)}?${context}`}>
                    {entry.name}
                  </Link>{' '}
                  <span className="reference__meta">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <label>
        Tema
        <select
          name="tema"
          value={draftTopic}
          onChange={(event) => setDraftTopic(event.target.value)}
        >
          <option value="">Alle temaer</option>
          {topics.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <button type="submit">Søk</button>
    </Form>
  );
}

export function ReferencePage() {
  const { entryId } = useParams();
  const [params] = useSearchParams();
  const { search } = useLocation();
  const query = params.get('q') ?? '';
  const requestedTopic = params.get('tema') ?? '';
  const topic = topics.find((item) => item === requestedTopic) ?? '';
  const entry = entries.find((item) => item.id === entryId);
  const hits = searchEntries(query, topic);
  const direct = hits.filter(
    (hit) => !['context', 'related'].includes(hit.match),
  );
  const secondary = hits.filter((hit) =>
    ['context', 'related'].includes(hit.match),
  );
  const suggestions = hits.length ? [] : suggestEntries(query, topic);
  const indexHref = `${rpgReferencePath}${search}`;
  const unfiltered = new URLSearchParams(params);
  unfiltered.delete('tema');

  return (
    <section className="reference" lang="nb" aria-label="Teknologioppslag">
      {entryId ? <Link to={indexHref}>Tilbake til søk og tema</Link> : null}
      <h1 className={!entryId ? 'reference__title' : undefined}>
        {entryId
          ? (entry?.name ?? 'Oppføringen finnes ikke')
          : 'Teknologioppslag'}
      </h1>
      {!entryId ? (
        <>
          <ReferenceSearch
            key={`${query}:${topic}`}
            query={query}
            topic={topic}
          />
          <p>Begreper, verktøy og sammenhenger i programvareutvikling</p>
          {requestedTopic && !topic ? (
            <p role="status">Temaet finnes ikke. Viser alle temaer.</p>
          ) : null}
          <p role="status">
            {!query.trim()
              ? `${hits.length} oppføringer`
              : hits.length
                ? `${direct.length} direkte treff${secondary.length ? ` · ${secondary.length} relaterte oppføringer eller omtaler` : ''}`
                : 'Ingen treff. Prøv et annet navn eller et annet tema.'}
          </p>
          {!hits.length && topic ? (
            <p>
              Ingen treff i temaet {topic}.{' '}
              <Link to={`${rpgReferencePath}?${unfiltered}`}>
                Søk i alle temaer
              </Link>
            </p>
          ) : null}
          {suggestions.length ? (
            <p>
              Mente du{' '}
              {suggestions.map((item, i) => (
                <span key={item.id}>
                  {i ? ', ' : ''}
                  <Link to={`${getRpgReferencePath(item.id)}${search}`}>
                    {item.name}
                  </Link>
                </span>
              ))}
              ?
            </p>
          ) : null}
          <ul
            className="reference__results"
            aria-label={query.trim() ? 'Direkte treff' : 'Oppføringer'}
          >
            {direct.map(({ entry: item, reason }) => (
              <li key={item.id}>
                <h2>
                  <Link to={`${getRpgReferencePath(item.id)}${search}`}>
                    {item.name}
                  </Link>
                </h2>
                <p className="reference__meta">
                  {item.type}
                  {reason ? ` · ${reason}` : ''}
                </p>
                <p>{item.summary}</p>
              </li>
            ))}
          </ul>
          {secondary.length ? (
            <section aria-label="Relaterte begreper og omtaler">
              <h2>Relaterte begreper og omtaler</h2>
              <p>
                Disse oppføringene gir sammenheng, men er ikke direkte navne-
                eller formålstreff.
              </p>
              <ul className="reference__results">
                {secondary.map(({ entry: item, reason }) => (
                  <li key={item.id}>
                    <h3>
                      <Link to={`${getRpgReferencePath(item.id)}${search}`}>
                        {item.name}
                      </Link>
                    </h3>
                    <p className="reference__meta">
                      {item.type} · {reason}
                    </p>
                    <p>{item.summary}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : entry ? (
        <article aria-label={entry.name}>
          <p className="reference__meta">{entry.type}</p>
          <p>{entry.summary}</p>
          {entry.aliases.length ? (
            <dl>
              {entry.aliases.map((alias) => (
                <div key={alias.name}>
                  <dt>{aliasLabels[alias.kind]}</dt>
                  <dd>{alias.name}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <p>
            Tema:{' '}
            {entry.topics.map((item, i) => (
              <span key={item}>
                {i ? ', ' : ''}
                <Link
                  to={`${rpgReferencePath}?tema=${encodeURIComponent(item)}`}
                >
                  {item}
                </Link>
              </span>
            ))}
          </p>
          <h2>Hva brukes det til?</h2>
          <p>{entry.purpose}</p>
          <h2>Et konkret eksempel</h2>
          <p>{entry.example}</p>
          <h2>Viktige skiller</h2>
          <ul>
            {entry.distinctions.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
          {entry.spoken ? (
            <>
              <h2>Med egne ord</h2>
              <p>{entry.spoken}</p>
            </>
          ) : null}
          {entry.relations.length ? (
            <>
              <h2>Sammenhenger</h2>
              <ul>
                {entry.relations.map((relation) => (
                  <li key={relation.target}>
                    <Link
                      to={`${getRpgReferencePath(relation.target)}${search}`}
                    >
                      {
                        entries.find((item) => item.id === relation.target)!
                          .name
                      }
                    </Link>{' '}
                    — {relation.kind}. {relation.explanation}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <h2>Kilder</h2>
          <p>Fagkilder åpnes bare når du følger en lenke.</p>
          <ul>
            {entry.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                >
                  {source.title}
                </a>{' '}
                <span className="reference__meta">
                  Kontrollert {source.checked}
                </span>
              </li>
            ))}
          </ul>
        </article>
      ) : (
        <p>
          Adressen peker ikke til et oppslag i denne utgaven. Bruk lenken
          tilbake for å søke.
        </p>
      )}
    </section>
  );
}
