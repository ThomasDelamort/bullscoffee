import type { ActivityFilters } from "../types";

/**
 * Every admin query key, nested so a prefix invalidates a whole family:
 * invalidating `activity` refreshes every filtered log list and the stats.
 */
export const adminKeys = {
  all: ["admin"] as const,
  me: ["admin", "me"] as const,

  users: ["admin", "users"] as const,
  permissions: ["admin", "permissions"] as const,

  activity: ["admin", "activity"] as const,
  activityList: (filters: ActivityFilters) => ["admin", "activity", "list", filters] as const,
  activityModules: ["admin", "activity", "modules"] as const,
  signIns: (days: number) => ["admin", "activity", "sign-ins", days] as const,

  settings: ["admin", "settings"] as const,
  gateway: ["admin", "payment-gateway"] as const,
  notifications: ["admin", "notifications"] as const,
  notificationLog: ["admin", "notifications", "log"] as const,

  tickets: ["admin", "tickets"] as const,
  ticketList: (includeClosed: boolean) => ["admin", "tickets", "list", includeClosed] as const,
  ticket: (ticketId: number) => ["admin", "tickets", "detail", ticketId] as const,

  health: ["admin", "health"] as const,
  backups: ["admin", "backups"] as const,
  exports: ["admin", "exports"] as const,
};
