export const ADMIN_BASE_PATH = "/admin";

/** Every admin screen, in sidebar order. The key doubles as the URL segment. */
export const ADMIN_PAGES = [
  "dashboard",
  "users",
  "roles",
  "health",
  "logs",
  "tickets",
  "branches",
  "payments",
  "notifications",
  "backups",
  "archive",
  "settings",
] as const;

export type AdminPage = (typeof ADMIN_PAGES)[number];

export function adminPath(page: AdminPage): string {
  return page === "dashboard" ? ADMIN_BASE_PATH : `${ADMIN_BASE_PATH}/${page}`;
}
