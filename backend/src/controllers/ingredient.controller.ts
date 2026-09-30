import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  createIngredient,
  getIngredientById,
  getIngredients,
  updateIngredient,
} from "../providers/ingredient.provider.ts";
import type { IngredientChanges } from "../providers/ingredient.provider.ts";

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

// Multipart bodies arrive as strings, JSON bodies keep their types.
const toNumber = (value: unknown): number | undefined => {
  const number =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number)
    ? number
    : undefined;
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
};

// Multipart requests carry the image as a file: uploadToS3 leaves its URL on
// res.locals.fileUrl. An empty image_url field with no file removes the image.
// undefined means "leave the image alone".
const resolveImageUrl = (
  req: Request,
  res: Response,
): string | null | undefined => {
  const fileUrl = res.locals["fileUrl"];
  if (typeof fileUrl === "string") return fileUrl;

  const image_url = (req.body ?? {}).image_url;
  if (image_url === "" || image_url === null) return null;
  return typeof image_url === "string" ? image_url : undefined;
};

export const getIngredientsHandler = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const ingredients = await getIngredients();
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully fetched ingredients", data: ingredients });
  } catch (error: any) {
    console.error("getIngredientsHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch ingredients" });
  }
};

export const getIngredientByIdHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const ingredient_id = Number(req.params["id"]);
    if (!Number.isInteger(ingredient_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid ingredient ID" });
      return;
    }

    const ingredient = await getIngredientById(ingredient_id);
    if (!ingredient) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Ingredient not found" });
      return;
    }
    res
      .status(StatusCodes.OK)
      .json({ message: "Ingredient found", data: ingredient });
  } catch (error: any) {
    console.error("getIngredientByIdHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch ingredient by ID" });
  }
};

export const createIngredientHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { ingredient_name, unit_of_measure, minimum_stock_level, is_active } =
      req.body ?? {};
    const minimum =
      minimum_stock_level === undefined ? 0 : toNumber(minimum_stock_level);
    const active = is_active === undefined ? true : toBoolean(is_active);

    if (
      !isText(ingredient_name) ||
      !isText(unit_of_measure) ||
      minimum === undefined ||
      minimum < 0 ||
      active === undefined
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error:
          "ingredient_name and unit_of_measure are required, and minimum_stock_level must be 0 or more",
      });
      return;
    }

    const ingredient = await createIngredient({
      ingredient_name: ingredient_name.trim(),
      unit_of_measure: unit_of_measure.trim(),
      image_url: resolveImageUrl(req, res) ?? null,
      // Opening stock is recorded as a stock movement, like every other change.
      current_quantity: 0,
      minimum_stock_level: minimum,
      is_active: active,
    });
    res
      .status(StatusCodes.CREATED)
      .json({ message: "Successfully created ingredient", data: ingredient });
  } catch (error: any) {
    console.error("createIngredientHandler failed:", error);
    if (error?.code === "23505") {
      res
        .status(StatusCodes.CONFLICT)
        .json({ error: "An ingredient with that name already exists" });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to create ingredient" });
  }
};

// current_quantity is not editable here; it only moves through stock movements.
export const updateIngredientHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const ingredient_id = Number(req.params["id"]);
    if (!Number.isInteger(ingredient_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid ingredient ID" });
      return;
    }

    const { ingredient_name, unit_of_measure, minimum_stock_level, is_active } =
      req.body ?? {};
    const changes: IngredientChanges = {};
    const invalid: string[] = [];

    if (ingredient_name !== undefined) {
      if (isText(ingredient_name)) {
        changes.ingredient_name = ingredient_name.trim();
      } else invalid.push("ingredient_name");
    }
    if (unit_of_measure !== undefined) {
      if (isText(unit_of_measure)) {
        changes.unit_of_measure = unit_of_measure.trim();
      } else invalid.push("unit_of_measure");
    }
    if (minimum_stock_level !== undefined) {
      const value = toNumber(minimum_stock_level);
      if (value !== undefined && value >= 0) {
        changes.minimum_stock_level = value;
      } else invalid.push("minimum_stock_level");
    }
    if (is_active !== undefined) {
      const value = toBoolean(is_active);
      if (value !== undefined) changes.is_active = value;
      else invalid.push("is_active");
    }
    const image_url = resolveImageUrl(req, res);
    if (image_url !== undefined) changes.image_url = image_url;

    if (invalid.length > 0) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: `Invalid: ${invalid.join(", ")}` });
      return;
    }

    const ingredient = await updateIngredient(ingredient_id, changes);
    if (!ingredient) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Ingredient not found" });
      return;
    }
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully updated ingredient", data: ingredient });
  } catch (error: any) {
    console.error("updateIngredientHandler failed:", error);
    if (error?.code === "23505") {
      res
        .status(StatusCodes.CONFLICT)
        .json({ error: "An ingredient with that name already exists" });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to update ingredient" });
  }
};
