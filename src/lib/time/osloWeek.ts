const osloCalendar = new Intl.DateTimeFormat('en', {
  timeZone: 'Europe/Oslo',
  calendar: 'iso8601',
  numberingSystem: 'latn',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const shortDate = new Intl.DateTimeFormat('nb-NO', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
});

export function osloDate(instant: Date): string {
  const parts = osloCalendar.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? '';
  return [part('year').padStart(4, '0'), part('month'), part('day')].join('-');
}

/** UTC is used only for arithmetic on civil dates, never to assign an event to a day. */
export function addCalendarDays(date: string, days: number): string {
  const calendar = new Date(date + 'T00:00:00Z');
  calendar.setUTCDate(calendar.getUTCDate() + days);
  return calendar.toISOString().slice(0, 10);
}

export function getOsloWeek(now: Date) {
  const today = osloDate(now);
  const weekday = new Date(today + 'T00:00:00Z').getUTCDay();
  const start = addCalendarDays(today, -((weekday + 6) % 7));
  return { today, start, end: addCalendarDays(start, 6) };
}

export type OsloWeek = ReturnType<typeof getOsloWeek>;

export function formatCalendarDay(day: string): string {
  return shortDate.format(new Date(day + 'T00:00:00Z'));
}

export function formatWeekRange(week: OsloWeek): string {
  return formatCalendarDay(week.start) + '–' + formatCalendarDay(week.end);
}
