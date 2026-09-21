import { pool } from "../schema/db.ts";

export interface Cashier {
  employee_id: number;
  first_name: string;
  last_name: string;
  employee_email: string;
  contact_number: string | null;
  employee_role: string;
  employee_status: string;
  work_schedule: string;
  created_at: string;
}

export interface CreateCashierInput {
  first_name: string;
  last_name: string;
  employee_email: string;
  contact_number: string | null;
  employee_status: string;
  work_schedule: string;
}