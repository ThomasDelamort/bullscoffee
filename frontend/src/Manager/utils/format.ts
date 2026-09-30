const DATE_TIME = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const DATE = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const TIME = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" });

const MONTH = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" });

const SHORT_DATE = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });

const PESO = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const PESO_WHOLE = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export const formatDateTime = (iso: string): string => DATE_TIME.format(new Date(iso));
export const formatDate = (iso: string): string => DATE.format(new Date(iso));
export const formatTime = (iso: string): string => TIME.format(new Date(iso));
export const formatMonth = (date: Date): string => MONTH.format(date);
export const formatShortDate = (date: Date): string => SHORT_DATE.format(date);

/** 7 → "7a", 13 → "1p": compact hour labels for chart axes. */
export function formatHourShort(hour: number): string {
  return `${((hour + 11) % 12) + 1}${hour < 12 ? "a" : "p"}`;
}

/** "▲ 12%" / "▼ 3%", or null when there is nothing to compare against. */
export function formatChange(current: number, previous: number): string | null {
  if (previous <= 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return pct === 0 ? "No change" : `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}%`;
}
export const formatNumber = (n: number): string => n.toLocaleString("en-PH");
export const formatPeso = (n: number): string => PESO.format(n);
/** For chart axes and stat tiles, where centavos are noise. */
export const formatPesoWhole = (n: number): string => PESO_WHOLE.format(n);

export function formatRelative(iso: string, now = new Date()): string {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatDate(iso);
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function fullName(person: { first_name: string; last_name: string }): string {
  return `${person.first_name} ${person.last_name}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Rounds to 2 decimals, matching the DECIMAL(10,2) columns. */
export const round2 = (n: number): number => Math.round(n * 100) / 100;
