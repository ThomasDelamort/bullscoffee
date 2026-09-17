export interface Manager {
  employee_id: number;
  first_name: string;
  last_name: string;
  employee_email: string;
  contact_number: string | null;
  employee_status: string;
  created_at: string;
}

export interface CreateManagerInput {
  first_name: string;
  last_name: string;
  employee_email: string;
  contact_number: string;
  employee_status: string;
}
