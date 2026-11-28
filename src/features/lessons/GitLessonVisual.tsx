import { useId, useState } from 'react';

import type { GitVisual, VisualFrame } from './gitVisuals';

function StatusRows({ frame }: { frame: VisualFrame }) {
  return (
    <div className="git-visual-status">
      {frame.rows?.map(({ x, y, file, meaning }) => {
        const special = x + y === '??' || x + y === 'UU';
        const firstTone = special ? 'git-tone-neutral' : 'git-tone-blue';
        const secondTone = special ? 'git-tone-neutral' : 'git-tone-amber';
        return (
          <div className="git-status-row" key={x + y + file}>
            <div className="git-status-line">
              <div className="git-status-part">
                <span className={`git-status-cell ${firstTone}`}>
                  {x === ' ' ? '·' : x}
                </span>
                <span className="git-status-label">
                  {special ? (x === '?' ? 'Ny fil' : 'Konflikt') : 'Staged'}
                </span>
              </div>
              <div className="git-status-part">
                <span className={`git-status-cell ${secondTone}`}>
                  {y === ' ' ? '·' : y}
                </span>
                <span className="git-status-label">
                  {special ? (y === '?' ? 'Usporet' : 'Uløst') : 'Unstaged'}
                </span>
              </div>
              <span className="git-status-file">{file}</span>
            </div>
            <p>{meaning}</p>
          </div>
        );
      })}
      {frame.rows?.some((row) => row.x === ' ' || row.y === ' ') && (
        <p className="lesson-note">
          Prikken viser et mellomrom i Git-utskriften.
        </p>
      )}
    </div>
  );
}

