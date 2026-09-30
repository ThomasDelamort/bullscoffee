import { pool } from "../lib/db.ts";
import { withTransaction } from "../lib/sql.ts";
import type { Queryable } from "../lib/sql.ts";
import type {
  DeliveryFilters,
  DeliveryRow,
  DeliveryDetails,
  NewDelivery,
} from "../types/delivery.types.ts";

const SELECT_DELIVERIES = `
    SELECT d.*, s.supplier_name,
           (e.first_name || ' ' || e.last_name) AS employee_name,
           COUNT(di.ingredient_id)::int AS item_count,
           COALESCE(SUM(di.quantity_received * di.unit_cost), 0)::float8 AS total_cost
    FROM deliveries d
    JOIN suppliers s ON s.supplier_id = d.supplier_id
    JOIN employees e ON e.employee_id = d.employee_id
    LEFT JOIN delivery_items di ON di.delivery_id = d.delivery_id
`;

const GROUP_DELIVERIES = `GROUP BY d.delivery_id, s.supplier_name, e.first_name, e.last_name`;

export const getDeliveries = async (
  filters: DeliveryFilters = {},
): Promise<DeliveryRow[]> => {
  const values: unknown[] = [];
  let where = "";
  if (filters.supplier_id !== undefined) {
    values.push(filters.supplier_id);
    where = `WHERE d.supplier_id = $1`;
  }
  const result = await pool.query(
    `${SELECT_DELIVERIES} ${where} ${GROUP_DELIVERIES}
     ORDER BY d.delivery_date DESC, d.delivery_id DESC`,
    values,
  );
  return result.rows;
};

// A delivery with its items. `db` lets createDelivery read the delivery back
// inside its own transaction.
export const getDeliveryById = async (
  delivery_id: number,
  db: Queryable = pool,
): Promise<DeliveryDetails | void> => {
  const deliveryResult = await db.query(
    `${SELECT_DELIVERIES} WHERE d.delivery_id = $1 ${GROUP_DELIVERIES}`,
    [delivery_id],
  );
  const delivery = deliveryResult.rows[0];
  if (!delivery) return;

  const items = await db.query(
    `
      SELECT di.*, i.ingredient_name, i.unit_of_measure
      FROM delivery_items di
      JOIN ingredients i ON i.ingredient_id = di.ingredient_id
      WHERE di.delivery_id = $1
      ORDER BY i.ingredient_name
    `,
    [delivery_id],
  );
  return { ...delivery, items: items.rows };
};

// Records the delivery, adds every item to stock and logs a 'delivery' stock
// movement per item, all in one transaction.
export const createDelivery = async (
  delivery: NewDelivery,
): Promise<DeliveryDetails | void> =>
  withTransaction(async (client) => {
    const created = await client.query(
      `
        INSERT INTO deliveries (supplier_id, employee_id, delivery_date)
        VALUES ($1, $2, $3)
        RETURNING delivery_id
      `,
      [delivery.supplier_id, delivery.employee_id, delivery.delivery_date],
    );
    const delivery_id: number = created.rows[0].delivery_id;

    const ingredientIds = delivery.items.map((item) => item.ingredient_id);
    const quantities = delivery.items.map((item) => item.quantity_received);

    await client.query(
      `
        INSERT INTO delivery_items (delivery_id, ingredient_id, quantity_received, unit_cost)
        SELECT $1, ingredient_id, quantity_received, unit_cost
        FROM unnest($2::int[], $3::numeric[], $4::numeric[])
          AS item(ingredient_id, quantity_received, unit_cost)
      `,
      [
        delivery_id,
        ingredientIds,
        quantities,
        delivery.items.map((item) => item.unit_cost),
      ],
    );

    await client.query(
      `
        UPDATE ingredients i
        SET current_quantity = i.current_quantity + item.quantity_received
        FROM unnest($1::int[], $2::numeric[]) AS item(ingredient_id, quantity_received)
        WHERE i.ingredient_id = item.ingredient_id
      `,
      [ingredientIds, quantities],
    );

    await client.query(
      `
        INSERT INTO stock_movements (ingredient_id, employee_id, quantity_change, reason)
        SELECT ingredient_id, $2, quantity_received, 'delivery'
        FROM delivery_items
        WHERE delivery_id = $1
      `,
      [delivery_id, delivery.employee_id],
    );

    return getDeliveryById(delivery_id, client);
  });
