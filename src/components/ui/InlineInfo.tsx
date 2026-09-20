import { useId, useState } from 'react';

export function InlineInfo({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="inline-info">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        ⓘ
      </button>
      <span id={id} hidden={!open}>
        {children}
      </span>
    </span>
  );
}
