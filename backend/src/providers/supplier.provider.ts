import { pool } from "../lib/db.ts";
import { updateRow, withTransaction } from "../lib/sql.ts";
import type {
  SupplierPriceRow,
  NewSupplier,
  SupplierChanges,
  SupplierRow,
  SupplierPrice,
} from "../types/supplier.types.ts";

const SUPPLIER_COLUMNS = [
  "supplier_name",
  "contact_person",
  "supplier_email",
  "contact_number",
  "image_url",
  "supplier_address",
  "is_active",
] as const;

export const getSuppliers = async (): Promise<SupplierRow[]> => {
  const result = await pool.query(
    `SELECT * FROM suppliers ORDER BY supplier_name`,
  );
  return result.rows;
};

export const getSupplierById = async (
  supplier_id: number,
): Promise<SupplierRow | void> => {
  const result = await pool.query(
    `SELECT * FROM suppliers WHERE supplier_id = $1`,
    [supplier_id],
  );
  return result.rows[0];
};

// CREATE
export const createSupplier = async (
  supplier: NewSupplier,
): Promise<SupplierRow | void> => {
  const query = `
      INSERT INTO suppliers (supplier_name, contact_person, supplier_email, contact_number, image_url, supplier_address, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
  const values = [
    supplier.supplier_name,
    supplier.contact_person,
    supplier.supplier_email,
    supplier.contact_number,
    supplier.image_url,
    supplier.supplier_address,
    supplier.is_active,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// UPDATE
export const updateSupplier = async (
  supplier_id: number,
  changes: SupplierChanges,
): Promise<SupplierRow | void> =>
  updateRow<SupplierRow>(
    "suppliers",
    "supplier_id",
    supplier_id,
    SUPPLIER_COLUMNS,
    changes,
  );

// PRICE LIST
export const getSupplierIngredients = async (
  supplier_id: number,
): Promise<SupplierPriceRow[]> => {
  const query = `
      SELECT si.supplier_id, si.ingredient_id, si.unit_price,
             i.ingredient_name, i.unit_of_measure
      FROM supplier_ingredients si
      JOIN ingredients i ON i.ingredient_id = si.ingredient_id
      WHERE si.supplier_id = $1
      ORDER BY i.ingredient_name
    `;
  const result = await pool.query(query, [supplier_id]);
  return result.rows;
};

// Replaces the whole price list atomically. An empty list clears it.
export const replaceSupplierIngredients = async (
  supplier_id: number,
  prices: SupplierPrice[],
): Promise<SupplierPriceRow[]> => {
  await withTransaction(async (client) => {
    await client.query(
      `DELETE FROM supplier_ingredients WHERE supplier_id = $1`,
      [supplier_id],
    );
    if (prices.length === 0) return;
    await client.query(
      `
        INSERT INTO supplier_ingredients (supplier_id, ingredient_id, unit_price)
        SELECT $1, ingredient_id, unit_price
        FROM unnest($2::int[], $3::numeric[]) AS price(ingredient_id, unit_price)
      `,
      [
        supplier_id,
        prices.map((price) => price.ingredient_id),
        prices.map((price) => price.unit_price),
      ],
    );
  });
  return getSupplierIngredients(supplier_id);
};
