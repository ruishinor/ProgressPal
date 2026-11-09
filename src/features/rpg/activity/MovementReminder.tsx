import uiCopy from '@/ui-copy/interface.json';
import { startTransition, useEffect, useState } from 'react';

import { useAppState } from '@/lib/appState';
import { readActivitySettings, saveActivitySettings } from '@/lib/db/activity';
import { rpgActivityPath } from '@/lib/routing/rpgRoutePaths';
import { RpgButton, RpgPanel } from '@/features/rpg/components';

import { useActivityLanguage, useActivityRead } from './useActivity';

export function MovementReminder() {
  const nb = useActivityLanguage();
  const { data, error } = useActivityRead(readActivitySettings);
  const { coordination, runLocalMutation } = useAppState();
  const [due, setDue] = useState(false);
  const [reset, setReset] = useState(0);
  const [postponed, setPostponed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const minutes = data?.reminderMinutes ?? 0;
  useEffect(() => {
    startTransition(() => setDue(false));
    if (minutes === 0) return;
    let elapsed = 0;
    let last = Date.now();
    let lastInput = last;
    let shown = false;
    const input = () => {
      lastInput = Date.now();
    };
    const visible = () => {
      elapsed = 0;
      last = Date.now();
      lastInput = last;
      shown = false;
      setDue(false);
    };
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (
        !shown &&
        !document.hidden &&
        document.hasFocus() &&
        now - lastInput <= 60_000
      ) {
        // Bound each tick: suspension or a throttled clock cannot count hidden time.
        elapsed += Math.max(0, Math.min(now - last, 1000));
        if (elapsed >= (postponed ? 5 : minutes) * 60_000) {
          shown = true;
          setDue(true);
        }
      }
      last = now;
    }, 1000);
    window.addEventListener('pointerdown', input);
    window.addEventListener('keydown', input);
    window.addEventListener('blur', visible);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pointerdown', input);
      window.removeEventListener('keydown', input);
      window.removeEventListener('blur', visible);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [minutes, postponed, reset]);
  if (error)
    return (
      <p role="status">
        {nb
          ? uiCopy.surfaces.rpgActivityMovementReminder
              .pausevarselErUtilgjengeligApneAktivitetForAProve
          : uiCopy.surfaces.rpgActivityMovementReminder
              .movementRemindersAreUnavailableOpenActivityToRetry}
      </p>
    );
  if (!due || !data) return null;
  const restart = (postpone: boolean) => {
    setDue(false);
    setPostponed(postpone);
    setReset((value) => value + 1);
    setFailed(false);
  };
  return (
    <RpgPanel
      title={
        nb
          ? uiCopy.surfaces.rpgActivityMovementReminder.tidForEnBevegelsespause
          : uiCopy.surfaces.rpgActivityMovementReminder.timeForAMovementBreak
      }
      titleAs="h2"
    >
      <p role="status">
        {nb
          ? uiCopy.surfaces.rpgActivityMovementReminder
              .duHarBruktProgressPalEnStundTaEn
          : uiCopy.surfaces.rpgActivityMovementReminder
              .youHaveBeenUsingProgressPalForAWhile}
      </p>
      {failed && (
        <p role="alert">
          {nb
            ? uiCopy.surfaces.rpgActivityMovementReminder
                .kunneIkkeLagreInnstillingenProvIgjen
            : uiCopy.surfaces.rpgActivityMovementReminder
                .couldNotSaveThePreferencePleaseRetry}
        </p>
      )}
      <div className="action-row">
        <RpgButton href={rpgActivityPath} variant="quiet">
          {nb
            ? uiCopy.surfaces.rpgActivityMovementReminder.apneAktivitet
            : uiCopy.surfaces.rpgActivityMovementReminder.openActivity}
        </RpgButton>
        <RpgButton variant="quiet" onClick={() => restart(false)}>
          {nb
            ? uiCopy.surfaces.rpgActivityMovementReminder.lukkVarsel
            : uiCopy.surfaces.rpgActivityMovementReminder.dismissReminder}
        </RpgButton>
        <RpgButton variant="quiet" onClick={() => restart(true)}>
          {nb
            ? uiCopy.surfaces.rpgActivityMovementReminder.utsett5Min
            : uiCopy.surfaces.rpgActivityMovementReminder.postpone5Min}
        </RpgButton>
        <RpgButton
          variant="quiet"
          disabled={saving || !coordination.canWrite}
          onClick={() => {
            if (saving) return;
            setSaving(true);
            void runLocalMutation(
              () => saveActivitySettings({ ...data, reminderMinutes: 0 }),
              { invalidateRoute: false },
            )
              .then(
                () => restart(false),
                () => setFailed(true),
              )
              .finally(() => setSaving(false));
          }}
        >
          {nb
            ? uiCopy.surfaces.rpgActivityMovementReminder.slaAvPausevarsel
            : uiCopy.surfaces.rpgActivityMovementReminder.disableReminders}
        </RpgButton>
      </div>
    </RpgPanel>
  );
}
