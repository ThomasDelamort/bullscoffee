const PESO = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const TIME = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" });

const LONG_DATE = new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric" });

export const formatPeso = (n: number): string => PESO.format(n);
export const formatTime = (date: Date | string): string => TIME.format(new Date(date));
export const formatLongDate = (date: Date): string => LONG_DATE.format(date);

export function formatRelative(iso: string, now: Date): string {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return formatTime(iso);
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
