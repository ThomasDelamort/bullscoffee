import { pool } from "../lib/db.ts";
import { updateRow } from "../lib/sql.ts";
import type {
  DiscountChanges,
  DiscountRow,
  NewDiscount,
} from "../types/discount.types.ts";

const DISCOUNT_COLUMNS = [
  "discount_name",
  "kind",
  "value",
  "eligibility",
  "is_active",
] as const;

export const getDiscounts = async (): Promise<DiscountRow[]> => {
  const result = await pool.query(
    `SELECT * FROM discounts ORDER BY discount_name`,
  );
  return result.rows;
};

export const getDiscountById = async (
  discount_id: number,
): Promise<DiscountRow | void> => {
  const result = await pool.query(
    `SELECT * FROM discounts WHERE discount_id = $1`,
    [discount_id],
  );
  return result.rows[0];
};

export const createDiscount = async (
  discount: NewDiscount,
): Promise<DiscountRow> => {
  const result = await pool.query(
    `
      INSERT INTO discounts (discount_name, kind, value, eligibility, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [
      discount.discount_name,
      discount.kind,
      discount.value,
      discount.eligibility,
      discount.is_active,
    ],
  );
  return result.rows[0];
};

export const updateDiscount = (
  discount_id: number,
  changes: DiscountChanges,
): Promise<DiscountRow | undefined> =>
  updateRow<DiscountRow>(
    "discounts",
    "discount_id",
    discount_id,
    DISCOUNT_COLUMNS,
    changes,
  );

/** False when there was no such discount. Throws 23503 when orders use it. */
export const deleteDiscount = async (discount_id: number): Promise<boolean> => {
  const result = await pool.query(
    `DELETE FROM discounts WHERE discount_id = $1`,
    [discount_id],
  );
  return (result.rowCount ?? 0) > 0;
};
