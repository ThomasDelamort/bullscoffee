import { createCustomer, getAllCustomers, getCustomerById, deleteCustomerById } from "../providers/customer.provider.ts";
import type { Request, Response } from "express";
import type { Customer } from "../types/customer.types.ts";
import { StatusCodes } from "http-status-codes";

export async function createCustomerHandler(req: Request, res: Response): Promise<Customer | void> {
    try {
        const customer: Customer = req.body;
        const newCustomer = await createCustomer(customer);
        res.status(StatusCodes.CREATED).json({ message: "Successfully registered customer", data: newCustomer});
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create customer" });
    }
}

export async function getAllCustomersHandler(_req: Request, res: Response): Promise<Customer[] | void> {
    try {
        const customers = await getAllCustomers();
        res.status(StatusCodes.OK).json({ message: "Successfully fetched customers", data: customers});
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch customers" });
    }
}

export async function getCustomerByIdHandler(req: Request, res: Response): Promise<Customer | void> {
    try {
        const customer_id = Number(req.params['id']);
        if (Number.isNaN(customer_id)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid customer ID" });
            return;
        }
        const customer = await getCustomerById(customer_id);
        if (customer) {
            res.status(StatusCodes.OK).json({ message: `Customer found`, data: customer});
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Customer not found" });
        }
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch customer by ID" });
    }
}

export async function deleteCustomerHandler(req: Request, res: Response): Promise<void> {
    try {
        const customer_id = Number(req.params['id']);
        if (Number.isNaN(customer_id)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid customer ID" });
            return;
        }
        await deleteCustomerById(customer_id);
        res.status(StatusCodes.OK).json({ message: "Customer deleted successfully" });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to delete customer" });
    }
}

// place an order function