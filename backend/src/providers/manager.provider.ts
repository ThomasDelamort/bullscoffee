import { pool } from "../schema/db.ts";
import type { CreateManagerInput, Manager } from "../types/manager.type.ts";

export async function createManager(
  input: CreateManagerInput,
): Promise<Manager> {
  const {
    first_name,
    last_name,
    employee_email,
    contact_number,
    employee_status,
    work_schedule,
    approval_limit,
  } = input;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: employeeRows } = await client.query(
      `INSERT INTO employees (first_name, last_name, employee_email, contact_number, employee_role, employee_status, work_schedule)
       VALUES ($1, $2, $3, $4, 'manager', $5, $6)
       RETURNING *`,
      [first_name, last_name, employee_email, contact_number, employee_status, work_schedule],
    );
    const employee = employeeRows[0];
    if (!employee) {
      throw new Error("Failed to create employee");
    }

    const { rows: managerRows } = await client.query(
      `INSERT INTO managers (employee_id, approval_limit)
       VALUES ($1, $2)
       RETURNING *`,
      [employee["employee_id"], approval_limit ?? 500.0],
    );
    const manager = managerRows[0];
    if (!manager) {
      throw new Error("Failed to create manager");
    }

    await client.query("COMMIT");
    return { ...employee, approval_limit: manager["approval_limit"] } as Manager;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getAllManagers(): Promise<Manager[]> {
  const { rows } = await pool.query<Manager>(
    `SELECT e.*, m.approval_limit
     FROM managers m
     JOIN employees e ON e.employee_id = m.employee_id`,
  );
  return rows;
}

export async function getManagerById(id: number): Promise<Manager | null> {
  const { rows } = await pool.query<Manager>(
    `SELECT e.*, m.approval_limit
     FROM managers m
     JOIN employees e ON e.employee_id = m.employee_id
     WHERE m.employee_id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
