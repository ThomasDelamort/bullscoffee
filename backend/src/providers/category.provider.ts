import { pool } from "../lib/db.ts";
import { updateRow } from "../lib/sql.ts";

export interface CategoryRow {
  category_id: number;
  category_name: string;
  image_url: string | null;
}

export interface NewCategory {
  category_name: string;
  image_url: string | null;
}

export type CategoryChanges = Partial<NewCategory>;

const CATEGORY_COLUMNS = ["category_name", "image_url"] as const;

export const getCategories = async (): Promise<CategoryRow[]> => {
  const result = await pool.query(
    `SELECT * FROM categories ORDER BY category_name`,
  );
  return result.rows;
};

export const getCategoryById = async (
  category_id: number,
): Promise<CategoryRow | void> => {
  const result = await pool.query(
    `SELECT * FROM categories WHERE category_id = $1`,
    [category_id],
  );
  return result.rows[0];
};

// CREATE
export const createCategory = async (
  category: NewCategory,
): Promise<CategoryRow | void> => {
  const query = `
      INSERT INTO categories (category_name, image_url)
      VALUES ($1, $2)
      RETURNING *
    `;
  const result = await pool.query(query, [
    category.category_name,
    category.image_url,
  ]);
  return result.rows[0];
};

// UPDATE
export const updateCategory = async (
  category_id: number,
  changes: CategoryChanges,
): Promise<CategoryRow | void> =>
  updateRow<CategoryRow>(
    "categories",
    "category_id",
    category_id,
    CATEGORY_COLUMNS,
    changes,
  );

// DELETE: fails with a foreign key error (23503) while products still use it.
export const deleteCategory = async (category_id: number): Promise<boolean> => {
  const result = await pool.query(
    `DELETE FROM categories WHERE category_id = $1`,
    [category_id],
  );
  return (result.rowCount ?? 0) > 0;
};
