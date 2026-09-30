import { StatusCodes } from "http-status-codes";
import {
  createProduct,
  deleteProduct,
  getProductIngredients,
  getProducts,
  getProductsById,
  replaceProductIngredients,
  updateProduct,
} from "../providers/product.provider.ts";
import type { Request, Response } from "express";
import type {
  Product,
  ProductChanges,
  RecipeLine,
} from "../types/product.types.ts";

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

const isOptionalText = (value: unknown): value is string | null | undefined =>
  value === undefined || value === null || typeof value === "string";

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

// A recipe is unique per ingredient (the provider inserts one row each).
const parseRecipe = (lines: unknown): RecipeLine[] | undefined => {
  if (!Array.isArray(lines)) return undefined;

  const seen = new Set<number>();
  const parsed: RecipeLine[] = [];
  for (const line of lines) {
    const { ingredient_id, quantity_required } = line ?? {};
    if (
      !Number.isInteger(ingredient_id) ||
      seen.has(ingredient_id) ||
      typeof quantity_required !== "number" ||
      !Number.isFinite(quantity_required) ||
      quantity_required <= 0
    ) {
      return undefined;
    }
    seen.add(ingredient_id);
    parsed.push({ ingredient_id, quantity_required });
  }
  return parsed;
};

export const getProductsHandler = async (
  _req: Request,
  res: Response,
): Promise<Product[] | void> => {
  try {
    const products = await getProducts();

    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully returned products", data: products });
  } catch (err: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Failed to fetch products" });
  }
};

export const getProductByIdHandler = async (
  req: Request,
  res: Response,
): Promise<Product | void> => {
  try {
    const product_id = Number(req.params["id"]);
    if (Number.isNaN(product_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid customer ID" });
      return;
    }

    const product = await getProductsById(product_id);

    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully fetched product", data: product });
  } catch (err: any) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Server failed to fetch product" });
  }
};

export const createProductHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { category_id, product_name, description, price, is_available } =
      req.body ?? {};
    const category = toNumber(category_id);
    const amount = toNumber(price);
    const available = is_available === undefined ? true : toBoolean(is_available);

    if (
      category === undefined ||
      !Number.isInteger(category) ||
      category < 1 ||
      !isText(product_name) ||
      !isOptionalText(description) ||
      amount === undefined ||
      amount < 0 ||
      available === undefined
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error:
          "category_id, product_name and a price of 0 or more are required",
      });
      return;
    }

    const product = await createProduct({
      category_id: category,
      product_name: product_name.trim(),
      description: description?.trim() || null,
      image_url: resolveImageUrl(req, res) ?? null,
      price: amount,
      is_available: available,
    });
    res
      .status(StatusCodes.CREATED)
      .json({ message: "Successfully created product", data: product });
  } catch (error: any) {
    console.error("createProductHandler failed:", error);
    if (error?.code === "23505") {
      res
        .status(StatusCodes.CONFLICT)
        .json({ error: "A product with that name already exists" });
      return;
    }
    // Foreign key violation: the category doesn't exist
    if (error?.code === "23503") {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "Unknown category" });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to create product" });
  }
};

export const updateProductHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const product_id = Number(req.params["id"]);
    if (!Number.isInteger(product_id)) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid product ID" });
      return;
    }

    const { category_id, product_name, description, price, is_available } =
      req.body ?? {};
    const changes: ProductChanges = {};
    const invalid: string[] = [];

    if (category_id !== undefined) {
      const value = toNumber(category_id);
      if (value !== undefined && Number.isInteger(value) && value > 0) {
        changes.category_id = value;
      } else invalid.push("category_id");
    }
    if (product_name !== undefined) {
      if (isText(product_name)) changes.product_name = product_name.trim();
      else invalid.push("product_name");
    }
    if (description !== undefined) {
      if (isOptionalText(description)) {
        changes.description = description?.trim() || null;
      } else invalid.push("description");
    }
    if (price !== undefined) {
      const value = toNumber(price);
      if (value !== undefined && value >= 0) changes.price = value;
      else invalid.push("price");
    }
    if (is_available !== undefined) {
      const value = toBoolean(is_available);
      if (value !== undefined) changes.is_available = value;
      else invalid.push("is_available");
    }
    const image_url = resolveImageUrl(req, res);
    if (image_url !== undefined) changes.image_url = image_url;

    if (invalid.length > 0) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: `Invalid: ${invalid.join(", ")}` });
      return;
    }

    const product = await updateProduct(product_id, changes);
    if (!product) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Product not found" });
      return;
    }
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully updated product", data: product });
  } catch (error: any) {
    console.error("updateProductHandler failed:", error);
    if (error?.code === "23505") {
      res
        .status(StatusCodes.CONFLICT)
        .json({ error: "A product with that name already exists" });
      return;
    }
    if (error?.code === "23503") {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "Unknown category" });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to update product" });
  }
};

export const deleteProductHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const product_id = Number(req.params["id"]);
    if (!Number.isInteger(product_id)) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid product ID" });
      return;
    }

    const deleted = await deleteProduct(product_id);
    if (!deleted) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Product not found" });
      return;
    }
    res.status(StatusCodes.OK).json({ message: "Product deleted successfully" });
  } catch (error: any) {
    console.error("deleteProductHandler failed:", error);
    // Foreign key violation: the product has already been ordered
    if (error?.code === "23503") {
      res.status(StatusCodes.CONFLICT).json({
        error:
          "Product has been ordered and can't be deleted - mark it unavailable instead",
      });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to delete product" });
  }
};

// RECIPE
export const getProductIngredientsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const product_id = Number(req.params["id"]);
    if (!Number.isInteger(product_id)) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid product ID" });
      return;
    }

    const product = await getProductsById(product_id);
    if (!product) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Product not found" });
      return;
    }

    const recipe = await getProductIngredients(product_id);
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully fetched recipe", data: recipe });
  } catch (error: any) {
    console.error("getProductIngredientsHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch recipe" });
  }
};

// Body: { ingredients: [{ ingredient_id, quantity_required }] }. An empty list
// clears the recipe.
export const replaceProductIngredientsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const product_id = Number(req.params["id"]);
    if (!Number.isInteger(product_id)) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid product ID" });
      return;
    }

    const lines = parseRecipe((req.body ?? {}).ingredients);
    if (!lines) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error:
          "ingredients must be a list of unique ingredients, each with a quantity_required above 0",
      });
      return;
    }

    const product = await getProductsById(product_id);
    if (!product) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Product not found" });
      return;
    }

    const recipe = await replaceProductIngredients(product_id, lines);
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully updated recipe", data: recipe });
  } catch (error: any) {
    console.error("replaceProductIngredientsHandler failed:", error);
    // Foreign key violation: an ingredient in the list doesn't exist
    if (error?.code === "23503") {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "One or more ingredients do not exist" });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to update recipe" });
  }
};
