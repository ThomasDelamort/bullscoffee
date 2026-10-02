import type { Request, Response } from "express";
import { clerkClient } from "@clerk/express";
import { pool } from "../lib/db.ts";
import type { Employee } from "../types/employee.types.ts";

export type Severity = "info" | "warning" | "critical";
export type ActorRole = "admin" | "manager" | "cashier" | "customer" | "system";

export interface ActivityEvent {
  /** What happened, as a sentence for the log, e.g. `Cancelled order #12`. */
  action: string;
  /** The area of the system, e.g. Orders, Menu, Users. */
  module: string;
  severity?: Severity;
  /** Why the event belongs in the audit trail; omit for an ordinary event. */
  flag?: string | null;
}

const MANILA_HOUR = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  hourCycle: "h23",
});

/** Outside 06:00-22:00 store time, when a bulk export is worth a second look. */
export const isOutsideBusinessHours = (at: Date = new Date()): boolean => {
  const hour = Number(MANILA_HOUR.format(at));
  return hour < 6 || hour >= 22;
};

/** ₱1,234.50 */
export const peso = (amount: number | string): string =>
  `₱${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Actor {
  clerk_id: string | null;
  name: string;
  role: ActorRole;
}

const SYSTEM_ACTOR: Actor = { clerk_id: null, name: "System", role: "system" };

const employeeActor = (employee: Employee): Actor => ({
  clerk_id: employee.clerk_id,
  name: `${employee.first_name} ${employee.last_name}`.trim(),
  role: employee.employee_role,
});

async function insert(
  actor: Actor,
  ip: string | null,
  event: ActivityEvent,
  session_id: string | null = null,
): Promise<void> {
  await pool.query(
    `
      INSERT INTO activity_logs (actor_clerk_id, actor_name, actor_role, action, module, ip, severity, flag_reason, session_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (session_id) DO NOTHING
    `,
    [
      actor.clerk_id,
      actor.name.slice(0, 120),
      actor.role,
      event.action,
      event.module,
      ip?.slice(0, 45) ?? null,
      event.severity ?? (event.flag ? "warning" : "info"),
      event.flag ?? null,
      session_id,
    ],
  );
}

// Logging never fails or slows a request: the insert isn't awaited, and a
// failure is only written to the server log.
const fireAndForget = (work: Promise<void>, event: ActivityEvent): void => {
  void work.catch((error) =>
    console.error(`Activity log write failed (${event.module}: ${event.action}):`, error),
  );
};

/**
 * Logs something the signed-in employee just did. The actor is the employee
 * the auth middleware put on res.locals; call it after the change succeeds.
 */
export function recordActivity(req: Request, res: Response, event: ActivityEvent): void {
  const employee: Employee | undefined = res.locals["employee"];
  const actor = employee ? employeeActor(employee) : SYSTEM_ACTOR;
  fireAndForget(insert(actor, req.ip ?? null, event), event);
}

/** Logs something a scheduled job did, e.g. an automatic backup. */
export function recordSystemActivity(event: ActivityEvent): void {
  fireAndForget(insert(SYSTEM_ACTOR, null, event), event);
}

// Who a Clerk user is, for a sign_in row: an employee, a registered
// customer, or a customer who hasn't finished registering yet.
async function resolveActor(clerk_id: string): Promise<Actor> {
  const result = await pool.query(
    `
      SELECT first_name, last_name, employee_role::text AS role FROM employees WHERE clerk_id = $1
      UNION ALL
      SELECT first_name, last_name, 'customer' FROM customers WHERE clerk_id = $1
      LIMIT 1
    `,
    [clerk_id],
  );
  const row = result.rows[0];
  if (row) {
    return { clerk_id, name: `${row.first_name} ${row.last_name}`.trim(), role: row.role };
  }
  const user = await clerkClient.users.getUser(clerk_id);
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.primaryEmailAddress?.emailAddress ||
    "Unknown user";
  return { clerk_id, name, role: "customer" };
}

// Sessions already logged by this process, so a signed-in user's requests
// cost one Set lookup each instead of a database write. The unique
// session_id catches what the Set misses (a restart, a second instance).
const loggedSessions = new Set<string>();
const MAX_REMEMBERED_SESSIONS = 50_000;

/**
 * Called by protectRoute on every authenticated request; writes one sign_in
 * row per Clerk session. Failed sign-ins happen inside Clerk and never reach
 * the API, so they aren't captured here.
 */
export function recordSignIn(req: Request, clerk_id: string, session_id: string | null | undefined): void {
  if (!session_id || loggedSessions.has(session_id)) return;
  if (loggedSessions.size >= MAX_REMEMBERED_SESSIONS) loggedSessions.clear();
  loggedSessions.add(session_id);

  const event: ActivityEvent = { action: "Signed in", module: "Auth" };
  fireAndForget(
    resolveActor(clerk_id).then((actor) => insert(actor, req.ip ?? null, event, session_id)),
    event,
  );
}

export interface LogEntry {
  id: number;
  timestamp: string;
  actor: string;
  actor_clerk_id: string | null;
  role: ActorRole;
  action: string;
  module: string;
  ip: string | null;
  severity: Severity;
  flag: { reason: string; reviewed_at: string | null; reviewed_by: string | null } | null;
}

export interface ActivityFilters {
  view: "all" | "audit";
  severity?: Severity | undefined;
  module?: string | undefined;
  search?: string | undefined;
  limit: number;
  /** Only entries older than this log_id, for "Load more". */
  before?: number | undefined;
}

const ENTRY_COLUMNS = `
  log_id::int AS id,
  occurred_at AS timestamp,
  actor_name AS actor,
  actor_clerk_id,
  actor_role AS role,
  action,
  module,
  ip,
  severity,
  CASE WHEN flag_reason IS NULL THEN NULL ELSE json_build_object(
    'reason', flag_reason,
    'reviewed_at', flag_reviewed_at,
    'reviewed_by', flag_reviewed_by
  ) END AS flag
`;

export async function getActivity(filters: ActivityFilters): Promise<LogEntry[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  const param = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };

  if (filters.view === "audit") conditions.push("flag_reason IS NOT NULL");
  if (filters.severity) conditions.push(`severity = ${param(filters.severity)}`);
  if (filters.module) conditions.push(`module = ${param(filters.module)}`);
  if (filters.search) {
    const pattern = param(`%${filters.search}%`);
    conditions.push(`(actor_name ILIKE ${pattern} OR action ILIKE ${pattern} OR ip ILIKE ${pattern})`);
  }
  if (filters.before !== undefined) conditions.push(`log_id < ${param(filters.before)}`);

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT ${ENTRY_COLUMNS} FROM activity_logs ${where} ORDER BY log_id DESC LIMIT ${param(filters.limit)}`,
    values,
  );
  return result.rows;
}

