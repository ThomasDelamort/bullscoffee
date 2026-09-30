import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { getEmployeeByClerkId } from "../providers/employee.provider.ts";

// Resolves the signed-in Clerk user (set on res.locals by protectRoute) to
// their employee record. A signed-in user with no employee row isn't staff.
export const getCurrentEmployeeHandler = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const employee = await getEmployeeByClerkId(res.locals["clerkId"]);
    if (!employee) {
      res
        .status(StatusCodes.FORBIDDEN)
        .json({ error: "Signed-in user is not an employee" });
      return;
    }
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully fetched current employee", data: employee });
  } catch (error: any) {
    console.error("getCurrentEmployeeHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch current employee" });
  }
};
