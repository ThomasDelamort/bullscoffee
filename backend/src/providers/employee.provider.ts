import { pool } from "../lib/db.ts";
import { updateRow } from "../lib/sql.ts";
import type { Employee } from "../types/employee.types.ts";

export async function createEmployee(
  employee: Employee,
): Promise<Employee | void> {
  const result = await pool.query(
    `
      INSERT INTO employees (clerk_id, first_name, last_name, employee_email, contact_number, profile_picture, employee_status, employee_role, work_schedule)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [
      employee.clerk_id,
      employee.first_name,
      employee.last_name,
      employee.employee_email,
      employee.contact_number,
      employee.profile_picture,
      employee.employee_status,
      employee.employee_role,
      employee.work_schedule,
    ],
  );
  return result.rows[0];
}

export async function getEmployeeById(
  employee_id: number,
): Promise<Employee | void> {
  const result = await pool.query(
    `SELECT * FROM employees WHERE employee_id = $1`,
    [employee_id],
  );
  return result.rows[0];
}

// Staff added from the Manager console or invited from Users start with an
// invite_<uuid> placeholder clerk_id. The first time they sign in, the row
// whose email matches one of their *verified* Clerk addresses is claimed for
// their real Clerk id. Verified only: otherwise anyone could add a staff
// member's address to a new account, unverified, and take over the row.
export async function claimInvitedEmployee(
  clerk_id: string,
  verifiedEmails: string[],
): Promise<Employee | void> {
  if (verifiedEmails.length === 0) return;
  const result = await pool.query(
    `
      UPDATE employees SET clerk_id = $1
      WHERE employee_id = (
        SELECT employee_id FROM employees
        WHERE clerk_id LIKE 'invite\\_%'
          AND lower(employee_email) = ANY($2::text[])
        ORDER BY employee_id
        LIMIT 1
      )
      RETURNING *
    `,
    [clerk_id, verifiedEmails.map((email) => email.toLowerCase())],
  );
  return result.rows[0];
}

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
