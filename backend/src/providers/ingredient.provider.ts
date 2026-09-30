import { pool } from "../lib/db.ts";
import { updateRow } from "../lib/sql.ts";

export interface IngredientRow {
  ingredient_id: number;
  ingredient_name: string;
  unit_of_measure: string;
  image_url: string | null;
  current_quantity: number;
  minimum_stock_level: number;
  is_active: boolean;
}

export interface NewIngredient {
  ingredient_name: string;
  unit_of_measure: string;
  image_url: string | null;
  current_quantity: number;
  minimum_stock_level: number;
  is_active: boolean;
}

// current_quantity is left out on purpose: stock only changes through
// stock movements and deliveries, so every change has a paper trail.
export type IngredientChanges = Partial<Omit<NewIngredient, "current_quantity">>;

const INGREDIENT_COLUMNS = [
  "ingredient_name",
  "unit_of_measure",
  "image_url",
  "minimum_stock_level",
  "is_active",
] as const;

export const getIngredients = async (): Promise<IngredientRow[]> => {
  const result = await pool.query(
    `SELECT * FROM ingredients ORDER BY ingredient_name`,
  );
  return result.rows;
};

export const getIngredientById = async (
  ingredient_id: number,
): Promise<IngredientRow | void> => {
  const result = await pool.query(
    `SELECT * FROM ingredients WHERE ingredient_id = $1`,
    [ingredient_id],
  );
  return result.rows[0];
};

// CREATE
export const createIngredient = async (
  ingredient: NewIngredient,
): Promise<IngredientRow | void> => {
  const query = `
      INSERT INTO ingredients (ingredient_name, unit_of_measure, image_url, current_quantity, minimum_stock_level, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
  const values = [
    ingredient.ingredient_name,
    ingredient.unit_of_measure,
    ingredient.image_url,
    ingredient.current_quantity,
    ingredient.minimum_stock_level,
    ingredient.is_active,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// UPDATE
export const updateIngredient = async (
  ingredient_id: number,
  changes: IngredientChanges,
): Promise<IngredientRow | void> =>
  updateRow<IngredientRow>(
    "ingredients",
    "ingredient_id",
    ingredient_id,
    INGREDIENT_COLUMNS,
    changes,
  );
