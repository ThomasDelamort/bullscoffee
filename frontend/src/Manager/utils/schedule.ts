/**
 * employees.work_schedule is a VARCHAR(50), so a weekly shift is stored as
 * text like "Mon-Fri 07:00-15:00" or "Tue,Thu,Sat 13:00-21:00". This module
 * is the only place that reads or writes that format.
 */

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface Shift {
  days: Weekday[];
  /** "HH:MM", 24-hour. */
  start: string;
  end: string;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseSchedule(text: string): Shift | null {
  const match = text.trim().match(/^(\S+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (!match) return null;
  const [, dayPart, start, end] = match;
  if (!TIME.test(start!) || !TIME.test(end!)) return null;

  const days = new Set<Weekday>();
  for (const token of dayPart!.split(",")) {
    const [from, to] = token.split("-");
    const a = WEEKDAYS.indexOf(from as Weekday);
    const b = to === undefined ? a : WEEKDAYS.indexOf(to as Weekday);
    if (a < 0 || b < 0 || b < a) return null;
    for (let i = a; i <= b; i++) days.add(WEEKDAYS[i]!);
  }
  return { days: WEEKDAYS.filter((d) => days.has(d)), start: start!, end: end! };
}

/** Consecutive days collapse into ranges: Mon,Tue,Wed,Fri → "Mon-Wed,Fri". */
export function formatSchedule({ days, start, end }: Shift): string {
  const indexes = days.map((d) => WEEKDAYS.indexOf(d)).sort((a, b) => a - b);
  const runs: string[] = [];
  for (let i = 0; i < indexes.length; i++) {
    const first = indexes[i]!;
    let last = first;
    while (indexes[i + 1] === last + 1) last = indexes[++i]!;
    const from = WEEKDAYS[first]!;
    const to = WEEKDAYS[last]!;
    runs.push(last - first >= 2 ? `${from}-${to}` : last > first ? `${from},${to}` : from);
  }
  return `${runs.join(",")} ${start}-${end}`;
}

/** 0 = Monday, matching WEEKDAYS; JS Date counts from Sunday. */
export function weekdayOf(date: Date): Weekday {
  return WEEKDAYS[(date.getDay() + 6) % 7]!;
}

export function worksOn(shift: Shift | null, date: Date): boolean {
  return shift !== null && shift.days.includes(weekdayOf(date));
}

/** "07:00" → "7:00 AM". */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h! < 12 ? "AM" : "PM";
  return `${((h! + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function shiftHours({ start, end }: Pick<Shift, "start" | "end">): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h! * 60 + m!;
  };
  const diff = toMin(end) - toMin(start);
  return (diff > 0 ? diff : diff + 24 * 60) / 60;
}

/** "07:00" → "7a", "13:30" → "1:30p": compact enough for a weekly grid. */
export function formatClockShort(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h! + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""}${h! < 12 ? "a" : "p"}`;
}

/** "Mon–Fri · 7:00 AM – 3:00 PM" for people, not for storage. */
export function describeShift(shift: Shift): string {
  const days = formatSchedule(shift).split(" ")[0]!.replace(/-/g, "–").replace(/,/g, ", ");
  return `${days} · ${formatClock(shift.start)} – ${formatClock(shift.end)}`;
}

/** Store hours; a day needs someone in at opening and someone until closing. */
export const OPENING = "07:00";
export const CLOSING = "21:00";

export const DEFAULT_SHIFT: Shift = { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], start: OPENING, end: "15:00" };

export function shiftProblem(shift: Shift): string | null {
  if (shift.days.length === 0) return "Pick at least one working day.";
  if (shift.start === shift.end) return "The shift needs to end at a different time than it starts.";
  return null;
}
