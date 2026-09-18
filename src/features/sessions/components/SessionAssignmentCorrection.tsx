import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import type { SessionCatalog } from '@/features/sessions/model';
import { useAppState } from '@/lib/appState';
import { correctStudySessionAssignment } from '@/lib/db';

export function SessionAssignmentCorrection({
  sessionId,
  itemId,
  catalog,
  onCorrected,
}: {
  sessionId: string;
  itemId: string;
  catalog: SessionCatalog;
  onCorrected: () => Promise<void>;
}) {
  const { coordination, runLocalMutation } = useAppState();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(itemId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  async function save() {
    if (inFlight.current || !coordination.canWrite) return;
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      await runLocalMutation(
        () => correctStudySessionAssignment({ sessionId, itemId: target }),
        { invalidateRoute: false },
      );
    } catch (cause) {
      console.error('Session assignment correction failed.', cause);
      setError(
        'The assignment could not be corrected. Your saved session is unchanged. Try again.',
      );
      inFlight.current = false;
      setSaving(false);
      return;
    }
    setOpen(false);
    setMessage(
      'Session assignment corrected. Time and earned rewards are unchanged.',
    );
    await onCorrected();
    inFlight.current = false;
    setSaving(false);
  }

  return (
    <>
      <Button
        disabled={!coordination.canWrite}
        size="md"
        variant="secondary"
        onClick={() => {
          setTarget(itemId);
          setError('');
          setMessage('');
          setOpen(true);
        }}
      >
        Correct session
      </Button>
      {message ? <p role="status">{message}</p> : null}
      <Dialog
        title="Correct session assignment"
        description="This changes which task the session belongs to. Time, mode, dates, earned XP, and earned achievements stay unchanged."
        isOpen={open}
        onClose={() => {
          if (!inFlight.current) setOpen(false);
        }}
        actions={
          <>
            <Button
              disabled={saving}
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={saving || !coordination.canWrite || target === itemId}
              loading={saving}
              onClick={() => {
                void save();
              }}
            >
              Save assignment
            </Button>
          </>
        }
      >
        <label>
          Correct task
          <Select
            disabled={saving}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            options={catalog.units.flatMap((unit) =>
              (catalog.itemsByUnitId.get(unit.id) ?? []).map((item) => ({
                value: item.id,
                label: `${unit.title} — ${item.title}`,
              })),
            )}
          />
        </label>
        {error ? <p role="alert">{error}</p> : null}
      </Dialog>
    </>
  );
}
