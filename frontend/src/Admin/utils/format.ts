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

export const formatDateTime = (iso: string): string => DATE_TIME.format(new Date(iso));
export const formatDate = (iso: string): string => DATE.format(new Date(iso));
export const formatNumber = (n: number): string => n.toLocaleString("en-PH");

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

/** Replaces {{token}} placeholders; unknown tokens are left as-is. */
export function fillTemplate(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => values[key] ?? match);
}

/** A support ticket's display number: 12 → "T-12". */
export const ticketNumber = (id: number): string => `T-${id}`;
