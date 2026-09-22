import { createCustomer, getAllCustomers, getCustomerById, deleteCustomer } from "../providers/customer.provider.ts";
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

export async function getAllCustomersHandler(req: Request, res: Response): Promise<Customer[] | void> {
    try {
        const customers = await getAllCustomers();
        res.status(200).json(customers);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch customers" });
    }
}

export async function getCustomerByIdHandler(req: Request, res: Response): Promise<Customer | void> {
    try {
        const customer_id = req.params.id;
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
        const customer_id: number = parseInt(req.params.id);
        await deleteCustomer(customer_id);
        res.status(200).json({ message: "Customer deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete customer" });
    }
}