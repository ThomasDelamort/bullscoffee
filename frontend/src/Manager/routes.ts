export const MANAGER_BASE_PATH = "/manager";

/** Every manager screen, in sidebar order. The key doubles as the URL segment. */
export const MANAGER_PAGES = [
  "dashboard",
  "pos",
  "orders",
  "discounts",
  "reports",
  "feedback",
  "products",
  "staff",
  "schedule",
  "attendance",
  "inventory",
  "suppliers",
] as const;

export type ManagerPage = (typeof MANAGER_PAGES)[number];

export function managerPath(page: ManagerPage): string {
  return page === "dashboard" ? MANAGER_BASE_PATH : `${MANAGER_BASE_PATH}/${page}`;
}
