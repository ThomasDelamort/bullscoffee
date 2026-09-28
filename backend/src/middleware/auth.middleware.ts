import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { StatusCodes } from "http-status-codes";

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
