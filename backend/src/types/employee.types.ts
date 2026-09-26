export interface Employee {
  employee_id?: number;
  clerk_id: string;
  first_name: string;
  last_name: string;
  employee_email: string;
  contact_number: string | null;
  profile_picture: string | null;
  employee_status: string;
  employee_role: string;
  work_schedule: string;
  created_at?: Date;
}
