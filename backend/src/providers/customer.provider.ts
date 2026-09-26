import { pool } from "../lib/db.ts";
import type { Customer } from "../types/customer.types.ts";

export async function createCustomer(
  customer: Customer,
): Promise<Customer | void> {
  const query = `
        INSERT INTO customers (clerk_id, first_name, last_name, university_id, customer_email, contact_number, profile_picture)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `;
  const values = [
    customer.clerk_id,
    customer.first_name,
    customer.last_name,
    customer.university_id,
    customer.customer_email,
    customer.contact_number,
    customer.profile_picture,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function getAllCustomers(): Promise<Customer[] | void> {
  const query = `
        SELECT * FROM customers
    `;
  const result = await pool.query(query);
  return result.rows;
}

export async function getCustomerById(
  customer_id: number,
): Promise<Customer | void> {
  const query = `
        SELECT * FROM customers WHERE customer_id = $1
    `;
  const values = [customer_id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function getCustomerByClerkId(
  clerk_id: string,
): Promise<Customer | void> {
  const query = `
        SELECT * FROM customers WHERE clerk_id = $1
    `;
  const values = [clerk_id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

// DELETE
export async function deleteCustomerById(customer_id: number): Promise<void> {
  const query = `
        DELETE FROM customers WHERE customer_id = $1
    `;
  const values = [customer_id];
  await pool.query(query, values);
}
