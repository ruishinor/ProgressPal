import { useId, useState, type ReactNode } from 'react';

import { RpgButton } from '@/features/rpg/components/RpgButton';

/**
 * A short explanation kept out of the normal interface: an (i) button that
 * shows or hides the text beside it. Used for Rank and for the notes that
 * say local progress is not an assessment.
 */
export function RpgInfoNote({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <>
      <RpgButton
        aria-controls={id}
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        size="sm"
        variant="quiet"
      >
        (i)
      </RpgButton>
      {open ? <p id={id}>{children}</p> : null}
    </>
  );
}
