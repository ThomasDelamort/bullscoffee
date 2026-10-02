import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  createDelivery,
  getDeliveries,
  getDeliveryById,
} from "../providers/delivery.provider.ts";
import type { NewDeliveryItem } from "../types/delivery.types.ts";
import { getEmployeeByClerkId } from "../providers/employee.provider.ts";

const isDate = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

// One row per ingredient: the provider inserts them as (delivery, ingredient)
// pairs and adds each to stock once.
const parseItems = (items: unknown): NewDeliveryItem[] | undefined => {
  if (!Array.isArray(items) || items.length === 0) return undefined;

  const seen = new Set<number>();
  const parsed: NewDeliveryItem[] = [];
  for (const item of items) {
    const { ingredient_id, quantity_received, unit_cost } = item ?? {};
    if (
      !Number.isInteger(ingredient_id) ||
      seen.has(ingredient_id) ||
      typeof quantity_received !== "number" ||
      !Number.isFinite(quantity_received) ||
      quantity_received <= 0 ||
      typeof unit_cost !== "number" ||
      !Number.isFinite(unit_cost) ||
      unit_cost < 0
    ) {
      return undefined;
    }
    seen.add(ingredient_id);
    parsed.push({ ingredient_id, quantity_received, unit_cost });
  }
  return parsed;
};

export const getDeliveriesHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const supplier = req.query["supplier_id"];
    const supplier_id =
      typeof supplier === "string" && supplier.trim() !== ""
        ? Number(supplier)
        : undefined;
    if (supplier_id !== undefined && !Number.isInteger(supplier_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid supplier ID" });
      return;
    }

    const deliveries = await getDeliveries({ supplier_id });
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully fetched deliveries", data: deliveries });
  } catch (error: any) {
    console.error("getDeliveriesHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch deliveries" });
  }
};

export const getDeliveryByIdHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const delivery_id = Number(req.params["id"]);
    if (!Number.isInteger(delivery_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid delivery ID" });
      return;
    }

    const delivery = await getDeliveryById(delivery_id);
    if (!delivery) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Delivery not found" });
      return;
    }
    res
      .status(StatusCodes.OK)
      .json({ message: "Delivery found", data: delivery });
  } catch (error: any) {
    console.error("getDeliveryByIdHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch delivery by ID" });
  }
};

// The receiving employee is the signed-in one, not whatever the client sends.
export const createDeliveryHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const employee = await getEmployeeByClerkId(res.locals["clerkId"]);
    if (employee?.employee_id === undefined) {
      res
        .status(StatusCodes.FORBIDDEN)
        .json({ error: "Only employees can record deliveries" });
      return;
    }

    const { supplier_id, delivery_date, items } = req.body ?? {};
    const parsedItems = parseItems(items);
    if (
      !Number.isInteger(supplier_id) ||
      !isDate(delivery_date) ||
      !parsedItems
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error:
          "supplier_id, delivery_date (YYYY-MM-DD) and a list of unique items (ingredient_id, quantity_received above 0, unit_cost of 0 or more) are required",
      });
      return;
    }

    const delivery = await createDelivery({
      supplier_id,
      employee_id: employee.employee_id,
      delivery_date,
      items: parsedItems,
    });
    res
      .status(StatusCodes.CREATED)
      .json({ message: "Successfully recorded delivery", data: delivery });
  } catch (error: any) {
    console.error("createDeliveryHandler failed:", error);
    // Foreign key violation: the supplier or an ingredient doesn't exist
    if (error?.code === "23503") {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Unknown supplier or ingredient" });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to record delivery" });
  }
};
