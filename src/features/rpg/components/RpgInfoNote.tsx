import { useId, useState, type ReactNode } from 'react';

import { RpgButton } from '@/features/rpg/components/RpgButton';

/**
 * A short explanation kept out of the normal interface: an (i) button that
 * shows or hides the text beside it. Used for Rank and for the notes that
 * say local progress is not an assessment.
 */
export function RpgInfoNote({
  children,
  className,
  inline = false,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** Show the text as it was, for a programme whose copy stays visible. */
  inline?: boolean;
  label: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  if (inline) {
    return <p className={className}>{children}</p>;
  }

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
