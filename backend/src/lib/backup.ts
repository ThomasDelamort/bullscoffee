import { promisify } from "node:util";
import { gunzip, gzip } from "node:zlib";
import { pool } from "./db.ts";
import { deleteFile, isS3Configured, readFile, storePrivateObject } from "./s3.ts";
import { registerJob } from "./scheduler.ts";
import { withTransaction } from "./sql.ts";
import { recordSystemActivity } from "../providers/activity.provider.ts";

// Database snapshots: every table below as JSON, gzipped, in private S3
// (bulls-coffee/backups/), indexed by the backups table. The whole snapshot
// is held in memory while it's made or restored, which is fine at this
// store's size (a few MB); a much bigger database would need streaming.

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

const SNAPSHOT_VERSION = 1;

/**
 * What a backup holds, in foreign-key order: a table comes after every table
 * it references, so a restore can insert them in this order.
 */
export const BACKUP_TABLES = [
  "employees",
  "attendance_logs",
  "customers",
  "categories",
  "products",
  "ingredients",
  "product_ingredients",
  "stock_movements",
  "discounts",
  "orders",
  "order_items",
  "payments",
  "payment_settings",
  "suppliers",
  "supplier_ingredients",
  "deliveries",
  "delivery_items",
  "feedback",
  "documents",
  "system_settings",
  "role_permissions",
  "notification_templates",
  "support_tickets",
  "ticket_messages",
] as const;

/**
 * Left out on purpose: the audit trail, the backup and export history, and
 * monitoring data must survive a restore. None of them holds a foreign key
 * into BACKUP_TABLES (see init.sql), which is what lets a restore truncate
 * those without touching these.
 */
export const EXCLUDED_TABLES = [
  "activity_logs",
  "backups",
  "export_jobs",
  "notification_log",
  "health_checks",
  "request_metrics",
  "app_migrations",
] as const;

type BackupTable = (typeof BACKUP_TABLES)[number];

interface Snapshot {
  version: number;
  created_at: string;
  tables: Partial<Record<BackupTable, Record<string, unknown>[]>>;
}

/**
 * Warns at startup about a table in neither list, so a table added later
 * isn't silently left out of backups.
 */
export async function checkBackupCoverage(): Promise<void> {
  const result = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  const known = new Set<string>([...BACKUP_TABLES, ...EXCLUDED_TABLES]);
  const missing = result.rows.map((row) => row.table_name as string).filter((name) => !known.has(name));
  if (missing.length > 0) {
    console.warn(
      `Backups don't cover these tables: ${missing.join(", ")}. Add each to BACKUP_TABLES or EXCLUDED_TABLES in lib/backup.ts.`,
    );
  }
}

const backupFileName = (date: Date) =>
  `bullscoffee-backup-${date.toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json.gz`;

// Reads every table in one REPEATABLE READ transaction, so the snapshot is
// consistent even while orders keep coming in. Postgres writes the JSON
// itself (json_agg), so dates and numbers keep their exact text.
async function takeSnapshot(): Promise<{ json: string; counts: Record<string, number> }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const parts: string[] = [];
    const counts: Record<string, number> = {};
    for (const table of BACKUP_TABLES) {
      const result = await client.query(
        `SELECT COALESCE(json_agg(t), '[]'::json)::text AS rows, count(*)::int AS count FROM ${table} t`,
      );
      parts.push(`${JSON.stringify(table)}:${result.rows[0].rows}`);
      counts[table] = result.rows[0].count;
    }
    await client.query("COMMIT");
    const json = `{"version":${SNAPSHOT_VERSION},"created_at":${JSON.stringify(new Date().toISOString())},"tables":{${parts.join(",")}}}`;
    return { json, counts };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export interface BackupRow {
  id: number;
  kind: "automatic" | "manual";
  status: "in_progress" | "completed" | "failed";
  size_bytes: number | null;
  table_counts: Record<string, number> | null;
  error: string | null;
  created_by_name: string | null;
  created_at: string;
  finished_at: string | null;
}

const BACKUP_COLUMNS = `backup_id AS id, kind, status, size_bytes::float AS size_bytes, table_counts, error,
  created_by_name, created_at, finished_at`;

export class BackupInProgressError extends Error {}

/**
 * Starts a backup and answers its row straight away (status in_progress);
 * the snapshot is taken and uploaded in the background. `done` settles when
 * it's finished, for callers that want to wait (the scheduler).
 */
