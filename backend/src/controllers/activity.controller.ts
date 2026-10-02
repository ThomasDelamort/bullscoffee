import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  countUnreviewed,
  getActivity,
  getActivityModules,
  getSignInsPerDay,
  recordActivity,
  reviewActivity,
  type Severity,
} from "../providers/activity.provider.ts";
import type { Employee } from "../types/employee.types.ts";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

const queryText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

const isSeverity = (value: unknown): value is Severity =>
  value === "info" || value === "warning" || value === "critical";

// GET /api/admin/activity?view=all|audit&severity=&module=&search=&limit=&before=
export const getActivityHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const view = queryText(req.query["view"]) ?? "all";
    const severity = queryText(req.query["severity"]);
    const limitText = queryText(req.query["limit"]);
    const beforeText = queryText(req.query["before"]);
    const limit = limitText === undefined ? DEFAULT_LIMIT : Number(limitText);
    const before = beforeText === undefined ? undefined : Number(beforeText);

    if (
      (view !== "all" && view !== "audit") ||
      (severity !== undefined && !isSeverity(severity)) ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > MAX_LIMIT ||
      (before !== undefined && !Number.isInteger(before))
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: `view must be all or audit, severity info, warning or critical, limit 1 to ${MAX_LIMIT}, and before a log id`,
      });
      return;
    }

    const [entries, unreviewed] = await Promise.all([
      getActivity({
        view,
        severity,
        module: queryText(req.query["module"]),
        search: queryText(req.query["search"]),
        limit,
        before,
      }),
      countUnreviewed(),
    ]);
    res.status(StatusCodes.OK).json({
      message: "Activity log",
      // A full page means there may be more to load.
      data: { entries, unreviewed, has_more: entries.length === limit },
    });
  } catch (error: any) {
    console.error("getActivityHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch the activity log" });
  }
};

export const getActivityModulesHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(StatusCodes.OK).json({ message: "Modules", data: await getActivityModules() });
  } catch (error: any) {
    console.error("getActivityModulesHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch modules" });
  }
};

export const reviewActivityHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const log_id = Number(req.params["id"]);
    if (!Number.isInteger(log_id)) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid log ID" });
      return;
    }
    const admin: Employee = res.locals["employee"];
    const entry = await reviewActivity(log_id, `${admin.first_name} ${admin.last_name}`);
    if (!entry) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "No flagged entry with that ID" });
      return;
    }
    recordActivity(req, res, { module: "Audit", action: `Reviewed flagged event #${log_id}: ${entry.flag?.reason}` });
    res.status(StatusCodes.OK).json({ message: "Marked as reviewed", data: entry });
  } catch (error: any) {
    console.error("reviewActivityHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to mark the entry reviewed" });
  }
};

// GET /api/admin/activity/stats/sign-ins?days=7
export const getSignInStatsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const days = Number(queryText(req.query["days"]) ?? 7);
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "days must be 1 to 90" });
      return;
    }
    res.status(StatusCodes.OK).json({ message: "Sign-ins per day", data: await getSignInsPerDay(days) });
  } catch (error: any) {
    console.error("getSignInStatsHandler failed:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch sign-in stats" });
  }
};
