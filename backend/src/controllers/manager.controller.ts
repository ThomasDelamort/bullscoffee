import type { Request, Response } from "express";
import { clerkClient } from "@clerk/express";
import { StatusCodes } from "http-status-codes";
import {
  claimInvitedEmployee,
  getEmployeeByClerkId,
} from "../providers/employee.provider.ts";

// Links an invite to the signed-in user: matched on their verified Clerk
// addresses, with their Clerk name for any name the invite left blank.
const claimInvite = async (clerk_id: string) => {
  const user = await clerkClient.users.getUser(clerk_id);
  const verified = user.emailAddresses
    .filter((address) => address.verification?.status === "verified")
    .map((address) => address.emailAddress);
  const email = user.primaryEmailAddress?.emailAddress ?? verified[0] ?? "";
  return claimInvitedEmployee(clerk_id, verified, {
    first_name: user.firstName?.trim() || email.split("@")[0] || "Admin",
    last_name: user.lastName?.trim() ?? "",
  });
};

// Resolves the signed-in Clerk user (set on res.locals by protectRoute) to
// their employee record. A signed-in user with no employee row isn't staff,
// unless they were invited: then the first call links the invite to them
// (see claimInvitedEmployee).
export const getCurrentEmployeeHandler = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const clerk_id: string = res.locals["clerkId"];
    const employee =
      (await getEmployeeByClerkId(clerk_id)) ??
      (await claimInvite(clerk_id));
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
