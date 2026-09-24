import { createSupplier, deleteSupplierById, getAllSuppliers, getSupplierById } from "../providers/supplier.provider.ts";
import type { Request, Response } from "express";
import type { Supplier } from "../types/supplier.types.ts";
import { StatusCodes } from "http-status-codes";

export const createSupplierHandler = async (req: Request, res: Response): Promise<Supplier | void> => {
    try {
        const supplier = await createSupplier(req.body);
        res.status(StatusCodes.CREATED).json({ message: "Successfully created supplier", data: supplier });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create supplier" });
    }
};

export const getAllSuppliersHandler = async (_req: Request, res: Response): Promise<Supplier[] | void> => {
    try {
        const suppliers = await getAllSuppliers();
        res.status(StatusCodes.OK).json({ message: "Successfully returned suppliers", data: suppliers});
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch suppliers" });
    }
};

export const getSupplierByIdHandler = async (req: Request, res: Response): Promise<Supplier | void> => {
    try {
        const supplier_id = Number(req.params[`id`]);
        if (Number.isNaN(supplier_id)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid supplier ID'});
            return;
        }
        const supplier = await getSupplierById(supplier_id);
        supplier ? res.status(StatusCodes.OK).json(supplier) : res.status(400).json({ error: 'Supplier not found' });
    } catch (error) {
        console.log('Error in fetching supplier by ID:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error'});
    }
}

export const deleteSupplierByIdHandler = async (req: Request, res: Response): Promise<Supplier | void> => {
    try {
        const supplier_id = Number(req.params['id']);
        if (Number.isNaN(supplier_id)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid Supplier ID'});
            return;
        }
        await deleteSupplierById(supplier_id);
        res.status(StatusCodes.OK).json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    }
}