import { createCustomer, getAllCustomers, getCustomerById, deleteCustomerById } from "../providers/customer.provider.ts";
import type { Request, Response } from "express";
import type { Customer } from "../types/customer.types.ts";

export async function createCustomerHandler(req: Request, res: Response): Promise<Customer | void> {
    try {
        const customer: Customer = req.body;
        const newCustomer = await createCustomer(customer);
        res.status(201).json(newCustomer);
    } catch (error) {
        res.status(500).json({ error: "Failed to create customer" });
    }
}

export async function getAllCustomersHandler(_req: Request, res: Response): Promise<Customer[] | void> {
    try {
        const customers = await getAllCustomers();
        res.status(200).json(customers);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch customers" });
    }
}

export async function getCustomerByIdHandler(req: Request, res: Response): Promise<Customer | void> {
    try {
        const customer_id = Number(req.params['id']);
        if (Number.isNaN(customer_id)) {
            res.status(400).json({ error: "Invalid customer ID" });
            return;
        }
        const customer = await getCustomerById(customer_id);
        if (customer) {
            res.status(200).json(customer);
        } else {
            res.status(404).json({ error: "Customer not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch customer by ID" });
    }
}

export async function deleteCustomerHandler(req: Request, res: Response): Promise<void> {
    try {
        const customer_id = Number(req.params['id']);
        if (Number.isNaN(customer_id)) {
            res.status(400).json({ error: "Invalid customer ID" });
            return;
        }
        await deleteCustomerById(customer_id);
        res.status(200).json({ message: "Customer deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete customer" });
    }
}

// place an order function