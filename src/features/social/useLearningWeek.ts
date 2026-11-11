import { useEffect, useState } from 'react';

import { useAppState } from '@/lib/appState';
import { readLearningDays } from '@/lib/db/learningWeek';
import { getOsloWeek } from '@/lib/time/osloWeek';

export function useLearningWeek() {
  const { dataEpoch, profile } = useAppState();
  const [today, setToday] = useState(() => getOsloWeek(new Date()).today);
  const [read, setRead] = useState<{
    today: string;
    dataEpoch: number;
    days: string[] | null;
  }>();
  const week = getOsloWeek(new Date(today + 'T12:00:00Z'));

  useEffect(() => {
    const updateDay = () => setToday(getOsloWeek(new Date()).today);
    const interval = window.setInterval(updateDay, 15_000);
    window.addEventListener('focus', updateDay);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', updateDay);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const currentWeek = getOsloWeek(new Date(today + 'T12:00:00Z'));
    void readLearningDays(currentWeek).then(
      (days) => {
        if (active) setRead({ today, dataEpoch, days });
      },
      () => {
        if (active) setRead({ today, dataEpoch, days: null });
      },
    );
    return () => {
      active = false;
    };
  }, [today, dataEpoch]);

  return {
    week,
    days:
      read?.today === today && read.dataEpoch === dataEpoch
        ? read.days
        : undefined,
    target: profile?.targetStudyDays.length,
  };
}
