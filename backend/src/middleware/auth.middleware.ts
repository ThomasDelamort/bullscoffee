import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { StatusCodes } from "http-status-codes";
import { getEmployeeByClerkId } from "../providers/employee.provider.ts";

// Requires a valid Clerk session token (Authorization: Bearer <token>).
// Exposes the Clerk user id on res.locals.clerkId for downstream handlers.
export function protectRoute(req: Request, res: Response, next: NextFunction) {
  const { isAuthenticated, userId } = getAuth(req);

  if (!isAuthenticated || !userId) {
    res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ error: "Unauthorized - you must be signed in" });
    return;
  }

  res.locals["clerkId"] = userId;
  next();
}

// Must come after protectRoute. Allows any active employee (cashier or manager).
// Sets res.locals.employee so downstream handlers don't need a second lookup.
export async function requireEmployee(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const employee = await getEmployeeByClerkId(res.locals["clerkId"]);
  if (!employee || employee.employee_status !== "active") {
    res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: "Forbidden - active employee account required" });
    return;
  }
  res.locals["employee"] = employee;
  next();
}

// Must come after protectRoute. Allows managers only.
export async function requireManager(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const employee = await getEmployeeByClerkId(res.locals["clerkId"]);
  if (
    !employee ||
    employee.employee_status !== "active" ||
    employee.employee_role !== "manager"
  ) {
    res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: "Forbidden - manager account required" });
    return;
  }
  res.locals["employee"] = employee;
  next();
}

// Must come after protectRoute. Allows managers and admins (e.g. for logs).
export async function requireManagerOrAdmin(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const employee = await getEmployeeByClerkId(res.locals["clerkId"]);
  if (
    !employee ||
    employee.employee_status !== "active" ||
    (employee.employee_role !== "manager" && employee.employee_role !== "admin")
  ) {
    res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: "Forbidden - manager or admin account required" });
    return;
  }
  res.locals["employee"] = employee;
  next();
}

// Must come after protectRoute. Allows admins only (e.g. payment settings).
export async function requireAdmin(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const employee = await getEmployeeByClerkId(res.locals["clerkId"]);
  if (
    !employee ||
    employee.employee_status !== "active" ||
    employee.employee_role !== "admin"
  ) {
    res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: "Forbidden - admin account required" });
    return;
  }
  res.locals["employee"] = employee;
  next();
}
