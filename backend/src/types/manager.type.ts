export interface Manager {
  manager_id: number;
  first_name: string;
  last_name: string;
  manager_email: string;
  contact_number: string;
  manager_status: string;
  created_at: string;
}

export interface CreateManagerInput {
  first_name: string;
  last_name: string;
  manager_email: string;
  contact_number: string;
  manager_status: string;
}
