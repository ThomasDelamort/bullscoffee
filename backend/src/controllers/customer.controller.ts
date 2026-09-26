import {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  getCustomerByClerkId,
  deleteCustomerById,
} from "../providers/customer.provider.ts";
import type { Request, Response } from "express";
import { clerkClient } from "@clerk/express";
import type { Customer } from "../types/customer.types.ts";
import { StatusCodes } from "http-status-codes";

// Called by the frontend right after a customer signs in with Microsoft via Clerk.
// Identity (clerk_id, name, email) comes from Clerk, not the request body.
export async function createCustomerHandler(
  req: Request,
  res: Response,
): Promise<Customer | void> {
  try {
    const clerk_id: string = res.locals["clerkId"];

    const existingCustomer = await getCustomerByClerkId(clerk_id);
    if (existingCustomer) {
      res
        .status(StatusCodes.OK)
        .json({ message: "Customer already registered", data: existingCustomer });
      return;
    }

    const clerkUser = await clerkClient.users.getUser(clerk_id);
    const body = req.body ?? {};

    const customer: Customer = {
      clerk_id,
      first_name: clerkUser.firstName ?? body.first_name,
      last_name: clerkUser.lastName ?? body.last_name,
      customer_email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
      university_id: body.university_id ?? null,
      contact_number: body.contact_number ?? null,
      profile_picture: body.profile_picture ?? null,
    };

    if (!customer.first_name || !customer.last_name || !customer.customer_email) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "First name, last name and email are required" });
      return;
    }

    const newCustomer = await createCustomer(customer);
    res
      .status(StatusCodes.CREATED)
      .json({ message: "Successfully registered customer", data: newCustomer });
  } catch (error: any) {
    // Postgres unique_violation, e.g. email or university_id already in use
    if (error?.code === "23505") {
      res
        .status(StatusCodes.CONFLICT)
        .json({ error: "A customer with that email or university ID already exists" });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to create customer" });
  }
}

export async function getAllCustomersHandler(
  _req: Request,
  res: Response,
): Promise<Customer[] | void> {
  try {
    const customers = await getAllCustomers();
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully fetched customers", data: customers });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch customers" });
  }
}

export async function getCustomerByIdHandler(
  req: Request,
  res: Response,
): Promise<Customer | void> {
  try {
    const customer_id = Number(req.params["id"]);
    if (Number.isNaN(customer_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid customer ID" });
      return;
    }
    const customer = await getCustomerById(customer_id);
    if (customer) {
      res
        .status(StatusCodes.OK)
        .json({ message: `Customer found`, data: customer });
    } else {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Customer not found" });
    }
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch customer by ID" });
  }
}

export async function deleteCustomerHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const customer_id = Number(req.params["id"]);
    if (Number.isNaN(customer_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid customer ID" });
      return;
    }
    await deleteCustomerById(customer_id);
    res
      .status(StatusCodes.OK)
      .json({ message: "Customer deleted successfully" });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to delete customer" });
  }
}

// place an order function
