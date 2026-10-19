import { RpgButton } from '@/features/rpg/components/RpgButton';

import { useActionGuard } from './actionGuard';
import { CardFrame } from './CardFrame';

/**
 * The end of a session, with an optional short learning reminder. The
 * buttons are guarded so a double tap does not skip the completion screen.
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
            Til startsiden
          </RpgButton>
        </div>
      }
      kindLabel="Ferdig"
      prompt={
        takeaway === undefined ? undefined : (
          <>
            {takeaway.split('\n').map((paragraph, index) => (
              <p className="micro-card__text" key={index}>
                {paragraph}
              </p>
            ))}
          </>
        )
      }
      title={takeaway === undefined ? 'Økten er ferdig' : 'Husk dette'}
    />
  );
}
