import { useState } from 'react';

import type { GitVisual, VisualFrame } from './gitVisuals';

function StatusRows({ frame }: { frame: VisualFrame }) {
  return (
    <div className="git-visual-status">
      {frame.rows?.map(({ x, y, file, meaning }) => {
        const special = x + y === '??' || x + y === 'UU';
        return (
          <div className="git-status-row" key={x + y + file}>
            <div className="git-status-line">
              <div className="git-status-part">
                <span
                  className={`git-status-cell ${special ? 'git-tone-neutral' : 'git-tone-blue'}`}
                >
                  {x === ' ' ? '·' : x}
                </span>
                <span className="git-status-label">
                  {special ? (x === '?' ? 'Ny fil' : 'Konflikt') : 'Staged'}
                </span>
              </div>
              <div className="git-status-part">
                <span
                  className={`git-status-cell ${special ? 'git-tone-neutral' : 'git-tone-amber'}`}
                >
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
        <p className="lesson-note">Prikken viser et mellomrom i Git-utskriften.</p>
      )}
    </div>
  );
}

function CommitGraph({ frame }: { frame: VisualFrame }) {
  const nodes = frame.nodes ?? [];
  return (
    <svg
      aria-label={frame.caption ?? 'Commit-historikk'}
      className="git-visual-graph"
      role="img"
      viewBox="0 0 360 215"
    >
      <title>{frame.caption ?? 'Commit-historikk'}</title>
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
      {nodes.map((node) => (
        <g className={`git-tone-${node.tone}`} key={node.id}>
          <circle
            className="git-graph-node"
            cx={node.x}
            cy={node.y}
            r="16"
          />
          <text className="git-graph-id" x={node.x} y={node.y + 4}>
            {node.id}
          </text>
          <text className="git-graph-label" x={node.x} y={node.y + 34}>
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function VisualCards({ frame, kind }: { frame: VisualFrame; kind: string }) {
  return (
    <div
      className={`git-visual-cards git-visual-cards--${kind} ${frame.links?.length ? 'git-visual-linked' : ''}`}
    >
      {frame.cards?.map((card, index) => (
        <div className="git-visual-card-wrap" key={card.label}>
          <div className={`git-visual-card git-tone-${card.tone}`}>
            <span className="git-visual-label">{card.label}</span>
            <div className="git-visual-value">{card.value}</div>
            {card.detail && <p>{card.detail}</p>}
          </div>
          {frame.links?.[index] && (
            <div className="git-visual-link">
              <span aria-hidden="true">↓</span>
              <code>{frame.links[index]}</code>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CommandEffects({ frame }: { frame: VisualFrame }) {
  return (
    <div className="git-visual-matrix">
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
                      : cell === 'Kan overskrives'
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
      <div className="git-visual-buttons" aria-label="Eksempelverdier">
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

export function GitLessonVisual({ visual }: { visual: GitVisual }) {
  const [index, setIndex] = useState(0);
  const frame = visual.frames[index] ?? visual.frames[0];
  if (!frame) return null;

  return (
    <figure className="git-visual" data-visual-kind={visual.kind}>
      <figcaption className="git-visual-title">{visual.title}</figcaption>
      {visual.frames.length > 1 && (
        <div className="git-visual-buttons" aria-label="Visning">
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
      {frame.cards && <VisualCards frame={frame} kind={visual.kind} />}
      {frame.matrix && <CommandEffects frame={frame} />}
      {visual.kind === 'test' && <TestCaseVisual />}
      {frame.caption && <p className="git-visual-caption">{frame.caption}</p>}
    </figure>
  );
}
