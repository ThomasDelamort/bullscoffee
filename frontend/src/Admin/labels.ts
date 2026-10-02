/** Display names shared by every admin screen. */
import type { Role } from "./types";

export const ROLES: readonly Role[] = ["admin", "manager", "cashier", "supplier", "customer"];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  cashier: "Cashier / Barista",
  supplier: "Supplier",
  customer: "Customer",
};
