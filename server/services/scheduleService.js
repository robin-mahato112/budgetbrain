const DAY = 86400000;
export const MAX_FORECAST_DAYS = 366;

export function day(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Jump directly to the window instead of replaying years of old occurrences.
// Calendar recurrences retain the original day (Jan 31 -> Feb 28 -> Mar 31).
export function occurrenceDates(value, frequency, from, until) {
  const anchor = day(value); const start = day(from); const end = day(until);
  if (!anchor || !start || !end || end < start || end - start > MAX_FORECAST_DAYS * DAY) return [];
  if (frequency === 'ONE_TIME') return anchor >= start && anchor <= end ? [anchor] : [];
  const interval = { WEEKLY: 7, FORTNIGHTLY: 14 }[frequency];
  const months = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 }[frequency];
  if (!interval && !months) return [];
  let index = interval
    ? Math.max(0, Math.ceil((start - anchor) / (interval * DAY)))
    : Math.max(0, Math.floor(((start.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + start.getUTCMonth() - anchor.getUTCMonth()) / months));
  const dates = [];
  for (; dates.length <= 54; index += 1) {
    let due;
    if (interval) due = new Date(anchor.getTime() + index * interval * DAY);
    else {
      due = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + index * months, 1));
      const lastDay = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth() + 1, 0)).getUTCDate();
      due.setUTCDate(Math.min(anchor.getUTCDate(), lastDay));
    }
    if (due > end) break;
    if (due >= start) dates.push(due);
  }
  return dates;
}
