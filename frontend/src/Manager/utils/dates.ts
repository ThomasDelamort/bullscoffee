/** Local-time date helpers. Keys are local calendar days, not UTC ones. */

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" in local time; also the value format of <input type="date">. */
export function dayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM" in local time; also the value format of <input type="month">. */
export function monthKey(date: Date | string): string {
  return dayKey(date).slice(0, 7);
}

/** Parses a dayKey back to local midnight. */
export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(y!, m!, 0).getDate();
}

export function hoursBetween(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000;
}

/** "HH:MM" local time of an ISO timestamp, for <input type="time">. */
export function timeOfDay(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Combines a dayKey and "HH:MM" into an ISO timestamp. */
export function atTime(key: string, hhmm: string): string {
  const [h, min] = hhmm.split(":").map(Number);
  const d = fromDayKey(key);
  d.setHours(h!, min!, 0, 0);
  return d.toISOString();
}
