import { pool } from "../lib/db.ts";
import type { Order, Order_Items } from "../types/order.types.ts";

export const getOrders = async (): Promise<Order[] | void> => {
    const result = await pool.query(`
        SELECT * FROM orders
    `);
    return result.rows;
}
