import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from "../providers/category.provider.ts";
import type { CategoryChanges } from "../providers/category.provider.ts";

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

// Multipart requests carry the image as a file: uploadFile leaves its URL on
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

export const getCategoriesHandler = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const categories = await getCategories();
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully fetched categories", data: categories });
  } catch (error: any) {
    console.error("getCategoriesHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch categories" });
  }
};

export const getCategoryByIdHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const category_id = Number(req.params["id"]);
    if (!Number.isInteger(category_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid category ID" });
      return;
    }

    const category = await getCategoryById(category_id);
    if (!category) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Category not found" });
      return;
    }
    res
      .status(StatusCodes.OK)
      .json({ message: "Category found", data: category });
  } catch (error: any) {
    console.error("getCategoryByIdHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch category by ID" });
  }
};

export const createCategoryHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { category_name } = req.body ?? {};
    if (!isText(category_name)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "category_name is required" });
      return;
    }

    const category = await createCategory({
      category_name: category_name.trim(),
      image_url: resolveImageUrl(req, res) ?? null,
    });
    res
      .status(StatusCodes.CREATED)
      .json({ message: "Successfully created category", data: category });
  } catch (error: any) {
    console.error("createCategoryHandler failed:", error);
    if (error?.code === "23505") {
      res
        .status(StatusCodes.CONFLICT)
        .json({ error: "A category with that name already exists" });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to create category" });
  }
};

export const updateCategoryHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const category_id = Number(req.params["id"]);
    if (!Number.isInteger(category_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid category ID" });
      return;
    }

    const { category_name } = req.body ?? {};
    const changes: CategoryChanges = {};
    if (category_name !== undefined) {
      if (!isText(category_name)) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: "category_name must not be empty" });
        return;
      }
      changes.category_name = category_name.trim();
    }
    const image_url = resolveImageUrl(req, res);
    if (image_url !== undefined) changes.image_url = image_url;

    const category = await updateCategory(category_id, changes);
    if (!category) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Category not found" });
      return;
    }
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully updated category", data: category });
  } catch (error: any) {
    console.error("updateCategoryHandler failed:", error);
    if (error?.code === "23505") {
      res
        .status(StatusCodes.CONFLICT)
        .json({ error: "A category with that name already exists" });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to update category" });
  }
};

export const deleteCategoryHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const category_id = Number(req.params["id"]);
    if (!Number.isInteger(category_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid category ID" });
      return;
    }

    const deleted = await deleteCategory(category_id);
    if (!deleted) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Category not found" });
      return;
    }
    res
      .status(StatusCodes.OK)
      .json({ message: "Category deleted successfully" });
  } catch (error: any) {
    console.error("deleteCategoryHandler failed:", error);
    // Foreign key violation: products still belong to this category
    if (error?.code === "23503") {
      res.status(StatusCodes.CONFLICT).json({
        error: "Category still has products - move or delete them first",
      });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to delete category" });
  }
};
