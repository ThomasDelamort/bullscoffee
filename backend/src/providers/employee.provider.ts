import { pool } from "../schema/db.ts";
import type { Employee } from "../types/employee.types.ts";

export async function createEmployee(employee: Employee) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "INSERT INTO employees (first_name, last_name, employee_email, contact_number, employee_status, employee_role, work_schedule) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [employee.first_name, employee.last_name, employee.employee_email, employee.contact_number, employee.employee_status, employee.employee_role, employee.work_schedule]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getAllEmployees() {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT * FROM employees");
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getEmployeeById(employee_id: number) {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT * FROM employees WHERE employee_id = $1", [employee_id]);
    return result.rows[0];
  } finally {
    client.release();
  }
}
