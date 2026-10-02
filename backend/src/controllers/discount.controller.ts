import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { recordActivity } from "../providers/activity.provider.ts";
import {
  createDiscount,
  deleteDiscount,
  getDiscountById,
  getDiscounts,
  updateDiscount,
} from "../providers/discount.provider.ts";
import type {
  DiscountChanges,
  DiscountEligibility,
  DiscountKind,
} from "../types/discount.types.ts";

const MAX_NAME_LENGTH = 100;

const isKind = (value: unknown): value is DiscountKind =>
  value === "percent" || value === "fixed";

const isEligibility = (value: unknown): value is DiscountEligibility =>
  value === "none" || value === "university_id" || value === "government_id";

const isName = (value: unknown): value is string =>
  typeof value === "string" &&
  value.trim() !== "" &&
  value.trim().length <= MAX_NAME_LENGTH;

const isPositive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

// Fields present in the body, each checked; undefined means "leave alone".
// Answers an error message instead when any of them is invalid.
const parseChanges = (body: any): DiscountChanges | string => {
  const { discount_name, kind, value, eligibility, is_active } = body ?? {};
  if (discount_name !== undefined && !isName(discount_name)) {
    return `discount_name must be 1 to ${MAX_NAME_LENGTH} characters`;
  }
  if (kind !== undefined && !isKind(kind)) {
    return "kind must be percent or fixed";
  }
  if (value !== undefined && !isPositive(value)) {
    return "value must be a number above 0";
  }
  if (eligibility !== undefined && !isEligibility(eligibility)) {
    return "eligibility must be none, university_id or government_id";
  }
  if (is_active !== undefined && typeof is_active !== "boolean") {
    return "is_active must be true or false";
  }
  return {
    discount_name: discount_name?.trim(),
    kind,
    value,
    eligibility,
    is_active,
  };
};

const percentTooHigh = (kind: DiscountKind, value: number | string): boolean =>
  kind === "percent" && Number(value) > 100;

const parseId = (req: Request): number | undefined => {
  const id = Number(req.params["id"]);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

const isUniqueViolation = (error: any) => error?.code === "23505";

export const getDiscountsHandler = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const discounts = await getDiscounts();
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully fetched discounts", data: discounts });
  } catch (error: any) {
    console.error("getDiscountsHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch discounts" });
  }
};

export const createDiscountHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const changes = parseChanges(req.body);
    if (typeof changes === "string") {
      res.status(StatusCodes.BAD_REQUEST).json({ error: changes });
      return;
    }
    const { discount_name, kind, value } = changes;
    if (discount_name === undefined || kind === undefined || value === undefined) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "discount_name, kind and value are required" });
      return;
    }
    if (percentTooHigh(kind, value)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "A percentage discount can't be more than 100%" });
      return;
    }

    const discount = await createDiscount({
      discount_name,
      kind,
      value,
      eligibility: changes.eligibility ?? "none",
      is_active: changes.is_active ?? true,
    });
    recordActivity(req, res, { module: "Menu", action: `Created discount "${discount_name}"` });
    res
      .status(StatusCodes.CREATED)
      .json({ message: "Discount created", data: discount });
  } catch (error: any) {
    if (isUniqueViolation(error)) {
      res
        .status(StatusCodes.CONFLICT)
        .json({ error: "A discount with that name already exists" });
      return;
    }
    console.error("createDiscountHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to create discount" });
  }
};

export const updateDiscountHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const discount_id = parseId(req);
    if (discount_id === undefined) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid discount ID" });
      return;
    }
    const changes = parseChanges(req.body);
    if (typeof changes === "string") {
      res.status(StatusCodes.BAD_REQUEST).json({ error: changes });
      return;
    }

    const current = await getDiscountById(discount_id);
    if (!current) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Discount not found" });
      return;
    }
    // The cap depends on both fields, and the body may change only one.
    if (percentTooHigh(changes.kind ?? current.kind, changes.value ?? current.value)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "A percentage discount can't be more than 100%" });
      return;
    }

    const discount = await updateDiscount(discount_id, changes);
    if (!discount) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Discount not found" });
      return;
    }
    const changed = Object.entries(changes)
      .filter(([, value]) => value !== undefined)
      .map(([field]) => field.replace(/_/g, " "));
    recordActivity(req, res, {
      module: "Menu",
      action: `Changed discount "${current.discount_name}"${changed.length ? ` (${changed.join(", ")})` : ""}`,
    });
    res
      .status(StatusCodes.OK)
      .json({ message: "Discount updated", data: discount });
  } catch (error: any) {
    if (isUniqueViolation(error)) {
      res
        .status(StatusCodes.CONFLICT)
        .json({ error: "A discount with that name already exists" });
      return;
    }
    console.error("updateDiscountHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to update discount" });
  }
};

export const deleteDiscountHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const discount_id = parseId(req);
    if (discount_id === undefined) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid discount ID" });
      return;
    }
    const existing = await getDiscountById(discount_id);
    if (!(await deleteDiscount(discount_id))) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Discount not found" });
      return;
    }
    recordActivity(req, res, {
      module: "Menu",
      action: `Deleted discount "${existing?.discount_name ?? `#${discount_id}`}"`,
    });
    res
      .status(StatusCodes.OK)
      .json({ message: "Discount deleted", data: { discount_id } });
  } catch (error: any) {
    // Foreign key violation: past orders were given this discount.
    if (error?.code === "23503") {
      res.status(StatusCodes.CONFLICT).json({
        error: "This discount has been used on orders, so it can't be deleted. Switch it off instead.",
      });
      return;
    }
    console.error("deleteDiscountHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to delete discount" });
  }
};
