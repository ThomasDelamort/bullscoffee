import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { StatusCodes } from "http-status-codes";
import { pool } from "../lib/db.ts";
import { permissionLabel, type PermissionId } from "../lib/permissions.ts";
import { recordSignIn } from "../providers/activity.provider.ts";
import { getEmployeeByClerkId } from "../providers/employee.provider.ts";

// Requires a valid Clerk session token (Authorization: Bearer <token>).
// Exposes the Clerk user id on res.locals.clerkId for downstream handlers.
// The first request of each Clerk session is logged as a sign-in.
export function protectRoute(req: Request, res: Response, next: NextFunction) {
  const { isAuthenticated, userId, sessionId } = getAuth(req);

  if (!isAuthenticated || !userId) {
    res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ error: "Unauthorized - you must be signed in" });
    return;
  }

  res.locals["clerkId"] = userId;
  recordSignIn(req, userId, sessionId);
  next();
}

// Must come after protectRoute. Allows any active employee, whatever their
// permissions: for what every member of staff can do, like /manager/me and
// clocking out. Sets res.locals.employee so handlers don't look it up again.
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

// Must come after protectRoute. Allows an active employee whose role holds
// `permission` in role_permissions (edited on the admin Roles & Permissions
// page); admins hold every permission. Read on every request, so a change
// applies to the next request, not the next sign-in. Sets
// res.locals.employee like requireEmployee.
export function requirePermission(permission: PermissionId) {
  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await pool.query(
        `
          SELECT e.*,
                 (e.employee_role = 'admin' OR EXISTS (
                   SELECT 1 FROM role_permissions rp
                   WHERE rp.role = e.employee_role AND rp.permission = $2
                 )) AS allowed
          FROM employees e
          WHERE e.clerk_id = $1
        `,
        [res.locals["clerkId"], permission],
      );
      const row = result.rows[0];
      if (!row || row.employee_status !== "active") {
        res
          .status(StatusCodes.FORBIDDEN)
          .json({ error: "Forbidden - active employee account required" });
        return;
      }
      if (!row.allowed) {
        res.status(StatusCodes.FORBIDDEN).json({
          error: `Your role doesn't have "${permissionLabel(permission)}". Ask an admin if you need it.`,
        });
        return;
      }
      const { allowed: _allowed, ...employee } = row;
      res.locals["employee"] = employee;
      next();
    } catch (error) {
      console.error(`requirePermission(${permission}) failed:`, error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Couldn't check your permissions" });
    }
  };
}

// Must come after protectRoute. Allows admins only: the admin console's API
// and the payment gateway settings.
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
