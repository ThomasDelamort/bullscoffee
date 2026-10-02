import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  createSupplier,
  getSupplierById,
  getSupplierIngredients,
  getSuppliers,
  replaceSupplierIngredients,
  updateSupplier,
} from "../providers/supplier.provider.ts";
import type {
  SupplierChanges,
  SupplierPrice,
} from "../types/supplier.types.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

const isOptionalText = (value: unknown): value is string | null | undefined =>
  value === undefined || value === null || typeof value === "string";

const toBoolean = (value: unknown): boolean | undefined => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
};

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

// A price list is unique per ingredient: the provider inserts one row each.
const parsePrices = (prices: unknown): SupplierPrice[] | undefined => {
  if (!Array.isArray(prices)) return undefined;

  const seen = new Set<number>();
  const parsed: SupplierPrice[] = [];
  for (const price of prices) {
    const { ingredient_id, unit_price } = price ?? {};
    if (
      !Number.isInteger(ingredient_id) ||
      seen.has(ingredient_id) ||
      typeof unit_price !== "number" ||
      !Number.isFinite(unit_price) ||
      unit_price < 0
    ) {
      return undefined;
    }
    seen.add(ingredient_id);
    parsed.push({ ingredient_id, unit_price });
  }
  return parsed;
};

export const getSuppliersHandler = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const suppliers = await getSuppliers();
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully fetched suppliers", data: suppliers });
  } catch (error: any) {
    console.error("getSuppliersHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch suppliers" });
  }
};

export const getSupplierByIdHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const supplier_id = Number(req.params["id"]);
    if (!Number.isInteger(supplier_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid supplier ID" });
      return;
    }

    const supplier = await getSupplierById(supplier_id);
    if (!supplier) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Supplier not found" });
      return;
    }
    res
      .status(StatusCodes.OK)
      .json({ message: "Supplier found", data: supplier });
  } catch (error: any) {
    console.error("getSupplierByIdHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch supplier by ID" });
  }
};

export const createSupplierHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      supplier_name,
      contact_person,
      supplier_email,
      contact_number,
      supplier_address,
      is_active,
    } = req.body ?? {};
    const active = is_active === undefined ? true : toBoolean(is_active);

    if (
      !isText(supplier_name) ||
      !isText(supplier_email) ||
      !EMAIL.test(supplier_email.trim()) ||
      !isOptionalText(contact_person) ||
      !isOptionalText(contact_number) ||
      !isOptionalText(supplier_address) ||
      active === undefined
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: "supplier_name and a valid supplier_email are required",
      });
      return;
    }

    const supplier = await createSupplier({
      supplier_name: supplier_name.trim(),
      contact_person: contact_person?.trim() || null,
      supplier_email: supplier_email.trim(),
      contact_number: contact_number?.trim() || null,
      image_url: resolveImageUrl(req, res) ?? null,
      supplier_address: supplier_address?.trim() || null,
      is_active: active,
    });
    res
      .status(StatusCodes.CREATED)
      .json({ message: "Successfully created supplier", data: supplier });
  } catch (error: any) {
    console.error("createSupplierHandler failed:", error);
    if (error?.code === "23505") {
      res
        .status(StatusCodes.CONFLICT)
        .json({ error: "A supplier with that name already exists" });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to create supplier" });
  }
};

export const updateSupplierHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const supplier_id = Number(req.params["id"]);
    if (!Number.isInteger(supplier_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid supplier ID" });
      return;
    }

    const {
      supplier_name,
      contact_person,
      supplier_email,
      contact_number,
      supplier_address,
      is_active,
    } = req.body ?? {};
    const changes: SupplierChanges = {};
    const invalid: string[] = [];

    if (supplier_name !== undefined) {
      if (isText(supplier_name)) changes.supplier_name = supplier_name.trim();
      else invalid.push("supplier_name");
    }
    if (contact_person !== undefined) {
      if (isOptionalText(contact_person)) {
        changes.contact_person = contact_person?.trim() || null;
      } else invalid.push("contact_person");
    }
    if (supplier_email !== undefined) {
      if (isText(supplier_email) && EMAIL.test(supplier_email.trim())) {
        changes.supplier_email = supplier_email.trim();
      } else invalid.push("supplier_email");
    }
    if (contact_number !== undefined) {
      if (isOptionalText(contact_number)) {
        changes.contact_number = contact_number?.trim() || null;
      } else invalid.push("contact_number");
    }
    if (supplier_address !== undefined) {
      if (isOptionalText(supplier_address)) {
        changes.supplier_address = supplier_address?.trim() || null;
      } else invalid.push("supplier_address");
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

    const supplier = await updateSupplier(supplier_id, changes);
    if (!supplier) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Supplier not found" });
      return;
    }
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully updated supplier", data: supplier });
  } catch (error: any) {
    console.error("updateSupplierHandler failed:", error);
    if (error?.code === "23505") {
      res
        .status(StatusCodes.CONFLICT)
        .json({ error: "A supplier with that name already exists" });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to update supplier" });
  }
};

// PRICE LIST
export const getSupplierIngredientsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const supplier_id = Number(req.params["id"]);
    if (!Number.isInteger(supplier_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid supplier ID" });
      return;
    }

    const supplier = await getSupplierById(supplier_id);
    if (!supplier) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Supplier not found" });
      return;
    }

    const prices = await getSupplierIngredients(supplier_id);
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully fetched price list", data: prices });
  } catch (error: any) {
    console.error("getSupplierIngredientsHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch price list" });
  }
};

// Body: { ingredients: [{ ingredient_id, unit_price }] }. An empty list
// clears the price list.
export const replaceSupplierIngredientsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const supplier_id = Number(req.params["id"]);
    if (!Number.isInteger(supplier_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid supplier ID" });
      return;
    }

    const prices = parsePrices((req.body ?? {}).ingredients);
    if (!prices) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error:
          "ingredients must be a list of unique ingredients, each with a unit_price of 0 or more",
      });
      return;
    }

    const supplier = await getSupplierById(supplier_id);
    if (!supplier) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Supplier not found" });
      return;
    }

    const updated = await replaceSupplierIngredients(supplier_id, prices);
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully updated price list", data: updated });
  } catch (error: any) {
    console.error("replaceSupplierIngredientsHandler failed:", error);
    // Foreign key violation: an ingredient in the list doesn't exist
    if (error?.code === "23503") {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "One or more ingredients do not exist" });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to update price list" });
  }
};
