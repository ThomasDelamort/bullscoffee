import { pool } from "../lib/db.ts";
import type { Supplier } from "../types/supplier.types.ts";

export const createSupplier = async (supplier: Supplier): Promise<Supplier | void> => {
    const { 
        supplier_name,
        contact_person, 
        supplier_email, 
        contact_number,
        supplier_address,
        is_active
    } = supplier;

    const query = `
        INSERT INTO suppliers (supplier_name, contact_person, supplier_email, contact_number, supplier_address, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`;
    const values = [
        supplier_name,
        contact_person,
        supplier_email,
        contact_number,
        supplier_address,
        is_active ?? true
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
};

export const getAllSuppliers = async (): Promise<Supplier[]> => {
    const result = await pool.query(`SELECT * FROM suppliers`);
    return result.rows;
}

export const getSupplierById = async (supplier_id: number): Promise<Supplier | void> => {
    const result = await pool.query(`SELECT * FROM suppliers WHERE supplier_id = $1`, [supplier_id]);
    return result.rows[0];
}

export const deleteSupplierById = async (supplier_id: number): Promise<void> => {
    await pool.query(`DELETE FROM suppliers supplier_id = $1`, [supplier_id])
}