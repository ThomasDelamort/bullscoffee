import { pool } from "./db.ts";
import { withTransaction } from "./sql.ts";

// The permission catalogue: the one source of truth for what each permission
// is called and which routes check it (see requirePermission). The admin
// Roles & Permissions page edits which roles hold which; admins hold every
// permission implicitly and are never stored. `seed` is the access each role
// had before permissions were editable, which a fresh database starts with.

type EditableRole = "manager" | "cashier";

export interface PermissionDef {
  id: string;
  label: string;
  module: string;
  /** What it gates, shown on the Roles page. */
  gates: string;
  /** Admin-only: shown in the matrix but never grantable to another role. */
  admin_only: boolean;
  seed: readonly EditableRole[];
}

const BOTH = ["cashier", "manager"] as const;
const MANAGER = ["manager"] as const;

const editable = (
  id: string,
  module: string,
  label: string,
  gates: string,
  seed: readonly EditableRole[],
): PermissionDef => ({ id, label, module, gates, admin_only: false, seed });

const system = (id: string, label: string, gates: string): PermissionDef => ({
  id,
  label,
  module: "System",
  gates,
  admin_only: true,
  seed: [],
});

export const PERMISSIONS = [
  editable("orders.view", "Orders", "View orders", "Order lists and receipts", BOTH),
  editable("orders.process", "Orders", "Ring up and take payment for orders", "New orders, payments, completing orders, the customer and discount pickers", BOTH),
  editable("orders.cancel", "Orders", "Cancel orders", "Cancelling a pending order", BOTH),
  editable("menu.manage", "Menu & pricing", "Manage menu items, prices and recipes", "Products, categories and recipes", MANAGER),
  editable("discounts.manage", "Menu & pricing", "Manage discounts", "Creating, changing and deleting discounts", MANAGER),
  editable("inventory.view", "Inventory", "View ingredients and stock levels", "The ingredient list", BOTH),
  editable("inventory.manage", "Inventory", "Add ingredients, adjust stock and log waste", "Ingredients and stock movements", MANAGER),
  editable("suppliers.manage", "Inventory", "Manage suppliers and deliveries", "Suppliers, price lists and deliveries", MANAGER),
  editable("staff.manage", "Staff", "Add and edit staff", "The staff list and staff records", MANAGER),
  editable("staff.attendance", "Staff", "View attendance", "Attendance logs", MANAGER),
  editable("reports.view", "Reports", "View sales reports", "Daily and monthly sales reports", MANAGER),
  editable("reports.export", "Reports", "Export sales reports", "Sales report CSV downloads", MANAGER),
  editable("documents.manage", "Reports", "Manage logs and PDF documents", "Uploaded CSV logs and PDFs", MANAGER),
  system("system.users", "Manage users and roles", "The Users and Roles & Permissions pages"),
  system("system.logs", "View activity logs and the audit trail", "The Activity Logs page"),
  system("system.tickets", "Handle support tickets", "The Support Tickets page"),
  system("system.health", "Monitor system health", "The System Health page"),
  system("system.settings", "Configure system settings", "Settings and notification templates"),
  system("system.payments", "Manage the payment gateway", "The Payment Gateway page"),
  system("system.backups", "Back up, restore and export data", "Backup & Restore and Data Export"),
] as const satisfies readonly PermissionDef[];

export type PermissionId = (typeof PERMISSIONS)[number]["id"];

const BY_ID = new Map<string, PermissionDef>(PERMISSIONS.map((p) => [p.id, p]));

export const permissionLabel = (id: string): string => BY_ID.get(id)?.label ?? id;

/** A permission another role may be granted: known, and not admin-only. */
export const isGrantable = (id: unknown): id is PermissionId =>
  typeof id === "string" && BY_ID.get(id)?.admin_only === false;

export type PermissionMatrix = Record<EditableRole, string[]>;

export async function getPermissionMatrix(): Promise<PermissionMatrix> {
  const result = await pool.query(
    `SELECT role::text AS role, permission FROM role_permissions ORDER BY permission`,
  );
  const matrix: PermissionMatrix = { manager: [], cashier: [] };
  for (const row of result.rows) {
    if (row.role === "manager" || row.role === "cashier") matrix[row.role as EditableRole].push(row.permission);
  }
  return matrix;
}

/** Replaces every manager and cashier grant in one transaction. */
export async function savePermissionMatrix(matrix: PermissionMatrix): Promise<PermissionMatrix> {
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM role_permissions`);
    const rows = (Object.keys(matrix) as EditableRole[]).flatMap((role) =>
      [...new Set(matrix[role])].map((permission) => [role, permission] as const),
    );
    if (rows.length > 0) {
      await client.query(
        `
          INSERT INTO role_permissions (role, permission)
          SELECT * FROM unnest($1::employee_role[], $2::varchar[])
        `,
        [rows.map(([role]) => role), rows.map(([, permission]) => permission)],
      );
    }
  });
  return getPermissionMatrix();
}

// Seeds the grants once, the first time this runs against a database. The
// marker row (not "is the table empty") is what records it, so an admin who
// unticks every box doesn't get the defaults back on the next restart.
export async function seedRolePermissions(): Promise<void> {
  await withTransaction(async (client) => {
    const marker = await client.query(
      `INSERT INTO app_migrations (name) VALUES ('seed_role_permissions') ON CONFLICT DO NOTHING`,
    );
    if ((marker.rowCount ?? 0) === 0) return;

    const rows = PERMISSIONS.flatMap((p) => p.seed.map((role) => [role, p.id] as const));
    await client.query(
      `
        INSERT INTO role_permissions (role, permission)
        SELECT * FROM unnest($1::employee_role[], $2::varchar[])
        ON CONFLICT DO NOTHING
      `,
      [rows.map(([role]) => role), rows.map(([, permission]) => permission)],
    );
    console.log(`Seeded ${rows.length} role permissions.`);
  });
}
