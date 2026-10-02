import { clerkClient } from "@clerk/express";
import type { User } from "@clerk/express";
import { pool } from "../lib/db.ts";
import type { Employee } from "../types/employee.types.ts";

export type AccountStatus = "active" | "invited" | "locked" | "deactivated";
export type AccountKind = "employee" | "customer";

/** One row of the admin Users page: an employee or a customer, with its Clerk state. */
export interface AdminUser {
  clerk_id: string;
  kind: AccountKind;
  /** employee_id or customer_id, by kind. */
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: Employee["employee_role"] | "customer";
  status: AccountStatus;
  /** From Clerk; null for an invite nobody has accepted, or a user who never signed in. */
  last_active: string | null;
  work_schedule: string | null;
}

export const isInvitePlaceholder = (clerk_id: string): boolean => clerk_id.startsWith("invite_");

// Clerk's user list takes up to 100 ids a call.
const CLERK_PAGE = 100;

async function clerkUsersById(clerk_ids: string[]): Promise<Map<string, User>> {
  const users = new Map<string, User>();
  for (let i = 0; i < clerk_ids.length; i += CLERK_PAGE) {
    const page = await clerkClient.users.getUserList({
      userId: clerk_ids.slice(i, i + CLERK_PAGE),
      limit: CLERK_PAGE,
    });
    for (const user of page.data) users.set(user.id, user);
  }
  return users;
}

// Status comes from data that already exists: the placeholder clerk_id,
// employee_status, and Clerk's banned / locked flags.
function statusOf(clerk_id: string, user: User | undefined, inactive: boolean): AccountStatus {
  if (isInvitePlaceholder(clerk_id)) return inactive ? "deactivated" : "invited";
  if (inactive || user?.banned) return "deactivated";
  if (user?.locked) return "locked";
  return "active";
}

const iso = (ms: number | null | undefined): string | null =>
  ms ? new Date(ms).toISOString() : null;

/**
 * Every employee and customer. Someone who is both (staff who also order as
 * customers) is listed once, as the employee: it's one Clerk account, and
 * locking or deactivating it affects both.
 */
export async function listAdminUsers(): Promise<AdminUser[]> {
  const [employees, customers] = await Promise.all([
    pool.query(
      `SELECT employee_id, clerk_id, first_name, last_name, employee_email, employee_role,
              employee_status, work_schedule
       FROM employees ORDER BY first_name, last_name`,
    ),
    pool.query(
      `SELECT customer_id, clerk_id, first_name, last_name, customer_email
       FROM customers
       WHERE clerk_id NOT IN (SELECT clerk_id FROM employees)
       ORDER BY first_name, last_name`,
    ),
  ]);

  const linked = [...employees.rows, ...customers.rows]
    .map((row) => row.clerk_id as string)
    .filter((clerk_id) => !isInvitePlaceholder(clerk_id));
  const clerk = await clerkUsersById(linked);

  return [
    ...employees.rows.map((e): AdminUser => {
      const user = clerk.get(e.clerk_id);
      return {
        clerk_id: e.clerk_id,
        kind: "employee",
        id: e.employee_id,
        first_name: e.first_name,
        last_name: e.last_name,
        email: e.employee_email,
        role: e.employee_role,
        status: statusOf(e.clerk_id, user, e.employee_status === "inactive"),
        last_active: iso(user?.lastActiveAt ?? user?.lastSignInAt),
        work_schedule: e.work_schedule,
      };
    }),
    ...customers.rows.map((c): AdminUser => {
      const user = clerk.get(c.clerk_id);
      return {
        clerk_id: c.clerk_id,
        kind: "customer",
        id: c.customer_id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.customer_email,
        role: "customer",
        status: statusOf(c.clerk_id, user, false),
        last_active: iso(user?.lastActiveAt ?? user?.lastSignInAt),
        work_schedule: null,
      };
    }),
  ];
}

/** Who a clerk_id belongs to, for the account actions; undefined when nobody. */
export async function findAccount(
  clerk_id: string,
): Promise<{ kind: AccountKind; employee?: Employee; name: string } | undefined> {
  const employee = await pool.query(`SELECT * FROM employees WHERE clerk_id = $1`, [clerk_id]);
  if (employee.rows[0]) {
    const e: Employee = employee.rows[0];
    return { kind: "employee", employee: e, name: `${e.first_name} ${e.last_name}` };
  }
  const customer = await pool.query(
    `SELECT first_name, last_name FROM customers WHERE clerk_id = $1`,
    [clerk_id],
  );
  const c = customer.rows[0];
  return c ? { kind: "customer", name: `${c.first_name} ${c.last_name}` } : undefined;
}

/** Active admins other than `employee_id`: zero means it's the last one. */
export async function countOtherActiveAdmins(employee_id: number): Promise<number> {
  const result = await pool.query(
    `SELECT count(*)::int AS count FROM employees
     WHERE employee_role = 'admin' AND employee_status = 'active' AND employee_id <> $1`,
    [employee_id],
  );
  return result.rows[0].count;
}

export async function setEmployeeStatus(
  employee_id: number,
  status: "active" | "inactive",
): Promise<void> {
  await pool.query(`UPDATE employees SET employee_status = $2 WHERE employee_id = $1`, [
    employee_id,
    status,
  ]);
}

/** Signs a user out of every device; returns how many sessions were ended. */
export async function revokeAllSessions(clerk_id: string): Promise<number> {
  const sessions = await clerkClient.sessions.getSessionList({
    userId: clerk_id,
    status: "active",
    limit: 100,
  });
  await Promise.all(sessions.data.map((s) => clerkClient.sessions.revokeSession(s.id)));
  return sessions.data.length;
}
