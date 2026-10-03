import { pool } from "../lib/db.ts";

export type BackupFrequency = "hourly" | "daily" | "weekly";

export interface SystemSettings {
  store_name: string;
  support_email: string;
  online_ordering: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  backup_enabled: boolean;
  backup_frequency: BackupFrequency;
  /** HH:MM, store time (Asia/Manila). */
  backup_time: string;
  backup_retention_days: 7 | 30 | 90 | 365;
  updated_at: string;
  updated_by_name: string | null;
}

/** What the storefront and kiosk may see, without signing in. */
export type PublicSettings = Pick<
  SystemSettings,
  "store_name" | "support_email" | "online_ordering" | "maintenance_mode" | "maintenance_message"
>;

export const GENERAL_COLUMNS = [
  "store_name",
  "support_email",
  "online_ordering",
  "maintenance_mode",
  "maintenance_message",
] as const;

export const BACKUP_COLUMNS = [
  "backup_enabled",
  "backup_frequency",
  "backup_time",
  "backup_retention_days",
] as const;

export async function getSettings(): Promise<SystemSettings> {
  const result = await pool.query(`
    SELECT s.store_name, s.support_email, s.online_ordering, s.maintenance_mode,
           s.maintenance_message, s.backup_enabled, s.backup_frequency,
           to_char(s.backup_time, 'HH24:MI') AS backup_time, s.backup_retention_days,
           s.updated_at, (e.first_name || ' ' || e.last_name) AS updated_by_name
    FROM system_settings s
    LEFT JOIN employees e ON e.employee_id = s.updated_by
    WHERE s.settings_id = 1
  `);
  const row = result.rows[0];
  if (!row) throw new Error("system_settings row is missing");
  return row;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const { store_name, support_email, online_ordering, maintenance_mode, maintenance_message } =
    await getSettings();
  return { store_name, support_email, online_ordering, maintenance_mode, maintenance_message };
}

/**
 * Writes the given columns (only ones in `columns`, which keeps request keys
 * out of the SQL) and stamps who changed them.
 */
export async function updateSettings(
  columns: readonly (keyof SystemSettings)[],
  changes: Partial<SystemSettings>,
  employee_id: number,
): Promise<SystemSettings> {
  const entries = columns.filter((column) => changes[column] !== undefined);
  if (entries.length > 0) {
    const assignments = entries.map((column, i) => `${column} = $${i + 1}`).join(", ");
    await pool.query(
      `UPDATE system_settings SET ${assignments}, updated_at = now(), updated_by = $${entries.length + 1} WHERE settings_id = 1`,
      [...entries.map((column) => changes[column]), employee_id],
    );
  }
  return getSettings();
}
