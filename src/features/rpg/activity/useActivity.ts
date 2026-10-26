import { startTransition, useEffect, useState } from 'react';

import { useAppState } from '@/lib/appState';
import { activityDate } from '@/lib/activity/model';

export function useActivityLanguage() {
  return useAppState().programmeScope?.programmeId === 'programvareutvikling';
}
export function useActivityToday() {
  const [today, setToday] = useState(() => activityDate(new Date()));
  useEffect(() => {
    const update = () => setToday(activityDate(new Date()));
    const timer = window.setInterval(update, 30_000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return today;
}
export function useActivityRead<T>(read: () => Promise<T>) {
  const { coordination, dataEpoch } = useAppState();
  const today = useActivityToday();
  const [token, setToken] = useState(0);
  const [state, setState] = useState<{ data: T | null; error: boolean }>({
    data: null,
    error: false,
  });
  useEffect(() => {
    let active = true;
    void read().then(
      (data) => {
        if (active) startTransition(() => setState({ data, error: false }));
      },
      () => {
        if (active)
          startTransition(() => setState({ data: null, error: true }));
      },
    );
    return () => {
      active = false;
    };
  }, [read, coordination.revision, dataEpoch, token, today]);
  return { ...state, today, retry: () => setToken((current) => current + 1) };
}
