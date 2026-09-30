import { pool } from "../lib/db.ts";

export interface AttendanceFilters {
  /** Inclusive, YYYY-MM-DD */
  from?: string | undefined;
  /** Inclusive, YYYY-MM-DD */
  to?: string | undefined;
  employee_id?: number | undefined;
}

export interface AttendanceRow {
  log_id: number;
  employee_id: number;
  time_in: Date;
  time_out: Date | null;
  employee_name: string;
}

const SELECT_ATTENDANCE = `
    SELECT a.*, (e.first_name || ' ' || e.last_name) AS employee_name
    FROM attendance_logs a
    JOIN employees e ON e.employee_id = a.employee_id
`;

export const getAttendance = async (
  filters: AttendanceFilters = {},
): Promise<AttendanceRow[]> => {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.from) {
    values.push(filters.from);
    conditions.push(`a.time_in >= $${values.length}::date`);
  }
  if (filters.to) {
    values.push(filters.to);
    conditions.push(`a.time_in < $${values.length}::date + 1`);
  }
  if (filters.employee_id !== undefined) {
    values.push(filters.employee_id);
    conditions.push(`a.employee_id = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `${SELECT_ATTENDANCE} ${where} ORDER BY a.time_in DESC, a.log_id DESC`,
    values,
  );
  return result.rows;
};

// Sets time_out, e.g. to close a shift the employee forgot to clock out of.
// A time_out at or before time_in trips the table's CHECK (23514).
export const setAttendanceTimeOut = async (
  log_id: number,
  time_out: Date | string,
): Promise<AttendanceRow | void> => {
  const updated = await pool.query(
    `UPDATE attendance_logs SET time_out = $1 WHERE log_id = $2`,
    [time_out, log_id],
  );
  if ((updated.rowCount ?? 0) === 0) return;

  const result = await pool.query(`${SELECT_ATTENDANCE} WHERE a.log_id = $1`, [
    log_id,
  ]);
  return result.rows[0];
};
