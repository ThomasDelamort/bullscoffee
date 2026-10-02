import { pool } from "../lib/db.ts";
import type { OrderRow } from "../types/order.types.ts";

export const getOrders = async (): Promise<OrderRow[] | void> => {
    const result = await pool.query(`
        SELECT * FROM orders
    `);
    return result.rows;
}
