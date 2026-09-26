import { createContext, useContext } from "react";

export interface Customer {
  customer_id: number;
  clerk_id: string;
  first_name: string;
  last_name: string;
  customer_email: string;
  university_id: string | null;
  contact_number: string | null;
  profile_picture: string | null;
}

export interface CustomerNames {
  first_name: string;
  last_name: string;
}

export type RegistrationState =
  | { status: "idle" }
  | { status: "registering" }
  | { status: "needs-name" }
  | { status: "registered"; customer: Customer; isNew: boolean }
  | { status: "error"; message: string };

interface CustomerContextValue {
  state: RegistrationState;
  register: (names?: CustomerNames) => Promise<void>;
}

export const CustomerContext = createContext<CustomerContextValue | null>(null);

export function useCustomer(): CustomerContextValue {
  const value = useContext(CustomerContext);
  if (!value) throw new Error("useCustomer must be used inside <CustomerProvider>");
  return value;
}
