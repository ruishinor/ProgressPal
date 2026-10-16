import { RpgButton } from '@/features/rpg/components/RpgButton';

import { useActionGuard } from './actionGuard';
import { CardFrame } from './CardFrame';

/**
 * The end of a session. It says plainly that the session is over and that
 * nothing was kept, and it names the way back to the Campaign. Both buttons
 * are guarded: the last card's "Fullfør" sits where "Tilbake til kampanjen"
 * appears, and a double tap must not skip this screen.
 */
export function DoneCard({
  closeTo,
  onPickAnother,
}: {
  closeTo: string;
  onPickAnother: () => void;
}) {
  const guard = useActionGuard();

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
            Velg en annen økt
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
      context="Ingenting ble lagret. Svarene dine, XP og framdriften i kampanjen er uendret."
      kindLabel="Ferdig"
      title="Økten er ferdig"
    />
  );
}