function CommitGraph({ frame }: { frame: VisualFrame }) {
  const marker = useId();
  const nodes = frame.nodes ?? [];
  const reversalStart = nodes.find((node) => node.id === frame.reversal?.from);
  const reversalEnd = nodes.find((node) => node.id === frame.reversal?.to);
  const refs = frame.refs ?? [];
  const graphTop = Math.min(
    0,
    ...refs.map(
      ({ at }) => (nodes.find((node) => node.id === at)?.y ?? 0) - 52,
    ),
  );
  const graphBottom = Math.max(...nodes.map((node) => node.y + 67), 90);
  const description = [
    ...nodes.map((node) => `${node.id}: ${node.label}`),
    ...(frame.edges ?? []).map((edge) => `${edge.from} til ${edge.to}`),
    ...refs.map((ref) => `${ref.name} peker på ${ref.at}`),
    frame.caption,
  ].join('. ');
  return (
    <div className="git-graph-layout">
      <svg
        aria-label={description}
        className="git-visual-graph"
        role="img"
        viewBox={`0 ${graphTop} 360 ${graphBottom - graphTop}`}
      >
        <title>{frame.caption ?? 'Commit-historikk'}</title>
        <defs>
          <marker
            id={marker}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 Z" fill="context-stroke" />
          </marker>
        </defs>
        {reversalStart && reversalEnd && (
          <g className="git-tone-red">
            <path
              className="git-graph-edge git-graph-reversal"
              d={`M${reversalStart.x} ${reversalStart.y - 16} Q${(reversalStart.x + reversalEnd.x) / 2} -34 ${reversalEnd.x} ${reversalEnd.y - 16}`}
              markerEnd={`url(#${marker})`}
            />
            <text
              className="git-graph-label"
              x={(reversalStart.x + reversalEnd.x) / 2}
              y="10"
              textAnchor="middle"
            >
              Gjør om B
            </text>
          </g>
        )}
        {frame.edges?.map(({ from, to }) => {
          const a = nodes.find((node) => node.id === from);
          const b = nodes.find((node) => node.id === to);
          if (!a || !b) return null;
          return (
            <path
              className={`git-tone-${b.tone} git-graph-edge`}
              d={`M${a.x} ${a.y} L${b.x} ${b.y}`}
              key={from + to}
            />
          );
        })}
        {refs.map(({ name, at }, index) => {
          const node = nodes.find((entry) => entry.id === at);
          if (!node) return null;
          const overlapping = refs.slice(0, index).some((ref) => ref.at === at);
          const x = Math.min(
            303,
            Math.max(57, node.x + (overlapping ? 85 : 0)),
          );
          const below = overlapping || node.id === frame.reversal?.from;
          const y = below ? node.y + 54 : node.y - 34;
          const lineStart = below ? y - 9 : y + 9;
          const lineEnd = below ? node.y + 16 : node.y - 16;
          const width = name.length * 6.6 + 14;
          return (
            <g className="git-tone-blue" key={name}>
              <path
                className="git-graph-edge"
                d={`M${x} ${lineStart} L${node.x} ${lineEnd}`}
                markerEnd={`url(#${marker})`}
              />
              <rect
                className="git-graph-node"
                x={x - width / 2}
                y={y - 9}
                width={width}
                height="18"
                rx="4"
              />
              <text
                className="git-graph-label"
                x={x}
                y={y + 4}
                textAnchor="middle"
              >
                {name}
              </text>
            </g>
          );
        })}
        {nodes.map((node) => (
          <g className={`git-tone-${node.tone}`} key={node.id}>
            <circle className="git-graph-node" cx={node.x} cy={node.y} r="16" />
            <text className="git-graph-id" x={node.x} y={node.y + 4}>
              {node.id}
            </text>
            <text
              className="git-graph-label"
              textAnchor={
                node.x < 60 ? 'start' : node.x > 290 ? 'end' : 'middle'
              }
              x={node.x}
              y={node.y + 34}
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
      <dl className="git-graph-key">
        {nodes
          .filter((node) => node.label)
          .map((node) => (
            <div key={node.id}>
              <dt>{node.id}</dt>
              <dd>{node.label}</dd>
            </div>
          ))}
        {refs.map(({ name, at }) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>peker på {at}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function VisualCards({ frame, kind }: { frame: VisualFrame; kind: string }) {
  const linked = frame.links?.length ? 'git-visual-linked' : '';
  const className = `git-visual-cards git-visual-cards--${kind} ${linked}`;
  return (
    <div className={className}>
      {frame.cards?.map((card, index) => (
        <div className="git-visual-card-wrap" key={index}>
          <div className={`git-visual-card git-tone-${card.tone}`}>
            <span className="git-visual-label">{card.label}</span>
            <div className="git-visual-value">{card.value}</div>
            {card.detail && <p>{card.detail}</p>}
          </div>
          {frame.links?.[index] && (
            <div className="git-visual-link">
              <span aria-hidden="true">
                {frame.directions?.[index] === 'both'
                  ? '↕'
                  : frame.directions?.[index] === 'stop'
                    ? '⊣'
                    : '↓'}
              </span>
              <code>{frame.links[index]}</code>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TerminalVisual({ frame }: { frame: VisualFrame }) {
  const cards = frame.cards ?? [];
  return (
    <div className="git-terminal">
      <div className="git-terminal-title">Windows PowerShell</div>
      <div className="git-terminal-body">
        <div className="git-terminal-command">
          <span>{cards[0]?.value}</span> <strong>{cards[1]?.value}</strong>
        </div>
        <div>{cards[2]?.value}</div>
      </div>
      <div className="git-terminal-notes">
        <p>Teksten før kommandoen: {cards[0]?.detail}</p>
        <p>Kommando: {cards[1]?.detail}</p>
        <p>Utskrift: {cards[2]?.detail}</p>
      </div>
    </div>
  );
}

function ConflictVisual({ frame }: { frame: VisualFrame }) {
  const [current, , incoming] = frame.cards ?? [];
  return (
    <div className="git-conflict">
      <div className="git-conflict-section git-tone-blue">
        <code>{current?.label}</code>
        <div>{current?.value}</div>
        <span>{current?.detail}</span>
      </div>
      <code>=======</code>
      <div className="git-conflict-section git-tone-amber">
        <div>{incoming?.value}</div>
        <code>{incoming?.label}</code>
        <span>{incoming?.detail}</span>
      </div>
    </div>
  );
}

function PullRequestVisual({ frame }: { frame: VisualFrame }) {
  const base = frame.cards?.find((card) => card.label === 'Base');
  const head = frame.cards?.find((card) => card.label === 'Head');
  if (!base || !head) return <VisualCards frame={frame} kind="pr" />;
  const rest = frame.cards?.filter(
    (card) => card.label !== 'Base' && card.label !== 'Head',
  );
  return (
    <div className="git-pr">
      <div className="git-pr-direction">
        <div className="git-visual-card git-tone-blue">
          <span className="git-visual-label">Base – mottar endringen</span>
          <code>{base.value}</code>
        </div>
        <span aria-hidden="true">←</span>
        <div className="git-visual-card git-tone-amber">
          <span className="git-visual-label">Head – har endringen</span>
          <code>{head.value}</code>
        </div>
      </div>
      <VisualCards frame={{ ...frame, cards: rest }} kind="pr" />
    </div>
  );
}

function ReviewSimulation({
  stage,
}: {
  stage: NonNullable<VisualFrame['pr']>;
}) {
  const corrected = stage === 'fix' || stage === 'pass' || stage === 'ready';
  const checked =
    stage === 'failed' ||
    stage === 'review' ||
    stage === 'pass' ||
    stage === 'ready';
  const reviewed = stage === 'review' || corrected;
  const ready = stage === 'ready';

  const mergeStatus = {
    pending: 'Venter på status checks',
    failed: 'En påkrevd sjekk feilet',
    review: 'En påkrevd sjekk feilet',
    fix: 'Venter på nye status checks',
    pass: 'Venter på godkjent review',
    ready: 'Klar for merge',
  }[stage];
  return (
    <div className="git-review">
      <strong>Avvis ugyldig navn i påmelding</strong>
      <p>
        <code>main</code> <span aria-label="mottar endringen fra">←</span>{' '}
        <code>feature/valider-navn</code>
      </p>
      <div className="git-review-summary">
        <span>Commits · {corrected ? 2 : 1}</span>
        <span>
          Files changed · 1 · <code>paamelding.js</code>
        </span>
      </div>
      <ul className="git-review-checks" aria-label="Status checks">
        <li>Tomt navn: {checked ? '✓ Bestått' : '… Venter'}</li>
        <li>
          Bare mellomrom:{' '}
          {!checked ? '… Venter' : corrected ? '✓ Bestått' : '× Feilet'}
        </li>
      </ul>
      {reviewed && (
        <blockquote>
          «Tre mellomrom går fortsatt gjennom. Kan du sjekke navnet etter{' '}
          <code>trim()</code>?»
        </blockquote>
      )}
      {corrected && <p>Commit 2 · Fjern mellomrom før validering</p>}
      {ready && <p>✓ Review godkjent</p>}
      <strong className={ready ? 'git-tone-green' : 'git-tone-amber'}>
        {mergeStatus}
      </strong>
      <small>
        I dette eksemplet krever repoet beståtte sjekker og godkjent review.
      </small>
    </div>
  );
}

function RemoteCommitChain({ tip, refName }: { tip: string; refName: string }) {
  const commits = ['A', 'B', 'C'].slice(0, 'ABC'.indexOf(tip) + 1);
  return (
    <div className="git-remote-chain">
      {commits.map((commit) => (
        <span className="git-remote-commit" key={commit}>
          {commit}
        </span>
      ))}
      <code className="git-remote-pointer">← {refName}</code>
    </div>
  );
}

function RemoteHistory({
  remote,
}: {
  remote: NonNullable<VisualFrame['remote']>;
}) {
  return (
    <div className="git-remote-history">
      <div className="git-remote-repo">
        <strong>Delt repo</strong>
        <RemoteCommitChain tip={remote.shared} refName="main" />
      </div>
      <div className="git-remote-transfer">
        {!remote.action && <small>Du har ennå ikke hentet B</small>}
        {remote.action === 'push' && (
          <code>
            ↑ git push · sender C<br />↓ origin/main oppdateres
          </code>
        )}
        {remote.action === 'fetch' && (
          <code>↓ git fetch · B til origin/main</code>
        )}
        {remote.action === 'pull' && (
          <code>↓ git pull · fast-forward av lokal main</code>
        )}
      </div>
      <div className="git-remote-local">
        <strong>Maskinen din</strong>
        <div className="git-remote-refs">
          <div>
            <RemoteCommitChain tip={remote.tracking} refName="origin/main" />
            <small>Sist kjent fra remote</small>
          </div>
          <div>
            <RemoteCommitChain tip={remote.local} refName="main" />
            <small>Arbeidsfilen følger {remote.local}</small>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiffLines({ lines }: { lines: string[] }) {
  return (
    <code>
      {lines.map((line, index) => (
        <span
          className={
            line.startsWith('+')
              ? 'git-tone-green'
              : line.startsWith('-')
                ? 'git-tone-red'
                : undefined
          }
          key={index}
        >
          {line}
          {index < lines.length - 1 ? '\n' : ''}
        </span>
      ))}
    </code>
  );
}

function FileDiff({ diff }: { diff: NonNullable<VisualFrame['diff']> }) {
  if (diff.compare) {
    const [before, after] = diff.labels ?? ['Før endringen', 'Etter endringen'];
    return (
      <div className="git-file-comparison">
        {[
          { label: before, omit: '+' },
          { label: after, omit: '-' },
        ].map(({ label, omit }) => (
          <div className="git-diff" key={label}>
            <strong>
              {label} · <code>{diff.file}</code>
            </strong>
            <pre tabIndex={0} aria-label={`${label}: ${diff.file}`}>
              <DiffLines
                lines={diff.lines.filter((line) => !line.startsWith(omit))}
              />
            </pre>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="git-diff">
      <code>{diff.file}</code>
      <pre tabIndex={0} aria-label={`Diff for ${diff.file}`}>
        <DiffLines lines={diff.lines} />
      </pre>
    </div>
  );
}

function FileTreeVisual({ frame }: { frame: VisualFrame }) {
  return (
    <div className="git-file-tree">
      {frame.cards?.map((card, index) => (
        <div className="git-file-tree-row" key={card.label}>
          <span aria-hidden="true">{index === 0 ? '▾' : '└─'}</span>
          <div>
            <span className="git-visual-label">{card.label}</span>
            <div className="git-visual-value">{card.value}</div>
            {card.detail && <p>{card.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function CommandEffects({ frame }: { frame: VisualFrame }) {
  return (
    <div
      className="git-visual-matrix"
      tabIndex={0}
      role="region"
      aria-label="Sammenlign kommandoene"
    >
      <table>
        <thead>
          <tr>
            {frame.columns?.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {frame.matrix?.map(([command, ...cells]) => (
            <tr key={command}>
              <th scope="row">
                <code>{command}</code>
              </th>
              {cells.map((cell, index) => (
                <td
                  className={
                    cell === 'Beholdes'
                      ? 'git-tone-neutral'
                      : cell === 'Kan erstattes'
                        ? 'git-tone-red'
                        : 'git-tone-amber'
                  }
                  key={index}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TestCaseVisual() {
  const [value, setValue] = useState('abcdefgh');
  const lengthPass = value.length === 0 || value.length === 8;
  const digitPass = value.length === 0 || /^[0-9]{8}$/.test(value);

  return (
    <div className="git-visual-test">
      <div
        aria-label="Eksempelverdier"
        className="git-visual-buttons"
        role="group"
      >
        {['12345678', '1234567', 'abcdefgh', ''].map((example) => (
          <button
            aria-pressed={example === value}
            key={example}
            onClick={() => setValue(example)}
            type="button"
          >
            {example || 'Tomt felt'}
          </button>
        ))}
      </div>
      <label className="git-test-input">
        Prøv en oppdiktet verdi
        <input
          onChange={(event) => setValue(event.target.value)}
          type="text"
          value={value}
        />
      </label>
      <div aria-live="polite" className="git-visual-cards">
        {[
          { label: 'Bare lengde', pass: lengthPass },
          { label: 'Lengde og siffer', pass: digitPass },
        ].map(({ label, pass }) => (
          <div
            className={`git-visual-card git-tone-${pass ? 'green' : 'red'}`}
            key={label}
          >
            <span className="git-visual-label">{label}</span>
            <strong>{pass ? 'Godtas' : 'Avvises'}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function FrameCards({ frame, kind }: { frame: VisualFrame; kind: string }) {
  switch (kind) {
    case 'terminal':
      return <TerminalVisual frame={frame} />;
    case 'conflict':
      return <ConflictVisual frame={frame} />;
    case 'pr':
      return <PullRequestVisual frame={frame} />;
    case 'tree':
      return <FileTreeVisual frame={frame} />;
    default:
      return <VisualCards frame={frame} kind={kind} />;
  }
}

export function GitLessonVisual({ visual }: { visual: GitVisual }) {
  const [index, setIndex] = useState(0);
  const frame = visual.frames[index] ?? visual.frames[0];
  if (!frame) return null;

  return (
    <figure className="git-visual" data-visual-kind={visual.kind}>
      <figcaption className="git-visual-title">{visual.title}</figcaption>
      {visual.frames.length > 1 && (
        <div aria-label="Visning" className="git-visual-buttons" role="group">
          {visual.frames.map((item, position) => (
            <button
              aria-pressed={position === index}
              key={position}
              onClick={() => setIndex(position)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {frame.rows && <StatusRows frame={frame} />}
      {frame.nodes && <CommitGraph frame={frame} />}
      {frame.cards && <FrameCards frame={frame} kind={visual.kind} />}
      {frame.remote && <RemoteHistory remote={frame.remote} />}
      {frame.pr && <ReviewSimulation stage={frame.pr} />}
      {frame.diff && <FileDiff diff={frame.diff} />}
      {frame.matrix && <CommandEffects frame={frame} />}
      {frame.transcript !== undefined && (
        <div className="git-terminal git-visual-transcript">
          <div className="git-terminal-title">
            <code>git status --short</code> – eksempel
          </div>
          {frame.transcript ? (
            <pre tabIndex={0}>
              <code>{frame.transcript}</code>
            </pre>
          ) : (
            <p className="git-visual-caption">Ingen filrader. Ren status.</p>
          )}
        </div>
      )}
      {visual.kind === 'test' && <TestCaseVisual />}
      {frame.caption && (
        <p aria-live="polite" className="git-visual-caption">
          {frame.caption}
        </p>
      )}
    </figure>
  );
}
