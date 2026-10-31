import { useId } from 'react';
import type { MicroKanbanBoard } from '@/lib/domain';

/** Read in workflow order at every width; no dragging, hidden state or motion. */
export function KanbanBoard({ board }: { board: MicroKanbanBoard }) {
  const titleId = useId();
  const active = board.items.filter((item) => item.status === 'active').length;
  return (
    <figure className="micro-kanban" aria-labelledby={titleId}>
      <figcaption id={titleId}>
        <strong>{board.title}</strong>
      </figcaption>
      {board.change ? (
        <p className="micro-kanban__change">{board.change}</p>
      ) : null}
      <p>
        <strong>
          I gang: {active} av maks {board.wipLimit}.
        </strong>{' '}
        WIP betyr arbeid som er startet, men ikke ferdig. Blokkerte oppgaver
        teller med.
      </p>
      <div className="micro-kanban__columns">
        {(
          [
            ['ready', 'Å gjøre'],
            ['active', 'Pågår'],
            ['done', 'Ferdig'],
          ] as const
        ).map(([status, label]) => {
          const items = board.items.filter((item) => item.status === status);
          return (
            <div className="micro-kanban__column" key={status}>
              <h2>
                {label} · {items.length}
              </h2>
              {items.length === 0 ? (
                <p>Ingen oppgaver ennå.</p>
              ) : (
                <ul aria-label={label}>
                  {items.map((item) => (
                    <li
                      key={item.id}
                      data-blocked={item.blocked ? true : undefined}
                    >
                      <strong>{item.title}</strong>
                      {item.detail ? <span>{item.detail}</span> : null}
                      {item.blocked ? (
                        <span>
                          <strong>Blokkert:</strong> {item.blocked}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <p>
        Avtalen: Start når et kort flyttes fra «Å gjøre» til «Pågår». Ferdig når
        koden er testet og lagt ut i appen. Hent klare oppgaver ovenfra når det
        er plass. Ingen unntak fra grensen uten at hele teamet er enige.
      </p>
    </figure>
  );
}
