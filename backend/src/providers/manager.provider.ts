import { pool } from "../schema/db.ts";
import type { CreateManagerInput } from "../types/manager.type.ts";

export async function createManager(
  input: CreateManagerInput,
): Promise<Manager> {
  const {
    first_name,
    last_name,
    manager_email,
    contact_number,
    manager_status,
  } = input;

  const { rows } = await pool.query<Manager>(
    `INSERT INTO managers (first_name, last_name, manager_email, contact_number, manager_status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [first_name, last_name, manager_email, contact_number, manager_status],
  );

  const manager = rows[0];
  if (!manager) {
    throw new Error("Failed to create manager");
  }

  return manager;
}

export async function getManagerById(id: number): Promise<Manager | null> {
  const { rows } = await pool.query<Manager>(
    "SELECT * FROM managers WHERE manager_id = $1",
    [id],
  );
  return rows[0] ?? null;
}
