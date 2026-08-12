import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { repairLocalCoordinationRevision } from '@/lib/storage';

export type CoordinationRepairControlProps = {
  onRepaired: () => void;
};

/**
 * User-initiated recovery for corrupt local tab-coordination revision metadata.
 * The repair rewrites only the advisory localStorage counter to 0 under the
 * exclusive-presence ceremony — IndexedDB study data is never touched, and no
 * confirmation phrase is required because sole-participant proof is the
 * safeguard. Rendered only where an exhausted revision is already visible.
 */
export function CoordinationRepairControl({
  onRepaired,
}: CoordinationRepairControlProps) {
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);

  async function handleRepair() {
    if (busy) {
      return;
    }

    setBusy(true);
    setBlocked(false);

    try {
      const result = await repairLocalCoordinationRevision();

      if (result === 'blocked') {
        setBlocked(true);
        return;
      }

      onRepaired();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Repair local tab safety" titleAs="h3">
      <p className="card__description">
        Local tab-coordination metadata is corrupt. Repair resets only the
        tab-safety counter; your study data is not touched.
      </p>
      <div className="data-action">
        {blocked ? (
          <p className="data-action__error" role="alert">
            Close every other ProgressPal tab, then try again.
          </p>
        ) : null}
        <Button
          loading={busy}
          onClick={() => {
            void handleRepair();
          }}
          variant="primary"
        >
          Repair local tab safety
        </Button>
      </div>
    </Card>
  );
}
