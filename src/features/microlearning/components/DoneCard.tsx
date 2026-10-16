import { RpgButton } from '@/features/rpg/components/RpgButton';

import { useActionGuard } from './actionGuard';
import { CardFrame } from './CardFrame';

/**
 * The end of a session. It says plainly that the session is over and that
 * nothing was kept, and it names the way back to the Campaign. A session that
 * names a takeaway ends on it: "Hva tar jeg med meg?". Both buttons are
 * guarded: the last card's "Fullfør" sits where "Tilbake til kampanjen"
 * appears, and a double tap must not skip this screen.
 */
export function DoneCard({
  closeTo,
  onPickAnother,
  pickAnotherLabel = 'Velg en annen økt',
  takeaway,
}: {
  closeTo: string;
  onPickAnother: () => void;
  pickAnotherLabel?: string;
  takeaway?: string;
}) {
  const guard = useActionGuard();
  const nothingKept =
    'Ingenting ble lagret. Svarene dine, XP og framdriften i kampanjen er uendret.';

  return (
    <CardFrame
      action={
        <div className="micro-actions">
          <RpgButton
            onClick={() => {
              if (guard.accept()) {
                onPickAnother();
              }
            }}
            variant="secondary"
          >
            {pickAnotherLabel}
          </RpgButton>
          <RpgButton
            href={closeTo}
            onClick={(event) => {
              if (!guard.accept()) {
                event.preventDefault();
              }
            }}
          >
            Tilbake til kampanjen
          </RpgButton>
        </div>
      }
      context={takeaway === undefined ? nothingKept : undefined}
      kindLabel="Ferdig"
      prompt={
        takeaway === undefined ? undefined : (
          <>
            {takeaway.split('\n').map((paragraph, index) => (
              <p className="micro-card__text" key={index}>
                {paragraph}
              </p>
            ))}
            <p className="micro-card__text">
              <small>{nothingKept}</small>
            </p>
          </>
        )
      }
      title={
        takeaway === undefined ? 'Økten er ferdig' : 'Hva tar jeg med meg?'
      }
    />
  );
}
