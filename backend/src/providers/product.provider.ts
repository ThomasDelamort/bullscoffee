import { pool } from "../lib/db.ts";
import { updateRow, withTransaction } from "../lib/sql.ts";
import type {
  Product,
  NewProduct,
  ProductChanges,
  RecipeRow,
  RecipeLine,
} from "../types/product.types.ts";

const PRODUCT_COLUMNS = [
  "category_id",
  "product_name",
  "description",
  "image_url",
  "price",
  "is_available",
  "has_sizes",
] as const;

export const getProducts = async (): Promise<Product[] | void> => {
  const result = await pool.query(`SELECT * FROM products`);
  return result.rows;
};

export const getProductsById = async (product_id: number): Promise<Product> => {
  const query = `
      SELECT * FROM products WHERE product_id = $1
    `;
  const result = await pool.query(query, [product_id]);
  return result.rows[0];
};

// CREATE
export const createProduct = async (
  product: NewProduct,
): Promise<Product | void> => {
  const query = `
      INSERT INTO products (category_id, product_name, description, image_url, price, is_available, has_sizes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
  const values = [
    product.category_id,
    product.product_name,
    product.description,
    product.image_url,
    product.price,
    product.is_available,
    product.has_sizes,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// UPDATE
export const updateProduct = async (
  product_id: number,
  changes: ProductChanges,
): Promise<Product | void> =>
  updateRow<Product>(
    "products",
    "product_id",
    product_id,
    PRODUCT_COLUMNS,
    changes,
  );

// DELETE: fails with a foreign key error (23503) once the product has been
// ordered, since order_items keeps pointing at it. Mark it unavailable instead.
export const deleteProduct = async (product_id: number): Promise<boolean> => {
  const result = await pool.query(
    `DELETE FROM products WHERE product_id = $1`,
    [product_id],
  );
  return (result.rowCount ?? 0) > 0;
};

// RECIPE
export const getProductIngredients = async (
  product_id: number,
): Promise<RecipeRow[]> => {
  const query = `
      SELECT pi.product_id, pi.ingredient_id, pi.quantity_required,
             i.ingredient_name, i.unit_of_measure
      FROM product_ingredients pi
      JOIN ingredients i ON i.ingredient_id = pi.ingredient_id
      WHERE pi.product_id = $1
      ORDER BY i.ingredient_name
    `;
  const result = await pool.query(query, [product_id]);
  return result.rows;
};

// Replaces the whole recipe atomically. An empty list clears it.
export const replaceProductIngredients = async (
  product_id: number,
  lines: RecipeLine[],
): Promise<RecipeRow[]> => {
  await withTransaction(async (client) => {
    await client.query(
      `DELETE FROM product_ingredients WHERE product_id = $1`,
      [product_id],
    );
    if (lines.length === 0) return;
    await client.query(
      `
        INSERT INTO product_ingredients (product_id, ingredient_id, quantity_required)
        SELECT $1, ingredient_id, quantity_required
        FROM unnest($2::int[], $3::numeric[]) AS line(ingredient_id, quantity_required)
      `,
      [
        product_id,
        lines.map((line) => line.ingredient_id),
        lines.map((line) => line.quantity_required),
      ],
    );
  });
  return getProductIngredients(product_id);
};
