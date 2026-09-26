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

// Must run after protectRoute. Only allows active employees with the manager role.
// Exposes the employee record on res.locals.employee.
export async function requireManager(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const employee = await getEmployeeByClerkId(res.locals["clerkId"]);

    if (
      !employee ||
      employee.employee_role !== "manager" ||
      employee.employee_status !== "active"
    ) {
      res
        .status(StatusCodes.FORBIDDEN)
        .json({ error: "Forbidden - manager access required" });
      return;
    }

    res.locals["employee"] = employee;
    next();
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to verify manager access" });
  }
}
