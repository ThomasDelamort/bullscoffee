import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { getEmployeeByClerkId } from "../providers/employee.provider.ts";
import {
  createStockMovement,
  getStockMovements,
} from "../providers/stock-movement.provider.ts";
import type { StockMovementReason } from "../providers/stock-movement.provider.ts";

const queryText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

// undefined when absent, NaN-or-fraction when present but not a whole number.
const queryInt = (value: unknown): number | undefined => {
  const text = queryText(value);
  return text === undefined ? undefined : Number(text);
};

const isReason = (value: unknown): value is StockMovementReason =>
  value === "delivery" ||
  value === "sale" ||
  value === "waste" ||
  value === "adjustment";

// Deliveries and sales write their own movements; a manual one is either
// waste or a count correction.
const isManualReason = (value: unknown): value is "waste" | "adjustment" =>
  value === "waste" || value === "adjustment";

export const getStockMovementsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const reason = queryText(req.query["reason"]);
    const ingredient_id = queryInt(req.query["ingredient_id"]);

    if (reason !== undefined && !isReason(reason)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: "reason must be delivery, sale, waste or adjustment",
      });
      return;
    }
    if (ingredient_id !== undefined && !Number.isInteger(ingredient_id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid ingredient ID" });
      return;
    }

    const movements = await getStockMovements({ reason, ingredient_id });
    res.status(StatusCodes.OK).json({
      message: "Successfully fetched stock movements",
      data: movements,
    });
  } catch (error: any) {
    console.error("getStockMovementsHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch stock movements" });
  }
};

// The employee on the movement is the signed-in one, not whatever the client
// sends, so the paper trail can't be spoofed.
export const createStockMovementHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const employee = await getEmployeeByClerkId(res.locals["clerkId"]);
    if (employee?.employee_id === undefined) {
      res
        .status(StatusCodes.FORBIDDEN)
        .json({ error: "Only employees can record stock movements" });
      return;
    }

    const { ingredient_id, quantity_change, reason } = req.body ?? {};
    if (
      !Number.isInteger(ingredient_id) ||
      typeof quantity_change !== "number" ||
      !Number.isFinite(quantity_change) ||
      quantity_change === 0 ||
      !isManualReason(reason)
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error:
          "ingredient_id, a non-zero quantity_change and a reason of waste or adjustment are required",
      });
      return;
    }

    const movement = await createStockMovement({
      ingredient_id,
      employee_id: employee.employee_id,
      quantity_change,
      reason,
    });
    if (!movement) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Ingredient not found" });
      return;
    }
    res.status(StatusCodes.CREATED).json({
      message: "Successfully recorded stock movement",
      data: movement,
    });
  } catch (error: any) {
    console.error("createStockMovementHandler failed:", error);
    // Check violation: stock can't go below zero
    if (error?.code === "23514") {
      res.status(StatusCodes.CONFLICT).json({
        error: "That movement would take the ingredient's stock below zero",
      });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to record stock movement" });
  }
};
