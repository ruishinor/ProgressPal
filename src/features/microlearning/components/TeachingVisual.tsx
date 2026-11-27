import { useId, useState } from 'react';

import type { MicroLearnCard } from '@/lib/domain';

type Visual = NonNullable<MicroLearnCard['visual']>;

/** The authored examples are local models, never executed code or assessments. */
export function TeachingVisual({ visual }: { visual: Visual }) {
  const titleId = useId();
  const [selected, setSelected] = useState(0);
  const frame = visual.frames[selected] ?? visual.frames[0];

  if (!frame) return null;

  return (
    <figure aria-labelledby={titleId} className="micro-teaching">
      <figcaption id={titleId}>
        <strong>{visual.title}</strong>
      </figcaption>
      {visual.frames.length > 1 ? (
        <div
          aria-label="Velg eksempel"
          className="micro-teaching__choices"
          role="group"
        >
          {visual.frames.map((choice, index) => (
            <button
              aria-pressed={selected === index}
              className="rpg-button"
              key={choice.label}
              onClick={() => setSelected(index)}
              type="button"
            >
              {choice.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="micro-teaching__blocks">
        {frame.blocks.map((block, index) =>
          block.kind === 'table' ? (
            <table className="micro-teaching__table" key={index}>
              <caption>{block.label}</caption>
              <thead>
                <tr>
                  {block.columns.map((column, columnIndex) => (
                    <th key={columnIndex} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ol
              className={`micro-teaching__items micro-teaching__items--${block.kind}`}
              key={index}
              role="list"
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  {block.kind === 'flow' && itemIndex > 0 ? (
                    <span aria-hidden="true" className="micro-teaching__arrow">
                      ↓
                    </span>
                  ) : null}
                  <div className="micro-teaching__item">
                    <strong>{item.label}</strong>
                    <span>{item.text}</span>
                  </div>
                </li>
              ))}
            </ol>
          ),
        )}
      </div>
    </figure>
  );
}
