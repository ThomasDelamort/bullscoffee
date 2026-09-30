import { pool } from "../lib/db.ts";
import { withTransaction } from "../lib/sql.ts";

export type StockMovementReason = "delivery" | "sale" | "waste" | "adjustment";

export interface StockMovementFilters {
  reason?: StockMovementReason | undefined;
  ingredient_id?: number | undefined;
}

export interface NewStockMovement {
  ingredient_id: number;
  employee_id: number;
  /** Positive adds stock, negative removes it. Never zero. */
  quantity_change: number;
  reason: StockMovementReason;
}

export interface StockMovementRow {
  movement_id: number;
  ingredient_id: number;
  employee_id: number;
  quantity_change: number;
  reason: StockMovementReason;
  moved_at: Date;
  ingredient_name: string;
  unit_of_measure: string;
  employee_name: string;
}

const SELECT_MOVEMENTS = `
    SELECT sm.*, i.ingredient_name, i.unit_of_measure,
           (e.first_name || ' ' || e.last_name) AS employee_name
    FROM stock_movements sm
    JOIN ingredients i ON i.ingredient_id = sm.ingredient_id
    JOIN employees e ON e.employee_id = sm.employee_id
`;

export const getStockMovements = async (
  filters: StockMovementFilters = {},
): Promise<StockMovementRow[]> => {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.reason) {
    values.push(filters.reason);
    conditions.push(`sm.reason = $${values.length}`);
  }
  if (filters.ingredient_id !== undefined) {
    values.push(filters.ingredient_id);
    conditions.push(`sm.ingredient_id = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `${SELECT_MOVEMENTS} ${where} ORDER BY sm.moved_at DESC, sm.movement_id DESC`,
    values,
  );
  return result.rows;
};

// Logs the movement and applies it to the ingredient's stock in one
// transaction. Removing more than is in stock trips the current_quantity >= 0
// check (23514) and rolls everything back. Returns undefined if the ingredient
// doesn't exist.
export const createStockMovement = async (
  movement: NewStockMovement,
): Promise<StockMovementRow | void> =>
  withTransaction(async (client) => {
    const stock = await client.query(
      `
        UPDATE ingredients
        SET current_quantity = current_quantity + $1
        WHERE ingredient_id = $2
      `,
      [movement.quantity_change, movement.ingredient_id],
    );
    if ((stock.rowCount ?? 0) === 0) return;

    const inserted = await client.query(
      `
        INSERT INTO stock_movements (ingredient_id, employee_id, quantity_change, reason)
        VALUES ($1, $2, $3, $4)
        RETURNING movement_id
      `,
      [
        movement.ingredient_id,
        movement.employee_id,
        movement.quantity_change,
        movement.reason,
      ],
    );
    const result = await client.query(
      `${SELECT_MOVEMENTS} WHERE sm.movement_id = $1`,
      [inserted.rows[0].movement_id],
    );
    return result.rows[0];
  });