export async function startBackup(
  kind: "automatic" | "manual",
  createdBy: string | null,
): Promise<{ row: BackupRow; done: Promise<void> }> {
  // A backup interrupted by a restart never finishes; after an hour it no
  // longer blocks new ones.
  await pool.query(`
    UPDATE backups SET status = 'failed', error = 'Interrupted (the server restarted)', finished_at = now()
    WHERE status = 'in_progress' AND created_at < now() - interval '1 hour'
  `);
  const inserted = await pool.query(
    `
      INSERT INTO backups (kind, created_by_name)
      SELECT $1, $2
      WHERE NOT EXISTS (SELECT 1 FROM backups WHERE status = 'in_progress')
      RETURNING ${BACKUP_COLUMNS}
    `,
    [kind, createdBy],
  );
  const row: BackupRow | undefined = inserted.rows[0];
  if (!row) throw new BackupInProgressError("A backup is already running");

  const done = (async () => {
    try {
      const { json, counts } = await takeSnapshot();
      const body = await gzipAsync(Buffer.from(json, "utf8"));
      const key = await storePrivateObject("backups", backupFileName(new Date(row.created_at)), body, "application/gzip");
      await pool.query(
        `
          UPDATE backups SET status = 'completed', s3_key = $2, size_bytes = $3, table_counts = $4, finished_at = now()
          WHERE backup_id = $1
        `,
        [row.id, key, body.length, JSON.stringify(counts)],
      );
    } catch (error: any) {
      console.error(`Backup #${row.id} failed:`, error);
      await pool.query(
        `UPDATE backups SET status = 'failed', error = $2, finished_at = now() WHERE backup_id = $1`,
        [row.id, String(error?.message ?? error).slice(0, 500)],
      );
      throw error;
    }
  })();
  // The HTTP caller doesn't wait; a failure is already recorded on the row.
  done.catch(() => {});
  return { row, done };
}

export async function listBackups(): Promise<BackupRow[]> {
  const result = await pool.query(`SELECT ${BACKUP_COLUMNS} FROM backups ORDER BY created_at DESC LIMIT 200`);
  return result.rows;
}

export async function getBackup(backup_id: number): Promise<(BackupRow & { s3_key: string | null }) | undefined> {
  const result = await pool.query(`SELECT ${BACKUP_COLUMNS}, s3_key FROM backups WHERE backup_id = $1`, [backup_id]);
  return result.rows[0];
}

export async function readBackupFile(s3_key: string): Promise<Buffer> {
  return Buffer.from(await readFile(s3_key));
}

/** Removes the snapshot from S3 and its row. */
export async function deleteBackup(backup_id: number, s3_key: string | null): Promise<void> {
  if (s3_key && isS3Configured()) await deleteFile(s3_key);
  await pool.query(`DELETE FROM backups WHERE backup_id = $1`, [backup_id]);
}

export class RestoreRefusedError extends Error {}

/**
 * Replaces every table in BACKUP_TABLES with the snapshot's rows, in one
 * transaction: on any error nothing changes. Refused unless the snapshot
 * has `adminClerkId` as an active admin, so a restore can't lock out the
 * person running it. Tables the snapshot predates are left empty; columns
 * it predates get their defaults.
 */
