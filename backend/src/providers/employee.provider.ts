import { pool } from "../lib/db.ts";
import { updateRow } from "../lib/sql.ts";
import type { Employee } from "../types/employee.types.ts";

// Create and get-by-id already live in the admin provider; re-exported so the
// manager routes can import everything employee-related from one place.
export { createEmployee, getEmployeeById } from "./admin.provider.ts";

export interface EmployeeFilters {
  role?: Employee["employee_role"] | undefined;
}

export type EmployeeChanges = Partial<
  Pick<
    Employee,
    | "first_name"
    | "last_name"
    | "employee_email"
    | "contact_number"
    | "profile_picture"
    | "employee_status"
    | "employee_role"
    | "work_schedule"
  >
>;

const EMPLOYEE_COLUMNS = [
  "first_name",
  "last_name",
  "employee_email",
  "contact_number",
  "profile_picture",
  "employee_status",
  "employee_role",
  "work_schedule",
] as const;

export const getEmployees = async (
  filters: EmployeeFilters = {},
): Promise<Employee[]> => {
  const values: unknown[] = [];
  let where = "";
  if (filters.role) {
    values.push(filters.role);
    where = `WHERE employee_role = $1`;
  }
  const result = await pool.query(
    `SELECT * FROM employees ${where} ORDER BY first_name, last_name`,
    values,
  );
  return result.rows;
};

// Backs GET /api/manager/me: resolves the signed-in Clerk user to an employee.
export const getEmployeeByClerkId = async (
  clerk_id: string,
): Promise<Employee | void> => {
  const result = await pool.query(
    `SELECT * FROM employees WHERE clerk_id = $1`,
    [clerk_id],
  );
  return result.rows[0];
};

export const updateEmployee = async (
  employee_id: number,
  changes: EmployeeChanges,
): Promise<Employee | void> =>
  updateRow<Employee>(
    "employees",
    "employee_id",
    employee_id,
    EMPLOYEE_COLUMNS,
    changes,
  );
