/** Display names shared by every admin screen. */
import type { Role, StaffRole } from "./types";

export const ROLES: readonly Role[] = ["admin", "manager", "cashier", "customer"];

export const STAFF_ROLES: readonly StaffRole[] = ["admin", "manager", "cashier"];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  cashier: "Cashier / Barista",
  customer: "Customer",
};