export async function restoreBackup(
  s3_key: string,
  adminClerkId: string,
): Promise<Record<string, number>> {
  const snapshot: Snapshot = JSON.parse((await gunzipAsync(await readBackupFile(s3_key))).toString("utf8"));
  if (snapshot.version !== SNAPSHOT_VERSION || typeof snapshot.tables !== "object") {
    throw new RestoreRefusedError("This file isn't a backup this version of the app can restore");
  }
  const admins = (snapshot.tables.employees ?? []).filter(
    (e) => e["clerk_id"] === adminClerkId && e["employee_role"] === "admin" && e["employee_status"] === "active",
  );
  if (admins.length === 0) {
    throw new RestoreRefusedError(
      "You weren't an active admin when this backup was taken, so restoring it would lock you out of this console.",
    );
  }

  const restored: Record<string, number> = {};
  await withTransaction(async (client) => {
    await client.query(`SET LOCAL lock_timeout = '10s'`);
    // Every table that references one of these is in the list too, so no
    // CASCADE: an unexpected reference fails the restore instead of
    // emptying some other table.
    await client.query(`TRUNCATE ${BACKUP_TABLES.join(", ")} RESTART IDENTITY`);

    for (const table of BACKUP_TABLES) {
      const rows = snapshot.tables[table] ?? [];
      restored[table] = rows.length;
      if (rows.length === 0) continue;

      // Only the columns both the table and the snapshot have.
      const columns = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        [table],
      );
      const inSnapshot = new Set(Object.keys(rows[0]!));
      const shared = columns.rows
        .map((row) => row.column_name as string)
        .filter((column) => inSnapshot.has(column))
        .map((column) => `"${column}"`)
        .join(", ");
      await client.query(
        `INSERT INTO ${table} (${shared}) SELECT ${shared} FROM jsonb_populate_recordset(NULL::${table}, $1::jsonb)`,
        [JSON.stringify(rows)],
      );
    }

    // Serial columns carry on after the highest restored id.
    const serials = await client.query(
      `
        SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ANY($1::text[]) AND column_default LIKE 'nextval(%'
      `,
      [[...BACKUP_TABLES]],
    );
    for (const { table_name, column_name } of serials.rows) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT max("${column_name}") FROM ${table_name}), 0) + 1, false)`,
        [table_name, column_name],
      );
    }
  });
  return restored;
}

// The most recent scheduled time at or before now, in store time: hourly at
// :MM, daily at HH:MM, weekly on Sundays (the store is closed) at HH:MM.
const LAST_SLOT_SQL = `
  WITH s AS (
    SELECT backup_frequency, backup_time,
           (now() AT TIME ZONE 'Asia/Manila') AS local_now
    FROM system_settings WHERE settings_id = 1
  ), slot AS (
    SELECT backup_frequency, local_now,
      CASE backup_frequency
        WHEN 'hourly' THEN date_trunc('hour', local_now) + make_interval(mins => extract(minute FROM backup_time)::int)
        WHEN 'daily' THEN date_trunc('day', local_now) + backup_time
        ELSE date_trunc('week', local_now) + interval '6 days' + backup_time
      END AS candidate,
      CASE backup_frequency WHEN 'hourly' THEN interval '1 hour' WHEN 'daily' THEN interval '1 day' ELSE interval '7 days' END AS step
    FROM s
  )
  SELECT (CASE WHEN candidate > local_now THEN candidate - step ELSE candidate END) AT TIME ZONE 'Asia/Manila' AS last_slot,
         step
  FROM slot
`;

/** When the next automatic backup is due, or null when they're off. */
export async function nextScheduledBackup(): Promise<string | null> {
  const result = await pool.query(`
    SELECT CASE WHEN st.backup_enabled THEN (x.last_slot + x.step) END AS next_run
    FROM system_settings st, (${LAST_SLOT_SQL}) x
    WHERE st.settings_id = 1
  `);
  return result.rows[0]?.next_run ?? null;
}

// Runs a backup when one is due and none has been attempted since the slot,
// so a restart or a sleeping instance catches up once (a failed attempt
// waits for the next slot rather than retrying every minute).
async function runAutomaticBackup(): Promise<void> {
  if (!isS3Configured()) return;
  const due = await pool.query(`
    SELECT 1
    FROM system_settings st, (${LAST_SLOT_SQL}) x
    WHERE st.settings_id = 1 AND st.backup_enabled
      AND NOT EXISTS (SELECT 1 FROM backups b WHERE b.kind = 'automatic' AND b.created_at >= x.last_slot)
  `);
  if ((due.rowCount ?? 0) === 0) return;

  try {
    const { row, done } = await startBackup("automatic", null);
    await done;
    recordSystemActivity({ module: "Backups", action: `Automatic backup #${row.id} completed` });
  } catch (error: any) {
    if (error instanceof BackupInProgressError) return;
    recordSystemActivity({
      module: "Backups",
      action: `Automatic backup failed: ${error?.message ?? error}`,
      severity: "critical",
      flag: "Automatic backup failed",
    });
  }
}

// Automatic backups older than the retention period go, from S3 and the
// index. Manual ones are kept until someone deletes them.
async function pruneOldBackups(): Promise<void> {
  const old = await pool.query(`
    SELECT b.backup_id, b.s3_key FROM backups b, system_settings s
    WHERE s.settings_id = 1 AND b.kind = 'automatic' AND b.status <> 'in_progress'
      AND b.created_at < now() - make_interval(days => s.backup_retention_days)
  `);
  for (const { backup_id, s3_key } of old.rows) {
    await deleteBackup(backup_id, s3_key);
  }
  if (old.rows.length > 0) {
    recordSystemActivity({ module: "Backups", action: `Deleted ${old.rows.length} automatic backup(s) past the retention period` });
  }
}

export function registerBackupJobs(): void {
  registerJob({ name: "automatic backup", run: runAutomaticBackup });
  registerJob({ name: "prune old backups", everyTicks: 60, run: pruneOldBackups });
}
