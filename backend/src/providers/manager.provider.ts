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
  } = input;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: employeeRows } = await client.query(
      `INSERT INTO employees (first_name, last_name, employee_email, contact_number, employee_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [first_name, last_name, employee_email, contact_number, employee_status],
    );
    const employee = employeeRows[0];
    if (!employee) {
      throw new Error("Failed to create employee");
    }

    const { rows: managerRows } = await client.query(
      `INSERT INTO managers (employee_id)
       VALUES ($1)
       RETURNING *`,
      [employee["employee_id"]],
    );
    if (!managerRows[0]) {
      throw new Error("Failed to create manager");
    }

    await client.query("COMMIT");
    return employee as Manager;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getAllManagers(): Promise<Manager[]> {
  const { rows } = await pool.query<Manager>(
    `SELECT e.*
     FROM managers m
     JOIN employees e ON e.employee_id = m.employee_id`,
  );
  return rows;
}

export async function getManagerById(id: number): Promise<Manager | null> {
  const { rows } = await pool.query<Manager>(
    `SELECT e.*
     FROM managers m
     JOIN employees e ON e.employee_id = m.employee_id
     WHERE m.employee_id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
