import { pool } from "../lib/db.ts";
import { withTransaction } from "../lib/sql.ts";
import type { Queryable } from "../lib/sql.ts";
import type { NewOrder, OrderStatus, OrderDetails, OrderFilters, OrderListRow } from "../types/order.types.ts";

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const getOrders = async (
  filters: OrderFilters = {},
): Promise<OrderListRow[]> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  const param = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };

  if (filters.status) {
    conditions.push(`o.order_status = ${param(filters.status)}`);
  }
  if (filters.from) {
    conditions.push(`o.ordered_at >= ${param(filters.from)}::date`);
  }
  if (filters.to) {
    conditions.push(`o.ordered_at < ${param(filters.to)}::date + 1`);
  }
  if (filters.employee_id !== undefined) {
    conditions.push(`o.employee_id = ${param(filters.employee_id)}`);
  }
  if (filters.customer_id !== undefined) {
    conditions.push(`o.customer_id = ${param(filters.customer_id)}`);
  }
  if (filters.search) {
    const pattern = param(`%${filters.search}%`);
    conditions.push(`(
      o.order_id::text ILIKE ${pattern}
      OR (c.first_name || ' ' || c.last_name) ILIKE ${pattern}
      OR (e.first_name || ' ' || e.last_name) ILIKE ${pattern}
    )`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const query = `
      SELECT o.*,
             (c.first_name || ' ' || c.last_name) AS customer_name,
             (e.first_name || ' ' || e.last_name) AS employee_name
      FROM orders o
      LEFT JOIN customers c ON c.customer_id = o.customer_id
      JOIN employees e ON e.employee_id = o.employee_id
      ${where}
      ORDER BY o.ordered_at DESC, o.order_id DESC
    `;
  const result = await pool.query(query, values);
  return result.rows;
};

// An order with its line items and payments. `db` lets createOrder read the
// order back inside its own transaction.
export const getOrderById = async (
  order_id: number,
  db: Queryable = pool,
): Promise<OrderDetails | void> => {
  const orderResult = await db.query(
    `
      SELECT o.*,
             (c.first_name || ' ' || c.last_name) AS customer_name,
             (e.first_name || ' ' || e.last_name) AS employee_name
      FROM orders o
      LEFT JOIN customers c ON c.customer_id = o.customer_id
      JOIN employees e ON e.employee_id = o.employee_id
      WHERE o.order_id = $1
    `,
    [order_id],
  );
  const order = orderResult.rows[0];
  if (!order) return;

  const items = await db.query(
    `
      SELECT oi.*, p.product_name
      FROM order_items oi
      JOIN products p ON p.product_id = oi.product_id
      WHERE oi.order_id = $1
      ORDER BY oi.order_item_id
    `,
    [order_id],
  );
  const paymentRows = await db.query(
    `SELECT * FROM payments WHERE order_id = $1 ORDER BY paid_at, payment_id`,
    [order_id],
  );
  return { ...order, items: items.rows, payments: paymentRows.rows };
};

// Order, items and payment land together or not at all. The total is worked
// out here from the items so the client can't send one that disagrees.
export const createOrder = async (
  order: NewOrder,
): Promise<OrderDetails | void> => {
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.quantity * item.selling_price,
    0,
  );
  const discount = Math.min(round2(order.discount_amount), round2(subtotal));
  const total = round2(subtotal - discount);
  const status: OrderStatus =
    order.order_status ?? (order.payment ? "completed" : "pending");

  return withTransaction(async (client) => {
    const created = await client.query(
      `
        INSERT INTO orders (customer_id, employee_id, discount_amount, total_amount, order_status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING order_id
      `,
      [order.customer_id, order.employee_id, discount, total, status],
    );
    const order_id: number = created.rows[0].order_id;

    await client.query(
      `
        INSERT INTO order_items (order_id, product_id, quantity, size, selling_price, special_instructions)
        SELECT $1, product_id, quantity, size, selling_price, special_instructions
        FROM unnest($2::int[], $3::int[], $4::item_size[], $5::numeric[], $6::text[])
          AS item(product_id, quantity, size, selling_price, special_instructions)
      `,
      [
        order_id,
        order.items.map((item) => item.product_id),
        order.items.map((item) => item.quantity),
        order.items.map((item) => item.size),
        order.items.map((item) => item.selling_price),
        order.items.map((item) => item.special_instructions),
      ],
    );

    if (order.payment) {
      await client.query(
        `
          INSERT INTO payments (order_id, amount_paid, payment_method)
          VALUES ($1, $2, $3)
        `,
        [order_id, order.payment.amount_paid, order.payment.payment_method],
      );
    }

    return getOrderById(order_id, client);
  });
};

// Only a pending order can move on; anything else comes back undefined so the
// controller can answer 404 / 409.
const transitionPendingOrder = async (
  order_id: number,
  status: Exclude<OrderStatus, "pending">,
): Promise<OrderDetails | void> => {
  const result = await pool.query(
    `
      UPDATE orders SET order_status = $1
      WHERE order_id = $2 AND order_status = 'pending'
    `,
    [status, order_id],
  );
  if ((result.rowCount ?? 0) === 0) return;
  return getOrderById(order_id);
};

export const completeOrder = (order_id: number) =>
  transitionPendingOrder(order_id, "completed");

export const cancelOrder = (order_id: number) =>
  transitionPendingOrder(order_id, "cancelled");
