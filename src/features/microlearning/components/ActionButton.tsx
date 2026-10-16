import { RpgButton } from '@/features/rpg/components/RpgButton';

import { useActionGuard } from './actionGuard';

/**
 * The card's single action. It stays mounted and visible for the whole life of
 * a card; only its label and `aria-disabled` change, so keyboard focus is
 * never lost when "Sjekk" becomes "Prøv igjen" or "Neste". `aria-disabled`
 * (not `disabled`) keeps the control focusable and announced while it cannot
 * act yet. A press that is not ready does nothing and does not open the
 * guard; a ready press must be a new activation, not the second tap of a
 * double tap on the action's predecessor (see `actionGuard`).
 */
export function ActionButton({
  label,
  onPress,
  ready,
}: {
  label: string;
  onPress: () => void;
  ready: boolean;
}) {
  const guard = useActionGuard();

  return (
    <RpgButton
      aria-disabled={ready ? undefined : true}
      onClick={() => {
        if (ready && guard.accept()) {
          onPress();
        }
      }}
    >
      {label}
    </RpgButton>
  );
}