/** Flagged events nobody has reviewed yet: the audit trail's tab count. */
export async function countUnreviewed(): Promise<number> {
  const result = await pool.query(
    `SELECT count(*)::int AS count FROM activity_logs WHERE flag_reason IS NOT NULL AND flag_reviewed_at IS NULL`,
  );
  return result.rows[0].count;
}

export async function getActivityModules(): Promise<string[]> {
  const result = await pool.query(`SELECT DISTINCT module FROM activity_logs ORDER BY module`);
  return result.rows.map((row) => row.module);
}

/** Marks a flagged entry reviewed; undefined when there's no such flagged entry. */
export async function reviewActivity(
  log_id: number,
  reviewer: string,
): Promise<LogEntry | undefined> {
  const result = await pool.query(
    `
      UPDATE activity_logs
      SET flag_reviewed_by = $2, flag_reviewed_at = COALESCE(flag_reviewed_at, now())
      WHERE log_id = $1 AND flag_reason IS NOT NULL
      RETURNING ${ENTRY_COLUMNS}
    `,
    [log_id, reviewer.slice(0, 120)],
  );
  return result.rows[0];
}

/** Sign-ins per day for the last `days` days (Manila dates), oldest first, zeros included. */
export async function getSignInsPerDay(days: number): Promise<{ day: string; count: number }[]> {
  const result = await pool.query(
    `
      WITH days AS (
        SELECT generate_series(
          (now() AT TIME ZONE 'Asia/Manila')::date - ($1::int - 1),
          (now() AT TIME ZONE 'Asia/Manila')::date,
          interval '1 day'
        )::date AS day
      )
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day, count(l.log_id)::int AS count
      FROM days d
      LEFT JOIN activity_logs l
        ON l.session_id IS NOT NULL
       AND (l.occurred_at AT TIME ZONE 'Asia/Manila')::date = d.day
      GROUP BY d.day
      ORDER BY d.day
    `,
    [days],
  );
  return result.rows;
}
